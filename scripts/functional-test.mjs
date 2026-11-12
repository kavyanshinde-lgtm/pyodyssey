import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const executablePath = 'C:\\Users\\kavya\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const logs = [];
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.stack || error.message}`));

await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('.engine-led')?.classList.contains('ready'), { timeout: 30000 });
await page.waitForTimeout(500);

// Solve lesson 1
await page.locator('.editor-input').fill('print("Hello, PyOdyssey!")');
await page.waitForTimeout(600);
console.log('GOALS-PASSED', await page.locator('.goal-check.passed').count());
await page.screenshot({ path: 'shots/03-typed.png' });

await page.locator('.run-button').click();
await page.waitForTimeout(1700);
console.log('AFTER-RUN-STAGE', await page.locator('.stage-status').innerText());
console.log('TERMINAL', (await page.locator('.terminal-body').innerText()).slice(0, 500));
await page.screenshot({ path: 'shots/04-run.png' });

const rewardVisible = await page.locator('.reward-modal').isVisible().catch(() => false);
console.log('REWARD-VISIBLE', rewardVisible);
if (rewardVisible) {
  console.log('REWARD-TEXT', (await page.locator('.reward-modal').innerText()).slice(0, 900));
  await page.screenshot({ path: 'shots/05-reward.png' });
  await page.locator('.reward-secondary', { hasText: 'STAY HERE' }).click();
  await page.waitForTimeout(400);
}

// Error flow
await page.locator('.editor-input').fill('print("Hello, PyOdyssey!"\nscore = 10\nprint(scroe)');
await page.waitForTimeout(500);
await page.locator('.run-button').click();
await page.waitForTimeout(1400);
console.log('ERROR CALLOUT', await page.locator('.runtime-callout').innerText().catch(() => 'none'));
await page.screenshot({ path: 'shots/06-error.png' });

// Linter flow
await page.locator('.editor-input').fill('if 3 > 2\nprint("oops")');
await page.waitForTimeout(650);
console.log('LINT ISSUES', await page.locator('.xray-issue').count());
await page.locator('.terminal-tab', { hasText: 'X-RAY' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/07-linter.png' });

// Map
await page.locator('.top-action[title="World Map"]').click();
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/08-map.png' });
await page.locator('.modal-close').click();
await page.waitForTimeout(300);

// Shop
await page.locator('.top-action[title="Black Market"]').click();
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/09-shop.png' });
await page.locator('.shop-tabs button', { hasText: 'PYRO SKINS' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/10-shop-skins.png' });
await page.locator('.modal-close').click();
await page.waitForTimeout(300);

// Sandbox
await page.locator('.mode-tab', { hasText: 'SANDBOX' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/11-sandbox.png' });
await page.locator('.sandbox-example', { hasText: 'Recursion Spiral' }).click();
await page.waitForTimeout(250);
await page.locator('.sandbox-run').click();
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/12-sandbox-run.png' });
console.log('SANDBOX TERMINAL', (await page.locator('.terminal-body').innerText()).slice(0, 500));

console.log('LOGS', JSON.stringify(logs, null, 2));
await browser.close();
