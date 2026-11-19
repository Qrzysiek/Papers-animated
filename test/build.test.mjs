// The build step: single-file HTML, artifact fragment, KaTeX prerendering, figure inlining.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtml, inputs, paths } from '../src/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEMO = path.join(ROOT, 'examples', 'demo', 'paper.md');
const OUT = path.join(ROOT, 'test', '.out');

test('demo builds into index.html and artifact.html', () => {
  const r = buildHtml(DEMO, { out: OUT });
  assert.deepEqual(r.katexErrors, []);
  assert.deepEqual(r.missingFigures, []);
  assert.deepEqual(r.figures.sort(), ['dot', 'loop']);
  const full = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  const frag = fs.readFileSync(path.join(OUT, 'artifact.html'), 'utf8');
  assert.match(full, /^<!doctype html>/);
  assert.ok(!/<html[\s>]|<body[\s>]|<!doctype/i.test(frag), 'artifact fragment has no document skeleton');
  assert.match(frag, /^<title>Live Paper Template<\/title>/);
  assert.ok(!/<span class="math (inline|display)">/.test(full), 'all math prerendered');
  assert.ok(full.includes('class="katex"'));
  assert.ok(full.includes('LP.figure("dot"'), 'figure modules inlined');
  assert.ok(!/src="https?:\/\/[^"]+\.js"/.test(full), 'no external scripts');
  assert.ok(!/url\(fonts\//.test(full), 'KaTeX fonts inlined');
});

test('series: note links resolve per build (local file, published URL, planned)', () => {
  const root = fs.mkdtempSync(path.join(OUT, 'series-'));
  fs.writeFileSync(path.join(root, 'series.json'), JSON.stringify({ title: 'S', notes: {
    a: { title: 'Note A', dir: 'a', url: 'https://claude.ai/artifact/AAA' },
    b: { title: 'Note B', dir: 'b', url: 'https://claude.ai/artifact/BBB' },
    c: { title: 'Note C', dir: 'c', url: null } } }));
  const mk = (id, body) => {
    fs.mkdirSync(path.join(root, id), { recursive: true });
    fs.writeFileSync(path.join(root, id, 'paper.md'), `---\ntitle: ${id}\nseries: ../series.json\nseries-id: ${id}\n---\n\n# Sec {#sec:x}\n\n${body}\n`);
    return path.join(root, id, 'paper.md');
  };
  buildHtml(mk('b', 'Note B.'), {});
  const r = buildHtml(mk('a', 'See [B](note:b#sec-x), [C](note:c) and [here](note:a#sec-x).'), {});
  const full = fs.readFileSync(r.file, 'utf8');
  const frag = fs.readFileSync(r.artifact, 'utf8');
  // relative from a/dist/ to b/dist/index.html
  assert.match(full, /<a href="\.\.\/\.\.\/b\/dist\/index\.html#sec-x" target="_blank" rel="noopener" class="note-link">B<\/a>/);
  assert.match(frag, /<a href="https:\/\/claude\.ai\/artifact\/BBB#sec-x" target="_blank" rel="noopener" class="note-link">B<\/a>/);
  assert.match(frag, /<span class="note-planned"[^>]*>C<\/span>/);
  assert.match(frag, /<a href="#sec-x">here<\/a>/);
  assert.match(frag, /window\.LP_SERIES=\{"title":"S","self":"a"/);
});

test('sections: front matter list is appended in order', () => {
  const dir = fs.mkdtempSync(path.join(OUT, 'sec-'));
  fs.writeFileSync(path.join(dir, 'paper.md'), '---\ntitle: T\nsections:\n  - a.md\n  - "b.md"\n---\n');
  fs.writeFileSync(path.join(dir, 'a.md'), '# A\n');
  fs.writeFileSync(path.join(dir, 'b.md'), '# B\n');
  const files = inputs(paths(path.join(dir, 'paper.md'))).map(f => path.basename(f));
  assert.deepEqual(files, ['paper.md', 'a.md', 'b.md']);
});
