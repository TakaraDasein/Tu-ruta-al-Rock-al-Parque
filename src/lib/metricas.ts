// Métricas anónimas con Umami (sin cookies, sin datos personales).
// Si PUBLIC_UMAMI_ID no está configurado, el script no se carga y esto no hace nada.

type Datos = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (evento: string, datos?: Datos) => void };
  }
}

export const medir = (evento: string, datos?: Datos) => {
  try {
    window.umami?.track(evento, datos);
  } catch {
    /* las métricas nunca deben romper la herramienta */
  }
};
