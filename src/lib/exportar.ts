import { DIAS, ESCENARIOS, type DiaId } from '../data/programacion';
import { generarSalpicaduras } from './azar';
import { contarChoques, minutosDeMusica, rutaDelDia, tramos } from './ruta';
import { formatoDuracion } from './tiempo';
import { imagenDe } from './imagenes';
import { AUTOR } from '../data/autor';

const cargarImagen = (src: string) =>
  new Promise<HTMLImageElement | null>((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });

// Recorte tipo "cover" (fotos) o "contain" (logos) dentro de un cuadro.
const dibujarImagen = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, lado: number, cubrir: boolean) => {
  const escala = cubrir ? Math.max(lado / img.width, lado / img.height) : Math.min(lado / img.width, lado / img.height) * 0.86;
  const w = img.width * escala;
  const h = img.height * escala;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, lado, lado);
  ctx.clip();
  ctx.drawImage(img, x + (lado - w) / 2, y + (lado - h) / (cubrir ? 3 : 2), w, h);
  ctx.restore();
};

const nombreEscenario = (id: string) => ESCENARIOS.find((e) => e.id === id)?.nombre ?? id;
const diaDe = (id: DiaId) => DIAS.find((d) => d.id === id)!;

const descargar = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ───────────── Calendario (.ics) ───────────── */

// Bogotá es UTC-5 todo el año (sin horario de verano).
const aUtc = (fecha: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCHours(h + 5, m);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

const escaparIcs = (t: string) => t.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export const exportarIcs = (ids: Iterable<string>) => {
  const lista = [...ids];
  const eventos = DIAS.flatMap((dia) =>
    rutaDelDia(lista, dia.id).map((c) =>
      [
        'BEGIN:VEVENT',
        `UID:${c.id}@ruta-rock-al-parque`,
        `DTSTAMP:${aUtc('2026-01-01', '00:00')}`,
        `DTSTART:${aUtc(dia.fecha, c.inicio)}`,
        `DTEND:${aUtc(dia.fecha, c.fin)}`,
        `SUMMARY:${escaparIcs(`🤘 ${c.banda} · ${nombreEscenario(c.escenario)}`)}`,
        `DESCRIPTION:${escaparIcs([c.origen, c.nota].filter(Boolean).join(' · '))}`,
        `LOCATION:${escaparIcs(`Escenario ${nombreEscenario(c.escenario)}, Parque Metropolitano Simón Bolívar, Bogotá`)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escaparIcs(`${c.banda} en 15 min`)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'),
    ),
  );
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruta Rock al Parque//ES',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Mi ruta · Rock al Parque 2026',
    `X-WR-CALDESC:${escaparIcs(`Ruta armada con la herramienta de ${AUTOR.arroba} · ${AUTOR.instagram}`)}`,
    ...eventos,
    'END:VCALENDAR',
  ].join('\r\n');
  descargar(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'mi-ruta-rock-al-parque.ics');
};

/* ───────────── Imagen tipo historia (PNG 1080×1920) ───────────── */

const W = 1080;
const H = 1920;
const TINTA = '#1b2a24';
const CREMA = '#f1ecd0';
const FONDO_HEADER = '#1f3d33';
const DISPLAY = '"Alfa Slab One", Georgia, serif';
const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';

// Reduce el tamaño de letra hasta que el texto quepa en `max` líneas de `ancho`.
const ajustarTexto = (ctx: CanvasRenderingContext2D, texto: string, ancho: number, tam: number, max: number, altoMax = Infinity) => {
  for (let t = tam; t >= 18; t -= 2) {
    ctx.font = `${t}px ${DISPLAY}`;
    const lineas: string[] = [];
    let actual = '';
    for (const palabra of texto.toUpperCase().split(' ')) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (ctx.measureText(prueba).width <= ancho) actual = prueba;
      else {
        if (actual) lineas.push(actual);
        actual = palabra;
      }
    }
    lineas.push(actual);
    const cabe = lineas.length * t * 1.08 + 24 <= altoMax;
    if (cabe && lineas.length <= max && lineas.every((l) => ctx.measureText(l).width <= ancho)) return { lineas, tam: t };
  }
  return { lineas: [texto.toUpperCase()], tam: 18 };
};

const chip = (ctx: CanvasRenderingContext2D, x: number, y: number, texto: string, fondo: string, color: string, tam: number) => {
  ctx.font = `600 ${tam}px ${COND}`;
  const w = ctx.measureText(texto).width + tam * 0.8;
  const h = tam * 1.35;
  ctx.fillStyle = fondo;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x + tam * 0.4, y + h / 2 + 1);
  return w;
};

export const generarImagen = async (ids: Iterable<string>, diaId: DiaId): Promise<Blob> => {
  await Promise.all([
    document.fonts.load(`64px ${DISPLAY}`),
    document.fonts.load(`600 32px ${COND}`),
    document.fonts.load(`700 32px ${COND}`),
  ]);
  const dia = diaDe(diaId);
  const ruta = rutaDelDia(ids, diaId);
  const saltos = tramos(ruta);
  const fotos = await Promise.all(
    ruta.map((c) => {
      const img = imagenDe(c.banda);
      return img ? cargarImagen(`/${img.archivo}`).then((el) => (el ? { el, cubrir: img.tipo === 'foto' } : null)) : null;
    }),
  );

  const logo = await cargarImagen('/marca/logo-rap-30.png');
  const lienzo = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = lienzo.getContext('2d')!;

  // Fondo: papel de cartel, como la web.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#ece2c8');
  grad.addColorStop(0.55, '#e2d3b0');
  grad.addColorStop(1, '#d6c29a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  for (const g of generarSalpicaduras(dia.numero * 97, W, H, 18)) {
    ctx.globalAlpha = g.o * 0.85;
    ctx.fillStyle = '#e3261c';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Cabecera
  const hx = 70;
  ctx.fillStyle = FONDO_HEADER;
  ctx.fillRect(hx, 90, W - hx * 2, 150);
  ctx.fillStyle = CREMA;
  ctx.font = `92px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.fillText('MI RUTA', hx + 40, 168);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = dia.color;
  ctx.fillRect(hx, 240, W - hx * 2, 64);
  ctx.fillStyle = CREMA;
  ctx.font = `700 38px ${COND}`;
  ctx.letterSpacing = '4px';
  ctx.fillText(`${dia.nombre.toUpperCase()} ${dia.numero} DE OCTUBRE · ROCK AL PARQUE 2026`, hx + 40, 274);
  ctx.letterSpacing = '0px';
  // Logo oficial sobre la cabecera (se dibuja al final para que nada lo tape).
  if (logo) {
    const alto = 176;
    const ancho = (logo.width / logo.height) * alto;
    ctx.save();
    ctx.translate(W - hx - ancho / 2 - 16, 158);
    ctx.rotate(-0.06);
    ctx.drawImage(logo, -ancho / 2, -alto / 2, ancho, alto);
    ctx.restore();
  }

  // Cadena de nodos
  const top = 380;
  const bottom = H - 230;
  const ejeX = 250;
  const n = Math.max(ruta.length, 1);
  const paso = Math.min(210, (bottom - top) / n);
  const alto = Math.min(170, paso - 34);

  if (ruta.length === 0) {
    ctx.fillStyle = TINTA;
    ctx.font = `48px ${DISPLAY}`;
    ctx.fillText('AÚN SIN CONCIERTOS', hx, top + 80);
  }

  if (ruta.length > 1) {
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(ejeX, top + alto / 2);
    ctx.lineTo(ejeX, top + paso * (ruta.length - 1) + alto / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ruta.forEach((c, i) => {
    const y = top + i * paso;
    const cy = y + alto / 2;

    // Hora a la izquierda del eje
    ctx.fillStyle = TINTA;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.min(52, alto * 0.42)}px ${COND}`;
    ctx.fillText(c.inicio, ejeX - 40, cy);
    ctx.textAlign = 'left';

    // Nodo
    const choca = saltos.some((t) => t.estado === 'choque' && (t.desde === c || t.hasta === c));
    ctx.fillStyle = choca ? '#e3261c' : CREMA;
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(ejeX, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = TINTA;
    ctx.font = `700 24px ${COND}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), ejeX, cy + 1);
    ctx.textAlign = 'left';

    // Tarjeta
    const x = ejeX + 50;
    const foto = fotos[i];
    // Cuadro de la foto a la derecha de la tarjeta, del alto completo de la tarjeta.
    const ladoFoto = foto ? Math.min(alto, 170) : 0;
    const ancho = W - x - hx - ladoFoto;
    const tamChip = Math.min(28, alto * 0.19);
    const altoChips = tamChip * 1.35;
    // El nombre + los chips nunca superan `alto`, así no pisan la etiqueta del tramo.
    const texto = ajustarTexto(ctx, c.banda, ancho - 40, Math.min(58, alto * 0.36), 2, alto - altoChips);
    const altoNombre = texto.lineas.length * texto.tam * 1.08 + 24;
    const yNombre = cy - (altoNombre + altoChips) / 2;

    ctx.fillStyle = dia.color;
    ctx.fillRect(x, yNombre, ancho, altoNombre);
    ctx.fillStyle = CREMA;
    ctx.font = `${texto.tam}px ${DISPLAY}`;
    ctx.textBaseline = 'top';
    texto.lineas.forEach((l, k) => ctx.fillText(l, x + 20, yNombre + 14 + k * texto.tam * 1.08));

    ctx.fillStyle = TINTA;
    ctx.fillRect(x, yNombre + altoNombre, ancho, altoChips);
    let cx = x;
    cx += chip(ctx, cx, yNombre + altoNombre, c.origen.toUpperCase(), CREMA, TINTA, tamChip);
    cx += chip(ctx, cx, yNombre + altoNombre, `${c.inicio} - ${c.fin}`, TINTA, CREMA, tamChip);
    chip(ctx, cx, yNombre + altoNombre, nombreEscenario(c.escenario).toUpperCase(), dia.colorOscuro, CREMA, tamChip);

    if (foto) {
      const fy = cy - ladoFoto / 2;
      ctx.fillStyle = foto.cubrir ? dia.colorOscuro : CREMA;
      ctx.fillRect(x + ancho, fy, ladoFoto, ladoFoto);
      dibujarImagen(ctx, foto.el, x + ancho, fy, ladoFoto, foto.cubrir);
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = 4;
      ctx.strokeRect(x + ancho, fy, ladoFoto, ladoFoto);
    }

    // Etiqueta del tramo hacia el siguiente
    const t = saltos[i];
    if (t && paso - alto > 28) {
      const texto =
        t.estado === 'choque' ? 'CHOQUE' : t.cambiaEscenario ? `+${t.libre}′ → ${nombreEscenario(t.hasta.escenario).toUpperCase()}` : `+${t.libre}′`;
      const ty = y + alto + (paso - alto) / 2 - 16;
      chip(ctx, ejeX + 24, ty, texto, t.estado === 'ok' ? TINTA : '#e3261c', CREMA, 22);
    }
  });

  // Pie
  const choques = contarChoques(ruta);
  ctx.fillStyle = '#f08a24';
  ctx.fillRect(0, H - 170, W, 170);
  ctx.fillStyle = TINTA;
  ctx.textBaseline = 'middle';
  ctx.font = `44px ${DISPLAY}`;
  ctx.fillText(`${ruta.length} CONCIERTOS · ${formatoDuracion(minutosDeMusica(ruta)).toUpperCase()}`, hx, H - 110);
  ctx.font = `600 30px ${COND}`;
  ctx.fillText(
    choques ? `${choques} choque${choques > 1 ? 's' : ''} de horario · crea la tuya` : 'Crea la tuya · ruta no oficial',
    hx,
    H - 58,
  );

  // Firma del autor, abajo a la derecha: glifo de Instagram + usuario.
  ctx.font = `700 34px ${COND}`;
  ctx.textAlign = 'right';
  const firmaX = W - hx;
  ctx.fillText(AUTOR.arroba, firmaX, H - 58);
  const anchoFirma = ctx.measureText(AUTOR.arroba).width;
  ctx.textAlign = 'left';
  const gx = firmaX - anchoFirma - 46;
  const gy = H - 58 - 17;
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(gx, gy, 34, 34, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gx + 17, gy + 17, 7.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gx + 26.5, gy + 7.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'));
};

export const exportarImagen = async (ids: Iterable<string>, diaId: DiaId) => {
  const blob = await generarImagen(ids, diaId);
  const nombre = `mi-ruta-${diaId}-rock-al-parque.png`;
  const archivo = new File([blob], nombre, { type: 'image/png' });
  // En el celular abre el menú de compartir (historias, WhatsApp…); en escritorio, descarga.
  if (navigator.canShare?.({ files: [archivo] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({
        files: [archivo],
        title: 'Mi ruta · Rock al Parque',
        text: `Mi ruta para Rock al Parque 2026 🤘 Hecha con la herramienta de ${AUTOR.arroba}`,
      });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  descargar(blob, nombre);
};
