import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const executablePath = 'C:\\Users\\kavya\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') logs.push(`[console] ${msg.text()}`); });

await page.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('.engine-led')?.classList.contains('ready'), { timeout: 30000 });
await page.waitForTimeout(600);
console.log('STUDY VISIBLE', await page.locator('.study-view').isVisible());
await page.screenshot({ path: 'shots/study-home.png' });

// Demo the worked example.
await page.locator('.study-demo-button').click();
await page.waitForTimeout(2200);
console.log('DEMO TERMINAL', (await page.locator('.terminal-body').innerText()).slice(0, 220));
console.log('DEMO BUTTON', await page.locator('.study-demo-button').innerText());
await page.screenshot({ path: 'shots/study-demo.png' });

// Prediction check.
await page.locator('.predict-input').fill('Hello, PyOdyssey!');
await page.locator('.predict-check').click();
await page.waitForTimeout(350);
console.log('PREDICT FEEDBACK', await page.locator('.predict-feedback').innerText().catch(() => 'none'));
await page.screenshot({ path: 'shots/study-correct.png' });

// Enter build and finish the lesson.
await page.locator('.study-build').click();
await page.waitForTimeout(350);
console.log('EDITOR VISIBLE', await page.locator('.editor-input').isVisible());
await page.locator('.editor-input').fill('print("Hello, PyOdyssey!")');
await page.waitForTimeout(400);
await page.locator('.run-button').click();
await page.waitForTimeout(1700);
console.log('REWARD', await page.locator('.reward-modal').isVisible().catch(() => false));
await page.locator('.reward-secondary', { hasText: 'STAY HERE' }).click().catch(() => {});
await page.waitForTimeout(300);

// Open the realm 1 ultimate trial.
await page.locator('.lesson-row.is-trial').first().scrollIntoViewIfNeeded();
await page.locator('.lesson-row.is-trial').first().click();
await page.waitForTimeout(500);
console.log('TRIAL TITLE', await page.locator('.quest-copy h1').innerText());
console.log('TRIAL STUDY', await page.locator('.study-view').isVisible());
console.log('WAVE STRIP', await page.locator('.trial-wave-strip').innerText().catch(() => 'not visible in study'));
await page.screenshot({ path: 'shots/trial-study.png' });

const waves = [
  {
    name: 'wave1',
    code: 'hero = "Nova"\nlevel = 7\nprint(hero.upper())\nprint(level * 10)',
  },
  {
    name: 'wave2',
    code: 'name = input("Name: ")\napples = 7\nfriends = 2\nprint(f"{name} gets {apples // friends} each, {apples % friends} left")',
  },
  {
    name: 'wave3',
    code: 'age_text = "12"\nage = int(age_text)\npower = age * 5\nprint(f"PILOT {age_text} · POWER {power}")',
  },
];

for (let index = 0; index < waves.length; index += 1) {
  const wave = waves[index];
  const inStudy = await page.locator('.study-view').isVisible().catch(() => false);
  if (inStudy) {
    await page.locator('.study-build').click();
    await page.waitForTimeout(250);
  }
  await page.locator('.editor-input').fill(wave.code);
  await page.waitForTimeout(450);
  await page.locator('.run-button').click();
  await page.waitForTimeout(2600);
  console.log(`AFTER ${wave.name}`, {
    reward: await page.locator('.reward-modal').isVisible().catch(() => false),
    study: await page.locator('.study-view').isVisible().catch(() => false),
    title: await page.locator('.quest-copy h1').innerText().catch(() => 'none'),
    chip: await page.locator('.quest-chip').innerText().catch(() => 'none'),
    terminal: (await page.locator('.terminal-body').innerText().catch(() => '')).slice(0, 150),
  });
  await page.screenshot({ path: `shots/trial-${wave.name}.png` });
  if (wave.name !== 'wave3') {
    await page.waitForTimeout(1400);
  }
}

const rewardVisible = await page.locator('.reward-modal').isVisible().catch(() => false);
console.log('FINAL REWARD', rewardVisible);
if (rewardVisible) {
  console.log('TRIAL REWARD TEXT', (await page.locator('.reward-modal').innerText()).slice(0, 900));
  await page.screenshot({ path: 'shots/trial-reward.png' });
  await page.locator('.reward-secondary', { hasText: 'STAY HERE' }).click();
  await page.waitForTimeout(300);
}
const trialSave = await page.evaluate(() => {
  const raw = localStorage.getItem('pyodyssey.save.v2');
  return raw ? JSON.parse(raw).trials : null;
});
console.log('TRIAL SAVE', JSON.stringify(trialSave));

// Map trial marker.
await page.locator('.top-action[title="World Map"]').click();
await page.waitForTimeout(500);
console.log('MAP TRIAL BUTTONS', await page.locator('.map-trial-node').count());
await page.screenshot({ path: 'shots/trial-map.png' });
await page.locator('.modal-close').click();
await page.waitForTimeout(250);

// Reload confirms study/trial persistence.
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
console.log('RELOAD STUDY', await page.locator('.study-view').isVisible().catch(() => false));
console.log('LOGS', JSON.stringify(logs, null, 2));
await browser.close();
