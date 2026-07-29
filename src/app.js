// ============================================================
// src/app.js
// Punto de entrada principal del sitio
// ============================================================

import { initTheme }  from './theme.js';
import { initRouter } from './router.js';
import { initSearch } from './search.js';

function init() {
  initTheme();
  initRouter();
  initSearch();
}

document.addEventListener('DOMContentLoaded', init);
