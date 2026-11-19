/* livepaper runtime — kit: drawing helpers handed to figure modules as the second setup() argument.
   Colours come from CSS classes (ink, fink, fpaper, fbox, fband, smid, ...) so figures follow the theme. */
(function (LP) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const XH = 'http://www.w3.org/1999/xhtml';
let uid = 0;
const kit = LP.kit = {};

kit.el = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  if (attrs) kit.set(e, attrs);
  if (parent) parent.appendChild(e);
  return e;
};
kit.set = (e, attrs) => {
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) { if (k !== 'text') e.removeAttribute(k === 'cls' ? 'class' : k); continue; }
    if (k === 'text') e.textContent = v;
    else if (k === 'cls') e.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, typeof v === 'number' ? +v.toFixed(3) : v);
  }
  return e;
};
kit.g = (parent, attrs) => kit.el('g', attrs, parent);
/* an SVG hyperlink; external targets open in a new tab (as claude.ai requires) */
kit.link = (parent, href, attrs) => {
  const a = kit.el('a', attrs, parent);
  a.setAttribute('href', href);
  if (!href.startsWith('#')) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
  return a;
};
kit.path = (parent, d, attrs) => kit.el('path', Object.assign({ d, fill: 'none' }, attrs), parent);
kit.line = (parent, x1, y1, x2, y2, attrs) => kit.el('line', Object.assign({ x1, y1, x2, y2 }, attrs), parent);
kit.circle = (parent, cx, cy, r, attrs) => kit.el('circle', Object.assign({ cx, cy, r }, attrs), parent);
kit.rect = (parent, x, y, width, height, attrs) => kit.el('rect', Object.assign({ x, y, width, height }, attrs), parent);
kit.poly = (pts, close) => {
  let d = '';
  let pen = false;
  for (const p of pts) {
    if (!p || !isFinite(p[0]) || !isFinite(p[1])) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2);
    pen = true;
  }
  return close ? d + 'Z' : d;
};

/* text: attrs may carry anchor ('start'|'middle'|'end'), size (px), cls, weight, italic */
kit.text = (parent, x, y, str, o = {}) => {
  const a = { x, y, text: str, cls: o.cls };
  if (o.anchor) a['text-anchor'] = o.anchor;
  if (o.size) a['font-size'] = o.size;
  if (o.weight) a['font-weight'] = o.weight;
  if (o.italic) a['font-style'] = 'italic';
  if (o.family) a['font-family'] = o.family;
  if (o.baseline) a['dominant-baseline'] = o.baseline;
  if (o.transform) a.transform = o.transform;
  return kit.el('text', a, parent);
};

/* TeX label rendered with KaTeX into a foreignObject.
   anchor: 'start'|'middle'|'end' horizontally; valign: 'top'|'middle'|'baseline'|'bottom'. */
kit.tex = (parent, x, y, tex, o = {}) => {
  const size = o.size || 14;
  const fo = kit.el('foreignObject', { x, y, width: 10, height: 10, cls: 'lp-tex' + (o.cls ? ' ' + o.cls : '') }, parent);
  const div = document.createElementNS(XH, 'div');
  div.style.fontSize = size + 'px';
  fo.appendChild(div);
  const item = { fo, div, x, y, o, tex: null };
  item.set = (t, nx, ny) => {
    if (nx !== undefined) { item.x = nx; item.y = ny; }
    if (t !== item.tex) {
      item.tex = t;
      try { window.katex.render(String(t), div, { throwOnError: false, macros: Object.assign({}, LP.data.macros), trust: true, strict: 'ignore' }); }
      catch (e) { div.textContent = t; }
    }
    item.layout();
    return item;
  };
  item.layout = () => {
    const w = div.offsetWidth || (String(item.tex).length * size * 0.5);
    const h = div.offsetHeight || size * 1.3;
    const ax = (o.anchor || 'middle') === 'middle' ? 0.5 : o.anchor === 'end' ? 1 : 0;
    const va = o.valign || 'middle';
    const ay = va === 'middle' ? 0.5 : va === 'bottom' ? 1 : va === 'baseline' ? 0.78 : 0;
    kit.set(fo, { x: item.x - w * ax, y: item.y - h * ay, width: w + 2, height: h + 2 });
  };
  fo.__tex = item;
  item.set(tex);
  (kit._texItems || (kit._texItems = new Set())).add(item);
  return item;
};
/* re-measure every TeX label (after fonts load or after the figure becomes visible) */
kit.relayoutTex = (root) => {
  (root || document).querySelectorAll('foreignObject.lp-tex').forEach(fo => fo.__tex && fo.__tex.layout());
};

/* arrowhead marker; returns 'url(#id)' */
kit.arrow = (svg, o = {}) => {
  const id = 'lpah' + (++uid);
  let defs = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS(NS, 'defs'); svg.insertBefore(defs, svg.firstChild); }
  const s = o.size || 10;
  const m = kit.el('marker', { id, viewBox: '0 0 10 10', refX: o.refX ?? 8.5, refY: 5, markerWidth: s, markerHeight: s,
    orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs);
  kit.el('path', { d: o.open ? 'M1,1L9,5L1,9' : 'M0,0.8L10,5L0,9.2z', cls: o.open ? 'ink nofill' : (o.cls || 'fink'),
    'stroke-width': o.open ? 1.6 : 0 }, m);
  return 'url(#' + id + ')';
};

/* harness-style box with a hard shadow; returns the group (append text to it) */
kit.box = (parent, x, y, w, h, o = {}) => {
  const g = kit.g(parent, { cls: o.cls });
  const r = o.r ?? 6;
  if (o.shadow !== false) kit.rect(g, x + 4, y + 4, w, h, { rx: r, cls: 'sh fink' });
  g.bx = kit.rect(g, x, y, w, h, { rx: r, cls: 'bx ' + (o.fill || 'fbox') + ' ink', 'stroke-width': o.sw ?? 2.4 });
  return g;
};
/* small document icon (folded corner) */
kit.doc = (parent, x, y, w, h, lines = 3) => {
  const g = kit.g(parent);
  const c = Math.round(w * 0.3);
  kit.path(g, `M${x},${y}h${w - c}l${c},${c}v${h - c}h${-w}z`, { cls: 'fpaper ink', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  kit.path(g, `M${x + w - c},${y}v${c}h${c}`, { cls: 'ink', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  for (let j = 0; j < lines; j++) {
    const yy = y + h * (0.42 + 0.13 * j);
    kit.line(g, x + w * 0.2, yy, x + w * 0.76, yy, { cls: 'ssoft', 'stroke-width': 1.5 });
  }
  return g;
};

/* axes: returns {X, Y, g}; data ranges xr=[a,b], yr=[c,d] map onto the box (x, y, w, h) with y up */
kit.axes = (parent, o) => {
  const g = kit.g(parent, { cls: 'axes' });
  const { x, y, w, h } = o;
  const xr = o.xr || [0, 1], yr = o.yr || [0, 1];
  const X = v => x + (v - xr[0]) / (xr[1] - xr[0]) * w;
  const Y = v => y + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  const fs = o.size || 13;
  if (o.grid) {
    (o.yticks || []).forEach(t => kit.line(g, x, Y(t), x + w, Y(t), { cls: 'sfaint', 'stroke-width': 1.1 }));
    (o.xticks || []).forEach(t => kit.line(g, X(t), y, X(t), y + h, { cls: 'sfaint', 'stroke-width': 1.1 }));
  }
  const ah = o.arrows === false ? null : kit.arrow(parent.ownerSVGElement || parent, { size: 9 });
  kit.line(g, x, y + h, x + w + (ah ? 12 : 0), y + h, { cls: 'ink', 'stroke-width': 1.8, 'marker-end': ah });
  kit.line(g, x, y + h, x, y - (ah ? 12 : 0), { cls: 'ink', 'stroke-width': 1.8, 'marker-end': ah });
  const xf = o.xfmt || (v => String(v)), yf = o.yfmt || (v => String(v));
  (o.xticks || []).forEach(t => {
    kit.line(g, X(t), y + h, X(t), y + h + 5, { cls: 'ink', 'stroke-width': 1.6 });
    const s = xf(t);
    if (s && s[0] === '$') kit.tex(g, X(t), y + h + 8, s.slice(1, -1), { size: fs, valign: 'top' });
    else if (s) kit.text(g, X(t), y + h + 8 + fs * 0.8, s, { anchor: 'middle', size: fs });
  });
  (o.yticks || []).forEach(t => {
    kit.line(g, x - 5, Y(t), x, Y(t), { cls: 'ink', 'stroke-width': 1.6 });
    const s = yf(t);
    if (s && s[0] === '$') kit.tex(g, x - 8, Y(t), s.slice(1, -1), { size: fs, anchor: 'end' });
    else if (s) kit.text(g, x - 8, Y(t) + fs * 0.35, s, { anchor: 'end', size: fs });
  });
  if (o.xlabel) {
    if (o.xlabel[0] === '$') kit.tex(g, x + w + 16, y + h, o.xlabel.slice(1, -1), { size: fs + 1, anchor: 'start' });
    else kit.text(g, x + w / 2, y + h + 8 + fs * 2.1, o.xlabel, { anchor: 'middle', size: fs, italic: true });
  }
  if (o.ylabel) {
    if (o.ylabel[0] === '$') kit.tex(g, x, y - 20, o.ylabel.slice(1, -1), { size: fs + 1, anchor: 'middle', valign: 'bottom' });
    else kit.text(g, 0, 0, o.ylabel, { anchor: 'middle', size: fs, italic: true, transform: `translate(${x - 8 - fs * 2.4} ${y + h / 2}) rotate(-90)` });
  }
  return { X, Y, g, xr, yr, box: { x, y, w, h } };
};
kit.plot = (parent, ax, pts, attrs) => kit.path(parent, kit.poly(pts.map(p => [ax.X(p[0]), ax.Y(p[1])])),
  Object.assign({ cls: 'ink', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, attrs));

/* orthographic sphere camera: z up; yaw about z, pitch tilts the camera above the equator */
kit.sphere = (cx, cy, R, yaw = -0.6, pitch = 0.35) => {
  const S = { cx, cy, R, yaw, pitch };
  S.project = (p) => {
    const ca = Math.cos(S.yaw), sa = Math.sin(S.yaw), cb = Math.cos(S.pitch), sb = Math.sin(S.pitch);
    const x1 = p[0] * ca - p[1] * sa, y1 = p[0] * sa + p[1] * ca, z1 = p[2];
    return [S.cx + S.R * x1, S.cy - S.R * (y1 * sb + z1 * cb), -y1 * cb + z1 * sb];
  };
  /* polyline of 3D points -> {front, back} path strings */
  S.split = (pts3) => {
    let front = '', back = '', lastF = null;
    pts3.forEach((p, i) => {
      const q = S.project(p);
      const f = q[2] >= 0;
      const cmd = (i === 0 || f !== lastF) ? 'M' : 'L';
      if (f) { front += cmd + q[0].toFixed(2) + ',' + q[1].toFixed(2); if (lastF === false && i) back += 'L' + q[0].toFixed(2) + ',' + q[1].toFixed(2); }
      else { back += cmd + q[0].toFixed(2) + ',' + q[1].toFixed(2); if (lastF === true && i) front += 'L' + q[0].toFixed(2) + ',' + q[1].toFixed(2); }
      lastF = f;
    });
    return { front, back };
  };
  /* circle with unit normal n at signed offset c (|c|<1): points p with p·n = c */
  S.circle = (n, c = 0, N = 120) => {
    const nn = Math.hypot(n[0], n[1], n[2]); const u = [n[0] / nn, n[1] / nn, n[2] / nn];
    const a = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let e1 = [u[1] * a[2] - u[2] * a[1], u[2] * a[0] - u[0] * a[2], u[0] * a[1] - u[1] * a[0]];
    const l1 = Math.hypot(...e1); e1 = e1.map(v => v / l1);
    const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
    const r = Math.sqrt(Math.max(0, 1 - c * c));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = 2 * Math.PI * i / N;
      pts.push([0, 1, 2].map(j => c * u[j] + r * (Math.cos(t) * e1[j] + Math.sin(t) * e2[j])));
    }
    return S.split(pts);
  };
  return S;
};

/* numbers and motion */
kit.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
kit.lerp = (a, b, t) => a + (b - a) * t;
kit.ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
kit.easeOut = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
kit.seg = (frac, a, b) => kit.clamp((frac - a) / (b - a));   /* local progress of frac inside [a,b] */
kit.fmt = (v, d = 2) => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(d);
kit.rng = (seed = 1) => () => (seed = seed * 16807 % 2147483647) / 2147483647;
kit.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
})(window.LP);
