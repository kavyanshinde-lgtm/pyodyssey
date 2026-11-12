import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Item 1c: All reference solutions pass real grader', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}\\`;
    pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
  }, 120_000);

  it('runs every lesson and trial wave solution through real grader', async () => {
    const failures: string[] = [];

    for (const lesson of ALL_LESSONS) {
      const items = lesson.isTrial && lesson.trial
        ? lesson.trial.rounds.map((round) => ({
            id: round.id,
            challenge: { ...lesson, ...round, id: lesson.id, isTrial: true },
            solution: round.solution,
          }))
        : [{
            id: lesson.id,
            challenge: lesson,
            solution: lesson.solution,
          }];

      for (const item of items) {
        const config = buildGradeConfig(item.challenge);
        pyodide.globals.set('__test_source', item.solution);
        pyodide.globals.set('__test_config_json', JSON.stringify(config));
        const raw = (await pyodide.runPythonAsync(
          '__pyodyssey_grade_code(__test_source, __test_config_json)',
        )) as string;
        const res = JSON.parse(raw) as GradeResult;

        if (!res.ok) {
          const testFailures = res.testResults.filter((t) => !t.passed).map((t) => `${t.id}: ${t.error?.message || t.actualDisplay}`);
          const constructFailures = res.constructResults.filter((c) => !c.passed).map((c) => c.label);
          failures.push(`${item.id}: [tests: ${testFailures.join(', ')}] [constructs: ${constructFailures.join(', ')}]`);
        }
      }
    }

    expect(failures.join('\n')).toBe('');
  }, 180_000);
});
