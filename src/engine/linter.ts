import type { MicroGoal, Requirement } from '../data/curriculum';
import type { ConstructResult, RunResult, TestResult } from './types';

export type Severity = 'error' | 'warning' | 'info';

export interface LintIssue {
  id: string;
  code: string;
  line: number;
  column: number;
  severity: Severity;
  title: string;
  message: string;
  hint: string;
}

export interface FriendlyError {
  title: string;
  message: string;
  hint: string;
  line: number | null;
  rawType: string;
  rawMessage: string;
  suggestion?: string;
  timeout?: boolean;
}

export interface GoalResult {
  id: string;
  label: string;
  passed: boolean;
  hint: string;
}

export interface RequirementResult {
  label: string;
  kind: Requirement['kind'];
  passed: boolean;
  hint?: string;
}

export interface ValidationReport {
  passed: boolean;
  compiled: boolean;
  goals: GoalResult[];
  requirements: RequirementResult[];
  stars: number;
  lineCount: number;
  passedChecks: number;
  totalChecks: number;
  failures: RequirementResult[];
  testResults?: TestResult[];
  constructs?: ConstructResult[];
}

export interface CodeSignals {
  hasLoop: boolean;
  hasWhile: boolean;
  hasFor: boolean;
  hasFunction: boolean;
  hasClass: boolean;
  hasComprehension: boolean;
  hasPrint: boolean;
  hasInput: boolean;
  hasFString: boolean;
  hasRecursion: boolean;
  hasList: boolean;
  hasDict: boolean;
  hasTuple: boolean;
  hasSet: boolean;
  hasReturn: boolean;
  hasYield: boolean;
  forVariable: string | null;
  iterableExpression: string | null;
  functionNames: string[];
  classNames: string[];
  assignedNames: string[];
  loopBodyLines: number[];
}

const BLOCK_KEYWORDS = [
  'if',
  'elif',
  'else',
  'for',
  'while',
  'def',
  'class',
  'try',
  'except',
  'finally',
  'with',
  'match',
  'case',
];

const PYTHON_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

const BUILTINS = [
  'print',
  'input',
  'len',
  'range',
  'int',
  'float',
  'str',
  'bool',
  'list',
  'dict',
  'set',
  'tuple',
  'sum',
  'min',
  'max',
  'abs',
  'round',
  'sorted',
  'reversed',
  'enumerate',
  'zip',
  'map',
  'filter',
  'type',
  'isinstance',
  'open',
  'super',
  'self',
  'cls',
  'value',
  'values',
  'items',
  'keys',
  'append',
  'upper',
  'lower',
  'title',
  'strip',
  'split',
  'join',
  'format',
  'read',
  'write',
];

function lineIndent(line: string) {
  const match = /^[ \t]*/.exec(line);
  return match ? match[0] : '';
}

function stripInlineComment(line: string): string {
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote) {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '#') return line.slice(0, index);
  }
  return line;
}

function isAssignmentInsideCondition(line: string): boolean {
  const trimmed = line.trimStart();
  const match = /^(if|elif|while)\b/.exec(trimmed);
  if (!match) return false;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let index = match[0].length; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && quote) {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if ('([{'.includes(char)) depth += 1;
    if (')]}'.includes(char)) depth -= 1;
    if (depth === 0 && char === ':') break;
    if (char !== '=') continue;
    const previous = trimmed[index - 1] ?? '';
    const next = trimmed[index + 1] ?? '';
    if (next === '=' || previous === '=' || previous === '!' || previous === '<' || previous === '>' || previous === ':') {
      continue;
    }
    if (previous === '+' || previous === '-' || previous === '*' || previous === '/' || previous === '%') {
      continue;
    }
    return true;
  }
  return false;
}

export function lintPython(source: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = source.split('\n');
  let tripleQuote: string | null = null;
  let tripleStartLine = 0;
  let bracketStack: Array<{ char: string; line: number; column: number }> = [];
  let simpleQuote: { quote: string; line: number; column: number } | null = null;
  let sawTabs = false;
  let sawSpaces = false;
  let openClass: { indent: number; name: string; line: number } | null = null;
  let previousDecorator = '';

  const push = (
    code: string,
    line: number,
    column: number,
    severity: Severity,
    title: string,
    message: string,
    hint: string,
  ) => {
    issues.push({
      id: `${code}-${line}-${column}`,
      code,
      line,
      column,
      severity,
      title,
      message,
      hint,
    });
  };

  lines.forEach((rawLine, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const indent = lineIndent(rawLine);
    if (indent.includes('\t')) sawTabs = true;
    if (indent.includes(' ')) sawSpaces = true;

    if (indent.includes('\t') && indent.includes(' ')) {
      push(
        'MIXED-INDENT',
        lineNumber,
        1,
        'error',
        'Indentation traffic jam',
        'This line mixes tabs and spaces.',
        'Pick four spaces. Python counts them exactly, and mixed indentation raises TabError.',
      );
    }

    if (openClass && rawLine.trim() && !/^\s*#/.test(rawLine)) {
      const currentIndent = indent.length;
      if (currentIndent <= openClass.indent) {
        openClass = null;
      }
    }

    const classMatch = /^(\s*)class\s+([A-Za-z_]\w*)/.exec(rawLine);
    if (classMatch) {
      openClass = {
        indent: classMatch[1].length,
        name: classMatch[2],
        line: lineNumber,
      };
      previousDecorator = '';
    }

    const defMatch = /^(\s*)def\s+([A-Za-z_]\w*)\s*\((.*?)\)\s*:?/.exec(rawLine);
    if (defMatch) {
      const defIndent = defMatch[1].length;
      const name = defMatch[2];
      const params = defMatch[3].trim();
      const inClass = openClass !== null && defIndent > openClass.indent;
      if (inClass && !previousDecorator.includes('staticmethod') && !previousDecorator.includes('classmethod')) {
        const firstParam = params.split(',')[0]?.trim().replace(/[:=].*$/, '').trim();
        if (!firstParam) {
          push(
            'MISSING-SELF',
            lineNumber,
            defIndent + 1,
            'error',
            'The robot has no self',
            `Method ${name}() forgot its self parameter.`,
            `Write def ${name}(self, ...). Without self, the laser printer cannot tell which robot to stamp.`,
          );
        } else if (firstParam !== 'self' && firstParam !== 'cls' && name !== '__new__') {
          push(
            'MISSING-SELF',
            lineNumber,
            defIndent + 1,
            'warning',
            'That first parameter looks lonely',
            `Inside a class, ${name}() normally starts with self.`,
            `Use self as the first parameter so attributes attach to this robot: def ${name}(self, ...).`,
          );
        }
      }
      previousDecorator = '';
    } else if (rawLine.trim().startsWith('@')) {
      previousDecorator = rawLine.trim();
    } else if (rawLine.trim() && !rawLine.trim().startsWith('#')) {
      if (!/^\s*(if|elif|else|for|while|try|except|finally|with|match|case)\b/.test(rawLine) || defMatch) {
        previousDecorator = '';
      }
    }

    // Multi-line strings: scan until the closing triple quote.
    let cursor = 0;
    while (cursor < rawLine.length) {
      if (tripleQuote) {
        const close = rawLine.indexOf(tripleQuote, cursor);
        if (close === -1) {
          cursor = rawLine.length;
          break;
        }
        tripleQuote = null;
        cursor = close + 3;
        continue;
      }

      const char = rawLine[cursor];
      if (char === '#') break;

      if (char === '"' || char === "'") {
        const triple = rawLine.slice(cursor, cursor + 3);
        if (triple === '"""' || triple === "'''") {
          const close = rawLine.indexOf(triple, cursor + 3);
          if (close === -1) {
            tripleQuote = triple;
            tripleStartLine = lineNumber;
            cursor = rawLine.length;
            break;
          }
          cursor = close + 3;
          continue;
        }

        let end = cursor + 1;
        let escaped = false;
        while (end < rawLine.length) {
          const inner = rawLine[end];
          if (escaped) {
            escaped = false;
            end += 1;
            continue;
          }
          if (inner === '\\') {
            escaped = true;
            end += 1;
            continue;
          }
          if (inner === char) break;
          end += 1;
        }
        if (end >= rawLine.length) {
          if (!simpleQuote) {
            simpleQuote = { quote: char, line: lineNumber, column: cursor + 1 };
          }
          cursor = rawLine.length;
          break;
        }
        cursor = end + 1;
        const remaining = rawLine.slice(cursor);
        const matchInvalidTrailing = /^\s*([A-Za-z0-9_]+)/.exec(remaining);
        if (matchInvalidTrailing) {
          const token = matchInvalidTrailing[1];
          const validPostStringKeywords = new Set([
            'in',
            'if',
            'else',
            'for',
            'and',
            'or',
            'not',
            'is',
          ]);
          if (!validPostStringKeywords.has(token)) {
            push(
              'SYNTAX-ERROR',
              lineNumber,
              cursor + 1 + (matchInvalidTrailing.index ?? 0),
              'error',
              'Invalid syntax',
              `Unexpected identifier "${token}" right after string literal.`,
              'Did you forget an operator (+ or ,) or newline?',
            );
          }
        }
        continue;
      }

      if ('([{'.includes(char)) {
        bracketStack.push({ char, line: lineNumber, column: cursor + 1 });
      } else if (')]}'.includes(char)) {
        const open = bracketStack.pop();
        const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
        if (!open) {
          push(
            'STRAY-BRACKET',
            lineNumber,
            cursor + 1,
            'error',
            'A bracket escaped',
            `This ${char} has no matching opening bracket.`,
            'Delete it or add the missing opening bracket before this line.',
          );
        } else if (open.char !== pairs[char]) {
          push(
            'BRACKET-MISMATCH',
            lineNumber,
            cursor + 1,
            'error',
            'Brackets crossed wires',
            `This ${char} closes a ${open.char} from line ${open.line}.`,
            'Brackets must nest: ([{ ... }]). Check the innermost pair first.',
          );
        }
      }
      cursor += 1;
    }

    if (simpleQuote) {
      push(
        'UNCLOSED-QUOTE',
        simpleQuote.line,
        simpleQuote.column,
        'error',
        'An open quote is leaking',
        'This string starts with a quote but never closes on the same line.',
        'Add the matching quote at the end of the text. For multi-line text use triple quotes.',
      );
      simpleQuote = null;
    }

    const executable = stripInlineComment(rawLine);
    const trimmed = executable.trim();

    if (!trimmed) return;

    if (trimmed.startsWith('if ') && /^if\s+\S+\s*=\s*[^=]/.test(trimmed) && !/==/.test(trimmed)) {
      // Covered by the structural scan, kept for a precise message.
    }

    if (isAssignmentInsideCondition(executable)) {
      push(
        'ASSIGN-IN-CONDITION',
        lineNumber,
        1,
        'error',
        'You packed a value instead of asking',
        'A single = inside if/while assigns; it does not compare.',
        'Use == for the question. Example: if score == 10:',
      );
    }

    const blockKeyword = BLOCK_KEYWORDS.find((keyword) =>
      new RegExp(`^${keyword}\\b`).test(trimmed),
    );
    if (blockKeyword) {
      const hasColon = /:(?:\s|$|#)/.test(executable) || executable.trimEnd().endsWith(':');
      if (!hasColon) {
        push(
          'MISSING-COLON',
          lineNumber,
          executable.length,
          'error',
          'The gate has no hinge',
          `Your ${blockKeyword} line is missing its colon.`,
          'Add : at the end. Example: if energy > 0:',
        );
      }
    }

    if (/^print\s+[^(\s]/.test(trimmed) && !trimmed.startsWith('print(')) {
      push(
        'PY2-PRINT',
        lineNumber,
        1,
        'error',
        'That is ancient print magic',
        'This looks like Python 2 print syntax.',
        'Wrap the message in brackets: print("hello").',
      );
    }

    if (/^else\s+if\b/.test(trimmed)) {
      push(
        'ELSE-IF',
        lineNumber,
        1,
        'error',
        'Else-if is not a Python word',
        'Python uses elif for a chained condition.',
        'Write elif condition: instead of else if condition:.',
      );
    }

    if (/^\s*[A-Za-z_]\w*\s*=\s*[^=]/.test(rawLine) && /^\s*(if|while)\b/.test(rawLine)) {
      // handled above
    }

    const assignment = /^\s*([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(rawLine);
    if (assignment) {
      const [, name, value] = assignment;
      if (name === 'True' || name === 'False' || name === 'None') {
        push(
          'REBIND-CONSTANT',
          lineNumber,
          1,
          'warning',
          'Do not repaint the light switch',
          `${name} is a built-in constant.`,
          'Use a different variable name; True, False, and None are special.',
        );
      }
      if (/^\s*["'][^"']*["']\s*$/.test(value) && /^[A-Z_]+$/.test(name)) {
        // A conventional constant, no warning.
      }
    }

    const unclosedBrackets = bracketStack.filter((entry) => entry.line === lineNumber);
    if (unclosedBrackets.length > 0 && lineNumber === lines.length && !tripleQuote) {
      for (const bracket of unclosedBrackets) {
        push(
          'UNCLOSED-BRACKET',
          bracket.line,
          bracket.column,
          'error',
          'A bracket is still waiting',
          `This ${bracket.char} never finds its closing partner.`,
          'Close the bracket, or check the indentation of the lines inside it.',
        );
      }
    }
  });

  if (tripleQuote) {
    push(
      'UNCLOSED-TRIPLE',
      tripleStartLine,
      1,
      'error',
      'The long scroll never ends',
      'A triple-quoted string was opened but never closed.',
      'Add the matching triple quote (""" or \'\'\') to finish the text.',
    );
  }

  if (bracketStack.length > 0) {
    for (const bracket of bracketStack) {
      push(
        'UNCLOSED-BRACKET',
        bracket.line,
        bracket.column,
        'error',
        'A bracket is still waiting',
        `This ${bracket.char} never finds its closing partner.`,
        'Count the opening and closing brackets. The cursor needs a matching pair.',
      );
    }
  }

  if (sawTabs && sawSpaces) {
    push(
      'TABS-AND-SPACES',
      1,
      1,
      'warning',
      'Tabs and spaces are arguing',
      'This file contains both tab and space indentation.',
      'Convert indentation to four spaces (most editors call this "Convert indentation to spaces").',
    );
  }

  // Deduplicate by code + line.
  const seen = new Set<string>();
  return issues
    .filter((issue) => {
      const key = `${issue.code}:${issue.line}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.line - b.line || a.column - b.column);
}

/**
 * Removes Python comments while preserving strings and newlines. Structural
 * checks must never be satisfiable by writing the required syntax in a comment.
 */
export function stripPythonComments(source: string): string {
  let out = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '#') {
      const newline = source.indexOf('\n', index);
      if (newline === -1) break;
      out += '\n';
      index = newline + 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const triple = source.slice(index, index + 3) === char.repeat(3);
      if (triple) {
        const closer = char.repeat(3);
        const end = source.indexOf(closer, index + 3);
        if (end === -1) {
          out += source.slice(index);
          break;
        }
        out += source.slice(index, end + 3);
        index = end + 3;
        continue;
      }
      let end = index + 1;
      let escaped = false;
      while (end < source.length) {
        const inner = source[end];
        if (escaped) {
          escaped = false;
          end += 1;
          continue;
        }
        if (inner === '\\') {
          escaped = true;
          end += 1;
          continue;
        }
        if (inner === char) {
          end += 1;
          break;
        }
        if (inner === '\n') break;
        end += 1;
      }
      out += source.slice(index, end);
      index = end;
      continue;
    }

    out += char;
    index += 1;
  }
  return out;
}

export function checkGoals(source: string, goals: MicroGoal[]): GoalResult[] {
  const structural = stripPythonComments(source);
  return goals.map((goal) => {
    let passed = false;
    try {
      const expression = new RegExp(goal.pattern, goal.flags ?? 'm');
      passed = expression.test(structural);
      if (goal.not) passed = !passed;
    } catch {
      passed = false;
    }
    return { id: goal.id, label: goal.label, passed, hint: goal.hint };
  });
}

export function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

export function validateCode(
  source: string,
  lesson: {
    goals: MicroGoal[];
    requirements: Requirement[];
    starLines: number;
    pythonic?: string;
  },
  run: RunResult,
): ValidationReport {
  const goals = checkGoals(source, lesson.goals);
  const output = normalizeOutput(run.output);
  const compiled = !run.error;
  const lineCount = source.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
  const structural = stripPythonComments(source);

  const requirements: RequirementResult[] = lesson.requirements.map((requirement) => {
    let passed = false;
    try {
      if (requirement.kind === 'output') {
        const normExpected = normalizeOutput(requirement.value);
        const normOutput = normalizeOutput(output);
        const expLineCount = normExpected.split('\n').length;
        const trailingLines = normOutput.split('\n').slice(-expLineCount).join('\n');
        passed = normOutput === normExpected || trailingLines === normExpected;
      } else if (requirement.kind === 'pattern') {
        passed = new RegExp(requirement.value, 'm').test(structural);
      } else if (requirement.kind === 'forbid') {
        passed = !new RegExp(requirement.value, 'm').test(structural);
      } else if (requirement.kind === 'min-lines') {
        passed = lineCount >= Number(requirement.value);
      }
    } catch {
      passed = false;
    }
    return {
      label: requirement.label,
      kind: requirement.kind,
      passed: compiled && passed,
      hint: requirement.hint,
    };
  });

  const passedChecks = requirements.filter((check) => check.passed).length;
  const allRequirements = requirements.length > 0 && passedChecks === requirements.length;
  const allGoals = goals.every((goal) => goal.passed);
  const lintHasErrors = lintPython(source).some((issue) => issue.severity === 'error');
  const pythonic = lesson.pythonic ? new RegExp(lesson.pythonic, 'm').test(structural) : true;

  let stars = 0;
  if (compiled && allRequirements) {
    stars = 1;
    if (allGoals && !lintHasErrors) stars += 1;
    if (allGoals && pythonic && lineCount <= lesson.starLines) stars += 1;
  }

  const totalChecks = requirements.length;

  return {
    passed: compiled && allRequirements,
    compiled,
    goals,
    requirements,
    stars,
    lineCount,
    passedChecks,
    totalChecks,
    failures: requirements.filter((check) => !check.passed),
  };
}

export interface AnalyzeSourceResult extends CodeSignals {}

export function analyzeSource(source: string): CodeSignals {
  const cleanSource = stripPythonComments(source);
  const lines = cleanSource.split('\n');
  const assignedNames = Array.from(
    new Set(
      Array.from(cleanSource.matchAll(/^\s*([A-Za-z_]\w*)\s*=/gm)).map((match) => match[1]),
    ),
  ).slice(0, 12);
  const functionNames = Array.from(
    new Set(Array.from(cleanSource.matchAll(/^\s*def\s+([A-Za-z_]\w*)\s*\(/gm)).map((match) => match[1])),
  );
  const classNames = Array.from(
    new Set(Array.from(cleanSource.matchAll(/^\s*class\s+([A-Za-z_]\w*)\s*[:(]/gm)).map((match) => match[1])),
  );
  const forMatch = /^\s*for\s+([A-Za-z_]\w*)(?:\s*,\s*([A-Za-z_]\w*))?\s+in\s+(.+?)\s*:/m.exec(cleanSource);
  const hasRecursion = functionNames.some((name) => {
    const calls = cleanSource.match(new RegExp(`\\b${name}\\s*\\(`, 'g')) ?? [];
    return calls.length > 1;
  });

  const loopBodyLines: number[] = [];
  let loopIndent: number | null = null;
  lines.forEach((line, index) => {
    if (/^\s*(for|while)\b/.test(line)) {
      loopIndent = lineIndent(line).length;
      loopBodyLines.push(index + 1);
      return;
    }
    if (loopIndent !== null) {
      if (!line.trim()) return;
      if (lineIndent(line).length > loopIndent) {
        loopBodyLines.push(index + 1);
      } else {
        loopIndent = null;
      }
    }
  });

  return {
    hasLoop: /\b(for|while)\b/.test(cleanSource),
    hasWhile: /^\s*while\b/m.test(cleanSource),
    hasFor: /^\s*for\b/m.test(cleanSource),
    hasFunction: /^\s*def\s+/m.test(cleanSource),
    hasClass: /^\s*class\s+/m.test(cleanSource),
    hasComprehension: /\[[^\]]*\bfor\b[^\]]*\]|\{[^}]*\bfor\b[^}]*\}/.test(cleanSource),
    hasPrint: /\bprint\s*\(/.test(cleanSource),
    hasInput: /\binput\s*\(/.test(cleanSource),
    hasFString: /\b[fF]["']/.test(cleanSource),
    hasRecursion,
    hasList: /\[[^\]]*\]/.test(cleanSource),
    hasDict: /\{[^}]*:[^}]*\}/.test(cleanSource),
    hasTuple: /\([^)]*,[^)]*\)/.test(cleanSource),
    hasSet: /set\s*\(|\{[^}:]+\}/.test(cleanSource),
    hasReturn: /^\s*return\b/m.test(cleanSource),
    hasYield: /^\s*yield\b/m.test(cleanSource),
    forVariable: forMatch?.[1] ?? null,
    iterableExpression: forMatch?.[3] ?? null,
    functionNames,
    classNames,
    assignedNames,
    loopBodyLines,
  };
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function identifiers(source: string): string[] {
  return Array.from(new Set(Array.from(source.matchAll(/\b[A-Za-z_]\w*\b/g)).map((match) => match[0])));
}

export function suggestName(name: string, source: string, extra: string[] = []): string | null {
  const candidates = Array.from(
    new Set([
      ...identifiers(source),
      ...extra,
      ...BUILTINS,
    ]),
  ).filter(
    (candidate) =>
      candidate &&
      candidate !== name &&
      !PYTHON_KEYWORDS.has(candidate) &&
      !['self', 'cls', 'True', 'False', 'None', 'in', 'is', 'not', 'and', 'or'].includes(candidate),
  );

  let best: { name: string; distance: number } | null = null;
  const threshold = name.length <= 3 ? 1 : name.length <= 6 ? 2 : 3;
  for (const candidate of candidates) {
    const distance = levenshtein(name.toLowerCase(), candidate.toLowerCase());
    if (distance > threshold) continue;
    if (!best || distance < best.distance) {
      best = { name: candidate, distance };
    }
  }
  return best?.name ?? null;
}

interface FriendlyErrorOptions {
  source: string;
  knownNames?: string[];
}

export function translateRuntimeError(
  error: NonNullable<RunResult['error']>,
  options: FriendlyErrorOptions,
): FriendlyError {
  const { source, knownNames = [] } = options;
  const rawType = error.type || 'Error';
  const rawMessage = error.message || 'Something went wrong.';
  const line = error.line ?? null;
  const base = { line, rawType, rawMessage, timeout: error.timeout };

  if (error.timeout || rawType === 'TimeoutError' || rawType === 'OdysseyTimeout') {
    return {
      ...base,
      title: 'Emergency brake pulled',
      message:
        'Your program ran for too long. Python pulled the emergency brake before the toybox could catch fire.',
      hint: 'Look for a while loop where the condition never becomes false. Add a decrement, a break, or a real exit condition.',
      timeout: true,
    };
  }

  if (rawType === 'NameError') {
    const match = /name '([^']+)' is not defined/.exec(rawMessage);
    const missing = match?.[1] ?? 'that name';
    const suggestion = suggestName(missing, source, knownNames);
    return {
      ...base,
      title: 'That name is a ghost',
      message: suggestion
        ? `I looked everywhere for a toy chest called "${missing}". Did you mean "${suggestion}"?`
        : `I looked everywhere for a toy chest called "${missing}", but it does not exist yet.`,
      hint: suggestion
        ? `Check the spelling. "${suggestion}" already exists in this workshop; "${missing}" does not.`
        : 'Create the variable before using it, and check uppercase/lowercase letters.',
      suggestion: suggestion ?? undefined,
    };
  }

  if (rawType === 'IndexError') {
    const indexMatch = /(?:index|list index) (\d+)/.exec(rawMessage);
    return {
      ...base,
      title: 'That train car is missing',
      message: indexMatch
        ? `You tried to grab train car #${indexMatch[1]}, but that car is not on the train.`
        : 'You tried to grab a train car that is not on the train.',
      hint: 'List positions start at 0. Check the length with len(), and never grab index len(list).',
    };
  }

  if (rawType === 'KeyError') {
    const key = rawMessage.replace(/^['"]|['"]$/g, '');
    return {
      ...base,
      title: 'The vending machine says no',
      message: `The vending machine has no snack labelled ${rawMessage}. That key is not on the menu.`,
      hint: `Check the key name. Use .get("${key}", default) if the key might be absent.`,
    };
  }

  if (rawType === 'AttributeError') {
    return {
      ...base,
      title: 'That scroll has no such spell',
      message: `That value does not have the attribute or method you called. ${rawMessage}`,
      hint: 'Check the type and spelling. Strings have .upper(); lists have .append(). They are not interchangeable.',
    };
  }

  if (rawType === 'UnboundLocalError') {
    return {
      ...base,
      title: 'The local room is empty',
      message: 'A function is reading a local variable before it has a value.',
      hint: 'Assign the local before using it, or use nonlocal/global if you truly need to reach outward.',
    };
  }

  if (rawType === 'TypeError') {
    if (/can only concatenate str/.test(rawMessage) || /unsupported operand type/.test(rawMessage)) {
      return {
        ...base,
        title: 'Two different shapes cannot click together',
        message: `${rawMessage}. Python will not silently glue text to numbers.`,
        hint: 'Convert explicitly: str(number) or int(text). Match the types before adding.',
      };
    }
    if (/missing 1 required positional argument/.test(rawMessage) || /takes .* arguments/.test(rawMessage)) {
      return {
        ...base,
        title: 'A funnel received the wrong amount',
        message: `${rawMessage}. The machine expected a different number of arguments.`,
        hint: 'Count the parameters in def and the arguments in the call. self is passed automatically.',
      };
    }
    return {
      ...base,
      title: 'Those two shapes do not fit',
      message: rawMessage,
      hint: 'Read the involved types. Convert explicitly or call the right method.',
    };
  }

  if (rawType === 'ZeroDivisionError') {
    return {
      ...base,
      title: 'Divided by zero',
      message: 'You asked Python to slice a cake into zero pieces. The universe refuses.',
      hint: 'Guard the division with if divisor != 0:, or catch ZeroDivisionError.',
    };
  }

  if (rawType === 'IndentationError' || rawType === 'TabError') {
    return {
      ...base,
      title: 'The factory floor is misaligned',
      message: rawMessage,
      hint: 'Indented blocks need four spaces. Remove tabs, line up the body under its colon.',
    };
  }

  if (rawType === 'SyntaxError') {
    if (/expected ':'/.test(rawMessage)) {
      return {
        ...base,
        title: 'The gate has no hinge',
        message: 'A block line is missing its colon.',
        hint: 'Add : at the end of if, elif, else, for, while, def, class, try, except, finally, and with.',
      };
    }
    if (/unterminated string literal|EOL while scanning/.test(rawMessage)) {
      return {
        ...base,
        title: 'An open quote is leaking',
        message: 'A string begins but never ends.',
        hint: 'Add the matching quote. Use triple quotes for text that spans lines.',
      };
    }
    return {
      ...base,
      title: 'The syntax robot found a kink',
      message: rawMessage,
      hint: 'Check the marked line for a missing bracket, quote, colon, or comma.',
    };
  }

  if (rawType === 'RecursionError') {
    return {
      ...base,
      title: 'The call stack tower is full',
      message: 'The machine cloned itself too many times without reaching a base case.',
      hint: 'Add a base case that returns without calling the function again, and make each call smaller.',
    };
  }

  if (rawType === 'ModuleNotFoundError') {
    return {
      ...base,
      title: 'That module is not in the toybox',
      message: `${rawMessage}. The local workshop does not carry that import.`,
      hint: 'Use the Python standard library only. Network and system modules are disabled for safety.',
    };
  }

  if (rawType === 'FileNotFoundError') {
    return {
      ...base,
      title: 'The vault file is missing',
      message: rawMessage,
      hint: 'Write the file first with mode "w", then read it with "r" in a separate with block.',
    };
  }

  if (rawType === 'ValueError') {
    return {
      ...base,
      title: 'That value does not fit the shape',
      message: rawMessage,
      hint: 'Check the input. int("twelve") cannot become a number.',
    };
  }

  if (rawType === 'EngineError') {
    return {
      ...base,
      title: 'The Python core is rebuilding',
      message: rawMessage,
      hint: 'Give the engine a moment, then press Run again.',
    };
  }

  return {
    ...base,
    title: 'The machine hit a snag',
    message: rawMessage,
    hint: 'Read the highlighted line. The friendly linter above has the most likely fix.',
  };
}
