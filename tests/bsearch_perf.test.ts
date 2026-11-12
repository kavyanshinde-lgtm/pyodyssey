import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Item 6: Performance / call-count check for r8-bsearch', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}\\`;
    pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
  }, 120_000);

  async function runGrader(source: string, config: any): Promise<GradeResult> {
    pyodide.globals.set('__test_source', source);
    pyodide.globals.set('__test_config_json', JSON.stringify(config));
    const raw = (await pyodide.runPythonAsync(
      '__pyodyssey_grade_code(__test_source, __test_config_json)',
    )) as string;
    return JSON.parse(raw) as GradeResult;
  }

  it('rejects linear search on r8-bsearch', async () => {
    const lesson = ALL_LESSONS.find((l) => l.id === 'r8-bsearch')!;
    const config = buildGradeConfig(lesson);
    const linearSearch = `def binary_search(nums, target):
    for i, x in enumerate(nums):
        if x == target: return i
    return -1
`;
    const res = await runGrader(linearSearch, config);
    expect(res.ok).toBe(false);
    const perfTest = res.testResults.find((t) => t.id === 't-perf');
    expect(perfTest).toBeTruthy();
    expect(perfTest?.passed).toBe(false);
  });

  it('accepts correct binary search on r8-bsearch', async () => {
    const lesson = ALL_LESSONS.find((l) => l.id === 'r8-bsearch')!;
    const config = buildGradeConfig(lesson);
    const res = await runGrader(lesson.solution, config);
    expect(res.ok).toBe(true);
    const perfTest = res.testResults.find((t) => t.id === 't-perf');
    expect(perfTest).toBeTruthy();
    expect(perfTest?.passed).toBe(true);
  });
});
