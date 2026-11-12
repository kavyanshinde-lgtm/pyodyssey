/// <reference lib="webworker" />

import type { GradeConfig, GradeResult, RunResult, WorkerGradeResponse, WorkerResponse } from './types';
import { PYTHON_GRADER_SCRIPT } from './graderPython';

declare const self: DedicatedWorkerGlobalScope;

type PyodideRuntime = {
  globals: { set: (key: string, value: unknown) => void };
  runPythonAsync: (code: string) => Promise<unknown>;
};

let runtimePromise: Promise<PyodideRuntime> | null = null;

const BOOTSTRAP = String.raw`
import sys
import io
import json
import time
import traceback
import builtins

_MAX_STR = 220
_MAX_ITEMS = 40
_MAX_ENTRIES = 30
_MAX_ATTRS = 24
_MAX_DEPTH = 4
_MAX_OUTPUT = 60000


def __pyodyssey_snapshot(value, depth=0):
    try:
        type_name = type(value).__name__
        if value is None:
            return {"type": "NoneType", "repr": "None"}
        if type_name == "bool":
            return {"type": "bool", "repr": "True" if value else "False"}
        if type_name == "int":
            text = repr(value)
            return {"type": "int", "repr": text[:160]}
        if type_name == "float":
            return {"type": "float", "repr": repr(value)[:160]}
        if type_name == "complex":
            return {"type": "complex", "repr": repr(value)[:160]}
        if type_name == "str":
            clipped = value if len(value) <= _MAX_STR else value[:_MAX_STR] + "..."
            return {
                "type": "str",
                "repr": repr(clipped),
                "length": len(value),
                "truncated": len(value) > _MAX_STR,
            }
        if type_name in ("bytes", "bytearray"):
            clipped = repr(value)
            return {"type": type_name, "repr": clipped[:220]}
        if type_name in ("list", "tuple", "set", "frozenset"):
            limited = list(value)[:_MAX_ITEMS]
            items = [] if depth >= _MAX_DEPTH else [__pyodyssey_snapshot(item, depth + 1) for item in limited]
            return {
                "type": type_name,
                "repr": repr(value)[:220],
                "length": len(value),
                "items": items,
                "truncated": len(value) > _MAX_ITEMS or depth >= _MAX_DEPTH,
            }
        if type_name == "dict":
            entries = []
            if depth < _MAX_DEPTH:
                for index, (key, item) in enumerate(value.items()):
                    if index >= _MAX_ENTRIES:
                        break
                    entries.append({
                        "key": __pyodyssey_snapshot(key, depth + 1),
                        "value": __pyodyssey_snapshot(item, depth + 1),
                    })
            return {
                "type": "dict",
                "repr": repr(value)[:220],
                "length": len(value),
                "entries": entries,
                "truncated": len(value) > _MAX_ENTRIES or depth >= _MAX_DEPTH,
            }
        if type_name in ("function", "builtin_function_or_method", "method"):
            return {
                "type": "function",
                "repr": "<function " + getattr(value, "__name__", "anonymous") + ">",
            }
        if type_name == "type":
            return {"type": "class", "repr": "<class " + value.__name__ + ">", "className": value.__name__}
        if hasattr(value, "__dict__") and depth < _MAX_DEPTH:
            attrs = {}
            try:
                items = list(vars(value).items())
            except Exception:
                items = []
            for key, item in items[:_MAX_ATTRS]:
                if isinstance(key, str):
                    attrs[key] = __pyodyssey_snapshot(item, depth + 1)
            return {
                "type": "object",
                "className": type_name,
                "repr": repr(value)[:220],
                "attrs": attrs,
            }
        return {"type": type_name, "repr": repr(value)[:220]}
    except Exception:
        return {"type": type(value).__name__, "repr": "<unprintable object>"}


def __pyodyssey_run(source, stdin_json, time_limit, max_frames):
    start = time.monotonic()
    deadline = start + max(0.2, float(time_limit))
    buffer = io.StringIO()
    frames = []
    trace_truncated = False
    stdin_items = list(json.loads(stdin_json))
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    old_input = builtins.input
    old_import = builtins.__import__
    old_trace = sys.gettrace()

    class OdysseyTimeout(Exception):
        pass

    blocked_modules = {
        "js", "pyodide", "pyodide_js", "socket", "ssl", "urllib", "http",
        "requests", "subprocess", "ctypes", "multiprocessing",
    }

    class BlockedModuleFinder:
        def find_spec(self, fullname, path=None, target=None):
            root = fullname.split(".")[0]
            if root in blocked_modules:
                raise ModuleNotFoundError("Network and system modules are sealed inside the toybox: " + root)
            return None

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = name.split(".")[0]
        if root in blocked_modules:
            raise ModuleNotFoundError("Network and system modules are sealed inside the toybox: " + root)
        return old_import(name, globals, locals, fromlist, level)

    blocked_finder = BlockedModuleFinder()
    sys.meta_path.insert(0, blocked_finder)
    builtins.__import__ = guarded_import

    def reader(prompt=""):
        if prompt:
            sys.stdout.write(str(prompt))
        if not stdin_items:
            return ""
        value = stdin_items.pop(0)
        sys.stdout.write(str(value) + "\n")
        return str(value)

    def safe_locals(frame):
        snapshot = {}
        for key, value in list(frame.f_locals.items()):
            if key.startswith("__"):
                continue
            snapshot[key] = __pyodyssey_snapshot(value)
        return snapshot

    def build_stack(frame):
        stack = []
        cursor = frame
        guard = 0
        while cursor is not None and guard < 80:
            if cursor.f_code.co_filename == "<student>":
                stack.append(cursor.f_code.co_name)
            cursor = cursor.f_back
            guard += 1
        return stack

    def tracer(frame, event, arg):
        nonlocal trace_truncated
        if frame.f_code.co_filename != "<student>":
            return tracer
        if time.monotonic() > deadline:
            raise OdysseyTimeout("Your loop ran for too long. Python's emergency brake was pulled.")
        if event not in ("line", "return"):
            return tracer
        if event == "return" and frame.f_code.co_name == "<module>":
            return tracer
        if len(frames) < int(max_frames):
            frames.append({
                "line": frame.f_lineno,
                "event": event,
                "locals": safe_locals(frame),
                "stack": build_stack(frame),
                "stdoutLength": len(buffer.getvalue()),
            })
        else:
            trace_truncated = True
        return tracer

    error = None
    ok = True
    sys.stdout = buffer
    sys.stderr = buffer
    builtins.input = reader
    try:
        compiled = compile(source, "<student>", "exec")
    except BaseException as exc:
        ok = False
        error = {
            "type": type(exc).__name__,
            "message": str(exc),
            "line": getattr(exc, "lineno", None),
            "traceback": "".join(traceback.format_exception_only(type(exc), exc)).strip(),
        }
        compiled = None

    if compiled is not None:
        sandbox_globals = {
            "__name__": "__main__",
            "__builtins__": builtins,
            "print": print,
        }
        sys.settrace(tracer)
        try:
            exec(compiled, sandbox_globals)
        except BaseException as exc:
            ok = False
            line = None
            tb = exc.__traceback__
            for entry in traceback.extract_tb(tb):
                if entry.filename == "<student>":
                    line = entry.lineno
            if isinstance(exc, OdysseyTimeout):
                message = str(exc)
            else:
                message = str(exc)
            error = {
                "type": type(exc).__name__,
                "message": message,
                "line": line,
                "timeout": isinstance(exc, OdysseyTimeout),
                "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-5000:],
            }
        finally:
            sys.settrace(old_trace)
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            builtins.input = old_input
            builtins.__import__ = old_import
            if blocked_finder in sys.meta_path:
                sys.meta_path.remove(blocked_finder)
    else:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        builtins.input = old_input
        builtins.__import__ = old_import
        if blocked_finder in sys.meta_path:
            sys.meta_path.remove(blocked_finder)

    output = buffer.getvalue()
    if len(output) > _MAX_OUTPUT:
        output = output[:_MAX_OUTPUT] + "\n[output truncated by the toybox]"
        trace_truncated = True

    result = {
        "ok": ok,
        "output": output,
        "error": error,
        "frames": frames,
        "durationMs": round((time.monotonic() - start) * 1000, 2),
        "truncated": trace_truncated,
    }
    return json.dumps(result, ensure_ascii=False, default=str)
`;

let configuredIndexURL: string | null = null;

function resolvePyodideBase(): string {
  if (configuredIndexURL) return configuredIndexURL;
  try {
    return new URL('../pyodide/', self.location.href).href;
  } catch {
    return new URL('pyodide/', self.location.href).href;
  }
}

async function ensureRuntime(): Promise<PyodideRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      self.postMessage({
        type: 'status',
        message: 'Spinning up the local Python core...',
      } satisfies WorkerResponse);

      const base = resolvePyodideBase();
      const mod = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as {
        loadPyodide: (options: { indexURL: string }) => Promise<PyodideRuntime>;
      };
      const pyodide = await mod.loadPyodide({ indexURL: base });
      await pyodide.runPythonAsync(BOOTSTRAP);
      await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
      self.postMessage({
        type: 'ready',
        version: 'Python 3.12 · WebAssembly',
      } satisfies WorkerResponse);
      return pyodide;
    })().catch((error: unknown) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

self.onmessage = async (event: MessageEvent) => {
  const data = event.data as
    | { type: 'init'; indexURL?: string }
    | {
        type: 'run';
        id: number;
        code: string;
        stdin?: string[];
        timeLimitMs?: number;
        maxFrames?: number;
      }
    | {
        type: 'grade';
        id: number;
        code: string;
        config: GradeConfig;
      };

  if (!data || typeof data !== 'object') return;

  if (data.type === 'init') {
    if (data.indexURL) {
      configuredIndexURL = data.indexURL;
    }
    try {
      await ensureRuntime();
    } catch (error) {
      self.postMessage({
        type: 'fatal',
        message: error instanceof Error ? error.message : String(error),
      } satisfies WorkerResponse);
    }
    return;
  }

  if (data.type === 'grade') {
    try {
      const pyodide = await ensureRuntime();
      pyodide.globals.set('__pyodyssey_source', data.code);
      pyodide.globals.set('__pyodyssey_config_json', JSON.stringify(data.config));
      const json = (await pyodide.runPythonAsync(
        '__pyodyssey_grade_code(__pyodyssey_source, __pyodyssey_config_json)',
      )) as string;
      const grade = JSON.parse(json) as GradeResult;
      self.postMessage({ type: 'gradeResult', id: data.id, grade } satisfies WorkerGradeResponse);
    } catch (error) {
      self.postMessage({
        type: 'gradeResult',
        id: data.id,
        grade: {
          ok: false,
          compiled: false,
          syntaxError: {
            type: 'EngineError',
            message: error instanceof Error ? error.message : String(error),
            line: null,
            traceback: '',
          },
          testResults: [],
          constructResults: [],
          passedCount: 0,
          totalCount: (data.config.testCases?.length ?? 0) + (data.config.constructChecks?.length ?? 0),
          durationMs: 0,
        },
      } satisfies WorkerGradeResponse);
    }
    return;
  }

  if (data.type === 'run') {
    try {
      const pyodide = await ensureRuntime();
      pyodide.globals.set('__pyodyssey_source', data.code);
      pyodide.globals.set('__pyodyssey_stdin_json', JSON.stringify(data.stdin ?? []));
      pyodide.globals.set('__pyodyssey_time_limit', (data.timeLimitMs ?? 2500) / 1000);
      pyodide.globals.set('__pyodyssey_max_frames', data.maxFrames ?? 260);
      const json = (await pyodide.runPythonAsync(
        '__pyodyssey_run(__pyodyssey_source, __pyodyssey_stdin_json, __pyodyssey_time_limit, __pyodyssey_max_frames)',
      )) as string;
      const result = JSON.parse(json) as RunResult;
      self.postMessage({ type: 'result', id: data.id, result } satisfies WorkerResponse);
    } catch (error) {
      self.postMessage({
        type: 'result',
        id: data.id,
        result: {
          ok: false,
          output: '',
          error: {
            type: 'EngineError',
            message: error instanceof Error ? error.message : String(error),
            line: null,
            traceback: '',
          },
          frames: [],
          durationMs: 0,
        },
      } satisfies WorkerResponse);
    }
  }
};
