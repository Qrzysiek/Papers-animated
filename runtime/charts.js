/* livepaper runtime — charts: declarative figure modules.
   LP.chart(spec) and LP.diagram(spec) return ordinary figure definitions ({viewBox, steps, snap, params, setup, render}),
   so a figure file can be as short as
     export default LP.chart({ x: {...}, y: {...}, data: 'name.key', series: [...] });
   Data files figures/_<name>.json are inlined by the build as LP.ds.<name>. README, "Chart and diagram figures". */
(function (LP) {
'use strict';
const kit = LP.kit;
LP.ds = LP.ds || {};

/* ---------------------------------------------------------------- shared helpers */
/* 'a.b.c' -> LP.ds.a.b.c; a key of the figure's default dataset wins; arrays/objects pass through */
function lookup(ref, base) {
  if (ref == null) return undefined;
  if (typeof ref !== 'string') return ref;
  if (base && base[ref] !== undefined) return base[ref];
  let o = LP.ds;
  for (const k of ref.split('.')) { if (o == null) return undefined; o = o[k]; }
  return o;
}
const stepRange = s => (s == null ? [1, 1] : Array.isArray(s) ? [s[0], s[1]] : [s, s]);
/* progress 0..1 of an element that builds up over steps lo..hi (each step eased) */
function prog(f, lo, hi) {
  if (f.step < lo) return 0;
  if (f.step > hi) return 1;
  return (f.step - lo + kit.ease(f.frac)) / (hi - lo + 1);
}
const shown = (f, o) => o.until == null || f.step <= o.until;
/* plain text or $TeX$ label */
function label(parent, x, y, s, o = {}) {
  s = String(s);
  if (/^\$[\s\S]*\$$/.test(s)) return kit.tex(parent, x, y, s.slice(1, -1), { size: o.size, anchor: o.anchor || 'start', valign: o.valign || 'middle', cls: o.cls });
  const lines = s.split('\n');
  const size = o.size || 16;
  const va = o.valign || 'middle';
  const y0 = y + size * 0.35 - (va === 'middle' ? (lines.length - 1) * size * 0.6 : va === 'bottom' ? (lines.length - 1) * size * 1.2 + size * 0.35 : va === 'top' ? -size * 0.65 : 0);
  const g = kit.g(parent);
  lines.forEach((ln, i) => kit.text(g, x, y0 + i * size * 1.2, ln, { anchor: o.anchor || 'start', size, cls: o.cls, italic: o.italic, weight: o.weight }));
  return g;
}
const opacity = (node, v) => { const e = node && (node.fo || node); if (e) e.setAttribute('opacity', +v.toFixed(3)); };
/* '{y:.2f}' style templates in labels, filled from a data point */
const fill = (s, pt) => String(s).replace(/\{([xy])(?::\.(\d+)f)?\}/g, (m, k, d) => {
  const v = pt[k === 'x' ? 0 : 1];
  return d != null ? (+v).toFixed(+d) : String(+(+v).toPrecision(4));
});

const LINE = {   // series styles: [stroke class, width, dasharray]
  ink: ['ink', 2.6], thick: ['ink', 3.4], thin: ['ink', 1.6], mid: ['smid', 2.4], soft: ['ssoft', 2.2],
  dashed: ['smid', 2.4, '8 5'], dotted: ['ink', 2.4, '2 5'], 'ink-dashed': ['ink', 2.6, '8 5'], faint: ['sfaint', 1.4, '4 4'],
};
const POINT = { dot: ['fink', ''], open: ['fpaper ink', 1.8], mid: ['fmid', ''], square: ['fink', ''] };

/* nice ticks for [a, b] */
function niceTicks(a, b, n = 5) {
  const span = b - a;
  if (!(span > 0)) return [a];
  const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p, step = (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(12));
  return out;
}
const numFmt = v => String(+(+v).toPrecision(6));

/* ---------------------------------------------------------------- LP.chart */
/* one plot box (bx) with its axes, reference lines, series, marks, texts and legend; spec is a chart or one panel */
function chartSetup(spec, svg, kit, P, bx) {
    const size = spec.size || 16;
    const items = spec.series || [];
    const base = lookup(spec.data);
    const ax = (o, other) => {
      o = o || {};
      const log = !!o.log;
      const T = log ? v => Math.log10(v) : v => v;
      const r = o.range || [0, 1];
      const ticks = o.ticks || (log ? (() => { const t = []; for (let e = Math.ceil(T(r[0]) - 1e-9); e <= T(r[1]) + 1e-9; e++) t.push(Math.pow(10, e)); return t; })() : niceTicks(r[0], r[1]));
      const fmt = typeof o.fmt === 'function' ? o.fmt : o.fmt === 'pow10' ? (v => '$10^{' + Math.round(Math.log10(v)) + '}$')
        : o.fmt === 'pi' ? (v => { const q = v / Math.PI; return Math.abs(q) < 1e-9 ? '0' : '$' + (Math.abs(q - 1) < 1e-9 ? '' : numFmt(q)) + '\\pi$'; })
        : o.fmt === 'none' ? (() => '') : (v => numFmt(v));
      return { T, r: [T(r[0]), T(r[1])], ticks: ticks.map(T), fmt: v => fmt(log ? Math.pow(10, v) : v), label: o.label, grid: o.grid };
    };
    const XA = ax(spec.x), YA = ax(spec.y);
    const A = kit.axes(svg, { x: bx.x, y: bx.y, w: bx.w, h: bx.h, xr: XA.r, yr: YA.r, size, xticks: XA.ticks, yticks: YA.ticks,
      xfmt: XA.fmt, yfmt: YA.fmt, xlabel: XA.label, ylabel: YA.label, grid: spec.grid, arrows: spec.arrows });
    const X = v => A.X(XA.T(v)), Y = v => A.Y(YA.T(v));
    const S = { A, X, Y, base, parts: [], P };
    const inBox = p => p[0] >= bx.x - 1 && p[0] <= bx.x + bx.w + 1 && p[1] >= bx.y - 1 && p[1] <= bx.y + bx.h + 1;
    const clip = kit.el('clipPath', { id: 'lpclip' + Math.random().toString(36).slice(2, 8) }, svg);
    kit.rect(clip, bx.x - 6, bx.y - 6, bx.w + 12, bx.h + 12);
    const plotG = kit.g(svg, { 'clip-path': 'url(#' + clip.id + ')' });
    S.plotG = plotG;

    /* data of a series: [[x, y], ...] in data units */
    const dataOf = (s, P) => {
      const ds = s.data ? lookup(s.data) : base;
      if (s.fn) { const d = s.domain || spec.x.range; const n = s.n || 200;
        return kit.linspace(d[0], d[1], n).map(x => [x, s.fn(x, P)]); }
      if (s.xy) { const v = lookup(typeof s.xy === 'function' ? s.xy(P) : s.xy, ds); return (v || []).map(p => [p[0], p[1]]); }
      const yk = typeof s.y === 'function' ? s.y(P) : s.y;
      const ys = lookup(yk, ds);
      if (!Array.isArray(ys)) { LP.err('chart: no data for series ' + JSON.stringify(yk)); return []; }
      if (Array.isArray(ys[0])) return ys.map(p => [p[0], p[1]]);
      const xk = s.x == null ? null : typeof s.x === 'function' ? s.x(P) : s.x;
      const xs = xk == null ? ys.map((_, i) => i + (s.start ?? 1)) : lookup(xk, ds);
      return ys.map((y, i) => [xs[i], y]);
    };
    const finite = p => isFinite(p[0]) && isFinite(p[1]) && (!spec.x.log || p[0] > 0) && (!spec.y.log || p[1] > 0);

    /* reference lines (drawn first, under the data) */
    (spec.hlines || []).forEach(o => {
      const g = kit.g(plotG), st = LINE[o.style || 'faint'];
      kit.line(g, bx.x, Y(o.y), bx.x + bx.w, Y(o.y), { cls: st[0], 'stroke-width': st[1], 'stroke-dasharray': st[2] });
      const part = { o, g };
      if (o.label) part.lab = label(svg, o.lx != null ? X(o.lx) : bx.x + 10 + (o.dx || 0), Y(o.y) - 12 + (o.dy || 0), o.label, { size, anchor: o.anchor || 'start', valign: 'bottom' });
      S.parts.push(part);
    });
    (spec.vlines || []).forEach(o => {
      const g = kit.g(plotG), st = LINE[o.style || 'faint'];
      kit.line(g, X(o.x), bx.y, X(o.x), bx.y + bx.h, { cls: st[0], 'stroke-width': st[1], 'stroke-dasharray': st[2] });
      const part = { o, g };
      if (o.label) part.lab = label(svg, X(o.x) + 8 + (o.dx || 0), (o.ly != null ? Y(o.ly) : bx.y + 14) + (o.dy || 0), o.label, { size, anchor: o.anchor || 'start' });
      S.parts.push(part);
    });

    /* series */
    S.series = items.map(s => {
      const kind = s.band ? 'band' : s.bars ? 'bars' : s.points ? 'points' : 'line';
      const g = kit.g(plotG);
      const it = { s, kind, g, key: null, px: [], els: [] };
      it.build = P => {
        const key = JSON.stringify([typeof s.y === 'function' ? s.y(P) : s.y, typeof s.x === 'function' ? s.x(P) : s.x, s.fn ? P : 0]);
        if (key === it.key) return;
        it.key = key;
        g.textContent = '';
        it.els = [];
        if (kind === 'band') {
          const lo = dataOf(Object.assign({}, s, { y: s.band[0] }), P), hi = dataOf(Object.assign({}, s, { y: s.band[1] }), P);
          const pts = lo.filter(finite).map(p => [X(p[0]), Y(p[1])]).concat(hi.filter(finite).reverse().map(p => [X(p[0]), Y(p[1])]));
          it.path = kit.path(g, kit.poly(pts, true), { cls: s.style === 'mid' ? 'fmid' : 'fsoft', opacity: 0.45, fill: null });
          it.path.removeAttribute('fill');
          it.data = lo; it.px = lo.filter(finite).map(p => [X(p[0]), Y(p[1])]);
          return;
        }
        const d = dataOf(s, P).filter(finite);
        it.data = d;
        it.px = d.map(p => [X(p[0]), Y(p[1])]);
        if (kind === 'line') {
          const st = LINE[s.style || 'ink'] || LINE.ink;
          it.path = kit.path(g, '', { cls: st[0], 'stroke-width': s.width || st[1], 'stroke-dasharray': st[2], 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
          // index of each step's end, for stops: [x1, x2, 'max']
          if (s.stops) {
            const iy = d.reduce((m, p, i) => (p[1] > d[m][1] ? i : m), 0);
            it.stopIdx = s.stops.map(v => v === 'max' ? iy : Math.max(0, d.findIndex(p => p[0] >= v)));
          }
        } else if (kind === 'points') {
          const st = POINT[s.style || 'dot'] || POINT.dot;
          const r = s.r || 5.5;
          it.els = it.px.map(p => (s.style === 'square')
            ? kit.rect(g, p[0] - r, p[1] - r, 2 * r, 2 * r, { cls: st[0] })
            : kit.circle(g, p[0], p[1], r, { cls: st[0], 'stroke-width': st[1] || null }));
        } else if (kind === 'bars') {
          const w = s.width || ((d.length > 1 ? Math.abs(d[1][0] - d[0][0]) : 1) * 0.8);
          const y0 = Y(spec.y.log ? spec.y.range[0] : Math.max(spec.y.range[0], 0));
          it.els = d.map(p => { const xa = X(p[0] - w / 2), xb = X(p[0] + w / 2), y = Y(p[1]);
            return kit.rect(g, Math.min(xa, xb), Math.min(y, y0), Math.abs(xb - xa), Math.abs(y0 - y), { cls: (s.style === 'mid' ? 'fmid' : s.style === 'open' ? 'fpaper' : 'fsoft') + ' ink', 'stroke-width': 1.4 }); });
        }
        if (it.lab) (it.lab.fo || it.lab).remove();
        it.lab = null;
        if (s.label && s.labelAt != null && it.px.length) {
          const at = s.labelAt;
          let i = at === 'end' ? it.px.length - 1 : at === 'start' ? 0 : at === 'max' ? d.reduce((m, p, j) => (p[1] > d[m][1] ? j : m), 0)
            : Math.max(0, d.findIndex(p => p[0] >= at));
          let p = it.px[i], datum = d[i];
          if (typeof at === 'number' && s.fn) { datum = [at, s.fn(at, P)]; p = [X(at), Y(datum[1])]; }   // exact point of an analytic curve
          const dx = s.dx ?? (at === 'start' ? -8 : 8), dy = s.dy ?? 0;
          it.lab = label(svg, p[0] + dx, p[1] + dy, fill(s.label, datum), { size, anchor: s.anchor || (at === 'start' ? 'end' : 'start'), valign: s.valign || 'middle' });
        }
      };
      it.build(P);
      return it;
    });

    /* marks: a point (optionally 'max:<key>' / 'min:<key>' / 'last:<key>') with a label */
    S.marks = (spec.marks || []).map(o => {
      let pt = [o.x, o.y];
      if (o.at) {
        const [how, key] = o.at.split(':');
        const it = S.series.find(t => t.s.y === key || t.s.id === key);
        const d = it ? it.data : [];
        if (d.length) {
          const i = how === 'max' ? d.reduce((m, p, j) => (p[1] > d[m][1] ? j : m), 0) : how === 'min' ? d.reduce((m, p, j) => (p[1] < d[m][1] ? j : m), 0)
            : how === 'first' ? 0 : d.length - 1;
          pt = d[i];
        }
      }
      const g = kit.g(svg);
      const st = POINT[o.style || 'open'] || POINT.open;
      if (o.style !== 'none') kit.circle(g, X(pt[0]), Y(pt[1]), o.r || 6, { cls: st[0], 'stroke-width': st[1] || 2.2 });
      const part = { o, g };
      if (o.label) part.lab = label(g, X(pt[0]) + (o.dx ?? 10), Y(pt[1]) + (o.dy ?? -10), fill(o.label, pt), { size, anchor: o.anchor || 'start', valign: o.valign || 'bottom' });
      return part;
    });
    S.texts = (spec.text || []).map(o => {
      const px = o.coords === 'px' ? [o.x, o.y] : [X(o.x), Y(o.y)];
      return { o, lab: label(svg, px[0], px[1], o.text, { size: o.size || size, anchor: o.anchor || 'middle', valign: o.valign, cls: o.cls, italic: o.italic }) };
    });

    /* legend: entries for labelled series without labelAt; 'auto' picks the emptiest corner of the plot box */
    const entries = S.series.filter(t => t.s.label && t.s.labelAt == null && t.s.legend !== false);
    if (entries.length && spec.legend !== false) {
      const rowH = size * 1.6, wSample = 40;
      const est = entries.reduce((m, t) => Math.max(m, String(t.s.label).replace(/\$|\\[a-z]+|[{}_^]/g, '').length * size * 0.52), 0);
      const lw = wSample + 12 + est, lh = entries.length * rowH;
      const pad = 14;
      const corners = { tl: [bx.x + pad + 10, bx.y + pad], tr: [bx.x + bx.w - lw - pad, bx.y + pad],
        bl: [bx.x + pad + 10, bx.y + bx.h - lh - pad], br: [bx.x + bx.w - lw - pad, bx.y + bx.h - lh - pad] };
      let pos = spec.legend && typeof spec.legend === 'object' ? [spec.legend.x, spec.legend.y] : corners[spec.legend];
      if (!pos) {
        let best = null;
        for (const c of ['tr', 'tl', 'br', 'bl']) {
          const [x0, y0] = corners[c];
          let hits = 0;
          S.series.forEach(t => {
            const pts = t.px; const n = pts.length;
            for (let i = 0; i < n; i++) { const p = pts[i]; if (p[0] > x0 - 10 && p[0] < x0 + lw + 10 && p[1] > y0 - 10 && p[1] < y0 + lh + 10) hits++; }
            for (let i = 1; i < n; i++) {   // segments crossing the box count too (sparse data)
              const a = pts[i - 1], b = pts[i];
              for (let u = 0.25; u < 1; u += 0.25) { const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
                if (x > x0 - 10 && x < x0 + lw + 10 && y > y0 - 10 && y < y0 + lh + 10) hits++; }
            }
          });
          if (!best || hits < best.hits) best = { c, hits };
        }
        pos = corners[best.c];
      }
      S.legend = kit.g(svg, { cls: 'lp-legend' });
      entries.forEach((t, i) => {
        const y = pos[1] + rowH * (i + 0.5);
        const g = kit.g(S.legend);
        const s = t.s;
        if (t.kind === 'line') { const st = LINE[s.style || 'ink'] || LINE.ink; kit.line(g, pos[0], y, pos[0] + wSample, y, { cls: st[0], 'stroke-width': s.width || st[1], 'stroke-dasharray': st[2] }); }
        else if (t.kind === 'points') { const st = POINT[s.style || 'dot'] || POINT.dot; kit.circle(g, pos[0] + wSample / 2, y, s.r || 5.5, { cls: st[0], 'stroke-width': st[1] || null }); }
        else kit.rect(g, pos[0] + 8, y - 7, wSample - 16, 14, { cls: (t.kind === 'band' ? 'fsoft' : 'fsoft ink'), 'stroke-width': 1.2 });
        label(g, pos[0] + wSample + 10, y, s.label, { size });
        t.legendRow = g;
      });
    }
    if (spec.title) label(svg, bx.x + bx.w / 2, bx.y - 14, spec.title, { size, anchor: 'middle', valign: 'bottom' });
    if (spec.draw) S.custom = spec.draw(svg, kit, S, P) || {};
    return S;
}
function chartRender(spec, S, f) {
    const P = f.P || S.P;
    S.parts.concat(S.marks, S.texts).forEach(p => {
      const [lo, hi] = stepRange(p.o.step);
      const v = shown(f, p.o) ? prog(f, lo, hi) : 0;
      if (p.g) opacity(p.g, v);
      if (p.lab) opacity(p.lab, v);
    });
    S.series.forEach(t => {
      t.build(P);
      const s = t.s;
      const [lo, hi] = stepRange(s.step);
      let v = shown(f, s) ? prog(f, lo, hi) : 0;
      if (s.when && !s.when(P)) v = 0;
      const reveal = s.reveal || (t.kind === 'line' ? 'draw' : t.kind === 'points' ? 'seq' : 'fade');
      const n = t.px.length;
      if (t.kind === 'line') {
        let pts = t.px;
        if (reveal === 'draw' && v < 1) {
          let idx;
          if (t.stopIdx && f.step >= lo && f.step <= hi) {
            const k = f.step - lo, ends = t.stopIdx.concat([n - 1]);
            const from = k === 0 ? 0 : ends[Math.min(k - 1, ends.length - 1)], to = ends[Math.min(k, ends.length - 1)];
            idx = from + (to - from) * kit.ease(f.frac);
          } else idx = v * (n - 1);
          const i = Math.floor(idx), u = idx - i;
          pts = t.px.slice(0, i + 1);
          if (u > 0 && i + 1 < n) pts.push([kit.lerp(t.px[i][0], t.px[i + 1][0], u), kit.lerp(t.px[i][1], t.px[i + 1][1], u)]);
          if (v <= 0) pts = [];
        }
        t.path.setAttribute('d', pts.length > 1 ? kit.poly(pts) : '');
        opacity(t.path, reveal === 'fade' ? v : 1);
      } else if (t.kind === 'band') opacity(t.path, 0.45 * v);
      else t.els.forEach((e, i) => opacity(e, reveal === 'seq' ? kit.clamp(v * n - i, 0, 1) : v));
      if (t.lab) opacity(t.lab, v >= 1 ? 1 : reveal === 'fade' ? v : kit.clamp(v * 4 - 3, 0, 1));
      if (t.legendRow) opacity(t.legendRow, kit.clamp(v * 3, 0, 1));
    });
    if (S.custom && spec.update) spec.update(S.custom, f, S);
}

/* LP.chart(spec): one plot box, or with panels: [spec, ...] several in a grid of the viewBox (cols; default one row,
   layout: 'col' stacks them). Each panel is a chart spec (series, x, y, hlines, marks, legend, title, box, ...) and
   inherits data, size, grid, arrows, x and y from the chart. sharex: only the bottom panel of each column labels
   its x axis; sharey: only the left column labels y. Steps count across all panels. */
const PANEL_INHERIT = ['data', 'size', 'grid', 'arrows', 'x', 'y'];
LP.chart = (spec) => {
  const vb = spec.viewBox || [0, 0, 760, 440], W = vb[2], H = vb[3];
  let panels = null;
  if (spec.panels) {
    const n = spec.panels.length;
    const cols = spec.cols || (spec.layout === 'col' ? 1 : n), rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows;
    panels = spec.panels.map((p, i) => {
      const q = Object.assign({}, p);
      PANEL_INHERIT.forEach(k => { if (q[k] === undefined && spec[k] !== undefined) q[k] = spec[k]; });
      const c = i % cols, r = Math.floor(i / cols);
      const hideX = !!spec.sharex && i + cols < n, hideY = !!spec.sharey && c > 0;
      if (hideX) q.x = Object.assign({}, q.x, { fmt: 'none', label: undefined });
      if (hideY) q.y = Object.assign({}, q.y, { fmt: 'none', label: undefined });
      const ml = hideY ? 30 : 90, mb = hideX ? 30 : 80, mt = 50, mr = 40;   // mt: room for a $TeX$ y label above the box
      q.box = Object.assign({ x: c * cw + ml, y: r * ch + mt, w: cw - ml - mr, h: ch - mt - mb }, p.box || {});
      return q;
    });
  }
  let maxStep = 1;
  const touch = s => { const r = stepRange(s); maxStep = Math.max(maxStep, r[1]); };
  (panels || [spec]).forEach(p => {
    (p.series || []).forEach(s => { touch(s.step); if (s.until) touch(s.until); });
    ['hlines', 'vlines', 'marks', 'text'].forEach(k => (p[k] || []).forEach(o => touch(o.step)));
  });
  const def = {
    viewBox: vb,
    steps: spec.steps || (maxStep > 1 ? Array.from({ length: maxStep }, (_, i) => 'step ' + (i + 1)) : undefined),
    snap: spec.snap, dur: spec.dur, params: spec.params, lint: spec.lint,
  };
  def.setup = (svg, kit, P) => {
    if (!panels) return chartSetup(spec, svg, kit, P, Object.assign({ x: 90, y: 40, w: W - 130, h: H - 120 }, spec.box || {}));
    const S = { P, panels: panels.map(p => chartSetup(p, svg, kit, P, p.box)) };
    if (spec.draw) S.custom = spec.draw(svg, kit, S, P) || {};
    return S;
  };
  def.render = (S, f) => {
    if (!panels) return chartRender(spec, S, f);
    S.panels.forEach((ps, i) => chartRender(panels[i], ps, f));
    if (S.custom && spec.update) spec.update(S.custom, f, S);
  };
  return def;
};

/* ---------------------------------------------------------------- LP.diagram
   nodes: {id, x, y (centre), w, h, text | tex, sub, shape: box|round|circle|plain, fill: fbox|fband|fpaper|fink, step, until, href}
   edges: {from, to, label, step, until, bend (fraction of length), dashed, both, style}
   text:  {x, y, text, size, anchor, step} */
LP.diagram = (spec) => {
  let maxStep = 1;
  const touch = s => { const r = stepRange(s); maxStep = Math.max(maxStep, r[1]); };
  ['nodes', 'edges', 'text'].forEach(k => (spec[k] || []).forEach(o => touch(o.step)));
  const def = {
    viewBox: spec.viewBox || [0, 0, 760, 400],
    steps: spec.steps || (maxStep > 1 ? Array.from({ length: maxStep }, (_, i) => 'step ' + (i + 1)) : undefined),
    snap: spec.snap, dur: spec.dur, params: spec.params, lint: spec.lint,
  };
  def.setup = (svg, kit, P) => {
    const size = spec.size || 16;
    const S = { nodes: {}, parts: [] };
    const ah = kit.arrow(svg, { size: 11 });
    const edgeG = kit.g(svg), nodeG = kit.g(svg);
    (spec.nodes || []).forEach(n => {
      const w = n.w || 150, h = n.h || 52;
      let g = nodeG;
      if (n.href) {
        const m = /^note:([\w-]+)(?:#(.*))?$/.exec(n.href);
        const href = m ? LP.noteHref(m[1], m[2]) : n.href;
        if (href) g = kit.link(nodeG, href, { cls: 'lp-node-link' });
      }
      const ng = kit.g(g);
      const shape = n.shape || 'box';
      if (shape === 'circle') kit.circle(ng, n.x, n.y, n.r || h / 2, { cls: (n.fill || 'fbox') + ' ink', 'stroke-width': 2.2 });
      else if (shape === 'round') kit.rect(ng, n.x - w / 2, n.y - h / 2, w, h, { rx: h / 2, cls: (n.fill || 'fbox') + ' ink', 'stroke-width': 2.2 });
      else if (shape === 'box') kit.box(ng, n.x - w / 2, n.y - h / 2, w, h, { fill: n.fill || 'fbox', shadow: n.shadow !== false && spec.shadow !== false });
      const tcls = n.fill === 'fink' ? 'paper' : n.cls;
      const t = n.tex != null ? '$' + n.tex + '$' : (n.text || '');
      const dy = n.sub ? -size * 0.45 : 0;
      if (t) label(ng, n.x, n.y + dy, t, { size: n.size || size, anchor: 'middle', cls: tcls, weight: n.weight });
      if (n.sub) label(ng, n.x, n.y + size * 0.75, n.sub, { size: (n.size || size) * 0.8, anchor: 'middle', cls: tcls ? tcls : 'mid', italic: true });
      S.nodes[n.id] = { n, w, h, shape, g: ng };
      S.parts.push({ o: n, g: ng });
    });
    /* point where the ray from the centre of node a towards p leaves its outline */
    const exitPt = (a, p, gap = 4) => {
      const n = a.n, dx = p[0] - n.x, dy = p[1] - n.y, L = Math.hypot(dx, dy) || 1;
      if (a.shape === 'circle') { const r = (n.r || a.h / 2) + gap; return [n.x + dx / L * r, n.y + dy / L * r]; }
      const hw = a.w / 2 + gap, hh = a.h / 2 + gap;
      const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
      return [n.x + dx * t, n.y + dy * t];
    };
    (spec.edges || []).forEach(e => {
      const a = S.nodes[e.from], b = S.nodes[e.to];
      if (!a || !b) { LP.err('diagram: unknown node in edge ' + e.from + ' -> ' + e.to); return; }
      const c0 = [a.n.x, a.n.y], c1 = [b.n.x, b.n.y];
      const mx = (c0[0] + c1[0]) / 2, my = (c0[1] + c1[1]) / 2, L = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) || 1;
      const nx = -(c1[1] - c0[1]) / L, ny = (c1[0] - c0[0]) / L;
      const bend = (e.bend || 0) * L;
      const ctl = [mx + nx * bend, my + ny * bend];
      const p0 = exitPt(a, bend ? ctl : c1), p1 = exitPt(b, bend ? ctl : c0, 6);
      const st = LINE[e.style || (e.dashed ? 'dashed' : 'ink')] || LINE.ink;
      const g = kit.g(edgeG);
      const d = bend ? `M${p0[0].toFixed(1)},${p0[1].toFixed(1)}Q${ctl[0].toFixed(1)},${ctl[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`
        : kit.poly([p0, p1]);
      kit.path(g, d, { cls: st[0], 'stroke-width': e.width || 2.2, 'stroke-dasharray': st[2], 'marker-end': e.arrow === false ? null : ah, 'marker-start': e.both ? ah : null });
      const part = { o: e, g };
      if (e.label) {
        const side = e.side === 'below' ? 1 : -1;   // above a left-to-right edge by default
        const lx = bend ? (p0[0] + 2 * ctl[0] + p1[0]) / 4 : mx, ly = bend ? (p0[1] + 2 * ctl[1] + p1[1]) / 4 : my;
        const off = e.offset ?? 14, sgn = bend ? Math.sign(bend) || 1 : side;
        const ox = nx * off * sgn, oy = ny * off * sgn;
        part.lab = label(g, lx + ox, ly + oy, e.label, { size: e.size || size * 0.9, anchor: Math.abs(ox) < 4 ? 'middle' : ox > 0 ? 'start' : 'end', valign: Math.abs(oy) < 4 ? 'middle' : oy > 0 ? 'top' : 'bottom', italic: !/^\$/.test(e.label) });
      }
      S.parts.push(part);
    });
    (spec.text || []).forEach(o => { const g = kit.g(svg); label(g, o.x, o.y, o.text, { size: o.size || size, anchor: o.anchor || 'middle', cls: o.cls, italic: o.italic, valign: o.valign }); S.parts.push({ o, g }); });
    if (spec.draw) S.custom = spec.draw(svg, kit, S, P) || {};
    return S;
  };
  def.render = (S, f) => {
    S.parts.forEach(p => { const [lo, hi] = stepRange(p.o.step); opacity(p.g, shown(f, p.o) ? prog(f, lo, hi) : 0); });
    if (S.custom && spec.update) spec.update(S.custom, f, S);
  };
  return def;
};
})(window.LP);
