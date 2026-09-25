# Tu ruta al Rock al Parque · 30 años

Herramienta web gratuita para armar tu ruta de conciertos en **Rock al Parque 2026**
(10, 11 y 12 de octubre, Parque Simón Bolívar, Bogotá). Eliges tus bandas, se conectan como
nodos en orden, te avisa de choques de horario y de traslados apretados entre escenarios, y
exportas tu ruta como imagen para historias, calendario `.ics` o enlace.

Idea, diseño y desarrollo: [@efren.fotograma](https://www.instagram.com/efren.fotograma/).
Herramienta **no oficial**, hecha por fans.

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # sitio estático en dist/
pnpm imagenes     # descarga fotos/logos de bandas que falten (--todas para rehacer)
pnpm capturas     # capturas para el material promocional (con pnpm dev corriendo)
```

## Estructura

```
├── src/
│   ├── data/          programación, mapa, imágenes de bandas, autoría
│   ├── lib/           lógica: rutas y choques, exportar, compartir, métricas
│   ├── components/    Parrilla, ListaDia, PanelRuta, MapaParque, Splash, Analitica…
│   ├── scripts/app.ts estado e interacción (TypeScript sin framework)
│   └── pages/index.astro
├── public/            marca (logo y copetón), bandas/, og.jpg
├── scripts/           imagenes.mjs, capturas-promo.mjs
├── comunicacion/      comunicados a Idartes/Rock al Parque/Tavo Garavato + textos para redes
├── LICENSE            MIT (código)
└── AVISO-DE-TERCEROS.md  material que la licencia no cubre
```

| Archivo | Qué hace |
|---|---|
| `src/data/programacion.ts` | Cartel de los 3 días (única fuente de datos) |
| `src/data/mapa.ts` | Esquema del parque y minutos de traslado por par de escenarios |
| `src/data/autor.ts` | Autoría (@efren.fotograma) usada en el sitio y en lo que se exporta |
| `src/lib/ruta.ts` | Orden, tramos, choques y traslados |
| `src/lib/exportar.ts` | PNG 1080×1920 (canvas) y `.ics` |
| `src/lib/compartir.ts` | Enlace `#r=id.id.id` |
| `src/lib/metricas.ts` | Eventos de uso anónimos (Umami) |
| `src/components/Parrilla.astro` | Parrilla de nodos por día + SVG de conexiones |
| `src/components/ListaDia.astro` | Vista simplificada para celular (lista por hora) |
| `src/components/MapaParque.astro` | Mapa esquemático con el recorrido de tu ruta |
| `src/components/Splash.astro` | Pantalla de entrada con el copetón y el logo 30 años |
| `src/components/PanelRuta.astro` | Panel «Mi ruta» (hoja inferior en celular) |

El mapa se basa en el oficial de 2025; el de 2026 aún no está publicado y la ubicación del
escenario BBC es provisional. Cuando salga, actualizar `src/data/mapa.ts`.

## Métricas de uso (Umami)

Anónimas y sin cookies (no requieren banner de consentimiento). Desactivadas hasta configurar:

1. Crea una cuenta gratis en [cloud.umami.is](https://cloud.umami.is) y agrega el sitio.
2. `cp .env.example .env` y pega el *Website ID* en `PUBLIC_UMAMI_ID`.
3. En el hosting (Netlify, Vercel, Cloudflare Pages) define la misma variable de entorno.

Eventos que se registran:

| Evento | Datos |
|---|---|
| `splash-entrar` | — |
| `concierto-agregado` | día, escenario, banda |
| `exportar-imagen` | día, número de conciertos |
| `exportar-calendario` · `copiar-enlace` | número de conciertos |
| `abrir-ruta-compartida` | número de conciertos |
| `cambiar-vista` | lista / parrilla |

Con esto sabes cuántas rutas se crean y se comparten, y qué bandas elige más la gente.

## Imágenes de bandas

`scripts/imagenes.mjs` busca primero en Wikidata/Wikimedia Commons (logo o foto con licencia
libre) y, si no hay, la foto de artista de Deezer. Guarda en `public/bandas/` y
`src/data/imagenes.json`. Los homónimos se resuelven fijando la fuente en
`scripts/imagenes-ajustes.json` (prioridad: `manual` > `url` > `commons` > `deezer` > búsqueda
automática; también `omitir` y `consulta`). Ojo: Deezer mezcla artistas homónimos en un mismo
perfil; en ese caso se usa la portada de un disco verificado (`url`). Los recortes hechos a mano
van en `scripts/imagenes-manuales/`. Sin imagen → monograma.

## Material promocional

- **Comunicados y textos para redes:** `comunicacion/` (ver su README: calendario de envío y lanzamiento).
- **Reel y plantillas (Remotion):** proyecto `4.Music-Town/4.remotion`, carpeta
  `src/proyectos/ruta-rock-al-parque`. Usa esta web por enlaces simbólicos (datos, imágenes y
  `promo/capturas/`), así que no se duplica nada.

## Licencia

El **código** es MIT (`LICENSE`). El logo, la imagen oficial 30 años (Tavo Garavato / Idartes),
las fotos de las bandas y la programación pertenecen a sus titulares: ver
[`AVISO-DE-TERCEROS.md`](AVISO-DE-TERCEROS.md).
