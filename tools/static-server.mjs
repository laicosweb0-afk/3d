// Server statico minimo per servire la cartella `out/` durante le catture
// video: l'export di Next non ha un server proprio (`next start` non
// funziona con output:'export').
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.argv[2] ?? 'out';
const PORT = Number(process.argv[3] ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
};

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ''));
  try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); } catch { }
  try {
    statSync(file);
  } catch {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('serve ' + ROOT + ' :' + PORT));
