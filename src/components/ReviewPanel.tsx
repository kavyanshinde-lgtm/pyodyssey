import { useMemo, useState } from 'react';
import type { Lesson } from '../data/curriculum';
import type { SaveData } from '../storage/save';
import { computeWeakTopics, getDueLessons, toDateKey } from '../engine/spacedRepetition';
import { Icon } from './Icons';

interface ReviewPanelProps {
  allLessons: Lesson[];
  save: SaveData;
  onSelectLesson: (lessonId: string, scratchMode?: boolean) => void;
  onBackToCampaign: () => void;
}

export function ReviewPanel({
  allLessons,
  save,
  onSelectLesson,
  onBackToCampaign,
}: ReviewPanelProps) {
  const [tab, setTab] = useState<'due' | 'weak' | 'scratch'>('due');
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(now), [now]);

  const dueLessons = useMemo(() => getDueLessons(allLessons, save, now), [allLessons, save, now]);
  const weakTopics = useMemo(() => computeWeakTopics(allLessons, save, now), [allLessons, save, now]);

  const completedLessons = useMemo(() => {
    return allLessons.filter((l) => !l.isTrial && (save.lessons[l.id]?.bestStars ?? 0) > 0);
  }, [allLessons, save.lessons]);

  return (
    <div className="review-panel" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', color: 'var(--text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', letterSpacing: '1px', color: 'var(--cyan)' }}>
            SPACED REPETITION & WEAK TOPICS
          </span>
          <h1 style={{ margin: '4px 0 6px', fontSize: '24px', fontWeight: 700 }}>Learning Review Deck</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            Failed and hint-heavy problems re-enter the queue after 1, 3, 7, 14 days. Pass with zero hints to push review intervals out.
          </p>
        </div>
        <button
          type="button"
          className="editor-tool"
          onClick={onBackToCampaign}
          style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="arrow-right" size={14} /> BACK TO CAMPAIGN
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`editor-tool ${tab === 'due' ? 'active' : ''}`}
          onClick={() => setTab('due')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontFamily: 'var(--mono)',
            border: tab === 'due' ? '1px solid var(--yellow)' : '1px solid var(--line)',
            background: tab === 'due' ? 'color-mix(in srgb, var(--yellow) 15%, var(--panel))' : 'var(--panel)',
            color: tab === 'due' ? 'var(--yellow)' : 'var(--text)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="target" size={14} />
          DUE FOR REVIEW ({dueLessons.length})
        </button>

        <button
          type="button"
          className={`editor-tool ${tab === 'weak' ? 'active' : ''}`}
          onClick={() => setTab('weak')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontFamily: 'var(--mono)',
            border: tab === 'weak' ? '1px solid var(--pink)' : '1px solid var(--line)',
            background: tab === 'weak' ? 'color-mix(in srgb, var(--pink) 15%, var(--panel))' : 'var(--panel)',
            color: tab === 'weak' ? 'var(--pink)' : 'var(--text)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="bug" size={14} />
          WEAK TOPICS SUMMARY ({weakTopics.filter((w) => w.status !== 'solid').length})
        </button>

        <button
          type="button"
          className={`editor-tool ${tab === 'scratch' ? 'active' : ''}`}
          onClick={() => setTab('scratch')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontFamily: 'var(--mono)',
            border: tab === 'scratch' ? '1px solid var(--cyan)' : '1px solid var(--line)',
            background: tab === 'scratch' ? 'color-mix(in srgb, var(--cyan) 15%, var(--panel))' : 'var(--panel)',
            color: tab === 'scratch' ? 'var(--cyan)' : 'var(--text)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="bolt" size={14} />
          REWRITE FROM SCRATCH ({completedLessons.length})
        </button>
      </div>

      {tab === 'due' ? (
        <div>
          {dueLessons.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px' }}>
              <Icon name="check" size={32} />
              <h3 style={{ margin: '12px 0 6px', fontSize: '18px' }}>Queue is clean!</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                No problems are currently due for spaced review. Continue working in the Campaign or try "Rewrite from Scratch".
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {dueLessons.map((lesson) => {
                const progress = save.lessons[lesson.id];
                const interval = progress?.interval ?? 1;
                const nextDate = progress?.nextReviewDate ?? todayKey;
                return (
                  <div
                    key={lesson.id}
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid color-mix(in srgb, var(--yellow) 30%, var(--line))',
                      borderRadius: '6px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--yellow)' }}>
                          INTERVAL: {interval} DAY{interval === 1 ? '' : 'S'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                          DUE: {nextDate}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>{lesson.title}</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {lesson.prompt}
                      </p>
                      <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '12px' }}>
                        <span>Attempts: {progress?.attempts ?? 0}</span>
                        <span>Hints used: {progress?.hintsUsed ?? 0}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="editor-tool"
                        onClick={() => onSelectLesson(lesson.id, false)}
                        style={{ flex: 1, padding: '7px 10px', fontSize: '12px', textAlign: 'center' }}
                      >
                        PRACTICE
                      </button>
                      <button
                        type="button"
                        className="editor-tool active"
                        onClick={() => onSelectLesson(lesson.id, true)}
                        style={{ flex: 1, padding: '7px 10px', fontSize: '12px', textAlign: 'center' }}
                        title="Solve with blank editor and no hints"
                      >
                        REWRITE SCRATCH
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'weak' ? (
        <div>
          {weakTopics.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px' }}>
              <Icon name="check" size={32} />
              <h3 style={{ margin: '12px 0 6px', fontSize: '18px' }}>No weak topics recorded yet</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                Run exercises and complete lessons to automatically generate your strength and failure analysis.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weakTopics.map((item) => (
                <div
                  key={item.topic}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--mono)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background:
                            item.status === 'critical'
                              ? 'color-mix(in srgb, var(--pink) 20%, transparent)'
                              : item.status === 'needs-practice'
                              ? 'color-mix(in srgb, var(--yellow) 20%, transparent)'
                              : 'color-mix(in srgb, var(--green) 20%, transparent)',
                          color:
                            item.status === 'critical'
                              ? 'var(--pink)'
                              : item.status === 'needs-practice'
                              ? 'var(--yellow)'
                              : 'var(--green)',
                        }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '15px' }}>{item.topic}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>(Realm {item.realmId})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                      <span>Failure rate: <strong>{item.failureRate}%</strong></span>
                      <span>Total runs: {item.totalAttempts}</span>
                      <span>Hints consumed: {item.totalHintsUsed}</span>
                      <span>Due items: {item.dueCount}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="editor-tool"
                    onClick={() => {
                      const firstLesson = allLessons.find((l) => l.chip === item.topic || `Realm ${l.realmId}` === item.topic);
                      if (firstLesson) onSelectLesson(firstLesson.id, false);
                    }}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    TARGET PRACTICE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'scratch' ? (
        <div>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--muted)' }}>
            "Rewrite from scratch" clears your starter code and disables hints. Re-implement the solution from memory to solidify genuine mastery.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {completedLessons.map((lesson) => {
              const progress = save.lessons[lesson.id];
              return (
                <div
                  key={lesson.id}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>
                      {lesson.chip} · REALM {lesson.realmId}
                    </span>
                    <h4 style={{ margin: '4px 0 6px', fontSize: '14px' }}>{lesson.title}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', maxHeight: '36px', overflow: 'hidden' }}>
                      {lesson.prompt}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="editor-tool active"
                    onClick={() => onSelectLesson(lesson.id, true)}
                    style={{ padding: '6px 10px', fontSize: '12px', textAlign: 'center' }}
                  >
                    <Icon name="bolt" size={12} /> REWRITE FROM SCRATCH
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
