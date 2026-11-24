// Two panels side by side with a shared y axis: the spread complexity of GUE and of uncorrelated levels.
export default LP.chart({
  steps: ['GUE', 'uncorrelated levels'], snap: 2,
  data: 'kry.spread',
  x: { range: [0.3, 3000], log: true, ticks: [1, 10, 100, 1000], label: 'time t' },
  y: { range: [0, 0.7], ticks: [0, 0.2, 0.4, 0.6], label: 'K(t) / N' },
  sharey: true,
  panels: [
    { title: 'GUE (chaotic)', hlines: [{ y: 0.5, label: '$\\tfrac12$', lx: 0.4 }],
      series: [{ x: 't', y: 'GUE', style: 'thick', step: 1 }],
      marks: [{ at: 'max:GUE', label: '$\\text{peak}$', step: 1, dx: -10, anchor: 'end' }] },
    { title: 'uncorrelated levels', hlines: [{ y: 0.5 }],
      series: [{ x: 't', y: 'Poisson', style: 'dashed', step: 2 }] },
  ],
});
