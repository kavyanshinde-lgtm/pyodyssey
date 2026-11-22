import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 7 (r5-trial-3, r6-trial-1..3, r7-trial-1..3, r8-trial-1)', () => {
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

  const batch7 = [
    {
      id: 'r5-trial-3',
      alt1: 'def boost_and_sort(pairs=None):\n    if pairs is None:\n        pairs = [(1, 4), (3, 2)]\n    p_list = [p for p in pairs]\n    p_list.sort(key=lambda item: item[1])\n    return [10, 1, p_list[0]]\n',
      alt2: 'def boost_and_sort(pairs=None):\n    data = list(pairs or [(1, 4), (3, 2)])\n    res = sorted(data, key=lambda x: x[1])\n    return [10, 1, res[0]]\n',
      wrong1: 'def boost_and_sort(pairs=None):\n    return [10, 1, (3, 2)]\n',
      wrong2: 'def boost_and_sort(pairs=None):\n    data = list(pairs or [(1, 4), (3, 2)])\n    res = sorted(data, key=lambda x: x[0])\n    return [10, 1, res[0]]\n',
      wrong3: 'def boost_and_sort(pairs=None):\n    return []\n',
    },
    {
      id: 'r6-trial-1',
      alt1: 'def generate_squares(start=1, stop=6):\n    return [x ** 2 for x in range(start, stop)]\n',
      alt2: 'def generate_squares(start=1, stop=6):\n    return [i * i for i in range(int(start), int(stop))]\n',
      wrong1: 'def generate_squares(start=1, stop=6):\n    return [1, 4, 9, 16, 25]\n',
      wrong2: 'def generate_squares(start=1, stop=6):\n    return [x for x in range(start, stop)]\n',
      wrong3: 'def generate_squares(start=1, stop=6):\n    return []\n',
    },
    {
      id: 'r6-trial-2',
      alt1: 'def pair_scores(names=None, scores=None):\n    if names is None: names = ["Nova", "Echo"]\n    if scores is None: scores = [7, 9]\n    return [f"{a}:{b}" for a, b in zip(names, scores)]\n',
      alt2: 'def pair_scores(names=None, scores=None):\n    n = names if names is not None else ["Nova", "Echo"]\n    s = scores if scores is not None else [7, 9]\n    return [str(k) + ":" + str(v) for k, v in zip(n, s)]\n',
      wrong1: 'def pair_scores(names=None, scores=None):\n    return ["Nova:7", "Echo:9"]\n',
      wrong2: 'def pair_scores(names=None, scores=None):\n    return [f"{s}:{n}" for n, s in zip(names, scores)] if names else []\n',
      wrong3: 'def pair_scores(names=None, scores=None):\n    return []\n',
    },
    {
      id: 'r6-trial-3',
      alt1: 'def clean_and_catch(raw="  PYODYSSEY  ", val="x"):\n    res = [raw.strip().title()]\n    try:\n        res.append(int(val))\n    except ValueError:\n        res.append("SAFE")\n    finally:\n        res.append("DONE")\n    return res\n',
      alt2: 'def clean_and_catch(raw="  PYODYSSEY  ", val="x"):\n    ans = []\n    ans.append(str(raw).strip().title())\n    try:\n        parsed = int(val)\n        ans.append(parsed)\n    except ValueError:\n        ans.append("SAFE")\n    finally:\n        ans.append("DONE")\n    return ans\n',
      wrong1: 'def clean_and_catch(raw="  PYODYSSEY  ", val="x"):\n    return ["Pyodyssey", "SAFE", "DONE"]\n',
      wrong2: 'def clean_and_catch(raw="  PYODYSSEY  ", val="x"):\n    return [raw.strip().title(), "SAFE"]\n',
      wrong3: 'def clean_and_catch(raw="  PYODYSSEY  ", val="x"):\n    return []\n',
    },
    {
      id: 'r7-trial-1',
      alt1: 'class Drone:\n    def __init__(self, name, hp):\n        self.name = str(name)\n        self.hp = int(hp)\n\ndef create_drone(name="Nova", hp=100):\n    obj = Drone(name, hp)\n    return [obj.name, obj.hp]\n',
      alt2: 'class Drone:\n    def __init__(self, n, h):\n        self.name = n\n        self.hp = h\n\ndef create_drone(name="Nova", hp=100):\n    return [Drone(name, hp).name, Drone(name, hp).hp]\n',
      wrong1: 'def create_drone(name="Nova", hp=100):\n    return ["Nova", 100]\n',
      wrong2: 'def create_drone(name="Nova", hp=100):\n    return [name, 0]\n',
      wrong3: 'def create_drone(name="Nova", hp=100):\n    return []\n',
    },
    {
      id: 'r7-trial-2',
      alt1: 'class Bot:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return "BEEP"\n\nclass NovaBot(Bot):\n    def __init__(self):\n        super().__init__("Nova")\n    def speak(self):\n        return "ZIP!"\n\ndef create_novabot(suffix=""):\n    nb = NovaBot()\n    return [nb.name + suffix, nb.speak()]\n',
      alt2: 'class Bot:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return "BEEP"\n\nclass NovaBot(Bot):\n    def __init__(self):\n        super(NovaBot, self).__init__("Nova")\n    def speak(self):\n        return "ZIP!"\n\ndef create_novabot(suffix=""):\n    return [NovaBot().name + suffix, NovaBot().speak()]\n',
      wrong1: 'class Bot:\n    def __init__(self, name):\n        self.name = name\n    def speak(self):\n        return "BEEP"\n\nclass NovaBot(Bot):\n    def __init__(self):\n        super().__init__("Nova")\n\ndef create_novabot(suffix=""):\n    return [NovaBot().name + suffix, NovaBot().speak()]\n',
      wrong2: 'def create_novabot(suffix=""):\n    return ["Nova", "ZIP!"]\n',
      wrong3: 'def create_novabot(suffix=""):\n    return []\n',
    },
    {
      id: 'r7-trial-3',
      alt1: 'class Hero:\n    faction = "Odyssey"\n    def __init__(self, name, power):\n        self.name = name\n        self.power = power\n    def __str__(self):\n        return f"{self.name}:{self.power}"\n    def __eq__(self, other):\n        return self.name == getattr(other, "name", None)\n\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    h1, h2 = Hero(n1, p1), Hero(n2, p2)\n    return [str(h1), h1 == h2, Hero.faction]\n',
      alt2: 'class Hero:\n    faction = "Odyssey"\n    def __init__(self, n, p):\n        self.name = str(n)\n        self.power = int(p)\n    def __str__(self):\n        return str(self.name) + ":" + str(self.power)\n    def __eq__(self, o):\n        return self.name == o.name\n\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    return [str(Hero(n1, p1)), Hero(n1, p1) == Hero(n2, p2), Hero.faction]\n',
      wrong1: 'def compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    return ["Nova:99", True, "Odyssey"]\n',
      wrong2: 'class Hero:\n    faction = "Odyssey"\n    def __init__(self, name, power):\n        self.name = name\n        self.power = power\n    def __str__(self):\n        return f"{self.name}:{self.power}"\n    def __eq__(self, other):\n        return self.power == other.power\n\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    return [str(Hero(n1, p1)), Hero(n1, p1) == Hero(n2, p2), Hero.faction]\n',
      wrong3: 'def compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    return []\n',
    },
    {
      id: 'r8-trial-1',
      alt1: 'def counter():\n    cnt = 0\n    def tick():\n        nonlocal cnt\n        cnt = cnt + 1\n        return cnt\n    return tick\n\ndef use_counter(ticks=2):\n    c = counter()\n    return [c() for _ in range(ticks)]\n',
      alt2: 'def counter():\n    n = 0\n    def tick():\n        nonlocal n\n        n += 1\n        return n\n    return tick\n\ndef use_counter(ticks=2):\n    fn = counter()\n    out = []\n    for _ in range(ticks):\n        out.append(fn())\n    return out\n',
      wrong1: 'def use_counter(ticks=2):\n    return [1, 2]\n',
      wrong2: 'def counter():\n    def tick():\n        return 1\n    return tick\n\ndef use_counter(ticks=2):\n    c = counter()\n    return [c() for _ in range(ticks)]\n',
      wrong3: 'def use_counter(ticks=2):\n    return []\n',
    },
  ];

  for (const item of batch7) {
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
