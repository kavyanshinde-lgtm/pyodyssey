import assert from 'node:assert/strict';
import { finish, openQaPage } from './qa-helpers.mjs';
const qa = await openQaPage(); const { page } = qa;
assert.equal(await page.getByTestId('engine-ready').getAttribute('data-engine-status'), 'ready'); assert.ok(await page.getByTestId('problem-title').isVisible());
console.log('VISUAL PASS'); await finish(qa);
