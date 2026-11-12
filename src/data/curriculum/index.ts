import type { Lesson, Realm, RealmId } from './types';
import { realm1 } from './realm1';
import { realm2 } from './realm2';
import { realm3 } from './realm3';
import { realm4 } from './realm4';
import { realm5 } from './realm5';
import { realm6 } from './realm6';
import { realm7 } from './realm7';
import { realm8 } from './realm8';

export * from './types';
export * from './helpers';

export const REALMS: Realm[] = [
  realm1,
  realm2,
  realm3,
  realm4,
  realm5,
  realm6,
  realm7,
  realm8,
];

export const ALL_LESSONS: Lesson[] = REALMS.flatMap((realm) => realm.lessons);

export const LESSON_BY_ID = new Map(ALL_LESSONS.map((lesson) => [lesson.id, lesson]));

export const REALM_BY_ID = new Map(REALMS.map((realm) => [realm.id, realm]));

export const TOTAL_LESSONS = ALL_LESSONS.length;

export function getLesson(id: string): Lesson | undefined {
  return LESSON_BY_ID.get(id);
}

export function getRealm(id: RealmId): Realm | undefined {
  return REALM_BY_ID.get(id);
}

export function nextLessonId(id: string): string | null {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === id);
  return index >= 0 && index < ALL_LESSONS.length - 1 ? ALL_LESSONS[index + 1].id : null;
}

export const RANKS = [
  { name: 'Toybox Tinkerer', minXp: 0, icon: 'box', color: '#00F5D4' },
  { name: 'Syntax Apprentice', minXp: 300, icon: 'sparkles', color: '#FEE440' },
  { name: 'Loop Smith', minXp: 900, icon: 'cpu', color: '#5EFF8F' },
  { name: 'Data Alchemist', minXp: 1700, icon: 'wand', color: '#FF9F1C' },
  { name: 'OOP Architect', minXp: 2800, icon: 'layers', color: '#4CC9F0' },
  { name: 'Pythonic Practitioner', minXp: 4200, icon: 'crown', color: '#FF2A85' },
] as const;

export function rankForXp(xp: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  const next = RANKS.find((rank) => rank.minXp > current.minXp) ?? null;
  const floor = current.minXp;
  const ceiling = next?.minXp ?? current.minXp + 1000;
  return {
    ...current,
    next,
    progress: next ? Math.min(1, (xp - floor) / (ceiling - floor)) : 1,
    toNext: next ? Math.max(0, next.minXp - xp) : 0,
  };
}
