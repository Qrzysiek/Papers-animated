// The Lua filter, run through pandoc on the fixture, for both outputs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'test', 'fixtures');
const run = (to, extra = []) => {
  const r = spawnSync('pandoc', ['basic.md', '-t', to, '--wrap=none', '--lua-filter', path.join(ROOT, 'filters', 'livepaper.lua'),
    '--citeproc', '--csl', path.join(ROOT, 'csl', 'ieee.csl'), ...extra], { cwd: FIX, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return { out: r.stdout, err: r.stderr };
};

test('html: cross-references are numbered and linked', () => {
  const { out, err } = run('html5', ['--math-method=mathjax', '--shift-heading-level-by=1']);
  assert.equal(err.trim(), '', 'no filter warnings');
  for (const s of ['>Sec. 2<', '>Fig. 1<', '>Theorem 1<', '>(1)<', '>(2)<', '>Table 1<', '>Algorithm 1<', '>Sec. 2.1<'])
    assert.ok(out.includes(s), 'missing ' + s);
  assert.match(out, /<span class="num">1<\/span>Introduction/);
  assert.match(out, /<span class="num">A<\/span>Appendix/);
});

test('html: equations become numbered blocks; the paragraph continues after them', () => {
  const { out } = run('html5', ['--math-method=mathjax', '--shift-heading-level-by=1']);
  assert.match(out, /<div class="eq" id="eq-ea" data-n="1">/);
  assert.match(out, /<span class="eqno">\(1\)<\/span><\/div>\s*<p class="cont">/);
});

test('html: scenes, step spans, figures, algorithms and the data block', () => {
  const { out } = run('html5', ['--math-method=mathjax', '--shift-heading-level-by=1']);
  const data = JSON.parse(out.match(/<script type="application\/json" id="lp-data">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(data.scenes.map(s => s.id), ['abstract', 'sc-demo']);
  assert.equal(data.macros['\\ket'], '\\left|#1\\right\\rangle');
  assert.equal(data.labels['eq-ea'].num, '1');
  assert.match(out, /<span class="lp-s s1" data-scene="sc-demo">a phrase<\/span>/);
  assert.match(out, /<figure class="lp-fig" id="fig-demo" data-scene="sc-demo" data-live="demo" data-src="figures\/demo.js" data-snap="2">/);
  assert.match(out, /<li class="lv0"><span class="n"><\/span>\s*<strong>Input:<\/strong>/);
  assert.match(out, /<li class="lv1" data-l="2"><span class="n">2<\/span>/);
});

test('latex: labels, environments, floats and one \\appendix', () => {
  const { out } = run('latex', ['-M', 'lp-snapdir=snaps']);
  for (const s of ['\\begin{equation}\\label{eq:ea}', '\\eqref{eq:ea}', 'Sec.~\\ref{sec:geo}', '\\begin{theorem}[Lower bound]\\label{thm:main}',
    '\\begin{proof}', '\\begin{tabularx}', '\\begin{algorithm}[htbp]', '\\includegraphics', 'snaps/demo.pdf', '\\begin{lptake}{Takeaway}'])
    assert.ok(out.includes(s), 'missing ' + s);
  assert.equal(out.split('\\appendix').length - 1, 1);
  assert.ok(!out.includes('lp-s'), 'no live-only classes leak into LaTeX');
});
