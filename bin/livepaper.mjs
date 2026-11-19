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
    if (['out', 'port', 'pages', 'theme'].includes(k)) flags[k] = argv[++i]; else flags[k] = true;
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

async function pdf(r) {
  const { snapFigures } = await import('../src/browser.mjs');
  const P = r.P;
  console.log('[livepaper] snapshots for LaTeX');
  const snaps = await snapFigures(r.file, P.snap, r.figures, s => console.log(s));
  const bad = snaps.filter(s => !s.ok);
  bad.forEach(s => console.log('  snapshot problem: ' + s.name + ': ' + s.error));
  const t = buildTex(paper, opts);
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
  if (!fs.existsSync(paper)) { console.error('no such file: ' + paper + '\n\n' + HELP); return 1; }
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
    console.log(`[livepaper] screenshots: ${path.relative(process.cwd(), dir)}${path.sep}page-NN.png, mobile-dark.png; report.json`);
    console.log(bad ? `[livepaper] check found ${bad} problem(s)` : '[livepaper] check passed');
    return bad ? 1 : 0;
  }
  console.error('unknown command: ' + cmd + '\n\n' + HELP);
  return 1;
}

main().then(code => { if (code !== null) process.exitCode = code; }).catch(e => { console.error(e.stack || e.message); process.exitCode = 2; });
