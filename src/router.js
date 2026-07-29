// ============================================================
// src/router.js
// Router del lado del cliente — navegación sin recargas
// ============================================================

import {
  loadIndex,
  loadProjectList,
  loadBlogList,
  loadCourseList,
  loadEntry,
} from './content-loader.js';

import { search } from './search.js';


// ------------------------------------------------------------
// MAPA DE RUTAS
// ------------------------------------------------------------
const routes = {
  '/':          renderHome,
  '/proyectos': renderProjects,
  '/articulos': renderBlog,
  '/cursos':    renderCourses,
  '/sobre-mi':  renderAbout,
};

const ROUTE_NOT_FOUND  = render404;
const APP_CONTAINER_ID = 'app';


// ------------------------------------------------------------
// initRouter()
// ------------------------------------------------------------
export function initRouter() {
  setupLinkInterception();

  window.addEventListener('popstate', () => {
    renderRoute(window.location.pathname);
  });

  renderRoute(window.location.pathname);
}


// ------------------------------------------------------------
// setupLinkInterception()
// Delegación de eventos — un solo listener para todos los links
// ------------------------------------------------------------
function setupLinkInterception() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    if (!isInternalLink(link)) return;

    event.preventDefault();

    const path = link.pathname;
    if (path === window.location.pathname) return;

    navigateTo(path);
  });
}


// ------------------------------------------------------------
// isInternalLink(link)
// ------------------------------------------------------------
function isInternalLink(link) {
  return (
    link.hostname === window.location.hostname &&
    !link.hasAttribute('target')
  );
}


// ------------------------------------------------------------
// navigateTo(path)
// Exportada para navegar desde JS sin un link en el HTML
// ------------------------------------------------------------
export function navigateTo(path) {
  history.pushState({}, '', path);
  renderRoute(path);
}


// ------------------------------------------------------------
// renderRoute(path)
// ------------------------------------------------------------
function renderRoute(path) {
  // Rutas con segmentos dinámicos: /proyectos/:id, /articulos/:id
  // CONCEPTO: Rutas dinámicas
  // --------------------------
  // Algunas rutas tienen un identificador variable al final.
  // En lugar de registrar una entrada en `routes` por cada
  // artículo o proyecto, detectamos el patrón y extraemos
  // el id del segmento final de la URL.
  //
  // Ejemplo: '/articulos/mi-nota' → sección='articulos', id='mi-nota'
  const dynamicMatch = matchDynamicRoute(path);

  if (dynamicMatch) {
    renderEntry(dynamicMatch.section, dynamicMatch.id);
    updateActiveNavLink('/' + dynamicMatch.section);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  const normalizedPath = path.replace(/\/$/, '') || '/';
  const renderFn = routes[normalizedPath] ?? ROUTE_NOT_FOUND;

  updateActiveNavLink(normalizedPath);
  renderFn();
  window.scrollTo({ top: 0, behavior: 'instant' });
}


// ------------------------------------------------------------
// matchDynamicRoute(path)
// Detecta rutas con id: /proyectos/algo, /articulos/algo, /cursos/algo
// Devuelve { section, id } o null si no coincide
// ------------------------------------------------------------
function matchDynamicRoute(path) {
  const pattern = /^\/(proyectos|articulos|cursos)\/([^/]+)$/;
  const match   = path.match(pattern);

  if (!match) return null;
  return { section: match[1], id: match[2] };
}


// ------------------------------------------------------------
// updateActiveNavLink(currentPath)
// ------------------------------------------------------------
function updateActiveNavLink(currentPath) {
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}


// ------------------------------------------------------------
// setContent(html)
// Inyecta HTML en el contenedor principal
// ------------------------------------------------------------
function setContent(html) {
  const container = document.getElementById(APP_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = html;
}


// ------------------------------------------------------------
// showLoading()
// Indicador de carga mientras se fetcha el contenido
// ------------------------------------------------------------
function showLoading() {
  setContent(`
    <div style="padding: var(--space-16) 0; color: var(--color-text-muted);
                font-size: var(--text-sm); font-family: var(--font-sans);">
      Cargando…
    </div>
  `);
}


// ============================================================
// RENDERIZADO DE PÁGINAS
// ============================================================

// ------------------------------------------------------------
// renderHome()
// Carga proyectos y artículos recientes desde el índice
// ------------------------------------------------------------
async function renderHome() {
  showLoading();

  // CONCEPTO: Promise.all()
  // ------------------------
  // Cuando necesitamos hacer varias peticiones independientes,
  // lanzarlas en paralelo es más eficiente que esperar una
  // por una (en serie). Promise.all recibe un array de Promesas
  // y espera a que TODAS se resuelvan antes de continuar.
  // Si una falla, todo el Promise.all falla.
  //
  // En serie:    petición1 (200ms) → petición2 (200ms) = 400ms
  // En paralelo: petición1 + petición2 al mismo tiempo  = 200ms
  const [projects, articles] = await Promise.all([
    loadProjectList(),
    loadBlogList(),
  ]);

  // Mostramos solo los 3 más recientes en el inicio
  const recentProjects = projects.slice(0, 3);
  const recentArticles = articles.slice(0, 3);

  setContent(`
    <div class="content-wrapper">

      <!-- Hero -->
      <section style="margin-bottom: var(--space-16);">
        <div class="meta" style="margin-bottom: var(--space-4);">
          <span class="badge">Bienvenido</span>
        </div>
        <h1 style="font-family: var(--font-serif); font-size: var(--text-3xl);
                   font-weight: 500; line-height: 1.25; margin-bottom: var(--space-5);">
          Hola, soy <span class="text-accent">Francisco Miranda</span>
        </h1>
        <p style="font-family: var(--font-serif); font-size: var(--text-lg);
                  line-height: var(--leading-loose); color: var(--color-text-secondary);
                  max-width: 560px; margin-bottom: var(--space-8);">
          Soy Físico y Analista de Datos. Aquí publico mis proyectos,
          notas de cursos y artículos sobre temas que me interesan.
        </p>
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <a href="/proyectos" class="btn btn-primary">Ver proyectos</a>
          <a href="/sobre-mi"  class="btn btn-ghost">Sobre mí</a>
        </div>
      </section>

      <!-- Proyectos recientes -->
      <section style="margin-bottom: var(--space-16);">
        <div class="section-header">
          <h2 class="section-title">Proyectos recientes</h2>
          <a href="/proyectos" class="section-link">Ver todos →</a>
        </div>
        ${recentProjects.length
          ? `<div class="card-grid">${recentProjects.map(renderProjectCard).join('')}</div>`
          : `<p style="color: var(--color-text-muted); font-size: var(--text-sm);">
               Aún no hay proyectos. Agrega entradas en content/index.json
             </p>`
        }
      </section>

      <!-- Artículos recientes -->
      <section>
        <div class="section-header">
          <h2 class="section-title">Últimos artículos</h2>
          <a href="/articulos" class="section-link">Ver todos →</a>
        </div>
        ${recentArticles.length
          ? `<div style="display: flex; flex-direction: column; gap: var(--space-4);">
               ${recentArticles.map(renderArticleCard).join('')}
             </div>`
          : `<p style="color: var(--color-text-muted); font-size: var(--text-sm);">
               Aún no hay artículos. Agrega entradas en content/index.json
             </p>`
        }
      </section>

    </div>
  `);
}


// ------------------------------------------------------------
// renderProjects()
// Lista todos los proyectos con filtro por tipo
// ------------------------------------------------------------
async function renderProjects() {
  showLoading();
  const projects = await loadProjectList();

  setContent(`
    <div style="max-width: 860px;">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Proyectos</h1>
      </div>

      <!-- Filtros -->
      <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-8); flex-wrap: wrap;">
        <button class="chip active" onclick="filterProjects('all', this)">Todos</button>
        <button class="chip" onclick="filterProjects('programming', this)">Programación</button>
        <button class="chip" onclick="filterProjects('research', this)">Investigación</button>
      </div>

      ${projects.length
        ? `<div class="card-grid" id="projects-grid">
             ${projects.map(renderProjectCard).join('')}
           </div>`
        : `<p style="color: var(--color-text-muted); font-size: var(--text-sm);">
             Aún no hay proyectos. Agrega entradas en content/index.json
           </p>`
      }
    </div>
  `);

  // Registramos la función de filtro en window para que
  // los botones onclick del HTML generado puedan llamarla
  window.filterProjects = (type, btn) => {
    // Actualizar botones activos
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Mostrar/ocultar cards según el tipo
    document.querySelectorAll('#projects-grid .card').forEach(card => {
      const cardType = card.dataset.type;
      card.style.display = (type === 'all' || cardType === type) ? '' : 'none';
    });
  };
}


// ------------------------------------------------------------
// renderBlog()
// Lista todos los artículos con buscador
// ------------------------------------------------------------
async function renderBlog() {
  showLoading();
  const articles = await loadBlogList();

  setContent(`
    <div style="max-width: 720px;">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Artículos</h1>
      </div>

      <!-- Buscador -->
      <div style="margin-bottom: var(--space-8);">
        <input
          id="search-input"
          type="search"
          placeholder="Buscar artículos, proyectos, cursos…"
          style="width: 100%; padding: var(--space-3) var(--space-4);
                 border: 1px solid var(--color-border); border-radius: var(--radius-md);
                 background: var(--color-bg-surface); color: var(--color-text-primary);
                 font-family: var(--font-sans); font-size: var(--text-sm);
                 outline: none; transition: border-color var(--transition-fast);"
        />
        <div id="search-results"></div>
      </div>

      ${articles.length
        ? `<div style="display: flex; flex-direction: column; gap: var(--space-4);">
             ${articles.map(renderArticleCard).join('')}
           </div>`
        : `<p style="color: var(--color-text-muted); font-size: var(--text-sm);">
             Aún no hay artículos. Agrega entradas en content/index.json
           </p>`
      }
    </div>
  `);

  // Activar el buscador ahora que el input existe en el DOM
  // Importamos initSearch de forma dinámica para re-inicializar
  // solo el input (el índice ya fue construido en app.js)
  const searchInput   = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  if (searchInput && searchResults) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          searchResults.innerHTML = '';
          return;
        }
        const results = search(query);
        renderSearchResults(results, searchResults, query);
      }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchResults.innerHTML = '';
      }
    });
  }
}


// ------------------------------------------------------------
// renderCourses()
// Lista todos los cursos con sus notas
// ------------------------------------------------------------
async function renderCourses() {
  showLoading();
  const courses = await loadCourseList();

  setContent(`
    <div style="max-width: 720px;">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Cursos</h1>
      </div>
      ${courses.length
        ? `<div style="display: flex; flex-direction: column; gap: var(--space-6);">
             ${courses.map(renderCourseCard).join('')}
           </div>`
        : `<p style="color: var(--color-text-muted); font-size: var(--text-sm);">
             Aún no hay cursos. Agrega entradas en content/index.json
           </p>`
      }
    </div>
  `);
}


// ------------------------------------------------------------
// renderAbout()
// Carga y renderiza el archivo content/about.md
// ------------------------------------------------------------
async function renderAbout() {
  showLoading();
  const html = await loadEntry('content/about.md');

  setContent(`
    <div class="content-wrapper">
      <article class="content">
        ${html}
      </article>
    </div>
  `);
}


// ------------------------------------------------------------
// renderEntry(section, id)
// Carga una entrada individual (proyecto, artículo o curso)
// buscando su archivo en el índice por id
// ------------------------------------------------------------
async function renderEntry(section, id) {
  showLoading();

  const index = await loadIndex();
  if (!index) { render404(); return; }

  // Mapeamos la sección de la URL a la clave en el índice
  const sectionMap = {
    proyectos: 'projects',
    articulos: 'blog',
    cursos:    'courses',
  };

  const key   = sectionMap[section];
  const items = index[key] ?? [];
  const item  = items.find(i => i.id === id);

  if (!item) { render404(); return; }

  // Los cursos muestran una página especial con lista de notas,
  // no un Markdown directamente
  if (section === 'cursos') {
    renderCourseDetail(item);
    return;
  }

  const html = await loadEntry(item.file);

  setContent(`
    <div class="content-wrapper">
      <nav style="margin-bottom: var(--space-8);">
        <a href="/${section}" class="btn btn-ghost" style="font-size: var(--text-sm);">
          ← Volver
        </a>
      </nav>
      <article class="content">
        <div class="meta" style="margin-bottom: var(--space-6);">
          ${item.date ? `<time>${formatDate(item.date)}</time>` : ''}
          ${item.readingTime ? `<span class="meta-separator"></span><span>${item.readingTime} min de lectura</span>` : ''}
          ${(item.tags ?? []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
        </div>
        ${html}
      </article>
    </div>
  `);
}


// ------------------------------------------------------------
// renderCourseDetail(course)
// Página de un curso individual con su lista de notas
// ------------------------------------------------------------
function renderCourseDetail(course) {
  const notes = course.notes ?? [];

  setContent(`
    <div class="content-wrapper">
      <nav style="margin-bottom: var(--space-8);">
        <a href="/cursos" class="btn btn-ghost" style="font-size: var(--text-sm);">
          ← Volver a cursos
        </a>
      </nav>
      <header style="margin-bottom: var(--space-10);">
        <p style="font-size: var(--text-sm); color: var(--color-text-muted);
                  margin-bottom: var(--space-2);">
          ${escapeHTML(course.institution ?? '')}
        </p>
        <h1 style="font-family: var(--font-serif); font-size: var(--text-2xl);
                   font-weight: 500; margin-bottom: var(--space-4);">
          ${escapeHTML(course.title)}
        </h1>
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
          ${(course.tags ?? []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
        </div>
      </header>

      <section>
        <h2 style="font-family: var(--font-serif); font-size: var(--text-xl);
                   font-weight: 500; margin-bottom: var(--space-6);">Notas</h2>
        ${notes.length
          ? `<div style="display: flex; flex-direction: column; gap: var(--space-3);">
               ${notes.map((note, i) => `
                 <div class="card" style="display: flex; align-items: center;
                                          justify-content: space-between; gap: var(--space-4);">
                   <span style="font-family: var(--font-serif);">
                     ${i + 1}. ${escapeHTML(note.title)}
                   </span>
                   <span class="badge">${note.type}</span>
                 </div>
               `).join('')}
             </div>`
          : `<p style="color: var(--color-text-muted); font-size: var(--text-sm);">
               Este curso aún no tiene notas.
             </p>`
        }
      </section>
    </div>
  `);
}


// ------------------------------------------------------------
// render404()
// ------------------------------------------------------------
function render404() {
  setContent(`
    <div class="content-wrapper" style="text-align: center; padding: var(--space-20) 0;">
      <p style="font-size: var(--text-sm); color: var(--color-text-muted);
                margin-bottom: var(--space-4);">Error 404</p>
      <h1 style="font-family: var(--font-serif); font-size: var(--text-3xl);
                 font-weight: 500; margin-bottom: var(--space-5);">
        Página no encontrada
      </h1>
      <p style="color: var(--color-text-secondary); margin-bottom: var(--space-8);">
        La dirección que buscas no existe o fue movida.
      </p>
      <a href="/" class="btn btn-ghost">← Volver al inicio</a>
    </div>
  `);
}


// ============================================================
// COMPONENTES DE TARJETA (generan HTML como string)
// ============================================================

function renderProjectCard(project) {
  return `
    <article class="card" data-type="${escapeHTML(project.type ?? '')}">
      <a href="/proyectos/${escapeHTML(project.id)}"
         style="text-decoration: none; color: inherit; display: block;">
        <h3 class="card-title">${escapeHTML(project.title)}</h3>
        <p class="card-description">${escapeHTML(project.description ?? '')}</p>
        <div class="card-footer">
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            ${(project.tags ?? []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
          </div>
          <span class="badge">${escapeHTML(project.type ?? '')}</span>
        </div>
      </a>
    </article>
  `;
}

function renderArticleCard(article) {
  return `
    <article class="card">
      <a href="/articulos/${escapeHTML(article.id)}"
         style="text-decoration: none; color: inherit; display: flex;
                flex-direction: column; gap: var(--space-2);">
        <div class="meta" style="margin-bottom: 0;">
          ${article.date ? `<time>${formatDate(article.date)}</time>` : ''}
          ${article.readingTime
            ? `<span class="meta-separator"></span>
               <span>${article.readingTime} min de lectura</span>`
            : ''}
        </div>
        <h3 class="card-title" style="margin-bottom: 0;">
          ${escapeHTML(article.title)}
        </h3>
        <p class="card-description" style="margin-bottom: 0;">
          ${escapeHTML(article.description ?? '')}
        </p>
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
          ${(article.tags ?? []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
        </div>
      </a>
    </article>
  `;
}

function renderCourseCard(course) {
  const noteCount = course.notes?.length ?? 0;
  return `
    <article class="card">
      <a href="/cursos/${escapeHTML(course.id)}"
         style="text-decoration: none; color: inherit; display: block;">
        <p style="font-size: var(--text-sm); color: var(--color-text-muted);
                  margin-bottom: var(--space-1);">
          ${escapeHTML(course.institution ?? '')}
        </p>
        <h3 class="card-title">${escapeHTML(course.title)}</h3>
        <div class="card-footer" style="margin-top: var(--space-4);">
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            ${(course.tags ?? []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
          </div>
          <span class="badge">
            ${noteCount} nota${noteCount !== 1 ? 's' : ''}
          </span>
        </div>
      </a>
    </article>
  `;
}


// ============================================================
// UTILIDADES
// ============================================================

function renderSearchResults(results, container, query) {
  if (results.length === 0) {
    container.innerHTML = `
      <p style="color: var(--color-text-muted); font-size: var(--text-sm);
                padding: var(--space-4) 0;">
        Sin resultados para "<strong>${escapeHTML(query)}</strong>"
      </p>`;
    return;
  }

  const sectionRoutes = { proyecto: 'proyectos', 'artículo': 'articulos', curso: 'cursos' };

  container.innerHTML = `
    <p style="font-size: var(--text-xs); color: var(--color-text-muted);
              margin: var(--space-3) 0;">
      ${results.length} resultado${results.length !== 1 ? 's' : ''}
    </p>
    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
      ${results.map(r => `
        <a href="/${sectionRoutes[r.type]}/${r.id}" class="card"
           style="display: block; text-decoration: none; color: inherit;">
          <div style="display: flex; align-items: center; gap: var(--space-2);
                      margin-bottom: var(--space-2);">
            <span class="badge">${r.type}</span>
            ${r.date ? `<span style="font-size: var(--text-xs); color: var(--color-text-muted);">
              ${formatDate(r.date)}</span>` : ''}
          </div>
          <p class="card-title" style="margin-bottom: var(--space-1);">
            ${escapeHTML(r.title)}
          </p>
          ${r.description
            ? `<p class="card-description" style="margin-bottom: 0;">
                 ${escapeHTML(r.description)}
               </p>`
            : ''}
        </a>
      `).join('')}
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
