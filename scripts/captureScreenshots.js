import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 5199;
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
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function run() {
  console.log('Building app first...');
  const buildProc = spawn('npm', ['run', 'build'], { shell: true, stdio: 'inherit' });
  await new Promise((res, rej) => {
    buildProc.on('close', (code) => (code === 0 ? res() : rej(new Error('Build failed'))));
  });

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

    // 1. Desktop 1366x768
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Screen 1: Desktop mid-coding
    await page.screenshot({ path: path.join(OUT_DIR, '01-editor-desktop-1366.png') });
    console.log('Captured 01-editor-desktop-1366.png');

    // Screen 2: Predict step open
    const predictBtn = await page.$('button:has-text("Predict output check")');
    if (predictBtn) {
      await predictBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, '02-predict-step-1366.png') });
      console.log('Captured 02-predict-step-1366.png');
    }

    // Screen 3: Curriculum slide-over drawer
    const curriculumBtn = await page.$('#curriculum-toggle-btn');
    if (curriculumBtn) {
      await curriculumBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_DIR, '03-curriculum-drawer-1366.png') });
      console.log('Captured 03-curriculum-drawer-1366.png');
      const closeDrawerBtn = await page.$('.curriculum-close-btn');
      if (closeDrawerBtn) await closeDrawerBtn.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Screen 4: More dropdown menu
    const moreBtn = await page.$('button:has-text("More ▾")');
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT_DIR, '04-more-menu-1366.png') });
      console.log('Captured 04-more-menu-1366.png');
      // toggle closed
      await moreBtn.click();
      await page.waitForTimeout(300);
    }

    // Screen 5: Failed run
    const runTestsBtn = await page.$('button:has-text("Run tests")');
    if (runTestsBtn) {
      await runTestsBtn.click();
      await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(OUT_DIR, '05-failed-run-1366.png') });
      console.log('Captured 05-failed-run-1366.png');
    }

    // Screen 6: Passed run
    const editorInput = await page.$('.editor-input');
    if (editorInput) {
      await editorInput.fill('print("Hello, PyOdyssey!")');
      await page.waitForTimeout(300);
      await runTestsBtn.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT_DIR, '06-passed-run-1366.png') });
      console.log('Captured 06-passed-run-1366.png');
    }

    // Dismiss any reward modal
    const rewardClose = await page.$('.modal-close');
    if (rewardClose) {
      await rewardClose.click();
      await page.waitForTimeout(300);
    }

    // Screen 7: Live Execution Visualizer
    const visualizeBtn = await page.$('button:has-text("Visualize")');
    if (visualizeBtn) {
      await visualizeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT_DIR, '07-visualizer-modal-1366.png') });
      console.log('Captured 07-visualizer-modal-1366.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Screen 8: Curriculum Map Modal
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      const mapBtn = await page.$('button:has-text("Curriculum map")');
      if (mapBtn) {
        await mapBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT_DIR, '08-curriculum-map-1366.png') });
        console.log('Captured 08-curriculum-map-1366.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // Screen 9: Save & Export Modal
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      const saveBtn = await page.$('button:has-text("Save and export")');
      if (saveBtn) {
        await saveBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT_DIR, '09-save-modal-1366.png') });
        console.log('Captured 09-save-modal-1366.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // Screen 10: Review Deck
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      const reviewBtn = await page.$('button:has-text("Review due")');
      if (reviewBtn) {
        await reviewBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT_DIR, '10-review-tab-1366.png') });
        console.log('Captured 10-review-tab-1366.png');
        const backBtn = await page.$('button:has-text("BACK TO CAMPAIGN")');
        if (backBtn) await backBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Screen 11: Sandbox Lab
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(300);
      const sandboxBtn = await page.$('button:has-text("Sandbox playground")');
      if (sandboxBtn) {
        await sandboxBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT_DIR, '11-sandbox-lab-1366.png') });
        console.log('Captured 11-sandbox-lab-1366.png');
        // Return to campaign
        await moreBtn.click();
        await page.waitForTimeout(300);
        const returnBtn = await page.$('button:has-text("Return to campaign")');
        if (returnBtn) await returnBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Screen 12: Light Theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT_DIR, '12-light-theme-1366.png') });
    console.log('Captured 12-light-theme-1366.png');

    await page.close();

    // 2. Mobile 390px wide
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(URL, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    // Screen 13: Mobile editor
    await mobilePage.screenshot({ path: path.join(OUT_DIR, '13-mobile-editor-390.png') });
    console.log('Captured 13-mobile-editor-390.png');

    // Screen 14: Mobile curriculum drawer
    const mobileCurriculumBtn = await mobilePage.$('#curriculum-toggle-btn');
    if (mobileCurriculumBtn) {
      await mobileCurriculumBtn.click();
      await mobilePage.waitForTimeout(400);
      await mobilePage.screenshot({ path: path.join(OUT_DIR, '14-mobile-drawer-390.png') });
      console.log('Captured 14-mobile-drawer-390.png');
    }

    await mobilePage.close();
    await browser.close();
    console.log('All 14 screens successfully captured in screenshots/');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
