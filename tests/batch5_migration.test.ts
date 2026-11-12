import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 5 (r8-5, r8-6, r1-trial-1..3, r2-trial-1..3)', () => {
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

  const batch5 = [
    {
      id: 'r8-5',
      alt1: 'def factorial(n):\n    res = 1\n    if n <= 1:\n        return res\n    return n * factorial(n - 1)\n',
      alt2: 'def factorial(num):\n    return 1 if num <= 1 else num * factorial(num - 1)\n',
      wrong1: 'def factorial(n):\n    return 120\n',
      wrong2: 'def factorial(n):\n    return n * 24\n',
      wrong3: 'def factorial(n):\n    if n <= 1: return 0\n    return n * factorial(n - 1)\n',
    },
    {
      id: 'r8-6',
      alt1: 'def has_duplicate(nums):\n    return len(nums) != len(set(nums))\n',
      alt2: 'def has_duplicate(nums):\n    s = set()\n    for x in nums:\n        if x in s: return True\n        s.add(x)\n    return False\n',
      wrong1: 'def has_duplicate(nums):\n    return True\n',
      wrong2: 'def has_duplicate(nums):\n    return False\n',
      wrong3: 'def has_duplicate(nums):\n    return len(nums) > 1\n',
    },
    {
      id: 'r1-trial-1',
      alt1: 'def format_signal(hero="Nova", level=7):\n    return [hero.upper(), int(level * 10)]\n',
      alt2: 'def format_signal(h="Nova", lvl=7):\n    u = h.upper()\n    p = lvl * 10\n    return [u, p]\n',
      wrong1: 'def format_signal(hero="Nova", level=7):\n    return ["NOVA", 70]\n',
      wrong2: 'def format_signal(hero="Nova", level=7):\n    return [hero.lower(), level * 10]\n',
      wrong3: 'def format_signal(hero="Nova", level=7):\n    return [hero.upper(), level]\n',
    },
    {
      id: 'r1-trial-2',
      alt1: 'def split_apples(name="Nova", apples=7, friends=2):\n    each = apples // friends\n    left = apples % friends\n    return f"{name} gets {each} each, {left} left"\n',
      alt2: 'def split_apples(n="Nova", a=7, f=2):\n    q, r = divmod(a, f)\n    return f"{n} gets {q} each, {r} left"\n',
      wrong1: 'def split_apples(name="Nova", apples=7, friends=2):\n    return "Nova gets 3 each, 1 left"\n',
      wrong2: 'def split_apples(name="Nova", apples=7, friends=2):\n    return f"{name} gets {apples / friends} each, 1 left"\n',
      wrong3: 'def split_apples(name="Nova", apples=7, friends=2):\n    return f"{name} gets {apples // friends} each, {apples} left"\n',
    },
    {
      id: 'r1-trial-3',
      alt1: 'def format_pilot(age_text="12"):\n    a = int(age_text)\n    p = a * 5\n    return f"PILOT {age_text} · POWER {p}"\n',
      alt2: 'def format_pilot(age_str="12"):\n    return f"PILOT {age_str} · POWER {int(age_str) * 5}"\n',
      wrong1: 'def format_pilot(age_text="12"):\n    return "PILOT 12 · POWER 60"\n',
      wrong2: 'def format_pilot(age_text="12"):\n    return f"PILOT {age_text} · POWER {age_text * 5}"\n',
      wrong3: 'def format_pilot(age_text="12"):\n    return f"PILOT {age_text} · POWER 0"\n',
    },
    {
      id: 'r2-trial-1',
      alt1: 'def check_relay(score=12):\n    cond1 = score >= 10\n    cond2 = score != 13\n    return cond1 and cond2\n',
      alt2: 'def check_relay(s=12):\n    return bool(s >= 10 and not (s == 13))\n',
      wrong1: 'def check_relay(score=12):\n    return True\n',
      wrong2: 'def check_relay(score=12):\n    return score >= 10\n',
      wrong3: 'def check_relay(score=12):\n    return score == 12\n',
    },
    {
      id: 'r2-trial-2',
      alt1: 'def check_gate(keycard=True, override=False):\n    if keycard:\n        if not override:\n            return "ACCESS GRANTED"\n    return "LOCKED OUT"\n',
      alt2: 'def check_gate(k=True, o=False):\n    return "ACCESS GRANTED" if (k and not o) else "LOCKED OUT"\n',
      wrong1: 'def check_gate(keycard=True, override=False):\n    return "ACCESS GRANTED"\n',
      wrong2: 'def check_gate(keycard=True, override=False):\n    return "LOCKED OUT"\n',
      wrong3: 'def check_gate(keycard=True, override=False):\n    return "ACCESS GRANTED" if keycard else "LOCKED OUT"\n',
    },
    {
      id: 'r2-trial-3',
      alt1: 'def check_signal(signal="amber"):\n    if signal == "red":\n        return "STOP"\n    elif signal == "amber":\n        match signal:\n            case "amber":\n                return "SLOW"\n    return "GO"\n',
      alt2: 'def check_signal(s="amber"):\n    match s:\n        case "red":\n            return "STOP"\n        case "amber":\n            return "SLOW"\n        case _:\n            return "GO"\n',
      wrong1: 'def check_signal(signal="amber"):\n    return "SLOW"\n',
      wrong2: 'def check_signal(signal="amber"):\n    return "STOP"\n',
      wrong3: 'def check_signal(signal="amber"):\n    if signal == "red": return "STOP"\n    return "SLOW"\n',
    },
  ];

  for (const item of batch5) {
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
