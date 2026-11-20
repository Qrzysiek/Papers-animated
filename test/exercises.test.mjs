// Exercises and their solutions, through the Lua filter, for both outputs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'test', 'fixtures');
const run = (to, file = 'exercises.md', extra = []) => {
  const r = spawnSync('pandoc', [file, '-t', to, '--wrap=none', '--lua-filter', path.join(ROOT, 'filters', 'livepaper.lua'), ...extra],
    { cwd: FIX, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

test('latex: the bibliography closes the main text, before the solutions', () => {
  const out = run('latex', 'exercises-cite.md', ['--citeproc', '--csl', path.join(ROOT, 'csl', 'ieee.csl')]);
  const refs = out.indexOf('\\begin{CSLReferences}'), sols = out.indexOf('\\section*{Solutions}');
  assert.ok(refs > 0 && sols > refs, 'references before solutions');
  assert.equal((out.match(/\\begin\{CSLReferences\}/g) || []).length, 1, 'one bibliography');
});

test('html: exercises are numbered on their own, the solution sits behind a button', () => {
  const out = run('html5');
  assert.match(out, /Exercise 1<\/span> <span class="lp-tt">\(A sum\)/);
  assert.match(out, /Exercise 2<\/span>\. An exercise without a solution/);
  assert.match(out, /href="#ex-sum"[^>]*>Exercise\s1</);   // \s also matches the no-break space
  assert.match(out, /<button type="button" class="lp-sol-btn" aria-expanded="false" data-sol="ex-sum" data-ex="1">Solution<\/button>/);
  assert.match(out, /<div class="lp-sol" data-sol="ex-sum">\s*<p>Pair the terms/);
  assert.equal((out.match(/lp-sol-btn/g) || []).length, 1, 'only exercises with a solution get a button');
  assert.ok(!out.includes('::: solution') && !out.includes('class="solution"'), 'the solution div is consumed');
});

test('latex: solutions are collected at the end and linked both ways', () => {
  const out = run('latex');
  assert.ok(out.includes('\\begin{exercise}[A sum]\\label{ex:sum}'));
  assert.ok(out.includes('\\hyperref[sol:ex:sum]{Solution, p.~\\pageref*{sol:ex:sum}}'));
  assert.ok(!out.includes('\\hyperref[sol:ex:plain]'), 'no link without a solution');
  const tail = out.slice(out.indexOf('\\section*{Solutions}'));
  assert.ok(tail.length > 20, 'a Solutions section at the end');
  assert.ok(tail.includes('\\paragraph{Solution to \\hyperref[ex:sum]{Exercise 1}.}\\label{sol:ex:sum}'));
  assert.ok(tail.includes('Pair the terms') && tail.includes('A second paragraph'));
  assert.ok(out.indexOf('Pair the terms') > out.indexOf('\\section*{Solutions}'), 'the solution is not printed in place');
});
