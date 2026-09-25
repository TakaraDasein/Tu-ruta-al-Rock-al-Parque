import { CONCIERTOS, type Concierto, type DiaId } from '../data/programacion';
import { trasladoEntre } from '../data/mapa';
import { aMinutos, duracion } from './tiempo';

export type EstadoTramo = 'ok' | 'justo' | 'choque';

export interface Tramo {
  desde: Concierto;
  hasta: Concierto;
  libre: number; // minutos entre el fin de uno y el inicio del siguiente (negativo = se cruzan)
  cambiaEscenario: boolean;
  traslado: number; // minutos caminando estimados (0 si es el mismo escenario)
  estado: EstadoTramo;
}

const porId = new Map(CONCIERTOS.map((c) => [c.id, c]));

export const buscar = (id: string): Concierto | undefined => porId.get(id);

export const seSolapan = (a: Concierto, b: Concierto): boolean =>
  a.dia === b.dia && aMinutos(a.inicio) < aMinutos(b.fin) && aMinutos(b.inicio) < aMinutos(a.fin);

// Conciertos elegidos de un día, en orden cronológico.
export const rutaDelDia = (ids: Iterable<string>, dia: DiaId): Concierto[] =>
  [...ids]
    .map(buscar)
    .filter((c): c is Concierto => !!c && c.dia === dia)
    .sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio) || aMinutos(a.fin) - aMinutos(b.fin));

export const tramos = (ruta: Concierto[]): Tramo[] =>
  ruta.slice(1).map((hasta, i) => {
    const desde = ruta[i];
    const libre = aMinutos(hasta.inicio) - aMinutos(desde.fin);
    const cambiaEscenario = desde.escenario !== hasta.escenario;
    const traslado = trasladoEntre(desde.escenario, hasta.escenario);
    const estado: EstadoTramo = libre < 0 ? 'choque' : libre < traslado ? 'justo' : 'ok';
    return { desde, hasta, libre, cambiaEscenario, traslado, estado };
  });

// Todos los pares que se cruzan (no solo los consecutivos).
export const contarChoques = (ruta: Concierto[]): number => {
  let n = 0;
  for (let i = 0; i < ruta.length; i++)
    for (let j = i + 1; j < ruta.length; j++) if (seSolapan(ruta[i], ruta[j])) n++;
  return n;
};

export const minutosDeMusica = (ruta: Concierto[]): number =>
  ruta.reduce((total, c) => total + duracion(c.inicio, c.fin), 0);
