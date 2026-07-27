// Server statico con supporto alle richieste parziali (HTTP Range).
// Serve per provare il sito in locale: senza Range il browser non può cercare
// dentro un video — `seekable` resta vuoto e lo scrubbing non funziona. Il
// modulo http.server di Python non le supporta, e questo ha fatto sembrare
// rotto il lettore quando era rotto solo il banco di prova.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.argv[2] ?? 'out';
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const TIPI = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.mp4':'video/mp4', '.webm':'video/webm',
  '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml',
  '.glb':'model/gltf-binary', '.hdr':'image/vnd.radiance', '.woff2':'font/woff2' };

createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  let st; try { st = statSync(file); } catch { res.writeHead(404).end('no'); return; }
  const tipo = TIPI[extname(file)] ?? 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const inizio = m[1] ? parseInt(m[1], 10) : 0;
    const fine = m[2] ? parseInt(m[2], 10) : st.size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${inizio}-${fine}/${st.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': fine - inizio + 1,
      'Content-Type': tipo,
    });
    createReadStream(file, { start: inizio, end: fine }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': st.size, 'Content-Type': tipo, 'Accept-Ranges': 'bytes' });
    createReadStream(file).pipe(res);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`server con Range su :${PORT} (${ROOT})`));
