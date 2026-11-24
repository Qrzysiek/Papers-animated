// livepaper build: Markdown -> single-file live HTML (+ artifact fragment) and, optionally, LaTeX -> PDF.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const katex = require('katex');
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILTER = path.join(ROOT, 'filters', 'livepaper.lua');
const CSL = path.join(ROOT, 'csl', 'ieee.csl');
const REFNOTES = path.join(ROOT, 'filters', 'refnotes.lua');   // runs after citeproc: reference summaries + abstracts
const RUNTIME = ['core.js', 'kit.js', 'charts.js', 'paginate.js', 'player.js', 'ui.js', 'lint.js'].map(f => path.join(ROOT, 'runtime', f));

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const unescapeHtml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const fwd = p => p.split(path.sep).join('/');

export function paths(paperFile, opts = {}) {
  const paper = path.resolve(paperFile);
  const dir = path.dirname(paper);
  const out = path.resolve(opts.out || path.join(dir, 'dist'));
  const build = path.resolve(opts.buildDir || path.join(dir, 'build'));
  return { paper, dir, out, build, snap: path.join(build, 'snap') };
}

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, shell: false }, opts));
  if (r.error) throw new Error(`${cmd} failed to start: ${r.error.message}`);
  return r;
}

/* ------------------------------------------------------------------ pandoc */
/* Long papers can be split: list the parts in the front matter of paper.md
     sections:
       - sections/01-intro.md
       - sections/02-geometry.md
   They are appended after paper.md, in order. */
export function inputs(P) {
  const text = fs.readFileSync(P.paper, 'utf8').replace(/\r\n/g, '\n');
  const fm = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
  const out = [P.paper];
  if (!fm) return out;
  const m = fm[1].match(/^sections:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m);
  if (!m) return out;
  for (const line of m[1].split('\n')) {
    const f = line.replace(/^[ \t]+-\s*/, '').replace(/^['"]|['"]\s*$/g, '').trim();
    if (!f) continue;
    const abs = path.resolve(P.dir, f);
    if (!fs.existsSync(abs)) throw new Error('section file not found: ' + f);
    out.push(abs);
  }
  return out;
}

/* a series may share front matter (macros, author, bibliography, footer) in one file, listed in the registry as
   "common": "common.md"; it is read before paper.md, so a note's own values win (macros merge key by key).
   Paths in it are relative to each note's folder (e.g. bibliography: ../refs.json). */
export function commonFile(P) {
  const rel = frontScalar(P, 'series');
  if (!rel) return null;
  const file = path.resolve(P.dir, rel);
  if (!fs.existsSync(file)) return null;
  const S = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!S.common) return null;
  const c = path.resolve(path.dirname(file), S.common);
  if (!fs.existsSync(c)) throw new Error('series common file not found: ' + S.common);
  return c;
}

function pandoc(P, to, extra = []) {
  const common = commonFile(P);
  const args = [...(common ? [common] : []), ...inputs(P), '-f', 'markdown', '-t', to, '--standalone', '--lua-filter', FILTER, '--citeproc', '--lua-filter', REFNOTES, '--csl', CSL,
    '-M', 'link-citations=true', '--wrap=none', '--resource-path', P.dir, ...extra];
  const r = run('pandoc', args, { cwd: P.dir });
  const warnings = (r.stderr || '').split(/\r?\n/).filter(Boolean);
  if (r.status !== 0) throw new Error('pandoc (' + to + ') failed:\n' + r.stderr);
  return { text: r.stdout, warnings };
}

/* ------------------------------------------------------------------ KaTeX prerender */
function prerender(html, macros) {
  const errors = [];
  const trust = ctx => ['\\htmlClass', '\\htmlData', '\\htmlId', '\\htmlStyle'].includes(ctx.command);
  const out = html.replace(/<span\s+class="math (inline|display)">([\s\S]*?)<\/span>/g, (m, kind, body) => {
    let tex = unescapeHtml(body).trim();
    tex = kind === 'inline' ? tex.replace(/^\\\(/, '').replace(/\\\)$/, '') : tex.replace(/^\\\[/, '').replace(/\\\]$/, '');
    const o = { displayMode: kind === 'display', macros: Object.assign({}, macros), throwOnError: true, trust, strict: 'ignore', output: 'htmlAndMathml' };
    try { return katex.renderToString(tex, o); }
    catch (e) {
      errors.push({ tex: tex.slice(0, 160), message: e.message });
      return katex.renderToString(tex, Object.assign(o, { throwOnError: false }));
    }
  });
  return { html: out, errors };
}

/* ------------------------------------------------------------------ assets */
function katexCss() {
  const dir = path.join(path.dirname(require.resolve('katex/package.json')), 'dist');
  let css = fs.readFileSync(path.join(dir, 'katex.min.css'), 'utf8');
  css = css.replace(/src:url\((fonts\/[^)]+\.woff2)\)[^;}]*/g, (m, f) => {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    return `src:url(data:font/woff2;base64,${b64}) format("woff2")`;
  });
  return css;
}
function katexJs() {
  const dir = path.join(path.dirname(require.resolve('katex/package.json')), 'dist');
  return fs.readFileSync(path.join(dir, 'katex.min.js'), 'utf8');
}
function moduleWrap(name, code) {
  if (/^\s*import\s/m.test(code)) throw new Error(`figure module ${name}: import statements are not supported (use figures/_lib.js helpers)`);
  const body = code.replace(/export\s+default\s+/, '__m.default = ');
  return `/* figure: ${name} */\n(function(){'use strict';const __m={};\n${body}\n;if(__m.default)LP.figure(${JSON.stringify(name)},__m.default);})();\n`;
}
function collectFigures(html, P) {
  const seen = new Map();
  for (const m of html.matchAll(/data-live="([^"]+)" data-src="([^"]+)"/g)) {
    if (!seen.has(m[1])) seen.set(m[1], path.resolve(P.dir, unescapeHtml(m[2])));
  }
  return seen;
}
function libraries(P, figs) {
  const dirs = new Set([...figs.values()].map(f => path.dirname(f)));
  const libs = [];
  dirs.forEach(d => { if (fs.existsSync(d)) fs.readdirSync(d).filter(f => /^_.*\.(js|json)$/.test(f)).sort().forEach(f => libs.push(path.join(d, f))); });
  return libs;
}
/* figures/_name.json -> LP.ds.name (data for LP.chart, written by the project's scripts) */
function libCode(f) {
  const text = fs.readFileSync(f, 'utf8');
  if (!f.endsWith('.json')) return `/* lib: ${path.basename(f)} */\n` + text + '\n';
  const name = path.basename(f, '.json').replace(/^_/, '');
  try { JSON.parse(text); } catch (e) { throw new Error('data file ' + path.basename(f) + ' is not valid JSON: ' + e.message); }
  return `/* data: ${path.basename(f)} */\nLP.ds[${JSON.stringify(name)}]=${text.trim()};\n`;
}
function inlineImages(html, P) {
  return html.replace(/<img src="([^"]+)"/g, (m, src) => {
    if (/^(data:|https?:)/.test(src)) return m;
    const f = path.resolve(P.dir, unescapeHtml(src));
    const ext = path.extname(f).toLowerCase();
    if (!fs.existsSync(f) || !MIME[ext]) return m;
    return `<img src="data:${MIME[ext]};base64,${fs.readFileSync(f).toString('base64')}"`;
  });
}
const safeScript = s => s.replace(/<\/script/gi, '<\\/script');

/* ------------------------------------------------------------------ series of notes
   Several papers can form a series. A shared JSON registry lists them:
     { "title": "...", "notes": { "overview": { "title": "...", "dir": "overview", "url": "https://claude.ai/artifact/..." },
                                   "holography": { "title": "...", "dir": "holography", "url": null } } }
   Each paper points to it in its front matter:  series: ../series.json   series-id: holography
   Links written as [text](note:holography#sec-x) resolve to the local file in dist/index.html and to the
   published URL in dist/artifact.html (and in the PDF); notes that are not available yet render as plain text. */
function frontScalar(P, key) {
  const text = fs.readFileSync(P.paper, 'utf8').replace(/\r\n/g, '\n');
  const fm = text.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/);
  if (!fm) return null;
  const m = fm[1].match(new RegExp('^' + key + ':[ \\t]*(.+?)[ \\t]*$', 'm'));
  return m ? m[1].replace(/^['"]|['"]$/g, '') : null;
}
export function loadSeries(P) {
  const rel = frontScalar(P, 'series');
  if (!rel) return null;
  const file = path.resolve(P.dir, rel);
  if (!fs.existsSync(file)) throw new Error('series file not found: ' + rel);
  const S = JSON.parse(fs.readFileSync(file, 'utf8'));
  const base = path.dirname(file);
  const self = frontScalar(P, 'series-id');
  const notes = {};
  for (const [id, n] of Object.entries(S.notes || {})) {
    const target = path.resolve(base, n.dir || id, 'dist', 'index.html');
    notes[id] = { title: n.title || id, local: fwd(path.relative(P.out, target)), url: n.url || null,
      exists: id === self || fs.existsSync(target) };
  }
  return { title: S.title || '', self, notes, hub: S.hub || null, menu: S.menu || 'all' };
}
/* ids of the notes a page links to: note: links in the text, note: hrefs and LP.noteHref('id') calls in figures */
export function linkedNotes(html) {
  const ids = new Set();
  for (const m of html.matchAll(/note:([\w-]+)/g)) ids.add(m[1]);
  for (const m of html.matchAll(/noteHref\(\s*['"]([\w-]+)['"]/g)) ids.add(m[1]);
  return ids;
}
/* With "menu": "hub" in the registry, a note other than the hub embeds only the hub, itself and the notes it links to.
   Adding a note to the series then changes only the hub (and the notes that link to the new one), so only they need
   republishing. The hub lists every note. */
function seriesVariant(series, variant, html) {
  if (!series) return null;
  const notes = {};
  const keep = series.menu === 'hub' && series.hub && series.self !== series.hub
    ? new Set([series.hub, series.self, ...linkedNotes(html || '')]) : null;
  for (const [id, n] of Object.entries(series.notes)) {
    if (keep && !keep.has(id)) continue;
    const href = id === series.self ? '' : variant === 'local' ? (n.exists ? n.local : null) : n.url;
    notes[id] = { title: n.title, href };
  }
  return { title: series.title, self: series.self, hub: series.hub || undefined, notes };
}
function resolveNoteLinks(html, sv) {
  return html.replace(/<a href="note:([\w-]+)(#[^"]*)?"([^>]*)>([\s\S]*?)<\/a>/g, (m, id, hash, rest, text) => {
    const n = sv && sv.notes[id];
    if (n && n.href) return `<a href="${n.href}${hash || ''}" target="_blank" rel="noopener" class="note-link"${rest}>${text}</a>`;
    if (n && n.href === '') return `<a href="${hash || '#'}"${rest}>${text}</a>`;
    return `<span class="note-planned" title="companion note not published yet">${text}</span>`;
  });
}
const seriesScript = sv => sv ? '<script>window.LP_SERIES=' + JSON.stringify(sv).replace(/</g, '\\u003c') + ';</script>\n' : '';

/* ------------------------------------------------------------------ HTML */
export function buildHtml(paperFile, opts = {}) {
  const P = paths(paperFile, opts);
  const t0 = Date.now();
  const res = pandoc(P, 'html5', ['--template', path.join(ROOT, 'templates', 'paper.html'),
    '--math-method=mathjax', '--shift-heading-level-by=1']);
  let html = res.text;
  const dataMatch = html.match(/<script type="application\/json" id="lp-data">([\s\S]*?)<\/script>/);
  const data = dataMatch ? JSON.parse(dataMatch[1].replace(/<\\\//g, '</')) : { macros: {} };
  const pre = prerender(html, data.macros || {});
  html = inlineImages(pre.html, P);

  const figs = collectFigures(html, P);
  const missing = [];
  let figJs = '';
  for (const f of libraries(P, figs)) figJs += libCode(f);
  for (const [name, file] of figs) {
    if (!fs.existsSync(file)) { missing.push(file); continue; }
    figJs += moduleWrap(name, fs.readFileSync(file, 'utf8'));
  }
  const rt = RUNTIME.map(f => fs.readFileSync(f, 'utf8'));
  const js = [katexJs(), rt[0], rt[1], rt[2], figJs, rt[3], rt[4], opts.dev ? devClient() : '', rt[5], rt[6]].join('\n;\n');
  // KaTeX first, so the paper's own sizes for .katex win the cascade
  const css = katexCss() + '\n' + fs.readFileSync(path.join(ROOT, 'styles', 'paper.css'), 'utf8');
  const fonts = opts.webfonts === false ? '' :
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,700;1,400;1,700&display=swap">';
  html = html.replace('<!--LP:FONTS-->', () => fonts)
    .replace('<!--LP:CSS-->', () => css)
    .replace('<!--LP:JS-->', () => '<!--LP:SERIES--><script>\n' + safeScript(js) + '\n</script>');
  const [head, body] = html.split('<!--LP:SPLIT-->');
  const series = loadSeries(P);
  const variantBody = v => {
    const sv = seriesVariant(series, v, html);
    return resolveNoteLinks(body, sv).replace('<!--LP:SERIES-->', () => seriesScript(sv)).trim();
  };
  const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + head.trim() + '\n</head>\n<body>\n' + variantBody('local') + '\n</body>\n</html>\n';
  const fragment = head.trim() + '\n' + variantBody('artifact') + '\n';
  fs.mkdirSync(P.out, { recursive: true });
  fs.writeFileSync(path.join(P.out, 'index.html'), full);
  fs.writeFileSync(path.join(P.out, 'artifact.html'), fragment);
  return {
    P, file: path.join(P.out, 'index.html'), artifact: path.join(P.out, 'artifact.html'), bytes: full.length,
    ms: Date.now() - t0, katexErrors: pre.errors, pandocWarnings: res.warnings, missingFigures: missing,
    figures: [...figs.keys()], series,
  };
}

function devClient() {
  return `(function(){try{var es=new EventSource('/__livepaper');es.onmessage=function(e){if(e.data==='reload'){try{sessionStorage.setItem('lp-scroll',String(scrollY))}catch(x){}location.reload()}};addEventListener('load',function(){try{var y=sessionStorage.getItem('lp-scroll');if(y){LP.ready.then(function(){scrollTo(0,+y)})}}catch(x){}})}catch(e){}})();`;
}

/* ------------------------------------------------------------------ LaTeX / PDF */
export function buildTex(paperFile, opts = {}) {
  const P = paths(paperFile, opts);
  fs.mkdirSync(P.build, { recursive: true });
  const res = pandoc(P, 'latex', ['--template', path.join(ROOT, 'templates', 'paper.latex'), '-M', 'lp-snapdir=' + fwd(P.snap)]);
  const tex = path.join(P.build, 'paper.tex');
  // note: links become links to the published notes (or plain text when a note has no URL yet)
  const series = loadSeries(P);
  const text = res.text.replace(/\\href\{note:([\w-]+)((?:\\#)?[^}]*)\}\{([^{}]*)\}/g, (m, id, hash, txt) => {
    const n = series && series.notes[id];
    return n && n.url ? `\\href{${n.url}${hash}}{${txt}}` : txt;
  });
  fs.writeFileSync(tex, text);
  return { P, tex, warnings: res.warnings };
}

export function compilePdf(texFile, P) {
  const r = run('latexmk', ['-pdf', '-interaction=nonstopmode', '-halt-on-error', '-file-line-error', '-outdir=' + P.build, texFile], { cwd: P.dir });
  const log = path.join(P.build, path.basename(texFile, '.tex') + '.log');
  const logText = fs.existsSync(log) ? fs.readFileSync(log, 'latin1') : '';
  const issues = [];
  for (const m of logText.matchAll(/^(LaTeX Warning: (?:Reference|Citation) [^\n]*)/gm)) issues.push(m[1]);
  if (/There were undefined references/.test(logText)) issues.push('undefined references remain');
  const overfull = [];
  for (const m of logText.matchAll(/Overfull \\hbox \(([\d.]+)pt too wide\)[^\n]*lines? (\d+)/g)) if (+m[1] > 4) overfull.push({ pt: +m[1], line: +m[2] });
  const errors = [];
  for (const m of logText.matchAll(/^([^\n]*:\d+: [^\n]*)/gm)) errors.push(m[1]);
  const pdf = path.join(P.build, path.basename(texFile, '.tex') + '.pdf');
  const ok = r.status === 0 && fs.existsSync(pdf);
  if (ok) { fs.mkdirSync(P.out, { recursive: true }); fs.copyFileSync(pdf, path.join(P.out, 'paper.pdf')); }
  return { ok, pdf: path.join(P.out, 'paper.pdf'), issues, overfull, errors, stdout: (r.stdout || '').slice(-4000) };
}
