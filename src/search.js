// ============================================================
// src/search.js
// Búsqueda en el sitio — índice en memoria, sin backend
// ============================================================
//
// CONCEPTO: ¿Por qué no necesitamos backend para buscar?
// -------------------------------------------------------
// Los buscadores tradicionales envían la consulta a un servidor,
// que consulta una base de datos y devuelve resultados.
// Para ~30 entradas eso es innecesario.
//
// Nuestra estrategia: al iniciar el sitio, cargamos el
// index.json una sola vez y construimos un índice de búsqueda
// en memoria — un objeto optimizado para encontrar texto
// rápidamente. Las búsquedas posteriores son instantáneas
// porque nunca salen del navegador.
//
// CONCEPTO: Normalización de texto
// ----------------------------------
// Para que "Física", "fisica" y "FISICA" devuelvan los mismos
// resultados, normalizamos todo el texto antes de comparar:
// convertimos a minúsculas y eliminamos tildes.
// Esto se llama normalización Unicode.
// ============================================================

import { loadIndex } from './content-loader.js';


// ------------------------------------------------------------
// ESTADO INTERNO DEL MÓDULO
// Variables privadas que persisten entre llamadas a funciones.
// Al ser variables de módulo (no globales), solo este archivo
// puede leerlas o modificarlas.
// ------------------------------------------------------------

// El índice de búsqueda — se construye una sola vez
let searchIndex = [];

// Flag para saber si el índice ya fue construido
let isIndexBuilt = false;


// ============================================================
// FUNCIONES PÚBLICAS
// ============================================================

// ------------------------------------------------------------
// initSearch()
// Inicializa el módulo: construye el índice y activa
// el campo de búsqueda si existe en el HTML.
// Exportada para que app.js la llame al arrancar.
// ------------------------------------------------------------
export async function initSearch() {
  await buildIndex();
  setupSearchInput();
}


// ------------------------------------------------------------
// search(query)
// Busca en el índice y devuelve los resultados ordenados
// por relevancia.
//
// Parámetro: query — string con el texto a buscar
// Devuelve:  Array de resultados, cada uno con su puntuación
// ------------------------------------------------------------
export function search(query) {
  // Si la búsqueda está vacía, no devolvemos nada
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = normalize(query);

  // Dividimos la consulta en palabras individuales para buscar
  // cada una por separado y combinar los resultados.
  // Ejemplo: "física cuántica" → ["física", "cuántica"]
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  const results = searchIndex
    .map(entry => {
      // Calculamos una puntuación para cada entrada del índice
      const score = scoreEntry(entry, terms);
      return { ...entry, score };

      // CONCEPTO: spread operator en objetos ({ ...entry })
      // -----------------------------------------------------
      // Crea una copia del objeto entry y le agrega la
      // propiedad score. No modifica el objeto original.
      // Es equivalente a Object.assign({}, entry, { score })
      // pero más legible.
    })
    .filter(entry => entry.score > 0)   // Solo entradas con coincidencia
    .sort((a, b) => b.score - a.score); // De mayor a menor puntuación

  return results;
}


// ============================================================
// FUNCIONES PRIVADAS
// ============================================================

// ------------------------------------------------------------
// buildIndex()
// Lee el index.json y construye el índice de búsqueda.
// Solo se ejecuta una vez — las llamadas posteriores
// devuelven inmediatamente gracias al flag isIndexBuilt.
// ------------------------------------------------------------
async function buildIndex() {
  // Evitamos construir el índice dos veces
  if (isIndexBuilt) return;

  const index = await loadIndex();

  // Si el índice no cargó (error de red), salimos
  if (!index) {
    console.warn('[search] No se pudo cargar el índice de contenido.');
    return;
  }

  // Procesamos cada sección del catálogo
  // CONCEPTO: Array.forEach()
  // --------------------------
  // forEach itera sobre cada elemento de un array y ejecuta
  // una función. No devuelve nada (a diferencia de map o filter).
  // Lo usamos aquí porque solo queremos el efecto secundario
  // de poblar searchIndex, no transformar el array.

  const projects = index.projects ?? [];
  const blog     = index.blog     ?? [];
  const courses  = index.courses  ?? [];

  projects.forEach(item => {
    searchIndex.push(buildEntry(item, 'proyecto'));
  });

  blog.forEach(item => {
    searchIndex.push(buildEntry(item, 'artículo'));
  });

  courses.forEach(item => {
    searchIndex.push(buildEntry(item, 'curso'));
  });

  isIndexBuilt = true;
  console.log(`[search] Índice construido con ${searchIndex.length} entradas.`);
}


// ------------------------------------------------------------
// buildEntry(item, type)
// Transforma una entrada del index.json en un objeto
// optimizado para búsqueda.
//
// Pre-normalizamos el texto aquí, una sola vez,
// para no repetir el trabajo en cada búsqueda.
// ------------------------------------------------------------
function buildEntry(item, type) {
  // Concatenamos todos los campos de texto en un solo string
  // para buscar en todos ellos a la vez
  const searchableText = [
    item.title       ?? '',
    item.description ?? '',
    item.institution ?? '',
    (item.tags ?? []).join(' '),
  ].join(' ');

  return {
    // Datos originales — para mostrar en los resultados
    id:          item.id,
    title:       item.title,
    description: item.description,
    date:        item.date,
    tags:        item.tags ?? [],
    file:        item.file,
    type,

    // Texto pre-normalizado — para comparar durante la búsqueda
    // Guardarlo aquí evita recalcularlo en cada consulta
    _normalized: normalize(searchableText),
  };
}


// ------------------------------------------------------------
// scoreEntry(entry, terms)
// Calcula qué tan relevante es una entrada para los términos
// buscados. Devuelve un número — mayor puntuación = más relevante.
//
// Sistema de puntuación:
//   +3 puntos — el término aparece en el título
//   +2 puntos — el término aparece en un tag
//   +1 punto  — el término aparece en la descripción u otro campo
//
// CONCEPTO: Por qué puntuar en lugar de solo filtrar
// ---------------------------------------------------
// Con solo filtrar (¿coincide o no?) todos los resultados
// serían igual de relevantes. La puntuación nos permite
// ordenarlos: un artículo cuyo título contiene la palabra
// buscada es más relevante que uno donde solo aparece
// en la descripción.
// ------------------------------------------------------------
function scoreEntry(entry, terms) {
  let totalScore = 0;

  const normalizedTitle = normalize(entry.title ?? '');
  const normalizedTags  = normalize((entry.tags ?? []).join(' '));

  terms.forEach(term => {
    // Coincidencia en título — peso mayor
    if (normalizedTitle.includes(term)) {
      totalScore += 3;
    }

    // Coincidencia en tags — peso medio
    if (normalizedTags.includes(term)) {
      totalScore += 2;
    }

    // Coincidencia en cualquier otro campo — peso base
    if (entry._normalized.includes(term)) {
      totalScore += 1;
    }
  });

  return totalScore;
}


// ------------------------------------------------------------
// setupSearchInput()
// Conecta el campo de búsqueda del HTML con la lógica.
// Si el campo no existe en la página actual, no hace nada.
// ------------------------------------------------------------
function setupSearchInput() {
  const input     = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');

  if (!input || !resultsEl) return;

  // CONCEPTO: Debounce
  // -------------------
  // Si buscamos en cada tecla presionada, con una frase de
  // 20 caracteres haríamos 20 búsquedas. La mayoría serían
  // inútiles (el usuario aún no terminó de escribir).
  //
  // Debounce retrasa la ejecución hasta que el usuario
  // deja de escribir por un tiempo determinado (300ms aquí).
  // Solo se ejecuta una búsqueda por "pausa" de escritura.
  let debounceTimer;

  input.addEventListener('input', () => {
    // Cancelamos el timer anterior si el usuario sigue escribiendo
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const query = input.value.trim();

      if (query.length < 2) {
        resultsEl.innerHTML = '';
        return;
      }

      const results = search(query);
      renderResults(results, resultsEl, query);

    }, 300); // Espera 300ms de inactividad antes de buscar
  });

  // Limpiar resultados si el usuario borra todo
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      resultsEl.innerHTML = '';
    }
  });
}


// ------------------------------------------------------------
// renderResults(results, container, query)
// Genera el HTML de los resultados y lo inyecta en el DOM.
// ------------------------------------------------------------
function renderResults(results, container, query) {
  if (results.length === 0) {
    container.innerHTML = `
      <p style="color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-4) 0;">
        Sin resultados para "<strong>${escapeHTML(query)}</strong>"
      </p>
    `;
    return;
  }

  const html = results.map(result => `
    <a href="${getEntryRoute(result)}" class="search-result-item">
      <div class="search-result-header">
        <span class="badge">${result.type}</span>
        <time style="font-size: var(--text-xs); color: var(--color-text-muted);">
          ${formatDate(result.date)}
        </time>
      </div>
      <p class="search-result-title">${escapeHTML(result.title)}</p>
      ${result.description
        ? `<p class="search-result-desc">${escapeHTML(result.description)}</p>`
        : ''
      }
      ${result.tags.length
        ? `<div class="search-result-tags">
            ${result.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
           </div>`
        : ''
      }
    </a>
  `).join('');

  container.innerHTML = `
    <p style="font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-3);">
      ${results.length} resultado${results.length !== 1 ? 's' : ''}
    </p>
    <div class="search-results-list">${html}</div>
  `;
}


// ------------------------------------------------------------
// getEntryRoute(entry)
// Devuelve la ruta de navegación para una entrada.
// ------------------------------------------------------------
function getEntryRoute(entry) {
  const routes = {
    'proyecto': `/proyectos/${entry.id}`,
    'artículo': `/articulos/${entry.id}`,
    'curso':    `/cursos/${entry.id}`,
  };
  return routes[entry.type] ?? '/';
}


// ------------------------------------------------------------
// normalize(text)
// Convierte texto a minúsculas y elimina tildes.
//
// CONCEPTO: normalize() y expresiones regulares
// -----------------------------------------------
// normalize('NFD') descompone los caracteres acentuados en
// su carácter base + un modificador separado.
// Ejemplo: 'é' → 'e' + '´' (dos caracteres Unicode)
//
// La expresión regular /[\u0300-\u036f]/g filtra y elimina
// todos esos modificadores (tildes, diéresis, cedillas).
// Lo que queda es solo el carácter base sin acento.
//
// Resultado: 'Física' → 'Fisica' → 'fisica'
// ------------------------------------------------------------
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


// ------------------------------------------------------------
// escapeHTML(str)
// Escapa caracteres especiales de HTML para evitar XSS.
//
// CONCEPTO: XSS (Cross-Site Scripting)
// --------------------------------------
// Si inyectáramos el texto del usuario directamente en innerHTML
// sin escapar, alguien podría escribir <script>código malicioso</script>
// en el buscador y ejecutarlo en el navegador de quien visite el sitio.
//
// Escapar convierte los caracteres peligrosos en sus
// equivalentes HTML seguros:
//   <  →  &lt;
//   >  →  &gt;
//   &  →  &amp;
// ------------------------------------------------------------
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}


// ------------------------------------------------------------
// formatDate(dateStr)
// Convierte "2025-05-12" en "12 may 2025"
// ------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';

  // CONCEPTO: Intl.DateTimeFormat
  // ------------------------------
  // La API Intl del navegador formatea fechas, números y monedas
  // según el idioma y región. Es nativa — sin librerías externas.
  // 'es-MX' formatea en español de México.
  return new Intl.DateTimeFormat('es-MX', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
  // Agregamos T00:00:00 para evitar problemas de zona horaria:
  // sin eso, "2025-05-12" podría mostrarse como "11 may 2025"
  // en zonas horarias con UTC negativo (como México).
}
