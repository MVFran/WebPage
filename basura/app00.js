// ============================================================
// src/app.js
// Punto de entrada principal del sitio
// ============================================================
//
// CONCEPTO: import
// -----------------
// Con `import` traemos funciones exportadas desde otros módulos.
// La ruta es relativa a este archivo (src/app.js), por eso
// usamos './theme.js' y no 'src/theme.js'.
//
// Solo importamos lo que necesitamos — no el módulo completo.
// Esto se llama "named import" (importación nombrada).
// ============================================================

import { initTheme } from './theme.js';

// ------------------------------------------------------------
// Función principal — se ejecuta cuando el DOM está listo
// ------------------------------------------------------------
function init() {
  initTheme();

  // Aquí iremos agregando más inicializaciones conforme
  // construyamos los siguientes módulos:
  // initRouter();
  // initSearch();
}

// ------------------------------------------------------------
// CONCEPTO: DOMContentLoaded
// ---------------------------
// El navegador lee el HTML de arriba hacia abajo. Si el script
// intentara manipular el DOM antes de que el HTML esté cargado,
// no encontraría los elementos y fallaría.
//
// DOMContentLoaded se dispara cuando el HTML está completamente
// parseado y todos los elementos existen en el DOM —
// aunque las imágenes y otros recursos aún no hayan cargado.
//
// Es el momento seguro para arrancar cualquier lógica de JS.
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
