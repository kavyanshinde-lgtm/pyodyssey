import assert from 'node:assert/strict';
import { finish, openQaPage, runTests, waitForReady } from './qa-helpers.mjs';

const qa = await openQaPage();
const { page, context } = qa;
const solution = 'def say_hello(target: str = "PyOdyssey") -> str:\n    return f"Hello, {target}!"\n\nprint("Hello, PyOdyssey!")';
await runTests(page, solution);
assert.equal(await page.getByTestId('solved-badge').innerText(), 'Solved');
console.log('SMOKE ONLINE PASS');

if (process.argv.includes('--offline')) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  await runTests(page, solution);
  assert.equal(await page.getByTestId('solved-badge').innerText(), 'Solved');
  console.log('SMOKE OFFLINE PASS');
  await context.setOffline(false);
}

await finish(qa);
