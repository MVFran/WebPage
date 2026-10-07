// ============================================================
// src/content-loader.js
// Carga el catálogo (index.json) y los documentos Markdown.
// El catálogo lo genera scripts/build-index.mjs a partir del
// front matter de cada archivo en content/.
// ============================================================

import { escapeHTML } from './util.js';

const cache = new Map();

// ------------------------------------------------------------
// Red
// ------------------------------------------------------------
async function fetchJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const data = await response.json();
  cache.set(url, data);
  return data;
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  // Si el servidor responde con el fallback de la SPA (index.html), el archivo no existe
  if (!response.ok || /^\s*<!doctype html/i.test(text)) throw new Error(`${url}: no encontrado`);
  return text;
}

// ------------------------------------------------------------
// Catálogo
// ------------------------------------------------------------
export const loadIndex      = () => fetchJSON('/content/index.json');
export const loadSearchDocs = () => fetchJSON('/content/search.json');

export async function loadProjectList() { return (await loadIndex()).projects ?? []; }
export async function loadBlogList()    { return (await loadIndex()).blog ?? []; }
export async function loadCourseList()  { return (await loadIndex()).courses ?? []; }

// ------------------------------------------------------------
// Markdown → HTML seguro
// Devuelve { html, toc }
//   html: contenido sanitizado, con ecuaciones renderizadas
//   toc:  [{ id, text, level }] de los h2 y h3
// ------------------------------------------------------------
export async function loadDocument(filePath) {
  const key = `doc:${filePath}`;
  if (cache.has(key)) return cache.get(key);

  const raw  = await fetchText('/' + filePath.replace(/^\//, ''));
  const body = stripFrontMatter(raw).replace(/^\s*#\s+.+\n?/, ''); // el título lo muestra la página
  const doc  = renderMarkdown(body);

  cache.set(key, doc);
  return doc;
}

function stripFrontMatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

// ------------------------------------------------------------
// Ecuaciones: se extraen antes de pasar por marked (que rompería
// los guiones bajos y barras), y se reinsertan ya renderizadas
// con KaTeX después de sanitizar.
// ------------------------------------------------------------
const MATH_PATTERNS = [
  { re: /\$\$([\s\S]+?)\$\$/g,        display: true  },
  { re: /\\\[([\s\S]+?)\\\]/g,         display: true  },
  { re: /\\\(([\s\S]+?)\\\)/g,         display: false },
  { re: /(?<![\\$\w])\$(?!\s)((?:\\.|[^$\\\n])+?)(?<!\s)\$(?![\d$])/g, display: false },
];

function extractMath(markdown) {
  const store = [];
  // Se protege el código para no tocar los $ que aparezcan dentro
  const code = [];
  let text = markdown.replace(/```[\s\S]*?```|`[^`\n]+`/g, m => `CODEPH${code.push(m) - 1}END`);

  for (const { re, display } of MATH_PATTERNS) {
    text = text.replace(re, (_, tex) => `MATHPH${store.push({ tex, display }) - 1}END`);
  }
  text = text.replace(/CODEPH(\d+)END/g, (_, i) => code[i]);
  return { text, store };
}

function renderMath({ tex, display }) {
  if (!window.katex) return escapeHTML(tex);
  return window.katex.renderToString(tex.trim(), { displayMode: display, throwOnError: false, output: 'html' });
}

function renderMarkdown(markdown) {
  const { text, store } = extractMath(markdown);
  const dirty = window.marked.parse(text, { gfm: true });
  const clean = window.DOMPurify.sanitize(dirty, { ADD_ATTR: ['target'] });
  const withMath = clean.replace(/MATHPH(\d+)END/g, (_, i) => renderMath(store[i]));

  const tpl = document.createElement('template');
  tpl.innerHTML = withMath;
  const toc = enhance(tpl.content);

  return { html: tpl.innerHTML, toc };
}

// Ids y enlaces de ancla en títulos, enlaces externos seguros
function enhance(root) {
  const toc  = [];
  const used = new Set();

  root.querySelectorAll('h2, h3').forEach(h => {
    let id = h.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seccion';
    for (let n = 2; used.has(id); n++) id = `${id.replace(/-\d+$/, '')}-${n}`;
    used.add(id);
    h.id = id;
    toc.push({ id, text: h.textContent, level: Number(h.tagName[1]) });

    const a = document.createElement('a');
    a.className = 'anchor';
    a.href = `#${id}`;
    a.setAttribute('aria-label', 'Enlace a esta sección');
    a.textContent = '#';
    h.append(a);
  });

  root.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (/^https?:\/\//.test(href) && !href.startsWith(location.origin)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });

  root.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; });
  return toc;
}
