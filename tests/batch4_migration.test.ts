import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 4 (r7-3, r7-4, r7-5, r7-6, r8-1, r8-2, r8-3, r8-4)', () => {
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

  const batch4 = [
    {
      id: 'r7-3',
      alt1: 'class Robot:\n    faction = "Odyssey"\n    def __init__(self, hp):\n        self.hp = hp\ndef inspect_robots(h1=80, h2=100):\n    b1 = Robot(h1)\n    b2 = Robot(h2)\n    return [Robot.faction, b1.hp, b2.hp]\n',
      alt2: 'class Robot:\n    faction = "Odyssey"\n    def __init__(self, hp):\n        self.hp = int(hp)\ndef inspect_robots(h1=80, h2=100):\n    b1, b2 = Robot(100), Robot(100)\n    b1.hp = h1\n    b2.hp = h2\n    return [Robot.faction, b1.hp, b2.hp]\n',
      wrong1: 'class Robot:\n    faction = "Shadow"\n    def __init__(self, hp):\n        self.hp = hp\ndef inspect_robots(h1=80, h2=100):\n    return ["Shadow", h1, h2]\n',
      wrong2: 'class Robot:\n    faction = "Odyssey"\n    def __init__(self, hp):\n        self.hp = hp\ndef inspect_robots(h1=80, h2=100):\n    return ["Odyssey", 80, 100]\n',
      wrong3: 'class Robot:\n    faction = "Odyssey"\n    def __init__(self, hp):\n        self.hp = hp\ndef inspect_robots(h1=80, h2=100):\n    return [Robot.faction, 100, 100]\n',
    },
    {
      id: 'r7-4',
      alt1: 'class Bot:\n    def __init__(self, bot_id):\n        self.bot_id = bot_id\nclass NovaBot(Bot):\n    def __init__(self, name="Nova"):\n        super(NovaBot, self).__init__(name)\ndef make_nova_bot(name="Nova"):\n    return NovaBot(name).bot_id\n',
      alt2: 'class Bot:\n    def __init__(self, bot_id):\n        self.bot_id = str(bot_id)\nclass NovaBot(Bot):\n    def __init__(self, name="Nova"):\n        super().__init__(name)\ndef make_nova_bot(name="Nova"):\n    b = NovaBot(name)\n    return str(b.bot_id)\n',
      wrong1: 'class Bot:\n    def __init__(self, bot_id):\n        self.bot_id = bot_id\nclass NovaBot(Bot):\n    def __init__(self, name="Nova"):\n        self.bot_id = "Nova"\ndef make_nova_bot(name="Nova"):\n    return NovaBot(name).bot_id\n',
      wrong2: 'class Bot:\n    def __init__(self, bot_id):\n        self.bot_id = bot_id\nclass NovaBot(Bot):\n    def __init__(self, name="Nova"):\n        super().__init__(name)\ndef make_nova_bot(name="Nova"):\n    return "Nova"\n',
      wrong3: 'class Bot:\n    def __init__(self, bot_id):\n        self.bot_id = bot_id\nclass NovaBot(Bot):\n    def __init__(self, name="Nova"):\n        super().__init__("Fixed")\ndef make_nova_bot(name="Nova"):\n    return NovaBot(name).bot_id\n',
    },
    {
      id: 'r7-5',
      alt1: 'class Scout:\n    def speak(self):\n        return "ZIP!"\nclass Tank:\n    def speak(self):\n        return "BOOM!"\ndef run_speaking_bots(prefix=""):\n    out = []\n    for b in (Scout(), Tank()):\n        out.append(prefix + b.speak())\n    return out\n',
      alt2: 'class Scout:\n    def speak(self):\n        return "ZIP!"\nclass Tank:\n    def speak(self):\n        return "BOOM!"\ndef run_speaking_bots(prefix=""):\n    return [prefix + bot.speak() for bot in [Scout(), Tank()]]\n',
      wrong1: 'class Scout:\n    def speak(self):\n        return "ZIP!"\nclass Tank:\n    def speak(self):\n        return "BOOM!"\ndef run_speaking_bots(prefix=""):\n    return ["ZIP!", "BOOM!"]\n',
      wrong2: 'class Scout:\n    def speak(self):\n        return "ZIP!"\nclass Tank:\n    def speak(self):\n        return "BOOM!"\ndef run_speaking_bots(prefix=""):\n    return [prefix + "BOOM!", prefix + "ZIP!"]\n',
      wrong3: 'class Scout:\n    def speak(self):\n        return ""\nclass Tank:\n    def speak(self):\n        return ""\ndef run_speaking_bots(prefix=""):\n    return [prefix + b.speak() for b in [Scout(), Tank()]]\n',
    },
    {
      id: 'r7-6',
      alt1: 'class Hero:\n    def __init__(self, n, p):\n        self.name = n\n        self.power = p\n    def __str__(self):\n        return f"{self.name}:{self.power}"\n    def __eq__(self, o):\n        return isinstance(o, Hero) and self.name == o.name\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    return [str(Hero(n1, p1)), Hero(n1, p1) == Hero(n2, p2)]\n',
      alt2: 'class Hero:\n    def __init__(self, name, power):\n        self.name = str(name)\n        self.power = int(power)\n    def __str__(self):\n        return self.name + ":" + str(self.power)\n    def __eq__(self, other):\n        return hasattr(other, "name") and self.name == other.name\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    h1, h2 = Hero(n1, p1), Hero(n2, p2)\n    return [h1.__str__(), h1 == h2]\n',
      wrong1: 'class Hero:\n    def __init__(self, name, power):\n        self.name = name\n        self.power = power\n    def __str__(self):\n        return "Nova:99"\n    def __eq__(self, other):\n        return True\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    return ["Nova:99", True]\n',
      wrong2: 'class Hero:\n    def __init__(self, name, power):\n        self.name = name\n        self.power = power\n    def __str__(self):\n        return f"{self.name}:{self.power}"\n    def __eq__(self, other):\n        return self.power == other.power\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    h1, h2 = Hero(n1, p1), Hero(n2, p2)\n    return [str(h1), h1 == h2]\n',
      wrong3: 'class Hero:\n    def __init__(self, name, power):\n        self.name = name\n        self.power = power\n    def __str__(self):\n        return f"{self.name}"\n    def __eq__(self, other):\n        return self.name == other.name\ndef compare_heroes(n1="Nova", p1=99, n2="Nova", p2=1):\n    h1, h2 = Hero(n1, p1), Hero(n2, p2)\n    return [str(h1), h1 == h2]\n',
    },
    {
      id: 'r8-1',
      alt1: 'def counter(s=0, inc=1):\n    val = s\n    def tick():\n        nonlocal val\n        val += inc\n        return val\n    return tick\ndef run_counter(start=0, step=1, times=2):\n    fn = counter(start, step)\n    return [fn() for _ in range(times)]\n',
      alt2: 'def counter(start=0, step=1):\n    curr = start\n    def tick():\n        nonlocal curr\n        curr = curr + step\n        return curr\n    return tick\ndef run_counter(start=0, step=1, times=2):\n    c = counter(start, step)\n    res = []\n    for _ in range(times): res.append(c())\n    return res\n',
      wrong1: 'def counter(start=0, step=1):\n    curr = start\n    def tick():\n        nonlocal curr\n        return curr\n    return tick\ndef run_counter(start=0, step=1, times=2):\n    c = counter(start, step)\n    return [c() for _ in range(times)]\n',
      wrong2: 'def counter(start=0, step=1):\n    def tick(): return 1\n    return tick\ndef run_counter(start=0, step=1, times=2):\n    return [1, 2]\n',
      wrong3: 'def counter(start=0, step=1):\n    curr = start\n    def tick():\n        nonlocal curr\n        curr += step + 1\n        return curr\n    return tick\ndef run_counter(start=0, step=1, times=2):\n    c = counter(start, step)\n    return [c() for _ in range(times)]\n',
    },
    {
      id: 'r8-2',
      alt1: 'def shout(fn):\n    def wrapper(*args, **kwargs):\n        res = fn(*args, **kwargs)\n        return res.upper()\n    return wrapper\n@shout\ndef greet(msg="hello!"):\n    return msg\ndef apply_shout(msg="hello!"):\n    return greet(msg)\n',
      alt2: 'def shout(fn):\n    def wrapper(*a, **k):\n        return str(fn(*a, **k)).upper()\n    return wrapper\n@shout\ndef greet(msg="hello!"):\n    return f"{msg}"\ndef apply_shout(msg="hello!"):\n    return greet(msg)\n',
      wrong1: 'def shout(fn):\n    def wrapper(*args, **kwargs):\n        return fn(*args, **kwargs)\n    return wrapper\n@shout\ndef greet(msg="hello!"):\n    return msg\ndef apply_shout(msg="hello!"):\n    return greet(msg)\n',
      wrong2: 'def shout(fn):\n    def wrapper(*args, **kwargs):\n        return "HELLO!"\n    return wrapper\n@shout\ndef greet(msg="hello!"):\n    return msg\ndef apply_shout(msg="hello!"):\n    return "HELLO!"\n',
      wrong3: 'def shout(fn):\n    def wrapper(*args, **kwargs):\n        return fn(*args, **kwargs).lower()\n    return wrapper\n@shout\ndef greet(msg="hello!"):\n    return msg\ndef apply_shout(msg="hello!"):\n    return greet(msg)\n',
    },
    {
      id: 'r8-3',
      alt1: 'def countdown(n=3):\n    while n > 0:\n        yield n\n        n -= 1\ndef run_countdown(n=3):\n    return list(countdown(n))\n',
      alt2: 'def countdown(n=3):\n    yield from range(n, 0, -1)\ndef run_countdown(n=3):\n    return [x for x in countdown(n)]\n',
      wrong1: 'def countdown(n=3):\n    return list(range(n, 0, -1))\ndef run_countdown(n=3):\n    return list(countdown(n))\n',
      wrong2: 'def countdown(n=3):\n    yield 3\n    yield 2\n    yield 1\ndef run_countdown(n=3):\n    return [3, 2, 1]\n',
      wrong3: 'def countdown(n=3):\n    for i in range(n):\n        yield i\ndef run_countdown(n=3):\n    return list(countdown(n))\n',
    },
    {
      id: 'r8-4',
      alt1: 'def vault_cycle(filename="mission.txt", content="NOVA"):\n    with open(filename, "w") as out:\n        out.write(content)\n    with open(filename, "r") as inp:\n        data = inp.read()\n    return data\n',
      alt2: 'def vault_cycle(fn="mission.txt", text="NOVA"):\n    with open(fn, "w") as f:\n        f.write(str(text))\n    with open(fn) as f:\n        return f.read()\n',
      wrong1: 'def vault_cycle(filename="mission.txt", content="NOVA"):\n    return content\n',
      wrong2: 'def vault_cycle(filename="mission.txt", content="NOVA"):\n    return "NOVA"\n',
      wrong3: 'def vault_cycle(filename="mission.txt", content="NOVA"):\n    with open(filename, "w") as f:\n        f.write(content)\n    return ""\n',
    },
  ];

  for (const item of batch4) {
    describe(`Lesson ${item.id}`, () => {
      it('reference solution passes', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(lesson.solution, config);
        expect(res.ok).toBe(true);
        expect(res.testResults.every((t) => t.passed)).toBe(true);
      });

      it('alt 1 passes', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.alt1, config);
        expect(res.ok).toBe(true);
        expect(res.testResults.every((t) => t.passed)).toBe(true);
      });

      it('alt 2 passes', async () => {
        const lesson = ALL_LESSONS.find((l) => l.id === item.id)!;
        const config = buildGradeConfig(lesson);
        const res = await runGrader(item.alt2, config);
        expect(res.ok).toBe(true);
        expect(res.testResults.every((t) => t.passed)).toBe(true);
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
