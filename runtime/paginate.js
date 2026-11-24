/* livepaper runtime — paginate: flows the article into fixed 900x1200 two-column sheets.
   Blocks are placed one by one into the current column and measured. Paragraphs split at word
   boundaries (KaTeX stays atomic), lists/environments/reference lists split between children,
   figures/tables/algorithms float to the next column top when they do not fit, wide figures go to a
   band at the top of the next page, and full figures get a page of their own. */
(function (LP) {
'use strict';

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

function classify(b) {
  if (b.nodeType !== 1) return 'skip';
  const t = b.tagName, c = b.classList;
  if (t === 'SCRIPT' || t === 'TEMPLATE' || t === 'STYLE' || b.id === 'footnotes') return 'skip';
  if (c.contains('lp-group')) return c.contains('full') ? 'full' : c.contains('wide') ? 'wide' : 'float';
  if (c.contains('lp-fig') || c.contains('lp-tbl') || c.contains('algo')) {
    if (c.contains('full')) return 'full';
    if (c.contains('wide')) return 'wide';
    return 'float';
  }
  if (t === 'P') return 'para';
  if (/^H[2-6]$/.test(t)) return 'heading';
  if (c.contains('eq') || c.contains('take') || t === 'HR' || t === 'TABLE' || t === 'FIGURE') return 'atomic';
  if (c.contains('lp-env') || c.contains('lp-box') || c.contains('csl-bib-body') || c.contains('references') ||
      t === 'UL' || t === 'OL' || t === 'BLOCKQUOTE' || t === 'SECTION' || t === 'DIV') return 'container';
  return 'atomic';
}

const WS = /[ \n\t\r]/;
function collectBreaks(p) {
  const out = [];
  const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const pe = n.parentElement;
    if (pe && pe !== p && pe.closest('.katex, .footnote-ref, .eqno, .qed, .lp-hd')) continue;
    const s = n.data;
    for (let i = 0; i < s.length; i++) {
      if (WS.test(s[i]) && (i === 0 ? out.length > 0 : !WS.test(s[i - 1]))) out.push({ node: n, offset: i });
    }
  }
  return out;
}
function firstText(e) { const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); return tw.nextNode(); }
function lastText(e) { const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n, last = null; while ((n = tw.nextNode())) last = n; return last; }
function trimStart(e) { const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { if (t.parentElement && t.parentElement !== e && t.parentElement.closest('.katex')) return; const v = t.data.replace(/^[ \n\t\r]+/, ''); t.data = v; if (v.length) return; } }
function trimEnd(e) { const t = lastText(e); if (t) t.data = t.data.replace(/[ \n\t\r]+$/, ''); }

/* ------------------------------------------------------------------ the paginator */
function Paginator(src, pagesEl) {
  const P = { pages: [], overflows: [] };
  let sheet = null, body = null, cols = null, colEls = null, col = 0, colBody = null, colFoot = null, cap = 0;
  const floats = [], wides = [], fulls = [];
  const placed = new Set();
  let LH = 13.4;

  function makeSheet(cls) {
    const s = el('article', 'sheet' + (cls ? ' ' + cls : ''), pagesEl);
    s.innerHTML = '<header class="rh"><span class="l"></span><span class="r caps"></span></header>' +
      '<div class="sheet-body"></div><footer class="rf"><span class="l"><i></i></span><span class="pg"></span><span class="r"></span></footer>';
    P.pages.push(s);
    return s;
  }
  function mkCol() { const c = el('div', 'col', cols); el('div', 'col-body flowtext', c); el('div', 'col-foot flowtext', c); return c; }
  function setCol(i) { col = i; const c = colEls[i]; colBody = c.firstChild; colFoot = c.lastChild; cap = c.clientHeight; }
  function newPage() {
    flushFulls();
    sheet = makeSheet();
    body = sheet.querySelector('.sheet-body');
    cols = null;
    if (P.pages.length === 1 && src.mast) body.appendChild(src.mast);
    if (wides.length) addBand();
    cols = el('div', 'cols', body);
    colEls = [mkCol(), mkCol()];
    setCol(0);
    LH = parseFloat(getComputedStyle(colBody).getPropertyValue('--lh')) || 13.4;
  }
  function fits(reserve = 0) { return colBody.offsetHeight + colFoot.offsetHeight + reserve <= cap + 0.5; }
  function colEmpty() { return !colBody.firstElementChild; }
  /* a column shortened by a band of wide figures (or the masthead): a block too tall for it may fit a full one.
     Each block may be passed on twice, so a run of short columns cannot defer it forever. */
  function shortCol() { return !!body && cap < body.clientHeight - 4 * LH; }
  function passOn(b) { if (!shortCol() || (b.__lpPassed || 0) >= 2) return false; b.__lpPassed = (b.__lpPassed || 0) + 1; return true; }
  function pageFresh() { return colEls && !colEls[0].firstChild.firstElementChild && !colEls[1].firstChild.firstElementChild; }
  function room() { return cap - colBody.offsetHeight - colFoot.offsetHeight; }
  function overflow(b, why) {
    P.overflows.push({ page: P.pages.length, col: col + 1, why: why || 'too tall for a column', tag: b.tagName,
      cls: b.className, text: (b.textContent || '').trim().slice(0, 70) });
  }

  function addBand() {
    let band = body.querySelector(':scope > .band');
    if (!band) {
      band = el('div', 'band flowtext');
      if (P.pages.length === 1 && src.mast) band.classList.add('after-mast');
      if (cols) body.insertBefore(band, cols); else body.appendChild(band);
    }
    while (wides.length) {
      const w = wides[0];
      band.appendChild(w);
      if (band.children.length > 1 && band.offsetHeight > body.clientHeight * 0.7) { w.remove(); break; }
      wides.shift();
      notesFor(w, true);
    }
    if (cols) setCol(col);
  }
  function flushFulls() {
    while (fulls.length) {
      const f = fulls.shift();
      const s = makeSheet('full-page');
      const b = s.querySelector('.sheet-body');
      const holder = el('div', 'band flowtext', b);
      holder.appendChild(f);
    }
  }

  /* footnotes go to the foot of the column holding the reference */
  function notesFor(block, toPageFoot) {
    const out = [];
    if (!block.querySelectorAll) return out;
    block.querySelectorAll('a.footnote-ref').forEach(a => {
      const id = (a.getAttribute('href') || '').slice(1);
      if (!id || placed.has(id)) return;
      const li = src.notes.get(id);
      if (!li) return;
      const d = el('div', 'fn');
      d.id = id;
      const sup = el('sup', '', d); sup.textContent = a.textContent.trim();
      li.cloneNode(true).childNodes.forEach(ch => d.appendChild(ch));
      (toPageFoot && colEls ? colEls[0].lastChild : colFoot).appendChild(d);
      placed.add(id); out.push(d);
    });
    return out;
  }
  function dropNotes(list) { list.forEach(d => { d.remove(); placed.delete(d.id); }); }

  function nextCol() {
    if (col === 0) setCol(1); else newPage();
    flushFloats();
  }
  /* move on to the next column, carrying any headings stranded at the bottom of this one */
  function advance() {
    const carry = [];
    let last = colBody.lastElementChild;
    while (last && /^H[2-6]$/.test(last.tagName) && last.previousElementSibling) { carry.unshift(last); last.remove(); last = colBody.lastElementChild; }
    nextCol();
    carry.forEach(h => colBody.appendChild(h));
  }

  /* a heading directly above a block that is about to be deferred travels with it */
  let prevBlock = null;   // the block placed just before the current one, in source order
  function withHeading(b, kind) {
    const last = colBody.lastElementChild;
    if (!last || !/^H[2-6]$/.test(last.tagName) || last !== prevBlock) return b;
    last.remove();
    const g = el('div', 'lp-group' + (kind === 'wide' ? ' wide' : kind === 'full' ? ' full' : ''));
    g.appendChild(last);
    g.appendChild(b);
    return g;
  }
  function placeFloat(b) {
    if (floats.length) { floats.push(withHeading(b, 'float')); return; }
    colBody.appendChild(b);
    const n = notesFor(b);
    if (fits()) return;
    dropNotes(n); b.remove();
    if (colEmpty() && !passOn(b)) { colBody.appendChild(b); notesFor(b); overflow(b); return; }
    floats.push(withHeading(b, 'float'));
  }
  function flushFloats() {
    while (floats.length) {
      const b = floats[0];
      colBody.appendChild(b);
      const n = notesFor(b);
      if (fits()) { floats.shift(); continue; }
      if (colBody.children.length === 1 && !passOn(b)) { floats.shift(); overflow(b); continue; }
      dropNotes(n); b.remove(); break;
    }
  }

  function placeAtomic(b) {
    colBody.appendChild(b);
    const n = notesFor(b);
    if (fits()) return;
    dropNotes(n); b.remove();
    if (colEmpty() && !passOn(b)) { colBody.appendChild(b); notesFor(b); overflow(b); return; }
    advance(); placeAtomic(b);
  }
  function placeHeading(h) {
    placeAtomic(h);
    // too little room under it: move on, taking along a heading directly above (a section title over its first subsection)
    if (colBody.children.length > 1 && room() < 2.6 * LH) { h.remove(); advance(); colBody.appendChild(h); }
  }

  /* split a paragraph that sits (overflowing) at the end of the column.
     Returns {head, rest} or null when no acceptable split exists (p is then left where it was). */
  function splitPara(p, reserve) {
    const breaks = collectBreaks(p);
    if (breaks.length < 3) return null;
    const lh = parseFloat(getComputedStyle(p).lineHeight) || LH;
    const shell = p.cloneNode(false);
    shell.classList.add('split');
    p.replaceWith(shell);
    const prefix = i => { const r = document.createRange(); r.setStart(p, 0); r.setEnd(breaks[i].node, breaks[i].offset); return r.cloneContents(); };
    const search = (hi, test) => { let lo = 0, best = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; shell.replaceChildren(prefix(mid)); if (test()) { best = mid; lo = mid + 1; } else hi = mid - 1; } return best; };
    let best = search(breaks.length - 1, () => fits(reserve));
    if (best < 0) { shell.replaceWith(p); return null; }
    shell.replaceChildren(prefix(best));
    if (shell.offsetHeight < 2 * lh - 2) { shell.replaceWith(p); return null; }
    const makeRest = i => {
      const r = document.createRange(); r.setStart(breaks[i].node, breaks[i].offset); r.setEnd(p, p.childNodes.length);
      const rest = p.cloneNode(false);
      rest.removeAttribute('id'); rest.classList.remove('split', 'dropcap'); rest.classList.add('cont');
      rest.appendChild(r.cloneContents()); trimStart(rest);
      return rest;
    };
    let rest = makeRest(best);
    colBody.appendChild(rest);
    const restH = rest.offsetHeight;
    rest.remove();
    if (restH < 2 * lh - 2) {
      const target = shell.offsetHeight - lh + 0.5;
      const b2 = search(best, () => shell.offsetHeight <= target);
      shell.replaceChildren(prefix(b2 >= 0 ? b2 : best));
      if (b2 >= 0 && shell.offsetHeight >= 2 * lh - 2) { best = b2; rest = makeRest(best); }
      else { shell.replaceChildren(prefix(best)); }
    }
    trimEnd(shell);
    return { head: shell, rest };
  }

  function placePara(p) {
    colBody.appendChild(p);
    let n = notesFor(p);
    if (fits()) return;
    const reserveAll = n.length ? colFoot.offsetHeight : 0;
    dropNotes(n);
    const base = colFoot.offsetHeight;
    const s = splitPara(p, Math.max(0, reserveAll - base));
    if (s) { notesFor(s.head); advance(); placePara(s.rest); return; }
    p.remove();
    if (colEmpty()) { colBody.appendChild(p); notesFor(p); overflow(p); return; }
    advance(); placePara(p);
  }

  function placeContainer(c) {
    colBody.appendChild(c);
    const n = notesFor(c);
    if (fits()) return;
    dropNotes(n); c.remove();
    const kids = Array.from(c.childNodes).filter(k => k.nodeType === 1);
    if (kids.length < 2) {
      if (colEmpty()) { colBody.appendChild(c); notesFor(c); overflow(c); return; }
      advance(); placeAtomicOrOverflow(c); return;
    }
    const shell = c.cloneNode(false);
    colBody.appendChild(shell);
    let restKids = null, liPlaced = 0;
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      shell.appendChild(kid);
      const nn = notesFor(kid);
      if (fits()) { if (kid.tagName === 'LI') liPlaced++; continue; }
      dropNotes(nn);
      if (kid.tagName === 'P') {
        const s = splitPara(kid, 0);
        if (s) { notesFor(s.head); restKids = [s.rest, ...kids.slice(i + 1)]; break; }
      }
      kid.remove();
      restKids = kids.slice(i);
      break;
    }
    if (!restKids) return;
    const cont = c.cloneNode(false);
    if (!shell.firstElementChild) {
      shell.remove();
      restKids.forEach(k => cont.appendChild(k));
      if (colEmpty()) { colBody.appendChild(cont); overflow(cont); return; }
      advance(); placeContainer(cont); return;
    }
    cont.removeAttribute('id');
    cont.classList.add('cont');
    if (c.tagName === 'OL') cont.setAttribute('start', String((parseInt(c.getAttribute('start') || '1', 10)) + liPlaced));
    restKids.forEach(k => cont.appendChild(k));
    advance(); placeContainer(cont);
  }
  function placeAtomicOrOverflow(b) {
    colBody.appendChild(b);
    if (fits() || colBody.children.length === 1) { notesFor(b); if (!fits()) overflow(b); return; }
    b.remove(); advance(); colBody.appendChild(b); notesFor(b); if (!fits()) overflow(b);
  }

  function place(b) {
    const k = classify(b);
    if (k === 'skip') return;
    if (k === 'full') { fulls.push(b); return; }
    if (k === 'wide') { wides.push(pageFresh() ? b : withHeading(b, 'wide')); if (pageFresh()) addBand(); return; }
    if (k === 'float') return placeFloat(b);
    if (k === 'para') return placePara(b);
    if (k === 'container') return placeContainer(b);
    if (k === 'heading') return placeHeading(b);
    return placeAtomic(b);
  }

  P.stats = {};
  P.run = (blocks) => {
    newPage();
    blocks.forEach(b => {
      const t0 = performance.now();
      place(b);
      prevBlock = b;
      const k = classify(b);
      const s = P.stats[k] || (P.stats[k] = { n: 0, ms: 0, max: 0, maxText: '' });
      const dt = performance.now() - t0;
      s.n++; s.ms += dt;
      if (dt > s.max) { s.max = dt; s.maxText = (b.textContent || '').trim().slice(0, 50); }
    });
    let guard = 0;
    while (floats.length && guard++ < 500) nextCol();
    if (wides.length) newPage();
    flushFulls();
    // drop a trailing page that ended up empty
    const last = P.pages[P.pages.length - 1];
    if (last && P.pages.length > 1 && !last.classList.contains('full-page') && !last.querySelector('.col-body > *, .band > *')) { last.remove(); P.pages.pop(); }
    return P;
  };
  return P;
}

/* ------------------------------------------------------------------ source handling */
LP.readSource = (tpl) => {
  const frag = tpl.content.cloneNode(true);
  const data = LP.readData(frag);
  const meta = {};
  frag.querySelectorAll('.lp-meta').forEach(m => { meta[m.dataset.k] = m.innerHTML.trim(); m.remove(); });
  const mast = frag.querySelector('header.mast');
  const flow = frag.querySelector('.lp-flow');
  const notes = new Map();
  const fnSec = flow && flow.querySelector('#footnotes');
  if (fnSec) {
    fnSec.querySelectorAll('li[id]').forEach(li => { li.querySelectorAll('.footnote-back').forEach(a => a.remove()); notes.set(li.id, li); });
    fnSec.remove();
  }
  const blocks = flow ? Array.from(flow.children) : [];
  // drop cap on the first paragraph that follows the first section heading
  const h = blocks.findIndex(b => b.tagName === 'H2');
  if (h >= 0 && blocks[h + 1] && blocks[h + 1].tagName === 'P') blocks[h + 1].classList.add('dropcap');
  return { frag, data, meta, mast, blocks, notes };
};

function runningHeads(pages, meta) {
  let current = '';
  pages.forEach((s, i) => {
    const hs = s.querySelectorAll('.col-body h2');
    const firstBlock = s.querySelector('.col-body > *');
    let head = current;
    if (hs.length && firstBlock === hs[0]) head = label(hs[0]);
    if (!head && hs.length) head = label(hs[0]);
    if (hs.length) current = label(hs[hs.length - 1]);
    s.querySelector('.rh .l').innerHTML = meta.runhead || '';
    s.querySelector('.rh .r').textContent = (i === 0 ? (meta.topics ? '' : head) : head) || '';
    if (i === 0 && meta.topics) s.querySelector('.rh .r').innerHTML = meta.topics;
    s.querySelector('.rf .l i').innerHTML = meta['footer-left'] || '';
    s.querySelector('.rf .pg').textContent = String(i + 1);
    s.querySelector('.rf .r').innerHTML = meta['footer-right'] || '';
  });
  function label(h2) {
    const n = h2.querySelector('.num');
    return (n ? n.textContent + ' · ' : '') + (h2.dataset.rh || h2.textContent);
  }
}

LP.layoutPaper = (src, pagesEl) => {
  const pg = Paginator(src, pagesEl);
  const t0 = performance.now();
  pg.run(src.blocks);
  runningHeads(pg.pages, src.meta);
  pg.ms = Math.round(performance.now() - t0);
  return pg;
};

LP.layoutReflow = (src, holder) => {
  const art = el('article', 'reflow', holder);
  if (src.mast) art.appendChild(src.mast);
  const flow = el('div', 'flowtext', art);
  src.blocks.forEach(b => { if (classify(b) !== 'skip') flow.appendChild(b); });
  if (src.notes.size) {
    const notes = el('section', 'notes', art);
    src.notes.forEach((li, id) => {
      const d = el('div', 'fn', notes); d.id = id;
      const ref = flow.querySelector('a.footnote-ref[href="#' + id + '"]');
      const sup = el('sup', '', d); sup.textContent = ref ? ref.textContent.trim() : '';
      li.childNodes.forEach(ch => d.appendChild(ch.cloneNode(true)));
    });
  }
  return { pages: [art], overflows: [] };
};
})(window.LP);
