import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Small fixes before Stage 1', () => {
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

  // 1. r8-twosum: reject while lo <= hi using same element twice, and pass [3, 3] with target 6
  it('1. r8-twosum rejects while lo <= hi using same element twice and passes [3, 3]', async () => {
    const lesson = ALL_LESSONS.find((l) => l.id === 'r8-twosum')!;
    expect(lesson).toBeTruthy();
    const config = buildGradeConfig(lesson);

    // Code using `while left <= right:`
    const loLeHiCode = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    left = 0
    right = len(nums) - 1
    while left <= right:
        current = nums[left] + nums[right]
        if current == target:
            return [left, right]
        elif current < target:
            left += 1
        else:
            right -= 1
    return None
`;
    const res = await runGrader(loLeHiCode, config);
    expect(res.ok).toBe(false);

    // Correct solution passes all tests including [3, 3] target 6
    const resCorrect = await runGrader(lesson.solution, config);
    expect(resCorrect.ok).toBe(true);
    expect(resCorrect.testResults.every((t) => t.passed)).toBe(true);
  });

  // 2. r8-bsearch: instrumented list must count/block .index(), in, and iteration
  it('2. r8-bsearch fails when using .index(), in operator, or for-loop iteration', async () => {
    const lesson = ALL_LESSONS.find((l) => l.id === 'r8-bsearch')!;
    expect(lesson).toBeTruthy();
    const config = buildGradeConfig(lesson);

    const indexCode = `def binary_search(nums: list[int], target: int) -> int:
    try:
        return nums.index(target)
    except ValueError:
        return -1
`;
    const resIndex = await runGrader(indexCode, config);
    expect(resIndex.ok).toBe(false);

    const iterCode = `def binary_search(nums: list[int], target: int) -> int:
    for i, x in enumerate(nums):
        if x == target:
            return i
    return -1
`;
    const resIter = await runGrader(iterCode, config);
    expect(resIter.ok).toBe(false);

    const inCode = `def binary_search(nums: list[int], target: int) -> int:
    if target in nums:
        return nums.index(target)
    return -1
`;
    const resIn = await runGrader(inCode, config);
    expect(resIn.ok).toBe(false);
  });

  // 3. Timeouts: fail test with timeout error even if swallowed by bare except
  it('3. grader fails test with timeout error even when exception swallowed by bare except', async () => {
    const code = `def solution():
    try:
        while True:
            pass
    except:
        return 42
`;
    const config = {
      entrypoint: 'solution',
      testCases: [{ id: 't1', args: [], expected: 42 }],
      timeLimitPerTestMs: 200,
    };
    const res = await runGrader(code, config);
    expect(res.ok).toBe(false);
    expect(res.testResults[0].passed).toBe(false);
    expect(res.testResults[0].error?.timeout).toBe(true);
  });

  // 4. r7-trial-2: replace duplicate test, fail any lesson or trial round with duplicate tests
  it('4. no lesson or trial round has duplicate test cases', () => {
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

  // 5. Use pure: true on lessons that say not to change input, and test mutating solution fails
  it('5. lessons requiring purity have pure: true and reject mutating solutions', async () => {
    const cleanLesson = ALL_LESSONS.find((l) => l.id === 'r8-data-clean')!;
    expect(cleanLesson).toBeTruthy();
    expect(cleanLesson.pure).toBe(true);

    const config = buildGradeConfig(cleanLesson);
    const mutatingCode = `def clean_user_records(records: list[dict]) -> list[dict]:
    for r in records:
        r.clear()
    return []
`;
    const res = await runGrader(mutatingCode, config);
    expect(res.ok).toBe(false);
    expect(res.testResults.some((t) => t.error?.message?.includes('Mutation detected'))).toBe(true);
  });

  // 6. Remove neon glow box-shadows and unused --cyan/--pink/--pyro-* variables from src/styles/modals.css
  it('6. modals.css has no neon glow box-shadows or unused --cyan/--pink/--pyro-* variables', () => {
    const css = fs.readFileSync(path.resolve('src/styles/modals.css'), 'utf-8');
    const forbiddenVars = css.match(/var\(--(?:cyan|pink|pyro-[a-z0-9_-]+)\)/g);
    expect(forbiddenVars ?? []).toEqual([]);

    const neonGlows = css.match(/box-shadow:[^;]*(?:var\(--(?:pink|cyan|green|yellow|pyro)|color-mix\([^)]*--realm-color)/g);
    expect(neonGlows ?? []).toEqual([]);
  });

  // 7. Hint ladder: add tieredHints to all 75 lessons; approach never contains a solution line
  it('7. all 75 lessons have tieredHints and neither concept nor approach contains a solution line', () => {
    expect(ALL_LESSONS).toHaveLength(75);
    const missingTiered: string[] = [];
    const leakedLines: string[] = [];

    for (const lesson of ALL_LESSONS) {
      if (!lesson.tieredHints) {
        missingTiered.push(lesson.id);
        continue;
      }
      const { concept, approach, skeleton } = lesson.tieredHints;
      expect(concept?.length, `${lesson.id} concept`).toBeGreaterThan(10);
      expect(approach?.length, `${lesson.id} approach`).toBeGreaterThan(10);
      expect(skeleton?.length, `${lesson.id} skeleton`).toBeGreaterThan(5);

      const solutionLines = lesson.solution
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length >= 6 && !l.startsWith('#') && l !== 'pass');

      for (const line of solutionLines) {
        if (concept.includes(line)) {
          leakedLines.push(`${lesson.id} concept leaked: "${line}"`);
        }
        if (approach.includes(line)) {
          leakedLines.push(`${lesson.id} approach leaked: "${line}"`);
        }
      }
    }

    expect(missingTiered).toEqual([]);
    expect(leakedLines).toEqual([]);
  });
});
