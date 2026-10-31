// Tiny static server for dist/ that mimics Cloudflare Pages routing:
// /work → /work/ , /work/ → /work/index.html , unknown → 404.html (status 404).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dist } from './lib.mjs';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
};

const exists = async (p) => {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
};

export function startServer({ port = 4321, host = '127.0.0.1', onRequest } = {}) {
  const server = createServer(async (req, res) => {
    try {
      if (onRequest && onRequest(req, res)) return;
      const url = new URL(req.url, 'http://x');
      let path = decodeURIComponent(url.pathname);
      const safe = normalize(path).replace(/^[/\\]+/, '').replace(/^(\.\.[/\\])+/, '');
      let file = join(dist, safe);
      if (!extname(safe) && !path.endsWith('/') && (await exists(join(file, 'index.html')))) {
        res.writeHead(301, { Location: path + '/' + url.search });
        return res.end();
      }
      if (path.endsWith('/') || !extname(safe)) file = join(file, 'index.html');
      let status = 200;
      if (!(await exists(file))) {
        file = join(dist, '404.html');
        status = 404;
      }
      const body = await readFile(file);
      res.writeHead(status, {
        'Content-Type': types[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('serve.mjs')) {
  const i = process.argv.indexOf('--port');
  const port = i > -1 ? Number(process.argv[i + 1]) : 4321;
  const h = process.argv.indexOf('--host');
  const host = h > -1 ? process.argv[h + 1] : undefined; // 0.0.0.0 lets a phone on the same Wi-Fi connect
  startServer({ port, host }).then(() => console.log(`Serving dist/ at http://${host ?? 'localhost'}:${port}`));
}
