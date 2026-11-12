import { describe, expect, it } from 'vitest';
import { checkGoals, lintPython, stripPythonComments, translateRuntimeError } from '../src/engine/linter';
import { defaultSave, exportSave, importSave, migrateSave, touchStreak } from '../src/storage/save';

describe('X-Ray linter', () => {
  it('flags a missing colon', () => {
    const issues = lintPython('if energy > 0\n    print("GO")');
    expect(issues.some((issue) => issue.code === 'MISSING-COLON')).toBe(true);
  });

  it('flags = instead of == inside a condition', () => {
    const issues = lintPython('if score = 10:\n    print("ten")');
    expect(issues.some((issue) => issue.code === 'ASSIGN-IN-CONDITION')).toBe(true);
  });

  it('flags an unclosed quote', () => {
    const issues = lintPython('print("hello)');
    expect(issues.some((issue) => issue.code === 'UNCLOSED-QUOTE')).toBe(true);
  });

  it('flags a method missing self', () => {
    const issues = lintPython('class Hero:\n    def speak():\n        print("hi")');
    expect(issues.some((issue) => issue.code === 'MISSING-SELF')).toBe(true);
  });

  it('does not flag correct methods', () => {
    const issues = lintPython('class Hero:\n    def speak(self):\n        print("hi")');
    expect(issues.some((issue) => issue.code === 'MISSING-SELF')).toBe(false);
  });

  it('flags unclosed parentheses and brackets', () => {
    expect(lintPython('print((1 + 2)').some((issue) => issue.code === 'UNCLOSED-BRACKET')).toBe(true);
    expect(lintPython('items = [1, 2, 3').some((issue) => issue.code === 'UNCLOSED-BRACKET')).toBe(true);
  });
});

describe('error translation', () => {
  it('suggests the closest name with Levenshtein distance', () => {
    const friendly = translateRuntimeError(
      { type: 'NameError', message: "name 'scroe' is not defined", line: 2, traceback: '' },
      { source: 'score = 10\nprint(scroe)', knownNames: [] },
    );
    expect(friendly.message).toContain('score');
    expect(friendly.title).toBe('That name is a ghost');
  });

  it('translates an IndexError into train-car language', () => {
    const friendly = translateRuntimeError(
      { type: 'IndexError', message: 'list index out of range', line: 2, traceback: '' },
      { source: 'items = [1, 2]\nprint(items[4])' },
    );
    expect(friendly.title).toBe('That train car is missing');
  });

  it('translates a timeout into the emergency brake', () => {
    const friendly = translateRuntimeError(
      { type: 'TimeoutError', message: 'too long', line: 1, traceback: '', timeout: true },
      { source: 'while True:\n    pass' },
    );
    expect(friendly.title).toBe('Emergency brake pulled');
  });
});

describe('comment stripping and goals', () => {
  it('preserves strings while removing comments', () => {
    expect(stripPythonComments('print("a # b") # gone')).toBe('print("a # b") ');
    expect(stripPythonComments('x = """keep # this""" # remove')).toBe('x = """keep # this""" ');
  });

  it('never accepts commented-out syntax as a completed goal', () => {
    const goals = [
      {
        id: 'g',
        label: 'print',
        hint: 'use print',
        pattern: '\\bprint\\s*\\(',
      },
    ];
    expect(checkGoals('# print("fake")', goals)[0].passed).toBe(false);
    expect(checkGoals('print("real")', goals)[0].passed).toBe(true);
  });
});

describe('save codec and streaks', () => {
  it('round-trips a save code and keeps progress', () => {
    const save = defaultSave();
    save.xp = 420;
    save.coins = 123;
    save.lessons['r1-1'] = {
      stars: 3,
      bestStars: 3,
      code: 'print("Hello, PyOdyssey!")',
      completedAt: '2026-01-01T00:00:00.000Z',
      attempts: 4,
      bestLines: 1,
    };
    const code = exportSave(save);
    expect(code.startsWith('PYODYSSEY-4:')).toBe(true);
    const restored = importSave(code);
    expect(restored.xp).toBe(420);
    expect(restored.coins).toBe(123);
    expect(restored.lessons['r1-1'].bestStars).toBe(3);
    expect(restored.lessons['r1-1'].hintsUsed).toBe(0);

    // Backwards compatibility: imports legacy v2 save string
    const legacyV2Code = 'PYODYSSEY-2:' + Buffer.from(JSON.stringify({
      version: 2,
      xp: 150,
      coins: 50,
      lessons: { 'r1-1': { stars: 2, bestStars: 2, code: 'print(1)', completedAt: '', attempts: 1, bestLines: 1 } },
    })).toString('base64');
    const restoredV2 = importSave(legacyV2Code);
    expect(restoredV2.version).toBe(4);
    expect(restoredV2.xp).toBe(150);
    expect(restoredV2.lessons['r1-1'].hintsUsed).toBe(0);
  });

  it('extends a streak only once per day', () => {
    const now = new Date('2026-02-02T12:00:00');
    let save = defaultSave();
    save = touchStreak(save, now);
    expect(save.streak).toBe(1);
    const sameDay = touchStreak(save, new Date('2026-02-02T18:00:00'));
    expect(sameDay.streak).toBe(1);
    const nextDay = touchStreak(save, new Date('2026-02-03T09:00:00'));
    expect(nextDay.streak).toBe(2);
    const gap = touchStreak(nextDay, new Date('2026-02-06T09:00:00'));
    expect(gap.streak).toBe(1);
  });

  it('rejects a malformed save code', () => {
    expect(() => importSave('not-a-save')).toThrow();
  });

  it('migrates study and ultimate-trial progress from an older save', () => {
    const migrated = migrateSave({
      version: 2,
      xp: 900,
      trials: {
        'r1-trial': { clearedRounds: [0, 2, 2, 99], completed: false },
      },
      studyDone: { 'r1-1': true, 'r1-trial:0': true, bogus: 'yes' },
    });
    expect(migrated.trials['r1-trial'].clearedRounds).toEqual([0, 2]);
    expect(migrated.trials['r1-trial'].completed).toBe(false);
    expect(migrated.studyDone['r1-1']).toBe(true);
    expect(migrated.studyDone['r1-trial:0']).toBe(true);
    expect(migrated.studyDone.bogus).toBeUndefined();
  });
});
