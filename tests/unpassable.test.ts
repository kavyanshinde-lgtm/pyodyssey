import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Item 1: Unpassable reference solutions', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}\\`;
    pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
  }, 120_000);

  async function gradeSolution(lessonId: string): Promise<GradeResult> {
    const lesson = ALL_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) throw new Error(`Lesson ${lessonId} not found`);
    const config = buildGradeConfig(lesson);
    pyodide.globals.set('__test_source', lesson.solution);
    pyodide.globals.set('__test_config_json', JSON.stringify(config));
    const raw = (await pyodide.runPythonAsync(
      '__pyodyssey_grade_code(__test_source, __test_config_json)',
    )) as string;
    return JSON.parse(raw) as GradeResult;
  }

  it('r1-6 reference solution passes grader without prompt echo corruption', async () => {
    const res = await gradeSolution('r1-6');
    expect(res.ok).toBe(true);
    expect(res.testResults.every((t) => t.passed)).toBe(true);
  });

  const brokenProjects = [
    'r1-boss',
    'r2-boss',
    'r3-boss',
    'r4-boss',
    'r5-boss',
    'r6-boss',
    'r8-boss',
  ];

  for (const id of brokenProjects) {
    it(`${id} reference solution passes its multi-entrypoint tests`, async () => {
      const res = await gradeSolution(id);
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });
  }
});
