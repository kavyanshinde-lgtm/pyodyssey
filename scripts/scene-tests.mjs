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
await page.waitForTimeout(400);
await page.locator('.mode-tab', { hasText: 'SANDBOX' }).click();
await page.waitForTimeout(400);

async function runCode(name, code, wait = 2600) {
  await page.locator('.editor-input').fill(code);
  await page.waitForTimeout(350);
  await page.locator('.run-button').click();
  await page.waitForTimeout(wait);
  await page.locator('.visual-stage').screenshot({ path: `shots/scene-${name}.png` });
  const exit = await page.locator('.terminal-exit').innerText().catch(() => '?');
  const frame = await page.locator('.stage-status').innerText().catch(() => '?');
  console.log(name.toUpperCase(), { exit, frame });
}

await runCode('oop', `class Robot:
    def __init__(self, name, hp, power):
        self.name = name
        self.hp = hp
        self.power = power

    def __str__(self):
        return f"{self.name}:{self.hp}"

bot = Robot("Nova", 84, 99)
print(bot)
`);

await runCode('list', `loot = ["core", "gear", "crown"]
loot.append("star")
print(loot)
loot.pop()
print(loot)
`);

await runCode('dict', `hero = {"name": "Nova", "level": 7, "power": 99}
for key in ["name", "level", "power"]:
    print(key, "->", hero[key])
`);

await runCode('loop', `for n in range(1, 7):
    print(f"cycle {n}: machine online")
`);

await runCode('function', `def forge(name, power):
    badge = f"{name.upper()}-{power * 10}"
    return badge

result = forge("nova", 7)
print(result)
`);

await runCode('recursion', `def countdown(n):
    if n <= 0:
        return "LIFTOFF"
    print(n)
    return countdown(n - 1)

print(countdown(5))
`, 3400);

// NameError suggestion
await page.locator('.editor-input').fill('score = 10\nprint(scroe)');
await page.waitForTimeout(400);
await page.locator('.run-button').click();
await page.waitForTimeout(1600);
console.log('NAME-ERROR', await page.locator('.runtime-callout').innerText().catch(() => 'none'));
await page.screenshot({ path: 'shots/error-name.png' });

// IndexError
await page.locator('.editor-input').fill('nums = [1, 2, 3]\nprint(nums[5])');
await page.waitForTimeout(400);
await page.locator('.run-button').click();
await page.waitForTimeout(1600);
console.log('INDEX-ERROR', await page.locator('.runtime-callout').innerText().catch(() => 'none'));

// Linter
await page.locator('.editor-input').fill('if 3 > 2\n    print("oops")');
await page.waitForTimeout(700);
await page.locator('.terminal-tab', { hasText: 'X-RAY' }).click();
await page.waitForTimeout(300);
console.log('LINT-COUNT', await page.locator('.xray-issue').count());
console.log('LINT-TEXT', (await page.locator('.xray-panel').innerText()).slice(0, 500));
await page.screenshot({ path: 'shots/linter-real.png' });

// Boss flow
await page.locator('.mode-tab', { hasText: 'CAMPAIGN' }).click();
await page.waitForTimeout(300);
await page.locator('.lesson-row.is-boss').click();
await page.waitForTimeout(300);
await page.locator('.editor-input').fill(`name = "Nova"
level = 7
power = level * 10
print(f"{name} | LEVEL {level} | POWER {power}")`);
await page.waitForTimeout(500);
await page.locator('.run-button').click();
await page.waitForTimeout(1600);
await page.locator('.visual-stage').screenshot({ path: 'shots/boss-mid.png' });
await page.waitForTimeout(1700);
await page.screenshot({ path: 'shots/boss-reward.png' });
console.log('BOSS VISIBLE', await page.locator('.boss-layer').isVisible().catch(() => false));
console.log('BOSS REWARD', (await page.locator('.reward-modal').innerText()).slice(0, 400).catch(() => 'none'));

console.log('LOGS', JSON.stringify(logs, null, 2));
await browser.close();
