import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const executablePath = 'C:\\Users\\kavya\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const logs = [];
page.on('console', (msg) => { if (['error', 'warning'].includes(msg.type())) logs.push(`[${msg.type()}] ${msg.text()}`); });
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.stack || error.message}`));
await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('.engine-led')?.classList.contains('ready'), { timeout: 30000 });
await page.waitForTimeout(400);

// Input lesson
await page.locator('.lesson-row', { hasText: 'The Listening Tube' }).click();
await page.waitForTimeout(300);
await page.locator('.editor-input').fill('name = input("Pilot name: ")\nprint(f"Welcome, {name}!")');
await page.waitForTimeout(400);
await page.locator('.run-button').click();
await page.waitForTimeout(2600);
console.log('INPUT OUTPUT', (await page.locator('.terminal-body').innerText()).slice(0, 500));

// Boss partial damage
await page.locator('.lesson-row.is-boss').click();
await page.waitForTimeout(250);
await page.locator('.editor-input').fill(`name = "Nova"
level = 7
power = 70
print(f"{name} | LEVEL {level} | POWER {power}")`);
await page.waitForTimeout(600);
await page.locator('.run-button').click();
await page.waitForTimeout(2400);
console.log('BOSS PARTIAL HP', await page.locator('.boss-hp-text').innerText().catch(() => 'none'));
console.log('BOSS VALIDATION', (await page.locator('.validation-callout').innerText().catch(() => 'none')).slice(0, 300));
await page.screenshot({ path: 'shots/boss-partial.png' });

// 900 responsive
await page.setViewportSize({ width: 900, height: 1000 });
await page.waitForTimeout(700);
const geo = await page.evaluate(() => {
  const q = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { y: Math.round(b.y), h: Math.round(b.height) }; };
  return { workspace: q('.workspace'), editor: q('.editor-shell'), code: q('.code-editor'), right: q('.right-rail') };
});
console.log('MOBILE GEO', JSON.stringify(geo));
await page.screenshot({ path: 'shots/900-fixed.png' });

// shop purchase flow with seeded coins
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);
await page.evaluate(() => {
  const raw = localStorage.getItem('pyodyssey.save.v2');
  if (!raw) return;
  const data = JSON.parse(raw);
  data.coins = 2000;
  localStorage.setItem('pyodyssey.save.v2', JSON.stringify(data));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
await page.locator('.top-action[title="Black Market"]').click();
await page.waitForTimeout(350);
const cyberpunk = page.locator('.theme-card', { hasText: 'Cyberpunk 2099' });
await cyberpunk.locator('.shop-buy').click();
await page.waitForTimeout(500);
console.log('SHOP COINS', await page.locator('.shop-wallet span').innerText());
console.log('THEME CLASS', await page.locator('.app-shell').getAttribute('class'));
await page.screenshot({ path: 'shots/shop-bought.png' });
await page.locator('.modal-close').click();
await page.waitForTimeout(400);

// persistence after reload
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
console.log('THEME AFTER RELOAD', await page.locator('.app-shell').getAttribute('class'));
console.log('COINS AFTER RELOAD', await page.locator('.stat-pill.coins .stat-value').innerText());

// Save modal export + import same code
await page.locator('.top-action.save-action').click();
await page.waitForTimeout(350);
const code = await page.locator('.save-code').first().inputValue();
await page.locator('.import-code').fill(code);
await page.locator('.save-primary', { hasText: 'LOAD SAVE' }).click();
await page.waitForTimeout(350);
console.log('IMPORT SUCCESS', await page.locator('.save-success').innerText().catch(() => 'none'));
await page.screenshot({ path: 'shots/save-import.png' });

console.log('LOGS', JSON.stringify(logs, null, 2));
await browser.close();
