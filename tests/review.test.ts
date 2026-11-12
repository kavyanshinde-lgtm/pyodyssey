import { describe, expect, it } from 'vitest';
import {
  calculateNextReview,
  computeWeakTopics,
  getDueLessons,
  isLessonDue,
  toDateKey,
  REVIEW_INTERVALS,
} from '../src/engine/spacedRepetition';
import { defaultSave, migrateSave, type LessonProgress } from '../src/storage/save';
import type { Lesson } from '../src/data/curriculum';

describe('Phase 3 Spaced Repetition & Review System', () => {
  it('interval ladder matches the pedagogy standard: 1, 3, 7, 14, 30 days', () => {
    expect(REVIEW_INTERVALS).toEqual([1, 3, 7, 14, 30]);
  });

  it('passing with zero hints advances intervals through the ladder', () => {
    const today = new Date('2026-03-01T10:00:00.000Z');

    // First successful completion (0 hints) -> interval: 1
    const r1 = calculateNextReview(undefined, true, 0, today);
    expect(r1.interval).toBe(1);
    expect(r1.repetitions).toBe(1);
    expect(r1.nextReviewDate).toBe('2026-03-02');
    expect(r1.lastReviewedDate).toBe('2026-03-01');

    // Second successful completion (0 hints) -> interval: 3
    const progress1: LessonProgress = {
      stars: 3,
      bestStars: 3,
      code: 'def f(): pass',
      completedAt: today.toISOString(),
      attempts: 1,
      bestLines: 1,
      hintsUsed: 0,
      interval: r1.interval,
      repetitions: r1.repetitions,
    };
    const day2 = new Date('2026-03-02T10:00:00.000Z');
    const r2 = calculateNextReview(progress1, true, 0, day2);
    expect(r2.interval).toBe(3);
    expect(r2.repetitions).toBe(2);
    expect(r2.nextReviewDate).toBe('2026-03-05');

    // Third successful completion (0 hints) -> interval: 7
    const progress2: LessonProgress = { ...progress1, interval: r2.interval, repetitions: r2.repetitions };
    const day5 = new Date('2026-03-05T10:00:00.000Z');
    const r3 = calculateNextReview(progress2, true, 0, day5);
    expect(r3.interval).toBe(7);
    expect(r3.repetitions).toBe(3);
    expect(r3.nextReviewDate).toBe('2026-03-12');

    // Fourth -> interval: 14
    const progress3: LessonProgress = { ...progress1, interval: r3.interval, repetitions: r3.repetitions };
    const day12 = new Date('2026-03-12T10:00:00.000Z');
    const r4 = calculateNextReview(progress3, true, 0, day12);
    expect(r4.interval).toBe(14);
    expect(r4.repetitions).toBe(4);
    expect(r4.nextReviewDate).toBe('2026-03-26');

    // Fifth -> interval: 30
    const progress4: LessonProgress = { ...progress1, interval: r4.interval, repetitions: r4.repetitions };
    const day26 = new Date('2026-03-26T10:00:00.000Z');
    const r5 = calculateNextReview(progress4, true, 0, day26);
    expect(r5.interval).toBe(30);
    expect(r5.repetitions).toBe(5);
    expect(r5.nextReviewDate).toBe('2026-04-25');
  });

  it('passing with hints does NOT advance interval ladder, resets interval to 1 day', () => {
    const today = new Date('2026-03-01T10:00:00.000Z');
    const progress: LessonProgress = {
      stars: 3,
      bestStars: 3,
      code: 'def f(): pass',
      completedAt: today.toISOString(),
      attempts: 4,
      bestLines: 1,
      hintsUsed: 2, // Used approach hint
      interval: 7,
      repetitions: 3,
    };

    const next = calculateNextReview(progress, true, 2, today);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(0);
    expect(next.nextReviewDate).toBe('2026-03-02');
  });

  it('failing a run resets interval to 1 day and repetitions to 0', () => {
    const today = new Date('2026-03-01T10:00:00.000Z');
    const progress: LessonProgress = {
      stars: 3,
      bestStars: 3,
      code: 'def f(): pass',
      completedAt: today.toISOString(),
      attempts: 5,
      bestLines: 1,
      hintsUsed: 0,
      interval: 14,
      repetitions: 4,
    };

    const next = calculateNextReview(progress, false, 0, today);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(0);
    expect(next.nextReviewDate).toBe('2026-03-02');
  });

  it('identifies lessons due for review accurately', () => {
    const today = new Date('2026-03-10T12:00:00.000Z');

    // Never reviewed / no nextReviewDate -> due
    expect(isLessonDue(undefined, today)).toBe(true);

    // Reviewed, due yesterday or today -> due
    expect(isLessonDue({
      stars: 3,
      bestStars: 3,
      code: '',
      completedAt: '',
      attempts: 1,
      bestLines: 1,
      nextReviewDate: '2026-03-09',
    }, today)).toBe(true);

    expect(isLessonDue({
      stars: 3,
      bestStars: 3,
      code: '',
      completedAt: '',
      attempts: 1,
      bestLines: 1,
      nextReviewDate: '2026-03-10',
    }, today)).toBe(true);

    // Reviewed, due in future -> NOT due
    expect(isLessonDue({
      stars: 3,
      bestStars: 3,
      code: '',
      completedAt: '',
      attempts: 1,
      bestLines: 1,
      nextReviewDate: '2026-03-15',
    }, today)).toBe(false);
  });

  it('getDueLessons filters only completed non-trial lessons that are due', () => {
    const today = new Date('2026-03-10T12:00:00.000Z');
    const mockLessons = [
      { id: 'l1', isTrial: false, title: 'L1', realmId: 1 } as unknown as Lesson,
      { id: 'l2', isTrial: false, title: 'L2', realmId: 1 } as unknown as Lesson,
      { id: 'l3', isTrial: false, title: 'L3', realmId: 1 } as unknown as Lesson,
      { id: 'trial', isTrial: true, title: 'Trial', realmId: 1 } as unknown as Lesson,
    ];

    const save = defaultSave();
    // l1 completed, due today
    save.lessons['l1'] = {
      stars: 3,
      bestStars: 3,
      code: '',
      completedAt: '',
      attempts: 1,
      bestLines: 1,
      nextReviewDate: '2026-03-10',
    };
    // l2 completed, due future
    save.lessons['l2'] = {
      stars: 3,
      bestStars: 3,
      code: '',
      completedAt: '',
      attempts: 1,
      bestLines: 1,
      nextReviewDate: '2026-03-20',
    };
    // l3 not completed (bestStars 0)
    save.lessons['l3'] = {
      stars: 0,
      bestStars: 0,
      code: '',
      completedAt: '',
      attempts: 2,
      bestLines: 0,
    };

    const due = getDueLessons(mockLessons, save, today);
    expect(due.map((l) => l.id)).toEqual(['l1']);
  });

  it('computes weak topics from attempt count, hint usage, and star ratings', () => {
    const today = new Date('2026-03-10T12:00:00.000Z');
    const mockLessons = [
      { id: 'l1', realmId: 1, chip: 'STRINGS', title: 'Str1' } as unknown as Lesson,
      { id: 'l2', realmId: 1, chip: 'STRINGS', title: 'Str2' } as unknown as Lesson,
      { id: 'l3', realmId: 2, chip: 'LISTS', title: 'Lst1' } as unknown as Lesson,
    ];

    const save = defaultSave();
    // STRINGS has high attempts and hints used -> weak
    save.lessons['l1'] = {
      stars: 1,
      bestStars: 1,
      code: '',
      completedAt: '',
      attempts: 6,
      bestLines: 2,
      hintsUsed: 3,
    };
    save.lessons['l2'] = {
      stars: 2,
      bestStars: 2,
      code: '',
      completedAt: '',
      attempts: 4,
      bestLines: 3,
      hintsUsed: 2,
    };
    // LISTS is mastered and scheduled for future review (1 attempt, 0 hints, 3 stars)
    save.lessons['l3'] = {
      stars: 3,
      bestStars: 3,
      code: '',
      completedAt: '',
      attempts: 1,
      bestLines: 1,
      hintsUsed: 0,
      nextReviewDate: '2026-04-10',
    };

    const weak = computeWeakTopics(mockLessons, save, today);
    expect(weak.length).toBe(2);

    const stringsTopic = weak.find((t) => t.topic === 'STRINGS');
    expect(stringsTopic).toBeDefined();
    expect(stringsTopic?.status).toBe('critical');
    expect(stringsTopic?.totalAttempts).toBe(10);
    expect(stringsTopic?.totalHintsUsed).toBe(5);

    const listsTopic = weak.find((t) => t.topic === 'LISTS');
    expect(listsTopic).toBeDefined();
    expect(listsTopic?.status).toBe('solid');
  });

  it('save migration v4 seamlessly migrates legacy saves and sets up review fields', () => {
    const rawV2 = {
      version: 2,
      xp: 200,
      lessons: {
        'r1-1': { stars: 3, bestStars: 3, code: 'print("hi")', attempts: 3, bestLines: 1 },
      },
    };
    const v4 = migrateSave(rawV2);
    expect(v4.version).toBe(4);
    expect(v4.lessons['r1-1'].hintsUsed).toBe(0);
    expect(v4.lessons['r1-1'].interval).toBe(1);
    expect(v4.lessons['r1-1'].repetitions).toBe(0);
    expect(v4.lessons['r1-1'].scratchSolved).toBe(false);
    expect(Array.isArray(v4.reviewQueue)).toBe(true);
  });
});
