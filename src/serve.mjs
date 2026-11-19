// livepaper dev server: rebuild on save, live-reload the browser.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { buildHtml, paths } from './build.mjs';

export function serve(paperFile, opts = {}) {
  const P = paths(paperFile, opts);
  const clients = new Set();
  const port = opts.port || 4173;
  const rebuild = () => {
    try {
      const r = buildHtml(paperFile, Object.assign({}, opts, { dev: true }));
      const warn = r.katexErrors.length + r.missingFigures.length;
      console.log(`[livepaper] rebuilt in ${r.ms} ms${warn ? ` — ${r.katexErrors.length} KaTeX error(s), ${r.missingFigures.length} missing figure(s)` : ''}`);
      r.katexErrors.forEach(e => console.log('   KaTeX: ' + e.message));
      r.pandocWarnings.forEach(w => console.log('   ' + w));
      clients.forEach(res => res.write('data: reload\n\n'));
    } catch (e) { console.error('[livepaper] build failed:\n' + e.message); }
  };
  rebuild();
  let timer = null;
  fs.watch(P.dir, { recursive: true }, (ev, file) => {
    if (!file) return;
    const f = String(file);
    if (f.startsWith('dist') || f.startsWith('build') || f.includes('node_modules') || f.startsWith('.')) return;
    clearTimeout(timer); timer = setTimeout(rebuild, 120);
  });
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/__livepaper') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('retry: 500\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const f = path.join(P.out, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
    if (!f.startsWith(P.out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const type = f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  server.listen(port, '127.0.0.1', () => console.log(`[livepaper] serving http://127.0.0.1:${port}/  (watching ${P.dir})`));
  return server;
}
