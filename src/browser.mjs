// Headless browser helpers: snapshots of live figures for LaTeX, and `livepaper check`.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

export async function launch() {
  const { chromium } = require('playwright-core');
  const exe = process.env.LIVEPAPER_BROWSER || CANDIDATES.find(p => fs.existsSync(p));
  if (!exe) throw new Error('No Chromium-family browser found. Set LIVEPAPER_BROWSER to a chrome/msedge executable.');
  return chromium.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--font-render-hinting=none'] });
}
const urlOf = (file, q = '') => pathToFileURL(file).href + (q ? '?' + q : '');
async function ready(page, timeout = 60000) {
  await page.waitForFunction(() => window.LP_READY === true, null, { timeout });
}

/* render every live figure at its snapshot step to build/snap/<name>.pdf (vector) */
export async function snapFigures(htmlFile, outDir, names, log = () => {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await launch();
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    for (const name of names) {
      await page.goto(urlOf(htmlFile, 'fig=' + encodeURIComponent(name) + '&theme=light&static'));
      await ready(page);
      const box = await page.evaluate(() => {
        const a = document.querySelector('.lp-bare figure');
        if (!a) return null;
        const r = a.getBoundingClientRect();
        return { w: Math.ceil(r.right + 1), h: Math.ceil(r.bottom + 1) };
      });
      if (!box) { results.push({ name, ok: false, error: 'figure not found' }); continue; }
      const file = path.join(outDir, name + '.pdf');
      await page.addStyleTag({ content: `@media print{@page{size:${box.w}px ${box.h}px;margin:0}}` });
      await page.pdf({ path: file, printBackground: true, preferCSSPageSize: true, pageRanges: '1' });
      results.push({ name, ok: true, file });
      log(`  snap ${name} (${box.w}x${box.h})`);
    }
    if (errs.length) results.push({ name: '(page errors)', ok: false, error: errs.join('\n') });
  } finally { await browser.close(); }
  return results;
}

/* load the paper, collect the layout report, screenshot every page, test the controls */
export async function checkPaper(htmlFile, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (/\.png$/.test(f)) fs.unlinkSync(path.join(outDir, f));
  const browser = await launch();
  const out = { consoleErrors: [], shots: [], mobile: null, interaction: [] };
  try {
    // 1. static paper layout
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: opts.scale || 1 });
    page.on('console', m => { if (m.type() === 'error') out.consoleErrors.push(m.text()); });
    page.on('pageerror', e => out.consoleErrors.push(String(e)));
    await page.goto(urlOf(htmlFile, 'static&bare&mode=paper&theme=' + (opts.theme || 'light')));
    await ready(page);
    await page.evaluate(() => { const z = document.getElementById('lp-zoom'); z.value = '1'; z.dispatchEvent(new Event('change')); });
    out.report = await page.evaluate(() => window.LP.report());
    const sheets = await page.$$('.lp-pages > .sheet');
    const only = opts.pages ? new Set(opts.pages) : null;
    for (let i = 0; i < sheets.length; i++) {
      if (only && !only.has(i + 1)) continue;
      const f = path.join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`);
      await sheets[i].screenshot({ path: f });
      out.shots.push(f);
    }
    // 2. phone width, reflow
    const m = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1 });
    m.on('pageerror', e => out.consoleErrors.push('[mobile] ' + e));
    await m.goto(urlOf(htmlFile, 'static&theme=dark'));
    await ready(m);
    out.mobile = await m.evaluate(() => ({ mode: window.LP.report().mode, scrollWidth: document.documentElement.scrollWidth, innerWidth }));
    const mf = path.join(outDir, 'mobile-dark.png');
    await m.screenshot({ path: mf });
    out.shots.push(mf);
    // 3. interaction: play, step, keys, sliders, mode/theme switches
    if (opts.interact !== false) {
      const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
      p.on('pageerror', e => out.consoleErrors.push('[interact] ' + e));
      await p.goto(urlOf(htmlFile, 'mode=paper'));
      await ready(p);
      const r = await p.evaluate(async () => {
        const log = [];
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const LP = window.LP;
        const scenes = Array.from(LP.player.scenes.values()).filter(s => s.steps.length > 1);
        for (const sc of scenes.slice(0, 40)) {
          const a = sc.anchors[0];
          if (!a) continue;
          a.scrollIntoView({ block: 'center' });
          await sleep(120);
          LP.player.activate(sc);
          LP.player.goto(1); await sleep(30);
          LP.player.step(1); await sleep(30);
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
          log.push({ scene: sc.id, k: sc.k });
        }
        const ranges = Array.from(document.querySelectorAll('.lp-ctrl input[type=range]'));
        ranges.forEach(inp => { inp.value = String((+inp.min + +inp.max) / 2); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.value = inp.max; inp.dispatchEvent(new Event('input', { bubbles: true })); });
        document.querySelectorAll('.lp-ctrl select').forEach(s => { if (s.options.length > 1) { s.selectedIndex = s.options.length - 1; s.dispatchEvent(new Event('change', { bubbles: true })); } });
        log.push({ sliders: ranges.length });
        document.getElementById('lp-theme').value = 'dark'; document.getElementById('lp-theme').dispatchEvent(new Event('change'));
        document.getElementById('lp-mode').click(); await sleep(200);
        log.push({ reflowFigures: document.querySelectorAll('.reflow figure[data-live] svg').length });
        document.getElementById('lp-mode').click(); await sleep(200);
        log.push({ errors: LP.errors.slice() });
        return log;
      });
      out.interaction = r;
    }
  } finally { await browser.close(); }
  return out;
}
