// Dev loop: build (unminified), serve dist/, rebuild on change, live-reload the browser.
import { watch } from 'node:fs';
import { join } from 'node:path';
import { buildSite, root } from './lib.mjs';
import { startServer } from './serve.mjs';

const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const port = Number(arg('--port') ?? process.env.PORT ?? 4321);
const host = arg('--host') ?? '127.0.0.1';
const clients = new Set();

await buildSite({ dev: true });
await startServer({
  port,
  host,
  onRequest(req, res) {
    if (req.url !== '/__reload') return false;
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return true;
  },
});
console.log(`\n  Pool portfolio dev server → http://localhost:${port}\n  (editing files in src/ or public/ rebuilds and reloads)\n`);

let timer = null;
let building = false;
const rebuild = () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (building) return rebuild();
    building = true;
    try {
      await buildSite({ dev: true });
      for (const c of clients) c.write('data: reload\n\n');
    } catch (e) {
      console.error(e.message ?? e);
    } finally {
      building = false;
    }
  }, 120);
};
for (const dir of ['src', 'public']) watch(join(root, dir), { recursive: true }, rebuild);
