import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 3 (r6-1, r6-2, r6-3, r6-4, r6-5, r6-6, r7-1, r7-2)', () => {
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

  const batch3 = [
    {
      id: 'r6-1',
      alt1: 'def build_squares(lim=5):\n    return [x**2 for x in range(1, lim + 1)]\n',
      alt2: 'def build_squares(limit=5):\n    return [int(val * val) for val in range(1, limit + 1)]\n',
      wrong1: 'def build_squares(limit=5):\n    return [x for x in range(1, limit + 1)]\n',
      wrong2: 'def build_squares(limit=5):\n    return [1, 4, 9, 16, 25]\n',
      wrong3: 'def build_squares(limit=5):\n    return [x * 2 for x in range(1, limit + 1)]\n',
    },
    {
      id: 'r6-2',
      alt1: 'def double_prices(p):\n    return {k: p[k] * 2 for k in p}\n',
      alt2: 'def double_prices(prices):\n    return {key: val + val for key, val in prices.items()}\n',
      wrong1: 'def double_prices(prices):\n    return {k: v for k, v in prices.items()}\n',
      wrong2: 'def double_prices(prices):\n    return {"core": 6, "shard": 10}\n',
      wrong3: 'def double_prices(prices):\n    return {}\n',
    },
    {
      id: 'r6-3',
      alt1: 'def filter_evens(nums):\n    return list(filter(lambda x: not (x % 2), nums))\n',
      alt2: 'def filter_evens(n):\n    return list(filter(lambda val: val % 2 == 0, n))\n',
      wrong1: 'def filter_evens(nums):\n    return list(filter(lambda x: x % 2 != 0, nums))\n',
      wrong2: 'def filter_evens(nums):\n    return [2, 4]\n',
      wrong3: 'def filter_evens(nums):\n    return nums\n',
    },
    {
      id: 'r6-4',
      alt1: 'def format_leaderboard(names, scores):\n    return [f"{idx}:{n}={s}" for idx, (n, s) in enumerate(zip(names, scores), 1)]\n',
      alt2: 'def format_leaderboard(names, scores):\n    out = []\n    for i, pair in enumerate(zip(names, scores), 1):\n        out.append(f"{i}:{pair[0]}={pair[1]}")\n    return out\n',
      wrong1: 'def format_leaderboard(names, scores):\n    return [f"{i}:{names[i]}={scores[i]}" for i in range(len(names))]\n',
      wrong2: 'def format_leaderboard(names, scores):\n    return ["1:Nova=7", "2:Echo=9"]\n',
      wrong3: 'def format_leaderboard(names, scores):\n    return []\n',
    },
    {
      id: 'r6-5',
      alt1: 'def clean_title(s="  pyodyssey  "):\n    clean = s.strip()\n    return clean.title()\n',
      alt2: 'def clean_title(raw="  pyodyssey  "):\n    return str(raw).strip().title()\n',
      wrong1: 'def clean_title(raw="  pyodyssey  "):\n    return raw.strip()\n',
      wrong2: 'def clean_title(raw="  pyodyssey  "):\n    return raw.title()\n',
      wrong3: 'def clean_title(raw="  pyodyssey  "):\n    return "Pyodyssey"\n',
    },
    {
      id: 'r6-6',
      alt1: 'def safe_divide(x=10, y=0):\n    try:\n        ans = x / y\n        return str(ans)\n    except ZeroDivisionError:\n        return "SAFE"\n',
      alt2: 'def safe_divide(a=10, b=0):\n    try:\n        return f"{a / b}"\n    except ZeroDivisionError:\n        return "SAFE"\n',
      wrong1: 'def safe_divide(a=10, b=0):\n    return str(a / b)\n',
      wrong2: 'def safe_divide(a=10, b=0):\n    return "SAFE"\n',
      wrong3: 'def safe_divide(a=10, b=0):\n    try:\n        return str(a / b)\n    except Exception:\n        return "ERROR"\n',
    },
    {
      id: 'r7-1',
      alt1: 'class Drone:\n    pass\ndef get_drone_name(prefix=""):\n    d = Drone()\n    return prefix + d.__class__.__name__\n',
      alt2: 'class Drone:\n    pass\ndef get_drone_name(prefix=""):\n    obj = Drone()\n    return f"{prefix}{type(obj).__name__}"\n',
      wrong1: 'class Drone:\n    pass\ndef get_drone_name(prefix=""):\n    return "Rover"\n',
      wrong2: 'class Drone:\n    pass\ndef get_drone_name(prefix=""):\n    return "Drone"\n',
      wrong3: 'class Drone:\n    pass\ndef get_drone_name(prefix=""):\n    return ""\n',
    },
    {
      id: 'r7-2',
      alt1: 'class Robot:\n    def __init__(self, n, h):\n        self.name = n\n        self.hp = h\ndef create_robot_spec(name="Nova", hp=100):\n    r = Robot(name, hp)\n    return [r.name, r.hp]\n',
      alt2: 'class Robot:\n    def __init__(self, name, hp):\n        self.name = str(name)\n        self.hp = int(hp)\ndef create_robot_spec(name="Nova", hp=100):\n    bot = Robot(name=name, hp=hp)\n    return [bot.name, bot.hp]\n',
      wrong1: 'class Robot:\n    def __init__(self, name, hp):\n        self.name = name\n        self.hp = hp\ndef create_robot_spec(name="Nova", hp=100):\n    return ["Nova", 100]\n',
      wrong2: 'class Robot:\n    def __init__(self, name, hp):\n        self.name = ""\n        self.hp = hp\ndef create_robot_spec(name="Nova", hp=100):\n    r = Robot(name, hp)\n    return [r.name, r.hp]\n',
      wrong3: 'class Robot:\n    def __init__(self, name, hp):\n        self.name = name\n        self.hp = 0\ndef create_robot_spec(name="Nova", hp=100):\n    r = Robot(name, hp)\n    return [r.name, r.hp]\n',
    },
  ];

  for (const item of batch3) {
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
