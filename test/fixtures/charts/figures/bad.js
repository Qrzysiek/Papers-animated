// Deliberately broken labels, for the lint test: one sticks out, two overlap, one sits on the curve.
export default {
  viewBox: [0, 0, 760, 300],
  setup(svg, kit) {
    kit.path(svg, 'M40,250 L720,40', { cls: 'ink', 'stroke-width': 3 });
    kit.text(svg, 700, 280, 'this label runs past the right edge', { size: 18 });
    kit.text(svg, 60, 60, 'first label', { size: 18 });
    kit.text(svg, 80, 64, 'second label', { size: 18 });
    kit.text(svg, 360, 152, 'on the line', { size: 18, anchor: 'middle' });
    return {};
  },
  render() {},
};
