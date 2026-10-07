// ============================================================
// src/theme.js — modo claro / oscuro
// El tema inicial lo aplica un script inline en index.html
// (evita el parpadeo). Aquí solo se gestiona el botón.
// ============================================================

const STORAGE_KEY = 'theme';

export function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  sync(btn);
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* modo privado */ }
    sync(btn);
  });
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function sync(btn) {
  btn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
}
