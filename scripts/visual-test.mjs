import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const executablePath = 'C:\\Users\\kavya\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const logs = [];
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.stack || error.message}`));

await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
await page.screenshot({ path: 'shots/01-initial.png' });
console.log('TITLE', await page.title());
console.log('BODY-SNIPPET', (await page.locator('body').innerText()).slice(0, 1400));
console.log('ENGINE', await page.locator('.terminal-statusbar').innerText().catch(() => 'no-statusbar'));

await page.waitForFunction(
  () => document.querySelector('.engine-led')?.classList.contains('ready'),
  { timeout: 30000 },
).catch((error) => logs.push(`[engine-wait] ${error.message}`));
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/02-ready.png' });
console.log('ENGINE-READY', await page.locator('.terminal-statusbar').innerText().catch(() => 'no-statusbar'));
console.log('LOGS', JSON.stringify(logs, null, 2));

await browser.close();
