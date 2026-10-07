// ============================================================
// scripts/new.mjs — crea una entrada nueva con su front matter
//
//   node scripts/new.mjs proyecto "Mi proyecto"
//   node scripts/new.mjs articulo "Mi artículo"
//   node scripts/new.mjs curso    "Nombre del curso"
//   node scripts/new.mjs nota     "slug-del-curso" "Título de la nota"
// ============================================================

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [kind, a, b] = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);

const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const templates = {
  proyecto: t => [`content/projects/${slugify(t)}.md`,
`---
title: ${t}
description: Una frase que resuma el proyecto.
date: ${today}
type: programming      # programming | research
tags: []
repo:
featured: false
---

Escribe aquí el contenido.
`],
  articulo: t => [`content/blog/${slugify(t)}.md`,
`---
title: ${t}
description: Un párrafo corto que resuma el artículo.
date: ${today}
tags: []
---

Escribe aquí el contenido. Puedes usar matemáticas: $E = mc^2$.
`],
  curso: t => [`content/courses/${slugify(t)}/course.md`,
`---
title: ${t}
institution:
description:
date: ${today}
tags: []
---
`],
};

let path, text;
if (kind === 'nota') {
  if (!a || !b) usage();
  path = `content/courses/${a}/${slugify(b)}.md`;
  text = `---\ntitle: ${b}\n---\n\nEscribe aquí tus notas.\n`;
} else if (templates[kind] && a) {
  [path, text] = templates[kind](a);
} else usage();

const full = join(ROOT, path);
if (existsSync(full)) { console.error(`Ya existe: ${path}`); process.exit(1); }
mkdirSync(dirname(full), { recursive: true });
writeFileSync(full, text);
execFileSync('node', [join(ROOT, 'scripts/build-index.mjs')], { stdio: 'inherit' });
console.log(`✓ Creado ${path}`);

function usage() {
  console.error('Uso: node scripts/new.mjs <proyecto|articulo|curso> "Título"\n     node scripts/new.mjs nota <slug-curso> "Título"');
  process.exit(1);
}
