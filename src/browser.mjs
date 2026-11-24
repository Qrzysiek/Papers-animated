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

/* all page screenshots on one image (5 per row, 300 px wide), numbered; pages in `bad` get a thick outline */
export async function contactSheet(browser, shots, file, bad = new Set(), opts = {}) {
  const per = opts.per || 5, w = opts.width || 300;
  const cells = shots.map(s => `<figure${bad.has(s.n) ? ' class="bad"' : ''}><img src="data:image/png;base64,${fs.readFileSync(s.f).toString('base64')}"><figcaption>${s.n}${bad.has(s.n) ? ' · check' : ''}</figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#888;font:600 15px system-ui,sans-serif}
    main{display:grid;grid-template-columns:repeat(${per},${w}px);gap:10px;padding:10px;width:max-content}
    figure{margin:0;background:#fff;outline:1px solid #555}figure.bad{outline:5px solid #d00}
    img{display:block;width:${w}px}figcaption{padding:2px 6px;background:#222;color:#fff}figure.bad figcaption{background:#d00}</style><main>${cells}</main>`;
  const p = await browser.newPage({ viewport: { width: per * (w + 10) + 10, height: 600 }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.waitForFunction(() => Array.from(document.images).every(i => i.complete));
  await p.locator('main').screenshot({ path: file });
  await p.close();
  return file;
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
    out.lint = await page.evaluate(() => ({ figures: window.LP.lintFigures ? window.LP.lintFigures() : [], pages: window.LP.lintPages ? window.LP.lintPages() : {} }));
    const sheets = await page.$$('.lp-pages > .sheet');
    const only = opts.pages ? new Set(opts.pages) : null;
    const pageShots = [];
    for (let i = 0; i < sheets.length; i++) {
      if (only && !only.has(i + 1)) continue;
      const f = path.join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`);
      await sheets[i].screenshot({ path: f });
      out.shots.push(f);
      pageShots.push({ n: i + 1, f });
    }
    // contact sheet: every page on one image, pages with problems outlined, so one look judges the whole layout
    if (pageShots.length && opts.sheet !== false) {
      const bad = new Set();
      const r = out.report;
      [].concat(r.overflows || [], r.wideEquations || [], r.widthOverflow || [], r.stranded || [], out.lint.figures || [], (out.lint.pages || {}).sparse || [])
        .forEach(x => x && x.page && bad.add(x.page));
      out.sheet = path.join(outDir, 'sheet.png');
      await contactSheet(browser, pageShots, out.sheet, bad);
    }
    // a sharp crop of every figure the lint flagged, with the labels in question boxed in red
    out.lintShots = [];
    if ((out.lint.figures || []).length && opts.lintShots !== false) {
      const z = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
      await z.goto(urlOf(htmlFile, 'static&bare&mode=paper&theme=light'));
      await ready(z);
      await z.evaluate(() => { const q = document.getElementById('lp-zoom'); q.value = '1'; q.dispatchEvent(new Event('change')); });
      const figs = await z.evaluate(() => {
        const found = window.LP.lintFigures();
        const by = {};
        found.forEach(x => { (by[x.fig] = by[x.fig] || []).push(x); });
        return Object.entries(by).map(([fig, xs]) => {
          const el = document.getElementById(fig) || document.querySelector('figure[data-live="' + fig + '"]');
          if (!el) return null;
          const fr = el.getBoundingClientRect();
          el.style.position = 'relative';
          xs.forEach((x, i) => {
            const d = document.createElement('div');
            d.style.cssText = `position:absolute;left:${x.box[0] - fr.left - 2}px;top:${x.box[1] - fr.top - 2}px;width:${x.box[2] + 4}px;height:${x.box[3] + 4}px;outline:2px solid #e00;z-index:9;pointer-events:none`;
            const n = document.createElement('b');
            n.textContent = String(i + 1);
            n.style.cssText = 'position:absolute;left:-2px;top:-14px;font:700 11px sans-serif;color:#fff;background:#e00;padding:0 3px';
            d.appendChild(n);
            el.appendChild(d);
          });
          el.setAttribute('data-lint-shot', fig);
          return fig;
        }).filter(Boolean);
      });
      for (const fig of figs) {
        const f = path.join(outDir, 'lint-' + fig.replace(/[^\w-]/g, '_') + '.png');
        await z.locator(`[data-lint-shot="${fig}"]`).screenshot({ path: f });
        out.lintShots.push(f);
      }
      await z.close();
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

/* ------------------------------------------------------------------ devices
   Load the paper with phone and tablet profiles (WebKit = the engine of every iOS browser, or Chromium) and check what
   a reader on that device meets: the mode chosen, columns that overflow, sideways scrolling, runtime errors, and taps
   on a citation (preview, then follow), on a reference entry (abstract), on a solution button and on Play. */
export const DEVICE_SETS = {
  ios: ['iPad Pro 11', 'iPad Pro 11 landscape', 'iPad Mini', 'iPhone 13', 'iPhone SE'],
};
async function launchEngine(engine) {
  if (engine !== 'webkit') return launch();
  const { webkit } = require('playwright-core');
  const exe = process.env.LIVEPAPER_WEBKIT || (() => {
    const base = path.join(process.env.LOCALAPPDATA || path.join(process.env.HOME || '', '.cache'), 'ms-playwright');
    const dir = fs.existsSync(base) ? fs.readdirSync(base).filter(d => /^webkit-\d+$/.test(d)).sort().pop() : null;
    if (!dir) return null;
    const cand = ['Playwright.exe', 'pw_run.sh', 'minibrowser-gtk/pw_run.sh', 'Playwright.app/Contents/MacOS/Playwright'].map(f => path.join(base, dir, f));
    return cand.find(f => fs.existsSync(f)) || null;
  })();
  if (!exe) throw new Error('WebKit not found: run `npx playwright-core install webkit` in the toolkit folder, or set LIVEPAPER_WEBKIT');
  return webkit.launch({ executablePath: exe });
}
export async function checkDevices(htmlFile, outDir, opts = {}) {
  const { devices } = require('playwright-core');
  fs.mkdirSync(outDir, { recursive: true });
  const engine = opts.engine || 'webkit';
  const browser = await launchEngine(engine);
  const results = [];
  try {
    for (const name of opts.devices || DEVICE_SETS.ios) {
      const d = devices[name];
      if (!d) { results.push({ device: name, problems: ['unknown device profile'] }); continue; }
      const ctx = await browser.newContext(Object.assign({}, d, engine === 'webkit' ? {} : { defaultBrowserType: undefined }));
      const page = await ctx.newPage();
      if (process.env.LIVEPAPER_TRACE) await page.addInitScript(() => {   // debugging aid: tooltip and input events
        window.__lpTrace = [];
        const T = () => Math.round(performance.now());
        const push = m => window.__lpTrace.push(T() + ' ' + m);
        addEventListener('DOMContentLoaded', () => {
          const t = document.querySelector('.lp-tip');
          if (t) new MutationObserver(() => push('tip ' + (t.hidden ? 'hidden' : 'shown ' + t.className))).observe(t, { attributes: true, attributeFilter: ['hidden'] });
        });
        ['pointerdown', 'click', 'touchstart', 'scrollend'].forEach(k => addEventListener(k, e => push(e.type + (e.pointerType ? '/' + e.pointerType : '') + ' ' +
          String((e.target && (e.target.className || e.target.tagName)) || '').slice(0, 30)), true));
      });
      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      const r = { device: name, viewport: d.viewport, problems: [], taps: {} };
      await page.goto(urlOf(htmlFile));
      await ready(page);
      await page.waitForTimeout(400);
      Object.assign(r, await page.evaluate(() => {
        const cols = Array.from(document.querySelectorAll('#lp-stage .col'));
        const over = cols.filter(c => c.firstChild.offsetHeight + c.lastChild.offsetHeight > c.clientHeight + 1).length;
        const rep = window.LP.report();
        return { mode: rep.mode, pages: rep.pages, overflowCols: over, scrollWidth: document.documentElement.scrollWidth, innerWidth,
          zoom: (document.getElementById('lp-zoom') || {}).value, lpErrors: window.LP.errors.slice() };
      }));
      if (r.overflowCols) r.problems.push(r.overflowCols + ' column(s) overflow');
      if (r.scrollWidth > r.innerWidth + 1) r.problems.push(`scrolls sideways (${r.scrollWidth} > ${r.innerWidth})`);
      const slug = name.replace(/\W+/g, '-').toLowerCase();
      await page.screenshot({ path: path.join(outDir, slug + '.png') });
      const tip = () => page.evaluate(() => { const t = document.querySelector('.lp-tip');
        return { shown: !!t && !t.hidden, abs: !!t && t.classList.contains('lp-tip-abs'), go: !!(t && t.querySelector('.tip-go')), hash: location.hash }; });
      // a reader taps once the page has stopped moving: wait until a smooth scroll (a followed link) has settled
      const settle = () => page.evaluate(() => new Promise(res => {
        let last = -1, same = 0, n = 0;
        const t = setInterval(() => { same = scrollY === last ? same + 1 : 0; last = scrollY; if (same >= 3 || ++n > 40) { clearInterval(t); res(); } }, 100);
      }));
      // citation: first tap previews, a tap on the preview follows it (tried twice: a tap near the preview's edge
      // can land on the text under it)
      const cite = page.locator('#lp-stage .citation a:visible').first();
      if (await cite.count()) {
        for (let attempt = 0; attempt < 2 && !r.taps.citeFollow; attempt++) {
          await cite.evaluate(e => e.scrollIntoView({ block: 'center' })); await settle();
          await cite.tap(); await page.waitForTimeout(350);
          let s = await tip();
          r.taps.citePreview = s.shown && s.go;
          if (!s.shown) continue;
          const box = await page.locator('.lp-tip').boundingBox();
          // the preview must open next to its link (below it, or above when there is no room below)
          const cb = await cite.boundingBox();
          r.previewBoxes = { link: cb, preview: box };
          r.taps.previewNearLink = !!cb && ((box.y >= cb.y + cb.height - 2 && box.y <= cb.y + cb.height + 40) ||
            (box.y + box.height <= cb.y + 2 && box.y + box.height >= cb.y - 40));
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 5); await page.waitForTimeout(400);
          await settle();
          s = await tip();
          r.taps.citeFollow = !s.shown && /^#ref-/.test(s.hash);
          r.citeAfterFollow = s;
          if (process.env.LIVEPAPER_TRACE) r.trace = await page.evaluate(() => window.__lpTrace.slice(-40));
        }
      }
      // reference entry: a tap opens its abstract
      const ent = page.locator('#lp-stage .csl-entry:visible').first();
      if (await ent.count()) {
        await ent.evaluate(e => e.scrollIntoView({ block: 'center' })); await settle();   // not under the sticky bar
        const eb = await ent.boundingBox();
        if (eb) { await page.touchscreen.tap(eb.x + Math.min(60, eb.width / 3), eb.y + 4); await page.waitForTimeout(350); }
        const s = await tip();
        r.taps.abstract = s.shown && s.abs;
        await page.touchscreen.tap(5, Math.round(d.viewport.height / 2)); await page.waitForTimeout(200);
      }
      // solution button
      const sol = page.locator('#lp-stage .lp-sol-btn:visible').first();
      if (await sol.count()) {
        await sol.evaluate(e => e.scrollIntoView({ block: 'center' })); await settle();
        await sol.tap(); await page.waitForTimeout(350);
        r.taps.solution = (await tip()).shown;
        await page.keyboard.press('Escape');
      }
      // Play / Pause on the scene in view (it may already be playing on its own): a tap must toggle it
      const play = page.locator('#lp-play');
      if (await play.count() && await play.isVisible()) {
        const before = (await play.textContent()).trim();
        await play.tap(); await page.waitForTimeout(500);
        const after = (await play.textContent()).trim();
        r.taps.play = before !== after;
        await play.tap();
      }
      for (const [k, v] of Object.entries(r.taps)) if (v === false) r.problems.push('tap test failed: ' + k);
      r.errors = errs.concat(r.lpErrors || []);
      delete r.lpErrors;
      r.errors.forEach(e => r.problems.push('error: ' + e));
      results.push(r);
      await ctx.close();
    }
  } finally { await browser.close(); }
  return results;
}
