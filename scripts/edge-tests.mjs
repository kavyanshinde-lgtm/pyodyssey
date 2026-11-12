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
await page.locator('.mode-tab', { hasText: 'SANDBOX' }).click();
await page.waitForTimeout(300);

// OOP final frame, should show a stamped robot
await page.locator('.editor-input').fill(`class Robot:
    def __init__(self, name, hp, power):
        self.name = name
        self.hp = hp
        self.power = power

    def __str__(self):
        return f"{self.name}:{self.hp}"

bot = Robot("Nova", 84, 99)
print(bot)
`);
await page.locator('.run-button').click();
await page.waitForTimeout(5000);
console.log('OOP STATUS', await page.locator('.stage-status').innerText());
console.log('ROBOT COUNT', await page.locator('.hologram-robot').count());
await page.locator('.visual-stage').screenshot({ path: 'shots/oop-final.png' });

// File I/O
await page.locator('.editor-input').fill(`with open("mission.txt", "w") as f:
    f.write("NOVA")

with open("mission.txt") as f:
    print(f.read())
`);
await page.locator('.run-button').click();
await page.waitForTimeout(2600);
console.log('FILE IO OUTPUT', (await page.locator('.terminal-body').innerText()).slice(0, 400));
await page.screenshot({ path: 'shots/file-io.png' });

// Timeout brake
await page.locator('.editor-input').fill('while True:\n    pass');
await page.locator('.run-button').click();
await page.waitForTimeout(6200);
console.log('TIMEOUT CALLOUT', await page.locator('.runtime-callout').innerText().catch(() => 'none'));
await page.screenshot({ path: 'shots/timeout.png' });
await page.waitForTimeout(1500);
console.log('ENGINE AFTER TIMEOUT', await page.locator('.terminal-statusbar').innerText().catch(() => 'none'));

// Save modal
await page.locator('.top-action.save-action').click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/save-modal.png' });
const exportCode = await page.locator('.save-code').first().inputValue().catch(() => '');
console.log('SAVE CODE LENGTH', exportCode.length, exportCode.slice(0, 24));
await page.locator('.modal-close').click();
await page.waitForTimeout(200);

// persisted state check
const stored = await page.evaluate(() => localStorage.getItem('pyodyssey.save.v2'));
console.log('STORED SAVE LENGTH', stored?.length ?? 0);

// theme switch via localStorage
await page.evaluate(() => {
  const raw = localStorage.getItem('pyodyssey.save.v2');
  if (!raw) return;
  const data = JSON.parse(raw);
  data.theme = 'cyberpunk';
  data.unlockedThemes = ['matrix', 'cyberpunk'];
  data.pyroSkin = 'bubblegum';
  data.unlockedSkins = ['mint', 'bubblegum'];
  localStorage.setItem('pyodyssey.save.v2', JSON.stringify(data));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/cyberpunk.png' });

// responsive 1280
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/1280.png' });

// mobile-ish 900
await page.setViewportSize({ width: 900, height: 1000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/900.png' });

console.log('LOGS', JSON.stringify(logs, null, 2));
await browser.close();
