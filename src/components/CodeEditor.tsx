import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import type { LintIssue } from '../engine/linter';

const KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
  'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  'match', 'case', 'self',
]);

const CONSTANTS = new Set(['True', 'False', 'None']);

const BUILTINS = new Set([
  'print', 'input', 'len', 'range', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple',
  'sum', 'min', 'max', 'abs', 'round', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter',
  'type', 'isinstance', 'open', 'super', 'property', 'staticmethod', 'classmethod', 'repr', 'hash',
  'iter', 'next', 'any', 'all', 'dir', 'id', 'format', 'chr', 'ord', 'pow', 'divmod', 'callable',
]);

interface Token {
  text: string;
  kind:
    | 'plain'
    | 'keyword'
    | 'constant'
    | 'string'
    | 'number'
    | 'comment'
    | 'builtin'
    | 'function'
    | 'classname'
    | 'operator'
    | 'decorator'
    | 'self';
}

function isIdentifierStart(char: string) {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string) {
  return /[A-Za-z0-9_]/.test(char);
}

function isPrefixStart(text: string, index: number) {
  if (index > 0 && isIdentifierPart(text[index - 1])) return false;
  const char = text[index].toLowerCase();
  if (!'fbru'.includes(char)) return false;
  let cursor = index + 1;
  while (cursor < text.length && 'fbru'.includes(text[cursor].toLowerCase()) && cursor - index < 3) {
    cursor += 1;
  }
  return text[cursor] === '"' || text[cursor] === "'";
}

function readString(text: string, start: number): number {
  let cursor = start;
  while (cursor < text.length && /[fFrRbBuU]/.test(text[cursor]) && !['"', "'"].includes(text[cursor])) {
    cursor += 1;
  }
  const quote = text[cursor];
  if (quote !== '"' && quote !== "'") return start + 1;
  const triple = text.slice(cursor, cursor + 3) === quote.repeat(3);
  if (triple) {
    const closer = quote.repeat(3);
    let end = text.indexOf(closer, cursor + 3);
    while (end !== -1 && text[end - 1] === '\\') {
      end = text.indexOf(closer, end + 3);
    }
    return end === -1 ? text.length : end + 3;
  }
  let end = cursor + 1;
  let escaped = false;
  while (end < text.length) {
    const char = text[end];
    if (escaped) {
      escaped = false;
      end += 1;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      end += 1;
      continue;
    }
    if (char === quote) return end + 1;
    if (char === '\n') return end;
    end += 1;
  }
  return end;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let expectName: 'function' | 'class' | null = null;
  let plain = '';

  const flushPlain = () => {
    if (plain) {
      tokens.push({ text: plain, kind: 'plain' });
      plain = '';
    }
  };

  const push = (value: string, kind: Token['kind']) => {
    flushPlain();
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind && kind !== 'decorator') {
      last.text += value;
    } else {
      tokens.push({ text: value, kind });
    }
  };

  while (cursor < text.length) {
    const char = text[cursor];

    if (char === '#') {
      const end = text.indexOf('\n', cursor);
      const comment = end === -1 ? text.slice(cursor) : text.slice(cursor, end);
      push(comment, 'comment');
      cursor += comment.length;
      continue;
    }

    if (isPrefixStart(text, cursor)) {
      const end = readString(text, cursor);
      push(text.slice(cursor, end), 'string');
      cursor = end;
      expectName = null;
      continue;
    }

    if (char === '"' || char === "'") {
      const end = readString(text, cursor);
      push(text.slice(cursor, end), 'string');
      cursor = end;
      expectName = null;
      continue;
    }

    if (char === '@' && isIdentifierStart(text[cursor + 1] ?? '')) {
      let end = cursor + 1;
      while (end < text.length && /[A-Za-z0-9_.]/.test(text[end])) end += 1;
      push(text.slice(cursor, end), 'decorator');
      cursor = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = cursor;
      while (end < text.length && isIdentifierPart(text[end])) end += 1;
      const word = text.slice(cursor, end);
      if (expectName === 'function') {
        push(word, 'function');
        expectName = null;
      } else if (expectName === 'class') {
        push(word, 'classname');
        expectName = null;
      } else if (CONSTANTS.has(word)) {
        push(word, 'constant');
      } else if (word === 'self' || word === 'cls') {
        push(word, 'self');
      } else if (KEYWORDS.has(word)) {
        push(word, 'keyword');
        if (word === 'def') expectName = 'function';
        if (word === 'class') expectName = 'class';
      } else if (BUILTINS.has(word)) {
        push(word, 'builtin');
      } else {
        push(word, 'plain');
      }
      cursor = end;
      continue;
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(text[cursor + 1] ?? ''))) {
      let end = cursor;
      while (end < text.length && /[0-9a-fA-FxXoObB._jJ]/.test(text[end])) end += 1;
      push(text.slice(cursor, end), 'number');
      cursor = end;
      continue;
    }

    if ('+-*/%=<>!&|^~:'.includes(char)) {
      let end = cursor + 1;
      while (end < text.length && '+-*/%=<>!&|^~:'.includes(text[end])) end += 1;
      push(text.slice(cursor, end), 'operator');
      cursor = end;
      continue;
    }

    plain += char;
    cursor += 1;
    if (!/\s/.test(char)) {
      expectName = null;
    }
  }
  flushPlain();
  return tokens;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string, meta: { newline: boolean; deleted: boolean }) => void;
  activeLine: number | null;
  issues: LintIssue[];
  hasChecked?: boolean;
  onCaretChange?: (line: number, column: number) => void;
  onRun?: () => void;
  onRunWithoutTests?: () => void;
  onStep?: () => void;
  readOnly?: boolean;
}

const LINE_HEIGHT = 25.5;

export function CodeEditor({
  value,
  onChange,
  activeLine,
  issues,
  hasChecked = false,
  onCaretChange,
  onRun,
  onRunWithoutTests,
  onStep,
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [caretLine, setCaretLine] = useState(1);
  const [caretColumn, setCaretColumn] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [focused, setFocused] = useState(false);

  const lines = useMemo(() => value.split('\n'), [value]);
  const tokens = useMemo(() => tokenize(value), [value]);
  const highlightLine = activeLine && activeLine > 0 ? activeLine : caretLine;
  const issueByLine = useMemo(() => {
    const map = new Map<number, LintIssue>();
    for (const issue of issues) {
      const current = map.get(issue.line);
      if (!current || (current.severity !== 'error' && issue.severity === 'error')) {
        map.set(issue.line, issue);
      }
    }
    return map;
  }, [issues]);

  const syncCaret = useCallback(
    (target: HTMLTextAreaElement) => {
      const before = target.value.slice(0, target.selectionStart);
      const parts = before.split('\n');
      const line = parts.length;
      const column = (parts[parts.length - 1]?.length ?? 0) + 1;
      setCaretLine(line);
      setCaretColumn(column);
      onCaretChange?.(line, column);
    },
    [onCaretChange],
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    const deleted = next.length < value.length;
    const newline = next.length > value.length && next.split('\n').length > value.split('\n').length;
    onChange(next, { newline, deleted });
    syncCaret(event.target);
  };

  const setCaret = (position: number) => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(position, position);
      syncCaret(textarea);
    });
  };

  const applyEdit = (nextValue: string, caret: number, newline = false) => {
    onChange(nextValue, { newline, deleted: false });
    setCaret(caret);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) onStep?.();
      else onRun?.();
      return;
    }

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const currentLine = value.slice(lineStart, value.indexOf('\n', lineStart) === -1 ? value.length : value.indexOf('\n', lineStart));
        const removable = /^ {1,4}/.exec(currentLine)?.[0].length ?? 0;
        if (removable > 0) {
          const next = value.slice(0, lineStart) + value.slice(lineStart + removable);
          applyEdit(next, Math.max(lineStart, start - removable));
        }
        return;
      }
      if (start !== end) {
        const selected = value.slice(start, end);
        if (selected.includes('\n')) {
          const next = selected
            .split('\n')
            .map((line) => `    ${line}`)
            .join('\n');
          applyEdit(value.slice(0, start) + next + value.slice(end), start + next.length);
        } else {
          applyEdit(value.slice(0, start) + '    ' + value.slice(end), start + 4);
        }
        return;
      }
      applyEdit(value.slice(0, start) + '    ' + value.slice(end), start + 4);
      return;
    }

    if (event.key === 'Enter') {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        if (event.shiftKey) {
          if (onRunWithoutTests) onRunWithoutTests();
          else onStep?.();
        } else {
          onRun?.();
        }
        textareaRef.current?.focus();
        return;
      }
      event.preventDefault();
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.slice(lineStart, start);
      const indent = /^[ \t]*/.exec(currentLine)?.[0] ?? '';
      const extra = /:\s*(?:#.*)?$/.test(currentLine) ? '    ' : '';
      const insertion = `\n${indent}${extra}`;
      const next = value.slice(0, start) + insertion + value.slice(end);
      applyEdit(next, start + insertion.length, true);
      return;
    }

    if (event.key === 'Backspace' && start === end) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const prefix = value.slice(lineStart, start);
      if (prefix.length > 0 && /^ +$/.test(prefix)) {
        event.preventDefault();
        const remove = Math.min(4, prefix.length);
        applyEdit(value.slice(0, start - remove) + value.slice(end), start - remove);
        return;
      }
    }

    if ((event.key === '"' || event.key === "'" || event.key === '(' || event.key === '[' || event.key === '{') && start === end) {
      const pairs: Record<string, string> = { '"': '"', "'": "'", '(': ')', '[': ']', '{': '}' };
      const closer = pairs[event.key];
      if (!closer) return;
      const nextChar = value[start] ?? '';
      if ((event.key === '"' || event.key === "'") && nextChar === closer) {
        event.preventDefault();
        applyEdit(value.slice(0, start) + closer + value.slice(start + 1), start + 1);
        return;
      }
      const beforeChar = value[start - 1] ?? '';
      const afterChar = value[start] ?? '';
      const shouldPair =
        event.key === '(' || event.key === '[' || event.key === '{'
          ? true
          : !/[A-Za-z0-9_]/.test(beforeChar) && !/[A-Za-z0-9_]/.test(afterChar);
      if (shouldPair) {
        event.preventDefault();
        const next = value.slice(0, start) + event.key + closer + value.slice(end);
        applyEdit(next, start + 1);
        return;
      }
    }
  };

  const handleScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
    setScrollLeft(event.currentTarget.scrollLeft);
  };

  useEffect(() => {
    if (!activeLine || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const top = (activeLine - 1) * LINE_HEIGHT;
    const viewTop = textarea.scrollTop;
    const viewBottom = viewTop + textarea.clientHeight;
    if (top < viewTop + 30 || top > viewBottom - 48) {
      textarea.scrollTo({ top: Math.max(0, top - textarea.clientHeight / 2), behavior: 'smooth' });
    }
  }, [activeLine]);

  const activeIssue = issueByLine.get(highlightLine);

  return (
    <div className={`code-editor ${focused ? 'is-focused' : ''} ${readOnly ? 'is-readonly' : ''}`}>
      <div className="editor-scroll">
        {/* Layer (a): Current-line highlight (z-index: 1, behind all text) */}
        <div
          className={`editor-active-line ${activeIssue ? 'has-issue' : ''}`}
          style={{
            top: (highlightLine - 1) * LINE_HEIGHT + 16,
            transform: `translateY(${-scrollTop}px)`,
          }}
        />

        {/* Layer (b): Syntax-highlighted text (z-index: 2, above highlight) */}
        <div
          className="editor-canvas"
          style={{ transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }}
        >
          <pre className="editor-highlight" aria-hidden="true">
            {tokens.map((token, index) => (
              <span key={index} className={`tok tok-${token.kind}`}>
                {token.text}
              </span>
            ))}
            {value.endsWith('\n') ? '\n ' : ''}
          </pre>
        </div>

        {/* Layer (c): Gutter (z-index: 3) */}
        <div className="editor-gutter" style={{ transform: `translateY(${-scrollTop}px)` }}>
          {lines.map((_, index) => {
            const issue = issueByLine.get(index + 1);
            return (
              <div key={index} className={`gutter-line ${issue ? `has-${issue.severity}` : ''}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {issue ? (
                  <button
                    type="button"
                    className={`gutter-marker ${issue.severity}`}
                    title={`${issue.title}: ${issue.message}`}
                    aria-label={`Line ${index + 1}: ${issue.title}`}
                    onClick={() => {
                      const textarea = textareaRef.current;
                      if (!textarea) return;
                      const offset = lines.slice(0, index).join('\n').length + (index > 0 ? 1 : 0);
                      textarea.focus();
                      textarea.setSelectionRange(offset, offset);
                    }}
                  >
                    !
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Layer (d): Transparent textarea over highlighter (z-index: 4) */}
        <textarea
          ref={textareaRef}
          className="editor-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onSelect={(event) => syncCaret(event.currentTarget)}
          onClick={(event) => syncCaret(event.currentTarget)}
          onKeyUp={(event) => syncCaret(event.currentTarget)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          readOnly={readOnly}
          aria-label="Python code editor"
        />
        {!value.trim() ? (
          <div className="editor-placeholder">
            <span className="prompt-mark">›</span> type your first Python spell...
            <span className="editor-caret-hint" />
          </div>
        ) : null}
      </div>

      {/* Status Bar: Sentence case, 12px, --text-muted */}
      <div className="editor-statusbar">
        <div className="editor-status-left">
          <span className="status-dot" />
          <span>Python 3.12</span>
          <span className="status-sep">/</span>
          <span>
            Line {caretLine}, column {caretColumn}
          </span>
        </div>
        <div className="editor-status-right">
          {issues.some((issue) => issue.severity === 'error') ? (
            <span className="lint-count has-errors">
              {issues.filter((issue) => issue.severity === 'error').length} issue
              {issues.filter((issue) => issue.severity === 'error').length === 1 ? '' : 's'}
            </span>
          ) : hasChecked ? (
            <span className="lint-count">No issues</span>
          ) : (
            <span className="lint-count">Not checked yet</span>
          )}
          <span className="status-sep">/</span>
          <span>{value.length} characters</span>
        </div>
      </div>
    </div>
  );
}
