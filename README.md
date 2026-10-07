# Sitio personal — Francisco Miranda

Sitio estático (HTML + CSS + JS, sin build de frameworks). Se despliega en Vercel.

## Desarrollo

```bash
npm run dev        # regenera el índice y sirve en http://localhost:3000
```

## Agregar contenido

Cada entrada es un archivo Markdown con *front matter* en `content/`. El catálogo
(`content/index.json`), la búsqueda, `sitemap.xml` y `robots.txt` se generan solos
con `npm run build` (Vercel lo corre en cada deploy; `npm run dev` también).

```bash
npm run new proyecto "Mi proyecto"            # content/projects/mi-proyecto.md
npm run new articulo "Mi artículo"            # content/blog/mi-articulo.md
npm run new curso "Nombre del curso"          # content/courses/nombre-del-curso/course.md
npm run new nota nombre-del-curso "Tema 1"    # content/courses/nombre-del-curso/tema-1.md
```

O crea el `.md` a mano. Campos del front matter:

| Campo | Aplica a | Notas |
|---|---|---|
| `title` | todos | si falta, se usa el primer `# Título` o el nombre del archivo |
| `description` | todos | resumen de una línea (tarjetas, buscador, SEO) |
| `date` | todos | `AAAA-MM-DD`; si falta, la fecha del primer commit |
| `tags` | todos | `[Python, Física]` |
| `type` | proyectos | `programming` o `research` |
| `repo`, `demo` | proyectos | botones en la página del proyecto |
| `featured` | proyectos | `true` para mostrarlo en el inicio |
| `institution` | cursos | |
| `order` | notas | orden dentro del curso (si no, por nombre de archivo) |
| `draft` | todos | `true` para ocultarlo |

- **Notas de curso:** cualquier `.md` o `.pdf` dentro de la carpeta del curso aparece en su lista.
- **Imágenes:** ponlas en `assets/img/` y úsalas con `![texto](/assets/img/foto.png)`.
- **Ecuaciones:** `$E=mc^2$` en línea y `$$ ... $$` en bloque (KaTeX).
- Para publicar: `git add . && git commit && git push` — nada más.

## Estructura

```
index.html            shell de la SPA (header, footer, diálogo de búsqueda)
assets/css/main.css   sistema de diseño (variables de color arriba del todo)
src/                  router y vistas, carga de contenido, búsqueda, tema
content/              tus textos (Markdown) + index.json generado
scripts/              build-index, new, dev
vercel.json           rewrites de SPA, cabeceras y comando de build
```

Para cambiar los colores del sitio basta con editar las variables de `:root` en `main.css`.
