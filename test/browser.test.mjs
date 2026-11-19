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
