import { buscar } from './ruta';

const CLAVE = 'r';

export const codificarRuta = (ids: Iterable<string>): string => [...ids].sort().join('.');

export const decodificarRuta = (texto: string): string[] =>
  texto.split('.').filter((id) => !!buscar(id));

export const leerRutaDeUrl = (): string[] | null => {
  const valor = new URLSearchParams(location.hash.slice(1)).get(CLAVE);
  return valor ? decodificarRuta(valor) : null;
};

export const enlaceDeRuta = (ids: Iterable<string>): string => {
  const url = new URL(location.href);
  url.hash = `${CLAVE}=${codificarRuta(ids)}`;
  return url.toString();
};
