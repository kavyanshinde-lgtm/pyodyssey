import type { Lesson } from '../data/curriculum';
import type { ValidationReport } from '../engine/linter';
import { Icon, type IconName } from './Icons';
import { ModalShell } from './ModalShell';

export interface RewardData {
  lesson: Lesson;
  stars: number;
  xpGain: number;
  report: ValidationReport;
  previousBest: number;
  rankName: string;
  nextLesson: Lesson | null;
  hintsUsed: number;
  nextReviewDays: number;
}

interface RewardModalProps {
  reward: RewardData;
  onClose: () => void;
  onNext: () => void;
}

export function RewardModal({ reward, onClose, onNext }: RewardModalProps) {
  const { lesson, stars, report, previousBest, nextLesson, hintsUsed, nextReviewDays } = reward;
  const isTrial = Boolean(lesson.isTrial && lesson.trial);
  const improved = stars > previousBest;

  return (
    <ModalShell
      eyebrow={isTrial ? 'All three waves cleared' : 'Lesson complete'}
      title={isTrial ? 'Trial cleared' : 'Solved'}
      subtitle={
        isTrial
          ? `${lesson.trial?.badgeName} earned.`
          : 'All tests passed.'
      }
      onClose={onClose}
      className={`reward-modal ${isTrial ? 'trial-reward' : ''}`}
    >
      <div className="reward-arena">
        <div className="reward-stars">
          {[1, 2, 3].map((star) => (
            <span key={star} className={`reward-star star-${star} ${stars >= star ? 'earned' : ''}`} style={stars >= star ? { color: 'var(--spark)' } : {}}>
              <Icon name="star" size={star === 2 ? 64 : 46} filled={stars >= star} />
            </span>
          ))}
        </div>
        <div className="reward-badge">
          <span className="reward-icon">
            <Icon name={(isTrial ? lesson.trial?.badgeIcon : lesson.icon) as IconName} size={48} />
          </span>
        </div>
        <div className="reward-copy">
          <span className="reward-kicker">
            {isTrial
              ? `${lesson.trial?.badgeName} · Exam badge`
              : `Rating · ${stars} / 3 stars`}
          </span>
          <h3>{lesson.title}</h3>
          {improved && previousBest > 0 ? (
            <span className="reward-newbest">
              <Icon name="bolt" size={12} /> New personal best
            </span>
          ) : null}
        </div>
      </div>

      <div className="reward-stats">
        <div className="reward-stat">
          <span className="reward-stat-icon"><Icon name="check" size={18} /></span>
          <strong>{report.passedChecks} of {report.totalChecks}</strong>
          <span>Tests passed</span>
        </div>
        <div className="reward-stat">
          <span className="reward-stat-icon"><Icon name="hint" size={18} /></span>
          <strong>{hintsUsed}</strong>
          <span>Hints used</span>
        </div>
        <div className="reward-stat">
          <span className="reward-stat-icon"><Icon name="refresh" size={18} /></span>
          <strong>
            {nextReviewDays === 1 ? '1 day' : `${nextReviewDays} days`}
          </strong>
          <span>Next review</span>
        </div>
      </div>

      <div className="reward-actions">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          Stay here
        </button>
        {nextLesson ? (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            <span>Next: {nextLesson.title}</span>
            <Icon name="arrow-right" size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            <Icon name="crown" size={16} />
            <span>Finish realm</span>
          </button>
        )}
      </div>
    </ModalShell>
  );
}
