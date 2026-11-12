import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 2 (r4-3, r4-4, r4-5, r4-6, r5-1, r5-4, r5-5, r5-6)', () => {
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

  const batch2 = [
    {
      id: 'r4-3',
      alt1: 'def get_y(c=(3, 7)):\n    _, y = c\n    return y\n',
      alt2: 'def get_y(coords=(3, 7)):\n    return coords[-1]\n',
      wrong1: 'def get_y(coords=(3, 7)):\n    return coords[0]\n',
      wrong2: 'def get_y(coords=(3, 7)):\n    return 7\n',
      wrong3: 'def get_y(coords=(3, 7)):\n    return len(coords)\n',
    },
    {
      id: 'r4-4',
      alt1: 'def unique_crew_count(m=["Nova", "Echo", "Nova"]):\n    s = set()\n    for x in m: s.add(x)\n    return len(s)\n',
      alt2: 'def unique_crew_count(members=["Nova", "Echo", "Nova"]):\n    return len({x for x in members})\n',
      wrong1: 'def unique_crew_count(members=["Nova", "Echo", "Nova"]):\n    return len(members)\n',
      wrong2: 'def unique_crew_count(members=["Nova", "Echo", "Nova"]):\n    return 2\n',
      wrong3: 'def unique_crew_count(members=["Nova", "Echo", "Nova"]):\n    return 0\n',
    },
    {
      id: 'r4-5',
      alt1: 'def get_hero_level(h):\n    return h.get("level", 0)\n',
      alt2: 'def get_hero_level(hero):\n    lvl = hero["level"]\n    return lvl\n',
      wrong1: 'def get_hero_level(hero):\n    return hero.get("name")\n',
      wrong2: 'def get_hero_level(hero):\n    return 7\n',
      wrong3: 'def get_hero_level(hero):\n    return 0\n',
    },
    {
      id: 'r4-6',
      alt1: 'def get_second_member_name(p):\n    return p.get("members")[1].get("name")\n',
      alt2: 'def get_second_member_name(party):\n    m = party["members"]\n    return m[1]["name"]\n',
      wrong1: 'def get_second_member_name(party):\n    return party["members"][0]["name"]\n',
      wrong2: 'def get_second_member_name(party):\n    return "Echo"\n',
      wrong3: 'def get_second_member_name(party):\n    return party["leader"]\n',
    },
    {
      id: 'r5-1',
      alt1: 'def roar(s="RAWR!"):\n    print(f"{s}")\n    return f"{s}"\n',
      alt2: 'def roar(sound="RAWR!"):\n    out = str(sound)\n    print(out)\n    return out\n',
      wrong1: 'def roar(sound="RAWR!"):\n    return "RAWR!"\n',
      wrong2: 'def roar(sound="RAWR!"):\n    print("QUIET")\n    return "QUIET"\n',
      wrong3: 'def roar(sound="RAWR!"):\n    return ""\n',
    },
    {
      id: 'r5-4',
      alt1: 'def boost(b=10):\n    g = b\n    return g\n',
      alt2: 'def boost(bonus=10):\n    return int(bonus)\n',
      wrong1: 'def boost(bonus=10):\n    return 1\n',
      wrong2: 'def boost(bonus=10):\n    return 0\n',
      wrong3: 'def boost(bonus=10):\n    return bonus - 1\n',
    },
    {
      id: 'r5-5',
      alt1: 'def squad(*n, **s):\n    return [len(n), s.get("power", 0)]\n',
      alt2: 'def squad(*names, **stats):\n    count = len(names)\n    p = stats.get("power", 0)\n    return [count, p]\n',
      wrong1: 'def squad(*names, **stats):\n    return [len(names), 0]\n',
      wrong2: 'def squad(*names, **stats):\n    return [2, 99]\n',
      wrong3: 'def squad(*names, **stats):\n    return [len(names)]\n',
    },
    {
      id: 'r5-6',
      alt1: 'def sort_pairs_first(p):\n    return sorted(p, key=lambda x: x[1])[0]\n',
      alt2: 'def sort_pairs_first(pairs):\n    import operator\n    return sorted(pairs, key=operator.itemgetter(1))[0]\n',
      wrong1: 'def sort_pairs_first(pairs):\n    return pairs[0]\n',
      wrong2: 'def sort_pairs_first(pairs):\n    return sorted(pairs, key=lambda x: x[0])[0]\n',
      wrong3: 'def sort_pairs_first(pairs):\n    return [3, 2]\n',
    },
  ];

  for (const item of batch2) {
    describe(`Lesson ${item.id}`, () => {
      it('reference solution passes', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(lesson.solution, config);
        expect(res.ok).toBe(true);
      });

      it('alternate 1 passes', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.alt1, config);
        expect(res.ok).toBe(true);
      });

      it('alternate 2 passes', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.alt2, config);
        expect(res.ok).toBe(true);
      });

      it('wrong 1 fails', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.wrong1, config);
        expect(res.ok).toBe(false);
      });

      it('wrong 2 fails', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.wrong2, config);
        expect(res.ok).toBe(false);
      });

      it('wrong 3 fails', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.wrong3, config);
        expect(res.ok).toBe(false);
      });
    });
  }
});
