export const PYTHON_GRADER_SCRIPT = String.raw`
import sys
import io
import json
import time
import copy
import math
import ast
import traceback
import builtins
import re

if hasattr(sys, 'set_int_max_str_digits'):
    try:
        sys.set_int_max_str_digits(40000)
    except Exception:
        pass

def normalize_output(text):
    if text is None:
        return ""
    lines = [line.rstrip() for line in str(text).replace('\r\n', '\n').replace('\r', '\n').split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)

def __pyodyssey_check_ast(source, checks):
    results = []
    try:
        tree = ast.parse(source)
    except SyntaxError:
        for c in checks:
            results.append({"id": c["id"], "label": c["label"], "passed": False, "hint": c.get("hint")})
        return results

    class ConstructVisitor(ast.NodeVisitor):
        def __init__(self):
            self.has_for = False
            self.has_while = False
            self.has_def = False
            self.has_class = False
            self.has_comprehension = False
            self.has_try = False
            self.has_fstring = False
            self.has_super = False
            self.has_with = False
            self.has_yield = False
            self.has_nonlocal = False
            self.has_decorator = False
            self.function_calls = {}
            self._current_func = None

        def visit_For(self, node):
            self.has_for = True
            self.generic_visit(node)

        def visit_While(self, node):
            self.has_while = True
            self.generic_visit(node)

        def visit_FunctionDef(self, node):
            self.has_def = True
            if node.decorator_list:
                self.has_decorator = True
            prev = self._current_func
            self._current_func = node.name
            if node.name not in self.function_calls:
                self.function_calls[node.name] = set()
            self.generic_visit(node)
            self._current_func = prev

        def visit_AsyncFunctionDef(self, node):
            self.has_def = True
            if node.decorator_list:
                self.has_decorator = True
            prev = self._current_func
            self._current_func = node.name
            if node.name not in self.function_calls:
                self.function_calls[node.name] = set()
            self.generic_visit(node)
            self._current_func = prev

        def visit_ClassDef(self, node):
            self.has_class = True
            if node.decorator_list:
                self.has_decorator = True
            self.generic_visit(node)

        def visit_ListComp(self, node):
            self.has_comprehension = True
            self.generic_visit(node)

        def visit_DictComp(self, node):
            self.has_comprehension = True
            self.generic_visit(node)

        def visit_SetComp(self, node):
            self.has_comprehension = True
            self.generic_visit(node)

        def visit_GeneratorExp(self, node):
            self.has_comprehension = True
            self.generic_visit(node)

        def visit_JoinedStr(self, node):
            self.has_fstring = True
            self.generic_visit(node)

        def visit_Try(self, node):
            self.has_try = True
            self.generic_visit(node)

        def visit_With(self, node):
            self.has_with = True
            self.generic_visit(node)

        def visit_AsyncWith(self, node):
            self.has_with = True
            self.generic_visit(node)

        def visit_Yield(self, node):
            self.has_yield = True
            self.generic_visit(node)

        def visit_YieldFrom(self, node):
            self.has_yield = True
            self.generic_visit(node)

        def visit_Nonlocal(self, node):
            self.has_nonlocal = True
            self.generic_visit(node)

        def visit_Call(self, node):
            if isinstance(node.func, ast.Name) and node.func.id == 'super':
                self.has_super = True
            if self._current_func:
                if isinstance(node.func, ast.Name):
                    self.function_calls[self._current_func].add(node.func.id)
            self.generic_visit(node)

    visitor = ConstructVisitor()
    visitor.visit(tree)

    has_recursion = False
    for fname, calls in visitor.function_calls.items():
        if fname in calls:
            has_recursion = True

    for c in checks:
        if isinstance(c, str):
            cid = c
            clabel = f"Use {c}"
            ctype = c
            forbidden = False
            chint = None
        else:
            cid = c.get("id", c.get("construct", "check"))
            clabel = c.get("label", cid)
            ctype = c.get("construct")
            forbidden = c.get("forbidden", False)
            chint = c.get("hint")

        present = False
        if ctype == "for":
            present = visitor.has_for
        elif ctype == "while":
            present = visitor.has_while
        elif ctype == "def":
            present = visitor.has_def
        elif ctype == "class":
            present = visitor.has_class
        elif ctype == "comprehension":
            present = visitor.has_comprehension
        elif ctype == "fstring":
            present = visitor.has_fstring
        elif ctype == "try":
            present = visitor.has_try
        elif ctype == "recursion":
            present = has_recursion
        elif ctype == "super":
            present = visitor.has_super
        elif ctype == "with":
            present = visitor.has_with
        elif ctype == "yield":
            present = visitor.has_yield
        elif ctype == "nonlocal":
            present = visitor.has_nonlocal
        elif ctype in ("decorator", "@decorator", "@shout"):
            present = visitor.has_decorator
        else:
            try:
                present = bool(re.search(ctype, source))
            except Exception:
                present = False

        passed = (not present) if forbidden else present
        results.append({
            "id": cid,
            "label": clabel,
            "passed": passed,
            "hint": chint
        })
    return results

def __values_equal(actual, expected):
    if isinstance(actual, bool) or isinstance(expected, bool):
        return isinstance(actual, bool) and isinstance(expected, bool) and actual == expected
    if isinstance(actual, int) and isinstance(expected, int):
        return actual == expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        try:
            return math.isclose(float(actual), float(expected), rel_tol=1e-9, abs_tol=1e-9)
        except Exception:
            return False
    if isinstance(actual, (list, tuple)) and isinstance(expected, (list, tuple)):
        if len(actual) != len(expected):
            return False
        return all(__values_equal(a, e) for a, e in zip(actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        if set(actual.keys()) != set(expected.keys()):
            return False
        return all(__values_equal(actual[k], expected[k]) for k in actual)
    try:
        return actual == expected
    except Exception:
        return False

def __pyodyssey_grade_code(source, config_json):
    start_total = time.monotonic()
    config = json.loads(config_json)
    entrypoint = config.get("entrypoint")
    test_cases = config.get("testCases", [])
    construct_checks = config.get("constructChecks", [])
    time_limit_ms = config.get("timeLimitPerTestMs", 1200)
    time_limit_sec = max(0.1, time_limit_ms / 1000.0)
    failed_attempts = config.get("failedAttempts", 0)

    construct_results = __pyodyssey_check_ast(source, construct_checks)

    class TestTimeout(BaseException):
        pass

    blocked_modules = {
        "js", "pyodide", "pyodide_js", "socket", "ssl", "urllib", "http",
        "requests", "subprocess", "ctypes", "multiprocessing",
    }

    class BlockedModuleFinder:
        def find_spec(self, fullname, path=None, target=None):
            root = fullname.split(".")[0]
            if root in blocked_modules:
                raise ModuleNotFoundError("Sealed inside toybox: " + root)
            return None

    blocked_finder = BlockedModuleFinder()
    sys.meta_path.insert(0, blocked_finder)

    old_import = builtins.__import__
    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        root = name.split(".")[0]
        if root in blocked_modules:
            raise ModuleNotFoundError("Sealed inside toybox: " + root)
        return old_import(name, globals, locals, fromlist, level)
    builtins.__import__ = guarded_import

    try:
        try:
            compiled = compile(source, "<student>", "exec")
        except SyntaxError as exc:
            return json.dumps({
                "ok": False,
                "compiled": False,
                "syntaxError": {
                    "type": "SyntaxError",
                    "message": str(exc),
                    "line": exc.lineno,
                    "traceback": "".join(traceback.format_exception_only(type(exc), exc)).strip()
                },
                "testResults": [],
                "constructResults": construct_results,
                "passedCount": 0,
                "totalCount": len(test_cases) + len(construct_checks),
                "durationMs": round((time.monotonic() - start_total) * 1000, 2)
            })

        old_stdout = sys.stdout
        old_stderr = sys.stderr
        old_input = builtins.input
        old_trace = sys.gettrace()

        test_results = []

        has_any_entrypoint = bool(entrypoint) or any(bool(t.get("entrypoint")) for t in test_cases)
        init_error = None
        if has_any_entrypoint:
            sandbox_globals = {
                "__name__": "__main__",
                "__builtins__": builtins,
            }
            buffer = io.StringIO()
            sys.stdout = buffer
            sys.stderr = buffer
            top_stdin = list(config.get("stdin") or (test_cases[0].get("stdin") if test_cases else []) or ["Nova", "1", ""])
            def top_reader(prompt=""):
                if top_stdin:
                    return str(top_stdin.pop(0))
                return ""
            builtins.input = top_reader
            deadline = time.monotonic() + 3.0
            def init_tracer(frame, event, arg):
                if time.monotonic() > deadline:
                    raise TestTimeout("Top-level execution timed out")
                return init_tracer
            sys.settrace(init_tracer)
            try:
                exec(compiled, sandbox_globals)
            except BaseException as exc:
                init_error = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                    "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-3000:]
                }
            finally:
                sys.settrace(old_trace)
                builtins.input = old_input
                sys.stdout = old_stdout
                sys.stderr = old_stderr

        for idx, test in enumerate(test_cases):
            test_id = test.get("id", f"test-{idx+1}")
            desc = test.get("description", "")
            hidden = test.get("hidden", idx >= 2)
            args = test.get("args", [])
            kwargs = test.get("kwargs", {})
            expected_val = test.get("expected")
            has_expected_val = "expected" in test
            stdin_list = list(test.get("stdin", []))
            expected_out = test.get("expectedOutput")
            has_expected_out = "expectedOutput" in test

            target_fn = test.get("entrypoint") or (entrypoint if ("args" in test or "kwargs" in test) else None)
            input_disp = ""
            if target_fn:
                arg_strs = [repr(a) for a in args]
                kwarg_strs = [f"{k}={repr(v)}" for k, v in kwargs.items()]
                input_disp = f"{target_fn}({', '.join(arg_strs + kwarg_strs)})"
            elif stdin_list:
                input_disp = f"stdin: {repr(stdin_list)}"

            if init_error:
                test_results.append({
                    "id": test_id,
                    "description": desc,
                    "passed": False,
                    "hidden": hidden,
                    "inputDisplay": "<hidden>" if (hidden and failed_attempts < 2) else input_disp,
                    "expectedDisplay": "<hidden>" if (hidden and failed_attempts < 2) else (repr(expected_val) if has_expected_val else (expected_out or "")),
                    "actualDisplay": "<hidden>" if (hidden and failed_attempts < 2) else "",
                    "error": init_error,
                    "durationMs": 0
                })
                continue

            test_globals = {
                "__name__": "__main__",
                "__builtins__": builtins,
            }
            buffer = io.StringIO()
            sys.stdout = buffer
            sys.stderr = buffer

            def reader(prompt=""):
                if not stdin_list:
                    return ""
                val = stdin_list.pop(0)
                return str(val)

            builtins.input = reader

            deadline = time.monotonic() + time_limit_sec
            def tracer(frame, event, arg):
                if time.monotonic() > deadline:
                    raise TestTimeout(f"Test case exceeded {time_limit_ms}ms time limit")
                return tracer

            test_start = time.monotonic()
            test_error = None
            actual_val = None
            ran_ok = False

            sys.settrace(tracer)
            try:
                exec(compiled, test_globals)
                if target_fn:
                    if target_fn not in test_globals or not callable(test_globals[target_fn]):
                        raise NameError(f"Function '{target_fn}' is not defined")
                    fn = test_globals[target_fn]
                    c_args = copy.deepcopy(args)
                    c_kwargs = copy.deepcopy(kwargs)
                    pure_check = test.get("pure", config.get("pure", False))
                    if pure_check:
                        pure_args = copy.deepcopy(c_args)
                        pure_kwargs = copy.deepcopy(c_kwargs)
                    instrumented = test.get("instrumented", False)
                    inst_lists = []
                    if instrumented:
                        class InstrumentedList(list):
                            def __init__(self, iterable=()):
                                super().__init__(iterable)
                                self.access_count = 0
                            def __getitem__(self, idx):
                                if isinstance(idx, int):
                                    self.access_count += 1
                                return super().__getitem__(idx)
                            def __iter__(self):
                                self.access_count += len(self)
                                raise RuntimeError("Iteration is not allowed: use binary search with indices")
                            def __contains__(self, item):
                                self.access_count += len(self)
                                raise RuntimeError("Linear scan via 'in' operator is not allowed in binary search")
                            def index(self, *args, **kwargs):
                                self.access_count += len(self)
                                raise RuntimeError("Linear scan via .index() is not allowed in binary search")
                        new_args = []
                        for a in c_args:
                            if isinstance(a, list):
                                wrapped = InstrumentedList(a)
                                inst_lists.append(wrapped)
                                new_args.append(wrapped)
                            else:
                                new_args.append(a)
                        c_args = new_args
                    actual_val = fn(*c_args, **c_kwargs)
                    if instrumented:
                        for inst in inst_lists:
                            max_allowed = int(4 * (math.log2(max(1, len(inst))) + 1))
                            if inst.access_count > max_allowed:
                                raise RuntimeError(f"Performance limit exceeded: {inst.access_count} accesses > {max_allowed} max allowed for logarithmic search")
                    if pure_check:
                        if c_args != pure_args or c_kwargs != pure_kwargs:
                            raise ValueError("Mutation detected: your function changed its input")
                ran_ok = True
            except BaseException as exc:
                test_error = {
                    "type": type(exc).__name__,
                    "message": str(exc),
                    "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-3000:],
                    "timeout": isinstance(exc, TestTimeout)
                }
            finally:
                sys.settrace(old_trace)
                sys.stdout = old_stdout
                sys.stderr = old_stderr
                builtins.input = old_input

            test_duration = round((time.monotonic() - test_start) * 1000, 2)
            actual_stdout = buffer.getvalue()

            if (time.monotonic() - test_start) >= time_limit_sec:
                ran_ok = False
                test_error = {
                    "type": "TestTimeout",
                    "message": f"Test case exceeded {time_limit_ms}ms time limit",
                    "traceback": "",
                    "timeout": True
                }

            passed = False
            if ran_ok:
                val_match = True
                if has_expected_val:
                    val_match = __values_equal(actual_val, expected_val)
                out_match = True
                if has_expected_out:
                    out_match = (normalize_output(actual_stdout) == normalize_output(expected_out))
                passed = val_match and out_match

            expected_disp = ""
            if has_expected_val:
                expected_disp = repr(expected_val)
            elif has_expected_out:
                expected_disp = expected_out

            actual_disp = ""
            if test_error:
                actual_disp = f"{test_error['type']}: {test_error['message']}"
            elif has_expected_val:
                try:
                    actual_disp = repr(actual_val)
                    if len(actual_disp) > 200:
                        actual_disp = actual_disp[:200] + "..."
                except Exception as e:
                    actual_disp = f"<{type(actual_val).__name__}: {e}>"
            elif has_expected_out:
                actual_disp = actual_stdout

            if hidden and not passed and failed_attempts < 2:
                input_disp = "<hidden>"
                expected_disp = "<hidden>"
                actual_disp = "<hidden>"

            test_results.append({
                "id": test_id,
                "description": desc,
                "passed": passed,
                "hidden": hidden,
                "inputDisplay": input_disp,
                "expectedDisplay": expected_disp,
                "actualDisplay": actual_disp,
                "stdout": actual_stdout,
                "error": test_error,
                "durationMs": test_duration
            })

        all_tests_passed = len(test_results) > 0 and all(t["passed"] for t in test_results)
        all_constructs_passed = all(c["passed"] for c in construct_results)

        passed_count = sum(1 for t in test_results if t["passed"]) + sum(1 for c in construct_results if c["passed"])
        total_count = len(test_results) + len(construct_results)

        return json.dumps({
            "ok": all_tests_passed and all_constructs_passed,
            "compiled": True,
            "testResults": test_results,
            "constructResults": construct_results,
            "passedCount": passed_count,
            "totalCount": total_count,
            "durationMs": round((time.monotonic() - start_total) * 1000, 2)
        }, default=str)
    finally:
        builtins.__import__ = old_import
        if blocked_finder in sys.meta_path:
            sys.meta_path.remove(blocked_finder)
`;
