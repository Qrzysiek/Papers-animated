// livepaper series: scaffold a series of notes, see which notes need a rebuild or a republish, record publishes.
//   livepaper series new <dir> --title "..." --notes overview:Overview,primer:Primer,...   (first note = hub)
//   livepaper series status [series.json]
//   livepaper series build [series.json] [--pdf]      rebuild every stale note
//   livepaper series published <id> <url> [series.json]  after publishing: store the URL and the artifact's hash
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
function walk(d, out = []) {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(dist|build|node_modules|\.)/.test(e.name)) walk(p, out); } else out.push(p);
  }
  return out;
}
export const loadRegistry = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const saveRegistry = (file, S) => fs.writeFileSync(file, JSON.stringify(S, null, 2) + '\n');

/* files that change a note's output: its folder (minus dist/build), the common file, the bibliography.
   The registry is not among them: what a note takes from it is compared directly (registryDrift). */
function sources(file, S, id) {
  const base = path.dirname(file);
  const dir = path.join(base, S.notes[id].dir || id);
  const out = walk(dir);
  if (S.common) out.push(path.join(base, S.common));
  const refs = path.join(base, 'refs.json');
  if (fs.existsSync(refs)) out.push(refs);
  return out;
}
/* does the series block embedded in the built artifact still match the registry (titles, URLs, the notes listed)? */
function registryDrift(art, S, id) {
  const m = fs.readFileSync(art, 'utf8').match(/window\.LP_SERIES=(\{.*?\});<\/script>/);
  if (!m) return false;
  let E;
  try { E = JSON.parse(m[1]); } catch (e) { return true; }
  for (const [k, n] of Object.entries(E.notes || {})) {
    const r = S.notes[k];
    if (!r || r.title !== n.title) return true;
    if (k !== id && (r.url || null) !== (n.href || null)) return true;
  }
  const listsAll = !(S.menu === 'hub' && S.hub && S.hub !== id);
  return listsAll && Object.keys(S.notes).some(k => !(k in (E.notes || {})));
}

export function seriesStatus(file) {
  const S = loadRegistry(file);
  const base = path.dirname(file);
  return Object.entries(S.notes).map(([id, n]) => {
    const dir = path.join(base, n.dir || id);
    const art = path.join(dir, 'dist', 'artifact.html');
    const pubf = path.join(dir, 'dist', '.published.json');
    const row = { id, title: n.title, dir: path.relative(process.cwd(), dir) || '.', url: n.url || null, hub: S.hub === id };
    row.exists = fs.existsSync(path.join(dir, 'paper.md'));
    row.built = fs.existsSync(art);
    if (row.built) {
      const t = mtime(art);
      row.stale = sources(file, S, id).some(f => mtime(f) > t + 1) || registryDrift(art, S, id);
      const pub = fs.existsSync(pubf) ? JSON.parse(fs.readFileSync(pubf, 'utf8')) : null;
      row.published = pub ? pub.at : null;
      row.changed = pub ? pub.sha !== sha(art) : null;
    }
    row.todo = !row.exists ? 'write' : !row.built ? 'build' : row.stale ? 'rebuild' : !row.url ? 'publish (new)' : row.changed !== false ? 'republish' : '';
    return row;
  });
}

export function markPublished(file, id, url) {
  const S = loadRegistry(file);
  if (!S.notes[id]) throw new Error('no note ' + id + ' in ' + file);
  const dir = path.join(path.dirname(file), S.notes[id].dir || id);
  const art = path.join(dir, 'dist', 'artifact.html');
  if (!fs.existsSync(art)) throw new Error('not built: ' + art);
  if (url && S.notes[id].url !== url) { S.notes[id].url = url; saveRegistry(file, S); }
  fs.writeFileSync(path.join(dir, 'dist', '.published.json'), JSON.stringify({ sha: sha(art), url: S.notes[id].url, at: new Date().toISOString() }, null, 1));
  return S.notes[id];
}

/* ------------------------------------------------------------------ scaffold */
const yq = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
export function seriesNew(dir, opts) {
  dir = path.resolve(dir);
  const file = path.join(dir, 'series.json');
  if (fs.existsSync(file)) throw new Error('series.json already exists in ' + dir);
  const list = String(opts.notes || 'overview:Overview').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf(':');
    return i < 0 ? { id: s, title: s } : { id: s.slice(0, i).trim(), title: s.slice(i + 1).trim() };
  });
  list.forEach(n => { if (!/^[a-z][\w-]*$/.test(n.id)) throw new Error('note id must be lowercase letters, digits, - or _: ' + n.id); });
  fs.mkdirSync(path.join(dir, 'briefs'), { recursive: true });
  const S = { title: opts.title || 'Notes', hub: list[0].id, menu: 'hub', common: 'common.md', notes: {} };
  list.forEach(n => { S.notes[n.id] = { title: n.title, dir: n.id, url: null }; });
  saveRegistry(file, S);
  fs.writeFileSync(path.join(dir, 'common.md'), `---
# Front matter shared by every note of the series (read before each paper.md; a note's own values win, macros merge).
# Paths are relative to each note's folder.
author: ${yq(opts.author || 'Author')}
date: ${yq(opts.date || String(new Date().getFullYear()))}
footer-right: ${yq(S.title)}
bibliography: ../refs.json
macros:
  tr: '\\operatorname{tr}'
---
`);
  if (!fs.existsSync(path.join(dir, 'refs.json'))) fs.writeFileSync(path.join(dir, 'refs.json'), '[]\n');
  fs.writeFileSync(path.join(dir, 'notation.md'), `# Notation for "${S.title}"

One table, read by every note's author before writing. Add a row before using a new symbol in more than one note;
macros used by several notes go into common.md.

| Symbol | Meaning | Convention / normalisation | Macro |
|:--|:--|:--|:--|
| | | | |
`);
  list.forEach((n, k) => {
    const nd = path.join(dir, n.id);
    fs.mkdirSync(path.join(nd, 'sections'), { recursive: true });
    fs.mkdirSync(path.join(nd, 'figures'), { recursive: true });
    fs.writeFileSync(path.join(nd, 'paper.md'), `---
title: ${yq(n.title)}
subtitle: ""
pagetitle: ${yq(n.title.split(/\s+/).slice(0, 4).join(' '))}
runhead: ${yq(n.title)}
topics: ""
keywords: []
abstract: |
  One paragraph: what the note shows and why it matters.
series: ../series.json
series-id: ${n.id}
sections:
  - sections/01-intro.md
---
`);
    fs.writeFileSync(path.join(nd, 'sections', '01-intro.md'), `# Introduction {#sec:intro}

${k === 0 ? 'This note is the hub of the series: its map links to every companion note, for example [the next note](note:' + (list[1] || list[0]).id + ').' : 'Background is in [the overview](note:' + list[0].id + ').'}
`);
    fs.writeFileSync(path.join(dir, 'briefs', n.id + '.md'), `# Brief: ${n.title} (\`${n.id}\`)

Role: ${k === 0 ? 'hub / overview' : 'companion'}. Target length: 10-14 pages.

## Scope
-

## Sections (with the one result each must derive)
1.

## Results to verify (script + test for each number or closed form)
-

## Figures (data from the script; LP.chart / LP.diagram unless bespoke)
-

## References (arXiv ids or DOIs; add with \`livepaper bib add\`)
-

## Links
- background:
- exercises / agenda:
`);
  });
  return { dir, file, notes: list.map(n => n.id) };
}
