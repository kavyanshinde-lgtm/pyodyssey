import { useState, useEffect } from 'react';
import type { Lesson } from '../data/curriculum';
import type { ValidationReport } from '../engine/linter';
import { normalizeOutput } from '../engine/linter';
import { Icon } from './Icons';

interface ProblemPaneProps {
  lesson: Lesson;
  stats: { bestStars: number; attempts: number };
  scratchMode?: boolean;
  hintsUsed?: number;
  report: ValidationReport | null;
  onRecordHint?: (tier: number) => void;
  onMarkStudy?: () => void;
}

const SESSION_HINTS_KEY = 'pyodyssey_session_hints';

function getSessionHintTier(lessonId: string): number {
  try {
    const raw = sessionStorage.getItem(SESSION_HINTS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const tier = parsed[lessonId];
    return typeof tier === 'number' && tier >= 0 && tier <= 3 ? tier : 0;
  } catch {
    return 0;
  }
}

function setSessionHintTier(lessonId: string, tier: number): void {
  try {
    const raw = sessionStorage.getItem(SESSION_HINTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[lessonId] = tier;
    sessionStorage.setItem(SESSION_HINTS_KEY, JSON.stringify(parsed));
  } catch {}
}

interface ExampleData {
  call: string;
  result: string;
}

function getExample(lesson: Lesson): ExampleData | null {
  if (lesson.example) {
    return lesson.example;
  }

  // Derive function name from entrypoint or starter / solution signature
  const fnName =
    lesson.entrypoint ||
    /def\s+([A-Za-z0-9_]+)\s*\(/.exec(lesson.starter || lesson.solution || '')?.[1] ||
    /\b(?:function|call|write)\s+([A-Za-z0-9_]+)\s*\(/.exec(lesson.prompt || '')?.[1];

  const firstTest = lesson.tests?.find((t) => !t.hidden);

  if (fnName) {
    const args = firstTest?.args;
    const argsStr = args && args.length > 0 ? args.map((a: unknown) => JSON.stringify(a)).join(', ') : '';
    const call = `${fnName}(${argsStr})`;
    const rawResult =
      firstTest?.expected !== undefined
        ? JSON.stringify(firstTest.expected)
        : firstTest?.expectedOutput
        ? JSON.stringify(firstTest.expectedOutput)
        : JSON.stringify(lesson.expectedOutput);
    return { call, result: rawResult };
  }

  // If no function name, extract from prompt "Example: ... -> ..." or tests
  const promptMatch = /(?:Examples?:\s*)([^\n->]+)\s*->\s*([^\n.]+)/i.exec(lesson.prompt || '');
  if (promptMatch) {
    return {
      call: promptMatch[1].trim(),
      result: promptMatch[2].trim(),
    };
  }

  if (firstTest?.expectedOutput || lesson.expectedOutput) {
    const cleanOutput = (firstTest?.expectedOutput || lesson.expectedOutput).trim();
    return {
      call: 'print(...)',
      result: JSON.stringify(cleanOutput),
    };
  }

  return null;
}

function getStatementAndTask(lesson: Lesson): { statement: string; task: string | null } {
  if (lesson.statement) {
    return {
      statement: lesson.statement,
      task: lesson.task ?? null,
    };
  }

  const prompt = lesson.prompt || '';
  const withoutExamples = prompt.replace(/\bExamples?:\s*.*?(?:\.|$)/i, '').trim();
  const sentences = withoutExamples.split(/(?<=\.)\s+/).filter(Boolean);

  if (sentences.length <= 1) {
    return {
      statement: prompt,
      task: null,
    };
  }

  return {
    statement: sentences[0],
    task: sentences.slice(1).join(' '),
  };
}

export function ProblemPane({
  lesson,
  stats,
  scratchMode = false,
  report,
  onRecordHint,
  onMarkStudy,
}: ProblemPaneProps) {
  const [revealedTier, setRevealedTier] = useState<number>(() => getSessionHintTier(lesson.id));
  const [showPredict, setShowPredict] = useState(false);
  const [predictAnswer, setPredictAnswer] = useState('');
  const [predictFeedback, setPredictFeedback] = useState<'idle' | 'wrong' | 'right'>('idle');

  useEffect(() => {
    setRevealedTier(getSessionHintTier(lesson.id));
    setShowPredict(false);
    setPredictAnswer('');
    setPredictFeedback('idle');
  }, [lesson.id]);

  const pq = lesson.predictQuestion;
  const isSolved = (stats.bestStars ?? 0) > 0 || (report?.passed ?? false);

  const hints = [
    lesson.tieredHints?.concept ?? lesson.toybox?.[0] ?? '',
    lesson.tieredHints?.approach ?? lesson.hint ?? '',
    lesson.tieredHints?.skeleton ?? lesson.starter ?? '',
  ].filter(Boolean);

  const totalHints = hints.length || 3;
  const currentHint = revealedTier > 0 ? hints[revealedTier - 1] ?? '' : '';

  const handleShowHint = () => {
    if (revealedTier < totalHints) {
      const nextTier = revealedTier + 1;
      setRevealedTier(nextTier);
      setSessionHintTier(lesson.id, nextTier);
      onRecordHint?.(nextTier);
    }
  };

  const handleCheckPredict = (candidate?: string) => {
    const val = candidate !== undefined ? candidate : predictAnswer;
    if (!val.trim()) return;
    const expected = pq ? normalizeOutput(pq.answer) : normalizeOutput(lesson.expectedOutput);
    if (normalizeOutput(val) === expected) {
      setPredictFeedback('right');
      onMarkStudy?.();
    } else {
      setPredictFeedback('wrong');
    }
  };

  const difficultyLabel =
    lesson.difficulty <= 1 ? 'Easy' : lesson.difficulty <= 3 ? 'Medium' : 'Hard';

  const example = getExample(lesson);
  const { statement, task } = getStatementAndTask(lesson);

  return (
    <div className="problem-pane">
      <div className="problem-header">
        <div className="problem-title-row">
          <h1 className="problem-title">{lesson.title}</h1>
          {isSolved ? (
            <span className="problem-solved-badge">
              <Icon name="check" size={13} />
              Solved
            </span>
          ) : null}
        </div>

        <div className="problem-meta-pills">
          <span className="pill">{lesson.chip || 'Python'}</span>
          <span className="pill">{difficultyLabel}</span>
          <span className="pill">{lesson.minutes || 5} min</span>
          {scratchMode ? (
            <span className="pill" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              Scratch
            </span>
          ) : null}
        </div>
      </div>

      {/* Predict Step (Skippable) */}
      {pq && !showPredict && (
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn-outlined"
            onClick={() => setShowPredict(true)}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            <span>Predict output check (optional)</span>
          </button>
        </div>
      )}

      {pq && showPredict && (
        <div
          style={{
            background: 'var(--surface-high)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Predict the output
            </span>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setShowPredict(false)}
              style={{ fontSize: '12px' }}
            >
              Skip
            </button>
          </div>

          <pre
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '13px',
              margin: '0 0 10px 0',
            }}
          >
            <code>{pq.codeSnippet}</code>
          </pre>

          <p style={{ fontSize: '13px', marginBottom: '8px' }}>{pq.question}</p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={predictAnswer}
              onChange={(e) => setPredictAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckPredict()}
              placeholder="Expected terminal output..."
              style={{
                flex: 1,
                padding: '6px 10px',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-btn)',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              }}
            />
            <button
              type="button"
              className="btn btn-outlined"
              onClick={() => handleCheckPredict()}
            >
              Check
            </button>
          </div>

          {predictFeedback === 'right' ? (
            <p style={{ marginTop: '8px', color: 'var(--pass)', fontSize: '13px' }}>
              Correct prediction.
            </p>
          ) : predictFeedback === 'wrong' ? (
            <p style={{ marginTop: '8px', color: 'var(--fail)', fontSize: '13px' }}>
              Output does not match. Try tracing again.
            </p>
          ) : null}
        </div>
      )}

      {/* 1. Short statement sentence */}
      <p className="problem-statement">{statement}</p>

      {/* 2. Example Box (call and result only) */}
      {example ? (
        <div className="example-box">
          <div className="example-box-header">Example</div>
          <code>{example.call}</code>
          <div className="example-expected">
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="example-arrow-svg"
            >
              <path d="M3 4v6a2 2 0 0 0 2 2h7M9 9l3 3-3 3" />
            </svg>
            <span className="example-result">{example.result}</span>
          </div>
        </div>
      ) : null}

      {/* 3. One task line */}
      {task ? <p className="problem-task">{task}</p> : null}

      {/* Bottom Hint Footer */}
      <div className="hint-footer">
        <div className="hint-footer-bar">
          <span className="hint-status-text">
            {revealedTier === 0
              ? `Hint 1 of ${totalHints} available`
              : `Hint ${revealedTier} of ${totalHints}`}
          </span>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={handleShowHint}
            disabled={revealedTier >= totalHints}
          >
            {revealedTier === 0
              ? 'Show hint'
              : revealedTier >= totalHints
              ? 'All hints shown'
              : 'Show next hint'}
          </button>
        </div>

        {currentHint ? <div className="hint-box">{currentHint}</div> : null}
      </div>
    </div>
  );
}
