/* livepaper runtime — core: namespace, settings, figure registry and mounting. */
(function () {
'use strict';
const LP = window.LP = window.LP || {};
LP.version = '0.1.0';
LP.figures = Object.create(null);
LP.errors = [];
LP.qs = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(); } })();
LP.figure = (name, def) => { LP.figures[name] = def; return def; };
LP.err = (msg, e) => { LP.errors.push(String(msg) + (e ? ': ' + (e && e.message || e) : '')); console.error('[livepaper]', msg, e || ''); };

LP.store = {
  get(k, d) { try { const v = localStorage.getItem('livepaper:' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('livepaper:' + k, v); } catch (e) { /* storage unavailable */ } },
};

LP.data = { scenes: [], macros: {}, labels: {} };

/* series of notes (see build.mjs): href to another note of the series for this build, or null */
LP.series = window.LP_SERIES || null;
LP.noteHref = (id, anchor) => {
  const n = LP.series && LP.series.notes && LP.series.notes[id];
  if (!n || n.href == null) return null;
  if (n.href === '') return anchor ? '#' + anchor : '#';
  return n.href + (anchor ? '#' + anchor : '');
};
LP.isSelf = id => !!(LP.series && LP.series.self === id);
LP.readData = (root) => {
  const s = root.querySelector('#lp-data');
  if (s) { try { LP.data = Object.assign(LP.data, JSON.parse(s.textContent)); } catch (e) { LP.err('bad lp-data', e); } s.remove(); }
  // an empty Lua table is encoded as {} rather than []
  if (!Array.isArray(LP.data.scenes)) LP.data.scenes = [];
  if (!LP.data.macros || Array.isArray(LP.data.macros)) LP.data.macros = {};
  if (!LP.data.labels || Array.isArray(LP.data.labels)) LP.data.labels = {};
  return LP.data;
};

/* ---------------------------------------------------------------- figure instances */
const fmtDefault = v => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

function buildControls(inst) {
  const def = inst.def;
  if (!def.params || !def.params.length) return;
  const row = document.createElement('div');
  row.className = 'lp-ctrl';
  const uid = inst.el.id || inst.name;
  def.params.forEach((p, i) => {
    const id = 'lpc-' + uid + '-' + p.id;
    const type = p.type || (p.options ? 'select' : (typeof p.value === 'boolean' ? 'toggle' : (p.action ? 'button' : 'range')));
    const lab = document.createElement('label');
    if (type === 'range') {
      const log = p.scale === 'log';
      const toPos = v => log ? Math.log(v / p.min) / Math.log(p.max / p.min) * 1000 : v;
      const fromPos = x => log ? p.min * Math.pow(p.max / p.min, x / 1000) : x;
      const inp = document.createElement('input');
      inp.type = 'range'; inp.id = id;
      if (log) { inp.min = 0; inp.max = 1000; inp.step = 1; }
      else { inp.min = p.min; inp.max = p.max; inp.step = p.step || (p.max - p.min) / 200; }
      inp.value = toPos(inst.P[p.id]);
      const out = document.createElement('output');
      const fmt = p.fmt || fmtDefault;
      out.textContent = fmt(inst.P[p.id]);
      inp.addEventListener('input', () => {
        let v = fromPos(+inp.value);
        if (p.step && log) v = Math.round(v / p.step) * p.step;
        inst.P[p.id] = v; out.textContent = fmt(v); LP.renderInstance(inst, true);
      });
      lab.append(p.label || p.id, inp, out);
      inst.inputs[p.id] = { set(v) { inst.P[p.id] = v; inp.value = toPos(v); out.textContent = fmt(v); } };
    } else if (type === 'select') {
      const sel = document.createElement('select'); sel.id = id;
      p.options.forEach(o => { const op = document.createElement('option'); op.value = o.value ?? o; op.textContent = o.label ?? o; sel.append(op); });
      sel.value = inst.P[p.id];
      sel.addEventListener('change', () => { const o = p.options.find(o => String(o.value ?? o) === sel.value); inst.P[p.id] = o && o.value !== undefined ? o.value : sel.value; LP.renderInstance(inst, true); });
      lab.append(p.label || p.id, sel);
      inst.inputs[p.id] = { set(v) { inst.P[p.id] = v; sel.value = v; } };
    } else if (type === 'toggle') {
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = !!inst.P[p.id];
      cb.addEventListener('change', () => { inst.P[p.id] = cb.checked; LP.renderInstance(inst, true); });
      lab.append(cb, p.label || p.id);
      inst.inputs[p.id] = { set(v) { inst.P[p.id] = v; cb.checked = !!v; } };
    } else if (type === 'button') {
      const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = p.label || p.id;
      b.addEventListener('click', () => { try { p.action(inst.state, inst.P, inst); } catch (e) { LP.err('param action', e); } LP.renderInstance(inst, true); });
      lab.append(b);
    }
    row.append(lab);
  });
  inst.el.querySelector('.lp-art').after(row);
}

LP.mountFigure = (figEl, opts = {}) => {
  const name = figEl.dataset.live;
  const art = figEl.querySelector('.lp-art');
  const def = LP.figures[name];
  if (!def) {
    art.innerHTML = '<div class="lp-missing">figure module “' + name + '” did not load</div>';
    LP.err('missing figure module ' + name);
    return null;
  }
  art.textContent = '';
  const vb = Array.isArray(def.viewBox) ? def.viewBox.join(' ') : (def.viewBox || '0 0 760 300');
  const cap = figEl.querySelector('figcaption');
  const svg = LP.kit.el('svg', { viewBox: vb, role: 'img', 'aria-label': cap ? cap.textContent.trim().slice(0, 300) : name,
    preserveAspectRatio: 'xMidYMid meet' }, art);
  const P = {};
  (def.params || []).forEach(p => { P[p.id] = p.value; });
  const inst = { name, def, el: figEl, svg, P, state: null, inputs: {}, scene: null, last: null };
  try { inst.state = def.setup ? (def.setup(svg, LP.kit, P, inst) || {}) : {}; }
  catch (e) { LP.err('setup of figure ' + name, e); return null; }
  if (!opts.bare) buildControls(inst);
  return inst;
};

/* f = {t, k, step, frac, n, playing, rest} */
LP.renderInstance = (inst, paramChange) => {
  if (!inst || !inst.def.render) return;
  const f = Object.assign({}, inst.last || { t: 0, k: 0, step: 1, frac: 1, n: 1, playing: false, rest: true });
  f.P = inst.P; f.paramChange = !!paramChange;
  try { inst.def.render(inst.state, f, inst); } catch (e) { LP.err('render of figure ' + inst.name, e); inst.def.render = null; }
};
LP.frameInstance = (inst, f) => {
  if (!inst) return;
  inst.last = f;
  LP.renderInstance(inst, false);
};
})();
