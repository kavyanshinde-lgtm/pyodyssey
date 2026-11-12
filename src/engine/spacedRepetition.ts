import type { Lesson } from '../data/curriculum';
import type { LessonProgress, SaveData } from '../storage/save';

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface ReviewScheduleUpdate {
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedDate: string;
}

export interface WeakTopic {
  topic: string;
  realmId: number;
  lessonCount: number;
  totalAttempts: number;
  totalHintsUsed: number;
  dueCount: number;
  failureRate: number;
  status: 'critical' | 'needs-practice' | 'solid';
}

export function toDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Calculates updated review schedule.
 * - Failed or used hints (>0): interval resets to 1 day.
 * - Passed with 0 hints: advances interval (1 -> 3 -> 7 -> 14 -> 30 days).
 */
export function calculateNextReview(
  current?: LessonProgress,
  passed = false,
  hintsUsed = 0,
  now = new Date(),
): ReviewScheduleUpdate {
  const todayKey = toDateKey(now);
  const currentInterval = current?.interval ?? 0;
  const currentReps = current?.repetitions ?? 0;

  if (!passed || hintsUsed > 0) {
    return {
      interval: 1,
      repetitions: 0,
      nextReviewDate: toDateKey(addDays(now, 1)),
      lastReviewedDate: todayKey,
    };
  }

  let nextInterval: number;
  if (currentInterval < 1) nextInterval = 1;
  else if (currentInterval < 3) nextInterval = 3;
  else if (currentInterval < 7) nextInterval = 7;
  else if (currentInterval < 14) nextInterval = 14;
  else nextInterval = 30;

  return {
    interval: nextInterval,
    repetitions: currentReps + 1,
    nextReviewDate: toDateKey(addDays(now, nextInterval)),
    lastReviewedDate: todayKey,
  };
}

export function isLessonDue(
  arg1?: string | LessonProgress,
  arg2?: LessonProgress | Date,
  arg3?: Date,
): boolean {
  let progress: LessonProgress | undefined;
  let now = new Date();

  if (typeof arg1 === 'string') {
    progress = arg2 instanceof Date ? undefined : arg2;
    if (arg3 instanceof Date) now = arg3;
    else if (arg2 instanceof Date) now = arg2;
  } else {
    progress = arg1;
    if (arg2 instanceof Date) now = arg2;
  }

  if (!progress) return true;
  const todayKey = toDateKey(now);
  if (progress.nextReviewDate) {
    return progress.nextReviewDate <= todayKey;
  }
  return true;
}

export function getDueLessons(
  allLessons: Lesson[],
  save: SaveData,
  now = new Date(),
): Lesson[] {
  return allLessons.filter((lesson) => {
    if (lesson.isTrial) return false;
    const progress = save.lessons[lesson.id];
    if (!progress || (progress.bestStars ?? 0) === 0) return false;
    return isLessonDue(lesson.id, progress, now);
  });
}

export function computeWeakTopics(
  allLessons: Lesson[],
  save: SaveData,
  now = new Date(),
): WeakTopic[] {
  const topicMap = new Map<
    string,
    {
      topic: string;
      realmId: number;
      lessons: Lesson[];
      totalAttempts: number;
      totalHints: number;
      dueCount: number;
      solvedCount: number;
    }
  >();

  for (const lesson of allLessons) {
    if (lesson.isTrial) continue;
    const key = lesson.chip || `Realm ${lesson.realmId}`;
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        topic: key,
        realmId: lesson.realmId,
        lessons: [],
        totalAttempts: 0,
        totalHints: 0,
        dueCount: 0,
        solvedCount: 0,
      });
    }

    const group = topicMap.get(key)!;
    group.lessons.push(lesson);
    const progress = save.lessons[lesson.id];
    if (progress) {
      group.totalAttempts += progress.attempts ?? 0;
      group.totalHints += progress.hintsUsed ?? 0;
      if ((progress.bestStars ?? 0) > 0) group.solvedCount += 1;
      if (isLessonDue(lesson.id, progress, now)) group.dueCount += 1;
    }
  }

  const results: WeakTopic[] = [];
  for (const group of topicMap.values()) {
    // Only surface topics with activity
    if (group.totalAttempts === 0 && group.totalHints === 0) continue;

    const failedRuns = Math.max(0, group.totalAttempts - group.solvedCount);
    const failureRate =
      group.totalAttempts > 0
        ? Math.round((failedRuns / group.totalAttempts) * 100)
        : 0;

    let status: WeakTopic['status'] = 'solid';
    if (failureRate >= 50 || group.totalHints >= 3 || group.dueCount >= 2) {
      status = 'critical';
    } else if (failureRate >= 25 || group.totalHints >= 1 || group.dueCount >= 1) {
      status = 'needs-practice';
    }

    results.push({
      topic: group.topic,
      realmId: group.realmId,
      lessonCount: group.lessons.length,
      totalAttempts: group.totalAttempts,
      totalHintsUsed: group.totalHints,
      dueCount: group.dueCount,
      failureRate,
      status,
    });
  }

  // Sort critical first, then highest failure rate
  return results.sort((a, b) => {
    const priority = { critical: 3, 'needs-practice': 2, solid: 1 };
    if (priority[b.status] !== priority[a.status]) {
      return priority[b.status] - priority[a.status];
    }
    return b.failureRate - a.failureRate;
  });
}
