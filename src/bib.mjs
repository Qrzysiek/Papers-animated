// livepaper bib: verified bibliography entries (CSL-JSON) from arXiv, Crossref and INSPIRE metadata.
//   livepaper bib add refs.json arXiv:2202.06957 doi:10.1103/PhysRevX.9.041017 key=quant-ph/0502070 ...
//   livepaper bib todo refs.json            entries without a summary, with the start of their abstract
//   livepaper bib summaries refs.json s.txt  merge "key: summary" lines into the entries' x-summary
//   livepaper bib keys refs.json             one line per entry: key, year, first author, title
// Only metadata returned by these services is written; nothing is filled in from memory.
import fs from 'node:fs';
import path from 'node:path';

const UA = { 'User-Agent': 'livepaper/0.1 (bibliography tool)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, accept) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: Object.assign({}, UA, accept ? { Accept: accept } : {}), signal: AbortSignal.timeout(60000) });
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return await r.text();
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

/* ------------------------------------------------------------------ identifiers */
export function parseIds(args) {
  const out = [];
  for (let a of args) {
    let key = null;
    const m = /^([A-Za-z][\w-]*)=(.+)$/.exec(a);
    if (m && !/^(arxiv|doi)$/i.test(m[1])) { key = m[1]; a = m[2]; }
    a = a.trim().replace(/^https?:\/\/(www\.)?arxiv\.org\/(abs|pdf)\//i, 'arXiv:').replace(/^https?:\/\/(dx\.)?doi\.org\//i, 'doi:').replace(/\.pdf$/, '');
    if (/^doi:/i.test(a) || /^10\.\d{4,}\//.test(a)) out.push({ kind: 'doi', id: a.replace(/^doi:/i, ''), key });
    else {
      const id = a.replace(/^arxiv:/i, '').replace(/v\d+$/, '');
      if (!/^(\d{4}\.\d{4,5}|[a-z-]+(\.[A-Z]{2})?\/\d{7})$/.test(id)) throw new Error('not an arXiv id or DOI: ' + a);
      out.push({ kind: 'arxiv', id, key });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ text helpers */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => String(s || '').replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => e[0] === '#'
  ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
const squash = s => String(s || '').replace(/\s+/g, ' ').trim();
const stripTags = s => squash(decode(String(s || '').replace(/<jats:title>[^<]*<\/jats:title>/g, ' ').replace(/<[^>]+>/g, ' ')));

const TEX_TEXT = [[/\{\\(?:sc|it|em|bf|rm|tt)\s+([^{}]*)\}/g, '$1'], [/\\(?:emph|textit|textbf|textrm|url|texttt|mathrm)\{([^{}]*)\}/g, '$1'],
  [/\\&/g, '&'], [/\\%/g, '%'], [/~/g, ' '], [/\s*\\cite[pt]?\{[^{}]*\}/g, '']];
/* abstract -> Pandoc Markdown in which only $...$ math is live */
export function mdAbstract(a) {
  a = String(a || '').replace(/\\\[([\s\S]+?)\\\]/g, (m, x) => '$' + x.trim() + '$').replace(/\\\(([\s\S]+?)\\\)/g, (m, x) => '$' + x.trim() + '$');
  const parts = a.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/);
  return squash(parts.map((s, i) => {
    if (i % 2) return '$' + s.replace(/^\$+|\$+$/g, '').trim() + '$';
    for (const [p, r] of TEX_TEXT) s = s.replace(p, r);
    return s.replace(/([\\`*_{}[\]<>#+\-!|@~^$])/g, '\\$1');
  }).join(''));
}
/* titles: citeproc prints TeX verbatim, so keep plain text */
function cleanTitle(t) {
  t = squash(t);
  for (const [p, r] of TEX_TEXT) t = t.replace(p, r);
  return t.replace(/\$([^$]*)\$/g, (m, x) => x.replace(/\\(?:mathcal|mathbb|mathrm|mathsf)\{([^{}]*)\}/g, '$1').replace(/\\(left|right)/g, '')
    .replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_$1').replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, ''));
}
const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'da', 'di', 'del', 'della', 'la', 'le', 'du', 'dos', 'das', 'ten', 'ter']);
export function splitName(n) {
  const parts = squash(n).split(' ');
  if (parts.length === 1) return { family: parts[0] };
  let end = parts.length - 1;
  let suffix = '';
  if (/^(Jr\.?|Sr\.?|II|III|IV)$/.test(parts[end]) && end > 1) { suffix = parts[end]; end--; }
  let start = end;
  while (start - 1 > 0 && PARTICLES.has(parts[start - 1])) start--;
  const o = { family: parts.slice(start, end + 1).join(' '), given: parts.slice(0, start).join(' ') };
  if (suffix) o.suffix = suffix;
  return o;
}
const JABBR = { JHEP: 'J. High Energy Phys.', 'J. High Energ. Phys.': 'J. High Energy Phys.', 'J. High Energy Phys.': 'J. High Energy Phys.',
  'Fortsch.Phys.': 'Fortschr. Phys.', 'Class.Quant.Grav.': 'Class. Quantum Grav.', 'Quant.Inf.Comput.': 'Quantum Inf. Comput.',
  'Commun.Math.Phys.': 'Commun. Math. Phys.', 'J.Math.Phys.': 'J. Math. Phys.', 'SciPost Phys.': 'SciPost Phys.', Quantum: 'Quantum',
  QIC: 'Quantum Inf. Comput.', 'Quantum Info. Comput.': 'Quantum Inf. Comput.', 'Phys. Rev. Research': 'Phys. Rev. Res.' };
/* journal abbreviation: known names, INSPIRE's "Phys.Rev.D" spacing, and Crossref's all-caps short titles in title case */
const abbr = j => {
  if (JABBR[j]) return JABBR[j];
  j = j.replace(/\.(?=[A-Z])/g, '. ').trim();
  if (/[A-Z]{3}/.test(j) && j === j.toUpperCase() && j.replace(/[^A-Z]/g, '').length > 4)
    j = j.toLowerCase().replace(/(^|[\s.(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  return j;
};

/* ------------------------------------------------------------------ services */
export async function arxivMeta(ids) {
  const out = {};
  for (let k = 0; k < ids.length; k += 40) {
    if (k) await sleep(3100);
    const chunk = ids.slice(k, k + 40);
    const xml = await get('https://export.arxiv.org/api/query?id_list=' + chunk.join(',') + '&max_results=100');
    for (const m of (xml || '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const e = m[1];
      const tag = t => { const x = new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>').exec(e); return x ? decode(x[1]) : ''; };
      const idUrl = tag('id');
      const id = idUrl.replace(/^.*\/abs\//, '').replace(/v\d+$/, '');
      const title = squash(tag('title'));
      if (!id || title === 'Error') continue;
      out[id] = { id, title, authors: [...e.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map(a => squash(decode(a[1]))),
        published: tag('published').slice(0, 10), journal_ref: squash(tag('arxiv:journal_ref')), doi: squash(tag('arxiv:doi')),
        abstract: squash(tag('summary')) };
    }
  }
  return out;
}
export async function crossref(doi) {
  const t = await get('https://api.crossref.org/works/' + encodeURIComponent(doi));
  if (!t) return null;
  const m = JSON.parse(t).message;
  const year = ((m.issued || m['published-print'] || m['published-online'] || {})['date-parts'] || [[null]])[0][0];
  return { doi: m.DOI, title: squash((m.title || [''])[0]), authors: (m.author || []).map(a => a.family ? { family: a.family, given: a.given } : { literal: a.name }),
    container: (m['short-container-title'] || [])[0] || (m['container-title'] || [])[0] || '', volume: m.volume || '', page: m.page || m['article-number'] || '',
    year, type: m.type, publisher: m.publisher, abstract: stripTags(m.abstract || '') };
}
export async function inspire(arxivId) {
  const t = await get('https://inspirehep.net/api/literature?q=' + encodeURIComponent('arxiv:' + arxivId) + '&fields=publication_info,dois', 'application/json');
  if (!t) return null;
  const h = (JSON.parse(t).hits || {}).hits || [];
  if (!h.length) return null;
  const md = h[0].metadata || {};
  const pi = (md.publication_info || []).find(p => p.journal_title);
  return { doi: ((md.dois || [])[0] || {}).value || '', venue: pi ? { container: abbr(pi.journal_title), volume: pi.journal_volume || '',
    page: pi.artid || pi.page_start || '', year: pi.year } : null };
}

/* ------------------------------------------------------------------ entries */
const ascii = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^A-Za-z]/g, '').toLowerCase();
const STOP = new Set(['a', 'an', 'the', 'on', 'of', 'and', 'in', 'for', 'to', 'from', 'with', 'via', 'at', 'is', 'are', 'by', 'as', 'its', 'towards', 'toward']);
function makeKey(e, taken) {
  const fam = ascii((e.author && e.author[0] && (e.author[0].family || e.author[0].literal)) || 'anon');
  const year = ((e.issued || {})['date-parts'] || [['']])[0][0];
  let k = fam + year;
  if (!taken.has(k)) return k;
  const w = (e.title || '').split(/[^A-Za-z]+/).map(x => x.toLowerCase()).find(x => x.length > 2 && !STOP.has(x)) || 'x';
  k = fam + year + w;
  for (let c = 98; taken.has(k); c++) k = fam + year + w + String.fromCharCode(c);
  return k;
}

export function entryFromArxiv(a, venue, cr) {
  const e = { id: '', title: cleanTitle(a.title), author: a.authors.map(splitName), URL: 'https://arxiv.org/abs/' + a.id, note: 'arXiv:' + a.id };
  const year = +a.published.slice(0, 4);
  if (cr && cr.container) {
    Object.assign(e, { type: 'article-journal', 'container-title': abbr(cr.container), issued: { 'date-parts': [[cr.year || year]] } });
    if (cr.volume) e.volume = String(cr.volume);
    if (cr.page) e.page = String(cr.page);
    if (cr.doi) e.DOI = cr.doi;
  } else if (venue) {
    Object.assign(e, { type: 'article-journal', 'container-title': venue.container, issued: { 'date-parts': [[venue.year || year]] } });
    if (venue.volume) e.volume = String(venue.volume);
    if (venue.page) e.page = String(venue.page);
  } else Object.assign(e, { type: 'article', publisher: 'arXiv', number: a.id, issued: { 'date-parts': [[year]] } });
  if (e['container-title'] === 'J. High Energy Phys.' && e.issued) {   // JHEP: volume = year, three-digit article numbers
    e.volume = String(e.issued['date-parts'][0][0]);
    if (/^\d{1,2}$/.test(e.page || '')) e.page = e.page.padStart(3, '0');
  }
  if (a.abstract) e.abstract = mdAbstract(a.abstract);
  return e;
}
export function entryFromCrossref(c) {
  const book = /book|monograph/.test(c.type || '');
  const e = { id: '', type: book ? 'book' : 'article-journal', title: cleanTitle(c.title), author: c.authors, issued: { 'date-parts': [[c.year]] }, DOI: c.doi };
  if (book) { if (c.publisher) e.publisher = c.publisher; }
  else {
    if (c.container) e['container-title'] = abbr(c.container);
    if (c.volume) e.volume = String(c.volume);
    if (c.page) e.page = String(c.page);
  }
  if (c.abstract) e.abstract = mdAbstract(c.abstract);
  return e;
}

/* ------------------------------------------------------------------ commands */
const load = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8') || '[]') : []);
const save = (f, refs) => fs.writeFileSync(f, JSON.stringify(refs, null, 1) + '\n');

export async function bibAdd(file, args, log = console.log) {
  const refs = load(file);
  const taken = new Set(refs.map(r => r.id));
  const byArxiv = new Map(refs.filter(r => /arxiv\.org\/abs\//.test(r.URL || '')).map(r => [r.URL.replace(/^.*\/abs\//, ''), r.id]));
  const byDoi = new Map(refs.filter(r => r.DOI).map(r => [r.DOI.toLowerCase(), r.id]));
  const ids = parseIds(args);
  const added = [], problems = [];
  const ax = ids.filter(i => i.kind === 'arxiv' && !byArxiv.has(i.id));
  ids.filter(i => i.kind === 'arxiv' && byArxiv.has(i.id)).forEach(i => log(`  have ${i.id} as ${byArxiv.get(i.id)}`));
  const meta = ax.length ? await arxivMeta(ax.map(i => i.id)) : {};
  for (const i of ax) {
    const a = meta[i.id];
    if (!a) { problems.push('arXiv has no record ' + i.id); continue; }
    let cr = null, venue = null;
    let doi = a.doi;
    if (!doi) { try { const h = await inspire(i.id); if (h) { doi = h.doi; venue = h.venue; } } catch (e) { problems.push('INSPIRE ' + i.id + ': ' + e.message); } await sleep(400); }
    if (doi) { try { cr = await crossref(doi); } catch (e) { problems.push('Crossref ' + doi + ': ' + e.message); } await sleep(300); }
    const e = entryFromArxiv(a, venue, cr);
    if (doi && !e.DOI) e.DOI = doi;
    e.id = i.key && !taken.has(i.key) ? i.key : makeKey(e, taken);
    taken.add(e.id); refs.push(e); added.push(e);
    if (/[\\^_]/.test(e.title)) problems.push(e.id + ': title still contains TeX, check it: ' + e.title);
  }
  for (const i of ids.filter(i => i.kind === 'doi')) {
    if (byDoi.has(i.id.toLowerCase())) { log(`  have ${i.id} as ${byDoi.get(i.id.toLowerCase())}`); continue; }
    let c = null;
    try { c = await crossref(i.id); } catch (e) { problems.push('Crossref ' + i.id + ': ' + e.message); continue; }
    if (!c) { problems.push('Crossref has no record ' + i.id); continue; }
    const e = entryFromCrossref(c);
    e.id = i.key && !taken.has(i.key) ? i.key : makeKey(e, taken);
    taken.add(e.id); refs.push(e); added.push(e);
    await sleep(300);
  }
  save(file, refs);
  added.forEach(e => log(`  + ${e.id.padEnd(24)} ${(e['container-title'] || e.publisher || '')} ${e.volume || ''} ${e.page || ''} (${e.issued['date-parts'][0][0]}) ${e.title.slice(0, 70)}${e.abstract ? '' : '  [no abstract]'}`));
  problems.forEach(p => log('  ! ' + p));
  log(`[livepaper] ${added.length} added, ${refs.length} in ${path.basename(file)}; ${refs.filter(r => !r['x-summary']).length} without a summary (livepaper bib todo)`);
  return { added, problems };
}

export function bibTodo(file, opts = {}) {
  const n = opts.chars || 420;
  return load(file).filter(r => !r['x-summary']).map(r => {
    const a = (r.abstract || '(no abstract: summarise from the work itself)').replace(/\\([\\`*_{}[\]<>#+\-!|@~^$])/g, '$1');
    return `${r.id}: ${r.title} (${(r.issued || {})['date-parts'] ? r.issued['date-parts'][0][0] : ''})\n  ${a.length > n ? a.slice(0, n) + '…' : a}`;
  });
}

export function bibSummaries(file, txt) {
  const refs = load(file);
  const byId = new Map(refs.map(r => [r.id, r]));
  const unknown = [];
  let n = 0;
  for (const line of fs.readFileSync(txt, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
    const r = byId.get(k);
    if (!r) { unknown.push(k); continue; }
    r['x-summary'] = v; n++;
  }
  save(file, refs);
  return { n, unknown, missing: refs.filter(r => !r['x-summary']).map(r => r.id) };
}

export const bibKeys = file => load(file).map(r => {
  const a = r.author && r.author[0] ? (r.author[0].family || r.author[0].literal) + (r.author.length > 1 ? ' et al.' : '') : '';
  return `${r.id.padEnd(26)} ${((r.issued || {})['date-parts'] || [['']])[0][0]}  ${a.slice(0, 22).padEnd(22)} ${r.title.slice(0, 80)}`;
});
