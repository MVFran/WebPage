// ============================================================
// src/router.js
// Router del lado del cliente — navegación sin recargas
// ============================================================
//
// CONCEPTO: History API
// ----------------------
// El objeto `history` del navegador expone métodos para
// manipular el historial de navegación:
//
//   history.pushState(state, title, url)
//     → Agrega una nueva entrada al historial y cambia la URL
//       en la barra de direcciones SIN recargar la página.
//
//   history.replaceState(state, title, url)
//     → Lo mismo, pero reemplaza la entrada actual en lugar
//       de agregar una nueva (no agrega al historial de "atrás").
//
//   window.location.pathname
//     → Lee la ruta actual, ej: "/proyectos" o "/articulos/mi-nota"
//
// El evento 'popstate' se dispara cuando el usuario hace clic
// en los botones Atrás / Adelante del navegador.
// ============================================================


// ------------------------------------------------------------
// MAPA DE RUTAS
// Asocia cada ruta (URL) con una función que genera el HTML
// de esa página. Agregar una nueva sección = agregar una línea aquí.
//
// CONCEPTO: Objeto como mapa (hash map)
// ---------------------------------------
// Usamos un objeto plano de JS como diccionario:
//   clave   → la ruta en la URL  ("/proyectos")
//   valor   → la función que renderiza esa página
//
// Esto es más limpio que una cadena de if/else o switch,
// y permite agregar rutas dinámicamente si fuera necesario.
// ------------------------------------------------------------
const routes = {
  '/':           renderHome,
  '/proyectos':  renderProjects,
  '/articulos':  renderBlog,
  '/cursos':     renderCourses,
  '/sobre-mi':   renderAbout,
};

// Ruta que se muestra cuando ninguna otra coincide (404)
const ROUTE_NOT_FOUND = render404;

// El elemento del DOM donde se inyecta el contenido de cada página
const APP_CONTAINER_ID = 'app';


// ------------------------------------------------------------
// initRouter()
// Función principal — exportada para que app.js la llame.
// Hace tres cosas:
//   1. Intercepta todos los clics en links internos
//   2. Escucha el botón Atrás/Adelante del navegador
//   3. Renderiza la página correspondiente a la URL actual
// ------------------------------------------------------------
export function initRouter() {
  // 1. Interceptar clics — usamos delegación de eventos
  setupLinkInterception();

  // 2. Escuchar navegación del historial (botones atrás/adelante)
  window.addEventListener('popstate', () => {
    renderRoute(window.location.pathname);
  });

  // 3. Renderizar la ruta inicial al cargar el sitio
  renderRoute(window.location.pathname);
}


// ------------------------------------------------------------
// setupLinkInterception()
// Intercepta los clics en links antes de que el navegador
// los procese, para manejarlos nosotros con el router.
//
// CONCEPTO: Delegación de eventos
// ---------------------------------
// En lugar de agregar un listener a cada link del sitio
// (que podrían ser decenas y cambiar dinámicamente),
// ponemos UN solo listener en el documento completo.
//
// Cuando el usuario hace clic en cualquier parte, el evento
// "burbujea" (bubble) hacia arriba desde el elemento clickeado
// hasta el documento. Nosotros lo interceptamos ahí,
// verificamos si el clic fue en un link (<a>), y actuamos.
//
// Ventaja: funciona incluso para links que se agregan al DOM
// después de que la página cargó (contenido dinámico).
// ------------------------------------------------------------
function setupLinkInterception() {
  document.addEventListener('click', (event) => {
    //
    // CONCEPTO: event.target vs event.currentTarget
    // -----------------------------------------------
    // event.target    → el elemento exacto donde ocurrió el clic
    // event.currentTarget → el elemento donde está el listener (document)
    //
    // closest('a') busca hacia arriba en el árbol del DOM:
    // primero revisa el elemento clickeado, luego su padre,
    // luego el abuelo, etc., hasta encontrar un <a> o llegar
    // a la raíz. Devuelve null si no encuentra ninguno.
    // Esto cubre el caso de hacer clic en un ícono dentro de un link.
    //
    const link = event.target.closest('a');

    // Si no hay link, o si el link es externo, dejamos que el
    // navegador lo maneje normalmente
    if (!link) return;
    if (!isInternalLink(link)) return;

    // Prevenimos la navegación normal del navegador
    event.preventDefault();

    const path = link.pathname;

    // Si el usuario hizo clic en el link de la página actual,
    // no hacemos nada (evita re-renderizados innecesarios)
    if (path === window.location.pathname) return;

    // Navegamos a la nueva ruta
    navigateTo(path);
  });
}


// ------------------------------------------------------------
// isInternalLink(link)
// Determina si un link apunta a nuestro propio sitio.
// Los links externos (https://github.com/...) se abren normal.
//
// Devuelve: boolean
// ------------------------------------------------------------
function isInternalLink(link) {
  // Un link es interno si su hostname es el mismo que el del sitio
  return (
    link.hostname === window.location.hostname &&
    !link.hasAttribute('target') // Los links con target="_blank" se abren en nueva pestaña
  );
}


// ------------------------------------------------------------
// navigateTo(path)
// Cambia la URL y renderiza la nueva página.
// También exportada para poder navegar desde JS sin un link
// (por ejemplo, al enviar un formulario de búsqueda).
// ------------------------------------------------------------
export function navigateTo(path) {
  //
  // CONCEPTO: history.pushState()
  // ------------------------------
  // Parámetros:
  //   1. state: objeto con datos que queremos guardar en el historial.
  //             Podríamos guardar datos de scroll, filtros activos, etc.
  //             Por ahora lo dejamos vacío {}.
  //   2. title: ignorado por la mayoría de los navegadores hoy en día.
  //             Pasamos string vacío ''.
  //   3. url:   la nueva URL que aparecerá en la barra de direcciones.
  //
  history.pushState({}, '', path);

  // Renderizamos el contenido de la nueva ruta
  renderRoute(path);
}


// ------------------------------------------------------------
// renderRoute(path)
// Busca la función correspondiente a la ruta y la ejecuta.
// Es el despachador central del router.
// ------------------------------------------------------------
function renderRoute(path) {
  // Normaliza la ruta: elimina la barra final si existe
  // para que '/proyectos' y '/proyectos/' sean equivalentes
  const normalizedPath = path.replace(/\/$/, '') || '/';

  // Busca la función de renderizado en el mapa de rutas
  const renderFn = routes[normalizedPath] ?? ROUTE_NOT_FOUND;

  // Actualiza el estado visual de los links de navegación
  updateActiveNavLink(normalizedPath);

  // Ejecuta la función que genera el contenido
  renderFn();

  // Regresa al tope de la página al navegar
  window.scrollTo({ top: 0, behavior: 'instant' });
}


// ------------------------------------------------------------
// updateActiveNavLink(currentPath)
// Marca como activo el link de navegación correspondiente
// a la ruta actual, y quita la marca de los demás.
// ------------------------------------------------------------
function updateActiveNavLink(currentPath) {
  const navLinks = document.querySelectorAll('.nav-links a');

  navLinks.forEach((link) => {
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
// Utilidad interna: inyecta HTML en el contenedor principal.
//
// CONCEPTO: innerHTML vs createElement
// --------------------------------------
// innerHTML es la forma más directa de inyectar HTML generado
// como string. Es apropiado aquí porque el contenido lo
// controlamos nosotros (no viene de input del usuario),
// así que no hay riesgo de XSS (Cross-Site Scripting).
//
// Cuando el contenido venga de archivos Markdown que nosotros
// escribimos, seguirá siendo seguro. Si en algún momento
// mostraras contenido ingresado por usuarios, habría que
// sanitizarlo antes de usar innerHTML.
// ------------------------------------------------------------
function setContent(html) {
  const container = document.getElementById(APP_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = html;
}


// ============================================================
// FUNCIONES DE RENDERIZADO POR PÁGINA
// Cada una genera el HTML de su sección.
// Por ahora son placeholders — cuando construyamos
// content-loader.js, estas funciones cargarán el contenido
// real desde los archivos Markdown y el index.json.
// ============================================================

// ------------------------------------------------------------
// renderHome()
// Página de inicio — se llenará con proyectos y artículos
// recientes cargados desde content/index.json
// ------------------------------------------------------------
function renderHome() {
  setContent(`
    <div class="content-wrapper">
      <section style="margin-bottom: var(--space-16);">
        <div class="meta" style="margin-bottom: var(--space-4);">
          <span class="badge">Bienvenido</span>
        </div>
        <h1 style="font-family: var(--font-serif); font-size: var(--text-3xl); font-weight: 500; line-height: 1.25; margin-bottom: var(--space-5);">
          Hola, soy <span class="text-accent">Tu Nombre</span>
        </h1>
        <p style="font-family: var(--font-serif); font-size: var(--text-lg); line-height: var(--leading-loose); color: var(--color-text-secondary); max-width: 560px; margin-bottom: var(--space-8);">
          Investigo X y desarrollo software Y. Aquí publico mis proyectos,
          notas de cursos y artículos sobre temas que me interesan.
        </p>
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <a href="/proyectos" class="btn btn-primary">Ver proyectos</a>
          <a href="/sobre-mi" class="btn btn-ghost">Sobre mí</a>
        </div>
      </section>

      <section style="margin-bottom: var(--space-16);">
        <div class="section-header">
          <h2 class="section-title">Proyectos recientes</h2>
          <a href="/proyectos" class="section-link">Ver todos →</a>
        </div>
        <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
          Los proyectos se cargarán aquí desde content/index.json
          cuando implementemos content-loader.js
        </p>
      </section>

      <section>
        <div class="section-header">
          <h2 class="section-title">Últimos artículos</h2>
          <a href="/articulos" class="section-link">Ver todos →</a>
        </div>
        <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
          Los artículos se cargarán aquí desde content/index.json
          cuando implementemos content-loader.js
        </p>
      </section>
    </div>
  `);
}


// ------------------------------------------------------------
// renderProjects()
// ------------------------------------------------------------
function renderProjects() {
  setContent(`
    <div class="content-wrapper" style="max-width: 860px;">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Proyectos</h1>
      </div>
      <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
        Los proyectos se cargarán desde content/projects/
        cuando implementemos content-loader.js
      </p>
    </div>
  `);
}


// ------------------------------------------------------------
// renderBlog()
// ------------------------------------------------------------
function renderBlog() {
  setContent(`
    <div class="content-wrapper" style="max-width: 860px;">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Artículos</h1>
      </div>
      <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
        Los artículos se cargarán desde content/blog/
        cuando implementemos content-loader.js
      </p>
    </div>
  `);
}


// ------------------------------------------------------------
// renderCourses()
// ------------------------------------------------------------
function renderCourses() {
  setContent(`
    <div class="content-wrapper" style="max-width: 860px;">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Cursos</h1>
      </div>
      <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
        Los cursos y notas se cargarán desde content/courses/
        cuando implementemos content-loader.js
      </p>
    </div>
  `);
}


// ------------------------------------------------------------
// renderAbout()
// ------------------------------------------------------------
function renderAbout() {
  setContent(`
    <div class="content-wrapper">
      <div class="section-header">
        <h1 class="section-title" style="font-size: var(--text-2xl);">Sobre mí</h1>
      </div>
      <p style="color: var(--color-text-muted); font-size: var(--text-sm);">
        El contenido se cargará desde content/about.md
        cuando implementemos content-loader.js
      </p>
    </div>
  `);
}


// ------------------------------------------------------------
// render404()
// Se muestra cuando la URL no coincide con ninguna ruta.
// ------------------------------------------------------------
function render404() {
  setContent(`
    <div class="content-wrapper" style="text-align: center; padding: var(--space-20) 0;">
      <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-4);">
        Error 404
      </p>
      <h1 style="font-family: var(--font-serif); font-size: var(--text-3xl); font-weight: 500; margin-bottom: var(--space-5);">
        Página no encontrada
      </h1>
      <p style="color: var(--color-text-secondary); margin-bottom: var(--space-8);">
        La dirección que buscas no existe o fue movida.
      </p>
      <a href="/" class="btn btn-ghost">← Volver al inicio</a>
    </div>
  `);
}
