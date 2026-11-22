import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS, REALMS, TOTAL_LESSONS } from '../src/data/curriculum';
import { checkGoals, lintPython, stripPythonComments, validateCode } from '../src/engine/linter';
import type { RunResult } from '../src/engine/types';

describe('curriculum integrity', () => {
  it('has a complete connected curriculum', () => {
    expect(REALMS).toHaveLength(8);
    expect(ALL_LESSONS).toHaveLength(TOTAL_LESSONS);
    expect(new Set(ALL_LESSONS.map((lesson) => lesson.id)).size).toBe(ALL_LESSONS.length);
    for (const realm of REALMS) {
      expect(realm.lessons.length).toBeGreaterThanOrEqual(8);
      const project = realm.lessons.find((lesson) => lesson.isProject);
      const trial = realm.lessons.find((lesson) => lesson.isTrial);
      expect(project).toBeTruthy();
      expect(trial?.trial?.rounds).toHaveLength(3);
      expect(trial?.trial?.badgeName.length).toBeGreaterThan(0);
      expect(realm.lessons.at(-1)?.isTrial).toBe(true);
    }
  });

  it('every ultimate trial is a three-wave revision with usable metadata', () => {
    const trials = ALL_LESSONS.filter((lesson) => lesson.isTrial);
    expect(trials).toHaveLength(8);
    for (const trial of trials) {
      expect(trial.trial, trial.id).toBeTruthy();
      expect(trial.trial?.rounds, trial.id).toHaveLength(3);
      expect(trial.trial?.concepts.length, trial.id).toBeGreaterThanOrEqual(5);
      for (const round of trial.trial!.rounds) {
        expect(round.goals, `${trial.id}/${round.id}`).toHaveLength(3);
        expect(round.requirements.length, `${trial.id}/${round.id}`).toBeGreaterThanOrEqual(3);
        expect(round.solution.trim().length, round.id).toBeGreaterThan(0);
        expect(round.xray, round.id).toBe(round.solution);
      }
    }
  });

  it('every lesson has three goals and three validation requirements', () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.goals, lesson.id).toHaveLength(3);
      expect(lesson.requirements.length, lesson.id).toBeGreaterThanOrEqual(3);
      expect(lesson.solution.trim().length, lesson.id).toBeGreaterThan(0);
      expect(lesson.xray.trim().length, lesson.id).toBeGreaterThan(0);
      expect(lesson.toybox, lesson.id).toHaveLength(2);
      expect(lesson.underHood.length, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('solutions satisfy every micro-goal', () => {
    for (const lesson of ALL_LESSONS) {
      const results = checkGoals(lesson.solution, lesson.goals);
      expect(results.filter((goal) => goal.passed).map((goal) => goal.label), lesson.id).toEqual(
        lesson.goals.map((goal) => goal.label),
      );
      for (const round of lesson.trial?.rounds ?? []) {
        const roundGoals = checkGoals(round.solution, round.goals);
        expect(roundGoals.filter((goal) => goal.passed).map((goal) => goal.label), round.id).toEqual(
          round.goals.map((goal) => goal.label),
        );
      }
    }
  });

  it('solutions pass the pre-run linter', () => {
    for (const lesson of ALL_LESSONS) {
      const errors = lintPython(lesson.solution).filter((issue) => issue.severity === 'error');
      expect(errors.map((issue) => `${lesson.id}: ${issue.title} ${issue.message}`), lesson.id).toEqual([]);
      for (const round of lesson.trial?.rounds ?? []) {
        const roundErrors = lintPython(round.solution).filter((issue) => issue.severity === 'error');
        expect(roundErrors.map((issue) => `${round.id}: ${issue.title} ${issue.message}`), round.id).toEqual([]);
      }
    }
  });

  it('solutions fit their own line budget', () => {
    for (const lesson of ALL_LESSONS) {
      const lines = lesson.solution.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
      expect(lines, lesson.id).toBeLessThanOrEqual(lesson.starLines);
      for (const round of lesson.trial?.rounds ?? []) {
        const roundLines = round.solution.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
        expect(roundLines, round.id).toBeLessThanOrEqual(round.starLines);
      }
    }
  });

  it('does not let comments satisfy structural checks', () => {
    const lesson = ALL_LESSONS.find((entry) => entry.id === 'r1-1')!;
    const fake = '# print("Hello, PyOdyssey!")\n# print("Hello, PyOdyssey!")';
    const goals = checkGoals(fake, lesson.goals);
    expect(goals.some((goal) => goal.passed)).toBe(false);
    expect(stripPythonComments('print("# not a comment") # real comment')).toBe('print("# not a comment") ');
    expect(stripPythonComments('text = """1 # 2""" # gone')).toBe('text = """1 # 2""" ');
    const report = validateCode(fake, lesson, {
      ok: true,
      output: 'Hello, PyOdyssey!',
      error: null,
      frames: [],
      durationMs: 1,
    });
    expect(report.passed).toBe(false);
  });
});

describe('live Python execution', () => {
  it('runs every solution and validates output + structure', async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}${path.sep}`;
    const pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(`
import io, sys, builtins, json, traceback

def __test_run(source, stdin_json):
    output = io.StringIO()
    stdin_items = list(json.loads(stdin_json))
    old_stdout, old_stderr, old_input = sys.stdout, sys.stderr, builtins.input
    def reader(prompt=""):
        if prompt:
            sys.stdout.write(str(prompt))
        if not stdin_items:
            return ""
        value = stdin_items.pop(0)
        sys.stdout.write(str(value) + "\\n")
        return str(value)
    sys.stdout = output
    sys.stderr = output
    builtins.input = reader
    error = None
    try:
        exec(compile(source, "<student>", "exec"), {"__name__": "__main__", "__builtins__": builtins})
    except BaseException as exc:
        error = {"type": type(exc).__name__, "message": str(exc)}
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        builtins.input = old_input
    return json.dumps({"output": output.getvalue(), "error": error})
`);

    const failures: string[] = [];
    for (const lesson of ALL_LESSONS) {
      const challenges = lesson.isTrial && lesson.trial
        ? lesson.trial.rounds.map((round) => ({
            id: round.id,
            title: `${lesson.title} / ${round.title}`,
            challenge: { ...lesson, ...round, id: lesson.id, isTrial: true },
            source: round.solution,
            stdin: round.stdin ?? [],
          }))
        : [{
            id: lesson.id,
            title: lesson.title,
            challenge: lesson,
            source: lesson.solution,
            stdin: lesson.stdin ?? [],
          }];

      for (const item of challenges) {
        pyodide.globals.set('__test_source', item.source);
        pyodide.globals.set('__test_stdin', JSON.stringify(item.stdin));
        const raw = (await pyodide.runPythonAsync('__test_run(__test_source, __test_stdin)')) as string;
        const result = JSON.parse(raw) as { output: string; error: { type: string; message: string } | null };
        const run: RunResult = {
          ok: !result.error,
          output: result.output,
          error: result.error
            ? {
                type: result.error.type,
                message: result.error.message,
                line: null,
                traceback: '',
              }
            : null,
          frames: [],
          durationMs: 0,
        };
        const report = validateCode(item.source, item.challenge, run);
        if (!report.passed) {
          failures.push(
            `${item.id} ${item.title}: ${report.failures.map((failure) => failure.label).join('; ')} | out=${JSON.stringify(result.output)} err=${JSON.stringify(result.error)}`,
          );
        }
        if (report.stars < 3) {
          failures.push(
            `${item.id} ${item.title}: only ${report.stars} stars, lines=${report.lineCount}/${item.challenge.starLines}, pythonic=${item.challenge.pythonic ?? 'none'}`,
          );
        }
      }
    }
    expect(failures.join('\n')).toBe('');
  }, 120_000);
});
