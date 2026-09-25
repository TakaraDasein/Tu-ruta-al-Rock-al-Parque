// Capturas de la herramienta para el material promocional (reel y carrusel en Remotion).
//
//   pnpm dev                 # en otra terminal
//   pnpm capturas            # → promo/capturas/
//
// Genera, para una ruta de ejemplo del sábado:
//   movil-estado-<n>.jpg     lista móvil completa (página entera) tras n toques
//   escritorio-parrilla.jpg  parrilla del sábado con la ruta conectada
//   movil-panel.jpg          panel «Mi ruta» abierto en el celular (con el mapa)
//   mapa.png                 mapa del parque con los traslados
//   historia-exportada.png   la imagen que exporta la herramienta
//   capturas.json            coordenadas (toques, nodos) para animar en Remotion

import { chromium } from 'playwright-core';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'promo/capturas');
const URL_SITIO = process.env.URL_SITIO ?? 'http://localhost:4321/';
const CHROMIUM = process.env.CHROMIUM ?? ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);

// Ruta de ejemplo: muestra traslado holgado, «¡corre!» (Stratovarius → Grave) y un choque (Triptykon / Apocalyptica).
const RUTA = ['sab-plaza-4', 'sab-bio-4', 'sab-plaza-6', 'sab-bio-6', 'sab-bio-7', 'sab-plaza-8'];

const MOVIL = { width: 390, height: 844, escala: 2 };
const ESCRITORIO = { width: 1440, height: 1000, escala: 1.5 };

const sinIntro = async (page) => {
  await page.goto(URL_SITIO);
  await page.evaluate(() => {
    sessionStorage.setItem('ruta-rap-2026-intro-vista', '1');
    localStorage.clear();
    localStorage.setItem('ruta-rap-2026-dia', 'sab');
    localStorage.setItem('ruta-rap-2026-vista', 'lista');
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
};

// Fuerza la carga de imágenes diferidas recorriendo la página.
const cargarTodo = async (page) => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
    // Solo las visibles (las ocultas nunca cargan) y con tiempo límite.
    const pendientes = [...document.images]
      .filter((i) => !i.complete && i.offsetParent !== null)
      .map((i) => new Promise((r) => { i.onload = i.onerror = r; }));
    await Promise.race([Promise.all(pendientes), new Promise((r) => setTimeout(r, 4000))]);
  });
};

await rm(DESTINO, { recursive: true, force: true });
await mkdir(DESTINO, { recursive: true });
const navegador = await chromium.launch({ executablePath: CHROMIUM });
const datos = { sitio: URL_SITIO, ruta: RUTA, movil: {}, escritorio: {}, tutorial: {} };

/* ── Celular: lista, toque por toque ── */
{
  const page = await navegador.newPage({
    viewport: { width: MOVIL.width, height: MOVIL.height },
    deviceScaleFactor: MOVIL.escala,
    isMobile: true,
    hasTouch: true,
  });
  await sinIntro(page);
  await cargarTodo(page);
  // La barra fija «Mi ruta» y el aviso se dibujan aparte en Remotion.
  await page.addStyleTag({ content: '[data-panel], [data-aviso] { display: none !important; }' });

  const lista = page.locator('[data-lista="sab"]');
  const cajaLista = await lista.boundingBox();

  const altos = [];
  const guardarEstado = async (n) => {
    await lista.screenshot({ path: join(DESTINO, `movil-estado-${n}.jpg`), type: 'jpeg', quality: 86 });
    altos[n] = Math.round((await lista.boundingBox()).height);
  };

  datos.movil = { escala: MOVIL.escala, ancho: Math.round(cajaLista.width), altos, toques: [] };
  await guardarEstado(0);
  console.log('· celular: estado 0');
  for (const [i, id] of RUTA.entries()) {
    const boton = page.locator(`.opcion[data-id="${id}"]`);
    await boton.scrollIntoViewIfNeeded();
    // Posiciones relativas al borde superior de la lista, medidas en el estado previo al toque
    // (es la imagen movil-estado-<i> sobre la que se anima el dedo).
    const pos = await page.evaluate((id) => {
      const lista = document.querySelector('[data-lista="sab"]').getBoundingClientRect();
      const fila = document.querySelector(`.opcion[data-id="${id}"]`).getBoundingClientRect();
      const check = document.querySelector(`.opcion[data-id="${id}"] .opcion-check`).getBoundingClientRect();
      return {
        fila: { x: fila.left - lista.left, y: fila.top - lista.top, w: fila.width, h: fila.height },
        dedo: { x: check.left + check.width / 2 - lista.left, y: check.top + check.height / 2 - lista.top },
      };
    }, id);
    await boton.click();
    await page.waitForTimeout(120);
    await guardarEstado(i + 1);
    datos.movil.toques.push({ id, ...pos });
    console.log(`· celular: toque ${i + 1}/${RUTA.length} (${id})`);
  }
  // Panel «Mi ruta» abierto, desplazado hasta el mapa.
  await page.addStyleTag({ content: '[data-panel] { display: flex !important; }' });
  await page.click('[data-asa]');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.panel-contenido')?.scrollTo(0, 250));
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(DESTINO, 'movil-panel.jpg'), type: 'jpeg', quality: 88 });
  await page.close();
}

/* ── Escritorio: parrilla con la ruta, mapa y exportación ── */
{
  const page = await navegador.newPage({
    viewport: { width: ESCRITORIO.width, height: ESCRITORIO.height },
    deviceScaleFactor: ESCRITORIO.escala,
    acceptDownloads: true,
  });
  await sinIntro(page);
  await page.evaluate((ids) => localStorage.setItem('ruta-rap-2026', JSON.stringify(ids)), RUTA);
  await page.reload();
  await cargarTodo(page);
  await page.waitForTimeout(400);

  const parrilla = page.locator('[data-parrilla="sab"]');
  await parrilla.screenshot({ path: join(DESTINO, 'escritorio-parrilla.jpg'), type: 'jpeg', quality: 86 });
  const cajaP = await parrilla.boundingBox();
  const nodos = await page.evaluate(
    ({ ids, px, py }) =>
      ids.map((id) => {
        const r = document.querySelector(`.nodo[data-id="${id}"]`).getBoundingClientRect();
        return { id, x: r.left - px, y: r.top + scrollY - py, w: r.width, h: r.height };
      }),
    { ids: RUTA, px: cajaP.x, py: cajaP.y + (await page.evaluate(() => scrollY)) },
  );
  datos.escritorio = { escala: ESCRITORIO.escala, ancho: Math.round(cajaP.width), alto: Math.round(cajaP.height), nodos };

  console.log('· escritorio: parrilla');
  await page.locator('[data-mapa]').screenshot({ path: join(DESTINO, 'mapa.png') });

  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('[data-accion="imagen"]')]);
  await descarga.saveAs(join(DESTINO, 'historia-exportada.png'));
  await page.close();
}

/* ── Tutorial: pantallas completas del celular, paso a paso, con el punto de cada toque ── */
{
  const page = await navegador.newPage({
    viewport: { width: MOVIL.width, height: MOVIL.height },
    deviceScaleFactor: MOVIL.escala,
    isMobile: true,
    hasTouch: true,
  });
  const toques = {};
  const centro = async (selector) => {
    const r = await page.locator(selector).first().boundingBox();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const foto = (nombre) => page.screenshot({ path: join(DESTINO, `tutorial-${nombre}.jpg`), type: 'jpeg', quality: 86 });

  // 1. Splash → «Crear mi ruta» → pestañas de día
  await page.goto(URL_SITIO);
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem('ruta-rap-2026-dia', 'sab');
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2800); // animación de entrada del splash
  await foto('01-splash');
  toques.entrar = await centro('[data-entrar]');
  await page.click('[data-entrar]');
  await page.waitForTimeout(1000);
  await cargarTodo(page);
  await foto('02-inicio');
  toques.domingo = await centro('[data-tab="dom"]');
  await page.click('[data-tab="dom"]');
  await page.waitForTimeout(500);
  await foto('03-domingo');
  await page.click('[data-tab="sab"]');

  // 2. Con la ruta armada: lista → abrir «Mi ruta» → cadena → mapa → ampliar → exportar
  await page.evaluate((ids) => localStorage.setItem('ruta-rap-2026', JSON.stringify(ids)), RUTA);
  await page.reload();
  await cargarTodo(page);
  await page.locator('.opcion[data-id="sab-plaza-6"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy(0, 120));
  await page.waitForTimeout(300);
  await foto('04-lista');
  toques.miRuta = await centro('[data-asa]');
  await page.click('[data-asa]');
  await page.waitForTimeout(500);
  const panel = (y) => page.evaluate((y) => document.querySelector('.panel-contenido').scrollTo(0, y), y);
  const alPanel = (sel) =>
    page.evaluate((sel) => {
      const c = document.querySelector('.panel-contenido');
      const el = document.querySelector(sel);
      c.scrollTo(0, el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 12);
    }, sel);
  await alPanel('[data-cadena]');
  await page.waitForTimeout(300);
  await foto('05-cadena');
  await alPanel('[data-mapa-figura]');
  await page.waitForTimeout(600);
  await foto('06-mapa');
  toques.ampliar = await centro('[data-ampliar-mapa]');
  await page.click('[data-ampliar-mapa]');
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('[data-mapa-figura]').scrollTo(150, 0));
  await page.waitForTimeout(300);
  await foto('07-mapa-ampliado');
  await page.click('[data-ampliar-mapa]');
  await page.waitForTimeout(300);
  await alPanel('.acciones');
  await page.waitForTimeout(300);
  await foto('08-acciones');
  toques.exportar = await centro('[data-accion="imagen"]');

  // 3. Tip: filtro «Mi ruta»
  await page.click('[data-asa]');
  await page.waitForTimeout(400);
  await page.locator('[data-controles]').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy(0, -140));
  await page.waitForTimeout(300);
  await foto('09-filtro-antes');
  toques.filtro = await centro('[data-filtro="ruta"]');
  await page.click('[data-filtro="ruta"]');
  await page.waitForTimeout(400);
  await foto('10-filtro-ruta');
  await panel(0);

  datos.tutorial = { escala: MOVIL.escala, ancho: MOVIL.width, alto: MOVIL.height, toques };
  console.log('· tutorial: 10 pantallas');
  await page.close();
}

await navegador.close();
await writeFile(join(DESTINO, 'capturas.json'), JSON.stringify(datos, null, 2) + '\n');
console.log(`Capturas listas en ${DESTINO}`);
