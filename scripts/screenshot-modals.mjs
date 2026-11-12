import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 5202;
const URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve(process.cwd(), 'dist/modals');

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
  console.log('Building project before preview...');
  const build = spawn('npm', ['run', 'build'], { shell: true, stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    build.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
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

    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Screenshot SaveModal
    console.log('Opening SaveModal...');
    await page.evaluate(() => {
      window.__setReward(null);
      window.__setModal('save');
    });
    await page.waitForSelector('.save-modal', { state: 'visible' });
    await page.waitForTimeout(400);
    const saveShot = path.join(OUT_DIR, 'save-modal.png');
    await page.screenshot({ path: saveShot });
    console.log('Saved:', saveShot);

    // 2. Screenshot Standard RewardModal
    console.log('Opening RewardModal (standard)...');
    await page.evaluate(() => {
      window.__setModal(null);
      window.__setReward(window.__createDummyReward(false));
    });
    await page.waitForSelector('.reward-modal', { state: 'visible' });
    await page.waitForTimeout(400);
    const rewardShot = path.join(OUT_DIR, 'reward-modal.png');
    await page.screenshot({ path: rewardShot });
    console.log('Saved:', rewardShot);

    // 3. Screenshot Trial RewardModal
    console.log('Opening RewardModal (trial)...');
    await page.evaluate(() => {
      window.__setModal(null);
      window.__setReward(window.__createDummyReward(true));
    });
    await page.waitForSelector('.trial-reward', { state: 'visible' });
    await page.waitForTimeout(400);
    const trialRewardShot = path.join(OUT_DIR, 'trial-reward-modal.png');
    await page.screenshot({ path: trialRewardShot });
    console.log('Saved:', trialRewardShot);

    await browser.close();
    console.log('All modal screenshots captured successfully.');
  } finally {
    server.kill();
    // On windows spawn kill might need taskkill
    spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { shell: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
