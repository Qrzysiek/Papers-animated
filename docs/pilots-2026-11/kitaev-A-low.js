export default LP.chart({
  steps: ['complexity per site', 'lattice check', 'derivative'], snap: 3,
  data: 'kbulk.kitaev',
  x: { range: [-2.5, 2.5], ticks: [-2, -1, 0, 1, 2], label: 'chemical potential $\\mu$' },
  y: { range: [0, 1.4], label: "$c(\\mu)$ and $c'(\\mu)$" },
  vlines: [{ x: -1, label: '$\\mu_c=-1$' }, { x: 1, label: '$\\mu_c=1$' }],
  hlines: [{ y: 1.233701, label: '$\\pi^2/8$', lx: -2.4 }],
  series: [
    { x: 'mu', y: 'c', style: 'thick', label: '$c(\\mu)$', step: 1 },
    { x: 'lat_mu', y: 'lat_c', points: true, style: 'open', label: 'lattice, L = 100', step: 2 },
    { x: 'mu', y: 'dc', style: 'dashed', label: "$c'(\\mu)$", step: 3 },
  ],
  legend: 'tl',
});
