import type { GradeConfig, GradeResult, RunOptions, RunResult, WorkerGradeResponse } from './types';

export type EngineStatus = 'booting' | 'ready' | 'error';

interface PendingRun {
  resolve: (result: RunResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingGrade {
  resolve: (result: GradeResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class PythonEngine {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((error: Error) => void) | null = null;
  private pending = new Map<number, PendingRun>();
  private pendingGrade = new Map<number, PendingGrade>();
  private nextId = 1;
  private status: EngineStatus = 'booting';
  private statusMessage = 'Booting the local Python core...';
  private listeners = new Set<(status: EngineStatus, message: string) => void>();

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.spawn();
    }
  }

  private spawn() {
    if (typeof Worker === 'undefined') return;
    if (this.worker) this.worker.terminate();
    this.status = 'booting';
    this.statusMessage = 'Booting the local Python core...';
    this.emit();

    const worker = new Worker(new URL('./python.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker = worker;

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    worker.onmessage = (event: MessageEvent<WorkerGradeResponse>) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'status') {
        this.statusMessage = data.message;
        this.emit();
        return;
      }

      if (data.type === 'ready') {
        this.status = 'ready';
        this.statusMessage = data.version ? `Local core ready · ${data.version}` : 'Local Python core ready';
        this.resolveReady?.();
        this.resolveReady = null;
        this.emit();
        return;
      }

      if (data.type === 'fatal') {
        this.status = 'error';
        this.statusMessage = 'Python core could not boot. Reconnecting...';
        this.rejectReady?.(new Error(data.message));
        this.rejectReady = null;
        this.emit();
        // One automatic retry — a transient asset failure should not brick the toybox.
        setTimeout(() => {
          if (this.status === 'error') this.spawn();
        }, 1800);
        return;
      }

      if (data.type === 'result') {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(data.id);
        pending.resolve(data.result);
      }

      if (data.type === 'gradeResult') {
        const pending = this.pendingGrade.get(data.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pendingGrade.delete(data.id);
        pending.resolve(data.grade);
      }
    };

    worker.onerror = (event) => {
      const error = new Error(event.message || 'Python worker crashed');
      this.status = 'error';
      this.statusMessage = 'Python worker hit a snag. Rebuilding the machine...';
      this.rejectReady?.(error);
      this.rejectReady = null;
      for (const [, pending] of this.pending) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.pending.clear();
      for (const [, pending] of this.pendingGrade) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.pendingGrade.clear();
      this.emit();
    };

    let indexURL: string | undefined;
    if (typeof document !== 'undefined') {
      const baseUri = document.baseURI || window.location.href;
      const normalizedBase = baseUri.endsWith('/') || baseUri.includes('.html') ? baseUri : `${baseUri}/`;
      indexURL = new URL('pyodide/', normalizedBase).href;
    }
    worker.postMessage({ type: 'init', indexURL });
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.status, this.statusMessage);
    }
  }

  subscribe(listener: (status: EngineStatus, message: string) => void) {
    this.listeners.add(listener);
    listener(this.status, this.statusMessage);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getStatus() {
    return { status: this.status, message: this.statusMessage };
  }

  async warmUp(): Promise<void> {
    if (this.status === 'error') {
      this.spawn();
    }
    return this.readyPromise ?? Promise.resolve();
  }

  async run(code: string, options: RunOptions = {}): Promise<RunResult> {
    try {
      await this.warmUp();
    } catch (error) {
      return {
        ok: false,
        output: '',
        error: {
          type: 'EngineError',
          message:
            error instanceof Error
              ? error.message
              : 'The local Python core is unavailable. Refresh the page to rebuild it.',
          line: null,
          traceback: '',
        },
        frames: [],
        durationMs: 0,
      };
    }

    if (!this.worker) {
      return {
        ok: false,
        output: '',
        error: {
          type: 'EngineError',
          message: 'The Python worker is not running. Refresh the page to rebuild it.',
          line: null,
          traceback: '',
        },
        frames: [],
        durationMs: 0,
      };
    }

    const id = this.nextId++;
    const timeLimitMs = options.timeLimitMs ?? 2800;

    return new Promise<RunResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // A C-level infinite loop can ignore Python's line watchdog. Terminate
        // the isolated worker rather than hanging the whole toybox.
        resolve({
          ok: false,
          output: '',
          error: {
            type: 'TimeoutError',
            message:
              'Emergency brake! Your program ran too long. Check for a loop with no exit.',
            line: null,
            traceback: '',
            timeout: true,
          },
          frames: [],
          durationMs: timeLimitMs,
        });
        this.spawn();
      }, Math.max(7000, timeLimitMs + 4200));

      this.pending.set(id, { resolve, reject, timer });
      this.worker?.postMessage({
        type: 'run',
        id,
        code,
        stdin: options.stdin ?? [],
        timeLimitMs,
        maxFrames: options.maxFrames ?? 280,
      });
    });
  }

  async grade(code: string, config: GradeConfig): Promise<GradeResult> {
    try {
      await this.warmUp();
    } catch (error) {
      return {
        ok: false,
        compiled: false,
        syntaxError: {
          type: 'EngineError',
          message:
            error instanceof Error
              ? error.message
              : 'The local Python core is unavailable. Refresh the page to rebuild it.',
          line: null,
          traceback: '',
        },
        testResults: [],
        constructResults: [],
        passedCount: 0,
        totalCount: (config.testCases?.length ?? 0) + (config.constructChecks?.length ?? 0),
        durationMs: 0,
      };
    }

    if (!this.worker) {
      return {
        ok: false,
        compiled: false,
        syntaxError: {
          type: 'EngineError',
          message: 'The Python worker is not running. Refresh the page to rebuild it.',
          line: null,
          traceback: '',
        },
        testResults: [],
        constructResults: [],
        passedCount: 0,
        totalCount: (config.testCases?.length ?? 0) + (config.constructChecks?.length ?? 0),
        durationMs: 0,
      };
    }

    const id = this.nextId++;
    const testCount = config.testCases?.length ?? 1;
    const timeoutLimit = Math.max(6000, testCount * 1500 + 4000);

    return new Promise<GradeResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingGrade.delete(id);
        resolve({
          ok: false,
          compiled: false,
          syntaxError: {
            type: 'TimeoutError',
            message: 'Grading timed out. A test case may have encountered a deep loop.',
            line: null,
            traceback: '',
            timeout: true,
          },
          testResults: [],
          constructResults: [],
          passedCount: 0,
          totalCount: testCount + (config.constructChecks?.length ?? 0),
          durationMs: timeoutLimit,
        });
        this.spawn();
      }, timeoutLimit);

      this.pendingGrade.set(id, { resolve, reject, timer });
      this.worker?.postMessage({
        type: 'grade',
        id,
        code,
        config,
      });
    });
  }
}

export const pythonEngine = new PythonEngine();
