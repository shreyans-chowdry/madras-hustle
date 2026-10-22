// Headless end-to-end harness: serves dist/ from memory, maps the three.js CDN to a local copy (so it runs offline),
// boots the game and runs a scenario module.   node tools/e2e/run.mjs tools/e2e/loops.mjs
// Needs: npm i (playwright + three@0.160.0 in tools/e2e), a Chromium (PLAYWRIGHT_CHROMIUM or Playwright's own).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const DIST = process.env.DIST || path.resolve(HERE, '../../dist');
const TM = process.env.THREE_DIR || path.join(HERE, 'node_modules/three');
const scenario = process.argv[2] ? (await import(path.resolve(process.argv[2]))).default : null;
const exe = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' || process.env.VERBOSE) console.log('[console.' + m.type() + ']', m.text().slice(0, 400)); });
await page.route('**/*', async route => {
  const u = new URL(route.request().url());
  if (u.hostname === 'cdn.jsdelivr.net') { const rel = u.pathname.replace(/^\/npm\/three@0\.160\.0\//, ''); const f = path.join(TM, rel); if (fs.existsSync(f)) return route.fulfill({ body: fs.readFileSync(f), contentType: 'application/javascript' }); return route.fulfill({ status: 404 }); }
  if (u.hostname === 'game.local') { const f = path.join(DIST, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname)); if (fs.existsSync(f)) return route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.html') ? 'text/html' : f.endsWith('.json') ? 'application/json' : f.endsWith('.glb') ? 'model/gltf-binary' : 'application/octet-stream' }); return route.fulfill({ status: 404 }); }
  return route.abort();
});
await page.addInitScript(() => { window.__norender = true; });
const t0 = Date.now();
await page.goto('http://game.local/');
await page.waitForFunction(() => window.__mh || /wrong/.test(document.getElementById('loadtext')?.textContent || ''), null, { timeout: 600000 });
console.log('boot', (Date.now() - t0) / 1000 + 's', await page.evaluate(() => document.getElementById('loadtext').textContent));
let result = null;
if (scenario) result = await scenario(page);
console.log(errors.length ? errors.join('\n') : 'NO PAGE ERRORS');
if (result !== null) console.log('RESULT', JSON.stringify(result, null, 1));
await browser.close();
const failed = result && result.failed ? result.failed.length : 0;
process.exit(errors.length || failed ? 1 : 0);
