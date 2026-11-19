// A wide figure (viewBox about 1576 wide = 2x the 788 px sheet width). It has no steps of its own:
// it is attached to the abstract's scene with scene=abstract in paper.md, so f.step follows that scene.
export default {
  viewBox: [0, 0, 1576, 300],
  setup(svg, kit) {
    const S = {};
    const ah = kit.arrow(svg, { size: 12 });
    const names = ['phrases', 'steps', 'clock'];
    S.boxes = names.map((n, i) => {
      const x = 180 + i * 470;
      const g = kit.box(svg, x, 100, 280, 90, { r: 8 });
      kit.text(g, x + 140, 155, n, { anchor: 'middle', size: 30, weight: 700 });
      if (i < 2) kit.line(svg, x + 290, 145, x + 460, 145, { cls: 'ink', 'stroke-width': 2.6, 'marker-end': ah });
      return g;
    });
    kit.path(svg, 'M1210,190 C1210,280 320,280 320,195', { cls: 'ink', 'stroke-width': 2.2, 'stroke-dasharray': '8 6', 'marker-end': ah });
    S.tok = kit.circle(svg, 0, 0, 12, { cls: 'fpaper ink', 'stroke-width': 3.5 });
    kit.tex(svg, 788, 40, '\\text{step } k \\text{ of } n:\\ \\text{everything is a function of } t', { size: 26 });
    return S;
  },
  render(S, f) {
    const kit = window.LP.kit;
    S.boxes.forEach((g, i) => g.bx.setAttribute('class', 'bx ink ' + (!f.rest && i === f.k ? 'fband' : 'fbox')));
    const x = 320 + 470 * f.k + (f.k < 2 ? 470 * kit.ease(f.frac) : 0);
    S.tok.setAttribute('cx', x); S.tok.setAttribute('cy', 70);
  },
};
