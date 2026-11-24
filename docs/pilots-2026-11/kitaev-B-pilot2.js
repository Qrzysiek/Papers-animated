// Kitaev chain: Gaussian-state complexity per site c(mu) (vacuum reference), lattice values at L = 100,
// and the derivative c'(mu) with its logarithmic peaks at mu_c = +-1. Data: LP.ds.kbulk.kitaev.
export default LP.chart({
  steps: ['complexity per site', 'finite chain', 'derivative'],
  snap: 3,
  box: { x: 80, y: 44, w: 630, h: 336 },
  data: 'kbulk.kitaev',
  x: { range: [-2.5, 2.5], ticks: [-2, -1, 0, 1, 2], label: '$\\mu$' },
  y: { range: [0, 1.2], ticks: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2], label: "$c(\\mu),\\ c'(\\mu)$" },
  vlines: [
    { x: -1, label: '$\\mu_c=-1$' },
    { x: 1, label: '$\\mu_c=1$' },
  ],
  series: [
    { x: 'mu', y: 'c', style: 'thick', label: '$c(\\mu)$', step: 1 },
    { x: 'lat_mu', y: 'lat_c', points: true, style: 'open', label: 'chain, L = 100', step: 2 },
    { x: 'mu', y: 'dc', style: 'dashed', label: "$c'(\\mu)$", step: 3 },
  ],
  marks: [{ x: 0, y: 0.411234, label: '$\\pi^2/24$', dx: -8, dy: -10, anchor: 'end', step: 1 }],
  legend: 'tl',
});
