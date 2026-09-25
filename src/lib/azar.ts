// PRNG con semilla (mulberry32): las salpicaduras salen iguales en cada render.
export const crearAzar = (semilla: number) => () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export interface Gota {
  x: number;
  y: number;
  r: number;
  o: number;
}

// Manchas agrupadas en racimos, como pintura en aerosol.
export const generarSalpicaduras = (semilla: number, ancho: number, alto: number, racimos = 14): Gota[] => {
  const azar = crearAzar(semilla);
  const gotas: Gota[] = [];
  for (let k = 0; k < racimos; k++) {
    const cx = azar() * ancho;
    const cy = azar() * alto;
    const radio = 30 + azar() * 140;
    const n = 12 + Math.floor(azar() * 40);
    for (let i = 0; i < n; i++) {
      const ang = azar() * Math.PI * 2;
      const dist = Math.pow(azar(), 1.8) * radio;
      gotas.push({
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist,
        r: 0.8 + Math.pow(azar(), 3) * 9,
        o: 0.55 + azar() * 0.45,
      });
    }
  }
  return gotas;
};
