// ============================================================
// src/app.js — punto de entrada
// ============================================================

import { initTheme }  from './theme.js';
import { initRouter } from './router.js';
import { initSearch } from './search.js';

initTheme();
initSearch();
initRouter();

document.getElementById('footer-year').textContent = new Date().getFullYear();
