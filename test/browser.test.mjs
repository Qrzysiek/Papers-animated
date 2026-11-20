// Headless layout and interaction checks (skipped when no Chromium-family browser is installed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtml } from '../src/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test', '.out');
let browserMod = null;
try { browserMod = await import('../src/browser.mjs'); await (await browserMod.launch()).close(); } catch (e) { browserMod = null; }

test('demo lays out without overflow, errors or sideways scrolling', { skip: !browserMod && 'no browser' }, async () => {
  const r = buildHtml(path.join(ROOT, 'examples', 'demo', 'paper.md'), { out: OUT });
  const c = await browserMod.checkPaper(r.file, path.join(OUT, 'check'), { interact: true });
  const rep = c.report;
  assert.deepEqual(c.consoleErrors, []);
  assert.deepEqual(rep.errors, []);
  assert.deepEqual(rep.overflows, []);
  assert.deepEqual(rep.wideEquations, []);
  assert.deepEqual(rep.missingRefs, []);
  assert.deepEqual(rep.katexErrors, []);
  assert.equal(rep.figures, 2);
  assert.ok(rep.scenes.find(s => s.id === 'sc-demo' && s.els >= 4 && s.figs === 1), 'scene collects its step elements and figure');
  assert.ok(rep.scenes.find(s => s.id === 'abstract' && s.figs === 1), 'figure attached to the abstract scene');
  assert.ok(c.mobile.scrollWidth <= c.mobile.innerWidth, 'no sideways scroll at phone width');
  assert.equal(c.mobile.mode, 'reflow');
  const errs = (c.interaction.find(x => x.errors) || {}).errors || [];
  assert.deepEqual(errs, []);
  assert.ok(fs.existsSync(path.join(OUT, 'check', 'page-01.png')));
});

test('a long paragraph is split across columns and pages', { skip: !browserMod && 'no browser' }, async () => {
  const dir = path.join(OUT, 'long');
  fs.mkdirSync(dir, { recursive: true });
  const para = Array.from({ length: 60 }, (_, i) => `Sentence number ${i + 1} with inline math $x_{${i}}^2$ and some words to fill the line.`).join(' ');
  // six long paragraphs: about two pages, so paragraphs must split across columns and pages
  fs.writeFileSync(path.join(dir, 'paper.md'), `---\ntitle: Long\n---\n\n# One\n\n${Array(6).fill(para).join('\n\n')}\n`);
  const r = buildHtml(path.join(dir, 'paper.md'), { out: path.join(dir, 'dist') });
  const c = await browserMod.checkPaper(r.file, path.join(dir, 'check'), { interact: false });
  assert.ok(c.report.pages >= 2, 'several pages');
  assert.deepEqual(c.report.overflows, []);
  assert.deepEqual(c.consoleErrors, []);
});

test('columns fit at every zoom, also after a resize', { skip: !browserMod && 'no browser' }, async () => {
  // Text breaks into lines slightly differently at different zooms, so pages must be typeset at the zoom
  // they are shown at; otherwise a column measured at zoom 1 overflows and its last line is cut in half.
  const dir = path.join(OUT, 'zoom');
  fs.mkdirSync(dir, { recursive: true });
  const words = ['complexity', 'of', 'a', 'unitary', 'geodesic', 'penalty', 'is', 'the', 'length', 'Hamiltonian', 'curvature', 'at'];
  const para = k => Array.from({ length: 90 }, (_, i) => words[(i * 7 + k) % words.length] + (i % 9 === 4 ? ` $e^{-iH_{${i}}t}$` : '')).join(' ') + '.';
  const md = `---\ntitle: Zoom\n---\n\n# One\n\n${Array.from({ length: 24 }, (_, k) => para(k)).join('\n\n')}\n`;
  fs.writeFileSync(path.join(dir, 'paper.md'), md);
  const r = buildHtml(path.join(dir, 'paper.md'), { out: path.join(dir, 'dist') });
  const url = 'file:///' + r.file.replace(/\\/g, '/') + '?mode=paper&static';
  const overflowing = () => Array.from(document.querySelectorAll('#lp-stage .col'))
    .filter(c => c.firstChild.offsetHeight + c.lastChild.offsetHeight > c.clientHeight + 1).length;
  const browser = await browserMod.launch();
  try {
    for (const width of [700, 1000, 1150]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(url);
      await page.waitForFunction(() => window.LP_READY === true);
      assert.equal(await page.evaluate(overflowing), 0, `no overflowing column at width ${width}`);
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(url);
    await page.waitForFunction(() => window.LP_READY === true);
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForTimeout(1500);   // resize debounce, overflow check, re-typesetting
    assert.equal(await page.evaluate(overflowing), 0, 'no overflowing column after a resize');
  } finally { await browser.close(); }
});

test('exercises: the solution button opens a panel that stays open until closed', { skip: !browserMod && 'no browser' }, async () => {
  const dir = path.join(OUT, 'exercises');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'test', 'fixtures', 'exercises.md'), path.join(dir, 'paper.md'));
  const r = buildHtml(path.join(dir, 'paper.md'), { out: path.join(dir, 'dist') });
  const url = 'file:///' + r.file.replace(/\\/g, '/') + '?static';
  const state = () => { const t = document.querySelector('.lp-tip'), b = document.querySelector('.lp-sol-btn');
    return { shown: !t.hidden, sol: t.classList.contains('lp-tip-sol'), text: t.textContent, exp: b.getAttribute('aria-expanded'),
      visibleSol: getComputedStyle(document.querySelector('#lp-stage .lp-sol')).display }; };
  const browser = await browserMod.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.LP_READY === true);
    assert.equal((await page.evaluate(state)).visibleSol, 'none', 'the solution is hidden in the page');
    await page.locator('.lp-sol-btn').click(); await page.waitForTimeout(200);
    let s = await page.evaluate(state);
    assert.ok(s.shown && s.sol && s.exp === 'true' && s.text.startsWith('Solution to Exercise 1') && s.text.includes('A second paragraph'));
    const box = await page.locator('.lp-tip').boundingBox();
    await page.mouse.click(box.x + 15, box.y + box.height - 8); await page.waitForTimeout(150);
    assert.ok((await page.evaluate(state)).shown, 'a click inside the panel keeps it open');
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    s = await page.evaluate(state);
    assert.ok(!s.shown && s.exp === 'false', 'Escape closes it');
    await page.locator('.lp-sol-btn').click(); await page.waitForTimeout(150);
    await page.locator('.lp-sol-btn').click(); await page.waitForTimeout(150);
    assert.ok(!(await page.evaluate(state)).shown, 'a second click on the button closes it');
    assert.deepEqual(errs, []);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await ctx.newPage();
    await phone.goto(url);
    await phone.waitForFunction(() => window.LP_READY === true);
    await phone.locator('.lp-sol-btn').tap(); await phone.waitForTimeout(250);
    assert.ok((await phone.evaluate(state)).shown, 'a tap opens it on a phone');
    await ctx.close();
  } finally { await browser.close(); }
});

test('tooltips: taps on a touch screen, hover and click with a mouse', { skip: !browserMod && 'no browser' }, async () => {
  // A tap sends emulated mouseover and click events after the touch ones; hover handling must not act on them,
  // or the tap that opens an abstract closes it again at once.
  const dir = path.join(OUT, 'tips');
  fs.mkdirSync(dir, { recursive: true });
  const fill = 'Words that fill the section so that the reference list sits further down the page. '.repeat(12);
  fs.writeFileSync(path.join(dir, 'refs.json'), JSON.stringify([{ id: 'ref1', type: 'article-journal', title: 'A paper',
    author: [{ family: 'Author', given: 'A.' }], 'container-title': 'J. Tests', issued: { 'date-parts': [[2020]] },
    'x-summary': 'One-line summary.', abstract: 'The full abstract, with math $x^2$.' }]));
  fs.writeFileSync(path.join(dir, 'paper.md'), `---\ntitle: Tips\nbibliography: refs.json\n---\n\n# One {#sec:one}\n\n` +
    `See @sec:two and the paper [@ref1]. ${fill}\n\n# Two {#sec:two}\n\n${fill}\n\n# References\n`);
  const r = buildHtml(path.join(dir, 'paper.md'), { out: path.join(dir, 'dist') });
  const url = 'file:///' + r.file.replace(/\\/g, '/') + '?static';
  const state = () => { const t = document.querySelector('.lp-tip');
    return { shown: !t.hidden, abs: t.classList.contains('lp-tip-abs'), go: !!t.querySelector('.tip-go'), sc: Math.round(scrollY), hash: location.hash }; };
  const browser = await browserMod.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.LP_READY === true);
    const ent = page.locator('.csl-entry').first();
    await ent.tap({ position: { x: 60, y: 5 } }); await page.waitForTimeout(300);
    let s = await page.evaluate(state);
    assert.ok(s.shown && s.abs, 'a tap on an entry opens its abstract (and it stays open)');
    await ent.tap({ position: { x: 60, y: 5 } }); await page.waitForTimeout(300);
    assert.ok(!(await page.evaluate(state)).shown, 'a second tap closes it');
    const cite = page.locator('.citation a').first();
    await cite.scrollIntoViewIfNeeded();
    const s0 = await page.evaluate(state);
    await cite.tap(); await page.waitForTimeout(300);
    s = await page.evaluate(state);
    assert.ok(s.shown && !s.abs && s.go, 'a tap on a citation previews it');
    assert.equal(s.hash, s0.hash, 'without following it yet');
    const box = await page.locator('.lp-tip').boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 5); await page.waitForTimeout(800);
    s = await page.evaluate(state);
    assert.ok(!s.shown && s.hash === '#ref-ref1', 'tapping the preview follows the link');
    const xr = page.locator('a.xref[href="#sec-two"]').first();
    await xr.scrollIntoViewIfNeeded();
    await xr.tap(); await page.waitForTimeout(300);
    assert.ok((await page.evaluate(state)).shown, 'a tap on a cross-reference previews it');
    await xr.tap(); await page.waitForTimeout(800);
    assert.equal((await page.evaluate(state)).hash, '#sec-two', 'a second tap on the same link follows it');
    assert.deepEqual(errs, []);
    await ctx.close();

    const desk = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    await desk.goto(url);
    await desk.waitForFunction(() => window.LP_READY === true);
    const dent = desk.locator('.csl-entry').first();
    await dent.scrollIntoViewIfNeeded();
    await dent.hover({ position: { x: 60, y: 5 } }); await desk.waitForTimeout(200);
    assert.ok((await desk.evaluate(state)).abs, 'hovering an entry shows its abstract');
    await desk.mouse.move(2, 2); await desk.waitForTimeout(200);
    assert.ok(!(await desk.evaluate(state)).shown, 'leaving it hides the abstract');
    const dcite = desk.locator('.citation a').first();
    await dcite.scrollIntoViewIfNeeded();
    await dcite.hover(); await desk.waitForTimeout(200);
    s = await desk.evaluate(state);
    assert.ok(s.shown && !s.go, 'hovering a citation previews it, without the tap hint');
    await dcite.click(); await desk.waitForTimeout(800);
    assert.equal((await desk.evaluate(state)).hash, '#ref-ref1', 'a click follows it at once');
  } finally { await browser.close(); }
});
