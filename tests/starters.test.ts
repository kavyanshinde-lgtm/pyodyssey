import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Item 3: No starter should pass full grading', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}${path.sep}`;
    pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
  }, 120_000);

  it('no lesson starter passes grading', async () => {
    const passingStarters: string[] = [];

    for (const lesson of ALL_LESSONS) {
      if (lesson.isTrial) continue; // trials have round starters/solutions
      const config = buildGradeConfig(lesson);
      pyodide.globals.set('__test_source', lesson.starter);
      pyodide.globals.set('__test_config_json', JSON.stringify(config));
      const raw = (await pyodide.runPythonAsync(
        '__pyodyssey_grade_code(__test_source, __test_config_json)',
      )) as string;
      const res = JSON.parse(raw) as GradeResult;

      if (res.ok) {
        passingStarters.push(lesson.id);
      }
    }

    expect(passingStarters).toEqual([]);
  }, 120_000);
});
