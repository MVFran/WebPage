// ============================================================
// src/theme.js
// Módulo de manejo de tema: claro / oscuro
// ============================================================
//
// CONCEPTO: Módulos ES (import / export)
// ----------------------------------------
// En JavaScript moderno, cada archivo es un módulo independiente.
// Los módulos no comparten variables entre sí a menos que
// explícitamente las exporten con `export` y las importen
// con `import` desde otro archivo.
//
// Esto evita que el sitio se convierta en un caos de variables
// globales que se pisan unas a otras — un problema muy común
// cuando todo el JS vive en un solo archivo enorme.
//
// Para que el navegador trate un archivo como módulo ES,
// el <script> en el HTML debe tener type="module":
//   <script type="module" src="src/app.js"></script>
// ============================================================


// ------------------------------------------------------------
// CONSTANTES
// Centralizar estos strings evita errores de tipeo.
// Si el nombre de la clave en localStorage cambia,
// solo lo cambias aquí y se actualiza en todo el módulo.
// ------------------------------------------------------------
const STORAGE_KEY  = 'theme';
const THEME_DARK   = 'dark';
const THEME_LIGHT  = 'light';


// ------------------------------------------------------------
// FUNCIÓN PRINCIPAL: initTheme()
//
// Esta es la función que app.js llamará al arrancar el sitio.
// Se encarga de todo: leer, detectar, aplicar y escuchar.
//
// CONCEPTO: export
// -----------------
// Al escribir `export function`, le decimos a JS que esta
// función está disponible para que otros módulos la importen.
// Sin el `export`, la función existe pero nadie más puede usarla.
// ------------------------------------------------------------
export function initTheme() {
  // Paso 1: determinar qué tema aplicar al cargar la página
  const theme = getSavedTheme() ?? getSystemTheme();
  //
  // CONCEPTO: El operador ?? (nullish coalescing)
  // ---------------------------------------------
  // ?? devuelve el lado derecho solo si el lado izquierdo
  // es null o undefined. Es más preciso que || porque ||
  // también descarta valores como 0 o "" (cadena vacía).
  //
  // Aquí: si getSavedTheme() devuelve null (no hay nada guardado),
  // usamos getSystemTheme() como valor por defecto.

  // Paso 2: aplicar el tema detectado
  applyTheme(theme);

  // Paso 3: conectar el botón del HTML con la lógica de toggle
  setupToggleButton();
}


// ------------------------------------------------------------
// getSavedTheme()
// Lee la preferencia guardada por el usuario en sesiones anteriores.
//
// CONCEPTO: localStorage
// -----------------------
// localStorage es una mini base de datos que el navegador guarda
// en el dispositivo del usuario. Persiste entre sesiones —
// si cierras el navegador y vuelves, los datos siguen ahí.
// Solo almacena strings (texto). Para guardar objetos hay que
// usar JSON.stringify() / JSON.parse(), pero aquí solo
// guardamos un string simple: "dark" o "light".
//
// Devuelve: "dark" | "light" | null
// ------------------------------------------------------------
function getSavedTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);

  // Validamos que el valor guardado sea uno de los dos temas
  // esperados. Esto protege contra valores corruptos o inyectados.
  if (saved === THEME_DARK || saved === THEME_LIGHT) {
    return saved;
  }

  return null;
}


// ------------------------------------------------------------
// getSystemTheme()
// Detecta si el sistema operativo del usuario está en modo oscuro.
//
// CONCEPTO: window.matchMedia()
// ------------------------------
// matchMedia() permite consultar al navegador si se cumple
// una media query de CSS — igual que las que escribes en CSS
// con @media, pero desde JavaScript.
//
// La media query 'prefers-color-scheme: dark' devuelve true
// si el usuario tiene configurado el modo oscuro en su sistema.
//
// Devuelve: "dark" | "light"
// ------------------------------------------------------------
function getSystemTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? THEME_DARK : THEME_LIGHT;
}


// ------------------------------------------------------------
// applyTheme(theme)
// Aplica el tema al documento y actualiza el botón de toggle.
//
// CONCEPTO: data-* attributes
// ----------------------------
// Los atributos data-* son atributos HTML personalizados.
// En nuestro CSS tenemos reglas que se activan cuando
// <html data-theme="dark"> — así el CSS sabe qué variables
// de color usar. JavaScript los controla con:
//   element.setAttribute('data-theme', 'dark')
//   element.getAttribute('data-theme')
// ------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateToggleButton(theme);
}


// ------------------------------------------------------------
// setupToggleButton()
// Conecta el botón del HTML con la lógica de cambio de tema.
// Se llama una sola vez al iniciar.
// ------------------------------------------------------------
function setupToggleButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', handleToggleClick);
}


// ------------------------------------------------------------
// handleToggleClick()
// Se ejecuta cada vez que el usuario hace clic en el botón.
// ------------------------------------------------------------
function handleToggleClick() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const nextTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  applyTheme(nextTheme);
  localStorage.setItem(STORAGE_KEY, nextTheme);
}


// ------------------------------------------------------------
// updateToggleButton(theme)
// Actualiza el ícono y el texto del botón según el tema activo.
// ------------------------------------------------------------
function updateToggleButton(theme) {
  const icon  = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (!icon || !label) return;

  if (theme === THEME_DARK) {
    icon.textContent  = '☀️';
    label.textContent = 'Modo claro';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'Modo oscuro';
  }
}


// ------------------------------------------------------------
// getCurrentTheme()
// Exportada para que otros módulos puedan consultar el tema
// activo sin tener que leer el DOM directamente.
//
// Devuelve: "dark" | "light"
// ------------------------------------------------------------
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') ?? THEME_LIGHT;
}
