import type {
  ConstructCheck,
  ConstructResult,
  GradeConfig,
  GradeResult,
  RunResult,
  TestCase,
  TestResult,
} from './types';
import { pythonEngine } from './pythonClient';
import { lintPython, normalizeOutput, stripPythonComments, type GoalResult, type RequirementResult, type ValidationReport } from './linter';

export interface LessonLike {
  id: string;
  title?: string;
  goals?: Array<{ id: string; label: string; hint: string; pattern: string }>;
  requirements?: Array<{ label: string; kind: 'output' | 'pattern' | 'forbid' | 'min-lines'; value: string; hint?: string }>;
  expectedOutput?: string;
  starLines?: number;
  pythonic?: string;
  entrypoint?: string;
  tests?: TestCase[];
  constructs?: (ConstructCheck | any)[];
  stdin?: string[];
  pure?: boolean;
}

export function buildGradeConfig(lesson: LessonLike, failedAttempts = 0): GradeConfig {
  if (lesson.tests && lesson.tests.length > 0) {
    return {
      entrypoint: lesson.entrypoint,
      testCases: lesson.tests,
      constructChecks: (lesson.constructs ?? []).map((c: any) =>
        typeof c === 'string'
          ? { id: c, label: `Use ${c}`, construct: c as any }
          : c
      ),
      timeLimitPerTestMs: 1200,
      failedAttempts,
      pure: lesson.pure ?? false,
    };
  }

  // Adapter for unmigrated lessons
  const testCases: TestCase[] = [];
  if (lesson.expectedOutput !== undefined) {
    testCases.push({
      id: `${lesson.id}-legacy-out`,
      description: 'Exact output requirement',
      stdin: lesson.stdin ?? [],
      expectedOutput: lesson.expectedOutput,
      hidden: false,
    });
  }

  return {
    testCases,
    constructChecks: [],
    timeLimitPerTestMs: 1500,
    failedAttempts,
  };
}

export function gradeResultToReport(
  source: string,
  lesson: LessonLike,
  run: RunResult,
  grade: GradeResult,
): ValidationReport {
  const lineCount = source.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
  const starBudget = lesson.starLines ?? 999;
  const lintIssues = lintPython(source);
  const lintHasErrors = lintIssues.some((issue) => issue.severity === 'error');

  const structural = stripPythonComments(source);
  const pythonic = lesson.pythonic ? new RegExp(lesson.pythonic, 'm').test(structural) : true;

  // Build legacy requirements list for compatibility
  const requirements: RequirementResult[] = [];

  for (const c of grade.constructResults) {
    requirements.push({
      label: c.label,
      kind: 'pattern',
      passed: c.passed,
      hint: c.hint,
    });
  }

  for (const t of grade.testResults) {
    requirements.push({
      label: t.description || t.inputDisplay || t.id,
      kind: 'output',
      passed: t.passed,
      hint: t.error ? `${t.error.type}: ${t.error.message}` : `Expected ${t.expectedDisplay}, got ${t.actualDisplay}`,
    });
  }

  // If unmigrated lesson has other pattern checks
  if ((!lesson.tests || lesson.tests.length === 0) && lesson.requirements) {
    for (const req of lesson.requirements) {
      if (req.kind === 'output') continue;
      let passed = false;
      try {
        if (req.kind === 'pattern') {
          passed = new RegExp(req.value, 'm').test(structural);
        } else if (req.kind === 'forbid') {
          passed = !new RegExp(req.value, 'm').test(structural);
        } else if (req.kind === 'min-lines') {
          passed = lineCount >= Number(req.value);
        }
      } catch {
        passed = false;
      }
      requirements.push({
        label: req.label,
        kind: req.kind,
        passed,
        hint: req.hint,
      });
    }
  }

  const passedChecks = requirements.filter((r) => r.passed).length;
  const totalChecks = requirements.length;
  const allPassed = grade.ok && (requirements.length === 0 || passedChecks === totalChecks);

  let stars = 0;
  if (grade.compiled && allPassed) {
    stars = 1;
    if (!lintHasErrors) stars += 1;
    if (pythonic && lineCount <= starBudget) stars += 1;
  }

  const failures = requirements.filter((r) => !r.passed);

  const goals: GoalResult[] = (lesson.goals ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    passed: allPassed,
    hint: g.hint,
  }));

  return {
    passed: allPassed,
    compiled: grade.compiled,
    goals,
    requirements,
    stars,
    lineCount,
    passedChecks,
    totalChecks,
    failures,
    testResults: grade.testResults,
    constructs: grade.constructResults,
  };
}

export async function gradeLesson(
  source: string,
  lesson: LessonLike,
  run: RunResult,
  failedAttempts = 0,
): Promise<ValidationReport> {
  const config = buildGradeConfig(lesson, failedAttempts);
  const grade = await pythonEngine.grade(source, config);
  return gradeResultToReport(source, lesson, run, grade);
}
