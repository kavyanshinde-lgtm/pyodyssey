import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';

const PORT = 5234;
const URL = `http://127.0.0.1:${PORT}`;

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

  const pyodideRequests = [];

  try {
    await waitServer(URL);
    console.log('Server responding. Launching chromium...');

    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    });

    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('pyodide')) {
        pyodideRequests.push({ url: u, method: req.method() });
      }
    });

    const failedRequests = [];
    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
    });

    console.log('Navigating to', URL);
    await page.goto(URL, { waitUntil: 'networkidle' });

    // Wait for editor
    const editor = page.locator('textarea[aria-label="Python code editor"]');
    await editor.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Editor mounted.');

    // Wait for python engine to boot
    console.log('Waiting for Python engine...');
    await page.waitForFunction(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Python 3.12');
    }, { timeout: 20000 });
    console.log('Python status indicates ready.');

    // Solution for lesson 1:
    const solution = `def say_hello(target: str = "PyOdyssey") -> str:
    return f"Hello, {target}!"

print("Hello, PyOdyssey!")`;

    console.log('Filling solution code...');
    await editor.fill(solution);
    await page.waitForTimeout(300);

    console.log('Clicking "Run tests"...');
    const runBtn = page.getByRole('button', { name: 'Run tests' });
    await runBtn.click();

    console.log('Waiting for reward modal...');
    const rewardModal = page.locator('.reward-modal');
    await rewardModal.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Reward modal appeared! Solved in preview.');

    const modalText = await rewardModal.innerText();
    console.log('Modal text snippet:', modalText.replace(/\n+/g, ' ').slice(0, 150));

    await page.screenshot({ path: path.resolve('dist/preview-solved.png') });
    console.log('Saved screenshot to dist/preview-solved.png');

    console.log('Pyodide requests captured:', pyodideRequests);
    console.log('Failed requests count:', failedRequests.length);
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests);
    }

    await browser.close();
  } finally {
    server.kill();
    spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
  }
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
