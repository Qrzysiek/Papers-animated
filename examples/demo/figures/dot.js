// A column figure (viewBox about 760 wide = 2x the 380 px column). It sits inside ::: scene #sc:demo,
// so its steps come from that scene; params become sliders under the figure.
export default {
  viewBox: [0, 0, 760, 360],
  params: [{ id: 'k', label: 'curvature', min: 0.2, max: 3, value: 1.2, step: 0.01, fmt: v => v.toFixed(2) }],
  setup(svg, kit) {
    const S = {};
    S.ax = kit.axes(svg, { x: 80, y: 30, w: 600, h: 270, xr: [0, 1], yr: [0, 1.1], xticks: [0, 0.5, 1], yticks: [0, 0.5, 1], grid: true, xlabel: '$t$', ylabel: '$y$' });
    S.curve = kit.path(svg, '', { cls: 'ink', 'stroke-width': 4 });
    S.dot = kit.circle(svg, 0, 0, 10, { cls: 'fink' });
    S.lab = kit.tex(svg, 560, 80, '', { size: 24 });
    return S;
  },
  render(S, f) {
    const kit = window.LP.kit;
    const y = t => (1 - Math.exp(-f.P.k * 4 * t)) / (1 - Math.exp(-f.P.k * 4));
    const drawn = f.step === 1 && !f.rest ? kit.ease(f.frac) : 1;
    const pts = kit.linspace(0, drawn, 100).map(t => [t, y(t)]);
    S.curve.setAttribute('d', kit.poly(pts.map(p => [S.ax.X(p[0]), S.ax.Y(p[1])])));
    const u = f.rest || f.step === 3 ? 1 : f.step === 2 ? kit.ease(f.frac) : 0;
    S.dot.setAttribute('cx', S.ax.X(u)); S.dot.setAttribute('cy', S.ax.Y(y(u)));
    S.lab.set(`y(${u.toFixed(2)})=${y(u).toFixed(2)}`);
  },
};
