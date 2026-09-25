// Descarga la ortoimagen 2025 de Bogotá (IDE de Bogotá D.C. / Catastro Distrital, CC BY 4.0)
// para el recuadro del mapa definido en src/data/mapa.ts.
//
//   pnpm mapa        → public/mapa/ortofoto-2025-800.jpg y -1600.jpg
//
// Servicio: WMS «orthourbana2025funcion» (5 cm/píxel), datos abiertos de Bogotá:
// https://datosabiertos.bogota.gov.co/dataset/servicio-web-geografico-ortoimagen-para-la-zona-urbana-de-la-ciudad-de-bogota-d-c-2025

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAPA_BBOX } from '../src/data/mapa.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public/mapa');
const WMS =
  'https://serviciosgis.catastrobogota.gov.co/image/services/imagenesfunciones/orthourbana2025funcion/ImageServer/WMSServer';

const { oeste, este, sur, norte } = MAPA_BBOX;
// Relación de aspecto en metros (la longitud se acorta por el coseno de la latitud).
const aspecto = (norte - sur) / ((este - oeste) * Math.cos((((norte + sur) / 2) * Math.PI) / 180));

await mkdir(DESTINO, { recursive: true });
for (const ancho of [800, 1600]) {
  const alto = Math.round(ancho * aspecto);
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'orthourbana2025funcion',
    styles: '',
    crs: 'CRS:84',
    bbox: [oeste, sur, este, norte].join(','),
    width: String(ancho),
    height: String(alto),
    format: 'image/jpeg',
  });
  const r = await fetch(`${WMS}?${params}`);
  if (!r.ok || !r.headers.get('content-type')?.includes('image')) throw new Error(`WMS respondió ${r.status}`);
  const archivo = join(DESTINO, `ortofoto-2025-${ancho}.jpg`);
  await writeFile(archivo, Buffer.from(await r.arrayBuffer()));
  console.log(`✓ ${archivo} (${ancho}×${alto})`);
}
