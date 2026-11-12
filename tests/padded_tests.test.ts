import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Item 4: Padded tests and hardcode resistance', () => {
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

  const targetLessons = ['r1-1', 'r1-2', 'r1-3', 'r1-5', 'r1-7', 'r7-boss'];

  it('no lesson or trial round has duplicate test cases', () => {
    const duplicates: string[] = [];
    const allTestable: Array<{ id: string; tests?: any[]; entrypoint?: string }> = [];
    for (const lesson of ALL_LESSONS) {
      allTestable.push(lesson);
      if (lesson.isTrial && lesson.trial?.rounds) {
        for (const r of lesson.trial.rounds) {
          allTestable.push(r);
        }
      }
    }

    for (const item of allTestable) {
      if (!item.tests || item.tests.length <= 1) continue;
      const seen = new Set<string>();
      for (const t of item.tests) {
        const key = JSON.stringify({
          ep: t.entrypoint || item.entrypoint,
          args: t.args ?? [],
          kwargs: t.kwargs ?? {},
          stdin: t.stdin ?? [],
          exp: t.expected ?? null,
          out: t.expectedOutput?.trim() ?? null,
        });
        if (seen.has(key)) {
          duplicates.push(`${item.id}: duplicate test ${t.id} (${key})`);
        }
        seen.add(key);
      }
    }
    expect(duplicates).toEqual([]);
  });

  for (const id of targetLessons) {
    it(`${id} rejects a hardcode attack returning only visible answers`, async () => {
      const lesson = ALL_LESSONS.find((l) => l.id === id)!;
      expect(lesson).toBeTruthy();

      const config = buildGradeConfig(lesson);
      const visibleTests = (lesson.tests ?? []).filter((t) => !t.hidden);
      const hiddenTests = (lesson.tests ?? []).filter((t) => t.hidden);

      // Must have distinct hidden tests to prevent hardcode attacks
      expect(hiddenTests.length).toBeGreaterThanOrEqual(1);

      // Construct hardcoded attacker that only branches on visible tests
      let attackCode = '';
      if (lesson.entrypoint) {
        const branches = visibleTests.map((t) => {
          const argList = (t.args ?? []).map((a) => JSON.stringify(a)).join(', ');
          return `    if args == (${argList},) or list(args) == [${argList}]: return ${JSON.stringify(t.expected)}`;
        });
        attackCode = `def ${lesson.entrypoint}(*args, **kwargs):\n${branches.join('\n')}\n    return None\n`;
      } else if (visibleTests.some((t) => t.entrypoint)) {
        // Multi-entrypoint
        const fnGroups = new Map<string, typeof visibleTests>();
        for (const t of visibleTests) {
          if (!t.entrypoint) continue;
          if (!fnGroups.has(t.entrypoint)) fnGroups.set(t.entrypoint, []);
          fnGroups.get(t.entrypoint)!.push(t);
        }
        const fnDefs: string[] = [];
        for (const [fnName, tests] of fnGroups.entries()) {
          const branches = tests.map((t) => {
            const argList = (t.args ?? []).map((a) => JSON.stringify(a)).join(', ');
            return `    if args == (${argList},) or list(args) == [${argList}]: return ${JSON.stringify(t.expected)}`;
          });
          fnDefs.push(`def ${fnName}(*args, **kwargs):\n${branches.join('\n')}\n    return None\n`);
        }
        attackCode = fnDefs.join('\n');
      } else {
        // Pure script: print only visible expected output
        attackCode = `print(${JSON.stringify(visibleTests[0]?.expectedOutput ?? '')})\n`;
      }

      const res = await runGrader(attackCode, config);
      expect(res.ok).toBe(false);
    });
  }
});
