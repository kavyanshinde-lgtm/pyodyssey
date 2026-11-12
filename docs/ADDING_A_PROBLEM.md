# Adding a Problem to PyOdyssey

This guide defines the curriculum schema, visual layout requirements, and behavioral testing patterns for PyOdyssey problems.

---

## 1. Visual Layout & Left-Pane Fields

The PyOdyssey left pane presents learning content in three distinct parts:
1. **Header**: Problem title in sentence case, followed by three metadata pills:
   - `chip`: Topic name in sentence case (e.g. `Strings`, `Collections`, `Recursion`)
   - `difficulty`: Numeric `1` (Easy) to `5` (Hard)
   - `minutes`: Estimated time in minutes (e.g. `5 min`)
2. **Short statement sentence** (`statement`): One concise sentence explaining the concept.
3. **Example block** (`example`):
   - `call`: Exact Python function call with realistic sample arguments (e.g. `clean_log("2026-11-01 [WARN] CPU hot")`).
   - `result`: Clean string or value representation rendered with `--pass` indicator.
   - **Rule**: Never use generic `solution(...)`. Never reveal the internal algorithm logic.
4. **One-line task** (`task`): One clear sentence instructing what to build and return/print.

---

## 2. Content Constraints & Voice

- **No emojis**: Never use emojis in titles, chips, icons, prompts, hints, or code snippets. Use plain text or standard icon names (`code`, `file`, `list`, `box`).
- **Sentence case everywhere**: All titles and topics must use standard sentence case (`Word count index`, `Token stream generator`), never all-caps (`WORD COUNT`).
- **Starter code**: Function signature and docstring only. Never include starter code that gives away the solution implementation.
- **Three-tiered hints** (`tieredHints`):
  - Hints stay hidden by default until the student clicks **Show hint**.
  - Tier 1 (`concept`): Explains the underlying Python principle or mechanism.
  - Tier 2 (`approach`): Plain-English algorithmic strategy.
  - Tier 3 (`skeleton`): Partial code structure showing layout without final logic.

---

## 3. Behavioral Testing Standards

PyOdyssey grades runtime behavior inside a Pyodide Web Worker. Every problem must include:

1. **5 to 10 test cases** (`tests`):
   - At least 2 visible test cases matching the problem description.
   - 3+ hidden test cases covering boundaries:
     - Empty inputs (`""`, `[]`, `{}`)
     - Zero and negative values
     - Repeated or duplicate keys/values
     - Extreme sizes or boundary values
2. **Behavioral test suite in `tests/`**:
   For every problem, write automated vitest assertions covering:
   - **(a) Reference solution**: passes all test cases.
   - **(b1, b2) 2+ valid alternatives**: different implementation styles (e.g. comprehension vs loop, built-in vs algorithm) that pass.
   - **(c1, c2, c3) 3+ wrong solutions**: must be rejected by the grader:
     - Off-by-one errors
     - Hardcoded example returns
     - Incorrect return types (e.g. printing instead of returning, string instead of int)

---

## 4. Problem Data Schema Template

```typescript
import type { Lesson } from './types';

export const myNewLesson: Lesson = {
  id: 'r6-2',
  realmId: 6,
  order: 2,
  title: 'Clean log line',
  chip: 'Strings',
  icon: 'file',
  scene: 'strings',
  difficulty: 2,
  minutes: 5,

  // 1. One short statement sentence
  statement: 'Log strings often contain surrounding whitespace and bracketed severity tags.',

  // 2. Example block: real call and clean expected output
  example: {
    call: 'extract_tag("[WARN] Disk almost full")',
    result: '"WARN"',
  },

  // 3. One-line task
  task: 'Write extract_tag(line) that returns the severity text between the brackets.',

  // Backwards-compatible prompt text
  prompt: 'Write extract_tag(line) that returns the severity text between the brackets.',

  // Toybox & Under the Hood pedagogical drawer content
  toybox: [
    'Log tags are like luggage tags on text.',
    'Strip the brackets off to read the alert level inside.',
  ],
  underHood: [
    'String find and slice operations run in O(k) time where k is the sliced substring length.',
    'Slicing produces a new string without mutating the original log record.',
  ],

  // Real function entrypoint
  entrypoint: 'extract_tag',

  // Starter: signature + docstring only
  starter: `def extract_tag(line: str) -> str:
    """Extract and return the severity tag inside square brackets."""
    pass
`,

  // Reference solution
  solution: `def extract_tag(line: str) -> str:
    start = line.find('[')
    end = line.find(']')
    if start == -1 or end == -1 or end < start:
      return ""
    return line[start + 1:end]
`,

  expectedOutput: 'WARN',

  // Behavioral test cases (visible + hidden edge cases)
  tests: [
    {
      id: 't1',
      description: 'Standard warning tag',
      args: ['[WARN] Disk almost full'],
      expected: 'WARN',
      hidden: false,
    },
    {
      id: 't2',
      description: 'Info tag with leading spaces',
      args: ['  [INFO] Service started'],
      expected: 'INFO',
      hidden: false,
    },
    {
      id: 't3',
      description: 'Empty brackets return empty string',
      args: ['[] Empty tag'],
      expected: '',
      hidden: true,
    },
    {
      id: 't4',
      description: 'No brackets returns empty string',
      args: ['Unformatted message'],
      expected: '',
      hidden: true,
    },
    {
      id: 't5',
      description: 'Reversed brackets return empty string',
      args: [']ERROR[ Corrupted'],
      expected: '',
      hidden: true,
    },
  ],

  // 3 Micro-goals for structural validation
  goals: [
    {
      id: 'g1',
      label: 'Define extract_tag function',
      hint: 'def extract_tag(line):',
      pattern: 'def\\s+extract_tag',
    },
    {
      id: 'g2',
      label: 'Locate bracket indices',
      hint: 'Use line.find("[") and line.find("]").',
      pattern: '\\.find\\(',
    },
    {
      id: 'g3',
      label: 'Return sliced tag',
      hint: 'Return the slice between bracket indices.',
      pattern: 'return\\s+',
    },
  ],

  // 3 Validation requirements
  requirements: [
    { label: 'Function extract_tag defined', kind: 'pattern', value: 'def\\s+extract_tag' },
    { label: 'Slice or partition used', kind: 'pattern', value: '\\[.*:.*\\]|\\.split|\\.partition' },
    { label: 'All behavioral test cases pass', kind: 'output', value: 'WARN' },
  ],

  hint: 'Locate the opening and closing brackets, then slice the substring between them.',
  xray: 'def extract_tag(line: str) -> str:\n    return line[line.find("[") + 1:line.find("]")]',
  xp: 75,
  coins: 35,
  starLines: 5,
  exerciseType: 'code',

  // 3-Tier hints (hidden until user clicks Show hint)
  tieredHints: {
    concept: 'Strings can be indexed and sliced using [start:end]. find() returns the index of a substring.',
    approach: 'Find the index of "[" and "]", then return the slice between them with line[start + 1:end].',
    skeleton: `def extract_tag(line: str) -> str:
    start = line.find('[')
    end = line.find(']')
    # return slice
`,
  },
};
```

---

## 5. Verification Checklist

Before opening a pull request or committing new lessons:
1. `npm run css:check`: confirms 0 unstyled classes.
2. `npm test`: confirms all behavioral test cases and educator tests pass.
3. `npm run build`: confirms clean TypeScript and Vite compilation.
4. Verify layout in browser:
   - Check title, 3 pills, statement, Example block (real call, SVG arrow, `--pass` output), task line.
   - Confirm hints stay hidden until clicked.
