// Mapa del Parque Metropolitano Simón Bolívar sobre la ortoimagen 2025 de Bogotá
// (IDE de Bogotá D.C., CC BY 4.0; descarga con `pnpm mapa`). Norte arriba.
//
// Ubicaciones:
//   · Plaza — Plaza de Eventos (OpenStreetMap, way 47586020): exacta.
//   · Eco   — zona verde del costado oriental del lago (anunciado para 2025): aproximada.
//   · Bio   — explanada al sur de la Plaza de Eventos, según el mapa oficial 2025: aproximada.
//   · BBC   — escenario nuevo en 2026, sin ubicación publicada: por confirmar.
// Cuando salga el mapa oficial 2026, basta con corregir las coordenadas de abajo.

import type { EscenarioId } from './programacion';

// Recuadro geográfico de la imagen (grados WGS84).
export const MAPA_BBOX = { oeste: -74.096, este: -74.086, sur: 4.6545, norte: 4.6625 };

// Sistema de coordenadas del SVG: 400 de ancho, alto según la proporción real en metros.
const LAT_MEDIA = (MAPA_BBOX.norte + MAPA_BBOX.sur) / 2;
const COS_LAT = Math.cos((LAT_MEDIA * Math.PI) / 180);
const METROS_POR_GRADO = 111_320;
export const MAPA_ANCHO = 400;
export const MAPA_ALTO = Math.round(
  (MAPA_ANCHO * (MAPA_BBOX.norte - MAPA_BBOX.sur)) / ((MAPA_BBOX.este - MAPA_BBOX.oeste) * COS_LAT),
);
/** Metros que representa una unidad del SVG (para la barra de escala). */
export const METROS_POR_UNIDAD = ((MAPA_BBOX.este - MAPA_BBOX.oeste) * COS_LAT * METROS_POR_GRADO) / MAPA_ANCHO;

export const ORTOFOTO = {
  ruta: (ancho: 800 | 1600) => `/mapa/ortofoto-2025-${ancho}.jpg`,
  credito: 'Ortoimagen 2025 © IDE de Bogotá D.C. · CC BY 4.0',
  fuente:
    'https://datosabiertos.bogota.gov.co/dataset/servicio-web-geografico-ortoimagen-para-la-zona-urbana-de-la-ciudad-de-bogota-d-c-2025',
};

export type Precision = 'exacta' | 'aproximada' | 'por-confirmar';
type Lado = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

interface Lugar {
  lat: number;
  lon: number;
  nombre: string;
  precision: Precision;
  /** Hacia dónde va la etiqueta, para que no se pisen. */
  etiqueta: Lado;
}

export const LUGAR_ESCENARIO: Record<EscenarioId, Lugar> = {
  plaza: { lat: 4.66045, lon: -74.09073, nombre: 'Escenario Plaza', precision: 'exacta', etiqueta: 'derecha' },
  bio: { lat: 4.65749, lon: -74.09055, nombre: 'Escenario Bio by Vans', precision: 'aproximada', etiqueta: 'derecha' },
  eco: { lat: 4.65719, lon: -74.0927, nombre: 'Escenario Eco', precision: 'aproximada', etiqueta: 'izquierda' },
  bbc: { lat: 4.65548, lon: -74.0913, nombre: 'Escenario BBC', precision: 'por-confirmar', etiqueta: 'derecha' },
};

export const proyectar = (lat: number, lon: number) => ({
  x: ((lon - MAPA_BBOX.oeste) / (MAPA_BBOX.este - MAPA_BBOX.oeste)) * MAPA_ANCHO,
  y: ((MAPA_BBOX.norte - lat) / (MAPA_BBOX.norte - MAPA_BBOX.sur)) * MAPA_ALTO,
});

export interface PuntoMapa {
  x: number;
  y: number;
  confirmado: boolean;
  precision: Precision;
  nombre: string;
  etiqueta: Lado;
}

export const POSICION_ESCENARIO = Object.fromEntries(
  Object.entries(LUGAR_ESCENARIO).map(([id, l]) => [
    id,
    { ...proyectar(l.lat, l.lon), confirmado: l.precision !== 'por-confirmar', precision: l.precision, nombre: l.nombre, etiqueta: l.etiqueta },
  ]),
) as Record<EscenarioId, PuntoMapa>;

// Accesos del festival (aproximados, según el mapa oficial 2025).
export const ACCESOS = [
  { lat: 4.6621, lon: -74.09025, nombre: 'Acceso Calle 63' },
  { lat: 4.65999, lon: -74.0891, nombre: 'Acceso Calle 63' },
  { lat: 4.65683, lon: -74.09, nombre: 'Acceso Cra. 60' },
].map((a) => ({ ...proyectar(a.lat, a.lon), nombre: a.nombre }));

// Referencias del parque para ubicarse (solo texto sobre la foto).
export const REFERENCIAS = [
  { lat: 4.6593, lon: -74.0952, nombre: 'Lago' },
  { lat: 4.65655, lon: -74.08825, nombre: 'Biblioteca Virgilio Barco' },
].map((r) => ({ ...proyectar(r.lat, r.lon), nombre: r.nombre }));

/** Distancia en línea recta entre dos puntos (m), fórmula del haversine. */
export const metrosEntre = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};

// Caminata con público: los senderos no son rectos (≈ ×1.4) y entre multitudes se anda a ≈ 60 m/min.
const FACTOR_RECORRIDO = 1.4;
const METROS_POR_MINUTO = 60;

export const trasladoEntre = (a: EscenarioId, b: EscenarioId): number =>
  a === b
    ? 0
    : Math.max(3, Math.round((metrosEntre(LUGAR_ESCENARIO[a], LUGAR_ESCENARIO[b]) * FACTOR_RECORRIDO) / METROS_POR_MINUTO));
