// ============================================================
// src/util.js — utilidades compartidas
// ============================================================

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);
}

export function formatDate(dateStr, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('es-MX', opts).format(new Date(dateStr + 'T00:00:00'));
}

// Quita tildes y pasa a minúsculas: "Física" → "fisica"
export function normalize(text) {
  return String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function tagsHTML(tags = []) {
  if (!tags.length) return '';
  return `<div class="tags">${tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>`;
}
