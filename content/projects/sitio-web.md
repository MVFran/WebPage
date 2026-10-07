---
title: Este sitio web
description: Sitio personal construido como SPA con HTML, CSS y JavaScript puro, sin frameworks, y desplegado en Vercel.
date: 2026-10-06
type: programming
tags: [JavaScript, HTML, CSS, Vercel, SPA]
repo: https://github.com/MVFran/WebPage
featured: true
---

Este sitio es mi proyecto personal para publicar proyectos, artículos y notas de cursos. Se construyó **sin frameworks ni herramientas de compilación**: solo HTML, CSS y JavaScript moderno (módulos ES). El proposito es entender cómo funciona cada pieza dentro de un SPA.

## Resumen técnico

| Aspecto | Detalle |
|---|---|
| **Tipo** | Single Page Application (SPA) estática |
| **Lenguajes** | HTML, CSS, JavaScript (módulos ES) y Node.js para los scripts |
| **Contenido** | Archivos Markdown con *front matter* |
| **Librerías** | `marked` (Markdown), `DOMPurify` (seguridad), `KaTeX` (ecuaciones) |
| **Hosting** | Vercel |
| **Fuentes** | Lora (texto) e Inter (interfaz), de Google Fonts |

## ¿Qué es una SPA y cómo funciona aquí?

En un sitio tradicional, cada clic en un enlace pide al servidor una página HTML nueva y el navegador la recarga completa. En una **Single Page Application** el navegador descarga una sola página (`index.html`) y es JavaScript quien cambia el contenido cuando navegas.

El flujo de este sitio es:

1. El navegador carga `index.html`, que contiene lo que nunca cambia: el header, el footer y el diálogo de búsqueda.
2. `src/app.js` arranca el tema, la búsqueda y el **router**.
3. El router lee la URL (por ejemplo `/articulos/redes_neuronales`), decide qué vista corresponde y le pide los datos a `content-loader.js`.
4. La vista construye el HTML y lo inyecta dentro de `<main id="app">`. El header y el footer no se vuelven a cargar.
5. Se actualizan el título de la pestaña, la descripción y la URL canónica, y el foco se mueve al contenido.

Para que la navegación no recargue la página, el router intercepta los clics en enlaces internos y usa la **History API** (`history.pushState`) para cambiar la URL sin salir de la página. Escucha también el evento `popstate` para que los botones de atrás y adelante funcionen. Respeta `Ctrl+clic`, las anclas (`#sección`) y los archivos como el PDF del CV, que maneja el navegador.

### El problema de las SPA con URLs directas

Si alguien abre directamente `/proyectos/sitio-web`, el servidor busca un archivo con esa ruta y no lo encuentra. Por eso `vercel.json` incluye una regla de *rewrite* que manda cualquier ruta a `index.html`; una vez cargado, el router interpreta la URL y muestra la vista correcta. Vercel sirve primero los archivos reales (CSS, JS, Markdown, PDF), así que la regla solo se aplica a las rutas de la SPA.

## Despliegue en Vercel

El sitio está montado en **Vercel**, conectado al repositorio de GitHub. Cada `git push` dispara un despliegue automático:

- Vercel ejecuta `node scripts/build-index.mjs`, que genera el catálogo del contenido, el índice de búsqueda y el sitemap.
- Publica la carpeta raíz tal cual, sin empaquetar nada.
- Aplica los *rewrites* de la SPA y cabeceras de seguridad (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).

Todo esto está declarado en `vercel.json`, así que el despliegue es reproducible.

## Sistema de contenido

Agregar una entrada no requiere tocar código. Cada proyecto, artículo o nota es un archivo Markdown con una cabecera (*front matter*):

```yaml
---
title: Mi proyecto
description: Una frase que lo resuma.
date: 2026-10-06
type: programming
tags: [Python, ML]
---
```

El script `scripts/build-index.mjs` recorre la carpeta `content/` y genera:

- `content/index.json`: el catálogo que usan las páginas de listado.
- `content/search.json`: el texto plano de cada entrada para el buscador.
- `sitemap.xml` y `robots.txt`, para los buscadores.

Además calcula el **tiempo de lectura** (unas 200 palabras por minuto) y toma la fecha del primer *commit* del archivo cuando no se indica una. Para crear una entrada nueva basta con:

```bash
npm run new articulo "Mi artículo"
```

Los cursos son carpetas: cada `.md` o `.pdf` que se agregue aparece automáticamente en la lista de notas del curso, con botones de anterior y siguiente.

## Cómo se renderiza el Markdown

El texto pasa por varias etapas antes de llegar a la pantalla:

1. Se quita el *front matter* y el primer título (la página ya muestra el suyo).
2. Se **extraen las ecuaciones** y se reemplazan por marcadores, porque `marked` rompería los guiones bajos y las barras de LaTeX.
3. `marked` convierte el Markdown a HTML.
4. **DOMPurify** sanitiza el resultado, eliminando cualquier `<script>` o atributo peligroso.
5. Se reinsertan las ecuaciones ya renderizadas con **KaTeX**: `$E = mc^2$` en línea o `$$ ... $$` en bloque.
6. Se añaden identificadores a los títulos, se construye la **tabla de contenidos** y los enlaces externos se abren de forma segura (`rel="noopener"`).

Las librerías se cargan desde un CDN con versión fija y verificación de integridad (SRI), de modo que el navegador rechaza un archivo que no coincida con el esperado.

## Funciones destacadas

- **Búsqueda global** (`Ctrl/⌘ + K` o `/`): se ejecuta completamente en el navegador. Normaliza el texto (ignora mayúsculas y tildes), puntúa los resultados según coincidan en título, etiquetas o contenido y resalta los términos encontrados.
- **Filtros** por etiqueta o tipo en los listados, guardados en la URL (`?filtro=`) para poder compartirlos.
- **Modo claro y oscuro** con la preferencia guardada en `localStorage`. Un pequeño script en el `<head>` aplica el tema antes de pintar la página para evitar el parpadeo.
- **Tabla de contenidos** lateral que resalta la sección que se está leyendo, usando `IntersectionObserver`.
- **SEO en una SPA**: el router actualiza el título, la descripción y la URL canónica en cada ruta.
- **Diseño responsivo** y accesible: enlace para saltar al contenido, navegación por teclado, foco visible y respeto a `prefers-reduced-motion`.

## Diseño

El sistema de diseño vive en variables CSS al inicio de `assets/css/main.css`: colores, tipografía, espaciado y radios. La paleta es azul sobre grises fríos y se verificó que los contrastes de texto cumplan la guía de accesibilidad WCAG AA en ambos modos (4.5:1 o más). Cambiar el aspecto de todo el sitio es cuestión de editar unas pocas variables.

## Estructura del proyecto

```
index.html            Estructura base de la SPA
assets/css/main.css   Sistema de diseño
src/
  app.js              Punto de entrada
  router.js           Rutas y vistas
  content-loader.js   Carga y renderizado de Markdown
  search.js           Búsqueda
  theme.js            Modo claro / oscuro
  util.js             Utilidades compartidas
content/              Textos en Markdown + índices generados
scripts/              build-index, new y dev
vercel.json           Configuración de despliegue
```

## Qué aprendí

- Cómo funciona un **router del lado del cliente** y qué implica servir una SPA desde un hosting estático.
- Por qué **sanitizar** el HTML generado a partir de Markdown, aunque el contenido sea propio.
- Cómo separar el contenido del código para que publicar sea tan simple como escribir un archivo.
- Detalles de accesibilidad y rendimiento que normalmente dan los frameworks, pero que conviene conocer.
