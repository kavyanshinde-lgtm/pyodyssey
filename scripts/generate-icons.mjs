import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

async function generate() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const svgContent = fs.readFileSync('public/favicon.svg', 'utf8');

  for (const size of [192, 512]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: ${size}px; height: ${size}px; background: #000000; display: flex; align-items: center; justify-content: center; }
    svg { width: 100%; height: 100%; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

    await page.setContent(html);
    const outPath = path.resolve(`public/icon-${size}.png`);
    await page.screenshot({ path: outPath, omitBackground: false });
    console.log(`Generated ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log('Icons generated successfully.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
