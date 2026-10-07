// ============================================================
// scripts/build-index.mjs
// Recorre content/ y genera:
//   - content/index.json        (catálogo del sitio)
//   - content/search.json       (texto plano para la búsqueda)
//   - sitemap.xml y robots.txt
//
// Uso:  node scripts/build-index.mjs
// Vercel lo ejecuta en cada deploy (ver vercel.json).
// ============================================================

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, basename, extname, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT    = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const SITE_URL = (process.env.SITE_URL || 'https://francisco-miranda.vercel.app').replace(/\/$/, '');

// ------------------------------------------------------------
// Front matter: bloque `---` al inicio del .md con líneas clave: valor
//   tags: [Python, ML]   → arreglo
//   draft: true          → booleano
// ------------------------------------------------------------
export function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: raw };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    data[m[1]] = parseValue(m[2].trim());
  }
  return { data, body: raw.slice(match[0].length) };
}

function parseValue(v) {
  if (v === '') return '';
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map(s => unquote(s.trim())).filter(Boolean);
  }
  if (v === 'true')  return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return unquote(v);
}

const unquote = s => s.replace(/^(['"])(.*)\1$/, '$2');

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
const humanize = s => s.replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase());
const natural  = new Intl.Collator('es', { numeric: true });

function firstHeading(body) {
  return body.match(/^#\s+(.+)$/m)?.[1].trim();
}

function plainText(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Un archivo "vacío" solo tiene títulos (o nada): se trata como borrador.
// Para mostrarlo igualmente, poner `draft: false` en su front matter.
const skipped = [];
function isHidden(data, body, path) {
  const empty = body.replace(/^#{1,6}\s.*$/gm, '').trim() === '';
  const hidden = data.draft === true || (data.draft !== false && empty);
  if (hidden) skipped.push(rel(path) + (empty && data.draft !== true ? '  (sin contenido)' : '  (draft)'));
  return hidden;
}

function readingTime(body) {
  const words = plainText(body).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Fecha: front matter → primer commit del archivo → fecha de modificación
function fileDate(path) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%as', '--', path],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const last = out.split('\n').filter(Boolean).pop();
    if (last) return last;
  } catch { /* sin git */ }
  return statSync(path).mtime.toISOString().slice(0, 10);
}

const rel = p => p.replace(ROOT + '/', '');
const searchDocs = [];

function readEntry(path, fallbackId) {
  const { data, body } = parseFrontMatter(readFileSync(path, 'utf8'));
  return { data, body, id: data.id || fallbackId, title: data.title || firstHeading(body) || humanize(fallbackId) };
}

// ------------------------------------------------------------
// Proyectos y artículos: un .md por entrada
// ------------------------------------------------------------
function collect(dir, kind) {
  const folder = join(CONTENT, dir);
  if (!existsSync(folder)) return [];

  return readdirSync(folder)
    .filter(f => extname(f) === '.md')
    .map(f => {
      const path = join(folder, f);
      const { data, body, id, title } = readEntry(path, basename(f, '.md'));
      if (isHidden(data, body, path)) return null;

      searchDocs.push({ id, type: kind, text: plainText(body).slice(0, 4000) });

      const entry = {
        id,
        title,
        description: data.description || '',
        date: data.date || fileDate(path),
        tags: data.tags || [],
        file: rel(path),
      };
      if (kind === 'blog')    entry.readingTime = data.readingTime || readingTime(body);
      if (kind === 'project') {
        entry.type = data.type || 'programming';
        if (data.repo)     entry.repo = data.repo;
        if (data.demo)     entry.demo = data.demo;
        if (data.featured) entry.featured = true;
      }
      return entry;
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ------------------------------------------------------------
// Cursos: carpeta por curso, con course.md (opcional) + notas .md / .pdf
// ------------------------------------------------------------
function collectCourses() {
  const folder = join(CONTENT, 'courses');
  if (!existsSync(folder)) return [];

  return readdirSync(folder)
    .filter(d => statSync(join(folder, d)).isDirectory())
    .map(dir => {
      const base = join(folder, dir);
      const metaPath = join(base, 'course.md');
      const meta = existsSync(metaPath) ? readEntry(metaPath, dir) : { data: {}, body: '', id: dir, title: humanize(dir) };
      if (meta.data.draft === true) { skipped.push(rel(metaPath) + '  (draft)'); return null; }

      const notes = readdirSync(base)
        .filter(f => ['.md', '.pdf'].includes(extname(f)) && f !== 'course.md')
        .sort(natural.compare)
        .map(f => {
          const path = join(base, f);
          const noteId = basename(f, extname(f));
          if (extname(f) === '.pdf') {
            return { id: noteId, title: humanize(noteId), type: 'pdf', file: rel(path), order: 0 };
          }
          const note = readEntry(path, noteId);
          if (isHidden(note.data, note.body, path)) return null;
          searchDocs.push({ id: `${meta.id}/${noteId}`, type: 'note', text: plainText(note.body).slice(0, 4000) });
          return { id: noteId, title: note.title, type: 'markdown', file: rel(path), order: note.data.order ?? 0 };
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order);   // estable: conserva el orden por nombre

      // Un curso sin notas visibles ni texto propio no se muestra
      if (!notes.length && meta.data.draft !== false && meta.body.replace(/^#{1,6}\s.*$/gm, '').trim() === '') {
        skipped.push(rel(base) + '/  (curso sin notas)');
        return null;
      }

      notes.forEach(n => delete n.order);
      searchDocs.push({ id: meta.id, type: 'course', text: plainText(meta.body).slice(0, 4000) });

      return {
        id: meta.id,
        title: meta.title,
        institution: meta.data.institution || '',
        description: meta.data.description || '',
        date: meta.data.date || fileDate(existsSync(metaPath) ? metaPath : join(base, readdirSync(base)[0])),
        tags: meta.data.tags || [],
        file: existsSync(metaPath) && meta.body.trim() ? rel(metaPath) : '',
        notes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ------------------------------------------------------------
// Salida
// ------------------------------------------------------------
const index = {
  projects: collect('projects', 'project'),
  blog:     collect('blog', 'blog'),
  courses:  collectCourses(),
};

writeFileSync(join(CONTENT, 'index.json'),  JSON.stringify(index, null, 2) + '\n');
writeFileSync(join(CONTENT, 'search.json'), JSON.stringify(searchDocs, null, 2) + '\n');

const urls = [
  '/', '/proyectos', '/articulos', '/cursos', '/sobre-mi',
  ...index.projects.map(p => `/proyectos/${p.id}`),
  ...index.blog.map(a => `/articulos/${a.id}`),
  ...index.courses.flatMap(c => [
    `/cursos/${c.id}`,
    ...c.notes.filter(n => n.type === 'markdown').map(n => `/cursos/${c.id}/${n.id}`),
  ]),
];

writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n') + `\n</urlset>\n`);

writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

if (skipped.length) console.log('Ocultos hasta que tengan contenido:\n' + skipped.map(f => '  · ' + f).join('\n'));
console.log(`✓ ${index.projects.length} proyectos, ${index.blog.length} artículos, ${index.courses.length} cursos → content/index.json`);
