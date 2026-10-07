// ============================================================
// src/search.js — búsqueda en el sitio (Ctrl/⌘ K  o  /)
// Índice en memoria: título, descripción, etiquetas y texto
// del contenido. Sin backend.
// ============================================================

import { loadIndex, loadSearchDocs } from './content-loader.js';
import { escapeHTML, formatDate, normalize } from './util.js';

let entries = null;     // se construye al abrir por primera vez
let activeIndex = -1;

const $ = id => document.getElementById(id);

const TYPE_LABEL = { proyecto: 'Proyecto', 'artículo': 'Artículo', curso: 'Curso', nota: 'Nota' };

export function initSearch() {
  const dialog = $('search-dialog');
  const input  = $('search-input');
  const list   = $('search-results');
  if (!dialog || !input || !list) return;

  $('search-open')?.addEventListener('click', () => open(dialog, input, list));

  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      dialog.open ? dialog.close() : open(dialog, input, list);
    } else if (e.key === '/' && !typing && !dialog.open) {
      e.preventDefault();
      open(dialog, input, list);
    }
  });

  // Cierra al hacer clic fuera del panel o al navegar
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
    if (e.target.closest('a')) dialog.close();
  });

  input.addEventListener('input', () => render(list, input.value));

  input.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('.search-result')];
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.setAttribute('aria-selected', String(i === activeIndex)));
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (items[activeIndex] ?? items[0]).click();
    }
  });
}

async function open(dialog, input, list) {
  dialog.showModal();
  input.select();
  if (!entries) {
    list.innerHTML = '<p class="search-hint">Cargando…</p>';
    try { entries = await buildEntries(); } catch { entries = []; }
  }
  render(list, input.value);
}

async function buildEntries() {
  const [index, docs] = await Promise.all([loadIndex(), loadSearchDocs().catch(() => [])]);
  const text = new Map(docs.map(d => [`${d.type}:${d.id}`, d.text]));
  const out = [];

  const add = (item, type, key, url) => out.push({
    type, url,
    title: item.title,
    description: item.description ?? '',
    date: item.date,
    tags: item.tags ?? [],
    _title: normalize(item.title),
    _tags:  normalize((item.tags ?? []).join(' ')),
    _text:  normalize([item.description, item.institution, text.get(key)].join(' ')),
  });

  (index.projects ?? []).forEach(p => add(p, 'proyecto', `project:${p.id}`, `/proyectos/${p.id}`));
  (index.blog ?? []).forEach(a => add(a, 'artículo', `blog:${a.id}`, `/articulos/${a.id}`));
  (index.courses ?? []).forEach(c => {
    add(c, 'curso', `course:${c.id}`, `/cursos/${c.id}`);
    (c.notes ?? []).filter(n => n.type === 'markdown').forEach(n =>
      add({ ...n, description: c.title, tags: c.tags }, 'nota', `note:${c.id}/${n.id}`, `/cursos/${c.id}/${n.id}`));
  });
  return out;
}

function score(entry, terms) {
  let total = 0;
  for (const t of terms) {
    const hit = (entry._title.includes(t) ? 4 : 0) + (entry._tags.includes(t) ? 2 : 0) + (entry._text.includes(t) ? 1 : 0);
    if (!hit) return 0;          // todos los términos deben aparecer
    total += hit;
  }
  return total;
}

function render(list, query) {
  activeIndex = -1;
  const q = query.trim();
  if (q.length < 2) {
    list.innerHTML = '<p class="search-hint">Escribe al menos 2 letras. Busca por título, etiqueta o contenido.</p>';
    return;
  }

  const terms = normalize(q).split(/\s+/).filter(Boolean);
  const results = entries
    .map(e => ({ e, s: score(e, terms) }))
    .filter(r => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 12);

  if (!results.length) {
    list.innerHTML = `<p class="search-hint">Sin resultados para «${escapeHTML(q)}».</p>`;
    return;
  }

  list.innerHTML = results.map(({ e }) => `
    <a class="search-result" href="${escapeHTML(e.url)}" role="option" aria-selected="false">
      <div class="search-result-top">
        <span class="badge">${TYPE_LABEL[e.type]}</span>
        ${e.date ? `<span class="meta">${formatDate(e.date)}</span>` : ''}
      </div>
      <div class="search-result-title">${highlight(e.title, terms)}</div>
      ${e.description ? `<div class="search-result-desc">${highlight(e.description, terms)}</div>` : ''}
    </a>`).join('');
}

// Resalta los términos ignorando tildes (normalize conserva la longitud)
function highlight(text, terms) {
  const norm = normalize(text);
  const marks = new Array(text.length).fill(false);
  for (const t of terms) {
    for (let i = norm.indexOf(t); i !== -1; i = norm.indexOf(t, i + t.length)) {
      for (let j = i; j < i + t.length; j++) marks[j] = true;
    }
  }
  let out = '', open = false;
  [...text].forEach((ch, i) => {
    if (marks[i] && !open) { out += '<mark>'; open = true; }
    if (!marks[i] && open) { out += '</mark>'; open = false; }
    out += escapeHTML(ch);
  });
  return open ? out + '</mark>' : out;
}
