// Descarga una imagen por banda: logo o foto libre de Wikidata/Commons y, si no hay,
// la foto de artista de Deezer. Resultado: public/bandas/<slug>.<ext> + src/data/imagenes.json
//
//   pnpm imagenes            → solo las que faltan
//   pnpm imagenes --todas    → vuelve a descargar todo
//
// Los ajustes manuales (nombres ambiguos, búsquedas alternativas) van en scripts/imagenes-ajustes.json.

import { mkdir, readFile, writeFile, readdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public/bandas');
const SALIDA = join(RAIZ, 'src/data/imagenes.json');
const UA = 'RutaRockAlParque/0.1 (herramienta de fans sin fines de lucro)';
const TODAS = process.argv.includes('--todas');

const ajustes = JSON.parse(await readFile(join(RAIZ, 'scripts/imagenes-ajustes.json'), 'utf8'));

export const slug = (t) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normal = (t) => slug(t).replace(/-/g, '');

// Nombres de banda desde programacion.ts (sin compilar TS: se leen las filas del cartel).
const fuente = await readFile(join(RAIZ, 'src/data/programacion.ts'), 'utf8');
const bandas = [...new Set([...fuente.matchAll(/^\s+\['([^']+)', '[^']+', '\d\d:\d\d'/gm)].map((m) => m[1]))];

const pedir = async (url) => {
  for (let intento = 0; intento < 6; intento++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429) {
      await new Promise((ok) => setTimeout(ok, 4000 * (intento + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r;
  }
  throw new Error(`429 persistente ${url}`);
};
const json = async (url) => (await pedir(url)).json();

const PARECE_MUSICA = /band|banda|group|grupo|músic|music|singer|cantante|rapper|orquesta|orchestra|dúo|duo|artist|cantautor|songwriter|metal|rock|punk|ska/i;

// Wikidata: entidad con el mismo nombre que sea un grupo o músico → logo (P154) o imagen (P18).
const buscarWikidata = async (nombre, consulta) => {
  const q = encodeURIComponent(consulta);
  const res = await json(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}&language=es&uselang=es&type=item&limit=8&format=json`);
  const ids = res.search.filter((e) => normal(e.label ?? '') === normal(consulta)).map((e) => e.id);
  if (!ids.length) return null;
  const ent = await json(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims|descriptions&languages=es|en&format=json`);
  for (const id of ids) {
    const e = ent.entities[id];
    const desc = [e.descriptions?.es?.value, e.descriptions?.en?.value].filter(Boolean).join(' / ');
    if (!PARECE_MUSICA.test(desc)) continue;
    const archivo = (p) => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
    const logo = archivo('P154');
    const foto = archivo('P18');
    if (!logo && !foto) continue;
    const r = await infoCommons(logo ?? foto);
    if (!r) continue;
    return { tipo: logo ? 'logo' : 'foto', ...r, nota: `${id}: ${desc}` };
  }
  return null;
};

const infoCommons = async (file) => {
  {
    const info = await json(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(file)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json`,
    );
    const pagina = Object.values(info.query.pages)[0];
    const ii = pagina?.imageinfo?.[0];
    if (!ii) return null;
    const meta = ii.extmetadata ?? {};
    const autor = (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
    return {
      url: ii.thumburl ?? ii.url,
      fuente: 'Wikimedia Commons',
      pagina: ii.descriptionurl,
      credito: [autor, meta.LicenseShortName?.value].filter(Boolean).join(' · '),
    };
  }
};

// Fuentes fijadas a mano en imagenes-ajustes.json (resuelven homónimos).
const buscarFijada = async (banda) => {
  const manual = ajustes.manual?.[banda];
  if (manual) return { tipo: 'foto', local: manual.archivo, credito: '', ...manual, nota: 'manual' };
  const directa = ajustes.url?.[banda];
  if (directa) return { tipo: 'foto', credito: '', ...directa, nota: 'url fijada' };
  const archivo = ajustes.commons?.[banda];
  if (archivo) {
    const r = await infoCommons(archivo);
    return r && { tipo: 'foto', ...r, nota: `commons fijado: ${archivo}` };
  }
  return null;
};

// Deezer: artista con el mismo nombre; si hay varios, el de más seguidores (o el id fijado en ajustes).
const buscarDeezer = async (nombre, consulta) => {
  const fijo = ajustes.deezer?.[nombre];
  let artista;
  if (fijo) artista = await json(`https://api.deezer.com/artist/${fijo}`);
  else {
    const res = await json(`https://api.deezer.com/search/artist?q=${encodeURIComponent(consulta)}&limit=15`);
    artista = (res.data ?? [])
      .filter((a) => normal(a.name) === normal(consulta))
      .sort((a, b) => b.nb_fan - a.nb_fan)[0];
  }
  // Deezer devuelve una silueta genérica cuando el artista no tiene foto
  // (hash vacío o el md5 de una cadena vacía, d41d8cd9…).
  const pic = artista?.picture_big ?? '';
  if (!pic || pic.includes('/artist//') || pic.includes('d41d8cd98f00b204e9800998ecf8427e')) return null;
  return {
    tipo: 'foto',
    url: artista.picture_big,
    fuente: 'Deezer',
    pagina: artista.link,
    credito: 'Foto de artista vía Deezer',
    nota: `deezer ${artista.id}: ${artista.name} · ${artista.nb_fan} fans`,
  };
};

await mkdir(DESTINO, { recursive: true });
const previo = existsSync(SALIDA) && !TODAS ? JSON.parse(await readFile(SALIDA, 'utf8')) : {};
if (TODAS) for (const f of await readdir(DESTINO)) await rm(join(DESTINO, f));

const resultado = {};
for (const banda of bandas) {
  const id = slug(banda);
  if (ajustes.omitir?.includes(banda)) {
    console.log(`·  ${banda}: omitida (ajustes)`);
    continue;
  }
  if (previo[id] && existsSync(join(RAIZ, 'public', previo[id].archivo))) {
    resultado[id] = previo[id];
    continue;
  }
  const consulta = ajustes.consulta?.[banda] ?? banda;
  try {
    const encontrada =
      (await buscarFijada(banda)) ??
      (ajustes.deezer?.[banda] ? await buscarDeezer(banda, consulta) : null) ??
      (ajustes.soloDeezer?.includes(banda) ? null : await buscarWikidata(banda, consulta)) ??
      (await buscarDeezer(banda, consulta));
    if (!encontrada) {
      console.log(`✗  ${banda}: sin imagen`);
      continue;
    }
    let archivo;
    if (encontrada.local) {
      archivo = `bandas/${id}.${encontrada.local.split('.').pop()}`;
      await copyFile(join(RAIZ, encontrada.local), join(RAIZ, 'public', archivo));
    } else {
      const r = await pedir(encontrada.url);
      const tipoMime = r.headers.get('content-type') ?? '';
      const ext = tipoMime.includes('png') ? 'png' : tipoMime.includes('svg') ? 'svg' : tipoMime.includes('webp') ? 'webp' : 'jpg';
      archivo = `bandas/${id}.${ext}`;
      await writeFile(join(RAIZ, 'public', archivo), Buffer.from(await r.arrayBuffer()));
    }
    const { url, local, archivo: _a, ...resto } = encontrada;
    resultado[id] = { banda, archivo, ...resto };
    console.log(`✓  ${banda}: ${encontrada.tipo} · ${encontrada.fuente} · ${encontrada.nota}`);
  } catch (e) {
    console.log(`!  ${banda}: ${e.message}`);
  }
  await new Promise((ok) => setTimeout(ok, 1200));
}

// Borra imágenes que ya no se usan (p. ej. bandas que pasaron a "omitir").
const usadas = new Set(Object.values(resultado).map((r) => r.archivo.replace('bandas/', '')));
for (const f of await readdir(DESTINO)) if (!usadas.has(f)) await rm(join(DESTINO, f));

await writeFile(SALIDA, JSON.stringify(resultado, null, 2) + '\n');
console.log(`\n${Object.keys(resultado).length}/${bandas.length} bandas con imagen → src/data/imagenes.json`);
