// Servidor local con fallback de SPA:  node scripts/dev.mjs [puerto]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watch } from 'node:fs';
import { execFile } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.pdf': 'application/pdf',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain',
};

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(ROOT, pathname);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }

  try {
    if (!(await stat(file)).isFile()) throw 0;
  } catch {
    if (extname(pathname)) { res.writeHead(404).end('Not found'); return; }
    file = join(ROOT, 'index.html');            // ruta de la SPA
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));

// Regenera content/index.json cada vez que cambia algo en content/
let timer;
watch(join(ROOT, 'content'), { recursive: true }, (_, file) => {
  if (!file || /(^|\/)(index|search)\.json$/.test(file)) return;   // evita el bucle con los archivos generados
  clearTimeout(timer);
  timer = setTimeout(() => {
    execFile('node', [join(ROOT, 'scripts/build-index.mjs')], (err, out) => {
      console.log(err ? `✗ build-index: ${err.message}` : `↻ ${out.trim().split('\n').pop()}`);
    });
  }, 200);
});
