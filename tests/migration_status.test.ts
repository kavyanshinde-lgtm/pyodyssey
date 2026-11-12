import { describe, it } from 'vitest';
import { ALL_LESSONS } from '../src/data/curriculum/index';

describe('Migration status', () => {
  it('lists unmigrated lessons and trials', () => {
    const unmigrated = ALL_LESSONS.filter((l) => !l.tests || l.tests.length === 0);
    console.log('UNMIGRATED_LESSONS_COUNT:', unmigrated.length);
    console.log('UNMIGRATED_LESSONS:', unmigrated.map((l) => l.id));

    const trials = ALL_LESSONS.filter((l) => l.isTrial && l.trial);
    const unmigratedTrials: string[] = [];
    for (const t of trials) {
      for (const r of t.trial!.rounds) {
        if (!r.tests || r.tests.length === 0) unmigratedTrials.push(r.id);
      }
    }
    console.log('UNMIGRATED_TRIALS_COUNT:', unmigratedTrials.length);
    console.log('UNMIGRATED_TRIALS:', unmigratedTrials);
  });
});
