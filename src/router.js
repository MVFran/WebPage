// ============================================================
// src/router.js
// Router del lado del cliente + vistas de cada página.
// Rutas:
//   /  /proyectos  /articulos  /cursos  /sobre-mi
//   /proyectos/:id  /articulos/:id  /cursos/:id  /cursos/:id/:nota
// ============================================================

import {
  loadProjectList, loadBlogList, loadCourseList, loadDocument,
} from './content-loader.js';
import { escapeHTML, formatDate, normalize, tagsHTML } from './util.js';

const SITE_NAME = 'Francisco Miranda';
const DEFAULT_DESC = 'Proyectos de programación, investigación y notas académicas.';
const PROJECT_TYPES = { programming: 'Programación', research: 'Investigación' };

const app = () => document.getElementById('app');

let renderToken = 0;       // descarta renders obsoletos si el usuario navega rápido
let tocObserver = null;

// ============================================================
// Router
// ============================================================
export function initRouter() {
  document.addEventListener('click', onLinkClick);
  window.addEventListener('popstate', () => renderRoute(location.pathname, { focus: false }));
  renderRoute(location.pathname, { focus: false });
}

export function navigateTo(path) {
  history.pushState({}, '', path);
  renderRoute(path);
}

function onLinkClick(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest('a');
  if (!link || !isInternalRoute(link)) return;

  // Anclas dentro de la misma página (tabla de contenidos): comportamiento nativo
  if (link.hash && link.pathname === location.pathname) return;

  event.preventDefault();
  navigateTo(link.pathname);
}

function isInternalRoute(link) {
  return (
    link.origin === location.origin &&
    !link.hasAttribute('target') &&
    !link.hasAttribute('download') &&
    !/\.[a-z0-9]+$/i.test(link.pathname)       // archivos (pdf, ico, xml…) los maneja el navegador
  );
}

async function renderRoute(rawPath, { focus = true } = {}) {
  const token = ++renderToken;
  tocObserver?.disconnect();

  const path = rawPath.replace(/\/+$/, '') || '/';
  const [, section, id, sub] = path.split('/').map(decodeURIComponent);

  setActiveNav(section ? `/${section}` : '/');
  showLoading();

  try {
    const view = await resolveView(path, section, id, sub);
    if (token !== renderToken) return;          // el usuario ya fue a otra página
    app().innerHTML = view.html;
    setMeta(view.title, view.description, path);
    view.after?.();
  } catch (error) {
    console.error('[router]', error);
    if (token !== renderToken) return;
    app().innerHTML = errorView('No se pudo cargar el contenido', 'Revisa tu conexión e inténtalo de nuevo.');
    setMeta('Error', '', path);
  }

  if (token === renderToken) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (focus) app().focus({ preventScroll: true });
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }
}

async function resolveView(path, section, id, sub) {
  if (path === '/')           return homeView();
  if (path === '/proyectos')  return projectsView();
  if (path === '/articulos')  return articlesView();
  if (path === '/cursos')     return coursesView();
  if (path === '/sobre-mi')   return aboutView();

  if (section === 'proyectos' && id && !sub) return projectView(id);
  if (section === 'articulos' && id && !sub) return articleView(id);
  if (section === 'cursos'    && id && !sub) return courseView(id);
  if (section === 'cursos'    && id && sub)  return noteView(id, sub);

  return notFoundView();
}

function setActiveNav(route) {
  document.querySelectorAll('.main-nav a').forEach(a => {
    const active = a.dataset.route === route;
    a.classList.toggle('active', active);
    active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
}

function setMeta(title, description, path) {
  const full = title && title !== SITE_NAME ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Físico y Analista de Datos`;
  const desc = description || DEFAULT_DESC;
  document.title = full;

  const set = (selector, attr, value) => document.querySelector(selector)?.setAttribute(attr, value);
  set('meta[name="description"]', 'content', desc);
  set('meta[property="og:title"]', 'content', full);
  set('meta[property="og:description"]', 'content', desc);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = location.origin + path;

  let og = document.querySelector('meta[property="og:url"]');
  if (!og) {
    og = document.createElement('meta');
    og.setAttribute('property', 'og:url');
    document.head.append(og);
  }
  og.content = canonical.href;
}

function showLoading() {
  app().innerHTML = '<p class="loading" role="status">Cargando…</p>';
}

// ============================================================
// Vistas: listados
// ============================================================
async function homeView() {
  const [projects, articles, courses] = await Promise.all([loadProjectList(), loadBlogList(), loadCourseList()]);

  const featured = [
    ...projects.filter(p => p.featured),
    ...projects.filter(p => !p.featured),
  ].slice(0, 3);
  const current = projects.find(p => p.featured && p.type === 'research');

  return {
    title: SITE_NAME,
    description: DEFAULT_DESC,
    html: `
      <section class="hero">
        <div class="container">
          <span class="hero-eyebrow">Físico · Analista de Datos</span>
          <h1>Hola, soy <em>Francisco Miranda</em></h1>
          <p class="hero-lead">
            Aquí publico mis proyectos, notas de cursos y artículos sobre
            física, programación e inteligencia artificial.
          </p>
          <div class="btn-row">
            <a href="/proyectos" class="btn btn-primary">Ver proyectos</a>
            <a href="/sobre-mi" class="btn btn-ghost">Sobre mí</a>
          </div>
        </div>
      </section>

      <div class="container" style="padding-top: var(--space-12);">
        ${current ? `
          <div class="now-card">
            <div>
              <span class="card-kicker">Actualmente</span>
              <strong>${escapeHTML(current.title)}</strong>
              <p>${escapeHTML(current.description)}</p>
            </div>
            <a href="/proyectos/${encodeURIComponent(current.id)}" class="btn btn-ghost">Leer más</a>
          </div>` : ''}

        <section class="section" ${current ? '' : 'style="margin-top:0"'}>
          <div class="section-header">
            <h2 class="section-title">Proyectos destacados</h2>
            <a href="/proyectos" class="section-link">Ver todos →</a>
          </div>
          ${featured.length
            ? `<div class="card-grid">${featured.map(p => projectCard(p)).join('')}</div>`
            : '<p class="empty">Aún no hay proyectos.</p>'}
        </section>

        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Últimos artículos</h2>
            <a href="/articulos" class="section-link">Ver todos →</a>
          </div>
          ${articles.length
            ? `<div class="card-list">${articles.slice(0, 3).map(a => articleCard(a)).join('')}</div>`
            : '<p class="empty">Aún no hay artículos.</p>'}
        </section>

        ${courses.length ? `
          <section class="section">
            <div class="section-header">
              <h2 class="section-title">Notas de cursos</h2>
              <a href="/cursos" class="section-link">Ver todos →</a>
            </div>
            <div class="course-strip">
              ${courses.map(c => `
                <a class="course-pill" href="/cursos/${encodeURIComponent(c.id)}">
                  <strong>${escapeHTML(c.title)}</strong>
                  <span>${noteCount(c)}</span>
                </a>`).join('')}
            </div>
          </section>` : ''}
      </div>`,
  };
}

async function projectsView() {
  const projects = await loadProjectList();
  const options = [...new Set(projects.map(p => p.type))].map(t => ({ value: t, label: PROJECT_TYPES[t] ?? t }));

  return {
    title: 'Proyectos',
    description: 'Proyectos de programación e investigación.',
    html: listPage({
      title: 'Proyectos',
      lead: 'Programación e investigación.',
      chips: options,
      body: projects.length
        ? `<div class="card-grid" data-filterable>${projects.map(p => projectCard(p, [p.type])).join('')}</div>`
        : '<p class="empty">Aún no hay proyectos.</p>',
    }),
    after: setupFilters,
  };
}

async function articlesView() {
  const articles = await loadBlogList();
  const tags = [...new Set(articles.flatMap(a => a.tags ?? []))].sort((a, b) => a.localeCompare(b, 'es'));

  return {
    title: 'Artículos',
    description: 'Artículos sobre física, matemáticas y programación.',
    html: listPage({
      title: 'Artículos',
      lead: 'Notas y explicaciones sobre temas que me interesan.',
      chips: tags.map(t => ({ value: normalize(t), label: t })),
      body: articles.length
        ? `<div class="card-list" data-filterable>${articles.map(a => articleCard(a, (a.tags ?? []).map(normalize))).join('')}</div>`
        : '<p class="empty">Aún no hay artículos.</p>',
    }),
    after: setupFilters,
  };
}

async function coursesView() {
  const courses = await loadCourseList();
  const tags = [...new Set(courses.flatMap(c => c.tags ?? []))].sort((a, b) => a.localeCompare(b, 'es'));

  return {
    title: 'Cursos',
    description: 'Notas de los cursos que he tomado.',
    html: listPage({
      title: 'Cursos',
      lead: 'Mis notas de los cursos que he tomado.',
      chips: tags.map(t => ({ value: normalize(t), label: t })),
      body: courses.length
        ? `<div class="card-grid" data-filterable>${courses.map(courseCard).join('')}</div>`
        : '<p class="empty">Aún no hay cursos.</p>',
    }),
    after: setupFilters,
  };
}

function listPage({ title, lead, chips, body }) {
  return `
    <div class="container">
      <header class="page-header">
        <h1 class="page-title">${title}</h1>
        <p class="page-lead">${lead}</p>
      </header>
      ${chips.length > 1 ? `
        <div class="chips" role="group" aria-label="Filtrar">
          <button class="chip" type="button" data-filter="" aria-pressed="true">Todos</button>
          ${chips.map(c => `<button class="chip" type="button" data-filter="${escapeHTML(c.value)}" aria-pressed="false">${escapeHTML(c.label)}</button>`).join('')}
        </div>` : ''}
      ${body}
    </div>`;
}

// Filtro por etiqueta/tipo, sincronizado con ?filtro= en la URL
function setupFilters() {
  const chips = [...document.querySelectorAll('.chip[data-filter]')];
  const items = [...document.querySelectorAll('[data-filterable] > [data-keys]')];
  if (!chips.length) return;

  const apply = (value) => {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === value)));
    items.forEach(el => { el.hidden = value !== '' && !el.dataset.keys.split('|').includes(value); });
  };

  const initial = new URLSearchParams(location.search).get('filtro') ?? '';
  apply(chips.some(c => c.dataset.filter === initial) ? initial : '');

  chips.forEach(chip => chip.addEventListener('click', () => {
    apply(chip.dataset.filter);
    const url = chip.dataset.filter ? `${location.pathname}?filtro=${encodeURIComponent(chip.dataset.filter)}` : location.pathname;
    history.replaceState({}, '', url);
  }));
}

// ============================================================
// Vistas: detalle
// ============================================================
async function projectView(id) {
  const project = (await loadProjectList()).find(p => p.id === id);
  if (!project) return notFoundView();
  const doc = await loadDocument(project.file);

  const links = [
    project.repo && `<a class="btn btn-primary" href="${escapeHTML(project.repo)}" target="_blank" rel="noopener noreferrer">Ver repositorio</a>`,
    project.demo && `<a class="btn btn-ghost" href="${escapeHTML(project.demo)}" target="_blank" rel="noopener noreferrer">Ver demo</a>`,
  ].filter(Boolean).join('');

  return {
    title: project.title,
    description: project.description,
    html: readingPage({
      crumbs: [['Proyectos', '/proyectos'], [project.title]],
      meta: [PROJECT_TYPES[project.type] ?? project.type, formatDate(project.date)],
      title: project.title,
      description: project.description,
      tags: project.tags,
      actions: links,
      doc,
    }),
    after: () => setupToc(doc),
  };
}

async function articleView(id) {
  const article = (await loadBlogList()).find(a => a.id === id);
  if (!article) return notFoundView();
  const doc = await loadDocument(article.file);

  return {
    title: article.title,
    description: article.description,
    html: readingPage({
      crumbs: [['Artículos', '/articulos'], [article.title]],
      meta: [formatDate(article.date), article.readingTime && `${article.readingTime} min de lectura`],
      title: article.title,
      description: article.description,
      tags: article.tags,
      doc,
    }),
    after: () => setupToc(doc),
  };
}

async function courseView(id) {
  const course = (await loadCourseList()).find(c => c.id === id);
  if (!course) return notFoundView();
  const intro = course.file ? await loadDocument(course.file) : null;
  const notes = course.notes ?? [];

  return {
    title: course.title,
    description: course.description || `Notas del curso ${course.title}.`,
    html: `
      <div class="container container-narrow">
        ${breadcrumb([['Cursos', '/cursos'], [course.title]])}
        <header class="page-header">
          ${course.institution ? `<p class="meta" style="margin-bottom: var(--space-3)">${escapeHTML(course.institution)}</p>` : ''}
          <h1 class="page-title">${escapeHTML(course.title)}</h1>
          ${course.description ? `<p class="page-lead">${escapeHTML(course.description)}</p>` : ''}
          <div style="margin-top: var(--space-4)">${tagsHTML(course.tags)}</div>
        </header>
        ${intro ? `<article class="content" style="margin-bottom: var(--space-10)">${intro.html}</article>` : ''}
        <section>
          <h2 class="section-title" style="margin-bottom: var(--space-5)">Notas</h2>
          ${notes.length ? `
            <div class="note-list">
              ${notes.map(n => n.type === 'pdf'
                ? `<a class="note-item" href="/${escapeHTML(n.file)}" target="_blank" rel="noopener noreferrer">
                     <span class="note-title">${escapeHTML(n.title)}</span><span class="badge">PDF ↗</span></a>`
                : `<a class="note-item" href="/cursos/${encodeURIComponent(course.id)}/${encodeURIComponent(n.id)}">
                     <span class="note-title">${escapeHTML(n.title)}</span><span class="badge">Notas</span></a>`).join('')}
            </div>` : '<p class="empty">Este curso aún no tiene notas.</p>'}
        </section>
      </div>`,
  };
}

async function noteView(courseId, noteId) {
  const course = (await loadCourseList()).find(c => c.id === courseId);
  const notes  = (course?.notes ?? []).filter(n => n.type === 'markdown');
  const pos    = notes.findIndex(n => n.id === noteId);
  if (pos === -1) return notFoundView();

  const note = notes[pos];
  const doc  = await loadDocument(note.file);
  const prev = notes[pos - 1];
  const next = notes[pos + 1];
  const href = n => `/cursos/${encodeURIComponent(course.id)}/${encodeURIComponent(n.id)}`;

  return {
    title: `${note.title} — ${course.title}`,
    description: `Notas del curso ${course.title}.`,
    html: readingPage({
      crumbs: [['Cursos', '/cursos'], [course.title, `/cursos/${encodeURIComponent(course.id)}`], [note.title]],
      meta: [course.institution],
      title: note.title,
      doc,
      footer: (prev || next) ? `
        <nav class="pager" aria-label="Notas del curso">
          ${prev ? `<a class="prev" href="${href(prev)}"><small>← Anterior</small>${escapeHTML(prev.title)}</a>` : ''}
          ${next ? `<a class="next" href="${href(next)}"><small>Siguiente →</small>${escapeHTML(next.title)}</a>` : ''}
        </nav>` : '',
    }),
    after: () => setupToc(doc),
  };
}

async function aboutView() {
  const doc = await loadDocument('content/about.md');
  return {
    title: 'Sobre mí',
    description: 'Formación, experiencia y habilidades de Francisco Miranda.',
    html: `
      <div class="container container-narrow">
        <header class="page-header"><h1 class="page-title">Sobre mí</h1></header>
        <article class="content about">${doc.html}</article>
        <div class="btn-row" style="margin-top: var(--space-10)">
          <a class="btn btn-primary" href="/public/cv.pdf" download>Descargar CV</a>
          <a class="btn btn-ghost" href="mailto:francisco.miv4@gmail.com">Escribirme</a>
        </div>
      </div>`,
  };
}

function notFoundView() {
  return {
    title: 'Página no encontrada',
    description: '',
    html: errorView('Página no encontrada', 'La dirección que buscas no existe o fue movida.', '404'),
  };
}

function errorView(title, text, code = 'Error') {
  return `
    <div class="container">
      <div class="not-found">
        <p class="code">${code}</p>
        <h1 class="page-title">${escapeHTML(title)}</h1>
        <p class="page-lead" style="margin: 0 auto">${escapeHTML(text)}</p>
        <div class="btn-row"><a href="/" class="btn btn-primary">Volver al inicio</a></div>
      </div>
    </div>`;
}

// ============================================================
// Piezas reutilizables
// ============================================================
function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="Ruta">${items.map(([label, href], i) => {
    const last = i === items.length - 1;
    return (href && !last ? `<a href="${href}">${escapeHTML(label)}</a>` : `<span${last ? ' aria-current="page"' : ''}>${escapeHTML(label)}</span>`)
      + (last ? '' : '<span aria-hidden="true">/</span>');
  }).join('')}</nav>`;
}

function readingPage({ crumbs, meta = [], title, description, tags, actions, doc, footer = '' }) {
  const hasToc = doc.toc.length >= 3;
  return `
    <div class="container${hasToc ? '' : ' container-narrow'}">
      ${breadcrumb(crumbs)}
      <div class="reading-layout ${hasToc ? 'has-toc' : ''}">
        <div style="min-width: 0; max-width: var(--max-width-content); width: 100%">
          <header class="article-header">
            <div class="meta">${meta.filter(Boolean).map(m => `<span>${escapeHTML(m)}</span>`).join('')}</div>
            <h1 class="page-title">${escapeHTML(title)}</h1>
            ${description ? `<p class="page-lead">${escapeHTML(description)}</p>` : ''}
            ${tags?.length ? `<div style="margin-top: var(--space-4)">${tagsHTML(tags)}</div>` : ''}
            ${actions ? `<div class="btn-row">${actions}</div>` : ''}
          </header>
          <article class="content">${doc.html}</article>
          ${footer}
        </div>
        ${hasToc ? `
          <aside class="toc" aria-label="Contenido de la página">
            <p class="toc-title">En esta página</p>
            <ul>${doc.toc.map(t => `<li class="${t.level === 3 ? 'toc-sub' : ''}"><a href="#${t.id}">${escapeHTML(t.text.replace(/#$/, ''))}</a></li>`).join('')}</ul>
          </aside>` : ''}
      </div>
    </div>`;
}

// Resalta en la tabla de contenidos la sección que se está leyendo
function setupToc(doc) {
  const links = [...document.querySelectorAll('.toc a')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  tocObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(a => a.classList.remove('active'));
      byId.get(entry.target.id)?.classList.add('active');
    }
  }, { rootMargin: '-80px 0px -70% 0px' });

  doc.toc.forEach(t => { const el = document.getElementById(t.id); if (el) tocObserver.observe(el); });
}

function noteCount(course) {
  const n = course.notes?.length ?? 0;
  return `${n} nota${n === 1 ? '' : 's'}`;
}

function projectCard(project, keys = []) {
  return `
    <article class="card" data-keys="${escapeHTML(keys.join('|'))}">
      <span class="card-kicker">${escapeHTML(PROJECT_TYPES[project.type] ?? project.type ?? '')}</span>
      <h3 class="card-title"><a href="/proyectos/${encodeURIComponent(project.id)}">${escapeHTML(project.title)}</a></h3>
      ${project.description ? `<p class="card-description">${escapeHTML(project.description)}</p>` : ''}
      <div class="card-footer">${tagsHTML(project.tags)}</div>
    </article>`;
}

function articleCard(article, keys = []) {
  return `
    <article class="card card-row" data-keys="${escapeHTML(keys.join('|'))}">
      <time class="card-date" datetime="${escapeHTML(article.date)}">${formatDate(article.date)}</time>
      <div class="card-main">
        <h3 class="card-title"><a href="/articulos/${encodeURIComponent(article.id)}">${escapeHTML(article.title)}</a></h3>
        ${article.description ? `<p class="card-description">${escapeHTML(article.description)}</p>` : ''}
        <div class="meta">
          ${article.readingTime ? `<span>${article.readingTime} min de lectura</span>` : ''}
          ${tagsHTML(article.tags)}
        </div>
      </div>
    </article>`;
}

function courseCard(course) {
  return `
    <article class="card" data-keys="${escapeHTML((course.tags ?? []).map(normalize).join('|'))}">
      ${course.institution ? `<span class="card-kicker">${escapeHTML(course.institution)}</span>` : ''}
      <h3 class="card-title"><a href="/cursos/${encodeURIComponent(course.id)}">${escapeHTML(course.title)}</a></h3>
      ${course.description ? `<p class="card-description">${escapeHTML(course.description)}</p>` : ''}
      <div class="card-footer">
        ${tagsHTML(course.tags)}
        <span class="badge">${noteCount(course)}</span>
      </div>
    </article>`;
}
