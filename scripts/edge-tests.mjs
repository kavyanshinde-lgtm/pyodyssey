import assert from 'node:assert/strict';
import { closeCurriculum, finish, openCurriculum, openQaPage, runOnly, switchMode } from './qa-helpers.mjs';
const qa = await openQaPage(); const { page } = qa; await switchMode(page, 'sandbox'); await openCurriculum(page);
await page.getByTestId('sandbox-example-hello').click(); await closeCurriculum(page); await runOnly(page, 'print("Welcome, Nova!")');
assert.match(await page.getByTestId('tests-panel-body').innerText(), /Welcome/);
await page.getByTestId('code-editor').fill('while True:\n    pass'); await page.getByTestId('run-only-button').click(); await page.waitForTimeout(5000); await page.getByTestId('output-tab-button').click();
assert.match(await page.getByTestId('tests-panel-body').innerText(), /too long|Timeout|brake/i); console.log('EDGE PASS'); await finish(qa);
