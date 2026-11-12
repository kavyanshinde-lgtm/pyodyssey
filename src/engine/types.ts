export interface SerializedValue {
  type: string;
  repr: string;
  className?: string;
  items?: SerializedValue[];
  entries?: Array<{ key: SerializedValue; value: SerializedValue }>;
  attrs?: Record<string, SerializedValue>;
  length?: number;
  truncated?: boolean;
}

export interface TraceFrame {
  line: number;
  event: 'line' | 'return';
  locals: Record<string, SerializedValue>;
  stack: string[];
  stdoutLength: number;
}

export interface RuntimeErrorInfo {
  type: string;
  message: string;
  line: number | null;
  traceback: string;
  timeout?: boolean;
}

export interface RunResult {
  ok: boolean;
  output: string;
  error: RuntimeErrorInfo | null;
  frames: TraceFrame[];
  durationMs: number;
  truncated?: boolean;
}

export interface WorkerReady {
  type: 'ready';
  version?: string;
}

export interface WorkerStatus {
  type: 'status';
  message: string;
}

export interface WorkerResult {
  type: 'result';
  id: number;
  result: RunResult;
}

export interface WorkerFatal {
  type: 'fatal';
  id?: number;
  message: string;
}

export type WorkerResponse = WorkerReady | WorkerStatus | WorkerResult | WorkerFatal;

export interface RunOptions {
  stdin?: string[];
  timeLimitMs?: number;
  maxFrames?: number;
}

export interface TestCase {
  id?: string;
  description?: string;
  entrypoint?: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  expected?: unknown;
  stdin?: string[];
  expectedOutput?: string;
  hidden?: boolean;
  pure?: boolean;
  instrumented?: boolean;
}

export type AstConstructType =
  | 'for'
  | 'while'
  | 'def'
  | 'class'
  | 'comprehension'
  | 'recursion'
  | 'try'
  | 'fstring'
  | 'super'
  | 'yield'
  | 'with'
  | 'nonlocal'
  | (string & {});

export interface ConstructCheck {
  id: string;
  label: string;
  construct: AstConstructType;
  forbidden?: boolean;
  hint?: string;
}

export interface ConstructResult {
  id: string;
  label: string;
  passed: boolean;
  hint?: string;
}

export interface TestResult {
  id: string;
  description?: string;
  passed: boolean;
  hidden: boolean;
  inputDisplay: string;
  expectedDisplay: string;
  actualDisplay: string;
  stdout?: string;
  error?: {
    type: string;
    message: string;
    traceback: string;
    timeout?: boolean;
  } | null;
  durationMs: number;
}

export interface GradeConfig {
  entrypoint?: string;
  testCases: TestCase[];
  constructChecks?: ConstructCheck[];
  timeLimitPerTestMs?: number;
  failedAttempts?: number;
  pure?: boolean;
}

export interface GradeResult {
  ok: boolean;
  compiled: boolean;
  syntaxError?: RuntimeErrorInfo | null;
  testResults: TestResult[];
  constructResults: ConstructResult[];
  passedCount: number;
  totalCount: number;
  durationMs: number;
}

export interface WorkerGradeResult {
  type: 'gradeResult';
  id: number;
  grade: GradeResult;
}

export type WorkerGradeResponse = WorkerResponse | WorkerGradeResult;

