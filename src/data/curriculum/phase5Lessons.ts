import type { Lesson } from './types';

// =============================================================================
// PHASE 5 ADVANCED LESSONS
// High-yield modules: Strings in depth, Files/JSON/Exceptions, Standard Library,
// Deep OOP, Iterators/Generators, Testing, Data Structures & Algorithms, Tracks.
// All lessons adhere to the redesigned 3-part layout: statement, example, task.
// Zero emojis, sentence case, real entrypoints, 3-tier hints, behavioral tests.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Strings in depth: Clean log record
// -----------------------------------------------------------------------------
export const lessonCleanLog: Lesson = {
  id: 'r6-log',
  realmId: 6,
  order: 7,
  title: 'Clean log record',
  chip: 'Strings',
  icon: 'code',
  scene: 'strings',
  difficulty: 2,
  minutes: 5,
  statement: 'Log records often contain surrounding whitespace and a bracketed log tag.',
  example: {
    call: 'clean_log("  [WARN] CPU temperature high  ")',
    result: '"WARN: CPU temperature high"',
  },
  task: 'Write clean_log(entry) that strips outer whitespace and returns the tag followed by a colon and the message.',
  prompt: 'Write clean_log(entry) that strips outer whitespace and returns the tag followed by a colon and the message.',
  toybox: [
    'Log tags are like luggage tags on text.',
    'Strip the brackets off to read the alert level inside.',
  ],
  underHood: [
    'String find and slice operations run in O(k) time where k is the sliced substring length.',
    'Slicing produces a new string without mutating the original log record.',
  ],
  starter: `def clean_log(entry: str) -> str:
    """Format '[TAG] message' as 'TAG: message' with stripped whitespace."""
    pass

print(clean_log("  [WARN] CPU temperature high  "))
`,
  solution: `def clean_log(entry: str) -> str:
    text = entry.strip()
    tag = text[text.find('[') + 1:text.find(']')]
    msg = text[text.find(']') + 1:].strip()
    return f"{tag}: {msg}"

print(clean_log("  [WARN] CPU temperature high  "))
`,
  expectedOutput: 'WARN: CPU temperature high',
  entrypoint: 'clean_log',
  tests: [
    {
      id: 't1',
      description: 'Standard warning tag',
      args: ['[WARN] CPU temperature high'],
      expected: 'WARN: CPU temperature high',
      hidden: false,
    },
    {
      id: 't2',
      description: 'Info tag with outer spaces',
      args: ['   [INFO] Storage mount complete   '],
      expected: 'INFO: Storage mount complete',
      hidden: false,
    },
    {
      id: 't3',
      description: 'Critical tag with clean message',
      args: ['[CRITICAL] Core meltdown imminent'],
      expected: 'CRITICAL: Core meltdown imminent',
      hidden: true,
    },
    {
      id: 't4',
      description: 'Single letter tag',
      args: ['[D] Debug checkpoint'],
      expected: 'D: Debug checkpoint',
      hidden: true,
    },
    {
      id: 't5',
      description: 'Tag with numbers and symbols',
      args: ['[ERR-404] Resource not located'],
      expected: 'ERR-404: Resource not located',
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Define clean_log function',
      hint: 'def clean_log(entry):',
      pattern: 'def\\s+clean_log',
    },
    {
      id: 'g2',
      label: 'Strip surrounding whitespace',
      hint: 'entry.strip()',
      pattern: '\\.strip\\(',
    },
    {
      id: 'g3',
      label: 'Return formatted tag and message',
      hint: 'return f"{tag}: {msg}"',
      pattern: 'return\\s+',
    },
  ],
  requirements: [
    { label: 'clean_log function defined', kind: 'pattern', value: 'def\\s+clean_log' },
    { label: 'String stripping and slicing used', kind: 'pattern', value: '\\.strip' },
    { label: 'All test cases pass', kind: 'output', value: 'WARN: CPU temperature high' },
  ],
  hint: 'Use find("[") and find("]") to locate the tag, then slice and format with an f-string.',
  xray: 'def clean_log(entry: str) -> str:\n    text = entry.strip()\n    tag = text[text.find("[") + 1:text.find("]")]\n    return f"{tag}: {text[text.find(\']\') + 1:].strip()}"',
  xp: 75,
  coins: 35,
  starLines: 8,
  pythonic: 'f["\']',
  exerciseType: 'code',
  tieredHints: {
    concept: 'find() locates character positions in strings, and slicing [a:b] extracts the substring between them.',
    approach: 'Strip outer whitespace, find index of "[" and "]", slice the tag, slice the remaining message, and join with an f-string.',
    skeleton: `def clean_log(entry: str) -> str:
    text = entry.strip()
    tag = text[text.find('[') + 1:text.find(']')]
    # return f"{tag}: {msg}"
`,
  },
};

// -----------------------------------------------------------------------------
// 2. Files & JSON & Exceptions: Safe config parser
// -----------------------------------------------------------------------------
export const lessonSafeConfig: Lesson = {
  id: 'r6-config',
  realmId: 6,
  order: 8,
  title: 'Safe configuration parser',
  chip: 'Files & JSON',
  icon: 'code',
  scene: 'strings',
  difficulty: 3,
  minutes: 6,
  statement: 'Configuration text loaded from external files can contain malformed JSON syntax.',
  example: {
    call: 'safe_load_config(\'{"port": 8080}\', {"port": 3000})',
    result: '{"port": 8080}',
  },
  task: 'Write safe_load_config(raw_json, fallback) that returns parsed dict or fallback on JSONDecodeError.',
  prompt: 'Write safe_load_config(raw_json, fallback) that returns parsed dict or fallback on JSONDecodeError.',
  toybox: [
    'A try-except block is a safety net over a tightrope.',
    'If the JSON string snaps, catch the error and deliver the safe fallback dict.',
  ],
  underHood: [
    'json.loads raises json.JSONDecodeError when lexical scanning fails.',
    'Handling exceptions explicitly prevents unexpected crashes from unverified file inputs.',
  ],
  starter: `import json

def safe_load_config(raw_json: str, fallback: dict) -> dict:
    """Parse JSON string into a dict, returning fallback if decoding fails."""
    pass

print(safe_load_config('{"port": 8080}', {"port": 3000}))
`,
  solution: `import json

def safe_load_config(raw_json: str, fallback: dict) -> dict:
    try:
        data = json.loads(raw_json)
        if isinstance(data, dict):
            return data
        return fallback
    except Exception:
        return fallback

print(safe_load_config('{"port": 8080}', {"port": 3000}))
`,
  expectedOutput: "{'port': 8080}",
  entrypoint: 'safe_load_config',
  tests: [
    {
      id: 't1',
      description: 'Valid JSON dictionary',
      args: ['{"port": 8080}', { port: 3000 }],
      expected: { port: 8080 },
      hidden: false,
    },
    {
      id: 't2',
      description: 'Malformed JSON returns fallback',
      args: ['{bad-syntax: true}', { port: 3000 }],
      expected: { port: 3000 },
      hidden: false,
    },
    {
      id: 't3',
      description: 'Empty string returns fallback',
      args: ['', { status: 'default' }],
      expected: { status: 'default' },
      hidden: true,
    },
    {
      id: 't4',
      description: 'Non-dict JSON array returns fallback',
      args: ['[1, 2, 3]', { mode: 'safe' }],
      expected: { mode: 'safe' },
      hidden: true,
    },
    {
      id: 't5',
      description: 'Nested valid JSON dict',
      args: ['{"db": {"host": "localhost"}}', { db: {} }],
      expected: { db: { host: 'localhost' } },
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Import json module',
      hint: 'import json',
      pattern: 'import\\s+json',
    },
    {
      id: 'g2',
      label: 'Wrap parse in try-except',
      hint: 'try: ... except: ...',
      pattern: 'try\\s*:',
    },
    {
      id: 'g3',
      label: 'Call json.loads',
      hint: 'json.loads(raw_json)',
      pattern: 'json\\.loads\\(',
    },
  ],
  requirements: [
    { label: 'json.loads utilized', kind: 'pattern', value: 'json\\.loads\\(' },
    { label: 'Exception handling present', kind: 'pattern', value: 'except' },
    { label: 'All test cases pass', kind: 'output', value: "{'port': 8080}" },
  ],
  hint: 'Wrap json.loads(raw_json) inside a try block and return fallback in the except block.',
  xray: 'import json\ndef safe_load_config(raw_json, fallback):\n    try:\n        return json.loads(raw_json)\n    except Exception:\n        return fallback',
  xp: 85,
  coins: 40,
  starLines: 12,
  pythonic: 'try\\s*:',
  exerciseType: 'code',
  tieredHints: {
    concept: 'json.loads() deserializes JSON text. Invalid format raises JSONDecodeError.',
    approach: 'Inside try, parse raw_json with json.loads and check that data is a dict. In except or failure, hand back the provided fallback mapping.',
    skeleton: `import json

def safe_load_config(raw_json: str, fallback: dict) -> dict:
    try:
        # data = json.loads(...)
        pass
    except Exception:
        return fallback
`,
  },
};

// -----------------------------------------------------------------------------
// 3. Standard Library: Top frequent words (collections.Counter)
// -----------------------------------------------------------------------------
export const lessonTopWords: Lesson = {
  id: 'r6-counter',
  realmId: 6,
  order: 9,
  title: 'Top frequent words',
  chip: 'Collections',
  icon: 'code',
  scene: 'dicts',
  difficulty: 2,
  minutes: 5,
  statement: 'The collections module provides Counter for rapid multiset frequency tallies.',
  example: {
    call: 'top_frequent_words("echo beacon echo signal beacon echo", 2)',
    result: '["echo", "beacon"]',
  },
  task: 'Write top_frequent_words(text, k) returning the k most common words ordered by frequency.',
  prompt: 'Write top_frequent_words(text, k) returning the k most common words ordered by frequency.',
  toybox: [
    'A Counter is an automatic inventory scanner.',
    'Pass it words, and it returns the top contenders ranked by count.',
  ],
  underHood: [
    'Counter is a dict subclass implementing C-accelerated multiset counting.',
    'most_common(k) uses heapq.nlargest when k is smaller than total distinct items.',
  ],
  starter: `from collections import Counter

def top_frequent_words(text: str, k: int) -> list[str]:
    """Return list of k most frequent words in text in descending order."""
    pass

print(top_frequent_words("echo beacon echo signal beacon echo", 2))
`,
  solution: `from collections import Counter

def top_frequent_words(text: str, k: int) -> list[str]:
    words = text.split()
    counts = Counter(words)
    return [word for word, _ in counts.most_common(k)]

print(top_frequent_words("echo beacon echo signal beacon echo", 2))
`,
  expectedOutput: "['echo', 'beacon']",
  entrypoint: 'top_frequent_words',
  tests: [
    {
      id: 't1',
      description: 'Top 2 frequent words',
      args: ['echo beacon echo signal beacon echo', 2],
      expected: ['echo', 'beacon'],
      hidden: false,
    },
    {
      id: 't2',
      description: 'Single most frequent word',
      args: ['alpha beta beta gamma', 1],
      expected: ['beta'],
      hidden: false,
    },
    {
      id: 't3',
      description: 'Empty string returns empty list',
      args: ['', 3],
      expected: [],
      hidden: true,
    },
    {
      id: 't4',
      description: 'K larger than word count',
      args: ['one two three', 10],
      expected: ['one', 'two', 'three'],
      hidden: true,
    },
    {
      id: 't5',
      description: 'All identical words',
      args: ['loop loop loop loop', 1],
      expected: ['loop'],
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Import Counter',
      hint: 'from collections import Counter',
      pattern: 'Counter',
    },
    {
      id: 'g2',
      label: 'Count words with Counter',
      hint: 'counts = Counter(text.split())',
      pattern: 'Counter\\s*\\(',
    },
    {
      id: 'g3',
      label: 'Extract top k keys',
      hint: 'counts.most_common(k)',
      pattern: '\\.most_common\\(',
    },
  ],
  requirements: [
    { label: 'Counter used for tally', kind: 'pattern', value: 'Counter' },
    { label: 'most_common method called', kind: 'pattern', value: '\\.most_common\\(' },
    { label: 'All test cases pass', kind: 'output', value: "['echo', 'beacon']" },
  ],
  hint: 'Split the text into words, pass them to Counter, and extract words from counts.most_common(k).',
  xray: 'from collections import Counter\ndef top_frequent_words(text, k):\n    return [w for w, _ in Counter(text.split()).most_common(k)]',
  xp: 80,
  coins: 40,
  starLines: 8,
  pythonic: 'Counter',
  exerciseType: 'code',
  tieredHints: {
    concept: 'Counter(words) tallies counts of items. most_common(k) returns a list of (item, count) pairs.',
    approach: 'Split text into words with text.split(), count with Counter, and return list comprehension of word keys from most_common(k).',
    skeleton: `from collections import Counter

def top_frequent_words(text: str, k: int) -> list[str]:
    counts = Counter(text.split())
    # return [w for w, _ in counts.most_common(k)]
`,
  },
};

// -----------------------------------------------------------------------------
// 4. Deep OOP: Dataclass & Property (Inventory record)
// -----------------------------------------------------------------------------
export const lessonInventoryRecord: Lesson = {
  id: 'r7-dataclass',
  realmId: 7,
  order: 7,
  title: 'Inventory item record',
  chip: 'Dataclasses',
  icon: 'code',
  scene: 'oop',
  difficulty: 3,
  minutes: 6,
  statement: 'Dataclasses synthesize constructor and repr methods while properties compute dynamic state.',
  example: {
    call: 'calculate_inventory_value("Core", 5, 20.0)',
    result: '100.0',
  },
  task: 'Define dataclass InventoryRecord with total_value property returning quantity * unit_price as float.',
  prompt: 'Define dataclass InventoryRecord with total_value property returning quantity * unit_price as float.',
  toybox: [
    'A dataclass writes the repetitive boilerplate for you.',
    'Add a @property to calculate computed values on the fly.',
  ],
  underHood: [
    '@dataclass inspects type annotations at class definition time to generate __init__, __repr__, and __eq__.',
    '@property wraps attribute access in descriptor protocol __get__ calls.',
  ],
  starter: `from dataclasses import dataclass

@dataclass
class InventoryRecord:
    name: str
    quantity: int
    unit_price: float

    # Define total_value property here

def calculate_inventory_value(name: str, quantity: int, unit_price: float) -> float:
    """Instantiate InventoryRecord and return total_value."""
    pass

print(calculate_inventory_value("Core", 5, 20.0))
`,
  solution: `from dataclasses import dataclass

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

print(calculate_inventory_value("Core", 5, 20.0))
`,
  expectedOutput: '100.0',
  entrypoint: 'calculate_inventory_value',
  tests: [
    {
      id: 't1',
      description: 'Standard quantity and price',
      args: ['Core', 5, 20.0],
      expected: 100.0,
      hidden: false,
    },
    {
      id: 't2',
      description: 'Zero quantity returns zero',
      args: ['Empty Shard', 0, 15.5],
      expected: 0.0,
      hidden: false,
    },
    {
      id: 't3',
      description: 'Decimal unit price',
      args: ['Nano Cable', 4, 2.5],
      expected: 10.0,
      hidden: true,
    },
    {
      id: 't4',
      description: 'Large inventory quantity',
      args: ['Bolts', 1000, 0.5],
      expected: 500.0,
      hidden: true,
    },
    {
      id: 't5',
      description: 'Single unit at fractional cent',
      args: ['Widget', 1, 99.99],
      expected: 99.99,
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Use @dataclass decorator',
      hint: '@dataclass',
      pattern: '@dataclass',
    },
    {
      id: 'g2',
      label: 'Define total_value property',
      hint: '@property\ndef total_value(self):',
      pattern: '@property\\s+def\\s+total_value',
    },
    {
      id: 'g3',
      label: 'Return total inventory value',
      hint: 'return float(self.quantity * self.unit_price)',
      pattern: 'self\\.quantity\\s*\\*\\s*self\\.unit_price',
    },
  ],
  requirements: [
    { label: '@dataclass utilized', kind: 'pattern', value: '@dataclass' },
    { label: '@property defined', kind: 'pattern', value: '@property' },
    { label: 'All test cases pass', kind: 'output', value: '100.0' },
  ],
  hint: 'Decorate total_value with @property and return float(self.quantity * self.unit_price).',
  xray: 'from dataclasses import dataclass\n@dataclass\nclass InventoryRecord:\n    name: str\n    quantity: int\n    unit_price: float\n    @property\n    def total_value(self):\n        return float(self.quantity * self.unit_price)',
  xp: 95,
  coins: 45,
  starLines: 17,
  pythonic: '@dataclass',
  exerciseType: 'code',
  tieredHints: {
    concept: 'The property decorator turns a method into a computed attribute accessed without parentheses.',
    approach: 'Add the property decorator above total_value to multiply quantity by unit_price as a floating point number.',
    skeleton: `from dataclasses import dataclass

@dataclass
class InventoryRecord:
    name: str
    quantity: int
    unit_price: float

    @property
    def total_value(self) -> float:
        return float(self.quantity * self.unit_price)
`,
  },
};

// -----------------------------------------------------------------------------
// 5. Iterators & Generators: Chunk stream generator
// -----------------------------------------------------------------------------
export const lessonChunkStream: Lesson = {
  id: 'r8-chunks',
  realmId: 8,
  order: 7,
  title: 'Chunk stream generator',
  chip: 'Generators',
  icon: 'zap',
  scene: 'functions',
  difficulty: 3,
  minutes: 6,
  statement: 'Generators stream slices on demand using yield without buffering entire datasets.',
  example: {
    call: 'collect_chunks([1, 2, 3, 4, 5], 2)',
    result: '[[1, 2], [3, 4], [5]]',
  },
  task: 'Write generator chunk_stream(items, size) yielding sublists of at most size elements.',
  prompt: 'Write generator chunk_stream(items, size) yielding sublists of at most size elements.',
  toybox: [
    'A generator is a conveyor that halts after every box.',
    'yield hands out one chunk, pauses, and awaits the next request.',
  ],
  underHood: [
    'Functions with yield compile into generator objects with their own execution frame.',
    'Calling next() resumes the frame until the next YIELD_VALUE opcode executes.',
  ],
  starter: `def chunk_stream(items: list, size: int):
    """Yield successive sublists of at most size elements."""
    pass

def collect_chunks(items: list, size: int) -> list:
    """Consume generator into a list."""
    return list(chunk_stream(items, size))

print(collect_chunks([1, 2, 3, 4, 5], 2))
`,
  solution: `def chunk_stream(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]

def collect_chunks(items: list, size: int) -> list:
    return list(chunk_stream(items, size))

print(collect_chunks([1, 2, 3, 4, 5], 2))
`,
  expectedOutput: '[[1, 2], [3, 4], [5]]',
  entrypoint: 'collect_chunks',
  tests: [
    {
      id: 't1',
      description: 'Odd length with partial trailing chunk',
      args: [[1, 2, 3, 4, 5], 2],
      expected: [[1, 2], [3, 4], [5]],
      hidden: false,
    },
    {
      id: 't2',
      description: 'Even length chunks',
      args: [[10, 20, 30, 40], 2],
      expected: [[10, 20], [30, 40]],
      hidden: false,
    },
    {
      id: 't3',
      description: 'Empty input yields zero chunks',
      args: [[], 3],
      expected: [],
      hidden: true,
    },
    {
      id: 't4',
      description: 'Chunk size 1 yields singletons',
      args: [['a', 'b', 'c'], 1],
      expected: [['a'], ['b'], ['c']],
      hidden: true,
    },
    {
      id: 't5',
      description: 'Chunk size larger than list length',
      args: [[1, 2], 10],
      expected: [[1, 2]],
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Use yield statement',
      hint: 'yield items[i:i + size]',
      pattern: 'yield\\s+',
    },
    {
      id: 'g2',
      label: 'Step range by chunk size',
      hint: 'range(0, len(items), size)',
      pattern: 'range\\s*\\(\\s*0\\s*,\\s*len\\s*\\(',
    },
    {
      id: 'g3',
      label: 'Slice sublist',
      hint: 'items[i:i + size]',
      pattern: '\\[\\s*i\\s*:\\s*i\\s*\\+\\s*size\\s*\\]',
    },
  ],
  requirements: [
    { label: 'yield operator used', kind: 'pattern', value: 'yield\\s+' },
    { label: 'Range stepping used', kind: 'pattern', value: 'range\\s*\\(' },
    { label: 'All test cases pass', kind: 'output', value: '[[1, 2], [3, 4], [5]]' },
  ],
  hint: 'Iterate over range(0, len(items), size) and yield items[i:i + size].',
  xray: 'def chunk_stream(items, size):\n    for i in range(0, len(items), size):\n        yield items[i:i + size]',
  xp: 90,
  coins: 45,
  starLines: 8,
  pythonic: 'yield',
  exerciseType: 'code',
  tieredHints: {
    concept: 'range(start, stop, step) steps indices by size. Slicing items[i:i + size] creates the chunk.',
    approach: 'Loop through indices with step=size, and yield each slice. Python handles trailing boundaries safely.',
    skeleton: `def chunk_stream(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i:i + size]
`,
  },
};

// -----------------------------------------------------------------------------
// 6. Testing: Test assertion runner
// -----------------------------------------------------------------------------
export const lessonTestRunner: Lesson = {
  id: 'r8-testing',
  realmId: 8,
  order: 8,
  title: 'Test assertion runner',
  chip: 'Testing',
  icon: 'check',
  scene: 'functions',
  difficulty: 3,
  minutes: 6,
  statement: 'Test runners execute assertions safely and track passed versus failed counts.',
  example: {
    call: 'run_assertions(["assert 2 + 2 == 4", "assert 1 == 0"])',
    result: '{"passed": 1, "failed": 1}',
  },
  task: 'Write run_assertions(assertions) executing each assertion string and returning {"passed": p, "failed": f}.',
  prompt: 'Write run_assertions(assertions) executing each assertion string and returning {"passed": p, "failed": f}.',
  toybox: [
    'A test harness runs each assertion in a safe sandbox.',
    'If an assertion fails, catch the error and count the failure without stopping the suite.',
  ],
  underHood: [
    'Test runners wrap test executions in try/except blocks to collect outcome statistics.',
    'AssertionError is a built-in exception raised when an assert condition evaluates to false.',
  ],
  starter: `def run_assertions(assertions: list[str]) -> dict[str, int]:
    """Execute assertion statements and return tally of passed and failed."""
    pass

print(run_assertions(["assert 2 + 2 == 4", "assert 1 == 0"]))
`,
  solution: `def run_assertions(assertions: list[str]) -> dict:
    passed = 0
    failed = 0
    for stmt in assertions:
        try:
            exec(stmt, {})
            passed += 1
        except Exception:
            failed += 1
    return {"passed": passed, "failed": failed}

print(run_assertions(["assert 2 + 2 == 4", "assert 1 == 0"]))
`,
  expectedOutput: "{'passed': 1, 'failed': 1}",
  entrypoint: 'run_assertions',
  tests: [
    {
      id: 't1',
      description: 'One pass and one fail',
      args: [['assert 2 + 2 == 4', 'assert 1 == 0']],
      expected: { passed: 1, failed: 1 },
      hidden: false,
    },
    {
      id: 't2',
      description: 'All tests pass',
      args: [['assert 1 < 2', 'assert "py" in "python"', 'assert len([1, 2]) == 2']],
      expected: { passed: 3, failed: 0 },
      hidden: false,
    },
    {
      id: 't3',
      description: 'All tests fail',
      args: [['assert 5 == 10', 'assert False']],
      expected: { passed: 0, failed: 2 },
      hidden: true,
    },
    {
      id: 't4',
      description: 'Empty suite returns zero counts',
      args: [[]],
      expected: { passed: 0, failed: 0 },
      hidden: true,
    },
    {
      id: 't5',
      description: 'Single passing assertion',
      args: [['assert True']],
      expected: { passed: 1, failed: 0 },
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Iterate over assertions',
      hint: 'for stmt in assertions:',
      pattern: 'for\\s+\\w+\\s+in\\s+assertions',
    },
    {
      id: 'g2',
      label: 'Execute assertion in try-except',
      hint: 'try: exec(...) except:',
      pattern: 'try\\s*:',
    },
    {
      id: 'g3',
      label: 'Return passed and failed dict',
      hint: 'return {"passed": passed, "failed": failed}',
      pattern: 'return\\s+\\{\\s*["\']passed["\']',
    },
  ],
  requirements: [
    { label: 'try/except block used', kind: 'pattern', value: 'try\\s*:' },
    { label: 'exec built-in called', kind: 'pattern', value: 'exec\\s*\\(' },
    { label: 'All test cases pass', kind: 'output', value: "{'passed': 1, 'failed': 1}" },
  ],
  hint: 'Initialize counters, call exec(stmt, {}) inside try/except, and return {"passed": passed, "failed": failed}.',
  xray: 'def run_assertions(assertions):\n    p = sum(1 for s in assertions if not _fails(s))\n    return {"passed": p, "failed": len(assertions) - p}',
  xp: 90,
  coins: 45,
  starLines: 14,
  pythonic: 'try\\s*:',
  exerciseType: 'code',
  tieredHints: {
    concept: 'exec() evaluates a Python statement dynamically. Failed assert raises AssertionError.',
    approach: 'Loop through assertions, execute each statement within an isolated dictionary in a try block. If no error, increment passed; on exception, increment failed.',
    skeleton: `def run_assertions(assertions: list[str]) -> dict:
    passed = 0
    failed = 0
    for stmt in assertions:
        try:
            exec(stmt, {})
            passed += 1
        except Exception:
            failed += 1
    return {"passed": passed, "failed": failed}
`,
  },
};

// -----------------------------------------------------------------------------
// 7. Algorithms: Binary search
// -----------------------------------------------------------------------------
export const lessonBinarySearch: Lesson = {
  id: 'r8-bsearch',
  realmId: 8,
  order: 9,
  title: 'Binary search',
  chip: 'Algorithms',
  icon: 'target',
  scene: 'math',
  difficulty: 3,
  minutes: 6,
  statement: 'Binary search halves search intervals on sorted data to achieve O(log n) time.',
  example: {
    call: 'binary_search([10, 20, 30, 40, 50], 30)',
    result: '2',
  },
  task: 'Write binary_search(nums, target) returning the index of target in sorted nums, or -1.',
  prompt: 'Write binary_search(nums, target) returning the index of target in sorted nums, or -1.',
  toybox: [
    'Binary search checks the middle block each turn.',
    'Too high? Discard the right half. Too low? Discard the left half.',
  ],
  underHood: [
    'Binary search achieves O(log n) comparisons on random-access sequences.',
    'Integer division (low + high) // 2 prevents floating-point conversion.',
  ],
  starter: `def binary_search(nums: list[int], target: int) -> int:
    """Return index of target in sorted nums, or -1 if not found."""
    pass

print(binary_search([10, 20, 30, 40, 50], 30))
`,
  solution: `def binary_search(nums: list[int], target: int) -> int:
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

print(binary_search([10, 20, 30, 40, 50], 30))
`,
  expectedOutput: '2',
  entrypoint: 'binary_search',
  tests: [
    {
      id: 't1',
      description: 'Target located in middle',
      args: [[10, 20, 30, 40, 50], 30],
      expected: 2,
      hidden: false,
    },
    {
      id: 't2',
      description: 'Target at start of list',
      args: [[5, 15, 25, 35], 5],
      expected: 0,
      hidden: false,
    },
    {
      id: 't3',
      description: 'Target at end of list',
      args: [[5, 15, 25, 35], 35],
      expected: 3,
      hidden: true,
    },
    {
      id: 't4',
      description: 'Missing target returns -1',
      args: [[1, 3, 5, 7, 9], 4],
      expected: -1,
      hidden: true,
    },
    {
      id: 't5',
      description: 'Empty list returns -1',
      args: [[], 10],
      expected: -1,
      hidden: true,
    },
    {
      id: 't-perf',
      description: 'Performance: logarithmic accesses on large list',
      args: [Array.from({ length: 10_000 }, (_, i) => i * 2), 9998],
      expected: 4999,
      hidden: true,
      instrumented: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Initialize low and high pointers',
      hint: 'low = 0; high = len(nums) - 1',
      pattern: 'low\\s*=\\s*0',
    },
    {
      id: 'g2',
      label: 'Loop while low <= high',
      hint: 'while low <= high:',
      pattern: 'while\\s+low\\s*<=\\s*high',
    },
    {
      id: 'g3',
      label: 'Calculate midpoint',
      hint: 'mid = (low + high) // 2',
      pattern: '\\/\\/\\s*2',
    },
  ],
  requirements: [
    { label: 'Logarithmic while loop used', kind: 'pattern', value: 'while\\s+low\\s*<=\\s*high' },
    { label: 'Midpoint division used', kind: 'pattern', value: '\\/\\/\\s*2' },
    { label: 'All test cases pass', kind: 'output', value: '2' },
  ],
  hint: 'Maintain low and high pointers, calculate mid = (low + high) // 2, and update bounds accordingly.',
  xray: 'def binary_search(nums, target):\n    low, high = 0, len(nums) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: low = mid + 1\n        else: high = mid - 1\n    return -1',
  xp: 95,
  coins: 45,
  starLines: 16,
  pythonic: 'while\\s+low',
  exerciseType: 'code',
  tieredHints: {
    concept: 'At each step, comparing target with nums[mid] eliminates half of the remaining elements.',
    approach: 'Set low=0, high=len(nums)-1. While low <= high, compute mid. If match, return that index; if less, low=mid+1; else high=mid-1.',
    skeleton: `def binary_search(nums: list[int], target: int) -> int:
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        # branch on nums[mid]
    return -1
`,
  },
};

// -----------------------------------------------------------------------------
// 8. Algorithms: Two pointers sum
// -----------------------------------------------------------------------------
export const lessonTwoSumSorted: Lesson = {
  id: 'r8-twosum',
  realmId: 8,
  order: 10,
  title: 'Two pointers sum',
  chip: 'Algorithms',
  icon: 'wand',
  scene: 'lists',
  difficulty: 3,
  minutes: 6,
  statement: 'Two pointers moving inward locate target pair sums in sorted arrays in linear O(n) time.',
  example: {
    call: 'two_sum_sorted([1, 2, 4, 7, 11, 15], 15)',
    result: '[2, 4]',
  },
  task: 'Write two_sum_sorted(nums, target) returning [left, right] indices summing to target, or None.',
  prompt: 'Write two_sum_sorted(nums, target) returning [left, right] indices summing to target, or None.',
  toybox: [
    'Place one hand on the smallest item and one hand on the largest.',
    'Sum too small? Step the left hand up. Sum too large? Step the right hand down.',
  ],
  underHood: [
    'On sorted inputs, two pointers eliminates the need for an O(n) auxiliary hash table.',
    'Space complexity is O(1) auxiliary memory.',
  ],
  starter: `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    """Return [left, right] indices summing to target, or None."""
    pass

print(two_sum_sorted([1, 2, 4, 7, 11, 15], 15))
`,
  solution: `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
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

print(two_sum_sorted([1, 2, 4, 7, 11, 15], 15))
`,
  expectedOutput: '[2, 4]',
  entrypoint: 'two_sum_sorted',
  tests: [
    {
      id: 't1',
      description: 'Pair in middle indices 2 and 4 (4 + 11 = 15)',
      args: [[1, 2, 4, 7, 11, 15], 15],
      expected: [2, 4],
      hidden: false,
    },
    {
      id: 't2',
      description: 'First and last element pair',
      args: [[2, 7, 11, 15], 17],
      expected: [0, 3],
      hidden: false,
    },
    {
      id: 't3',
      description: 'No pair exists returns None',
      args: [[1, 2, 3, 9], 8],
      expected: null,
      hidden: true,
    },
    {
      id: 't4',
      description: 'Negative numbers in sorted list',
      args: [[-10, -5, 0, 3, 7], -3],
      expected: [0, 4],
      hidden: true,
    },
    {
      id: 't5',
      description: 'Two elements list',
      args: [[5, 10], 15],
      expected: [0, 1],
      hidden: true,
    },
    {
      id: 't6',
      description: 'Single element doubled not allowed, returns None',
      args: [[2, 3, 5], 6],
      expected: null,
      hidden: true,
    },
    {
      id: 't7',
      description: 'Two separate identical elements sum to target',
      args: [[3, 3], 6],
      expected: [0, 1],
      hidden: true,
    },
    {
      id: 't8',
      description: 'Single element doubled at pointer convergence returns None',
      args: [[1, 3, 7], 6],
      expected: null,
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Initialize left and right indices',
      hint: 'left = 0; right = len(nums) - 1',
      pattern: 'left\\s*=\\s*0',
    },
    {
      id: 'g2',
      label: 'Iterate with while left < right',
      hint: 'while left < right:',
      pattern: 'while\\s+left\\s*<\\s*right',
    },
    {
      id: 'g3',
      label: 'Adjust pointers based on sum',
      hint: 'left += 1 or right -= 1',
      pattern: 'left\\s*\\+=\\s*1',
    },
  ],
  requirements: [
    { label: 'Two pointers loop used', kind: 'pattern', value: 'while\\s+left\\s*<\\s*right' },
    { label: 'Pointer increment used', kind: 'pattern', value: 'left\\s*\\+=\\s*1' },
    { label: 'All test cases pass', kind: 'output', value: '[2, 4]' },
  ],
  hint: 'Check nums[left] + nums[right]. If current < target, increment left; if > target, decrement right.',
  xray: 'def two_sum_sorted(nums, target):\n    l, r = 0, len(nums) - 1\n    while l < r:\n        s = nums[l] + nums[r]\n        if s == target: return [l, r]\n        elif s < target: l += 1\n        else: r -= 1\n    return None',
  xp: 95,
  coins: 45,
  starLines: 17,
  pythonic: 'while\\s+left',
  exerciseType: 'code',
  tieredHints: {
    concept: 'Because the array is sorted, incrementing left increases the sum and decrementing right decreases it.',
    approach: 'Set left=0, right=len(nums)-1. While left < right, calculate sum. Return [left, right] on match, otherwise step pointers.',
    skeleton: `def two_sum_sorted(nums: list[int], target: int) -> list[int] | None:
    left, right = 0, len(nums) - 1
    while left < right:
        # compare nums[left] + nums[right] with target
        pass
    return None
`,
  },
};

// -----------------------------------------------------------------------------
// 9. Practical Track: Clean user records (Data Track)
// -----------------------------------------------------------------------------
export const lessonCleanUserRecords: Lesson = {
  id: 'r8-data-clean',
  realmId: 8,
  order: 11,
  title: 'Clean user records',
  chip: 'Data track',
  icon: 'grid',
  scene: 'dicts',
  difficulty: 3,
  minutes: 6,
  pure: true,
  statement: 'Data pipelines filter missing records and normalize messy input text without mutating input records.',
  example: {
    call: 'clean_user_records([{"id": 1, "email": " NOVA@SPACE.ORG "}, {"id": 2, "email": None}])',
    result: '[{"id": 1, "email": "nova@space.org"}]',
  },
  task: 'Write clean_user_records(records) removing None emails and lowercasing valid email strings without mutating input records.',
  prompt: 'Write clean_user_records(records) removing None emails and lowercasing valid email strings without mutating input records.',
  toybox: [
    'A data refinery extracts pure fuel from raw slag.',
    'Filter out incomplete records and normalize email addresses to lower-case.',
  ],
  underHood: [
    'Dictionary copying {**r, "email": ...} creates clean copies without mutating upstream inputs.',
    'Filtering reduces garbage in downstream relational databases.',
  ],
  starter: `def clean_user_records(records: list[dict]) -> list[dict]:
    """Filter records with None emails and normalize valid emails."""
    pass

print(clean_user_records([{"id": 1, "email": " NOVA@SPACE.ORG "}, {"id": 2, "email": None}]))
`,
  solution: `def clean_user_records(records: list[dict]) -> list[dict]:
    cleaned = []
    for r in records:
        email = r.get("email")
        if email is not None and isinstance(email, str):
            cleaned.append({**r, "email": email.strip().lower()})
    return cleaned

print(clean_user_records([{"id": 1, "email": " NOVA@SPACE.ORG "}, {"id": 2, "email": None}]))
`,
  expectedOutput: "[{'id': 1, 'email': 'nova@space.org'}]",
  entrypoint: 'clean_user_records',
  tests: [
    {
      id: 't1',
      description: 'Filters None and strips uppercase',
      args: [[{ id: 1, email: ' NOVA@SPACE.ORG ' }, { id: 2, email: null }]],
      expected: [{ id: 1, email: 'nova@space.org' }],
      hidden: false,
    },
    {
      id: 't2',
      description: 'Multiple valid records preserved',
      args: [[{ id: 10, email: 'PILOT@STATION.NET' }, { id: 20, email: 'aria@space.org' }]],
      expected: [{ id: 10, email: 'pilot@station.net' }, { id: 20, email: 'aria@space.org' }],
      hidden: false,
    },
    {
      id: 't3',
      description: 'Empty list returns empty list',
      args: [[]],
      expected: [],
      hidden: true,
    },
    {
      id: 't4',
      description: 'All records missing email',
      args: [[{ id: 1, email: null }, { id: 2 }]],
      expected: [],
      hidden: true,
    },
    {
      id: 't5',
      description: 'Email with trailing spaces',
      args: [[{ id: 5, email: '  zack@odyssey.org  ' }]],
      expected: [{ id: 5, email: 'zack@odyssey.org' }],
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Iterate over records',
      hint: 'for r in records:',
      pattern: 'for\\s+\\w+\\s+in\\s+records',
    },
    {
      id: 'g2',
      label: 'Filter None values',
      hint: 'if email is not None:',
      pattern: 'is\\s+not\\s+None',
    },
    {
      id: 'g3',
      label: 'Normalize email to lowercase',
      hint: 'email.strip().lower()',
      pattern: '\\.lower\\(',
    },
  ],
  requirements: [
    { label: 'Filtering check present', kind: 'pattern', value: 'is\\s+not\\s+None' },
    { label: 'String lower method used', kind: 'pattern', value: '\\.lower\\(' },
    { label: 'All test cases pass', kind: 'output', value: "[{'id': 1, 'email': 'nova@space.org'}]" },
  ],
  hint: 'Check if record has a non-None email string, then append a copy with email.strip().lower().',
  xray: 'def clean_user_records(records):\n    return [{**r, "email": r["email"].strip().lower()} for r in records if r.get("email")]',
  xp: 90,
  coins: 45,
  starLines: 11,
  pythonic: 'for\\s+\\w+\\s+in',
  exerciseType: 'code',
  tieredHints: {
    concept: 'Dict method .get("key") avoids KeyErrors. String methods .strip() and .lower() clean formatting.',
    approach: 'Loop through records. If r.get("email") is not None, copy the dict and set normalized email.',
    skeleton: `def clean_user_records(records: list[dict]) -> list[dict]:
    cleaned = []
    for r in records:
        email = r.get("email")
        if email is not None:
            cleaned.append({**r, "email": email.strip().lower()})
    return cleaned
`,
  },
};

// -----------------------------------------------------------------------------
// 10. Practical Track: API route dispatcher (Web Track)
// -----------------------------------------------------------------------------
export const lessonExtractApiRoutes: Lesson = {
  id: 'r8-web-routes',
  realmId: 8,
  order: 12,
  title: 'API route dispatcher',
  chip: 'Web track',
  icon: 'terminal',
  scene: 'functions',
  difficulty: 3,
  minutes: 6,
  statement: 'Web frameworks parse route definitions to map HTTP methods to URL endpoint lists.',
  example: {
    call: 'extract_api_routes(["GET /api/health", "POST /api/users", "GET /api/items"])',
    result: '{"GET": ["/api/health", "/api/items"], "POST": ["/api/users"]}',
  },
  task: 'Write extract_api_routes(endpoints) grouping URL paths by HTTP method into a dictionary.',
  prompt: 'Write extract_api_routes(endpoints) grouping URL paths by HTTP method into a dictionary.',
  toybox: [
    'An API router is a postal hub sorting letters by destination.',
    'Each HTTP method (GET, POST) gets a bucket of route paths.',
  ],
  underHood: [
    'Routers group paths by HTTP verb for fast O(1) method dispatch before pattern matching.',
    'dict.setdefault or defaultdict(list) guarantees bucket initialization.',
  ],
  starter: `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    """Group URL paths by their HTTP verb into a dictionary of lists."""
    pass

print(extract_api_routes(["GET /api/health", "POST /api/users", "GET /api/items"]))
`,
  solution: `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    routes: dict[str, list[str]] = {}
    for entry in endpoints:
        parts = entry.strip().split()
        if len(parts) == 2:
            method, path = parts
            if method not in routes:
                routes[method] = []
            routes[method].append(path)
    return routes

print(extract_api_routes(["GET /api/health", "POST /api/users", "GET /api/items"]))
`,
  expectedOutput: "{'GET': ['/api/health', '/api/items'], 'POST': ['/api/users']}",
  entrypoint: 'extract_api_routes',
  tests: [
    {
      id: 't1',
      description: 'Groups GET and POST methods',
      args: [['GET /api/health', 'POST /api/users', 'GET /api/items']],
      expected: { GET: ['/api/health', '/api/items'], POST: ['/api/users'] },
      hidden: false,
    },
    {
      id: 't2',
      description: 'Single route endpoint',
      args: [['DELETE /api/items/1']],
      expected: { DELETE: ['/api/items/1'] },
      hidden: false,
    },
    {
      id: 't3',
      description: 'Empty list returns empty dict',
      args: [[]],
      expected: {},
      hidden: true,
    },
    {
      id: 't4',
      description: 'Multiple methods in diverse order',
      args: [['PUT /api/config', 'GET /status', 'PUT /api/env']],
      expected: { PUT: ['/api/config', '/api/env'], GET: ['/status'] },
      hidden: true,
    },
    {
      id: 't5',
      description: 'Whitespace padded entry lines',
      args: [['  POST /api/auth  ', '  POST /api/refresh  ']],
      expected: { POST: ['/api/auth', '/api/refresh'] },
      hidden: true,
    },
  ],
  goals: [
    {
      id: 'g1',
      label: 'Iterate over endpoint entries',
      hint: 'for entry in endpoints:',
      pattern: 'for\\s+\\w+\\s+in\\s+endpoints',
    },
    {
      id: 'g2',
      label: 'Split method and path',
      hint: 'method, path = entry.strip().split()',
      pattern: '\\.split\\(',
    },
    {
      id: 'g3',
      label: 'Append path to method list',
      hint: 'routes[method].append(path)',
      pattern: '\\.append\\(',
    },
  ],
  requirements: [
    { label: 'String splitting used', kind: 'pattern', value: '\\.split\\(' },
    { label: 'List appending used', kind: 'pattern', value: '\\.append\\(' },
    { label: 'All test cases pass', kind: 'output', value: "{'GET': ['/api/health', '/api/items'], 'POST': ['/api/users']}" },
  ],
  hint: 'Split each line into method and path, initialize list in dict if needed, and append the path.',
  xray: 'def extract_api_routes(endpoints):\n    r = {}\n    for e in endpoints:\n        m, p = e.strip().split()\n        r.setdefault(m, []).append(p)\n    return r',
  xp: 95,
  coins: 45,
  starLines: 14,
  pythonic: 'for\\s+\\w+\\s+in',
  exerciseType: 'code',
  tieredHints: {
    concept: 'split() separates whitespace-delimited tokens into [method, path].',
    approach: 'Loop through endpoints, split into method and path. Add path to routes[method] (creating the list if absent).',
    skeleton: `def extract_api_routes(endpoints: list[str]) -> dict[str, list[str]]:
    routes = {}
    for entry in endpoints:
        method, path = entry.strip().split()
        if method not in routes:
            routes[method] = []
        routes[method].append(path)
    return routes
`,
  },
};

export const PHASE5_LESSONS: Lesson[] = [
  lessonCleanLog,
  lessonSafeConfig,
  lessonTopWords,
  lessonInventoryRecord,
  lessonChunkStream,
  lessonTestRunner,
  lessonBinarySearch,
  lessonTwoSumSorted,
  lessonCleanUserRecords,
  lessonExtractApiRoutes,
];
