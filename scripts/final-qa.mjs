import assert from 'node:assert/strict';
import { closeCurriculum, closeReward, finish, openCurriculum, openQaPage, runOnly, runTests, switchMode } from './qa-helpers.mjs';
const qa = await openQaPage({ baseUrl: process.env.QA_BASE_URL ?? 'http://127.0.0.1:4178' }); const { page } = qa;
await runTests(page, 'def say_hello(target: str = "PyOdyssey") -> str:\n    return f"Hello, {target}!"\n\nprint("Hello, PyOdyssey!")'); assert.ok(await page.getByTestId('solved-badge').isVisible()); await closeReward(page);
await switchMode(page, 'sandbox'); await openCurriculum(page); await page.getByTestId('sandbox-example-dragon').click(); await closeCurriculum(page);
await runOnly(page, 'class Hero:\n    def __init__(self, name):\n        self.name = name\nprint(Hero("Nova").name)');
assert.match(await page.getByTestId('tests-panel-body').innerText(), /Nova/); console.log('FINAL QA PASS'); await finish(qa);
