'use strict';
// Статический сервер для e2e-тестов. Раздаёт то же, что публикует GitHub Pages:
// index.html и assets/. В index.html подставляется метка сборки так же, как это
// делает workflow Pages, — тесты проверяют и саму подстановку.

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.E2E_PORT || 4173);
const BUILD = process.env.E2E_BUILD || 'e2e-test 2026-01-01 00:00';

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'puzyrki-e2e-'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!html.includes('"__BUILD__"')) throw new Error('в index.html нет заглушки "__BUILD__"');
fs.writeFileSync(path.join(dist, 'index.html'), html.replace('"__BUILD__"', JSON.stringify(BUILD)));
fs.cpSync(path.join(ROOT, 'assets'), path.join(dist, 'assets'), { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.normalize(path.join(dist, rel));
  if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`e2e server: http://127.0.0.1:${PORT}/ (build "${BUILD}")`));
