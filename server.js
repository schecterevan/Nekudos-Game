// Minimal static file server (no dependencies).
//   node server.js           -> http://localhost:5173 (this computer only)
//   node server.js --host    -> also reachable from other devices on your Wi-Fi
// Note: browsers only allow microphone recording on https:// pages or on localhost.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5173;
const host = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
};

http
  .createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(root, urlPath));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  })
  .listen(port, host, () => {
    console.log(`Nekudos Stars running at http://localhost:${port}`);
    if (host === '0.0.0.0') {
      for (const nets of Object.values(os.networkInterfaces())) {
        for (const n of nets || []) if (n.family === 'IPv4' && !n.internal) console.log(`  on your network: http://${n.address}:${port}`);
      }
    }
  });
