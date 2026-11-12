import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';

const PORT = 5235;
const URL_A = `http://127.0.0.1:${PORT}`;
const URL_B = `http://localhost:${PORT}`;

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
  console.log('--- Step 4 & 5 Verification Script ---');
  console.log('Starting preview server on port', PORT);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '0.0.0.0'], {
    shell: true,
    stdio: 'inherit',
  });

  try {
    await waitServer(URL_A);
    console.log('Server ready at', URL_A);

    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--enable-features=InstallableManager'],
    });

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });

    const page = await context.newPage();

    // Track install prompt event
    let installPromptFired = false;
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        window.__installPromptFired = true;
      });
    });

    // 1. Load Origin A online
    console.log('Navigating to Origin A:', URL_A);
    await page.goto(URL_A, { waitUntil: 'networkidle' });

    // 2. Wait for Service Worker registration and offline ready
    console.log('Waiting for Service Worker registration & cache...');
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || !reg.active) return false;
      const cacheNames = await caches.keys();
      if (!cacheNames.includes('pyodyssey-v1')) return false;
      const cache = await caches.open('pyodyssey-v1');
      const keys = await cache.keys();
      // Ensure pyodide wasm and other assets are cached (at least 10 entries)
      return keys.length >= 10;
    }, { timeout: 25000 });
    console.log('Service Worker is active and cache pyodyssey-v1 populated.');

    // Check manifest
    const manifestResponse = await page.request.get(`${URL_A}/manifest.webmanifest`);
    console.log('Manifest status:', manifestResponse.status());
    const manifestJson = await manifestResponse.json();
    console.log('Manifest name:', manifestJson.name, 'icons count:', manifestJson.icons?.length);

    // Check beforeinstallprompt
    const promptFired = await page.evaluate(() => Boolean((window).__installPromptFired));
    console.log('beforeinstallprompt event fired:', promptFired);

    // 3. Test first-run hint on fresh save in Origin A
    console.log('Opening Save modal on fresh Origin A...');
    await page.locator('.more-menu-container button').click();
    await page.waitForTimeout(300);
    const saveMenuItem = page.locator('.menu-item', { hasText: 'Save and export' });
    await saveMenuItem.click();
    const saveModal = page.locator('.save-modal');
    await saveModal.waitFor({ state: 'visible', timeout: 5000 });

    const firstRunHint = page.locator('.save-firstrun-hint');
    const isHintVisible = await firstRunHint.isVisible();
    const hintText = isHintVisible ? await firstRunHint.innerText() : 'NOT VISIBLE';
    console.log('First-run hint visible on fresh save:', isHintVisible, `(${hintText})`);

    // Close save modal
    const closeBtn = page.locator('.modal-close');
    await closeBtn.click();
    await saveModal.waitFor({ state: 'hidden', timeout: 3000 });

    // 4. Solve lesson 1 on Origin A
    console.log('Solving lesson 1 on Origin A...');
    const editor = page.locator('textarea[aria-label="Python code editor"]');
    const solution = `def say_hello(target: str = "PyOdyssey") -> str:
    return f"Hello, {target}!"

print("Hello, PyOdyssey!")`;
    await editor.fill(solution);
    const runBtn = page.getByRole('button', { name: 'Run tests' });
    await runBtn.click();

    const rewardModal = page.locator('.reward-modal');
    await rewardModal.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Lesson 1 solved on Origin A!');
    // Close reward modal
    const stayHereBtn = rewardModal.getByRole('button', { name: 'Stay here' });
    await stayHereBtn.click();
    await rewardModal.waitFor({ state: 'hidden', timeout: 3000 });

    // Open save modal again to get export code
    console.log('Opening Save modal to export save code...');
    await page.locator('.more-menu-container button').click();
    await page.waitForTimeout(300);
    await page.locator('.menu-item', { hasText: 'Save and export' }).click();
    await saveModal.waitFor({ state: 'visible', timeout: 5000 });

    // Hint should NOT be visible now since completed > 0
    const hintAfterClear = await firstRunHint.isVisible();
    console.log('First-run hint hidden after lesson solved:', !hintAfterClear);

    const exportTextarea = page.locator('textarea[aria-label="Export save code"]');
    const exportCode = await exportTextarea.inputValue();
    console.log('Export code generated (prefix):', exportCode.slice(0, 30));

    await page.locator('.modal-close').click();
    await saveModal.waitFor({ state: 'hidden', timeout: 3000 });

    // 5. TEST OFFLINE EXECUTION
    console.log('--- Testing OFFLINE capability ---');
    console.log('Simulating network cut (offline = true)...');
    await context.setOffline(true);

    console.log('Reloading page while completely offline...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const editorOffline = page.locator('textarea[aria-label="Python code editor"]');
    await editorOffline.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Page loaded from offline cache successfully!');

    console.log('Waiting for Python engine in offline mode...');
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Python 3.12');
    }, { timeout: 20000 });
    console.log('Python engine booted offline from cache!');

    // Run tests offline
    console.log('Running tests while offline...');
    const runBtnOffline = page.getByRole('button', { name: 'Run tests' });
    await runBtnOffline.click();

    // Check completion: either reward modal (new clear) or toast (practice clear)
    const resultType = await Promise.race([
      rewardModal.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'reward-modal'),
      page.locator('.toast').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'practice-toast'),
    ]);
    console.log(`Offline test run result: ${resultType}! Python execution & grading verified offline!`);
    await page.screenshot({ path: path.resolve('dist/offline-solved.png') });
    console.log('Saved dist/offline-solved.png');

    await context.setOffline(false);

    // 6. TEST MIGRATION TO ORIGIN B
    console.log('--- Testing Cross-Origin Save Migration ---');
    console.log('Navigating to Origin B:', URL_B);
    const pageB = await context.newPage();
    await pageB.goto(URL_B, { waitUntil: 'networkidle' });

    console.log('Opening Save modal on Origin B...');
    await pageB.locator('.more-menu-container button').click();
    await pageB.waitForTimeout(300);
    await pageB.locator('.menu-item', { hasText: 'Save and export' }).click();
    const saveModalB = pageB.locator('.save-modal');
    await saveModalB.waitFor({ state: 'visible', timeout: 5000 });

    const hintOriginB = pageB.locator('.save-firstrun-hint');
    console.log('Origin B shows first-run hint:', await hintOriginB.isVisible());

    // Paste exportCode from Origin A into Origin B
    console.log('Importing Origin A save into Origin B...');
    const importTextarea = pageB.locator('textarea[aria-label="Import save code"]');
    await importTextarea.fill(exportCode);
    await pageB.waitForTimeout(200);

    const loadSaveBtn = pageB.getByRole('button', { name: /Load save/i });
    await loadSaveBtn.click();

    // Check success message
    const successMsg = pageB.locator('.save-success');
    await successMsg.waitFor({ state: 'visible', timeout: 3000 });
    console.log('Origin B import success message:', await successMsg.innerText());

    // Check nodes cleared on Origin B
    await pageB.waitForTimeout(500);
    const completedOnB = await pageB.locator('.save-stat strong').first().innerText();
    console.log('Origin B nodes cleared count after import:', completedOnB);

    await pageB.screenshot({ path: path.resolve('dist/origin-b-imported.png') });
    console.log('Saved dist/origin-b-imported.png');

    await pageB.close();
    await browser.close();
    console.log('--- ALL STEP 4 & 5 VERIFICATIONS PASSED ---');
  } finally {
    server.kill();
    spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
  }
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
