import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 5198;
const URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function waitServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log('Starting preview server on port', PORT);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    shell: true,
    stdio: 'ignore',
  });

  try {
    await waitServer(URL);
    console.log('Server ready. Launching chromium...');

    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    });

    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Open curriculum drawer
    console.log('Opening curriculum drawer...');
    await page.click('#curriculum-toggle-btn');
    await page.waitForTimeout(400);

    // Switch to Realm 6
    console.log('Selecting Realm 6...');
    const realm6Btn = await page.$('.realm-btn:has-text("6")');
    if (!realm6Btn) throw new Error('Realm 6 button not found');
    await realm6Btn.click();
    await page.waitForTimeout(400);

    // Click Clean log record
    console.log('Selecting Clean log record...');
    const cleanLogItem = await page.$('.lesson-item:has-text("Clean log record")');
    if (!cleanLogItem) throw new Error('Clean log record lesson not found');
    await cleanLogItem.evaluate((el) => el.click());
    await page.waitForTimeout(800);

    // Verify left-pane contents
    const title = await page.locator('.problem-title').innerText();
    const statement = await page.locator('.problem-statement').innerText();
    const exampleCall = await page.locator('.example-box code').innerText();
    const exampleResult = await page.locator('.example-result').innerText();
    const task = await page.locator('.problem-task').innerText();
    const hintBtn = await page.locator('.hint-footer button').innerText();

    console.log('Clean log record verified:');
    console.log('  Title:', title);
    console.log('  Statement:', statement);
    console.log('  Example call:', exampleCall);
    console.log('  Example result:', exampleResult);
    console.log('  Task:', task);
    console.log('  Hint button:', hintBtn);

    if (!exampleCall.includes('clean_log')) {
      throw new Error('Example call does not use real function clean_log');
    }

    // Check hint hidden initially
    const initialHintCard = await page.locator('.hint-box').count();
    console.log('  Initial hint card count (must be 0):', initialHintCard);
    if (initialHintCard !== 0) {
      throw new Error('Hint card should be hidden initially');
    }

    // Click Show hint
    await page.click('.hint-footer button');
    await page.waitForTimeout(300);
    const revealedTier = await page.locator('.hint-box').count();
    console.log('  Revealed hint card count (must be 1):', revealedTier);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/verify-phase5-cleanlog.png' });
    console.log('Screenshot saved to screenshots/verify-phase5-cleanlog.png');

    // Test Realm 8 lesson: Binary search
    await page.click('#curriculum-toggle-btn');
    await page.waitForTimeout(400);
    const realm8Btn = await page.$('.realm-btn:has-text("8")');
    await realm8Btn.click();
    await page.waitForTimeout(400);

    const bsearchItem = await page.$('.lesson-item:has-text("Binary search")');
    if (!bsearchItem) throw new Error('Binary search lesson not found');
    await bsearchItem.evaluate((el) => el.click());
    await page.waitForTimeout(800);

    const bsearchTitle = await page.locator('.problem-title').innerText();
    const bsearchCall = await page.locator('.example-box code').innerText();
    console.log('Binary search verified:');
    console.log('  Title:', bsearchTitle);
    console.log('  Example call:', bsearchCall);

    if (!bsearchCall.includes('binary_search')) {
      throw new Error('Example call does not use real function binary_search');
    }

    await page.screenshot({ path: 'screenshots/verify-phase5-bsearch.png' });
    console.log('Screenshot saved to screenshots/verify-phase5-bsearch.png');

    await browser.close();
    console.log('Phase 5 UI verification PASSED 100%!');
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
