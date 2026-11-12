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

await page.goto('http://127.0.0.1:4178/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('.engine-led')?.classList.contains('ready'), { timeout: 30000 });
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots/final-home.png' });

// Complete the first lesson through the production build.
await page.locator('.editor-input').fill('print("Hello, PyOdyssey!")');
await page.waitForTimeout(450);
console.log('GOALS', await page.locator('.goal-check.passed').count());
await page.locator('.run-button').click();
await page.waitForTimeout(1650);
console.log('REWARD', await page.locator('.reward-modal').isVisible().catch(() => false));
await page.screenshot({ path: 'shots/final-reward.png' });
if (await page.locator('.reward-modal').isVisible().catch(() => false)) {
  await page.locator('.reward-secondary', { hasText: 'STAY HERE' }).click();
  await page.waitForTimeout(300);
}

// World map and shop.
await page.locator('.top-action[title="World Map"]').click();
await page.waitForTimeout(550);
console.log('MAP VISIBLE', await page.locator('.map-modal').isVisible());
await page.screenshot({ path: 'shots/final-map.png' });
await page.locator('.modal-close').click();
await page.waitForTimeout(250);
await page.locator('.top-action[title="Black Market"]').click();
await page.waitForTimeout(450);
console.log('SHOP VISIBLE', await page.locator('.shop-modal').isVisible());
await page.screenshot({ path: 'shots/final-shop.png' });
await page.locator('.modal-close').click();
await page.waitForTimeout(250);

// Sandbox + final OOP scene.
await page.locator('.mode-tab', { hasText: 'SANDBOX' }).click();
await page.waitForTimeout(300);
await page.locator('.editor-input').fill(`class Hero:
    def __init__(self, name, hp):
        self.name = name
        self.hp = hp

    def __str__(self):
        return f"{self.name} :: {self.hp} HP"

nova = Hero("Nova", 84)
print(nova)
`);
await page.locator('.run-button').click();
await page.waitForTimeout(5000);
await page.screenshot({ path: 'shots/final-sandbox.png' });
console.log('SANDBOX EXIT', await page.locator('.terminal-exit').innerText());

// Mobile drawer includes save.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.locator('.mobile-menu').click();
await page.waitForTimeout(400);
console.log('DRAWER SAVE LINKS', await page.locator('.footer-link').count());
await page.screenshot({ path: 'shots/final-mobile-drawer.png' });

console.log('LOGS', JSON.stringify(logs, null, 2));
await browser.close();
