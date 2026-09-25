// Esquema del Parque Simón Bolívar basado en el mapa oficial de Rock al Parque 2025
// (misma orientación: el oriente queda arriba). El mapa 2026 aún no se ha publicado y el
// escenario BBC es nuevo, así que su posición es provisional. Actualizar aquí cuando salga.

import type { EscenarioId } from './programacion';

export const MAPA_ANCHO = 400;
export const MAPA_ALTO = 320;

export interface PuntoMapa {
  x: number;
  y: number;
  confirmado: boolean;
}

export const POSICION_ESCENARIO: Record<EscenarioId, PuntoMapa> = {
  plaza: { x: 110, y: 190, confirmado: true },
  bio: { x: 272, y: 92, confirmado: true },
  eco: { x: 268, y: 212, confirmado: true },
  bbc: { x: 330, y: 272, confirmado: false },
};

export const ACCESOS = [
  { x: 20, y: 205, nombre: 'Calle 63' },
  { x: 20, y: 282, nombre: 'Calle 63' },
  { x: 318, y: 22, nombre: 'Cra. 60' },
];

// Contorno aproximado del área del festival y senderos principales.
export const CONTORNO =
  'M44 64 L292 14 L372 58 L388 150 L352 238 L286 306 L70 312 L34 262 Z';
export const SENDEROS = [
  'M20 205 C80 205 90 150 170 130 S250 70 318 22',
  'M20 282 C110 270 180 250 268 212 S360 120 380 100',
  'M110 190 C170 200 210 210 268 212',
  'M272 92 C270 140 268 170 268 212',
];

// Minutos caminando entre escenarios con público (estimados sobre el mapa 2025).
const TRASLADOS: Record<string, number> = {
  'bio|plaza': 8,
  'eco|plaza': 10,
  'bio|eco': 6,
  'bbc|plaza': 12,
  'bbc|bio': 10,
  'bbc|eco': 6,
};

export const trasladoEntre = (a: EscenarioId, b: EscenarioId): number =>
  a === b ? 0 : (TRASLADOS[[a, b].sort().join('|')] ?? 10);
