/* livepaper runtime — player: one clock per scene.
   A scene is declared in Markdown (::: scene) or implied by a figure module's own steps.
   The scene most visible on screen is the active one; only it plays. Every other scene shows its
   rest frame (the figure at its snapshot step, all text highlights off), so the page is complete at rest. */
(function (LP) {
'use strict';
const STEP = /^s(\d+)(?:-(\d+))?$/;
const player = LP.player = {
  scenes: new Map(), active: null, speed: 1, static: false, listeners: [], io: null, raf: 0, clock: 0,
  autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches,
};

function mkScene(d) {
  return { id: d.id, steps: (d.steps || []).slice(), dur: d.dur || 2.2, rest: d.rest || (d.steps || []).length || 1,
    title: d.title || '', figs: [], els: [], anchors: [], t: 0, playing: false, hold: null, vis: 0, fixed: null };
}
const nSteps = sc => Math.max(1, sc.steps.length);

player.reset = () => {
  if (player.io) player.io.disconnect();
  player.io = null;
  player.scenes.clear();
  player.active = null;
};

player.build = (root, insts) => {
  (LP.data.scenes || []).forEach(d => player.scenes.set(d.id, mkScene(d)));
  attachFigures(insts);
  const seen = new Set();
  root.querySelectorAll('[data-scene]').forEach(host => {
    const sc = player.scenes.get(host.dataset.scene);
    if (!sc) return;
    const cand = [host, ...host.querySelectorAll('*')];
    cand.forEach(e => {
      if (seen.has(e) || !e.classList) return;
      for (const c of e.classList) {
        const m = STEP.exec(c);
        if (m) { seen.add(e); sc.els.push({ el: e, lo: +m[1], hi: +(m[2] || m[1]) }); break; }
      }
    });
    if (host.matches('figure, .algo, .lp-tbl, .eq, .lp-env') && !sc.anchors.includes(host)) sc.anchors.push(host);
  });
  finish();
};

function attachFigures(insts) {
  insts.forEach(inst => {
    let sc = inst.el.dataset.scene && player.scenes.get(inst.el.dataset.scene);
    const own = inst.def.steps || [];
    if (!sc) {
      const id = 'fig-' + (inst.el.id || inst.name);
      sc = mkScene({ id, steps: own, dur: inst.def.dur || 2.2, rest: inst.def.snap || own.length || 1,
        title: inst.el.querySelector('figcaption b') ? inst.el.querySelector('figcaption b').textContent.replace(/\.$/, '') : inst.name });
      player.scenes.set(id, sc);
      sc.anchors.push(inst.el);
    } else if (!sc.steps.length && own.length) {
      sc.steps = own.slice(); sc.rest = inst.def.snap || own.length; sc.dur = inst.def.dur || sc.dur;
    }
    const snap = inst.el.dataset.snap ? +inst.el.dataset.snap : null;
    if (snap) sc.rest = snap;
    if (!sc.title && inst.el.querySelector('figcaption b')) sc.title = inst.el.querySelector('figcaption b').textContent.replace(/\.$/, '');
    sc.figs.push(inst);
    inst.scene = sc;
  });
}

function finish() {
  player.scenes.forEach(sc => { if (!sc.anchors.length) sc.anchors = sc.els.map(e => e.el).slice(0, 4); if (!sc.title) sc.title = sc.id; });
  // visibility -> active scene
  const ratio = new Map();
  player.io = new IntersectionObserver(entries => {
    entries.forEach(en => ratio.set(en.target, en.isIntersecting ? en.intersectionRatio : 0));
    let best = null, bv = 0.15;
    player.scenes.forEach(sc => {
      if (nSteps(sc) < 2 && !sc.figs.some(f => f.def.animate)) return;
      sc.vis = Math.max(0, ...sc.anchors.map(a => ratio.get(a) || 0));
      if (sc.vis > bv + (sc === player.active ? -0.1 : 0)) { best = sc; bv = sc.vis; }
    });
    if (best !== player.active) player.activate(best);
  }, { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1] });
  player.scenes.forEach(sc => sc.anchors.forEach(a => player.io.observe(a)));
};

function frame(sc, rest) {
  const n = nSteps(sc);
  let k, frac, t = sc.t;
  if (sc.fixed != null) { k = sc.fixed; frac = 1; rest = false; t = (k + 1) * sc.dur; }
  else if (rest) { k = Math.min(n, Math.max(1, sc.rest)) - 1; frac = 1; t = (k + 1) * sc.dur; }
  else { const u = sc.t / sc.dur; k = ((Math.floor(u) % n) + n) % n; frac = u - Math.floor(u); }
  sc.k = k;
  const f = { t, k, step: k + 1, frac, n, playing: sc.playing, rest: !!rest, scene: sc.id, dur: sc.dur };
  sc.figs.forEach(inst => LP.frameInstance(inst, f));
  sc.els.forEach(o => o.el.classList.toggle('on', !rest && k + 1 >= o.lo && k + 1 <= o.hi));
  return f;
}
player.frame = frame;
player.renderAllRest = () => player.scenes.forEach(sc => frame(sc, true));

player.activate = (sc) => {
  const prev = player.active;
  if (prev && prev !== sc) { prev.playing = false; prev.hold = null; frame(prev, true); }
  player.active = sc || null;
  if (sc && sc !== prev) {
    sc.t = 0; sc.hold = null;
    sc.playing = player.autoplay && !player.static;
    frame(sc, !sc.playing);
  }
  emit();
};

player.toggle = () => {
  const sc = player.active;
  if (!sc) return;
  sc.playing = !sc.playing;
  sc.hold = null;
  player.autoplay = sc.playing;
  emit();
};
player.goto = (k) => {
  const sc = player.active;
  if (!sc) return;
  const n = nSteps(sc);
  k = ((k % n) + n) % n;
  sc.playing = false;
  sc.t = k * sc.dur;
  sc.hold = (k + 1) * sc.dur - 1e-3;
  if (player.static) { sc.t = sc.hold; sc.hold = null; }
  frame(sc, false);
  emit();
};
player.step = (d) => { const sc = player.active; if (sc) player.goto((sc.k == null ? -1 : sc.k) + d); };
player.info = () => {
  const sc = player.active;
  if (!sc) return null;
  return { id: sc.id, title: sc.title, k: sc.k || 0, n: nSteps(sc), label: sc.steps[sc.k || 0] || '', playing: sc.playing };
};
player.on = (fn) => player.listeners.push(fn);
function emit() { const i = player.info(); player.listeners.forEach(fn => fn(i)); }

let last = null;
function tick(ts) {
  const dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
  last = ts;
  player.clock += dt;
  const sc = player.active;
  if (sc && (sc.playing || sc.hold != null)) {
    sc.t += dt * player.speed;
    if (sc.hold != null && sc.t >= sc.hold) { sc.t = sc.hold; sc.hold = null; }
    const k0 = sc.k;
    frame(sc, false);
    if (sc.k !== k0) emit();
  }
  if (!player.static) {
    const sh = ((player.clock % 3.2) / 3.2).toFixed(3);
    document.querySelectorAll('.lp-stage .inv').forEach(e => e.style.setProperty('--shine', sh));
  }
  player.raf = requestAnimationFrame(tick);
}
player.start = () => { if (!player.raf) player.raf = requestAnimationFrame(tick); };
})(window.LP);
