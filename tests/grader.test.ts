import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('behavioral grader test suite (Phase 1)', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}\\`;
    pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
  }, 120_000);

  async function runGrade(source: string, lessonId: string): Promise<GradeResult> {
    const lesson = ALL_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) throw new Error(`Lesson ${lessonId} not found`);
    const config = buildGradeConfig(lesson);
    pyodide.globals.set('__test_source', source);
    pyodide.globals.set('__test_config_json', JSON.stringify(config));
    const raw = (await pyodide.runPythonAsync(
      '__pyodyssey_grade_code(__test_source, __test_config_json)',
    )) as string;
    return JSON.parse(raw) as GradeResult;
  }

  // 1. r1-1: The Megaphone (stdout exact matching)
  describe('r1-1: The Megaphone', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        'def say_hello(target: str = "PyOdyssey") -> str:\n    return f"Hello, {target}!"\n\nprint("Hello, PyOdyssey!")',
        'r1-1',
      );
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with variable passes', async () => {
      const res = await runGrade(
        'def say_hello(target):\n    msg = "Hello, " + target + "!"\n    return msg\nprint(say_hello("PyOdyssey"))',
        'r1-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with format passes', async () => {
      const res = await runGrade(
        'def say_hello(target):\n    return "Hello, {}!".format(target)\nprint(say_hello("PyOdyssey"))',
        'r1-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: missing comma fails', async () => {
      const res = await runGrade(
        'def say_hello(target):\n    return f"Hello {target}!"\nprint("Hello, PyOdyssey!")',
        'r1-1',
      );
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: wrong capitalization fails', async () => {
      const res = await runGrade(
        'def say_hello(target):\n    return f"hello, {target}!"\nprint("Hello, PyOdyssey!")',
        'r1-1',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: trailing junk fails (rejects substring bug)', async () => {
      const res = await runGrade(
        'def say_hello(target):\n    return f"Hello, {target}! Extra"\nprint("Hello, PyOdyssey!")',
        'r1-1',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 2. r1-4: Magic Name Tag (f-string construct check)
  describe('r1-4: Magic Name Tag', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        'def format_profile(name, level):\n    return f"Pilot {name} is level {level}"',
        'r1-4',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 with intermediate title passes', async () => {
      const res = await runGrade(
        'def format_profile(name: str, level: int) -> str:\n    title = f"Pilot {name}"\n    return f"{title} is level {level}"',
        'r1-4',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with type casts passes', async () => {
      const res = await runGrade(
        'def format_profile(name, level):\n    return f"Pilot {str(name)} is level {int(level)}"',
        'r1-4',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: missing f-string construct check fails', async () => {
      const res = await runGrade(
        'def format_profile(name, level):\n    return "Pilot %s is level %s" % (name, level)',
        'r1-4',
      );
      expect(res.ok).toBe(false);
      expect(res.constructResults.some((c) => !c.passed)).toBe(true);
    });

    it('(c2) wrong 2: hardcoded return fails hidden tests', async () => {
      const res = await runGrade(
        'def format_profile(name, level):\n    return "Pilot Nova is level 7"',
        'r1-4',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: missing "Pilot" word fails', async () => {
      const res = await runGrade(
        'def format_profile(name, level):\n    return f"{name} is level {level}"',
        'r1-4',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 3. r2-1: Light Switch (boolean manipulation)
  describe('r2-1: Light Switch', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade('def toggle_shield(is_active):\n    return not is_active', 'r2-1');
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 with if/else passes', async () => {
      const res = await runGrade(
        'def toggle_shield(is_active):\n    if is_active:\n        return False\n    return True',
        'r2-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with ternary expression passes', async () => {
      const res = await runGrade(
        'def toggle_shield(is_active):\n    return False if is_active else True',
        'r2-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: hardcoded True fails', async () => {
      const res = await runGrade('def toggle_shield(is_active):\n    return True', 'r2-1');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: wrong return type (str instead of bool) fails', async () => {
      const res = await runGrade(
        'def toggle_shield(is_active):\n    return "False" if is_active else "True"',
        'r2-1',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: uninverted bool(is_active) fails', async () => {
      const res = await runGrade('def toggle_shield(is_active):\n    return bool(is_active)', 'r2-1');
      expect(res.ok).toBe(false);
    });
  });

  // 4. r2-3: The Fork in the Road (conditionals & boundary)
  describe('r2-3: The Fork in the Road', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        'def check_energy(energy):\n    if energy > 0:\n        return "GO"\n    else:\n        return "REST"',
        'r2-3',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 with ternary expression passes', async () => {
      const res = await runGrade(
        'def check_energy(energy):\n    return "GO" if energy > 0 else "REST"',
        'r2-3',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with guard clause passes', async () => {
      const res = await runGrade(
        'def check_energy(energy):\n    if energy > 0:\n        return "GO"\n    return "REST"',
        'r2-3',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: off-by-one >= 0 condition fails boundary at zero', async () => {
      const res = await runGrade(
        'def check_energy(energy):\n    return "GO" if energy >= 0 else "REST"',
        'r2-3',
      );
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded "GO" fails negative tests', async () => {
      const res = await runGrade('def check_energy(energy):\n    return "GO"', 'r2-3');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: wrong casing "Go" fails exact comparison', async () => {
      const res = await runGrade(
        'def check_energy(energy):\n    return "Go" if energy > 0 else "Rest"',
        'r2-3',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 5. r3-1: Fuel Countdown (while loop construct & sequence)
  describe('r3-1: Fuel Countdown', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        `def fuel_countdown(start):
    res = []
    curr = start
    while curr >= 1:
        res.append(curr)
        curr -= 1
    res.append("LIFTOFF")
    return res`,
        'r3-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 with decremented counter passes', async () => {
      const res = await runGrade(
        `def fuel_countdown(start):
    res = []
    n = start
    while n > 0:
        res.append(n)
        n = n - 1
    res.append("LIFTOFF")
    return res`,
        'r3-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with while True and break passes', async () => {
      const res = await runGrade(
        `def fuel_countdown(start):
    res = []
    c = start
    while True:
        if c < 1:
            break
        res.append(c)
        c -= 1
    res.append("LIFTOFF")
    return res`,
        'r3-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: missing while construct check fails', async () => {
      const res = await runGrade(
        'def fuel_countdown(start):\n    return list(range(start, 0, -1)) + ["LIFTOFF"]',
        'r3-1',
      );
      expect(res.ok).toBe(false);
      expect(res.constructResults.some((c) => !c.passed)).toBe(true);
    });

    it('(c2) wrong 2: off-by-one counts down to 0 fails', async () => {
      const res = await runGrade(
        `def fuel_countdown(start):
    res = []
    c = start
    while c >= 0:
        res.append(c)
        c -= 1
    res.append("LIFTOFF")
    return res`,
        'r3-1',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: hardcoded return fails hidden inputs', async () => {
      const res = await runGrade(
        'def fuel_countdown(start):\n    while False: pass\n    return [3, 2, 1, "LIFTOFF"]',
        'r3-1',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 6. r3-3: The Conveyor Belt (for loop construct)
  describe('r3-3: The Conveyor Belt', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        `def sum_evens(nums):
    total = 0
    for n in nums:
        if n % 2 == 0:
            total += n
    return total`,
        'r3-3',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 iterating with index range passes', async () => {
      const res = await runGrade(
        `def sum_evens(nums):
    s = 0
    for i in range(len(nums)):
        val = nums[i]
        if val % 2 == 0:
            s += val
    return s`,
        'r3-3',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 accumulating evens list passes', async () => {
      const res = await runGrade(
        `def sum_evens(nums):
    evens = []
    for x in nums:
        if not (x % 2):
            evens.append(x)
    return sum(evens)`,
        'r3-3',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: missing for loop construct fails', async () => {
      const res = await runGrade(
        'def sum_evens(nums):\n    return sum(filter(lambda x: x % 2 == 0, nums))',
        'r3-3',
      );
      expect(res.ok).toBe(false);
      expect(res.constructResults.some((c) => !c.passed)).toBe(true);
    });

    it('(c2) wrong 2: sums odds instead of evens fails', async () => {
      const res = await runGrade(
        `def sum_evens(nums):
    t = 0
    for n in nums:
        if n % 2 != 0:
            t += n
    return t`,
        'r3-3',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: counts evens instead of summing fails', async () => {
      const res = await runGrade(
        `def sum_evens(nums):
    c = 0
    for n in nums:
        if n % 2 == 0:
            c += 1
    return c`,
        'r3-3',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 7. r4-1: The Cargo Train (list mutation & return)
  describe('r4-1: The Cargo Train', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        `def add_pet(pets, new_pet):
    pets.append(new_pet)
    return pets`,
        'r4-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 using extend passes', async () => {
      const res = await runGrade(
        `def add_pet(pets, new_pet):
    pets.extend([new_pet])
    return pets`,
        'r4-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 using insert at end passes', async () => {
      const res = await runGrade(
        `def add_pet(pets, new_pet):
    pets.insert(len(pets), new_pet)
    return pets`,
        'r4-1',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: returning pets.append() (which is None) fails', async () => {
      const res = await runGrade(
        'def add_pet(pets, new_pet):\n    return pets.append(new_pet)',
        'r4-1',
      );
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: inserting at front (index 0) fails', async () => {
      const res = await runGrade(
        'def add_pet(pets, new_pet):\n    pets.insert(0, new_pet)\n    return pets',
        'r4-1',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: hardcoded return fails', async () => {
      const res = await runGrade(
        'def add_pet(pets, new_pet):\n    return ["cat", "dog", "dragon"]',
        'r4-1',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 8. r4-2: Slice Station (slicing boundaries)
  describe('r4-2: Slice Station', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        'def take_alternates(items):\n    return items[1:4:2]',
        'r4-2',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 using slice object passes', async () => {
      const res = await runGrade(
        'def take_alternates(items):\n    s = slice(1, 4, 2)\n    return items[s]',
        'r4-2',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 using manual loop slice passes', async () => {
      const res = await runGrade(
        `def take_alternates(items):
    res = []
    for idx in range(1, min(4, len(items)), 2):
        res.append(items[idx])
    return res`,
        'r4-2',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: off-by-one start at 0 fails', async () => {
      const res = await runGrade(
        'def take_alternates(items):\n    return items[0:4:2]',
        'r4-2',
      );
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: missing step of 2 fails', async () => {
      const res = await runGrade(
        'def take_alternates(items):\n    return items[1:4]',
        'r4-2',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: hardcoded return fails', async () => {
      const res = await runGrade(
        'def take_alternates(items):\n    return [20, 40]',
        'r4-2',
      );
      expect(res.ok).toBe(false);
    });
  });

  // 9. r5-2: Input Funnel (parameters & multiplication)
  describe('r5-2: Input Funnel', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade(
        'def power(base, boost):\n    return base * boost',
        'r5-2',
      );
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1 with reversed operand order (boost * base) passes', async () => {
      const res = await runGrade(
        'def power(base, boost):\n    return boost * base',
        'r5-2',
      );
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with math.prod passes', async () => {
      const res = await runGrade(
        'def power(base, boost):\n    import math\n    return math.prod([base, boost])',
        'r5-2',
      );
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: exponentiation base ** boost fails', async () => {
      const res = await runGrade(
        'def power(base, boost):\n    return base ** boost',
        'r5-2',
      );
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: addition base + boost fails', async () => {
      const res = await runGrade(
        'def power(base, boost):\n    return base + boost',
        'r5-2',
      );
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: hardcoded 21 fails', async () => {
      const res = await runGrade('def power(base, boost):\n    return 21', 'r5-2');
      expect(res.ok).toBe(false);
    });
  });

  // 10. r5-3: Output Chute (return value, tested on 2 * n, n + n, etc.)
  describe('r5-3: Output Chute', () => {
    it('(a) reference solution passes all tests', async () => {
      const res = await runGrade('def double(n):\n    return n * 2', 'r5-3');
      expect(res.ok).toBe(true);
    });

    it('(b1) alternative 1: return 2 * n PASSES (fixed regex limitation!)', async () => {
      const res = await runGrade('def double(n):\n    return 2 * n', 'r5-3');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2: return n + n PASSES (fixed regex limitation!)', async () => {
      const res = await runGrade('def double(n):\n    return n + n', 'r5-3');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: print instead of return fails', async () => {
      const res = await runGrade('def double(n):\n    print(n * 2)', 'r5-3');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: squares n instead of doubling fails', async () => {
      const res = await runGrade('def double(n):\n    return n ** 2', 'r5-3');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: hardcoded 18 fails', async () => {
      const res = await runGrade('def double(n):\n    return 18', 'r5-3');
      expect(res.ok).toBe(false);
    });
  });

  // Watchdog timeout test
  it('infinite loop inside test case hits timeout without hanging test suite', async () => {
    const res = await runGrade(
      `def double(n):
    while True:
        pass
    return n * 2`,
      'r5-3',
    );
    expect(res.ok).toBe(false);
    expect(res.testResults[0].error?.timeout).toBe(true);
  }, 10_000);
});
