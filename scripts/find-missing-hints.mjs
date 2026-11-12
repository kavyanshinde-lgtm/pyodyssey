import { ALL_LESSONS } from './src/data/curriculum/index.ts';

for (const l of ALL_LESSONS) {
  if (!l.tieredHints) {
    console.log(`${l.realmId} | ${l.id} | ${l.title}`);
  }
}
