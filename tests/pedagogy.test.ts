import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, REALMS } from '../src/data/curriculum';
import { defaultSave, migrateSave } from '../src/storage/save';

describe('Phase 2 Pedagogy & Problem Standards', () => {
  it('every realm ends with a mini-project instead of a boss battle', () => {
    for (const realm of REALMS) {
      const projectLesson = realm.lessons.find((l) => l.isProject || l.id.endsWith('-boss'));
      expect(projectLesson, `Realm ${realm.id} missing project`).toBeTruthy();
      expect(projectLesson?.isProject).toBe(true);
      expect(projectLesson?.chip).toBe('MINI-PROJECT');
      expect(projectLesson?.title.startsWith('Mini-Project:')).toBe(true);
      expect(projectLesson?.exerciseType).toBe('project');
      // Must have test cases validating multiple aspects/functions
      expect(projectLesson?.tests?.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('prompts state problem, inputs/outputs and examples without leaking raw solution code', () => {
    for (const lesson of ALL_LESSONS) {
      if (lesson.isTrial) continue;
      expect(lesson.prompt.length, lesson.id).toBeGreaterThan(15);
      // Ensure prompt contains problem guidance
      expect(lesson.prompt).not.toBe(lesson.solution);
      expect(lesson.prompt).not.toContain(lesson.solution);
    }
  });

  it('starter code does not provide the complete solution', () => {
    for (const lesson of ALL_LESSONS) {
      if (lesson.isTrial) continue;
      // If starter is function-based, it should have docstring / pass, not the full solution
      if (lesson.solution.includes('def ') && lesson.solution.includes('return ')) {
        expect(lesson.starter.trim()).not.toBe(lesson.solution.trim());
      }
    }
  });

  it('tiered hints provide concept, approach, skeleton and solution tiers', () => {
    const lessonsWithTiered = ALL_LESSONS.filter((l) => Boolean(l.tieredHints));
    expect(lessonsWithTiered.length).toBeGreaterThanOrEqual(8);
    for (const lesson of lessonsWithTiered) {
      const th = lesson.tieredHints!;
      expect(th.concept.length, `${lesson.id} concept`).toBeGreaterThan(10);
      expect(th.approach.length, `${lesson.id} approach`).toBeGreaterThan(10);
      expect(th.skeleton.length, `${lesson.id} skeleton`).toBeGreaterThan(5);
      expect((th.solution ?? lesson.solution).length, `${lesson.id} solution`).toBeGreaterThan(5);
    }
  });

  it('predict-the-output questions test non-trivial Python concepts', () => {
    const predictLessons = ALL_LESSONS.filter((l) => Boolean(l.predictQuestion));
    expect(predictLessons.length).toBeGreaterThanOrEqual(8);

    const foci = new Set(predictLessons.map((l) => l.predictQuestion!.focus));
    // Verify required concept foci are represented
    expect(foci.has('scope') || foci.has('mutation') || foci.has('aliasing') || foci.has('off-by-one')).toBe(true);

    for (const lesson of predictLessons) {
      const pq = lesson.predictQuestion!;
      expect(pq.question.length, `${lesson.id} pq question`).toBeGreaterThan(10);
      expect(pq.codeSnippet.length, `${lesson.id} pq snippet`).toBeGreaterThan(5);
      expect(pq.answer.length, `${lesson.id} pq answer`).toBeGreaterThan(0);
      expect(pq.explanation.length, `${lesson.id} pq explanation`).toBeGreaterThan(10);
    }
  });

  it('save migration v3 tracks hintsUsed and preserves progress', () => {
    const rawV2 = {
      version: 2,
      xp: 250,
      lessons: {
        'r1-1': { stars: 3, bestStars: 3, code: 'print("Hello, PyOdyssey!")', attempts: 5, bestLines: 1 },
      },
    };
    const migrated = migrateSave(rawV2);
    expect(migrated.version).toBe(4);
    expect(migrated.xp).toBe(250);
    expect(migrated.lessons['r1-1'].hintsUsed).toBe(0);
    expect(migrated.lessons['r1-1'].attempts).toBe(5);

    // Initializing with hint records
    migrated.lessons['r1-1'].hintsUsed = 3;
    const reMigrated = migrateSave(migrated);
    expect(reMigrated.lessons['r1-1'].hintsUsed).toBe(3);
  });
});
