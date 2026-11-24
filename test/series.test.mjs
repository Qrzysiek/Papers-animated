// Series tools: scaffold, shared front matter, hub navigation, status and publish records; bibliography helpers (offline).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtml } from '../src/build.mjs';
import { seriesNew, seriesStatus, markPublished } from '../src/series.mjs';
import { mdAbstract, splitName, parseIds, entryFromArxiv } from '../src/bib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test', '.out', 'series');
const lpSeries = file => JSON.parse(fs.readFileSync(file, 'utf8').match(/window\.LP_SERIES=(\{.*?\});<\/script>/)[1]);

test('series new: hub registry, common front matter, briefs; hub menu embeds only linked notes', () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const r = seriesNew(OUT, { title: 'Test series', notes: 'hub:The Hub,a:Note A,b:Note B,c:Note C' });
  assert.deepEqual(r.notes, ['hub', 'a', 'b', 'c']);
  for (const f of ['series.json', 'common.md', 'refs.json', 'notation.md', 'briefs/a.md', 'a/paper.md', 'a/sections/01-intro.md']) assert.ok(fs.existsSync(path.join(OUT, f)), f);
  const S = JSON.parse(fs.readFileSync(path.join(OUT, 'series.json'), 'utf8'));
  assert.equal(S.hub, 'hub'); assert.equal(S.menu, 'hub'); assert.equal(S.common, 'common.md');
  // a macro from common.md is available in every note, and a note's own macro is added to it
  fs.writeFileSync(path.join(OUT, 'a', 'sections', '01-intro.md'), '# Intro {#sec:intro}\n\nSee [B](note:b#sec-intro) and $\\tr\\rho=\\one$.\n');
  fs.writeFileSync(path.join(OUT, 'a', 'paper.md'), fs.readFileSync(path.join(OUT, 'a', 'paper.md'), 'utf8').replace('series: ../series.json', "macros:\n  one: '\\mathbb 1'\nseries: ../series.json"));
  const ra = buildHtml(path.join(OUT, 'a', 'paper.md'));
  assert.deepEqual(ra.katexErrors, [], 'common and own macros both defined');
  const sa = lpSeries(ra.artifact);
  assert.deepEqual(Object.keys(sa.notes).sort(), ['a', 'b', 'hub'], 'note a embeds the hub, itself and the note it links to, not c');
  const rh = buildHtml(path.join(OUT, 'hub', 'paper.md'));
  assert.deepEqual(Object.keys(lpSeries(rh.artifact).notes).sort(), ['a', 'b', 'c', 'hub'], 'the hub lists every note');
  const footer = fs.readFileSync(ra.file, 'utf8');
  assert.ok(footer.includes('Test series'), 'footer-right from common.md');
});

test('series status: build, publish, republish only when the artifact changed', () => {
  const reg = path.join(OUT, 'series.json');
  let st = Object.fromEntries(seriesStatus(reg).map(r => [r.id, r.todo]));
  assert.equal(st.a, 'publish (new)'); assert.equal(st.b, 'build');
  markPublished(reg, 'a', 'https://claude.ai/artifact/AAA');
  st = Object.fromEntries(seriesStatus(reg).map(r => [r.id, r.todo]));
  assert.equal(st.a, '', 'published and unchanged');
  // B gets a URL: A links to B, so A's artifact changes and needs republishing; C does not link to B
  buildHtml(path.join(OUT, 'c', 'paper.md'));
  markPublished(reg, 'c', 'https://claude.ai/artifact/CCC');
  const S = JSON.parse(fs.readFileSync(reg, 'utf8')); S.notes.b.url = 'https://claude.ai/artifact/BBB'; fs.writeFileSync(reg, JSON.stringify(S, null, 2));
  const before = fs.readFileSync(path.join(OUT, 'c', 'dist', 'artifact.html'), 'utf8');
  buildHtml(path.join(OUT, 'a', 'paper.md')); buildHtml(path.join(OUT, 'c', 'paper.md'));
  assert.equal(fs.readFileSync(path.join(OUT, 'c', 'dist', 'artifact.html'), 'utf8'), before, 'C is unchanged by B getting a URL');
  st = Object.fromEntries(seriesStatus(reg).map(r => [r.id, r.todo]));
  assert.equal(st.a, 'republish'); assert.equal(st.c, '');
});

test('bib helpers: identifiers, names, abstracts, entries', () => {
  assert.deepEqual(parseIds(['arXiv:2202.06957v2', 'quant-ph/0502070', 'doi:10.1103/PhysRevX.9.041017', 'nielsen=https://arxiv.org/abs/quant-ph/0603161'])
    .map(i => [i.kind, i.id, i.key]), [['arxiv', '2202.06957', null], ['arxiv', 'quant-ph/0502070', null], ['doi', '10.1103/PhysRevX.9.041017', null], ['arxiv', 'quant-ph/0603161', 'nielsen']]);
  assert.throws(() => parseIds(['nonsense']));
  assert.deepEqual(splitName('Jan de Boer'), { family: 'de Boer', given: 'Jan' });
  assert.deepEqual(splitName('Michael A. Nielsen'), { family: 'Nielsen', given: 'Michael A.' });
  assert.equal(mdAbstract('We find $O(n^2)$ gates_and *stars* \\emph{here} \\(x\\).'), 'We find $O(n^2)$ gates\\_and \\*stars\\* here $x$.');
  const e = entryFromArxiv({ id: '1812.08657', title: 'A Universal Operator Growth Hypothesis', authors: ['Daniel E. Parker', 'Xiangyu Cao'], published: '2018-12-20', abstract: 'Text.' },
    null, { container: 'Phys. Rev. X', volume: '9', page: '041017', year: 2019, doi: '10.1103/PhysRevX.9.041017' });
  assert.equal(e.type, 'article-journal'); assert.equal(e['container-title'], 'Phys. Rev. X'); assert.equal(e.issued['date-parts'][0][0], 2019);
  const p = entryFromArxiv({ id: '2202.06957', title: 'Quantum chaos and the complexity of spread of states', authors: ['V. Balasubramanian'], published: '2022-02-14', abstract: '' }, null, null);
  assert.equal(p.type, 'article'); assert.equal(p.number, '2202.06957');
});
