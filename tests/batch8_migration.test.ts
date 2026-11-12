import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 8 (r8-trial-2, r8-trial-3)', () => {
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

  function getChallenge(id: string): any {
    for (const l of ALL_LESSONS) {
      if (l.id === id) return l;
      if (l.isTrial && l.trial) {
        const r = l.trial.rounds.find((round) => round.id === id);
        if (r) return { ...l, ...r, id: l.id, isTrial: true };
      }
    }
    throw new Error(`Challenge not found: ${id}`);
  }

  const batch8 = [
    {
      id: 'r8-trial-2',
      alt1: 'def shout(f):\n    def wrap():\n        return str(f()).upper()\n    return wrap\n\ndef apply_shout(msg="hello!"):\n    @shout\n    def temp():\n        return msg\n    return temp()\n',
      alt2: 'def shout(fn):\n    return lambda: fn().upper()\n\ndef apply_shout(msg="hello!"):\n    @shout\n    def temp():\n        return msg\n    return temp()\n',
      wrong1: 'def apply_shout(msg="hello!"):\n    return "HELLO!"\n',
      wrong2: 'def shout(fn):\n    def wrapper():\n        return fn()\n    return wrapper\n\ndef apply_shout(msg="hello!"):\n    @shout\n    def temp():\n        return msg\n    return temp()\n',
      wrong3: 'def apply_shout(msg="hello!"):\n    return ""\n',
    },
    {
      id: 'r8-trial-3',
      alt1: 'def factorial(n):\n    return 1 if n <= 1 else n * factorial(n - 1)\n\ndef sequence(limit=5):\n    for i in range(limit):\n        yield factorial(i)\n\ndef run_gate(limit=5, items=None):\n    data = [1, 2, 3, 2] if items is None else items\n    with open("trial.txt", "w") as f:\n        f.write(str(sum(sequence(limit))))\n    with open("trial.txt", "r") as f:\n        val = int(f.read())\n    return [val, len({*data})]\n',
      alt2: 'def factorial(n):\n    if n < 2:\n        return 1\n    return n * factorial(n - 1)\n\ndef sequence(limit=5):\n    yield from [factorial(i) for i in range(limit)]\n\ndef run_gate(limit=5, items=None):\n    lst = [1, 2, 3, 2] if items is None else items\n    with open("trial.txt", "w") as fp:\n        fp.write(str(sum(sequence(limit))))\n    with open("trial.txt") as fp:\n        read_content = int(fp.read().strip())\n    return [read_content, len(set(lst))]\n',
      wrong1: 'def run_gate(limit=5, items=None):\n    return [34, 3]\n',
      wrong2: 'def run_gate(limit=5, items=None):\n    return [0, 0]\n',
      wrong3: 'def run_gate(limit=5, items=None):\n    return []\n',
    },
  ];

  for (const item of batch8) {
    describe(`Item ${item.id}`, () => {
      it('reference solution passes', async () => {
        const ch = getChallenge(item.id);
        const config = buildGradeConfig(ch);
        const res = await runGrader(ch.solution, config);
        expect(res.ok).toBe(true);
        expect(res.testResults.every((t) => t.passed)).toBe(true);
      });

      it('alt 1 passes', async () => {
        const ch = getChallenge(item.id);
        const config = buildGradeConfig(ch);
        const res = await runGrader(item.alt1, config);
        expect(res.ok).toBe(true);
        expect(res.testResults.every((t) => t.passed)).toBe(true);
      });

      it('alt 2 passes', async () => {
        const ch = getChallenge(item.id);
        const config = buildGradeConfig(ch);
        const res = await runGrader(item.alt2, config);
        expect(res.ok).toBe(true);
        expect(res.testResults.every((t) => t.passed)).toBe(true);
      });

      it('wrong 1 fails', async () => {
        const ch = getChallenge(item.id);
        const config = buildGradeConfig(ch);
        const res = await runGrader(item.wrong1, config);
        expect(res.ok).toBe(false);
      });

      it('wrong 2 fails', async () => {
        const ch = getChallenge(item.id);
        const config = buildGradeConfig(ch);
        const res = await runGrader(item.wrong2, config);
        expect(res.ok).toBe(false);
      });

      it('wrong 3 fails', async () => {
        const ch = getChallenge(item.id);
        const config = buildGradeConfig(ch);
        const res = await runGrader(item.wrong3, config);
        expect(res.ok).toBe(false);
      });
    });
  }
});
