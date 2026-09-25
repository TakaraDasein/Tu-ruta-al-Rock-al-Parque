// Programación Rock al Parque 2026 (30 años), transcrita de los carteles oficiales.
// Si cambia un horario, solo se edita este archivo.

export type DiaId = 'sab' | 'dom' | 'lun';
export type EscenarioId = 'plaza' | 'bio' | 'eco' | 'bbc';

export interface Dia {
  id: DiaId;
  nombre: string;
  numero: number;
  fecha: string; // ISO (YYYY-MM-DD), hora de Bogotá
  color: string;
  colorOscuro: string;
}

export interface Escenario {
  id: EscenarioId;
  nombre: string;
  corto: string;
}

export interface Concierto {
  id: string;
  dia: DiaId;
  escenario: EscenarioId;
  banda: string;
  nota?: string;
  origen: string;
  inicio: string; // HH:MM
  fin: string; // HH:MM
}

export const DIAS: Dia[] = [
  { id: 'sab', nombre: 'Sábado', numero: 10, fecha: '2026-10-10', color: '#e3261c', colorOscuro: '#7a1410' },
  { id: 'dom', nombre: 'Domingo', numero: 11, fecha: '2026-10-11', color: '#d9651b', colorOscuro: '#6e3008' },
  { id: 'lun', nombre: 'Lunes', numero: 12, fecha: '2026-10-12', color: '#1e7a5c', colorOscuro: '#0e3a2c' },
];

export const ESCENARIOS: Escenario[] = [
  { id: 'plaza', nombre: 'Plaza', corto: 'PLZ' },
  { id: 'bio', nombre: 'Bio by Vans', corto: 'BIO' },
  { id: 'eco', nombre: 'Eco', corto: 'ECO' },
  { id: 'bbc', nombre: 'Escenario BBC', corto: 'BBC' },
];

type Fila = [banda: string, origen: string, inicio: string, fin: string, nota?: string];

const CARTEL: Record<DiaId, Record<EscenarioId, Fila[]>> = {
  sab: {
    plaza: [
      ['Solegnium', 'Distrital', '14:00', '14:40'],
      ['Narcocracia', 'Distrital', '14:55', '15:35'],
      ['Vein', 'Distrital', '15:50', '16:30'],
      ['Hellbutcher', 'Suecia', '16:50', '17:40'],
      ['Burning Witches', 'Suiza', '18:00', '18:50'],
      ['Stratovarius', 'Finlandia', '19:15', '20:15'],
      ['Perpetual Warfare', 'Distrital', '20:35', '21:20'],
      ['Apocalyptica', 'Finlandia', '21:45', '22:45'],
    ],
    bio: [
      ['Maskhera', 'Distrital', '15:20', '16:00'],
      ['Ataque de Pánico', 'Distrital', '16:15', '16:55'],
      ['Syracusæ', 'Distrital', '17:15', '17:55'],
      ['Between the Buried and Me', 'Estados Unidos', '18:15', '19:05'],
      ['Valore', 'Distrital', '19:20', '20:00'],
      ['Grave', 'Suecia', '20:20', '21:10'],
      ['Triptykon', 'Suiza', '21:30', '22:30', 'Con clásicos de Hellhammer y Celtic Frost'],
    ],
    eco: [
      ['No Dependiente', 'Distrital', '15:00', '15:40'],
      ['End It', 'Estados Unidos', '15:55', '16:45'],
      ['Agua Bendita', 'España', '17:00', '17:50'],
      ['Nadie', 'Medellín', '18:05', '18:55'],
      ['I.R.A.', 'Medellín', '19:10', '20:00'],
      ['Darkest Hour', 'Estados Unidos', '20:15', '21:15'],
    ],
    bbc: [
      ['Darkness', 'Distrital', '14:50', '15:35'],
      ['El Em3', 'Chile', '15:50', '16:35'],
      ['Real House of Hate', 'Medellín', '16:55', '17:40'],
      ['Kraken', 'Bogotá', '18:00', '18:45'],
      ['Info', 'Bogotá', '19:05', '19:50'],
      ['Pornomotora', 'Bogotá', '20:10', '20:55'],
      ['Los Setas', 'Pasto', '21:15', '22:00'],
    ],
  },
  dom: {
    plaza: [
      ['Niña Lobo', 'Uruguay', '14:00', '14:50'],
      ['Alto Grado', 'Distrital', '15:10', '15:50'],
      ['Claudio Narea Los Prisioneros', 'Chile', '16:15', '17:05'],
      ['Iseo & Dodosound', 'España', '17:30', '18:20'],
      ['Serú Girán', 'Argentina', '18:45', '19:45', 'Por Lebón y Aznar'],
      ['Esteman', 'Bogotá', '20:10', '21:00'],
      ['Mon Laferte', 'Chile/México', '21:30', '22:30'],
    ],
    bio: [
      ['La Brigada RPF', 'Distrital', '14:30', '15:10'],
      ['El Punto Ska', 'Distrital', '15:25', '16:05'],
      ['Desorden Público', 'Venezuela', '16:25', '17:15'],
      ['Tokyo Ska Paradise Orchestra', 'Japón', '17:35', '18:25'],
      ['Green Valley', 'España', '18:45', '19:35'],
      ['Skampida', 'Distrital', '19:50', '20:35'],
      ['Gondwana & Quique Neira', 'Chile', '21:00', '22:00'],
    ],
    eco: [
      ['Brina Quoya', 'Distrital', '14:30', '15:10'],
      ['Elsa Riveros', 'Distrital', '15:25', '16:05'],
      ['Lo Mismo Decían de Juana', 'Distrital', '16:20', '17:00'],
      ['Los Tetas', 'Chile', '17:15', '18:05'],
      ['La Monky Band', 'Distrital', '18:25', '19:05'],
      ['Porter', 'México', '19:25', '20:15'],
      ['Bandalos Chinos', 'Argentina', '20:35', '21:35'],
    ],
    bbc: [
      ['Últimos Nietos', 'Cali', '14:20', '15:05'],
      ['Nawal', 'Bogotá', '15:25', '16:10'],
      ['Wañukta Tonic', 'Ecuador', '16:30', '17:15'],
      ['Margarita Siempre Viva', 'Medellín', '17:35', '18:20'],
      ['Medved', 'Ibagué', '18:35', '19:20'],
      ['Doris Vespa', 'Barranquilla', '19:35', '20:20'],
      ['Nicolai Fella', 'Bogotá', '20:40', '21:25'],
    ],
  },
  lun: {
    plaza: [
      ['Pez Errante', 'Distrital', '14:00', '14:40'],
      ['Lutter', 'Distrital', '14:55', '15:35'],
      ['División Minúscula', 'México', '16:00', '16:50'],
      ['Ratones Paranoicos', 'Argentina', '17:10', '18:00'],
      ['Boca de Serpiente', 'Distrital', '18:20', '19:00'],
      ['Ministry', 'Estados Unidos', '19:30', '20:30'],
      ['Rata Blanca', 'Argentina', '21:00', '22:00'],
    ],
    bio: [
      ['Las Fokin Biches', 'México', '14:00', '14:50'],
      ['Sistema de Entretenimiento', 'España', '15:05', '15:55'],
      ['Trotsky Vengarán', 'Uruguay', '16:10', '17:00'],
      ['V for Volume', 'Distrital', '17:15', '17:55'],
      ['Stayway', 'Distrital', '18:10', '18:50'],
      ['Editors', 'Inglaterra', '19:10', '20:10'],
      ['Los Bunkers', 'Chile', '20:30', '21:30'],
    ],
    eco: [
      ['Casi', 'Distrital', '15:00', '15:40'],
      ['Algiers', 'Estados Unidos', '16:00', '16:50'],
      ['Lika Nova', 'Distrital', '17:05', '17:45'],
      ['Alcalá Norte', 'España', '18:00', '18:50'],
      ['Laura Pérez', 'Distrital', '19:05', '19:45'],
      ['Lucio Feuillet', 'Distrital', '20:00', '20:40'],
    ],
    bbc: [
      ['The Klaxon', 'Bogotá', '14:00', '14:45'],
      ['La Severa Matacera', 'Bogotá', '15:05', '15:50'],
      ['Tizishi', 'Argentina', '16:10', '16:55'],
      ['Zalama Crew', 'Cali', '17:15', '18:00'],
      ['Los Elefantes', 'Bogotá', '18:20', '19:05'],
      ['Ghetto Kumbé', 'Bogotá', '19:25', '20:10'],
      ['Kill the Clowns', 'México', '20:30', '21:15'],
    ],
  },
};

// Ids cortos y estables (p. ej. "sab-eco-3") para URLs y localStorage.
export const CONCIERTOS: Concierto[] = DIAS.flatMap((dia) =>
  ESCENARIOS.flatMap((esc) =>
    CARTEL[dia.id][esc.id].map(([banda, origen, inicio, fin, nota], i) => ({
      id: `${dia.id}-${esc.id}-${i + 1}`,
      dia: dia.id,
      escenario: esc.id,
      banda,
      nota,
      origen,
      inicio,
      fin,
    })),
  ),
);

// Ventana horaria que cubre la parrilla (en minutos desde medianoche).
export const HORA_INICIO = 14 * 60;
export const HORA_FIN = 23 * 60;
