#!/usr/bin/env node
// livepaper — one Markdown file in, a paged interactive live paper (HTML) and a LaTeX PDF out.
import fs from 'node:fs';
import path from 'node:path';
import { buildHtml, buildTex, compilePdf, paths, ROOT } from '../src/build.mjs';

const HELP = `livepaper <command> [paper.md] [options]

  new <dir>            scaffold a new paper (paper.md, refs.bib, figures/)
  dev [paper.md]       rebuild on save and live-reload at http://127.0.0.1:4173
  build [paper.md]     write dist/index.html (+ dist/artifact.html for claude.ai)
      --pdf            also snapshot the live figures and compile dist/paper.pdf
      --pdf-only       skip nothing, but report only on the PDF
  check [paper.md]     headless check: layout report, page screenshots in build/check/,
                       phone/dark screenshot, controls; exits 1 on problems
      --pages 1,2,5    only screenshot these pages
  snap [paper.md]      only re-render figure snapshots (build/snap/*.pdf)
  devices [paper.md]   phone and tablet profiles in WebKit (iOS engine): layout, sideways scroll,
                       taps on citations, abstracts, solutions, Play; screenshots in build/devices/
      --engine chromium   use Chromium instead;  --device "iPad Mini,iPhone 13"

  bib add <refs.json> <id>...     add verified entries: arXiv:2202.06957, quant-ph/0502070,
                                  doi:10.1103/..., or key=<id> to choose the key
  bib todo <refs.json>            entries without a summary, with the start of their abstract
  bib summaries <refs.json> <txt> merge "key: summary" lines into the entries
  bib keys <refs.json>            one line per entry

  series new <dir> --title T --notes id:Title,id:Title   scaffold a series (first note is the hub)
  series status [series.json]     which notes to write, build, rebuild, publish or republish
  series build [series.json]      rebuild every stale note (--pdf for PDFs too)
  series published <id> <url> [series.json]   record a publish: URL into the registry + content hash

  common: --out <dir>  --no-webfonts  --port <n>
`;

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {};
const pos = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    if (['out', 'port', 'pages', 'theme', 'engine', 'device', 'title', 'notes', 'author', 'date'].includes(k)) flags[k] = argv[++i]; else flags[k] = true;
  } else pos.push(a);
}
const paper = pos[0] || 'paper.md';
const opts = { out: flags.out, webfonts: flags['no-webfonts'] ? false : true, port: flags.port ? +flags.port : undefined };

function printHtmlResult(r) {
  console.log(`[livepaper] ${path.relative(process.cwd(), r.file)}  ${(r.bytes / 1024).toFixed(0)} KB  in ${r.ms} ms  (${r.figures.length} live figures)`);
  r.pandocWarnings.forEach(w => console.log('  pandoc: ' + w));
  r.katexErrors.forEach(e => console.log('  KaTeX error: ' + e.message + '\n     in: ' + e.tex));
  r.missingFigures.forEach(f => console.log('  missing figure module: ' + f));
  return r.katexErrors.length + r.missingFigures.length + r.pandocWarnings.filter(w => /livepaper|WARNING/.test(w)).length;
}

async function pdf(r, paperFile = paper) {
  const { snapFigures } = await import('../src/browser.mjs');
  const P = r.P;
  console.log('[livepaper] snapshots for LaTeX');
  const snaps = await snapFigures(r.file, P.snap, r.figures, s => console.log(s));
  const bad = snaps.filter(s => !s.ok);
  bad.forEach(s => console.log('  snapshot problem: ' + s.name + ': ' + s.error));
  const t = buildTex(paperFile, opts);
  t.warnings.forEach(w => console.log('  pandoc(latex): ' + w));
  console.log('[livepaper] latexmk ...');
  const c = compilePdf(t.tex, P);
  if (!c.ok) {
    console.log('  LaTeX failed:');
    c.errors.slice(0, 20).forEach(e => console.log('   ' + e));
    if (!c.errors.length) console.log(c.stdout);
    return 1;
  }
  console.log(`[livepaper] ${path.relative(process.cwd(), c.pdf)}`);
  c.issues.forEach(i => console.log('  ' + i));
  c.overfull.forEach(o => console.log(`  overfull hbox ${o.pt}pt at paper.tex:${o.line}`));
  return bad.length + c.issues.length;
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(HELP); return 0; }
  if (cmd === 'new') {
    const dir = path.resolve(pos[0] || 'paper');
    const src = path.join(ROOT, 'examples', 'demo');
    if (fs.existsSync(path.join(dir, 'paper.md'))) { console.error('paper.md already exists in ' + dir); return 1; }
    fs.cpSync(src, dir, { recursive: true, filter: s => !/[\\/](dist|build)([\\/]|$)/.test(s) });
    console.log(`[livepaper] new paper in ${dir}\n  next: cd "${dir}" && livepaper dev`);
    return 0;
  }
  if (cmd === 'bib') {
    const B = await import('../src/bib.mjs');
    const [sub, file, ...rest] = pos.length ? [argv[1], ...pos.slice(1)] : [];
    if (!sub || !file) { console.error(HELP); return 1; }
    if (sub === 'add') { const r = await B.bibAdd(file, rest); return r.problems.length ? 1 : 0; }
    if (sub === 'todo') { const t = B.bibTodo(file); console.log(t.length ? t.join('\n') : 'every entry has a summary'); return 0; }
    if (sub === 'summaries') {
      const r = B.bibSummaries(file, rest[0]);
      console.log(`[livepaper] ${r.n} summaries merged` + (r.unknown.length ? '; unknown keys: ' + r.unknown.join(', ') : '') + (r.missing.length ? '; still without: ' + r.missing.join(', ') : ''));
      return r.unknown.length ? 1 : 0;
    }
    if (sub === 'keys') { console.log(B.bibKeys(file).join('\n')); return 0; }
    console.error('unknown bib command: ' + sub); return 1;
  }
  if (cmd === 'series') {
    const Sm = await import('../src/series.mjs');
    const sub = argv[1];
    const args = pos.slice(1);
    if (sub === 'new') {
      const r = Sm.seriesNew(args[0] || '.', { title: flags.title, notes: flags.notes, author: flags.author, date: flags.date });
      console.log(`[livepaper] series in ${r.dir}: ${r.notes.join(', ')} (hub: ${r.notes[0]})\n  next: fill briefs/*.md and notation.md, then write each note`);
      return 0;
    }
    const regOf = a => a || (fs.existsSync('series.json') ? 'series.json' : path.join('..', 'series.json'));
    if (sub === 'status') {
      const rows = Sm.seriesStatus(regOf(args[0]));
      rows.forEach(r => console.log(`  ${(r.id + (r.hub ? ' (hub)' : '')).padEnd(20)} ${(r.todo || 'ok').padEnd(14)} ${r.url || '-'}`));
      return 0;
    }
    if (sub === 'build') {
      const reg = regOf(args[0]);
      const rows = Sm.seriesStatus(reg).filter(r => r.exists && (!r.built || r.stale));
      let bad = 0;
      for (const r of rows) {
        const p = path.join(path.dirname(reg), Sm.loadRegistry(reg).notes[r.id].dir || r.id, 'paper.md');
        const res = buildHtml(p, opts);
        bad += printHtmlResult(res);
        if (flags.pdf) bad += await pdf(res, p);
      }
      if (!rows.length) console.log('[livepaper] every note is up to date');
      return bad ? 1 : 0;
    }
    if (sub === 'published') {
      const n = Sm.markPublished(regOf(args[2]), args[0], args[1]);
      console.log(`[livepaper] ${args[0]} published at ${n.url}`);
      return 0;
    }
    console.error('unknown series command: ' + sub); return 1;
  }
  if (!fs.existsSync(paper)) { console.error('no such file: ' + paper + '\n\n' + HELP); return 1; }
  if (cmd === 'devices') {
    const r = buildHtml(paper, opts);
    let bad = printHtmlResult(r);
    const { checkDevices } = await import('../src/browser.mjs');
    const dir = path.join(r.P.build, 'devices');
    const res = await checkDevices(r.file, dir, { engine: flags.engine || 'webkit', devices: flags.device ? String(flags.device).split(',').map(s => s.trim()) : undefined });
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(res, null, 2));
    for (const d of res) {
      const taps = Object.entries(d.taps || {}).map(([k, v]) => k + (v ? ' ok' : ' FAIL')).join(', ');
      console.log(`  ${d.device.padEnd(24)} ${d.viewport ? d.viewport.width + 'x' + d.viewport.height : ''} ${d.mode || ''} ${d.pages || ''}p  taps: ${taps || '-'}`);
      (d.problems || []).forEach(p => { bad++; console.log('      ' + p); });
    }
    console.log(`[livepaper] screenshots: ${path.relative(process.cwd(), dir)}`);
    console.log(bad ? `[livepaper] devices: ${bad} problem(s)` : '[livepaper] devices passed');
    return bad ? 1 : 0;
  }
  if (cmd === 'dev') {
    const { serve } = await import('../src/serve.mjs');
    serve(paper, opts);
    return null;
  }
  if (cmd === 'build') {
    const r = buildHtml(paper, opts);
    let bad = printHtmlResult(r);
    if (flags.pdf || flags['pdf-only']) bad += await pdf(r);
    return bad ? 1 : 0;
  }
  if (cmd === 'snap') {
    const r = buildHtml(paper, opts);
    const { snapFigures } = await import('../src/browser.mjs');
    const s = await snapFigures(r.file, r.P.snap, r.figures, x => console.log(x));
    return s.some(x => !x.ok) ? 1 : 0;
  }
  if (cmd === 'check') {
    const r = buildHtml(paper, opts);
    let bad = printHtmlResult(r);
    const { checkPaper } = await import('../src/browser.mjs');
    const dir = path.join(r.P.build, 'check');
    const pages = flags.pages ? String(flags.pages).split(',').map(Number) : null;
    const c = await checkPaper(r.file, dir, { pages, theme: flags.theme });
    const rep = c.report;
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(Object.assign({}, rep, { consoleErrors: c.consoleErrors, mobile: c.mobile, interaction: c.interaction }), null, 2));
    console.log(`[livepaper] ${rep.pages} pages, laid out in ${rep.ms} ms, ${rep.figures} live figures, ${rep.scenes.length} scenes`);
    const list = (name, arr, f) => { if (arr && arr.length) { bad += arr.length; console.log(`  ${name} (${arr.length}):`); arr.slice(0, 30).forEach(x => console.log('    ' + f(x))); } };
    list('console errors', c.consoleErrors, x => x);
    list('runtime errors', rep.errors, x => x);
    list('column overflows', rep.overflows, x => `p${x.page} c${x.col} ${x.tag}.${x.cls} "${x.text}"`);
    list('equations wider than the column', rep.wideEquations, x => `p${x.page} ${x.id} +${x.excess}px`);
    list('blocks wider than the column', rep.widthOverflow, x => `p${x.page} ${x.tag}.${x.cls} +${x.excess}px "${x.text}"`);
    list('headings stranded at a column bottom', rep.stranded, x => `p${x.page} "${x.text}"`);
    list('unresolved references', rep.missingRefs, x => x);
    list('KaTeX errors', rep.katexErrors, x => x);
    list('missing figures', rep.missingFigures, x => x);
    if (c.mobile && c.mobile.scrollWidth > c.mobile.innerWidth + 1) { bad++; console.log(`  phone width scrolls sideways: ${c.mobile.scrollWidth} > ${c.mobile.innerWidth}`); }
    const ierr = (c.interaction.find(x => x.errors) || {}).errors || [];
    list('errors during interaction test', ierr, x => x);
    const L = c.lint || {};
    list('figure labels', L.figures, x => `p${x.page} ${x.fig}: "${x.text}" ${x.kind}${x.other ? ' "' + x.other + '"' : ''}${x.what ? ' (' + x.what + ')' : ''}${x.by ? ' by ' + x.by : ''} at (${x.at})`);
    const warn = (name, arr, f) => { if (arr && arr.length) { console.log(`  note: ${name} (${arr.length}): ` + arr.slice(0, 12).map(f).join(', ')); } };
    const LPg = L.pages || {};
    warn('sparse pages', LPg.sparse, x => `p${x.page} ${x.filled}%`);
    warn('figures more than a page after their first mention', LPg.far, x => `${x.id} p${x.mentioned}->p${x.placed}`);
    warn('figures never referenced in the text', LPg.unreferenced, x => x);
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(Object.assign({}, rep, { consoleErrors: c.consoleErrors, mobile: c.mobile, interaction: c.interaction, lint: L }), null, 2));
    if (c.lintShots && c.lintShots.length) console.log('  flagged figures, labels boxed in red: ' + c.lintShots.map(f => path.relative(process.cwd(), f)).join(', '));
    console.log(`[livepaper] look at ${path.relative(process.cwd(), c.sheet || dir)} first (all pages, problem pages outlined); single pages: page-NN.png, mobile-dark.png; report.json`);
    console.log(bad ? `[livepaper] check found ${bad} problem(s)` : '[livepaper] check passed');
    return bad ? 1 : 0;
  }
  console.error('unknown command: ' + cmd + '\n\n' + HELP);
  return 1;
}

main().then(code => { if (code !== null) process.exitCode = code; }).catch(e => { console.error(e.stack || e.message); process.exitCode = 2; });
