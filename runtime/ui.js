/* livepaper runtime — ui: boot, reader bar, zoom, modes, theme, links, tooltips, report. */
(function (LP) {
'use strict';
const $ = id => document.getElementById(id);
const html = document.documentElement;
const qs = LP.qs;
const player = LP.player;
let mode = 'paper', layout = null, pagesEl = null, pageIO = null, curPage = 0, readyResolve;
LP.ready = new Promise(r => { readyResolve = r; });

/* ---------------------------------------------------------------- theme */
function applyTheme(v) {
  if (v === 'light' || v === 'dark') html.setAttribute('data-theme', v); else html.removeAttribute('data-theme');
  const sel = $('lp-theme'); if (sel) sel.value = v || 'auto';
}

/* ---------------------------------------------------------------- zoom */
/* Pages are typeset at the zoom they are shown at. Text laid out at another zoom can break into different
   lines (glyph advances do not scale exactly with the font size), so a column measured to fit at zoom 1
   could overflow its sheet at the display zoom and cut off its last line. */
let layoutZoom = 1, printing = false, refitT = 0;
function targetZoom() {
  if (printing || html.classList.contains('bare')) return 1;
  const z0 = $('lp-zoom') ? $('lp-zoom').value : 'width';
  const stage = $('lp-stage');
  const cs = getComputedStyle(stage);
  const avail = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const zw = avail / 900;
  const barH = $('lp-bar') ? $('lp-bar').offsetHeight : 0;
  const zp = (innerHeight - barH - 40) / 1200;
  const z = z0 === '1' ? 1 : z0 === 'page' ? Math.min(zw, zp) : Math.min(zw, 1.75);
  return +Math.max(0.3, z).toFixed(3);
}
/* WebKit (Safari, every iOS browser) implements CSS zoom the old way: inside a zoomed element it reports element
   boxes and event coordinates in unzoomed units, with offsets that depend on where the element sits, so tooltips
   opened far from their links. There the pages are typeset at scale 1 and shown with a transform, which every
   engine measures correctly. Detected once: a zoom-2 box reports a 100 px child as 100 px wide (others: 200). */
let legacy = null;
function legacyZoom() {
  if (legacy !== null) return legacy;
  try {
    const o = document.createElement('div');
    o.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;zoom:2';
    const i = document.createElement('div');
    i.style.cssText = 'width:100px;height:10px';
    o.appendChild(i); document.body.appendChild(o);
    const w = i.getBoundingClientRect().width;
    o.remove();
    legacy = Math.abs(w - 100) < 1;
  } catch (e) { legacy = false; }
  return legacy;
}
function scalePages(z) {
  const wrap = pagesEl.parentNode;
  pagesEl.style.transform = z === 1 ? '' : 'scale(' + z + ')';
  wrap.style.width = pagesEl.offsetWidth * z + 'px';
  wrap.style.height = pagesEl.offsetHeight * z + 'px';
}
function applyZoom() {
  if (!pagesEl) return;
  const z = targetZoom();
  if (legacyZoom()) { scalePages(z); return; }   // typeset at 1, nothing to refit
  pagesEl.style.zoom = z;
  // typeset again if the new zoom makes a column overflow (keeping the page)
  if (mode === 'paper' && z !== layoutZoom) {
    clearTimeout(refitT);
    refitT = setTimeout(() => { if (mode === 'paper' && columnsOverflow()) repaginate(); }, 200);
  }
}
function columnsOverflow() {
  return Array.from(document.querySelectorAll('#lp-stage .col')).some(c => c.firstChild.offsetHeight + c.lastChild.offsetHeight > c.clientHeight + 1);
}
function repaginate() {
  const page = curPage;
  return render('paper').then(() => { const ss = sheets(); if (ss[page]) ss[page].scrollIntoView({ block: 'start' }); });
}

/* ---------------------------------------------------------------- render a mode */
/* Fonts are only requested once text using them is laid out, and the paper's text lives in a <template>
   until now; so stage it, let the browser fetch the faces it needs (KaTeX's included), then measure. */
function fontsSettled(ms = 3000) {
  try {
    // wait for these loads themselves: WebKit resolves fonts.ready before they start, so without this the first
    // layout is measured with fallback glyphs and its columns overflow once KaTeX's faces arrive
    const loads = ['KaTeX_Main', 'KaTeX_Math', 'KaTeX_AMS', 'KaTeX_Size1', 'KaTeX_Size2', 'KaTeX_Size3', 'KaTeX_Size4'].map(f => '16px ' + f)
      .concat(['italic 16px KaTeX_Math', 'bold 16px KaTeX_Main', 'italic 16px KaTeX_Main'])
      .map(f => document.fonts.load(f).catch(() => null));
    return Promise.race([Promise.all(loads).then(() => document.fonts.ready), new Promise(r => setTimeout(r, ms))]);
  } catch (e) { return Promise.resolve(); }
}
let renderToken = 0, fontsReady = false;
/* Once fonts have settled, render() never awaits, so it runs synchronously (beforeprint relies on this). */
async function render(m) {
  const token = ++renderToken;
  mode = m;
  player.reset();
  if (pageIO) { pageIO.disconnect(); pageIO = null; }
  const stage = $('lp-stage');
  const src = LP.readSource($('lp-src'));
  let insts;
  if (mode === 'paper') {
    // stage everything off-screen, wait for its fonts, mount live figures, then paginate
    const staging = document.createElement('div');
    staging.className = 'lp-staging flowtext';
    document.body.appendChild(staging);
    if (src.mast) staging.appendChild(src.mast);
    src.blocks.forEach(b => staging.appendChild(b));
    void staging.offsetHeight;
    if (!fontsReady) { await fontsSettled(); fontsReady = true; }
    if (token !== renderToken) { staging.remove(); return; }
    stage.textContent = '';
    insts = Array.from(staging.querySelectorAll('figure[data-live]')).map(f => LP.mountFigure(f)).filter(Boolean);
    staging.remove();   // detached: moving blocks out of it no longer triggers document layout
    pagesEl = document.createElement('div');
    pagesEl.className = 'lp-pages';
    if (legacyZoom()) {   // WebKit: scaled by a transform inside a wrapper sized to the scaled pages (see applyZoom)
      const wrap = document.createElement('div');
      wrap.className = 'lp-zoomwrap';
      stage.appendChild(wrap);
      wrap.appendChild(pagesEl);
      layoutZoom = 1;
    } else {
      stage.appendChild(pagesEl);
      layoutZoom = targetZoom();
      pagesEl.style.zoom = layoutZoom;
    }
    layout = LP.layoutPaper(src, pagesEl);
  } else {
    stage.textContent = '';
    pagesEl = null;
    layout = LP.layoutReflow(src, stage);
    insts = Array.from(stage.querySelectorAll('figure[data-live]')).map(f => LP.mountFigure(f)).filter(Boolean);
  }
  LP.instances = insts;
  player.build(stage, insts);
  qs.has('scene') && fixScene(qs.get('scene'), +(qs.get('step') || 1));
  player.renderAllRest();
  applyZoom();
  watchPages();
  const mb = $('lp-mode');
  if (mb) { mb.textContent = mode === 'paper' ? 'Reflow' : 'Pages'; mb.setAttribute('aria-pressed', 'false'); }
  document.querySelectorAll('.paper-only').forEach(e => { e.hidden = mode !== 'paper'; });
  const bar = $('lp-bar'); if (bar) bar.classList.toggle('reflow', mode !== 'paper');
  updateBar(player.info());
}
function fixScene(id, step) {
  const sc = player.scenes.get(id);
  if (sc) sc.fixed = Math.max(0, step - 1);
}

/* ---------------------------------------------------------------- pages */
function sheets() { return pagesEl ? Array.from(pagesEl.querySelectorAll(':scope > .sheet')) : []; }
function watchPages() {
  const ss = sheets();
  const pg = $('lp-pg');
  if (!ss.length) { if (pg) pg.textContent = ''; return; }
  const vis = new Map();
  pageIO = new IntersectionObserver(es => {
    es.forEach(e => vis.set(e.target, e.intersectionRatio));
    let best = 0, bv = -1;
    ss.forEach((s, i) => { const v = vis.get(s) || 0; if (v > bv) { bv = v; best = i; } });
    curPage = best;
    if (pg) pg.textContent = 'page ' + (best + 1) + ' / ' + ss.length;
  }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
  ss.forEach(s => pageIO.observe(s));
  if (pg) pg.textContent = 'page 1 / ' + ss.length;
}
function gotoPage(i) {
  const ss = sheets();
  if (!ss.length) { window.scrollBy({ top: (i > curPage ? 1 : -1) * innerHeight * 0.85, behavior: 'smooth' }); return; }
  i = Math.max(0, Math.min(ss.length - 1, i));
  ss[i].scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* ---------------------------------------------------------------- bar */
function updateBar(info) {
  const bar = $('lp-bar');
  if (!bar) return;
  bar.classList.toggle('noscene', !info);
  if (!info) return;
  $('lp-play').textContent = info.playing ? 'Pause' : 'Play';
  const sc = $('lp-scrub');
  sc.max = String(info.n - 1);
  if (document.activeElement !== sc) sc.value = String(info.k);
  $('lp-where').textContent = info.title + ' · ' + (info.k + 1) + '/' + info.n + (info.label ? ': ' + info.label : '');
}
/* series menu: links to the other notes of a series (new tab), the current one marked */
function seriesMenu() {
  const S = LP.series;
  if (!S || !S.notes || Object.keys(S.notes).length < 2 || !$('lp-mode')) return;
  const d = document.createElement('details');
  d.className = 'lp-series';
  const sum = document.createElement('summary');
  sum.textContent = 'Notes';
  sum.title = S.title ? 'Other notes in “' + S.title + '”' : 'Other notes in this series';
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Notes in this series');
  if (S.title) { const h = document.createElement('span'); h.className = 'hd'; h.textContent = S.title; nav.appendChild(h); }
  // hub navigation (build.mjs, "menu": "hub"): the hub comes first and stands for the whole series
  const ids = Object.keys(S.notes).sort((a, b) => (b === S.hub) - (a === S.hub));
  ids.map(id => [id, S.notes[id]]).forEach(([id, n]) => {
    let e;
    const tail = id === S.hub && S.self !== S.hub ? ' · all notes ↗' : ' ↗';
    if (id === S.self) { e = document.createElement('span'); e.className = 'cur'; e.textContent = n.title + ' (this note)'; }
    else if (n.href) { e = document.createElement('a'); e.href = n.href; e.target = '_blank'; e.rel = 'noopener'; e.textContent = n.title + tail; }
    else { e = document.createElement('span'); e.className = 'planned'; e.textContent = n.title + ' · planned'; }
    nav.appendChild(e);
  });
  d.append(sum, nav);
  $('lp-mode').parentNode.insertBefore(d, $('lp-mode'));
  document.addEventListener('click', e => { if (!d.contains(e.target)) d.open = false; });
}

function wireBar() {
  seriesMenu();
  const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
  on('lp-play', 'click', () => player.toggle());
  on('lp-prev', 'click', () => player.step(-1));
  on('lp-next', 'click', () => player.step(1));
  on('lp-scrub', 'input', e => player.goto(+e.target.value));
  on('lp-speed', 'change', e => { player.speed = +e.target.value; });
  on('lp-zoom', 'change', applyZoom);
  on('lp-pprev', 'click', () => gotoPage(curPage - 1));
  on('lp-pnext', 'click', () => gotoPage(curPage + 1));
  on('lp-theme', 'change', e => { applyTheme(e.target.value); LP.store.set('theme', e.target.value); });
  on('lp-mode', 'click', () => { const m = mode === 'paper' ? 'reflow' : 'paper'; LP.store.set('mode', m); render(m); });
  let inFrame = true;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  const pb = $('lp-print');
  if (pb && !inFrame) { pb.hidden = false; pb.addEventListener('click', () => { (mode !== 'paper' ? render('paper') : Promise.resolve()).then(() => setTimeout(() => window.print(), 50)); }); }
  player.on(updateBar);
  addEventListener('keydown', e => {
    if (e.target instanceof Element && e.target.matches('input,select,textarea,button')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'Space' && player.active) { e.preventDefault(); player.toggle(); }
    else if (e.key === 'ArrowRight' && player.active) { e.preventDefault(); player.step(1); }
    else if (e.key === 'ArrowLeft' && player.active) { e.preventDefault(); player.step(-1); }
    else if ((e.key === 'PageDown' || e.key === ']') && mode === 'paper') { e.preventDefault(); gotoPage(curPage + 1); }
    else if ((e.key === 'PageUp' || e.key === '[') && mode === 'paper') { e.preventDefault(); gotoPage(curPage - 1); }
  });
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(applyZoom, 80); });
  // print CSS forces zoom 1: typeset at zoom 1 first (synchronously, see render), and back afterwards
  addEventListener('beforeprint', () => {
    printing = true;
    if (mode === 'paper' && layoutZoom !== 1) render('paper');
    player.static = true; player.renderAllRest();
  });
  addEventListener('afterprint', () => { printing = false; player.static = qs.has('static'); applyZoom(); });
  addEventListener('hashchange', () => jumpTo(decodeURIComponent(location.hash.slice(1)), false));
}

/* ---------------------------------------------------------------- links and tooltips */
function findIn(stage, id) {
  if (!id) return null;
  try { return stage.querySelector('#' + CSS.escape(id)); } catch (e) { return null; }
}
function jumpTo(id, setHash) {
  const t = findIn($('lp-stage'), id);
  if (!t) return false;
  t.scrollIntoView({ block: 'center', behavior: 'smooth' });
  t.classList.remove('lp-flash'); void t.offsetWidth; t.classList.add('lp-flash');
  if (setHash) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* not allowed here */ } }
  return true;
}
function tipContent(a) {
  const stage = $('lp-stage');
  const href = a.getAttribute('href') || '';
  const id = a.dataset.ref || href.slice(1);
  const t = findIn(stage, id);
  if (!t) return null;
  const box = document.createElement('div');
  if (t.classList.contains('eq')) box.appendChild(t.cloneNode(true));
  else if (t.matches('figure')) { const c = t.querySelector('figcaption'); if (c) box.appendChild(c.cloneNode(true)); }
  else if (t.classList.contains('lp-tbl')) { const c = t.querySelector('.tcap'); if (c) box.appendChild(c.cloneNode(true)); }
  else if (t.classList.contains('algo')) { const c = t.querySelector('.hd'); if (c) box.appendChild(c.cloneNode(true)); }
  else if (t.classList.contains('lp-env')) { const c = t.querySelector('p'); if (c) box.appendChild(c.cloneNode(true)); }
  else if (t.classList.contains('csl-entry')) { const c = t.querySelector('.csl-right-inline') || t; box.appendChild(c.cloneNode(true)); }
  else if (t.classList.contains('fn')) { const c = t.cloneNode(true); const s = c.querySelector('sup'); if (s) s.remove(); box.appendChild(c); }
  else if (/^H[2-6]$/.test(t.tagName)) { box.textContent = t.textContent; }
  else return null;
  box.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  return box;
}
/* Tooltips. With a mouse, hovering a cross-reference, citation or footnote mark previews its target and a click
   follows it; hovering a bibliography entry shows its abstract. Touch has no hover, and a tap sends emulated
   mouseover/click events after the touch ones, so hover is driven by pointer events of type 'mouse' only, and taps
   are handled in click: the first tap on a link shows the preview (tap the preview, or the link again, to follow
   it), a tap on an entry toggles its abstract, and a tap anywhere else, or scrolling the page, closes it. */
const PREVIEW = 'a.xref, .citation a, a.footnote-ref';
function wireLinks() {
  const stage = $('lp-stage');
  const tip = document.createElement('div');
  tip.className = 'lp-tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let owner = null;          // the link or bibliography entry the open tooltip belongs to
  let lastPtr = 'mouse';     // pointer type of the latest press; a keyboard 'click' counts as a mouse one
  let lastTouch = -1e9;      // time of the latest touch or pen press
  addEventListener('pointerdown', e => { lastPtr = e.pointerType || 'mouse'; if (lastPtr !== 'mouse') lastTouch = performance.now(); }, true);
  addEventListener('keydown', () => { lastPtr = 'mouse'; }, true);
  const tapped = () => lastPtr === 'touch' || lastPtr === 'pen';
  /* Hover previews only for a real mouse. WebKit marks the events that follow a tap as mouse events, and when the
     page scrolls (a followed link) it sends hover events for the old touch point: an abstract would pop up under
     the finger. So no hover on touch-only screens, nor within 2 s of a touch. */
  const hoverOK = e => e.pointerType === 'mouse' && performance.now() - lastTouch > 2000 &&
    !(window.matchMedia && matchMedia('(hover: none)').matches);
  const hide = () => {
    if (owner && owner.classList && owner.classList.contains('lp-sol-btn')) owner.setAttribute('aria-expanded', 'false');
    tip.hidden = true; tip.classList.remove('lp-tip-touch'); owner = null;
  };
  const place = (r, center) => {
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = Math.min(innerWidth - tw - 12, Math.max(12, center ? r.left + r.width / 2 - tw / 2 : r.left));
    let y = r.bottom + 8;
    if (y + th > innerHeight - 8 && r.top - th - 8 >= 8) y = r.top - th - 8;   // flip above only if it fits there
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, Math.min(y, innerHeight - th - 8)) + 'px';
  };
  const show = (box, cls, el, touch) => {
    if (owner && owner.classList && owner.classList.contains('lp-sol-btn')) owner.setAttribute('aria-expanded', 'false');
    tip.replaceChildren(box);
    tip.classList.toggle('lp-tip-abs', cls === 'abs' || cls === 'sol');
    tip.classList.toggle('lp-tip-sol', cls === 'sol');
    tip.classList.toggle('lp-tip-touch', !!touch);
    tip.hidden = false;
    tip.scrollTop = 0;
    owner = el;
    place(el.getBoundingClientRect(), cls === 'xref');
  };
  const showPreview = (a, touch) => {
    const c = tipContent(a);
    if (!c) return false;
    if (touch) { const go = document.createElement('div'); go.className = 'tip-go'; go.textContent = 'Tap here to go there'; c.appendChild(go); }
    show(c, 'xref', a, touch);
    return true;
  };
  // reference notes (filters/refnotes.lua): a bibliography entry with a hidden div.ref-abs shows it as a tooltip
  const showAbstract = (ent, touch) => {
    const abs = ent.querySelector('.ref-abs');
    if (!abs) return false;
    const box = document.createElement('div');
    const hd = document.createElement('div'); hd.className = 'tip-hd'; hd.textContent = 'Abstract';
    box.appendChild(hd);
    Array.from(abs.childNodes).forEach(n => box.appendChild(n.cloneNode(true)));
    box.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    show(box, 'abs', ent, touch);
    return true;
  };
  const follow = a => { hide(); return jumpTo(decodeURIComponent(a.getAttribute('href').slice(1)), true); };
  // exercises: the hidden div.lp-sol with the same data-sol opens in the panel; it stays open until closed
  const showSolution = btn => {
    const sol = stage.querySelector('.lp-sol[data-sol="' + btn.dataset.sol + '"]');
    if (!sol) return false;
    const box = document.createElement('div');
    const hd = document.createElement('div'); hd.className = 'lp-sol-hd';
    hd.textContent = 'Solution to Exercise ' + (btn.dataset.ex || '');
    box.appendChild(hd);
    Array.from(sol.childNodes).forEach(n => box.appendChild(n.cloneNode(true)));
    box.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    show(box, 'sol', btn, true);
    btn.setAttribute('aria-expanded', 'true');
    return true;
  };

  // mouse hover
  stage.addEventListener('pointerover', e => {
    if (!hoverOK(e)) return;
    const a = e.target.closest(PREVIEW);
    if (a) { if (a !== owner) showPreview(a, false); return; }
    const ent = e.target.closest('.csl-entry');
    if (ent && ent !== owner && !e.target.closest('a')) showAbstract(ent, false);
  });
  stage.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse' || !owner || tip.classList.contains('lp-tip-touch')) return;
    if (owner.contains(e.target) && !owner.contains(e.relatedTarget)) hide();
  });

  // clicks and taps
  stage.addEventListener('click', e => {
    const touch = tapped();
    const sb = e.target.closest('.lp-sol-btn');
    if (sb) { if (owner === sb) hide(); else showSolution(sb); return; }
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      if (touch && owner !== a && a.matches(PREVIEW) && showPreview(a, true)) { e.preventDefault(); return; }
      if (follow(a)) e.preventDefault();
      return;
    }
    if (e.target.closest('a')) { if (owner) hide(); return; }   // an external link (DOI, arXiv) just opens
    const ent = e.target.closest('.csl-entry');
    if (ent && ent.querySelector('.ref-abs')) {
      if (touch && owner === ent) hide(); else if (owner !== ent) showAbstract(ent, touch);
      return;
    }
    if (owner) hide();
  });
  tip.addEventListener('click', e => {
    if (owner && owner.classList && owner.classList.contains('lp-sol-btn')) return;   // read, select, scroll: stays open
    if (owner && owner.matches && owner.matches('a[href^="#"]')) { e.preventDefault(); follow(owner); }
    else hide();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && owner) hide(); });
  document.addEventListener('click', e => {
    if (owner && !tip.contains(e.target) && !stage.contains(e.target)) hide();
  });
  // scrolling the page moves the anchor away; a scroll inside the tooltip itself (long abstracts) does not count
  addEventListener('scroll', e => { if (owner && e.target !== tip) hide(); }, { passive: true, capture: true });
  addEventListener('resize', () => { if (owner) hide(); });
}

/* ---------------------------------------------------------------- report (used by `livepaper check`) */
LP.report = () => {
  const stage = $('lp-stage');
  const pageOf = e => { const s = e.closest('.sheet'); return s ? sheets().indexOf(s) + 1 : 0; };
  const wide = [];
  stage.querySelectorAll('.eq .katex-display, .eq > .math').forEach(d => {
    if (d.scrollWidth > d.clientWidth + 1) wide.push({ page: pageOf(d), id: (d.closest('.eq') || {}).id || '', excess: d.scrollWidth - d.clientWidth });
  });
  const widthOverflow = [];
  stage.querySelectorAll('.col-body > *, .band > *').forEach(b => {
    if (b.scrollWidth > b.clientWidth + 2 && !b.classList.contains('eq')) widthOverflow.push({ page: pageOf(b), tag: b.tagName, cls: b.className, text: b.textContent.trim().slice(0, 60), excess: b.scrollWidth - b.clientWidth });
  });
  const stranded = [];
  stage.querySelectorAll('.col-body').forEach(cb => {
    const last = cb.lastElementChild;
    if (last && /^H[2-6]$/.test(last.tagName)) stranded.push({ page: pageOf(cb), text: last.textContent.trim().slice(0, 60) });
  });
  const liveOverflow = [];
  stage.querySelectorAll('.col').forEach(c => {
    const used = c.firstChild.offsetHeight + c.lastChild.offsetHeight;
    if (used > c.clientHeight + 1) liveOverflow.push({ page: pageOf(c), col: c === c.parentNode.firstChild ? 1 : 2, why: 'column content taller than the column', tag: '', cls: '', text: (c.firstChild.lastElementChild || c).textContent.trim().slice(0, 60), excess: used - c.clientHeight });
  });
  return {
    mode, pages: sheets().length, ms: layout && layout.ms, stats: layout && layout.stats, overflows: ((layout && layout.overflows) || []).concat(liveOverflow),
    wideEquations: wide, widthOverflow, stranded,
    missingRefs: Array.from(stage.querySelectorAll('.xref-missing')).map(e => e.textContent),
    katexErrors: Array.from(stage.querySelectorAll('.katex-error')).map(e => e.getAttribute('title') || e.textContent),
    figures: (LP.instances || []).length,
    missingFigures: Array.from(stage.querySelectorAll('.lp-missing')).map(e => e.textContent),
    scenes: Array.from(player.scenes.values()).map(s => ({ id: s.id, steps: s.steps.length, figs: s.figs.length, els: s.els.length })),
    errors: LP.errors.slice(),
  };
};

/* ---------------------------------------------------------------- bare figure mode (snapshots) */
function bareFigure(name, step) {
  html.classList.add('bare-fig', 'static');
  player.static = true;
  const src = LP.readSource($('lp-src'));
  const stage = $('lp-stage');
  stage.textContent = '';
  let fig = null;
  src.frag.querySelectorAll('figure[data-live]').forEach(f => { if (!fig && (f.dataset.live === name || f.id === name)) fig = f; });
  if (!fig) { LP.err('no figure ' + name); return; }
  const holder = document.createElement('div');
  holder.className = 'flowtext lp-bare';
  const wide = fig.classList.contains('wide') || fig.classList.contains('full');
  holder.style.width = (wide ? 788 : 380.5) + 12 + 'px';
  holder.appendChild(fig);
  stage.appendChild(holder);
  const inst = LP.mountFigure(fig, { bare: true });
  if (!inst) return;
  const n = Math.max(1, (inst.def.steps || []).length, (LP.data.scenes.find(s => s.id === fig.dataset.scene) || { steps: [] }).steps.length);
  const k = Math.min(n, Math.max(1, step || +fig.dataset.snap || inst.def.snap || n)) - 1;
  LP.frameInstance(inst, { t: (k + 1) * 2.2, k, step: k + 1, frac: 1, n, playing: false, rest: true, scene: fig.dataset.scene || '' });
  LP.kit.relayoutTex(stage);
}

/* ---------------------------------------------------------------- boot */
async function boot() {
  applyTheme(qs.get('theme') || LP.store.get('theme', 'auto'));
  if (qs.has('static')) { html.classList.add('static'); player.static = true; player.autoplay = false; }
  if (qs.has('bare')) html.classList.add('bare');
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* fonts API missing */ }
  if (qs.has('fig')) { bareFigure(qs.get('fig'), +(qs.get('step') || 0)); window.LP_READY = true; readyResolve(); return; }
  wireBar();
  wireLinks();
  const narrow = innerWidth < 720;
  const m = qs.get('mode') || LP.store.get('mode', narrow ? 'reflow' : 'paper');
  await render(m === 'reflow' ? 'reflow' : 'paper');
  LP.kit.relayoutTex($('lp-stage'));
  watchLateFonts();
  player.start();
  if (location.hash.length > 1) setTimeout(() => jumpTo(decodeURIComponent(location.hash.slice(1)), false), 60);
  window.LP_READY = true;
  readyResolve();
}
LP.render = render;
/* if a web font arrives after layout and makes a column overflow, typeset again (keeping the page) */
function watchLateFonts() {
  const refit = () => { if (mode === 'paper' && columnsOverflow()) repaginate(); };
  // WebKit does not always fire loadingdone for faces that arrive after the first layout: look again a few times
  [400, 1500, 4000].forEach(ms => setTimeout(refit, ms));
  if (!document.fonts || !document.fonts.addEventListener) return;
  let t = 0;
  document.fonts.addEventListener('loadingdone', () => {
    clearTimeout(t);
    t = setTimeout(refit, 150);
  });
}
/* for figure modules: scroll to an element of the paper by id (e.g. a section), with a flash */
LP.jump = id => jumpTo(id, true);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.LP);
