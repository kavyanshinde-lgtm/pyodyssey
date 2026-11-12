import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 6 (r3-trial-1..3, r4-trial-1..3, r5-trial-1..2)', () => {
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

  const batch6 = [
    {
      id: 'r3-trial-1',
      alt1: 'def countdown_fuel(start=3):\n    out = []\n    f = start\n    while f > 0:\n        out.append(f)\n        f = f - 1\n    out.append("LIFTOFF")\n    return out\n',
      alt2: 'def countdown_fuel(start=3):\n    res = []\n    curr = int(start)\n    while curr >= 1:\n        res.append(curr)\n        curr -= 1\n    res.append("LIFTOFF")\n    return res\n',
      wrong1: 'def countdown_fuel(start=3):\n    return [3, 2, 1, "LIFTOFF"]\n',
      wrong2: 'def countdown_fuel(start=3):\n    return ["LIFTOFF"]\n',
      wrong3: 'def countdown_fuel(start=3):\n    return [start, "LIFTOFF"]\n',
    },
    {
      id: 'r3-trial-2',
      alt1: 'def accumulate_survivors(limit=7, skip=3, stop=6):\n    s = 0\n    for x in range(1, limit):\n        if x == skip: continue\n        if x >= stop: break\n        s += x\n    return s\n',
      alt2: 'def accumulate_survivors(limit=7, skip=3, stop=6):\n    nums = [n for n in range(1, min(limit, stop)) if n != skip]\n    return sum(nums)\n',
      wrong1: 'def accumulate_survivors(limit=7, skip=3, stop=6):\n    return 12\n',
      wrong2: 'def accumulate_survivors(limit=7, skip=3, stop=6):\n    return 0\n',
      wrong3: 'def accumulate_survivors(limit=7, skip=3, stop=6):\n    return sum(range(1, limit))\n',
    },
    {
      id: 'r3-trial-3',
      alt1: 'def build_starforge(rows=3):\n    return ["*" * i for i in range(1, rows + 1)]\n',
      alt2: 'def build_starforge(rows=3):\n    out = []\n    for r in range(1, rows + 1):\n        s = ""\n        for _ in range(r): s += "*"\n        out.append(s)\n    return out\n',
      wrong1: 'def build_starforge(rows=3):\n    return ["*", "**", "***"]\n',
      wrong2: 'def build_starforge(rows=3):\n    return ["*" for _ in range(rows)]\n',
      wrong3: 'def build_starforge(rows=3):\n    return []\n',
    },
    {
      id: 'r4-trial-1',
      alt1: 'def process_cargo(items=None, add_item=60, start=1, stop=5, step=2):\n    c = list(items if items is not None else [10, 20, 30, 40, 50])\n    c += [add_item]\n    return c[start:stop:step]\n',
      alt2: 'def process_cargo(items=None, add_item=60, start=1, stop=5, step=2):\n    base = [10, 20, 30, 40, 50] if items is None else items\n    extended = [*base, add_item]\n    return [extended[i] for i in range(start, min(stop, len(extended)), step)]\n',
      wrong1: 'def process_cargo(items=None, add_item=60, start=1, stop=5, step=2):\n    return [20, 40]\n',
      wrong2: 'def process_cargo(items=None, add_item=60, start=1, stop=5, step=2):\n    return items if items is not None else []\n',
      wrong3: 'def process_cargo(items=None, add_item=60, start=1, stop=5, step=2):\n    return []\n',
    },
    {
      id: 'r4-trial-2',
      alt1: 'def inspect_manifest(coords=(3, 7), crew=None):\n    if crew is None: crew = ["Nova", "Echo", "Nova"]\n    return [coords[-1], len({*crew})]\n',
      alt2: 'def inspect_manifest(coords=(3, 7), crew=None):\n    c = ["Nova", "Echo", "Nova"] if crew is None else crew\n    unique = len(set(c))\n    return [coords[1], unique]\n',
      wrong1: 'def inspect_manifest(coords=(3, 7), crew=None):\n    return [7, 2]\n',
      wrong2: 'def inspect_manifest(coords=(3, 7), crew=None):\n    return [coords[0], 2]\n',
      wrong3: 'def inspect_manifest(coords=(3, 7), crew=None):\n    return [coords[1], len(crew) if crew else 3]\n',
    },
    {
      id: 'r4-trial-3',
      alt1: 'def open_loot_vault(vault=None):\n    v = {"core": 3, "shards": [5, 8]} if vault is None else vault\n    c = v.get("core")\n    s = v.get("shards")[1]\n    return f"LOOT {c + s}"\n',
      alt2: 'def open_loot_vault(vault=None):\n    if vault is None: vault = {"core": 3, "shards": [5, 8]}\n    ans = vault["core"] + vault["shards"][1]\n    return "LOOT " + str(ans)\n',
      wrong1: 'def open_loot_vault(vault=None):\n    return "LOOT 11"\n',
      wrong2: 'def open_loot_vault(vault=None):\n    return "LOOT 0"\n',
      wrong3: 'def open_loot_vault(vault=None):\n    if vault is None: vault = {"core": 3, "shards": [5, 8]}\n    return f"LOOT {vault[\'core\']}"\n',
    },
    {
      id: 'r5-trial-1',
      alt1: 'def double(n: int) -> int:\n    res = n + n\n    return res\n',
      alt2: 'def double(num):\n    return int(num) * 2\n',
      wrong1: 'def double(n):\n    return 18\n',
      wrong2: 'def double(n):\n    return n\n',
      wrong3: 'def double(n):\n    return n * 3\n',
    },
    {
      id: 'r5-trial-2',
      alt1: 'def squad(*names, **stats):\n    c = len(names)\n    p = stats["power"] if "power" in stats else 0\n    return [c, p]\n',
      alt2: 'def squad(*n, **s):\n    return [len(n), s.get("power", 0)]\n',
      wrong1: 'def squad(*names, **stats):\n    return [2, 99]\n',
      wrong2: 'def squad(*names, **stats):\n    return [len(names), 0]\n',
      wrong3: 'def squad(*names, **stats):\n    return [len(names)]\n',
    },
  ];

  for (const item of batch6) {
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
