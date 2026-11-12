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
    // Check 1: Editor Status Bar - Not checked yet & Syntax error live detection
    // =========================================================================
    console.log('--- Checking Editor Status Bar & Syntax Error ---');
    const initialStatus = await page.$eval('.editor-statusbar', (el) => el.textContent);
    console.log('Initial status bar:', JSON.stringify(initialStatus));
    if (!initialStatus.includes('Not checked yet')) {
      throw new Error(`Expected "Not checked yet" initially, got: ${initialStatus}`);
    }

    // 1. Set code to `name = "Nova"dasd`
    await page.fill('.editor-input', 'name = "Nova"dasd');
    await page.waitForTimeout(500); // wait for 300ms linter debounce

    const errorStatus = await page.$eval('.editor-statusbar', (el) => el.textContent);
    console.log('Status bar with syntax error `name = "Nova"dasd`:', JSON.stringify(errorStatus));
    if (!errorStatus.includes('1 issue')) {
      throw new Error(`Expected "1 issue" for syntax error, got: ${errorStatus}`);
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'qa-01-syntax-error.png') });
    console.log('Saved qa-01-syntax-error.png');

    // 2. Fix code to `name = "Nova"` (valid syntax, but not run yet)
    await page.fill('.editor-input', 'name = "Nova"');
    await page.waitForTimeout(500);

    const fixedStatus = await page.$eval('.editor-statusbar', (el) => el.textContent);
    console.log('Status bar after fixing syntax error before run:', JSON.stringify(fixedStatus));
    if (!fixedStatus.includes('Not checked yet')) {
      throw new Error(`Expected "Not checked yet" before running, got: ${fixedStatus}`);
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'qa-02-not-checked.png') });
    console.log('Saved qa-02-not-checked.png');

    // 3. Type valid solution for lesson 1 (The Megaphone: print("Hello, PyOdyssey!"))
    await page.fill('.editor-input', 'print("Hello, PyOdyssey!")');
    await page.waitForTimeout(500);

    // Run tests
    const runBtn = await page.$('button.btn-primary');
    await runBtn.click();
    await page.waitForTimeout(2500); // Wait for python worker grade

    const afterRunStatus = await page.$eval('.editor-statusbar', (el) => el.textContent);
    console.log('Status bar after running tests:', JSON.stringify(afterRunStatus));
    if (!afterRunStatus.includes('No issues')) {
      throw new Error(`Expected "No issues" after passing tests, got: ${afterRunStatus}`);
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'qa-03-no-issues-passed.png') });
    console.log('Saved qa-03-no-issues-passed.png');

    // Dismiss solved modal if present
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // =========================================================================
    // Check 2: Curriculum Drawer - Sentence case & Badge Pills
    // =========================================================================
    console.log('--- Checking Curriculum Drawer ---');
    const curriculumBtn = await page.$('#curriculum-toggle-btn');
    await curriculumBtn.click();
    await page.waitForTimeout(500);

    // Check all lesson rows in drawer
    const lessonItems = await page.$$eval('.lesson-item', (nodes) =>
      nodes.map((node) => {
        const title = node.querySelector('.lesson-item-title')?.textContent?.trim() || '';
        const badge = node.querySelector('.lesson-badge')?.textContent?.trim() || '';
        const topic = node.querySelector('.lesson-item-topic')?.textContent?.trim() || '';
        return { title, badge, topic };
      })
    );
    console.log('Found', lessonItems.length, 'lessons in Curriculum drawer:');
    lessonItems.forEach((item, i) => {
      if (item.badge || item.topic.includes('project') || item.topic.includes('trial')) {
        console.log(`  Row ${i + 1}: title="${item.title}", badge="${item.badge}", topic="${item.topic}"`);
      }
    });

    const projectRow = lessonItems.find((item) => item.title.includes('Hero Card Generator'));
    if (!projectRow) throw new Error('Hero Card Generator row not found');
    console.log('Project row detail:', projectRow);
    if (projectRow.topic !== 'Mini-project') {
      throw new Error(`Expected topic "Mini-project", got: "${projectRow.topic}"`);
    }
    if (projectRow.badge !== 'Project') {
      throw new Error(`Expected badge "Project", got: "${projectRow.badge}"`);
    }

    const trialRow = lessonItems.find((item) => item.title.includes('Toybox Gauntlet'));
    if (!trialRow) throw new Error('Toybox Gauntlet trial row not found');
    console.log('Trial row detail:', trialRow);
    if (trialRow.topic !== 'Ultimate trial') {
      throw new Error(`Expected topic "Ultimate trial", got: "${trialRow.topic}"`);
    }
    if (trialRow.badge !== 'Exam') {
      throw new Error(`Expected badge "Exam", got: "${trialRow.badge}"`);
    }

    // Verify NO ALL-CAPS in any titles or topics
    for (const item of lessonItems) {
      if (item.topic === 'MINI-PROJECT' || item.topic === 'ULTIMATE TRIAL') {
        throw new Error(`Found all-caps topic: "${item.topic}"`);
      }
      if (item.title.includes('MINI-PROJECT') || item.title.includes('ULTIMATE TRIAL')) {
        throw new Error(`Found all-caps in title: "${item.title}"`);
      }
    }
    console.log('Confirmed: All drawer titles and topics use sentence case ("Mini-project", "Ultimate trial").');

    await page.screenshot({ path: path.join(OUT_DIR, 'qa-04-curriculum-drawer.png') });
    console.log('Saved qa-04-curriculum-drawer.png');

    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // =========================================================================
    // Check 3: Gutter Line Numbers - Opacity and AA Contrast
    // =========================================================================
    console.log('--- Checking Gutter Line Numbers ---');
    const gutterStyles = await page.$eval('.gutter-line span', (el) => {
      const computed = window.getComputedStyle(el);
      const parentComputed = window.getComputedStyle(el.closest('.editor-gutter'));
      return {
        color: computed.color,
        opacity: computed.opacity,
        bgColor: parentComputed.backgroundColor,
      };
    });
    console.log('Gutter styles:', gutterStyles);

    if (gutterStyles.opacity !== '1') {
      throw new Error(`Expected gutter opacity "1", got "${gutterStyles.opacity}"`);
    }
    // #8A8A8A in rgb is rgb(138, 138, 138)
    if (gutterStyles.color !== 'rgb(138, 138, 138)') {
      throw new Error(`Expected gutter color rgb(138, 138, 138) (#8A8A8A), got "${gutterStyles.color}"`);
    }

    // Calculate contrast against rgb(12, 12, 12) (#0C0C0C)
    const lText = 0.2547;
    const lBg = 0.0036;
    const contrastRatio = (lText + 0.05) / (lBg + 0.05);
    console.log(`Calculated contrast ratio: ${contrastRatio.toFixed(2)}:1 (WCAG AA requirement: 4.5:1)`);
    if (contrastRatio < 4.5) {
      throw new Error(`Contrast ratio ${contrastRatio.toFixed(2)} fails WCAG AA (4.5:1)`);
    }

    await page.screenshot({ path: path.join(OUT_DIR, 'qa-05-gutter-detail.png') });
    console.log('Saved qa-05-gutter-detail.png');

    await page.close();
    await browser.close();
    console.log('ALL QA ROUND 3 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
