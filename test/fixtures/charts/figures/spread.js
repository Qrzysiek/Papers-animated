// The Krylov note's spread-complexity figure as a chart spec (data from scripts, inlined as LP.ds.kry).
export default LP.chart({
  steps: ['ramp', 'peak', 'slope and plateau', 'uncorrelated levels'], snap: 4, dur: 2.2,
  data: 'kry.spread',
  x: { range: [0.3, 3000], log: true, ticks: [1, 10, 100, 1000], label: 'time t' },
  y: { range: [0, 0.7], ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], label: 'K(t) / N' },
  hlines: [{ y: 0.5, label: '$\\tfrac12$', lx: 0.4 }],
  series: [
    { x: 't', y: 'GUE', style: 'thick', label: 'GUE (chaotic)', step: [1, 3], stops: [30, 'max'] },
    { x: 't', y: 'Poisson', style: 'dashed', label: 'uncorrelated levels', step: 4 },
  ],
  marks: [{ at: 'max:GUE', label: '$\\text{peak } {y:.2f}\\,N$', step: 2, dx: -10, anchor: 'end' }],
  legend: 'tl',
});
