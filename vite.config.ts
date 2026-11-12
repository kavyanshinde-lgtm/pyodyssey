import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Fix for Windows esbuild temp file sharing / lockup permissions
const localTmp = path.resolve('.tmp');
if (!fs.existsSync(localTmp)) {
  fs.mkdirSync(localTmp, { recursive: true });
}
process.env.TEMP = localTmp;
process.env.TMP = localTmp;

function serviceWorkerAssetsPlugin() {
  return {
    name: 'sw-assets-plugin',
    closeBundle() {
      const distDir = path.resolve('dist');
      const assetsDir = path.resolve(distDir, 'assets');
      const pyodideDir = path.resolve(distDir, 'pyodide');
      const swPath = path.resolve(distDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;

      const assets = fs.existsSync(assetsDir)
        ? fs.readdirSync(assetsDir).map((f) => `./assets/${f}`)
        : [];
      const pyodide = fs.existsSync(pyodideDir)
        ? fs.readdirSync(pyodideDir).map((f) => `./pyodide/${f}`)
        : [];

      const precache = [
        './',
        './index.html',
        './manifest.webmanifest',
        './favicon.svg',
        './icon-192.png',
        './icon-512.png',
        ...assets,
        ...pyodide,
      ];

      let swContent = fs.readFileSync(swPath, 'utf8');
      swContent = swContent.replace(
        /const PRECACHE_ASSETS = \[[\s\S]*?\];/,
        `const PRECACHE_ASSETS = ${JSON.stringify(precache, null, 2)};`
      );
      fs.writeFileSync(swPath, swContent, 'utf8');
      console.log(`[sw-assets-plugin] Injected ${precache.length} assets into dist/sw.js`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorkerAssetsPlugin()],
  server: {
    port: 4177,
    strictPort: false,
    watch: {
      usePolling: true,
      interval: 350,
      ignored: ['**/*.tmpdir/**', '**/.*.tmpdir/**', '**/*.tmp'],
    },
  },
  preview: {
    port: 4177,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
});
