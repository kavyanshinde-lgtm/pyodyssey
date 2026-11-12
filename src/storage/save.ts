import type { ThemeId } from '../data/shop';

export interface LessonProgress {
  stars: number;
  bestStars: number;
  code: string;
  completedAt: string;
  attempts: number;
  bestLines: number;
  hintsUsed: number;
  predictSolved?: boolean;
  interval?: number;
  repetitions?: number;
  nextReviewDate?: string | null;
  lastReviewedDate?: string | null;
  scratchSolved?: boolean;
}

export interface TrialProgress {
  clearedRounds: number[];
  completed: boolean;
}

export interface SaveData {
  version: 4;
  xp: number;
  coins: number;
  streak: number;
  lastActiveDate: string | null;
  lessons: Record<string, LessonProgress>;
  trials: Record<string, TrialProgress>;
  studyDone: Record<string, boolean>;
  drafts: Record<string, string>;
  reviewQueue: string[];
  activeLessonId: string;
  theme: ThemeId;
  unlockedThemes: ThemeId[];
  muted: boolean;
  totalRuns: number;
  totalLines: number;
  seenIntro: boolean;
  savedAt: string;
}

const STORAGE_KEY = 'pyodyssey.save.v4';
const LEGACY_STORAGE_KEY_V3 = 'pyodyssey.save.v3';
const LEGACY_STORAGE_KEY_V2 = 'pyodyssey.save.v2';
const EXPORT_PREFIX = 'PYODYSSEY-4:';
const LEGACY_EXPORT_PREFIX_V3 = 'PYODYSSEY-3:';
const LEGACY_EXPORT_PREFIX_V2 = 'PYODYSSEY-2:';

export const defaultSave = (): SaveData => ({
  version: 4,
  xp: 0,
  coins: 0,
  streak: 0,
  lastActiveDate: null,
  lessons: {},
  trials: {},
  studyDone: {},
  drafts: {},
  reviewQueue: [],
  activeLessonId: 'r1-1',
  theme: 'dark',
  unlockedThemes: ['dark', 'light'],
  muted: false,
  totalRuns: 0,
  totalLines: 0,
  seenIntro: false,
  savedAt: new Date().toISOString(),
});

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTheme(value: unknown): ThemeId {
  return value === 'light' ? 'light' : 'dark';
}

export function migrateSave(input: unknown): SaveData {
  const base = defaultSave();
  if (!input || typeof input !== 'object') return base;
  const raw = input as Record<string, unknown>;

  const lessons: Record<string, LessonProgress> = {};
  if (raw.lessons && typeof raw.lessons === 'object') {
    for (const [id, value] of Object.entries(raw.lessons as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as Record<string, unknown>;
      lessons[id] = {
        stars: Math.max(0, Math.min(3, asNumber(entry.stars, 0))),
        bestStars: Math.max(0, Math.min(3, asNumber(entry.bestStars ?? entry.stars, 0))),
        code: typeof entry.code === 'string' ? entry.code : '',
        completedAt: typeof entry.completedAt === 'string' ? entry.completedAt : new Date().toISOString(),
        attempts: Math.max(0, asNumber(entry.attempts, 0)),
        bestLines: Math.max(0, asNumber(entry.bestLines, 0)),
        hintsUsed: Math.max(0, asNumber(entry.hintsUsed, 0)),
        predictSolved: entry.predictSolved === true,
        interval: typeof entry.interval === 'number' ? Math.max(0, entry.interval) : 1,
        repetitions: typeof entry.repetitions === 'number' ? Math.max(0, entry.repetitions) : 0,
        nextReviewDate: typeof entry.nextReviewDate === 'string' ? entry.nextReviewDate : null,
        lastReviewedDate: typeof entry.lastReviewedDate === 'string' ? entry.lastReviewedDate : null,
        scratchSolved: entry.scratchSolved === true,
      };
    }
  }

  const trials: Record<string, TrialProgress> = {};
  if (raw.trials && typeof raw.trials === 'object') {
    for (const [id, value] of Object.entries(raw.trials as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as Record<string, unknown>;
      const cleared = Array.isArray(entry.clearedRounds)
        ? Array.from(
            new Set(
              entry.clearedRounds
                .map((round) => (typeof round === 'number' ? Math.floor(round) : -1))
                .filter((round) => round >= 0 && round < 20),
            ),
          )
        : [];
      trials[id] = {
        clearedRounds: cleared,
        completed: entry.completed === true || cleared.length >= 3,
      };
    }
  }

  const studyDone: Record<string, boolean> = {};
  if (raw.studyDone && typeof raw.studyDone === 'object') {
    for (const [id, value] of Object.entries(raw.studyDone as Record<string, unknown>)) {
      if (value === true) studyDone[id] = true;
    }
  }

  const drafts: Record<string, string> = {};
  if (raw.drafts && typeof raw.drafts === 'object') {
    for (const [id, value] of Object.entries(raw.drafts as Record<string, unknown>)) {
      if (typeof value === 'string') drafts[id] = value;
    }
  }

  const reviewQueue = Array.isArray(raw.reviewQueue)
    ? raw.reviewQueue.filter((id): id is string => typeof id === 'string')
    : [];

  const rawThemes = Array.isArray(raw.unlockedThemes)
    ? raw.unlockedThemes.map(normalizeTheme)
    : base.unlockedThemes;

  return {
    ...base,
    xp: Math.max(0, asNumber(raw.xp, 0)),
    coins: Math.max(0, asNumber(raw.coins, base.coins)),
    streak: Math.max(0, asNumber(raw.streak, 0)),
    lastActiveDate: typeof raw.lastActiveDate === 'string' ? raw.lastActiveDate : null,
    lessons,
    trials,
    studyDone,
    drafts,
    reviewQueue,
    activeLessonId: typeof raw.activeLessonId === 'string' ? raw.activeLessonId : 'r1-1',
    theme: normalizeTheme(raw.theme),
    unlockedThemes: Array.from(new Set<ThemeId>(['dark', 'light', ...rawThemes])),
    muted: raw.muted === true,
    totalRuns: Math.max(0, asNumber(raw.totalRuns, 0)),
    totalLines: Math.max(0, asNumber(raw.totalLines, 0)),
    seenIntro: raw.seenIntro === true,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
  };
}

export function loadSave(): SaveData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return migrateSave(JSON.parse(stored));
    }
    const legacyV3 = localStorage.getItem(LEGACY_STORAGE_KEY_V3);
    if (legacyV3) {
      const migrated = migrateSave(JSON.parse(legacyV3));
      persistSave(migrated);
      return migrated;
    }
    const legacyV2 = localStorage.getItem(LEGACY_STORAGE_KEY_V2);
    if (legacyV2) {
      const migrated = migrateSave(JSON.parse(legacyV2));
      persistSave(migrated);
      return migrated;
    }
    return defaultSave();
  } catch {
    return defaultSave();
  }
}

export function persistSave(data: SaveData) {
  try {
    const payload = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // A full or blocked localStorage must not crash the learning session.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No-op.
  }
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

export function exportSave(data: SaveData): string {
  return `${EXPORT_PREFIX}${toBase64(JSON.stringify(data))}`;
}

export function importSave(code: string): SaveData {
  const trimmed = code.trim();
  let payloadBase64 = '';
  if (trimmed.startsWith(EXPORT_PREFIX)) {
    payloadBase64 = trimmed.slice(EXPORT_PREFIX.length);
  } else if (trimmed.startsWith(LEGACY_EXPORT_PREFIX_V3)) {
    payloadBase64 = trimmed.slice(LEGACY_EXPORT_PREFIX_V3.length);
  } else if (trimmed.startsWith(LEGACY_EXPORT_PREFIX_V2)) {
    payloadBase64 = trimmed.slice(LEGACY_EXPORT_PREFIX_V2.length);
  } else {
    throw new Error('That does not look like a PyOdyssey save code. It should start with PYODYSSEY-4:, PYODYSSEY-3:, or PYODYSSEY-2:.');
  }
  const decoded = fromBase64(payloadBase64);
  const parsed = JSON.parse(decoded) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('The save code is empty or corrupted.');
  return migrateSave(parsed);
}

export function downloadSave(data: SaveData) {
  const content = exportSave(data);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pyodyssey-save-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function touchStreak(data: SaveData, now = new Date()): SaveData {
  const today = localDateKey(now);
  if (data.lastActiveDate === today) return data;
  const yesterday = new Date(now.getTime() - 86_400_000);
  const next = data.lastActiveDate === localDateKey(yesterday) ? data.streak + 1 : 1;
  return {
    ...data,
    streak: Math.max(1, next),
    lastActiveDate: today,
  };
}

export function totalStars(data: SaveData): number {
  return Object.values(data.lessons).reduce((sum, entry) => sum + (entry.bestStars ?? entry.stars ?? 0), 0);
}

export function completedCount(data: SaveData): number {
  return Object.keys(data.lessons).filter((id) => (data.lessons[id]?.bestStars ?? 0) > 0).length;
}
