// The reference-notes filter: summaries under entries (HTML and LaTeX), abstracts as hidden tooltip bodies (HTML only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'test', 'fixtures');
const run = (to, extra = []) => {
  const r = spawnSync('pandoc', ['refnotes.md', '-t', to, '--wrap=none', '--lua-filter', path.join(ROOT, 'filters', 'livepaper.lua'),
    '--citeproc', '--lua-filter', path.join(ROOT, 'filters', 'refnotes.lua'), '--csl', path.join(ROOT, 'csl', 'ieee.csl'), ...extra],
    { cwd: FIX, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};
const entryOf = (out, key) => {
  const i = out.indexOf(`id="ref-${key}"`);
  assert.ok(i >= 0, 'missing entry ' + key);
  const j = out.indexOf('id="ref-', i + 1);
  return out.slice(i, j < 0 ? undefined : j);
};

test('html: summary under the entry, full abstract in a hidden div', () => {
  const out = run('html5', ['--math-method=mathjax']);
  const full = entryOf(out, 'full');
  assert.match(full, /<span class="ref-sum">Short <em>summary<\/em> with <span class="math inline">\\\(x\^2\\\)<\/span>\.<\/span>/);
  // one block per paragraph: the HTML writer would otherwise flatten them into one run of text
  assert.match(full, /<div class="ref-abs">\s*<div class="ref-abs-p">\s*The full abstract, first paragraph\.\s*<\/div>\s*<div class="ref-abs-p">\s*Second paragraph with <span class="math inline">/);
  const sum = entryOf(out, 'sumonly');
  assert.match(sum, /<span class="ref-sum">Only a summary\.<\/span>/);
  assert.match(sum, /<div class="ref-abs">\s*No abstract is published for this work\.\s*<\/div>/);
  const plain = entryOf(out, 'plain');
  assert.ok(!plain.includes('ref-sum') && !plain.includes('ref-abs'), 'entries without notes are left alone');
});

test('latex: summary as an italic line, no abstract', () => {
  const out = run('latex');
  assert.match(out, /\\newline\{\\itshape Short \\emph\{summary\} with \\\(x\^2\\\)\.\}/);
  assert.match(out, /\\newline\{\\itshape Only a summary\.\}/);
  assert.ok(!out.includes('full abstract') && !out.includes('No abstract'), 'abstracts are HTML only');
});
