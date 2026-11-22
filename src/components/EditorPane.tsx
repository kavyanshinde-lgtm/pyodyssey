import { useState, useEffect } from 'react';
import type { Lesson } from '../data/curriculum';
import type { FriendlyError, LintIssue, ValidationReport } from '../engine/linter';
import type { RunResult, TraceFrame } from '../engine/types';
import type { PlaybackState } from './VisualStage';
import { CodeEditor } from './CodeEditor';
import { Icon } from './Icons';

interface EditorPaneProps {
  lesson: Lesson;
  code: string;
  onCodeChange: (value: string, meta: { newline: boolean; deleted: boolean }) => void;
  activeLine: number | null;
  lintIssues: LintIssue[];
  report: ValidationReport | null;
  run: RunResult | null;
  frames: TraceFrame[];
  frameIndex: number;
  friendlyError: FriendlyError | null;
  visibleOutput: string;
  playback: PlaybackState;
  engineStatus: 'booting' | 'ready' | 'error';
  engineMessage: string;
  mode: 'lesson' | 'sandbox';
  attempts: number;
  onRunTests: () => void;
  onRunWithoutTests: () => void;
  onReset: () => void;
  onOpenVisualize: () => void;
  onCaretChange?: (line: number, column: number) => void;
  hasChecked?: boolean;
}

export function EditorPane({
  lesson,
  code,
  onCodeChange,
  activeLine,
  lintIssues,
  report,
  run,
  frames,
  frameIndex,
  friendlyError,
  visibleOutput,
  playback,
  mode,
  onRunTests,
  onRunWithoutTests,
  onReset,
  onOpenVisualize,
  onCaretChange,
  hasChecked,
}: EditorPaneProps) {
  const [activeTab, setActiveTab] = useState<'tests' | 'output' | 'vars'>('tests');
  const [tickedCount, setTickedCount] = useState<number>(0);
  const isRunning = playback === 'running';

  const testResults = report?.testResults ?? [];
  const passingCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  const allPassed = report?.passed && totalCount > 0;

  // Memorable moment: 60ms staggered tick animation on passing all tests
  useEffect(() => {
    if (allPassed) {
      setTickedCount(0);
      const interval = setInterval(() => {
        setTickedCount((prev) => {
          if (prev >= totalCount) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 60);
      return () => clearInterval(interval);
    } else {
      setTickedCount(totalCount);
    }
  }, [allPassed, totalCount]);

  const currentFrame = frames.length ? frames[Math.min(frameIndex, frames.length - 1)] : null;
  const variables = Object.entries(currentFrame?.locals ?? {});
  const filename = mode === 'sandbox' ? 'sandbox.py' : `${lesson.id.replace('-', '_')}.py`;

  return (
    <div className="editor-column">
      {/* Code Editor Frame with full 1px orange border */}
      <div className="editor-frame">
        {/* Header bar (--surface-high) */}
        <div className="editor-header">
          <span className="editor-filename">{filename}</span>

          <div className="editor-actions">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={onReset}
              title="Reset code to starter"
            >
              Reset
            </button>

            <button
              type="button"
              className="btn btn-quiet"
              onClick={onOpenVisualize}
              title="Open execution stepper"
            >
              Visualize
            </button>

            <button
              type="button"
              className="btn btn-outlined"
              data-testid="run-only-button"
              onClick={onRunWithoutTests}
              disabled={isRunning}
              title="Run code without grading (Ctrl+Shift+Enter)"
            >
              Run only
            </button>

            <button
              type="button"
              className="btn btn-primary"
              data-testid="run-tests-button"
              onClick={onRunTests}
              disabled={isRunning}
              title="Run test suite (Ctrl+Enter)"
            >
              Run tests
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <CodeEditor
            value={code}
            onChange={onCodeChange}
            activeLine={activeLine}
            issues={lintIssues}
            hasChecked={hasChecked ?? Boolean(report !== null || run !== null)}
            onRun={onRunTests}
            onRunWithoutTests={onRunWithoutTests}
            onCaretChange={onCaretChange}
          />
        </div>
      </div>

      {/* Tests Panel under the editor */}
      <div className="tests-panel">
        <div className="tests-tabs-bar">
          <button
            type="button"
            className={`tests-tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
            data-testid="tests-tab-button"
            onClick={() => setActiveTab('tests')}
          >
            Tests {totalCount > 0 ? `${passingCount} of ${totalCount} passing` : ''}
          </button>

          <button
            type="button"
            className={`tests-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
            data-testid="output-tab-button"
            onClick={() => setActiveTab('output')}
          >
            Output
          </button>

          <button
            type="button"
            className={`tests-tab-btn ${activeTab === 'vars' ? 'active' : ''}`}
            data-testid="variables-tab-button"
            onClick={() => setActiveTab('vars')}
          >
            Variables ({variables.length})
          </button>
        </div>

        <div className="tests-body" data-testid="tests-panel-body">
          {activeTab === 'tests' && (
            <>
              {testResults.length > 0 ? (
                testResults.map((t, idx) => {
                  const isPassing = t.passed;
                  const isTicked = allPassed ? idx < tickedCount : isPassing;
                  const callText = t.description || (t.hidden ? `Hidden test ${idx + 1}` : t.inputDisplay || `test_${idx + 1}()`);
                  const expectedVal = t.expectedDisplay || (t.hidden ? '' : '');

                  if (isPassing) {
                    return (
                      <div key={t.id} className="test-row test-row-pass tick-transition" data-testid="test-result-row" data-status="passed">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="test-status-icon" style={{ color: isTicked ? 'var(--pass)' : 'var(--text-faint)' }}>
                            {isTicked ? '✓' : '○'}
                          </span>
                          <span>{callText}</span>
                        </div>
                        {expectedVal ? <span style={{ color: 'var(--text-muted)' }}>gives {expectedVal}</span> : null}
                      </div>
                    );
                  }

                  // Failing row sits in rose-tinted box
                  return (
                    <div key={t.id} className="test-row test-row-fail" data-testid="test-result-row" data-status="failed">
                      <div className="test-row-fail-head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="test-status-icon">✕</span>
                          <span>{t.hidden ? `Hidden test ${idx + 1}` : callText}</span>
                        </div>
                        {expectedVal ? <span style={{ color: 'var(--text-muted)' }}>expected {expectedVal}</span> : null}
                      </div>

                      {(t.error?.message || t.actualDisplay) && (
                        <div className="test-row-fail-hint">
                          {t.error ? t.error.message : `Received: ${t.actualDisplay}`}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
                  Press "Run tests" to evaluate your solution.
                </div>
              )}
            </>
          )}

          {activeTab === 'output' && (
            <div className="terminal-output">
              {visibleOutput || (run?.output ?? '') || (friendlyError ? (
                <div className="terminal-error-block">
                  <strong>{friendlyError.title}</strong>: {friendlyError.message}
                  {friendlyError.hint ? <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>{friendlyError.hint}</div> : null}
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>No standard output produced.</span>
              ))}
            </div>
          )}

          {activeTab === 'vars' && (
            <div style={{ overflowX: 'auto' }}>
              {variables.length > 0 ? (
                <table className="variables-table">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Type</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variables.map(([name, val]) => (
                      <tr key={name}>
                        <td className="var-name">{name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{val.type}</td>
                        <td className="var-val">{val.repr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
                  No local variables in current execution frame.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
