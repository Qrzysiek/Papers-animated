/* livepaper runtime — lint: layout problems a screenshot shows but the column report does not.
   LP.lintFigures(): in every mounted figure (as drawn now, normally the rest frame), labels that
     - stick out of the viewBox,
     - overlap another label,
     - sit on a drawn line or data point.
   LP.lintPages(): sparse pages and figures placed far from their first mention.
   Used by `livepaper check`. A figure opts out with `lint: false` in its module; one element (and its children)
   with the attribute data-lint="off". */
(function (LP) {
'use strict';

const isHidden = (el, stop) => {
  for (let e = el; e && e !== stop; e = e.parentNode) {
    if (e.nodeType !== 1) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return true;
    const op = e.getAttribute('opacity');
    if (op !== null && +op < 0.05) return true;
  }
  return false;
};
const off = el => !!el.closest('[data-lint="off"]');
const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const shrink = (r, d) => ({ left: r.left + d, right: r.right - d, top: r.top + d, bottom: r.bottom - d });

function labelsOf(svg) {
  const out = [];
  svg.querySelectorAll('text, foreignObject.lp-tex').forEach(el => {
    if (el.tagName === 'text' && el.closest('foreignObject')) return;
    if (off(el) || isHidden(el, svg.parentNode)) return;
    const kh = el.querySelector && el.querySelector('.katex-html');   // KaTeX: the visible part, not the MathML copy
    const txt = ((kh || el).textContent || '').trim();
    if (!txt) return;
    let r;
    if (el.tagName.toLowerCase() === 'foreignobject') {
      const k = el.querySelector('.katex-html') || el.querySelector('.katex') || el.firstElementChild;
      r = k ? k.getBoundingClientRect() : el.getBoundingClientRect();
    } else {
      // an SVG text box spans the font's full ascent and descent; glyphs fill roughly its middle 60 %
      const b = el.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(el).fontSize) * (svg.getScreenCTM() ? svg.getScreenCTM().a : 1) || b.height / 1.2;
      const t = Math.min(0.22 * fs, b.height * 0.2), u = Math.min(0.18 * fs, b.height * 0.15);
      r = { left: b.left, right: b.right, top: b.top + t, bottom: b.bottom - u, width: b.width, height: b.height - t - u };
    }
    if (r.width < 1 || r.height < 1) return;
    out.push({ el, txt: txt.replace(/\s+/g, ' ').slice(0, 40), r });
  });
  return out;
}

/* sample points (client px) of a stroked element; small filled circles count as data points */
function samplesOf(el, svg, step) {
  const tag = el.tagName;
  const cs = getComputedStyle(el);
  const stroked = cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0;
  const M = el.getScreenCTM();
  if (!M) return null;
  if (tag === 'circle') {
    const r = +el.getAttribute('r');
    if (r > 12) { if (!stroked) return null; }
    else {
      const p = new DOMPoint(+el.getAttribute('cx'), +el.getAttribute('cy')).matrixTransform(M);
      return { pts: [[p.x, p.y]], point: true, rad: r * M.a };
    }
  }
  if (!stroked) return null;
  if ((el.getAttribute('class') || '').split(/\s+/).includes('sfaint')) return null;   // grid and helper lines
  let len = 0;
  try { len = el.getTotalLength(); } catch (e) { return null; }
  if (!(len > 0)) return null;
  const n = Math.min(600, Math.max(2, Math.ceil(len / step)));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const q = el.getPointAtLength(len * i / n);
    const p = new DOMPoint(q.x, q.y).matrixTransform(M);
    pts.push([p.x, p.y]);
  }
  return { pts, point: false };
}

LP.lintFigures = () => {
  const out = [];
  const stage = document.getElementById('lp-stage');
  const sheets = Array.from(document.querySelectorAll('.lp-pages > .sheet'));
  const pageOf = e => { const s = e.closest('.sheet'); return s ? sheets.indexOf(s) + 1 : 0; };
  (LP.instances || []).forEach(inst => {
    if (!inst || !inst.svg || inst.def.lint === false || !stage.contains(inst.svg)) return;
    const svg = inst.svg;
    const M = svg.getScreenCTM();
    if (!M || !(M.a > 0)) return;
    const u = M.a;                                // client px per viewBox unit
    const vb = svg.viewBox.baseVal;
    const p0 = new DOMPoint(vb.x, vb.y).matrixTransform(M), p1 = new DOMPoint(vb.x + vb.width, vb.y + vb.height).matrixTransform(M);
    const box = { left: p0.x, top: p0.y, right: p1.x, bottom: p1.y };
    const where = r => [Math.round((r.left - box.left) / u), Math.round((r.top - box.top) / u)];
    const fig = inst.el.id || inst.name, page = pageOf(inst.el);
    const labs = labelsOf(svg);
    const add = (kind, lab, extra) => out.push(Object.assign({ fig, page, kind, text: lab.txt, at: where(lab.r),
      box: [lab.r.left, lab.r.top, lab.r.width, lab.r.height].map(v => Math.round(v)) }, extra || {}));
    // 1. outside the viewBox
    labs.forEach(l => {
      const ex = Math.max(box.left - l.r.left, l.r.right - box.right, box.top - l.r.top, l.r.bottom - box.bottom) / u;
      if (ex > 2) add('outside', l, { by: Math.round(ex) });
    });
    // 2. label on label
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
      const a = labs[i], b = labs[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const A = shrink(a.r, 1 * u), B = shrink(b.r, 1 * u);
      const ov = inter(A, B), small = Math.min((A.right - A.left) * (A.bottom - A.top), (B.right - B.left) * (B.bottom - B.top));
      if (small > 0 && ov / small > 0.12) add('overlap', a, { other: b.txt });
    }
    // 3. label on a line or a data point
    const strokes = [];
    svg.querySelectorAll('path, line, polyline, polygon, circle, ellipse, rect').forEach(el => {
      if (el.closest('defs, marker, clipPath, foreignObject') || off(el) || isHidden(el, svg.parentNode)) return;
      const s = samplesOf(el, svg, 3);
      if (s) strokes.push(Object.assign(s, { el }));
    });
    /* a label wholly inside a filled shape (a box, a region, a badge) is meant to sit there */
    const inside = (el, R) => {
      if (typeof el.isPointInFill !== 'function') return false;
      const cs = getComputedStyle(el);
      if (!cs.fill || cs.fill === 'none') return false;
      const Mi = el.getScreenCTM() && el.getScreenCTM().inverse();
      if (!Mi) return false;
      return [[R.left, R.top], [R.right, R.top], [R.left, R.bottom], [R.right, R.bottom]]
        .every(c => el.isPointInFill(new DOMPoint(c[0], c[1]).matrixTransform(Mi)));
    };
    const fills = [];
    svg.querySelectorAll('path, polygon, circle, ellipse, rect').forEach(el => {
      if (el.closest('defs, marker, clipPath, foreignObject') || isHidden(el, svg.parentNode)) return;
      const cs = getComputedStyle(el);
      if (cs.fill && cs.fill !== 'none' && (+cs.fillOpacity || 0) > 0.6) fills.push(el);
    });
    labs.forEach(l => {
      const R = shrink(l.r, 1.5 * u);
      if (R.right <= R.left || R.bottom <= R.top) return;
      let hit = null;
      for (const s of strokes) {
        if (s.el.parentNode === l.el.parentNode && s.el.tagName === 'rect') continue;
        if (!s.point && inside(s.el, shrink(l.r, -0.5 * u))) continue;
        let n = 0;
        for (const p of s.pts) {
          const pad = s.point ? -Math.min(s.rad, 4 * u) * 0.5 : 0;
          if (p[0] > R.left + pad && p[0] < R.right - pad && p[1] > R.top + pad && p[1] < R.bottom - pad) n++;
        }
        if (s.point ? n >= 1 : n >= 3) {
          // a filled shape painted later that holds the whole label hides the line there (a gate box over its wire)
          const L = shrink(l.r, -0.5 * u);
          const hidden = fills.some(f => f !== s.el && (s.el.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) && inside(f, L));
          if (!hidden) { hit = s; break; }
        }
      }
      if (hit) add(hit.point ? 'on a data point' : 'on a line', l, { what: hit.el.tagName + (hit.el.getAttribute('class') ? '.' + hit.el.getAttribute('class').split(/\s+/)[0] : '') });
    });
  });
  return out;
};

LP.lintPages = () => {
  const sheets = Array.from(document.querySelectorAll('.lp-pages > .sheet'));
  const pageOf = e => { const s = e.closest('.sheet'); return s ? sheets.indexOf(s) + 1 : 0; };
  const sparse = [];
  sheets.forEach((sh, i) => {
    if (i === sheets.length - 1 || sh.querySelector('figure.full, .full')) return;
    let used = 0, total = 0;
    sh.querySelectorAll('.col').forEach(c => { used += c.firstChild.offsetHeight + (c.lastChild !== c.firstChild ? c.lastChild.offsetHeight : 0); total += c.clientHeight; });
    const band = sh.querySelector('.band');
    const bandH = band ? band.offsetHeight : 0;
    const cols = sh.querySelector('.cols');
    const frac = total ? (used + bandH * 2) / (total + bandH * 2) : 1;
    if (cols && frac < 0.45) sparse.push({ page: i + 1, filled: Math.round(frac * 100) });
  });
  const far = [];
  document.querySelectorAll('#lp-stage figure[id], #lp-stage .lp-table[id], #lp-stage div.table[id]').forEach(f => {
    const ref = document.querySelector('#lp-stage a.xref[href="#' + CSS.escape(f.id) + '"]');
    if (!ref) return;
    const a = pageOf(ref), b = pageOf(f);
    if (a && b && b - a > 1) far.push({ id: f.id, mentioned: a, placed: b });
  });
  const unref = [];
  document.querySelectorAll('#lp-stage figure[id]').forEach(f => {
    if (f.dataset.scene === 'abstract') return;
    if (!document.querySelector('#lp-stage a.xref[href="#' + CSS.escape(f.id) + '"]')) unref.push(f.id);
  });
  return { sparse, far, unreferenced: unref };
};
})(window.LP);
