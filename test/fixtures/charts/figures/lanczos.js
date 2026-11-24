// The Krylov note's Lanczos-coefficient figure as a chart spec; the fit line is computed here from the same data.
const D = LP.ds.kry.lanczos;
const pts = D.chaotic.map((b, i) => [i + 1, b]).filter(p => p[0] >= 4 && p[0] <= 24);
const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
const sl = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
const ic = my - sl * mx;
export default LP.chart({
  steps: ['chaotic chain', 'linear fit', 'free fermions'], snap: 3,
  data: 'kry.lanczos',
  x: { range: [0, 27], ticks: [0, 5, 10, 15, 20, 25], label: 'Krylov index n' },
  y: { range: [0, 15], ticks: [0, 5, 10, 15], label: 'Lanczos coefficient b_n' },
  series: [
    { fn: n => ic + sl * n, domain: [0, 27], n: 2, style: 'dashed', step: 2, reveal: 'fade' },
    { points: true, y: 'chaotic', style: 'dot', label: 'chaotic, h = 0.5', step: 1 },
    { points: true, y: 'integrable', style: 'open', label: 'free fermions, h = 0', step: 3 },
  ],
  text: [{ x: 1, y: ic + sl * 20, text: `$b_n\\approx${sl.toFixed(2)}\\,n+${ic.toFixed(2)}$`, anchor: 'start', step: 2 }],
  legend: 'br',
});
