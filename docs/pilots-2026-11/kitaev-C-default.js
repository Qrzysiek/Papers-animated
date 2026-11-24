// figures/kitaev.js: Gaussian-state complexity per site of the Kitaev chain and its derivative vs mu
export default LP.chart({
  steps: ['complexity per site', 'lattice, L = 100', 'derivative'], snap: 3,
  data: 'kbulk.kitaev',
  x: { range: [-2.5, 2.5], ticks: [-2, -1, 0, 1, 2], label: 'chemical potential μ' },
  y: { range: [0, 1.1], ticks: [0, 0.25, 0.5, 0.75, 1], label: '$c,\\ \\mathrm{d}c/\\mathrm{d}\\mu$' },
  vlines: [
    { x: -1, label: '$\\mu_c=-1$' },
    { x: 1, label: '$\\mu_c=1$' },
  ],
  series: [
    { x: 'mu', y: 'c', style: 'thick', label: '$c(\\mu)$', step: 1 },
    { x: 'lat_mu', y: 'lat_c', points: true, style: 'open', label: 'lattice, $L=100$', step: 2 },
    { x: 'mu', y: 'dc', style: 'dashed', label: "$c'(\\mu)$", step: 3 },
  ],
  legend: 'tl',
});
