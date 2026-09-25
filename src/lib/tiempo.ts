export const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const aHora = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const duracion = (inicio: string, fin: string): number => aMinutos(fin) - aMinutos(inicio);

// "1 h 05" / "40 min"
export const formatoDuracion = (min: number): string =>
  min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
