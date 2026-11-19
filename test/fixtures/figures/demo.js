// A minimal live figure: a dot travels along a path in three steps.
export default {
  viewBox: [0, 0, 380, 170],
  steps: ['draw', 'move', 'done'],
  snap: 3,
  params: [{ id: 'q', label: 'penalty q', min: 1, max: 100, value: 10, scale: 'log' }],
  setup(svg, kit) {
    const ah = kit.arrow(svg);
    kit.path(svg, 'M30,130 C120,20 260,20 350,130', { cls: 'ink', 'stroke-width': 2.4, 'marker-end': ah });
    const dot = kit.circle(svg, 30, 130, 7, { cls: 'fpaper ink', 'stroke-width': 2.4 });
    const lab = kit.tex(svg, 190, 150, 'd(I,U)=\\int F\\,dt', { size: 15 });
    const q = kit.text(svg, 350, 30, '', { anchor: 'end', size: 13, cls: 'mid' });
    const path = svg.querySelector('path:not([d^="M0"])');
    return { dot, lab, q, path };
  },
  render(s, f, inst) {
    const L = s.path.getTotalLength();
    const u = (f.k + f.frac) / f.n;
    const p = s.path.getPointAtLength(L * u);
    s.dot.setAttribute('cx', p.x); s.dot.setAttribute('cy', p.y);
    s.q.textContent = 'q = ' + f.P.q.toFixed(1);
  },
};
