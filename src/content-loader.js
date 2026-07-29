// ============================================================
// src/content-loader.js
// Carga y renderiza contenido desde archivos Markdown y JSON
// ============================================================
//
// CONCEPTO: Asincronía y por qué existe
// ---------------------------------------
// Cuando JavaScript pide un archivo a un servidor (fetch),
// no sabe cuánto va a tardar en llegar la respuesta: puede ser
// 50ms o 3 segundos dependiendo de la red.
//
// Si JS esperara la respuesta sin hacer nada más, el navegador
// se congelaría — no podría responder a clics, animaciones ni
// ningún otro evento. Esto se llama "bloqueo del hilo principal".
//
// La solución es la asincronía: JS lanza la petición, continúa
// ejecutando otro código, y cuando llega la respuesta retoma
// el trabajo donde lo dejó.
//
// CONCEPTO: async / await
// ------------------------
// async/await es la forma moderna de escribir código asíncrono
// en JS. Una función marcada con `async` siempre devuelve una
// Promesa. Dentro de ella, `await` pausa la ejecución de ESA
// función (no del navegador completo) hasta que la Promesa
// se resuelva, y luego continúa con el resultado.
// ============================================================


// ------------------------------------------------------------
// CONFIGURACIÓN
// ------------------------------------------------------------
const CONTENT_BASE = 'content';
const INDEX_FILE   = `${CONTENT_BASE}/index.json`;

// Cache en memoria — evita pedir el mismo archivo dos veces
// CONCEPTO: Map
// --------------
// Map es una estructura clave-valor con métodos claros:
// .get(), .set(), .has(), .delete()
// La clave es la ruta del archivo, el valor es su contenido.
const cache = new Map();


// ============================================================
// FUNCIONES PÚBLICAS (exportadas)
// ============================================================

// ------------------------------------------------------------
// loadIndex()
// Carga y devuelve el catálogo completo del sitio (index.json).
// Devuelve: Promise<Object>
// ------------------------------------------------------------
export async function loadIndex() {
  return fetchJSON(INDEX_FILE);
}


// ------------------------------------------------------------
// loadMarkdown(filePath)
// Carga un archivo Markdown y lo convierte a HTML.
//
// Parámetro: filePath — ruta relativa desde la raíz del sitio
//   Ejemplo: 'content/about.md'
//            'content/blog/mi-articulo.md'
//
// Devuelve: Promise<string> — HTML listo para inyectar en el DOM
// ------------------------------------------------------------
export async function loadMarkdown(filePath) {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  const text = await fetchText(filePath);

  // marked.parse() convierte el texto Markdown a HTML.
  // `marked` es la librería cargada desde CDN en index.html.
  // Al cargarse con <script src="...">, queda disponible
  // como variable global — por eso podemos usarla aquí
  // sin importar nada.
  const html = marked.parse(text);

  cache.set(filePath, html);
  return html;
}


// ------------------------------------------------------------
// loadProjectList()
// Devuelve todos los proyectos del índice, ordenados por fecha.
// Devuelve: Promise<Array>
// ------------------------------------------------------------
export async function loadProjectList() {
  const index = await loadIndex();

  // CONCEPTO: optional chaining (?.)
  // ----------------------------------
  // index?.projects evita error si index es null.
  // Es equivalente a: index && index.projects ? index.projects : []
  return sortByDate(index?.projects ?? []);
}


// ------------------------------------------------------------
// loadBlogList()
// Devuelve todos los artículos del índice, ordenados por fecha.
// Devuelve: Promise<Array>
// ------------------------------------------------------------
export async function loadBlogList() {
  const index = await loadIndex();
  return sortByDate(index?.blog ?? []);
}


// ------------------------------------------------------------
// loadCourseList()
// Devuelve todos los cursos del índice.
// Devuelve: Promise<Array>
// ------------------------------------------------------------
export async function loadCourseList() {
  const index = await loadIndex();
  return index?.courses ?? [];
}


// ------------------------------------------------------------
// loadEntry(filePath)
// Carga una entrada individual y devuelve su HTML renderizado.
// Alias semántico de loadMarkdown para mayor claridad.
// Devuelve: Promise<string>
// ------------------------------------------------------------
export async function loadEntry(filePath) {
  return loadMarkdown(filePath);
}


// ============================================================
// FUNCIONES PRIVADAS (no exportadas)
// Solo disponibles dentro de este módulo.
// ============================================================

// ------------------------------------------------------------
// fetchText(url)
// Petición HTTP que devuelve el contenido como texto plano.
//
// CONCEPTO: try / catch
// ----------------------
// Cuando algo puede fallar (red caída, archivo no encontrado),
// envolvemos el código en try/catch. Si cualquier línea dentro
// del try lanza un error, la ejecución salta al catch.
// Esto evita que un error rompa toda la aplicación.
//
// CONCEPTO: fetch() y response.ok
// ---------------------------------
// fetch() NO lanza error para respuestas 404 o 500 —
// solo falla si hay un problema de red total.
// response.ok es true para códigos HTTP 200-299.
// Por eso lo revisamos manualmente con un throw.
//
// Devuelve: Promise<string>
// ------------------------------------------------------------
async function fetchText(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`No se pudo cargar: ${url} (${response.status})`);
    }

    // .text() lee el cuerpo de la respuesta como string.
    // También es asíncrono, por eso el await.
    return await response.text();

  } catch (error) {
    console.error('[content-loader] Error al cargar archivo:', error);
    return `# Error al cargar el contenido\n\nNo se pudo cargar \`${url}\`. Verifica que el archivo existe.`;
  }
}


// ------------------------------------------------------------
// fetchJSON(url)
// Petición HTTP que devuelve el contenido parseado como objeto JS.
// Devuelve: Promise<Object|null>
// ------------------------------------------------------------
async function fetchJSON(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`No se pudo cargar: ${url} (${response.status})`);
    }

    // .json() parsea el texto de la respuesta como objeto JS.
    // CONCEPTO: JSON (JavaScript Object Notation)
    // --------------------------------------------
    // JSON es un formato de texto para representar datos
    // estructurados. .json() convierte ese texto en un
    // objeto JS real con el que podemos trabajar directamente.
    const data = await response.json();

    cache.set(url, data);
    return data;

  } catch (error) {
    console.error('[content-loader] Error al cargar JSON:', error);
    return null;
  }
}


// ------------------------------------------------------------
// sortByDate(items)
// Ordena un array de entradas de más reciente a más antiguo.
// Espera que cada item tenga una propiedad `date`: "2025-05-12"
//
// CONCEPTO: Array.sort() con función comparadora
// -----------------------------------------------
// sort() sin argumentos ordena como strings, lo que rompe
// el orden de fechas. Con una función comparadora le decimos
// exactamente cómo comparar dos elementos (a y b):
//   retorno negativo → a va antes que b
//   retorno positivo → b va antes que a
//
// CONCEPTO: spread operator (...)
// --------------------------------
// [...items] crea una copia del array para no mutar el original.
// Mutar datos que vienen del índice podría causar efectos
// inesperados si otras partes del código también los usan.
//
// Devuelve: Array (copia ordenada)
// ------------------------------------------------------------
function sortByDate(items) {
  return [...items].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
}


// ------------------------------------------------------------
// clearCache()
// Limpia el cache en memoria. Útil en desarrollo para forzar
// recargas sin reiniciar el servidor.
// ------------------------------------------------------------
export function clearCache() {
  cache.clear();
  console.log('[content-loader] Cache limpiado.');
}
