import { DIAS, ESCENARIOS, HORA_FIN, HORA_INICIO, type DiaId, type EscenarioId } from '../data/programacion';
import { POSICION_ESCENARIO } from '../data/mapa';
import { enlaceDeRuta, leerRutaDeUrl } from '../lib/compartir';
import { exportarIcs, exportarImagen } from '../lib/exportar';
import { contarChoques, minutosDeMusica, rutaDelDia, seSolapan, tramos, buscar, type Tramo } from '../lib/ruta';
import { formatoDuracion } from '../lib/tiempo';
import { imagenDe, iniciales } from '../lib/imagenes';
import { medir } from '../lib/metricas';

const CLAVE_RUTA = 'ruta-rap-2026';
const CLAVE_DIA = 'ruta-rap-2026-dia';
const CLAVE_VISTA = 'ruta-rap-2026-vista';
const SVG = 'http://www.w3.org/2000/svg';

/* ───────────── Estado ───────────── */

const leer = (clave: string) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};
const escribir = (clave: string, valor: string) => {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* modo privado: la ruta vive solo en esta pestaña */
  }
};

const seleccion = new Set<string>(
  (() => {
    try {
      return (JSON.parse(leer(CLAVE_RUTA) ?? '[]') as string[]).filter((id) => buscar(id));
    } catch {
      return [];
    }
  })(),
);

const diaInicial = (): DiaId => {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const guardado = DIAS.find((d) => d.id === leer(CLAVE_DIA))?.id;
  return DIAS.find((d) => d.fecha === hoy)?.id ?? guardado ?? 'sab';
};
let diaActivo: DiaId = diaInicial();

const guardar = () => escribir(CLAVE_RUTA, JSON.stringify([...seleccion]));

type Filtro = 'todos' | 'ruta' | EscenarioId;
let filtro: Filtro = 'todos';
let vista: 'lista' | 'parrilla' = leer(CLAVE_VISTA) === 'parrilla' ? 'parrilla' : 'lista';

/* ───────────── Referencias al DOM ───────────── */

const $ = <T extends Element>(sel: string, raiz: ParentNode = document) => raiz.querySelector<T>(sel)!;
const $$ = <T extends Element>(sel: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(sel)];

// Cada concierto existe dos veces: nodo de la parrilla y opción de la lista móvil.
const nodos = $$<HTMLButtonElement>('button[data-id]');
const listas = $$<HTMLElement>('[data-lista]');
const pestanas = $$<HTMLButtonElement>('[data-tab]');
const parrillas = $$<HTMLElement>('[data-parrilla]');
const panel = $<HTMLElement>('[data-panel]');
const cadena = $<HTMLOListElement>('[data-cadena]');
const aviso = $<HTMLElement>('[data-aviso]');

const escenario = (id: string) => ESCENARIOS.find((e) => e.id === id)!;
const escapar = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

let temporizadorAviso = 0;
const avisar = (texto: string) => {
  aviso.textContent = texto;
  aviso.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = window.setTimeout(() => aviso.classList.remove('visible'), 2200);
};

const textoTramo = (t: Tramo) => {
  if (t.estado === 'choque') return `Choque · se cruzan ${-t.libre} min`;
  const destino = t.cambiaEscenario ? ` → ${escenario(t.hasta.escenario).nombre}` : ' · mismo escenario';
  return t.estado === 'justo'
    ? `¡Corre! ${t.libre} min y caminas ~${t.traslado}${destino}`
    : `${formatoDuracion(t.libre)} libres${destino}`;
};

const fotoEslabon = (banda: string) => {
  const img = imagenDe(banda);
  return img
    ? `<img class="eslabon-foto es-${img.tipo}" src="/${img.archivo}" alt="" loading="lazy" />`
    : `<span class="eslabon-foto sin-imagen" aria-hidden="true">${escapar(iniciales(banda))}</span>`;
};

/* ───────────── Render ───────────── */

const pintarNodos = () => {
  const porDia = new Map(DIAS.map((d) => [d.id, rutaDelDia(seleccion, d.id)]));
  for (const boton of nodos) {
    const c = buscar(boton.dataset.id!)!;
    const ruta = porDia.get(c.dia)!;
    const elegido = seleccion.has(c.id);
    const cruzados = ruta.filter((otro) => otro.id !== c.id && seSolapan(c, otro));
    boton.setAttribute('aria-pressed', String(elegido));
    boton.classList.toggle('choca', !elegido && cruzados.length > 0);
    boton.classList.toggle('en-choque', elegido && cruzados.length > 0);
    boton.querySelector('.nodo-num, .opcion-nodo')!.textContent = elegido ? String(ruta.indexOf(c) + 1) : '';
    const nota = boton.querySelector('[data-choque]');
    if (nota) nota.textContent = cruzados.length ? `Se cruza con ${cruzados.map((o) => o.banda).join(', ')}` : '';
  }
  for (const d of DIAS) {
    const cuenta = $<HTMLElement>(`[data-cuenta="${d.id}"]`);
    const n = porDia.get(d.id)!.length;
    cuenta.textContent = String(n);
    cuenta.toggleAttribute('data-vacia', n === 0);
  }
};

const pintarPanel = () => {
  const dia = DIAS.find((d) => d.id === diaActivo)!;
  const ruta = rutaDelDia(seleccion, diaActivo);
  const saltos = tramos(ruta);
  const choques = contarChoques(ruta);

  $('[data-panel-dia]').textContent = `${dia.nombre} ${dia.numero} de octubre`;
  $('[data-stat="conciertos"]').textContent = String(ruta.length);
  $('[data-stat="musica"]').textContent = formatoDuracion(minutosDeMusica(ruta));
  const statChoques = $<HTMLElement>('[data-stat="choques"]');
  statChoques.textContent = String(choques);
  statChoques.toggleAttribute('data-alerta', choques > 0);
  $<HTMLElement>('[data-vacio]').hidden = ruta.length > 0;
  $('[data-asa-resumen]').textContent =
    `${dia.nombre.slice(0, 3)} · ${ruta.length} concierto${ruta.length === 1 ? '' : 's'}${choques ? ` · ${choques} choque${choques > 1 ? 's' : ''}` : ''}`;

  for (const accion of ['imagen', 'limpiar'])
    $<HTMLButtonElement>(`[data-accion="${accion}"]`).disabled = ruta.length === 0;
  for (const accion of ['calendario', 'enlace'])
    $<HTMLButtonElement>(`[data-accion="${accion}"]`).disabled = seleccion.size === 0;

  cadena.innerHTML = ruta
    .map((c, i) => {
      const enChoque = ruta.some((o) => o !== c && seSolapan(c, o));
      const t = saltos[i];
      return `
        <li class="eslabon${enChoque ? ' en-choque' : ''}">
          <span class="eslabon-num">${i + 1}</span>
          ${fotoEslabon(c.banda)}
          <button class="eslabon-ir" type="button" data-ir="${c.id}">
            <span class="eslabon-banda">${escapar(c.banda)}</span>
            <span class="eslabon-meta">${c.inicio}–${c.fin} · ${escapar(escenario(c.escenario).nombre)} · ${escapar(c.origen)}</span>
          </button>
          <button class="eslabon-quitar" type="button" data-quitar="${c.id}" aria-label="Quitar ${escapar(c.banda)}">×</button>
        </li>
        ${t ? `<li class="salto ${t.estado}" aria-label="${escapar(textoTramo(t))}">${escapar(textoTramo(t))}</li>` : ''}`;
    })
    .join('');
};

// Conecta los nodos elegidos: de la salida (abajo) de uno a la entrada (arriba) del siguiente.
const pintarEnlaces = () => {
  const parrilla = parrillas.find((p) => p.dataset.parrilla === diaActivo);
  if (!parrilla) return;
  const lienzo = $<HTMLElement>('[data-lienzo]', parrilla);
  const svg = $<SVGSVGElement>('[data-enlaces]', parrilla);
  const base = lienzo.getBoundingClientRect();
  svg.replaceChildren();

  const punto = (id: string, cual: 'in' | 'out') => {
    const r = $(`.nodo[data-id="${id}"] .puerto-${cual}`, parrilla).getBoundingClientRect();
    return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
  };

  for (const t of tramos(rutaDelDia(seleccion, diaActivo))) {
    const a = punto(t.desde.id, 'out');
    const b = punto(t.hasta.id, 'in');
    const curva = Math.max(40, Math.abs(b.y - a.y) / 2);
    const d = `M${a.x},${a.y} C${a.x},${a.y + curva} ${b.x},${b.y - curva} ${b.x},${b.y}`;

    for (const clase of ['tramo-fondo', `tramo ${t.estado}`]) {
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', clase);
      svg.append(path);
    }

    const etiqueta = t.estado === 'choque' ? 'CHOQUE' : t.estado === 'justo' ? `¡CORRE! ${t.libre}′` : `+${t.libre}′`;
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', `etiqueta ${t.estado}`);
    const texto = document.createElementNS(SVG, 'text');
    texto.textContent = etiqueta;
    texto.setAttribute('text-anchor', 'middle');
    texto.setAttribute('dominant-baseline', 'central');
    texto.setAttribute('x', String((a.x + b.x) / 2));
    texto.setAttribute('y', String((a.y + b.y) / 2));
    const rect = document.createElementNS(SVG, 'rect');
    g.append(rect, texto);
    svg.append(g);
    const caja = texto.getBBox();
    rect.setAttribute('x', String(caja.x - 6));
    rect.setAttribute('y', String(caja.y - 3));
    rect.setAttribute('width', String(caja.width + 12));
    rect.setAttribute('height', String(caja.height + 6));
  }
};

let marco = 0;
const programarEnlaces = () => {
  cancelAnimationFrame(marco);
  marco = requestAnimationFrame(pintarEnlaces);
};

// En el mapa: orden de paso por cada escenario y flechas de cada cambio de escenario.
const pintarMapa = () => {
  const ruta = rutaDelDia(seleccion, diaActivo);
  const capa = $<SVGGElement>('[data-mapa-ruta]');
  capa.replaceChildren();

  for (const marca of $$<SVGGElement>('[data-marca]')) {
    const orden = ruta.flatMap((c, i) => (c.escenario === marca.dataset.marca ? [i + 1] : []));
    marca.classList.toggle('en-ruta', orden.length > 0);
    $('[data-orden]', marca).textContent = orden.join('·');
  }

  const usados = new Map<string, number>();
  let caminata = 0;
  for (const t of tramos(ruta)) {
    if (!t.cambiaEscenario) continue;
    caminata += t.traslado;
    const a = POSICION_ESCENARIO[t.desde.escenario];
    const b = POSICION_ESCENARIO[t.hasta.escenario];
    const par = [t.desde.escenario, t.hasta.escenario].sort().join('|');
    const veces = usados.get(par) ?? 0;
    usados.set(par, veces + 1);

    // Curvas separadas para idas y vueltas por el mismo par de escenarios.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const largo = Math.hypot(dx, dy);
    const ux = dx / largo;
    const uy = dy / largo;
    const curva = 22 + veces * 14;
    const cx = (a.x + b.x) / 2 - uy * curva;
    const cy = (a.y + b.y) / 2 + ux * curva;
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', `M${a.x + ux * 20},${a.y + uy * 20} Q${cx},${cy} ${b.x - ux * 24},${b.y - uy * 24}`);
    path.setAttribute('class', `salto-mapa ${t.estado}`);
    path.setAttribute('marker-end', 'url(#flecha)');
    capa.append(path);

    const min = document.createElementNS(SVG, 'text');
    min.setAttribute('class', 'minutos-mapa');
    min.setAttribute('x', String((a.x + b.x) / 4 + cx / 2));
    min.setAttribute('y', String((a.y + b.y) / 4 + cy / 2 + 4));
    min.textContent = `${t.traslado}′`;
    capa.append(min);
  }
  $('[data-caminata]').textContent = caminata
    ? `Caminata estimada entre escenarios: ~${caminata} min`
    : 'Tus cambios de escenario aparecerán aquí.';
};

const aplicarFiltro = () => {
  for (const lista of listas) {
    let visibles = 0;
    for (const franja of $$<HTMLElement>('[data-franja]', lista)) {
      let enFranja = 0;
      for (const item of $$<HTMLElement>('[data-item]', franja)) {
        const id = $<HTMLElement>('[data-id]', item).dataset.id!;
        const ver = filtro === 'todos' || (filtro === 'ruta' ? seleccion.has(id) : item.dataset.esc === filtro);
        item.hidden = !ver;
        if (ver) enFranja++;
      }
      franja.hidden = enFranja === 0;
      visibles += enFranja;
    }
    $<HTMLElement>('[data-lista-vacia]', lista).hidden = visibles > 0;
  }
  for (const b of $$<HTMLButtonElement>('[data-filtro]')) b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro));
};

const aplicarVista = () => {
  document.body.dataset.vista = vista;
  for (const b of $$<HTMLButtonElement>('[data-vista]')) b.setAttribute('aria-pressed', String(b.dataset.vista === vista));
  programarEnlaces();
};

const render = () => {
  pintarNodos();
  pintarPanel();
  pintarMapa();
  if (filtro === 'ruta') aplicarFiltro();
  programarEnlaces();
};

/* ───────────── Día activo ───────────── */

const activarDia = (id: DiaId) => {
  diaActivo = id;
  escribir(CLAVE_DIA, id);
  const dia = DIAS.find((d) => d.id === id)!;
  document.body.dataset.dia = id;
  document.body.style.setProperty('--dia', dia.color);
  document.body.style.setProperty('--dia-oscuro', dia.colorOscuro);
  for (const p of pestanas) {
    const activa = p.dataset.tab === id;
    p.setAttribute('aria-selected', String(activa));
    p.tabIndex = activa ? 0 : -1;
  }
  for (const p of parrillas) p.hidden = p.dataset.parrilla !== id;
  for (const l of listas) l.hidden = l.dataset.lista !== id;
  marcarAhora();
  render();
};

// Línea amarilla con la hora actual si hoy es día de festival.
const marcarAhora = () => {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  for (const p of parrillas) {
    const linea = $<HTMLElement>('[data-ahora]', p);
    const dia = DIAS.find((d) => d.id === p.dataset.parrilla)!;
    const visible = dia.fecha === hoy && minutos >= HORA_INICIO && minutos <= HORA_FIN;
    linea.hidden = !visible;
    if (visible) linea.style.setProperty('--ahora', String(minutos - HORA_INICIO));
  }
};

/* ───────────── Eventos ───────────── */

for (const boton of nodos) {
  boton.addEventListener('click', () => {
    const id = boton.dataset.id!;
    const c = buscar(id)!;
    if (seleccion.has(id)) {
      seleccion.delete(id);
    } else {
      seleccion.add(id);
      medir('concierto-agregado', { dia: c.dia, escenario: c.escenario, banda: c.banda });
      const cruce = rutaDelDia(seleccion, c.dia).find((o) => o.id !== id && seSolapan(c, o));
      if (cruce) avisar(`Ojo: se cruza con ${cruce.banda}`);
    }
    guardar();
    render();
  });
}

for (const p of pestanas) p.addEventListener('click', () => activarDia(p.dataset.tab as DiaId));

// Flechas para moverse entre pestañas (patrón ARIA tabs).
$('[role="tablist"]').addEventListener('keydown', (e) => {
  const ev = e as KeyboardEvent;
  if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
  const i = DIAS.findIndex((d) => d.id === diaActivo);
  const siguiente = DIAS[(i + (ev.key === 'ArrowRight' ? 1 : DIAS.length - 1)) % DIAS.length];
  activarDia(siguiente.id);
  pestanas.find((p) => p.dataset.tab === siguiente.id)?.focus();
});

cadena.addEventListener('click', (e) => {
  const objetivo = e.target as HTMLElement;
  const quitar = objetivo.closest<HTMLElement>('[data-quitar]');
  if (quitar) {
    seleccion.delete(quitar.dataset.quitar!);
    guardar();
    render();
    return;
  }
  const ir = objetivo.closest<HTMLElement>('[data-ir]');
  if (ir) {
    const nodo = $$<HTMLElement>(`button[data-id="${ir.dataset.ir}"]`).find((b) => b.offsetParent !== null);
    if (!nodo) return;
    panel.classList.remove('abierto');
    nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nodo.classList.remove('destello');
    void nodo.offsetWidth;
    nodo.classList.add('destello');
  }
});

for (const b of $$<HTMLButtonElement>('[data-filtro]'))
  b.addEventListener('click', () => {
    filtro = b.dataset.filtro as Filtro;
    aplicarFiltro();
  });

for (const b of $$<HTMLButtonElement>('[data-vista]'))
  b.addEventListener('click', () => {
    vista = b.dataset.vista as typeof vista;
    medir('cambiar-vista', { vista });
    escribir(CLAVE_VISTA, vista);
    aplicarVista();
  });

$('[data-asa]').addEventListener('click', (e) => {
  const abierto = panel.classList.toggle('abierto');
  (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(abierto));
});

$('[data-accion="imagen"]').addEventListener('click', async (e) => {
  const boton = e.currentTarget as HTMLButtonElement;
  boton.disabled = true;
  boton.textContent = 'Generando…';
  try {
    medir('exportar-imagen', { dia: diaActivo, conciertos: rutaDelDia(seleccion, diaActivo).length });
    await exportarImagen(seleccion, diaActivo);
  } catch {
    avisar('No se pudo generar la imagen');
  } finally {
    boton.textContent = 'Exportar imagen';
    boton.disabled = false;
  }
});

$('[data-accion="calendario"]').addEventListener('click', () => {
  exportarIcs(seleccion);
  medir('exportar-calendario', { conciertos: seleccion.size });
  avisar('Calendario descargado');
});

$('[data-accion="enlace"]').addEventListener('click', async () => {
  const enlace = enlaceDeRuta(seleccion);
  medir('copiar-enlace', { conciertos: seleccion.size });
  try {
    await navigator.clipboard.writeText(enlace);
    avisar('Enlace copiado');
  } catch {
    prompt('Copia tu enlace:', enlace);
  }
});

$('[data-accion="limpiar"]').addEventListener('click', () => {
  const dia = DIAS.find((d) => d.id === diaActivo)!;
  if (!confirm(`¿Borrar tu ruta del ${dia.nombre.toLowerCase()}?`)) return;
  for (const c of rutaDelDia(seleccion, diaActivo)) seleccion.delete(c.id);
  guardar();
  render();
});

new ResizeObserver(programarEnlaces).observe(document.body);
document.fonts.ready.then(programarEnlaces);
setInterval(marcarAhora, 60_000);

/* ───────────── Arranque ───────────── */

// Ruta compartida por enlace (#r=...): se carga y se limpia la URL.
const compartida = leerRutaDeUrl();
if (compartida?.length) {
  const igual = compartida.length === seleccion.size && compartida.every((id) => seleccion.has(id));
  if (!igual && (seleccion.size === 0 || confirm('Abriste una ruta compartida. ¿Reemplazar tu ruta actual con ella?'))) {
    seleccion.clear();
    compartida.forEach((id) => seleccion.add(id));
    guardar();
    diaActivo = DIAS.find((d) => rutaDelDia(compartida, d.id).length)?.id ?? diaActivo;
    setTimeout(() => avisar('Ruta compartida cargada'), 300);
    medir('abrir-ruta-compartida', { conciertos: compartida.length });
  }
  history.replaceState(null, '', location.pathname + location.search);
}

aplicarVista();
activarDia(diaActivo);
