import datos from '../data/imagenes.json';

export interface ImagenBanda {
  banda: string;
  archivo: string;
  tipo: 'logo' | 'foto';
  fuente: string;
  pagina: string;
  credito: string;
}

// Debe coincidir con slug() de scripts/imagenes.mjs.
export const slug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const tabla = datos as Record<string, ImagenBanda>;

export const imagenDe = (banda: string): ImagenBanda | undefined => tabla[slug(banda)];

export const todasLasImagenes = (): ImagenBanda[] => Object.values(tabla);

// Monograma para bandas sin imagen verificada: "Los Setas" → "LS".
export const iniciales = (banda: string) =>
  banda
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || banda.slice(0, 2).toUpperCase();
