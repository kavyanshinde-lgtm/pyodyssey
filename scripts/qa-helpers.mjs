import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

export const BASE_URL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4177';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Users\\kavya\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe'
    : chromium.executablePath());

export async function openQaPage({ baseUrl = BASE_URL, clearStorage = true } = {}) {
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  if (clearStorage) await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  const logs = [];
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) logs.push(`[${message.type()}] ${message.text()}`); });
  page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForReady(page);
  return { browser, context, page, logs };
}

export async function waitForReady(page) {
  await page.locator('[data-testid="engine-ready"][data-engine-status="ready"]').waitFor({ state: 'attached', timeout: 60000 });
}

export async function openMenu(page) { await page.getByRole('button', { name: 'More options' }).click(); }
export async function switchMode(page, mode) {
  await openMenu(page);
  await page.getByTestId(mode === 'sandbox' ? 'sandbox-mode-button' : 'campaign-mode-button').click();
}
export async function openCurriculum(page) {
  const drawer = page.locator('.curriculum-drawer.open');
  if (!(await drawer.isVisible().catch(() => false))) await page.getByTestId('curriculum-toggle-button').click();
  await page.getByRole('dialog', { name: 'Curriculum' }).or(page.getByTestId('sandbox-panel')).waitFor();
}
export async function closeCurriculum(page) {
  if (await page.locator('.curriculum-drawer.open').isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
  }
}
export async function closeReward(page) {
  const reward = page.getByTestId('reward-stay-button');
  if (await reward.isVisible().catch(() => false)) await reward.click();
}
export async function runTests(page, code) {
  await page.getByTestId('code-editor').fill(code);
  await page.getByTestId('run-tests-button').click();
  await page.getByTestId('test-result-row').first().waitFor({ state: 'attached', timeout: 15000 });
}
export async function runOnly(page, code) {
  await page.getByTestId('code-editor').fill(code);
  await page.getByTestId('run-only-button').click();
  await page.getByTestId('output-tab-button').click();
  await page.waitForTimeout(500);
}
export async function finish({ browser, logs }) {
  assert.deepEqual(logs, [], `browser diagnostics: ${logs.join('; ')}`);
  await browser.close();
}
