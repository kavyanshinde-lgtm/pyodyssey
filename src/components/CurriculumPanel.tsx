import { useEffect, useRef } from 'react';
import type { Lesson, Realm } from '../data/curriculum';
import { REALMS, TOTAL_LESSONS } from '../data/curriculum';
import type { SaveData } from '../storage/save';
import { Icon } from './Icons';

export type BrainMode = 'toybox' | 'hood';

export interface CurriculumPanelProps {
  lesson: Lesson;
  realm: Realm;
  save: SaveData;
  onSelectLesson: (id: string) => void;
  onSelectRealm: (realmId: number) => void;
  onClose: () => void;
}

export function CurriculumPanel({
  lesson,
  realm,
  save,
  onSelectLesson,
  onSelectRealm,
  onClose,
}: CurriculumPanelProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const realmLessons = realm.lessons;
  const completedInRealm = realmLessons.filter((entry) => (save.lessons[entry.id]?.bestStars ?? 0) > 0).length;

  const totalCompleted = Object.values(save.lessons).filter((entry) => (entry?.bestStars ?? 0) > 0).length;
  const overallPercent = Math.min(100, Math.round((totalCompleted / TOTAL_LESSONS) * 100));

  // Focus trapping inside drawer
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableElements = drawer.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    drawer.addEventListener('keydown', handleKeyDown);
    return () => drawer.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="curriculum-drawer-content" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Curriculum">
      {/* Top Header */}
      <div className="curriculum-header">
        <div className="curriculum-header-top">
          <h2 className="curriculum-title">Curriculum</h2>
          <button
            type="button"
            className="btn btn-quiet curriculum-close-btn"
            onClick={onClose}
            aria-label="Close curriculum drawer"
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="curriculum-progress-summary">
          <div className="curriculum-progress-meta">
            <span>Overall progress</span>
            <span>
              {totalCompleted} of {TOTAL_LESSONS} done
            </span>
          </div>
          <div className="curriculum-overall-track">
            <div className="curriculum-overall-fill" style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Realm Selector: 8 Numbered Buttons */}
      <div className="realm-selector" role="tablist" aria-label="Select realm">
        {REALMS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === realm.id}
            className={`realm-btn ${item.id === realm.id ? 'active' : ''}`}
            onClick={() => onSelectRealm(item.id)}
            title={`Realm ${item.id}: ${item.name}`}
          >
            {item.id}
          </button>
        ))}
      </div>

      {/* Selected Realm Summary */}
      <div className="realm-summary">
        <div className="realm-summary-header">
          <h3 className="realm-summary-title">{realm.name}</h3>
          <span className="realm-summary-done">
            {completedInRealm} of {realmLessons.length} done
          </span>
        </div>
        <p className="realm-summary-desc">{realm.tagline}</p>
      </div>

      {/* Lesson List */}
      <div className="lesson-list" role="list">
        {realm.lessons.map((entry, index) => {
          const progress = save.lessons[entry.id];
          const stars = progress?.bestStars ?? 0;
          const isDone = stars > 0;
          const isActive = entry.id === lesson.id;
          const prevLesson = index > 0 ? realm.lessons[index - 1] : null;
          const isPrevDone = prevLesson ? (save.lessons[prevLesson.id]?.bestStars ?? 0) > 0 : true;
          const isUnlocked = index === 0 || isPrevDone || isDone;

          const isExam = Boolean(entry.isTrial);
          const isProject =
            !isExam &&
            Boolean(
              entry.isProject ||
                entry.exerciseType === 'project' ||
                entry.chip?.toLowerCase().includes('project') ||
                entry.title.toLowerCase().startsWith('mini-project'),
            );

          const displayTitle = entry.title
            .replace(/\bMINI-PROJECT\b/gi, 'Mini-project')
            .replace(/\bULTIMATE TRIAL\b/gi, 'Ultimate trial');

          const rawChip = entry.chip || (isExam ? 'Ultimate trial' : isProject ? 'Mini-project' : 'Python');
          const displayChip =
            rawChip.toUpperCase() === 'MINI-PROJECT'
              ? 'Mini-project'
              : rawChip.toUpperCase() === 'ULTIMATE TRIAL'
              ? 'Ultimate trial'
              : rawChip;

          return (
            <button
              key={entry.id}
              type="button"
              className={`lesson-item ${isActive ? 'active' : ''}`}
              data-testid={`lesson-${entry.id}`}
              onClick={() => {
                onSelectLesson(entry.id);
                onClose();
              }}
              aria-current={isActive ? 'true' : undefined}
            >
              {/* Status Icon */}
              <div className="lesson-status-icon" aria-hidden="true">
                {isDone ? (
                  <span className="lesson-icon-done">
                    <Icon name="check" size={13} />
                  </span>
                ) : isUnlocked ? (
                  <svg className="lesson-icon-available" width="14" height="14" viewBox="0 0 14 14">
                    <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  <span className="lesson-icon-locked">
                    <Icon name="lock" size={12} />
                  </span>
                )}
              </div>

              {/* Lesson Text */}
              <div className="lesson-item-main">
                <div className="lesson-item-top">
                  <span className="lesson-item-title">{displayTitle}</span>
                  {isExam ? (
                    <span className="lesson-badge">Exam</span>
                  ) : isProject ? (
                    <span className="lesson-badge">Project</span>
                  ) : null}
                </div>

                <div className="lesson-item-meta">
                  <span className="lesson-item-topic">{displayChip}</span>
                  <span className="lesson-item-sep">·</span>
                  <span className="lesson-item-time">{entry.minutes || 5} min</span>
                </div>
              </div>

              {/* Earned Stars */}
              <div className="lesson-item-stars" aria-label={`${stars} stars earned`}>
                {stars > 0
                  ? Array.from({ length: Math.min(3, stars) }).map((_, i) => (
                      <span key={i} className="star-filled">
                        ★
                      </span>
                    ))
                  : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
