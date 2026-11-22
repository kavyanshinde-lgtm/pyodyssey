import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Item 5: Grader improvements in graderPython.ts', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}${path.sep}`;
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

  it('rejects bool when int expected (bool != int)', async () => {
    const source = 'def f(x):\n    return True\n';
    const config = {
      entrypoint: 'f',
      testCases: [{ id: 't1', args: [0], expected: 1, hidden: false }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
  });

  it('rejects int when bool expected (int != bool)', async () => {
    const source = 'def f(x):\n    return 1\n';
    const config = {
      entrypoint: 'f',
      testCases: [{ id: 't1', args: [0], expected: true, hidden: false }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
  });

  it('requires exact int matching without float tolerance', async () => {
    const source = 'def f(x):\n    return 1000000001\n';
    const config = {
      entrypoint: 'f',
      testCases: [{ id: 't1', args: [0], expected: 1000000000, hidden: false }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
  });

  it('uses 1e-9 tolerance for floats', async () => {
    const source = 'def f(x):\n    return 1.00000000005\n';
    const config = {
      entrypoint: 'f',
      testCases: [{ id: 't1', args: [0], expected: 1.0, hidden: false }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(true);
    expect(res.testResults[0].passed).toBe(true);

    const sourceCoarse = 'def f(x):\n    return 1.00001\n';
    const resCoarse = await runGrader(sourceCoarse, config);
    expect(resCoarse.ok).toBe(false);
    expect(resCoarse.testResults[0].passed).toBe(false);
  });

  it('hides hidden test values on failure when failedAttempts < 2', async () => {
    const source = 'def f(x):\n    return x + 1\n';
    const config = {
      entrypoint: 'f',
      failedAttempts: 0,
      testCases: [{ id: 't1', args: [42], expected: 999, hidden: true }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    const t = res.testResults[0];
    expect(t.passed).toBe(false);
    expect(t.inputDisplay).toBe('<hidden>');
    expect(t.expectedDisplay).toBe('<hidden>');
    expect(t.actualDisplay).toBe('<hidden>');
  });

  it('reveals hidden test values on failure when failedAttempts >= 2', async () => {
    const source = 'def f(x):\n    return x + 1\n';
    const config = {
      entrypoint: 'f',
      failedAttempts: 2,
      testCases: [{ id: 't1', args: [42], expected: 999, hidden: true }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    const t = res.testResults[0];
    expect(t.passed).toBe(false);
    expect(t.inputDisplay).toBe('f(42)');
    expect(t.expectedDisplay).toBe('999');
    expect(t.actualDisplay).toBe('43');
  });

  it('provides fresh namespace per test to prevent state leakage', async () => {
    const source = 'cache = []\ndef add_val(x):\n    cache.append(x)\n    return list(cache)\n';
    const config = {
      entrypoint: 'add_val',
      testCases: [
        { id: 't1', args: ['a'], expected: ['a'], hidden: false },
        { id: 't2', args: ['b'], expected: ['b'], hidden: false },
      ],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(true);
    expect(res.testResults[0].passed).toBe(true);
    expect(res.testResults[1].passed).toBe(true);
  });

  it('detects argument mutation when pure: true', async () => {
    const source = 'def sort_in_place(lst):\n    lst.sort()\n    return lst\n';
    const config = {
      entrypoint: 'sort_in_place',
      testCases: [
        { id: 't1', args: [[3, 1, 2]], expected: [1, 2, 3], pure: true, hidden: false },
      ],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
    expect(res.testResults[0].error?.message).toMatch(/your function changed its input/i);
  });

  it('terminates infinite loop even when student catches Exception', async () => {
    const source = 'def loop():\n    while True:\n        try:\n            pass\n        except Exception:\n            pass\n';
    const config = {
      entrypoint: 'loop',
      timeLimitPerTestMs: 150,
      testCases: [{ id: 't1', args: [], expected: 0, hidden: false }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
    expect(res.testResults[0].error?.timeout).toBe(true);
  });

  it('blocks dangerous modules like socket and subprocess', async () => {
    const source = 'def net():\n    import socket\n    return socket\n';
    const config = {
      entrypoint: 'net',
      testCases: [{ id: 't1', args: [], expected: null, hidden: false }],
    };
    const res = await runGrader(source, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
    expect(res.testResults[0].error?.type).toBe('ModuleNotFoundError');
  });
});
