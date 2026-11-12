import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 5197;
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

async function run() {
  console.log('Starting preview server on port', PORT);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    shell: true,
    stdio: 'inherit',
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

    // =========================================================================
    // Part 1: Navigate to Lesson r1-4 ("Magic Name Tag")
    // =========================================================================
    console.log('--- Opening Curriculum Drawer & Navigating to Magic Name Tag (r1-4) ---');
    const curriculumBtn = await page.$('#curriculum-toggle-btn');
    await curriculumBtn.click();
    await page.waitForTimeout(400);

    // Find and click Magic Name Tag
    const magicLessonBtn = await page.$('.lesson-item:has-text("Magic Name Tag")');
    if (!magicLessonBtn) throw new Error('Magic Name Tag lesson not found in curriculum drawer');
    await magicLessonBtn.click();
    await page.waitForTimeout(600);

    // 1. Verify Problem Statement
    const statement = await page.$eval('.problem-statement', (el) => el.textContent.trim());
    console.log('Problem Statement:', JSON.stringify(statement));
    if (!statement.includes('f-string embeds variables directly inside string quotes')) {
      throw new Error(`Unexpected statement: ${statement}`);
    }

    // 2. Verify Example Block
    const exampleCall = await page.$eval('.example-box code', (el) => el.textContent.trim());
    const exampleExpected = await page.$eval('.example-result', (el) => el.textContent.trim());
    const hasSvgArrow = await page.$('.example-arrow-svg');
    console.log('Example call:', JSON.stringify(exampleCall));
    console.log('Example expected:', JSON.stringify(exampleExpected));
    console.log('Has SVG arrow:', Boolean(hasSvgArrow));

    if (exampleCall.includes('solution(')) {
      throw new Error(`Generic "solution(...)" detected in example call: ${exampleCall}`);
    }
    if (exampleCall !== 'format_profile("Nova", 7)') {
      throw new Error(`Expected real call format_profile("Nova", 7), got: ${exampleCall}`);
    }
    if (!exampleExpected.includes('Pilot Nova is level 7')) {
      throw new Error(`Expected output "Pilot Nova is level 7", got: ${exampleExpected}`);
    }
    if (!hasSvgArrow) {
      throw new Error('Inline SVG arrow is missing');
    }

    // 3. Verify Task Line
    const task = await page.$eval('.problem-task', (el) => el.textContent.trim());
    console.log('Problem Task:', JSON.stringify(task));
    if (!task.includes('format_profile(name, level)')) {
      throw new Error(`Unexpected task: ${task}`);
    }

    // 4. Verify Hints initially hidden
    console.log('--- Verifying Hints Initial State ---');
    const initialHintStatus = await page.$eval('.hint-status-text', (el) => el.textContent.trim());
    const initialHintBox = await page.$('.hint-box');
    console.log('Initial hint status text:', JSON.stringify(initialHintStatus));
    console.log('Initial hint box present:', Boolean(initialHintBox));

    if (!initialHintStatus.includes('Hint 1 of 3 available')) {
      throw new Error(`Expected "Hint 1 of 3 available", got: ${initialHintStatus}`);
    }
    if (initialHintBox !== null) {
      throw new Error('Hint box should be hidden initially!');
    }

    // Screenshot 1: r1-4 with hints hidden
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-01-r1-4-hidden-hint.png') });
    console.log('Saved left-pane-01-r1-4-hidden-hint.png');

    // 5. Click Show hint -> Tier 1
    console.log('--- Clicking Show Hint (Tier 1) ---');
    const showHintBtn = await page.$('.hint-footer button');
    await showHintBtn.click();
    await page.waitForTimeout(300);

    const tier1Status = await page.$eval('.hint-status-text', (el) => el.textContent.trim());
    const tier1Text = await page.$eval('.hint-box', (el) => el.textContent.trim());
    console.log('Tier 1 status text:', JSON.stringify(tier1Status));
    console.log('Tier 1 hint content:', JSON.stringify(tier1Text));

    if (!tier1Status.includes('Hint 1 of 3')) {
      throw new Error(`Expected "Hint 1 of 3", got: ${tier1Status}`);
    }
    if (!tier1Text.includes('f-strings allow embedding Python expressions')) {
      throw new Error(`Unexpected Tier 1 text: ${tier1Text}`);
    }

    // Screenshot 2: r1-4 with Hint 1
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-02-r1-4-tier1-hint.png') });
    console.log('Saved left-pane-02-r1-4-tier1-hint.png');

    // 6. Click Next hint -> Tier 2
    console.log('--- Clicking Show Next Hint (Tier 2) ---');
    await showHintBtn.click();
    await page.waitForTimeout(300);

    const tier2Status = await page.$eval('.hint-status-text', (el) => el.textContent.trim());
    const tier2Text = await page.$eval('.hint-box', (el) => el.textContent.trim());
    console.log('Tier 2 status text:', JSON.stringify(tier2Status));
    console.log('Tier 2 hint content:', JSON.stringify(tier2Text));

    if (!tier2Status.includes('Hint 2 of 3')) {
      throw new Error(`Expected "Hint 2 of 3", got: ${tier2Status}`);
    }

    // 7. Click Next hint -> Tier 3
    console.log('--- Clicking Show Next Hint (Tier 3) ---');
    await showHintBtn.click();
    await page.waitForTimeout(300);

    const tier3Status = await page.$eval('.hint-status-text', (el) => el.textContent.trim());
    const tier3Disabled = await page.$eval('.hint-footer button', (el) => el.disabled);
    console.log('Tier 3 status text:', JSON.stringify(tier3Status));
    console.log('Button disabled on Tier 3:', tier3Disabled);

    if (!tier3Status.includes('Hint 3 of 3')) {
      throw new Error(`Expected "Hint 3 of 3", got: ${tier3Status}`);
    }
    if (!tier3Disabled) {
      throw new Error('Show hint button should be disabled when all tiers shown');
    }

    // Screenshot 3: r1-4 with Hint 3
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-03-r1-4-tier3-hint.png') });
    console.log('Saved left-pane-03-r1-4-tier3-hint.png');

    // 8. Test Session Persistence: Switch to Lesson 1, then back to r1-4
    console.log('--- Testing Session Persistence across lessons ---');
    await curriculumBtn.click();
    await page.waitForTimeout(400);

    const lesson1Btn = await page.$('.lesson-item:has-text("The Megaphone")');
    await lesson1Btn.click();
    await page.waitForTimeout(600);

    // Verify Lesson 1 starts at 0 hints open
    const l1HintBox = await page.$('.hint-box');
    const l1Status = await page.$eval('.hint-status-text', (el) => el.textContent.trim());
    console.log('Lesson 1 initial hint status:', l1Status, 'hint box present:', Boolean(l1HintBox));
    if (l1HintBox !== null) throw new Error('Lesson 1 should start with hints hidden');

    // Switch back to r1-4
    await curriculumBtn.click();
    await page.waitForTimeout(400);
    const magicAgainBtn = await page.$('.lesson-item:has-text("Magic Name Tag")');
    await magicAgainBtn.click();
    await page.waitForTimeout(600);

    // Verify r1-4 restored Tier 3
    const restoredStatus = await page.$eval('.hint-status-text', (el) => el.textContent.trim());
    const restoredBox = await page.$('.hint-box');
    console.log('Restored r1-4 hint status:', restoredStatus, 'box present:', Boolean(restoredBox));
    if (!restoredStatus.includes('Hint 3 of 3') || !restoredBox) {
      throw new Error(`Session persistence failed! Got status: ${restoredStatus}`);
    }

    // =========================================================================
    // Part 2: Check other lessons in Realm 1
    // =========================================================================
    console.log('--- Checking Other Lessons in Realm 1 ---');

    // Check r1-1 (The Megaphone)
    await curriculumBtn.click();
    await page.waitForTimeout(400);
    await (await page.$('.lesson-item:has-text("The Megaphone")')).click();
    await page.waitForTimeout(500);

    const l1Call = await page.$eval('.example-box code', (el) => el.textContent.trim());
    const l1Expected = await page.$eval('.example-result', (el) => el.textContent.trim());
    console.log('r1-1 call:', l1Call, 'result:', l1Expected);
    if (l1Call.includes('solution(')) throw new Error('r1-1 has generic solution()');
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-04-r1-1-megaphone.png') });
    console.log('Saved left-pane-04-r1-1-megaphone.png');

    // Check r1-2 (Labeled Toy Chest)
    await curriculumBtn.click();
    await page.waitForTimeout(400);
    await (await page.$('.lesson-item:has-text("Labeled Toy Chest")')).click();
    await page.waitForTimeout(500);

    const l2Call = await page.$eval('.example-box code', (el) => el.textContent.trim());
    const l2Expected = await page.$eval('.example-result', (el) => el.textContent.trim());
    console.log('r1-2 call:', l2Call, 'result:', l2Expected);
    if (l2Call.includes('solution(')) throw new Error('r1-2 has generic solution()');
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-05-r1-2-toychest.png') });
    console.log('Saved left-pane-05-r1-2-toychest.png');

    // Check r1-3 (Glowing Text Scroll)
    await curriculumBtn.click();
    await page.waitForTimeout(400);
    await (await page.$('.lesson-item:has-text("Glowing Text Scroll")')).click();
    await page.waitForTimeout(500);

    const l3Call = await page.$eval('.example-box code', (el) => el.textContent.trim());
    const l3Expected = await page.$eval('.example-result', (el) => el.textContent.trim());
    console.log('r1-3 call:', l3Call, 'result:', l3Expected);
    if (l3Call.includes('solution(')) throw new Error('r1-3 has generic solution()');
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-06-r1-3-scroll.png') });
    console.log('Saved left-pane-06-r1-3-scroll.png');

    // Check r1-boss (Mini-Project: Hero Card Generator)
    await curriculumBtn.click();
    await page.waitForTimeout(400);
    await (await page.$('.lesson-item:has-text("Hero Card Generator")')).click();
    await page.waitForTimeout(500);

    const bossCall = await page.$eval('.example-box code', (el) => el.textContent.trim());
    const bossExpected = await page.$eval('.example-result', (el) => el.textContent.trim());
    console.log('r1-boss call:', bossCall, 'result:', bossExpected);
    if (bossCall.includes('solution(')) throw new Error('r1-boss has generic solution()');
    await page.screenshot({ path: path.join(OUT_DIR, 'left-pane-07-r1-boss-project.png') });
    console.log('Saved left-pane-07-r1-boss-project.png');

    await page.close();
    await browser.close();
    console.log('ALL LEFT-PANE QA VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
