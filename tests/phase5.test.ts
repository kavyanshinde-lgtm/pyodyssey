import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { PHASE5_LESSONS } from '../src/data/curriculum/phase5Lessons';
import { buildGradeConfig } from '../src/engine/grader';
import { PYTHON_GRADER_SCRIPT } from '../src/engine/graderPython';
import type { GradeResult } from '../src/engine/types';

describe('Phase 5 Advanced Curriculum Behavioral Grader Tests', () => {
  let pyodide: any;

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const indexURL = `${path.resolve('node_modules/pyodide')}${path.sep}`;
    pyodide = await loadPyodide({ indexURL });
    await pyodide.runPythonAsync(PYTHON_GRADER_SCRIPT);
  }, 120_000);

  async function runGrade(source: string, lessonId: string): Promise<GradeResult> {
    const lesson = PHASE5_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) throw new Error(`Phase 5 lesson ${lessonId} not found`);
    const config = buildGradeConfig(lesson);
    pyodide.globals.set('__test_source', source);
    pyodide.globals.set('__test_config_json', JSON.stringify(config));
    const raw = (await pyodide.runPythonAsync(
      '__pyodyssey_grade_code(__test_source, __test_config_json)',
    )) as string;
    return JSON.parse(raw) as GradeResult;
  }

  // ---------------------------------------------------------------------------
  // 1. r6-log: Clean log record (Strings in depth)
  // ---------------------------------------------------------------------------
  describe('1. r6-log: Clean log record', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def clean_log(entry: str) -> str:
    text = entry.strip()
    tag = text[text.find('[') + 1:text.find(']')]
    msg = text[text.find(']') + 1:].strip()
    return f"{tag}: {msg}"
`;
      const res = await runGrade(code, 'r6-log');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with regex passes', async () => {
      const code = `import re
def clean_log(entry: str) -> str:
    m = re.search(r'\\[(.*?)\\]\\s*(.*)', entry.strip())
    return f"{m.group(1)}: {m.group(2)}"
`;
      const res = await runGrade(code, 'r6-log');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with split passes', async () => {
      const code = `def clean_log(entry: str) -> str:
    parts = entry.strip().split(']', 1)
    tag = parts[0].replace('[', '')
    return f"{tag}: {parts[1].strip()}"
`;
      const res = await runGrade(code, 'r6-log');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: off-by-one keeps bracket fails', async () => {
      const code = `def clean_log(entry: str) -> str:
    text = entry.strip()
    tag = text[text.find('['):text.find(']') + 1]
    msg = text[text.find(']') + 1:].strip()
    return f"{tag}: {msg}"
`;
      const res = await runGrade(code, 'r6-log');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def clean_log(entry: str) -> str:
    return "WARN: CPU temperature high"
`;
      const res = await runGrade(code, 'r6-log');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: missing colon fails', async () => {
      const code = `def clean_log(entry: str) -> str:
    text = entry.strip()
    tag = text[text.find('[') + 1:text.find(']')]
    msg = text[text.find(']') + 1:].strip()
    return f"{tag} {msg}"
`;
      const res = await runGrade(code, 'r6-log');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. r6-config: Safe config parser (Files & Exceptions)
  // ---------------------------------------------------------------------------
  describe('2. r6-config: Safe config parser', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `import json
def safe_load_config(raw_json: str, fallback: dict) -> dict:
    try:
        data = json.loads(raw_json)
        if isinstance(data, dict):
            return data
        return fallback
    except Exception:
        return fallback
`;
      const res = await runGrade(code, 'r6-config');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with explicit JSONDecodeError passes', async () => {
      const code = `import json
def safe_load_config(raw_json: str, fallback: dict) -> dict:
    try:
        val = json.loads(raw_json)
        return val if isinstance(val, dict) else fallback
    except json.JSONDecodeError:
        return fallback
`;
      const res = await runGrade(code, 'r6-config');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with dict constructor passes', async () => {
      const code = `import json
def safe_load_config(raw_json: str, fallback: dict) -> dict:
    try:
        res = json.loads(raw_json)
        return dict(res)
    except (ValueError, TypeError):
        return fallback
`;
      const res = await runGrade(code, 'r6-config');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: unhandled exception crashes fails', async () => {
      const code = `import json
def safe_load_config(raw_json: str, fallback: dict) -> dict:
    return json.loads(raw_json)
`;
      const res = await runGrade(code, 'r6-config');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def safe_load_config(raw_json: str, fallback: dict) -> dict:
    return {"port": 8080}
`;
      const res = await runGrade(code, 'r6-config');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: returns non-dict parsed list fails', async () => {
      const code = `import json
def safe_load_config(raw_json: str, fallback: dict) -> dict:
    try:
        return json.loads(raw_json)
    except Exception:
        return fallback
`;
      const res = await runGrade(code, 'r6-config');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. r6-counter: Top frequent words (Collections Counter)
  // ---------------------------------------------------------------------------
  describe('3. r6-counter: Top frequent words', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `from collections import Counter
def top_frequent_words(text: str, k: int) -> list[str]:
    counts = Counter(text.split())
    return [word for word, _ in counts.most_common(k)]
`;
      const res = await runGrade(code, 'r6-counter');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with manual dict sorting passes', async () => {
      const code = `from collections import Counter
def top_frequent_words(text: str, k: int) -> list[str]:
    c = Counter(text.split())
    res = []
    for w, _ in c.most_common(k):
        res.append(w)
    return res
`;
      const res = await runGrade(code, 'r6-counter');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with tuple unpacking comprehension passes', async () => {
      const code = `import collections
def top_frequent_words(text: str, k: int) -> list[str]:
    return [item[0] for item in collections.Counter(text.split()).most_common(k)]
`;
      const res = await runGrade(code, 'r6-counter');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: off-by-one slice fails', async () => {
      const code = `from collections import Counter
def top_frequent_words(text: str, k: int) -> list[str]:
    counts = Counter(text.split())
    return [w for w, _ in counts.most_common(k - 1)]
`;
      const res = await runGrade(code, 'r6-counter');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def top_frequent_words(text: str, k: int) -> list[str]:
    return ["echo", "beacon"]
`;
      const res = await runGrade(code, 'r6-counter');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: returns tuples instead of words fails', async () => {
      const code = `from collections import Counter
def top_frequent_words(text: str, k: int) -> list:
    return Counter(text.split()).most_common(k)
`;
      const res = await runGrade(code, 'r6-counter');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. r7-dataclass: Inventory record (Dataclass & Property)
  // ---------------------------------------------------------------------------
  describe('4. r7-dataclass: Inventory record', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `from dataclasses import dataclass

@dataclass
class InventoryRecord:
    name: str
    quantity: int
    unit_price: float

    @property
    def total_value(self) -> float:
        return float(self.quantity * self.unit_price)

def calculate_inventory_value(name: str, quantity: int, unit_price: float) -> float:
    item = InventoryRecord(name, quantity, unit_price)
    return item.total_value
`;
      const res = await runGrade(code, 'r7-dataclass');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with kwargs instantiation passes', async () => {
      const code = `from dataclasses import dataclass

@dataclass
class InventoryRecord:
    name: str
    quantity: int
    unit_price: float

    @property
    def total_value(self):
        return self.quantity * float(self.unit_price)

def calculate_inventory_value(name, quantity, unit_price):
    rec = InventoryRecord(name=name, quantity=quantity, unit_price=unit_price)
    return rec.total_value
`;
      const res = await runGrade(code, 'r7-dataclass');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with direct one-line return passes', async () => {
      const code = `from dataclasses import dataclass

@dataclass
class InventoryRecord:
    name: str
    quantity: int
    unit_price: float

    @property
    def total_value(self) -> float:
        val = self.quantity * self.unit_price
        return float(val)

def calculate_inventory_value(name: str, quantity: int, unit_price: float) -> float:
    return InventoryRecord(name, quantity, unit_price).total_value
`;
      const res = await runGrade(code, 'r7-dataclass');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: addition instead of multiplication fails', async () => {
      const code = `from dataclasses import dataclass

@dataclass
class InventoryRecord:
    name: str
    quantity: int
    unit_price: float

    @property
    def total_value(self) -> float:
        return float(self.quantity + self.unit_price)

def calculate_inventory_value(name: str, quantity: int, unit_price: float) -> float:
    return InventoryRecord(name, quantity, unit_price).total_value
`;
      const res = await runGrade(code, 'r7-dataclass');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def calculate_inventory_value(name: str, quantity: int, unit_price: float) -> float:
    return 100.0
`;
      const res = await runGrade(code, 'r7-dataclass');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: missing @property causes method return fails', async () => {
      const code = `class InventoryRecord:
    def __init__(self, name, quantity, unit_price):
        self.quantity = quantity
        self.unit_price = unit_price

    def total_value(self):
        return float(self.quantity * self.unit_price)

def calculate_inventory_value(name, quantity, unit_price):
    item = InventoryRecord(name, quantity, unit_price)
    return item.total_value
`;
      const res = await runGrade(code, 'r7-dataclass');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. r8-chunks: Chunk stream generator (Generators & yield)
  // ---------------------------------------------------------------------------
  describe('5. r8-chunks: Chunk stream generator', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def chunk_stream(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]

def collect_chunks(items: list, size: int) -> list:
    return list(chunk_stream(items, size))
`;
      const res = await runGrade(code, 'r8-chunks');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with while loop generator passes', async () => {
      const code = `def chunk_stream(items: list, size: int):
    idx = 0
    while idx < len(items):
        yield items[idx:idx + size]
        idx += size

def collect_chunks(items: list, size: int) -> list:
    return list(chunk_stream(items, size))
`;
      const res = await runGrade(code, 'r8-chunks');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with yield from generator expression passes', async () => {
      const code = `def chunk_stream(items: list, size: int):
    yield from (items[i:i + size] for i in range(0, len(items), size))

def collect_chunks(items: list, size: int) -> list:
    return [c for c in chunk_stream(items, size)]
`;
      const res = await runGrade(code, 'r8-chunks');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: drops partial trailing chunk fails', async () => {
      const code = `def chunk_stream(items: list, size: int):
    for i in range(0, len(items) - size, size):
        yield items[i:i + size]

def collect_chunks(items: list, size: int) -> list:
    return list(chunk_stream(items, size))
`;
      const res = await runGrade(code, 'r8-chunks');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def collect_chunks(items: list, size: int) -> list:
    return [[1, 2], [3, 4], [5]]
`;
      const res = await runGrade(code, 'r8-chunks');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: yields raw elements instead of chunk lists fails', async () => {
      const code = `def chunk_stream(items: list, size: int):
    for x in items:
        yield x

def collect_chunks(items: list, size: int) -> list:
    return list(chunk_stream(items, size))
`;
      const res = await runGrade(code, 'r8-chunks');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. r8-testing: Test assertion runner
  // ---------------------------------------------------------------------------
  describe('6. r8-testing: Test assertion runner', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def run_assertions(assertions: list[str]) -> dict:
    passed = 0
    failed = 0
    for stmt in assertions:
        try:
            exec(stmt, {})
            passed += 1
        except Exception:
            failed += 1
    return {"passed": passed, "failed": failed}
`;
      const res = await runGrade(code, 'r8-testing');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 catching AssertionError explicitly passes', async () => {
      const code = `def run_assertions(assertions: list[str]) -> dict:
    p, f = 0, 0
    for s in assertions:
        try:
            exec(s, {})
            p += 1
        except (AssertionError, Exception):
            f += 1
    return {"passed": p, "failed": f}
`;
      const res = await runGrade(code, 'r8-testing');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with helper function passes', async () => {
      const code = `def _check(stmt: str) -> bool:
    try:
        exec(stmt, {})
        return True
    except Exception:
        return False

def run_assertions(assertions: list[str]) -> dict:
    passed = sum(1 for s in assertions if _check(s))
    return {"passed": passed, "failed": len(assertions) - passed}
`;
      const res = await runGrade(code, 'r8-testing');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: unhandled error crashes runner fails', async () => {
      const code = `def run_assertions(assertions: list[str]) -> dict:
    for s in assertions:
        exec(s, {})
    return {"passed": len(assertions), "failed": 0}
`;
      const res = await runGrade(code, 'r8-testing');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def run_assertions(assertions: list[str]) -> dict:
    return {"passed": 1, "failed": 1}
`;
      const res = await runGrade(code, 'r8-testing');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: reports all passed without running fails', async () => {
      const code = `def run_assertions(assertions: list[str]) -> dict:
    return {"passed": len(assertions), "failed": 0}
`;
      const res = await runGrade(code, 'r8-testing');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. r8-bsearch: Binary search (Algorithms)
  // ---------------------------------------------------------------------------
  describe('7. r8-bsearch: Binary search', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def binary_search(nums: list[int], target: int) -> int:
    low = 0
    high = len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`;
      const res = await runGrade(code, 'r8-bsearch');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with overflow-safe midpoint calculation passes', async () => {
      const code = `def binary_search(nums: list[int], target: int) -> int:
    l, r = 0, len(nums) - 1
    while l <= r:
        m = l + (r - l) // 2
        val = nums[m]
        if val == target:
            return m
        if val < target:
            l = m + 1
        else:
            r = m - 1
    return -1
`;
      const res = await runGrade(code, 'r8-bsearch');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with bisect module passes', async () => {
      const code = `import bisect
def binary_search(nums: list[int], target: int) -> int:
    idx = bisect.bisect_left(nums, target)
    if idx < len(nums) and nums[idx] == target:
        return idx
    return -1
`;
      const res = await runGrade(code, 'r8-bsearch');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: off-by-one loop bound while low < high fails', async () => {
      const code = `def binary_search(nums: list[int], target: int) -> int:
    low = 0
    high = len(nums) - 1
    while low < high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`;
      const res = await runGrade(code, 'r8-bsearch');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def binary_search(nums: list[int], target: int) -> int:
    return 2
`;
      const res = await runGrade(code, 'r8-bsearch');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: wrong return on missing value fails', async () => {
      const code = `def binary_search(nums: list[int], target: int) -> int:
    try:
        return nums.index(target)
    except ValueError:
        return 0
`;
      const res = await runGrade(code, 'r8-bsearch');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. r8-twosum: Two pointers sum (Algorithms)
  // ---------------------------------------------------------------------------
  describe('8. r8-twosum: Two pointers sum', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    left = 0
    right = len(nums) - 1
    while left < right:
        current = nums[left] + nums[right]
        if current == target:
            return [left, right]
        elif current < target:
            left += 1
        else:
            right -= 1
    return None
`;
      const res = await runGrade(code, 'r8-twosum');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with hash map passes', async () => {
      const code = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return None
`;
      const res = await runGrade(code, 'r8-twosum');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with reversed condition branch passes', async () => {
      const code = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s > target:
            r -= 1
        elif s < target:
            l += 1
        else:
            return [l, r]
    return None
`;
      const res = await runGrade(code, 'r8-twosum');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: steps wrong pointer direction fails', async () => {
      const code = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [l, r]
        elif s < target:
            r -= 1
        else:
            l += 1
    return None
`;
      const res = await runGrade(code, 'r8-twosum');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    return [2, 4]
`;
      const res = await runGrade(code, 'r8-twosum');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: returns element values instead of indices fails', async () => {
      const code = `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [nums[l], nums[r]]
        elif s < target:
            l += 1
        else:
            r -= 1
    return None
`;
      const res = await runGrade(code, 'r8-twosum');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. r8-data-clean: Clean user records (Data Track)
  // ---------------------------------------------------------------------------
  describe('9. r8-data-clean: Clean user records', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def clean_user_records(records: list[dict]) -> list[dict]:
    cleaned = []
    for r in records:
        email = r.get("email")
        if email is not None and isinstance(email, str):
            cleaned.append({**r, "email": email.strip().lower()})
    return cleaned
`;
      const res = await runGrade(code, 'r8-data-clean');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with list comprehension passes', async () => {
      const code = `def clean_user_records(records: list[dict]) -> list[dict]:
    return [
        {**r, "email": r["email"].strip().lower()}
        for r in records
        if r.get("email") is not None and isinstance(r["email"], str)
    ]
`;
      const res = await runGrade(code, 'r8-data-clean');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with dict copy passes', async () => {
      const code = `def clean_user_records(records: list[dict]) -> list[dict]:
    out = []
    for item in records:
        raw = item.get("email")
        if raw is not None and isinstance(raw, str):
            c = dict(item)
            c["email"] = raw.strip().lower()
            out.append(c)
    return out
`;
      const res = await runGrade(code, 'r8-data-clean');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: unhandled None causes crash fails', async () => {
      const code = `def clean_user_records(records: list[dict]) -> list[dict]:
    return [{**r, "email": r["email"].strip().lower()} for r in records]
`;
      const res = await runGrade(code, 'r8-data-clean');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def clean_user_records(records: list[dict]) -> list[dict]:
    return [{"id": 1, "email": "nova@space.org"}]
`;
      const res = await runGrade(code, 'r8-data-clean');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: missing lowercase normalization fails', async () => {
      const code = `def clean_user_records(records: list[dict]) -> list[dict]:
    cleaned = []
    for r in records:
        if r.get("email"):
            cleaned.append({**r, "email": r["email"].strip()})
    return cleaned
`;
      const res = await runGrade(code, 'r8-data-clean');
      expect(res.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. r8-web-routes: API route dispatcher (Web Track)
  // ---------------------------------------------------------------------------
  describe('10. r8-web-routes: API route dispatcher', () => {
    it('(a) reference solution passes all tests', async () => {
      const code = `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    routes: dict[str, list[str]] = {}
    for entry in endpoints:
        parts = entry.strip().split()
        if len(parts) == 2:
            method, path = parts
            if method not in routes:
                routes[method] = []
            routes[method].append(path)
    return routes
`;
      const res = await runGrade(code, 'r8-web-routes');
      expect(res.ok).toBe(true);
      expect(res.testResults.every((t) => t.passed)).toBe(true);
    });

    it('(b1) alternative 1 with dict setdefault passes', async () => {
      const code = `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    res = {}
    for e in endpoints:
        parts = e.strip().split()
        if len(parts) == 2:
            m, p = parts
            res.setdefault(m, []).append(p)
    return res
`;
      const res = await runGrade(code, 'r8-web-routes');
      expect(res.ok).toBe(true);
    });

    it('(b2) alternative 2 with collections.defaultdict passes', async () => {
      const code = `from collections import defaultdict
def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    d = defaultdict(list)
    for ep in endpoints:
        parts = ep.strip().split()
        if len(parts) == 2:
            d[parts[0]].append(parts[1])
    return dict(d)
`;
      const res = await runGrade(code, 'r8-web-routes');
      expect(res.ok).toBe(true);
    });

    it('(c1) wrong 1: unstripped line splitting crash fails', async () => {
      const code = `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    routes = {}
    for ep in endpoints:
        m, p = ep.split(" ")
        routes.setdefault(m, []).append(p)
    return routes
`;
      const res = await runGrade(code, 'r8-web-routes');
      expect(res.ok).toBe(false);
    });

    it('(c2) wrong 2: hardcoded fails', async () => {
      const code = `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    return {"GET": ["/api/health", "/api/items"], "POST": ["/api/users"]}
`;
      const res = await runGrade(code, 'r8-web-routes');
      expect(res.ok).toBe(false);
    });

    it('(c3) wrong 3: inverted dict mapping path to method fails', async () => {
      const code = `def extract_api_routes(endpoints: list[str]) -> dict:
    res = {}
    for ep in endpoints:
        parts = ep.strip().split()
        if len(parts) == 2:
            res[parts[1]] = parts[0]
    return res
`;
      const res = await runGrade(code, 'r8-web-routes');
      expect(res.ok).toBe(false);
    });
  });
});
