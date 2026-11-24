// A diagram spec: boxes, arrows with labels, one node linking to another note of a series.
export default LP.diagram({
  viewBox: [0, 0, 760, 300],
  nodes: [
    { id: 'h', x: 100, y: 150, w: 150, h: 60, text: 'Hamiltonian', step: 1 },
    { id: 'k', x: 380, y: 150, w: 150, h: 60, tex: '\\{b_n\\}', sub: 'Lanczos', step: 2, fill: 'fband' },
    { id: 'c', x: 660, y: 150, w: 150, h: 60, text: 'complexity', step: 3, href: 'note:other#sec-x' },
  ],
  edges: [
    { from: 'h', to: 'k', label: 'Krylov basis', step: 2 },
    { from: 'k', to: 'c', label: '$K(t)$', step: 3 },
    { from: 'h', to: 'c', bend: 0.25, dashed: true, label: 'Nielsen', step: 3 },
  ],
});
