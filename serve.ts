// LUMEN DRIFT — serve.ts
// Server statis sederhana untuk play-test lokal (Node 22, stdlib saja).
// Menyajikan game/ di / dan screenshots/ di /screenshots/.
// Jalankan: node serve.ts [port]  (default 8901)
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname);
const GAME_DIR = join(REPO_ROOT, 'game');
const SHOTS_DIR = join(REPO_ROOT, 'screenshots');
const PORT = Number(process.argv[2] || process.env.PORT || 8901);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let base = GAME_DIR;
  if (rel.startsWith('screenshots/')) {
    base = REPO_ROOT;
  } else if (rel === '' || rel === 'index.html') {
    rel = 'index.html';
  }
  const file = resolve(join(base, rel));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found: ' + url.pathname + '\n');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log('LUMEN DRIFT dev server: http://localhost:' + PORT + '/');
  console.log('Shots: /?shot=start&seed=1  /?shot=play&seed=1  /?shot=end&seed=1');
});
