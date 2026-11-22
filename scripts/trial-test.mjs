import assert from 'node:assert/strict';
import { finish, openCurriculum, openQaPage, runTests } from './qa-helpers.mjs';
const qa = await openQaPage(); const { page } = qa; await openCurriculum(page);
await page.locator('[data-testid^="lesson-"]').filter({ hasText: 'Ultimate trial' }).first().click();
await runTests(page, 'hero = "Nova"\nlevel = 7\nprint(hero.upper())\nprint(level * 10)');
assert.ok(await page.getByTestId('test-result-row').count() > 0); console.log('TRIAL PASS'); await finish(qa);
