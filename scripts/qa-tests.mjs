import assert from 'node:assert/strict';
import { finish, openCurriculum, openQaPage, runTests } from './qa-helpers.mjs';
const qa = await openQaPage(); const { page } = qa; await openCurriculum(page);
await page.locator('[data-testid^="lesson-"]').filter({ hasText: 'Listening Tube' }).first().click();
await runTests(page, 'name = input("Pilot name: ")\nprint(f"Welcome, {name}!")');
assert.ok(await page.getByTestId('test-result-row').count() > 0); await page.getByTestId('tests-tab-button').click(); console.log('QA PASS'); await finish(qa);
