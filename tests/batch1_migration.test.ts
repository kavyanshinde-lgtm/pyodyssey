import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { ALL_LESSONS } from '../src/data/curriculum/index';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Migration Batch 1 (r2-2, r2-4, r2-5, r2-6, r3-2, r3-4, r3-5, r3-6)', () => {
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

  const batch1 = [
    {
      id: 'r2-2',
      alt1: 'def check_equals(s, t=10):\n    return s == t\n',
      alt2: 'def check_equals(score, target=10):\n    return not (score != target)\n',
      wrong1: 'def check_equals(score, target=10):\n    return score > target\n',
      wrong2: 'def check_equals(score, target=10):\n    return True\n',
      wrong3: 'def check_equals(score, target=10):\n    return 1 if score == target else 0\n',
    },
    {
      id: 'r2-4',
      alt1: 'def evaluate_gate(k, d):\n    return k and not d\n',
      alt2: 'def evaluate_gate(has_key, door_open):\n    return not (not has_key or door_open)\n',
      wrong1: 'def evaluate_gate(has_key, door_open):\n    return has_key and door_open\n',
      wrong2: 'def evaluate_gate(has_key, door_open):\n    return has_key or not door_open\n',
      wrong3: 'def evaluate_gate(has_key, door_open):\n    return not door_open\n',
    },
    {
      id: 'r2-5',
      alt1: 'def verify_entry(a, t):\n    return "KID PASS" if a < 13 and t else "DENIED"\n',
      alt2: 'def verify_entry(age, ticket):\n    if ticket:\n        if age <= 12:\n            return "KID PASS"\n    return "DENIED"\n',
      wrong1: 'def verify_entry(age, ticket):\n    if age <= 13:\n        return "KID PASS"\n    return "DENIED"\n',
      wrong2: 'def verify_entry(age, ticket):\n    return "KID PASS"\n',
      wrong3: 'def verify_entry(age, ticket):\n    return "DENIED"\n',
    },
    {
      id: 'r2-6',
      alt1: 'def route_command(cmd):\n    match cmd:\n        case "jump": return "BOING!"\n        case _: return "..."\n',
      alt2: 'def route_command(command):\n    match str(command):\n        case "jump":\n            res = "BOING!"\n        case _:\n            res = "..."\n    return res\n',
      wrong1: 'def route_command(command):\n    return "BOING!"\n',
      wrong2: 'def route_command(command):\n    match command:\n        case "run": return "BOING!"\n        case _: return "..."\n',
      wrong3: 'def route_command(command):\n    return "..."\n',
    },
    {
      id: 'r3-2',
      alt1: 'def run_tick_brake(limit=1):\n    out = []\n    for _ in [0]:\n        out.append("tick")\n        break\n    return out\n',
      alt2: 'def run_tick_brake(max_ticks=1):\n    res = ["tick"]\n    return res\n',
      wrong1: 'def run_tick_brake(max_ticks=1):\n    return []\n',
      wrong2: 'def run_tick_brake(max_ticks=1):\n    return ["tock"]\n',
      wrong3: 'def run_tick_brake(max_ticks=1):\n    return ["tick", "tick"]\n',
    },
    {
      id: 'r3-4',
      alt1: 'def dispense_range(a=1, b=6):\n    return [x for x in range(a, b)]\n',
      alt2: 'def dispense_range(start=1, stop=6):\n    res = []\n    cur = start\n    while cur < stop:\n        res.append(cur)\n        cur += 1\n    return res\n',
      wrong1: 'def dispense_range(start=1, stop=6):\n    return list(range(start, stop + 1))\n',
      wrong2: 'def dispense_range(start=1, stop=6):\n    return [1, 2, 3, 4, 5]\n',
      wrong3: 'def dispense_range(start=1, stop=6):\n    return list(range(start + 1, stop))\n',
    },
    {
      id: 'r3-5',
      alt1: 'def collect_skip_stop(start, stop, skip_val, break_val):\n    return [x for x in range(start, min(stop, break_val)) if x != skip_val]\n',
      alt2: 'def collect_skip_stop(s, e, sk, br):\n    res = []\n    i = s\n    while i < e:\n        if i == br: break\n        if i != sk: res.append(i)\n        i += 1\n    return res\n',
      wrong1: 'def collect_skip_stop(start, stop, skip_val, break_val):\n    return [x for x in range(start, stop)]\n',
      wrong2: 'def collect_skip_stop(start, stop, skip_val, break_val):\n    return [1, 2, 4, 5]\n',
      wrong3: 'def collect_skip_stop(start, stop, skip_val, break_val):\n    return [x for x in range(start, stop) if x != skip_val]\n',
    },
    {
      id: 'r3-6',
      alt1: 'def nested_grid(rows=3, cols=3):\n    return [[c for c in range(cols)] for _ in range(rows)]\n',
      alt2: 'def nested_grid(r=3, c=3):\n    res = []\n    for _ in range(r):\n        res.append(list(range(c)))\n    return res\n',
      wrong1: 'def nested_grid(rows=3, cols=3):\n    return [[r for r in range(rows)] for _ in range(cols)]\n',
      wrong2: 'def nested_grid(rows=3, cols=3):\n    return [[0, 1, 2], [0, 1, 2], [0, 1, 2]]\n',
      wrong3: 'def nested_grid(rows=3, cols=3):\n    return []\n',
    },
  ];

  for (const item of batch1) {
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
