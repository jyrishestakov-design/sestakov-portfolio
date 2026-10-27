// Brauseritestid (Playwright).
//   node tests/e2e.mjs baseline <kaust>   — pildista praegune leht
//   node tests/e2e.mjs compare <kaust> [--skip-header]  — võrdle baseline'iga
//   node tests/e2e.mjs check              — funktsionaalsed testid
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8765;
const URL = `http://localhost:${PORT}/`;
const VIEWS = [
  { name: 'dark', width: 1280, scheme: 'dark' },
  { name: 'light', width: 1280, scheme: 'light' },
  { name: 'phone', width: 390, scheme: 'dark' }
];

function startServer() {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  return new Promise((res) => setTimeout(() => res(srv), 700));
}

// Liikuvad osad peidetakse, et pildid oleksid võrreldavad
async function freeze(page) {
  await page.addStyleTag({ content: '#grain,#tc,#ride{visibility:hidden!important} *{animation:none!important;transition:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function openPage(browser, view, { fixture, query = '' } = {}) {
  const page = await browser.newPage({ viewport: { width: view.width, height: 900 }, colorScheme: view.scheme });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (fixture) {
    const body = readFileSync(path.join(ROOT, 'tests/fixtures', fixture), 'utf8');
    await page.route('**/content/site.json*', (r) => r.fulfill({ body, contentType: 'application/json' }));
  }
  await page.route(/youtube\.com|vimeo\.com/, (r) => r.fulfill({ body: '', contentType: 'text/html' }));
  await page.goto(URL + query, { waitUntil: 'load' });
  await page.waitForSelector('#logList .entry, main section', { timeout: 8000 }).catch(() => {});
  page.errors = errors;
  return page;
}

async function shootAll(browser, dir) {
  mkdirSync(dir, { recursive: true });
  for (const v of VIEWS) {
    const page = await openPage(browser, v);
    await page.waitForSelector('#logList .entry');
    await freeze(page);
    await page.screenshot({ path: path.join(dir, `${v.name}.png`), fullPage: true });
    await page.close();
  }
}

function diffRatio(a, b, skipHeader) {
  const py = `
import sys
from PIL import Image, ImageChops
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
if a.size!=b.size: print('SIZE', a.size, b.size); sys.exit()
skip=int(sys.argv[3])
if skip:
    a=a.crop((0,skip,a.size[0],a.size[1])); b=b.crop((0,skip,b.size[0],b.size[1]))
d=ImageChops.difference(a,b).convert('L').point(lambda p: 255 if p>16 else 0)
print(d.histogram()[255]/(d.size[0]*d.size[1]))
`;
  return execFileSync('python3', ['-c', py, a, b, String(skipHeader ? 60 : 0)]).toString().trim();
}

async function check(browser) {
  const results = [];
  const t = async (name, fn) => {
    try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' — ' + e.message]); }
  };
  const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
  const ok = (c, msg) => { if (!c) throw new Error(msg); };
  const checks = (await import('./e2e-checks.mjs')).default;
  await checks({ browser, openPage, freeze, t, eq, ok, VIEWS });
  results.forEach(([s, n]) => console.log(s, n));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`# pass ${results.length - failed}\n# fail ${failed}`);
  return failed;
}

const [mode, dir, flag] = process.argv.slice(2);
const srv = await startServer();
const browser = await chromium.launch();
let code = 0;
try {
  if (mode === 'baseline') {
    await shootAll(browser, dir);
    console.log('baseline saved to', dir);
  } else if (mode === 'compare') {
    const cur = path.join(dir, '_current');
    await shootAll(browser, cur);
    for (const v of VIEWS) {
      const r = diffRatio(path.join(dir, `${v.name}.png`), path.join(cur, `${v.name}.png`), flag === '--skip-header');
      const pass = !r.startsWith('SIZE') && Number(r) <= 0.00002;
      if (!pass) code = 1;
      console.log(pass ? 'PASS' : 'FAIL', v.name, r);
    }
  } else if (mode === 'check') {
    code = (await check(browser)) ? 1 : 0;
  } else {
    console.log('kasutus: baseline|compare|check'); code = 2;
  }
} finally {
  await browser.close();
  srv.kill();
}
process.exit(code);
