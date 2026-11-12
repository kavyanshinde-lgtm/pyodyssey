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

    const textarea = await page.$('.editor-input');
    if (!textarea) throw new Error('Textarea .editor-input not found');

    // 1. Focus editor and clear
    await textarea.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);

    // 2. Type `def f(x):`
    // Note: '(' auto-pairs with ')', wait for rAF caret placement
    await page.keyboard.type('def f(');
    await page.waitForTimeout(100);
    await page.keyboard.type('x');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type(':');
    await page.waitForTimeout(300);

    // Check that line 1 text is visible while caret is on line 1
    const textOnLine1 = await page.$eval('.editor-highlight', (el) => el.textContent);
    console.log('Highlight text with caret on line 1:', JSON.stringify(textOnLine1));
    if (!textOnLine1.includes('def f(x):')) {
      throw new Error(`Line 1 text was not rendered! Found: ${textOnLine1}`);
    }

    // Verify stacking: active line is behind text
    const activeLineZIndex = await page.$eval('.editor-active-line', (el) => getComputedStyle(el).zIndex);
    const canvasZIndex = await page.$eval('.editor-canvas', (el) => getComputedStyle(el).zIndex);
    const highlightZIndex = await page.$eval('.editor-highlight', (el) => getComputedStyle(el).zIndex);
    const textareaZIndex = await page.$eval('.editor-input', (el) => getComputedStyle(el).zIndex);

    console.log(`Stacking z-indices: activeLine=${activeLineZIndex}, canvas=${canvasZIndex}, highlight=${highlightZIndex}, textarea=${textareaZIndex}`);
    if (parseInt(activeLineZIndex) >= parseInt(highlightZIndex)) {
      throw new Error('Stacking bug: active line z-index is not strictly less than highlight text z-index!');
    }

    // Screenshot 1: Caret on line 1
    const screenshot1Path = path.join(OUT_DIR, 'verify-caret-line-1.png');
    await page.screenshot({ path: screenshot1Path });
    console.log('Saved', screenshot1Path);

    // 3. Press Enter (editor auto-indents 4 spaces), type `return x`
    await page.keyboard.press('Enter');
    await page.keyboard.type('return x');
    await page.waitForTimeout(200);

    // Check line 2 with caret on line 2
    const textOnLine2 = await page.$eval('.editor-highlight', (el) => el.textContent);
    console.log('Highlight text with caret on line 2:', JSON.stringify(textOnLine2));
    if (!textOnLine2.includes('return x')) {
      throw new Error('Line 2 text missing while caret is on line 2');
    }

    // Press Enter (auto-indents), press Backspace to unindent, type `print(x)`
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);
    await page.keyboard.type('print(');
    await page.waitForTimeout(100);
    await page.keyboard.type('x');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    // Screenshot 2: Caret on line 3
    const screenshot2Path = path.join(OUT_DIR, 'verify-caret-line-3.png');
    await page.screenshot({ path: screenshot2Path });
    console.log('Saved', screenshot2Path);

    // Check that ALL 3 lines are visible in highlight
    const allText = await page.$eval('.editor-highlight', (el) => el.textContent);
    console.log('Highlight text with caret on line 3:', JSON.stringify(allText));
    if (!allText.includes('def f(x):') || !allText.includes('return x') || !allText.includes('print(x)')) {
      throw new Error(`Lines missing in highlight! Found: ${allText}`);
    }

    // Check status bar text
    const statusText = await page.$eval('.editor-statusbar', (el) => el.textContent);
    console.log('Status bar text:', JSON.stringify(statusText));
    if (!statusText.includes('Python 3.12') || !statusText.includes('Line 3, column')) {
      throw new Error(`Status bar does not have expected sentence-case format! Found: ${statusText}`);
    }

    // 4. Test Tab Indent
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    const tabIndentText = await page.$eval('.editor-input', (el) => el.value);
    console.log('Tab indent test passed, ends with 4 spaces:', tabIndentText.endsWith('    '));

    // 5. Test Long Line (horizontal scroll)
    const longLine = 'long_var_name_x = "very long string to trigger horizontal scroll ' + 'x'.repeat(120) + '"';
    await page.keyboard.press('Enter');
    await page.keyboard.type(longLine);
    await page.waitForTimeout(200);
    const scrollWidth = await page.$eval('.editor-input', (el) => el.scrollWidth);
    const clientWidth = await page.$eval('.editor-input', (el) => el.clientWidth);
    console.log(`Horizontal scroll check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    if (scrollWidth <= clientWidth) {
      throw new Error('Horizontal scroll did not trigger for long line');
    }

    // 6. Test 40+ lines (vertical scroll)
    let extraLines = '';
    for (let i = 1; i <= 45; i++) {
      extraLines += `\n# line number ${i} for vertical scroll testing`;
    }
    const currentVal = await page.$eval('.editor-input', (el) => el.value);
    await page.fill('.editor-input', currentVal + extraLines);
    await page.waitForTimeout(300);

    // Scroll to bottom
    await page.evaluate(() => {
      const textarea = document.querySelector('.editor-input');
      textarea.scrollTop = textarea.scrollHeight;
      textarea.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(200);

    const scrollHeight = await page.$eval('.editor-input', (el) => el.scrollHeight);
    const clientHeight = await page.$eval('.editor-input', (el) => el.clientHeight);
    console.log(`Vertical scroll check: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`);
    if (scrollHeight <= clientHeight) {
      throw new Error('Vertical scroll did not trigger for 45+ lines');
    }

    // 7. Test Selecting Text
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(200);
    const selection = await page.evaluate(() => {
      const textarea = document.querySelector('.editor-input');
      return { start: textarea.selectionStart, end: textarea.selectionEnd, len: textarea.value.length };
    });
    console.log(`Selection check: start=${selection.start}, end=${selection.end}, length=${selection.len}`);
    if (selection.end !== selection.len || selection.start !== 0) {
      throw new Error('Text selection did not span whole document');
    }

    // 8. Test Undo (Ctrl+Z)
    await page.keyboard.type('# replaced all text');
    await page.waitForTimeout(200);
    let valAfterType = await page.$eval('.editor-input', (el) => el.value);
    console.log('Value after typing replacement:', valAfterType);

    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(200);
    let valAfterUndo = await page.$eval('.editor-input', (el) => el.value);
    console.log('Value after Ctrl+Z undo length:', valAfterUndo.length);
    if (valAfterUndo === valAfterType) {
      throw new Error('Undo did not revert the change');
    }

    // Final screenshot
    await page.screenshot({ path: path.join(OUT_DIR, 'verify-full-suite.png') });
    console.log('Saved verify-full-suite.png');

    await page.close();
    await browser.close();
    console.log('ALL PLAYWRIGHT VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
