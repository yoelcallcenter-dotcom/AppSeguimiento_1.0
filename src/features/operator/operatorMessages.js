/**
 * operatorMessages.js
 * Saludos de bienvenida y mensajes de aliento para "Mi Espacio" (v1.3.0).
 * Lógica pura y testeable. Usa día, hora y nombre corto del operador.
 */

// ---- MAÑANA (6–12hs) ----
export const MORNING_GREETINGS = [
  { id: "gm1", text: (n) => `Buenos días{name}. Arrancá con buena energía que hoy hay cosas por hacer.` },
  { id: "gm2", text: (n) => `¡Hola{name}! ¿Lista la agenda? A comenzar el día.` },
  { id: "gm3", text: (n) => `Buen día{name}. El café listo y el primer caso también. ¡Vamos!` },
  { id: "gm4", text: (n) => `¡Arrancamos{name}! Hoy es {day} y hay mucho por delante.` },
  { id: "gm5", text: (n) => `Hola{name}, buen {day}. Pongámosle pilas desde temprano.` },
  { id: "gm6", text: (n) => `Buenos días{name}. Un {day} nuevo para sumar resultados.` },
  { id: "gm7", text: (n) => `¡{day} por delante{name}! Empecemos con todo.` },
  { id: "gm8", text: (n) => `Hola{name}, es {day}. A ponerse las pilas y adelante.` },
  { id: "gm9", text: (n) => `Buen día{name}. Hoy toca dar lo mejor en cada llamado.` },
  { id: "gm10", text: (n) => `¡Buenos días{name}! Empezá el día con foco que después todo fluye.` },
];

// ---- TARDE (12–19hs) ----
export const AFTERNOON_GREETINGS = [
  { id: "gt1", text: (n) => `Hola{name}, ya estamos a mitad del día. ¿Cómo viene la cosa?` },
  { id: "gt2", text: (n) => `Buenas{name}. ¿Cómo va la tarde? Aprovechar lo que queda.` },
  { id: "gt3", text: (n) => `Hola{name}, ya estamos en la recta final del día. ¡Dale que se puede!` },
  { id: "gt4", text: (n) => `Buenas tardes{name}. ¿Cómo van los números de hoy? ¡Seguí así!` },
  { id: "gt5", text: (n) => `Hola{name}, tarde de {day}. Metiéndole con todo, que ya falta poco.` },
  { id: "gt6", text: (n) => `Buenas{name}. El día avanza, pero vos también. ¡Dale!` },
  { id: "gt7", text: (n) => `Hola{name}, ya pasamos el mediodía. ¿Cómo viene la jornada?` },
  { id: "gt8", text: (n) => `Tarde de {day}{name}. Seguí que estás en buena racha.` },
  { id: "gt9", text: (n) => `Buenas{name}. Aprovechá la segunda mitad del día para cerrar fuerte.` },
  { id: "gt10", text: (n) => `Hola{name}, {day} a full. ¿Cómo viene todo? ¡No pares!` },
];

// ---- NOCHE (19–6hs) ----
export const EVENING_GREETINGS = [
  { id: "gn1", text: (n) => `Buenas noches{name}. ¿Cómo te fue hoy? Espero que bien.` },
  { id: "gn2", text: (n) => `Hola{name}, ya es de noche. ¿Qué tal el {day}?` },
  { id: "gn3", text: (n) => `Buenas{name}. ¿Terminaste la jornada? ¿Cómo te fue?` },
  { id: "gn4", text: (n) => `Hola{name}, {day} nocturno. Si todavía estás, ¡buen laburo!` },
  { id: "gn5", text: (n) => `Buenas noches{name}. ¿Cómo cerraste el día? Espero que bien.` },
  { id: "gn6", text: (n) => `Hola{name}, ya es tarde. ¿Cómo te fue hoy? ¡Descansá!` },
  { id: "gn7", text: (n) => `Buenas{name}. Si estás trabajando, que sea el último empujón del día.` },
  { id: "gn8", text: (n) => `Hola{name}, {day} de noche. ¿Cómo te fue? Contame.` },
  { id: "gn9", text: (n) => `Buenas noches{name}. Espero que hayas cerrado bien el día.` },
  { id: "gn10", text: (n) => `Hola{name}, ya es hora de descansar. ¿Cómo te fue hoy?` },
];

// Compatibilidad: exportar como GREETINGS (array combinado para retrocompatibilidad)
export const GREETINGS = [...MORNING_GREETINGS, ...AFTERNOON_GREETINGS, ...EVENING_GREETINGS];

export const ENCOURAGEMENTS = [
  { id: "e1", text: (n) => `Falta poco para el cierre{name}. ¡Un esfuerzo más y llegás a tu meta!` },
  { id: "e2", text: (n) => `Quedan minutos de jornada{name}. Sumá un caso más, ¡vos podés!` },
  { id: "e3", text: (n) => `Casi listo{name}. Cerrá la jornada con un caso más.` },
  { id: "e4", text: (n) => `Aún estás a tiempo{name}. Cada reporte cuenta para tu objetivo.` },
  { id: "e5", text: (n) => `No te rindas{name}. En estos últimos minutos podés mejorar tus números.` },
  { id: "e6", text: (n) => `Último tramo del día{name}. ¡Dale, que se puede!` },
  { id: "e7", text: (n) => `Tu constancia vale{name}. Intentá cerrar con un caso más.` },
  { id: "e8", text: (n) => `Queda poco{name}. Cada minuto cuenta para alcanzar la meta.` },
  { id: "e9", text: (n) => `Hoy diste lo mejor{name}. Un último empujón y listo.` },
  { id: "e10", text: (n) => `Terminá fuerte{name}. Tu esfuerzo de hoy se refleja en los números.` },
];

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function shortName(fullName) {
  const name = (fullName || "").trim();
  if (!name) return "";
  return name.split(/\s+/)[0];
}

function buildContext({ profile = {}, date = new Date(), name } = {}) {
  const short = name !== undefined ? name : shortName(profile.fullName || profile.displayName || "");
  const nm = short ? ` ${short}` : "";
  return {
    day: DAY_NAMES[date.getDay()],
    month: MONTH_NAMES[date.getMonth()],
    dayNumber: date.getDate(),
    hour: String(date.getHours()).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    name: nm,
  };
}

function fill(template, ctx) {
  return template
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{day\}/g, ctx.day)
    .replace(/\{month\}/g, ctx.month)
    .replace(/\{dayNumber\}/g, String(ctx.dayNumber))
    .replace(/\{hour\}/g, ctx.hour)
    .replace(/\{minute\}/g, ctx.minute);
}

/**
 * Selecciona el saludo correcto según la hora del día.
 * Mañana (6-12), Tarde (12-19), Noche (19-6).
 */
function getTimePeriodGreetings(hour) {
  if (hour >= 6 && hour < 12) return MORNING_GREETINGS;
  if (hour >= 12 && hour < 19) return AFTERNOON_GREETINGS;
  return EVENING_GREETINGS;
}

/**
 * Saludo del día. Elegido por fecha (estable todo el día) y hora (mañana/tarde/noche).
 * El índice se deriva del hash de la fecha para que sea aleatorio pero estable.
 */
export function getDailyGreeting({ profile = {}, date = new Date(), greetings } = {}) {
  const ctx = buildContext({ profile, date });
  const hour = date.getHours();
  const list = greetings || getTimePeriodGreetings(hour);
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % list.length;
  const msg = fill(list[index].text(""), ctx);
  return { id: list[index].id, text: msg, index, periodIndex: hour < 12 ? 0 : hour < 19 ? 1 : 2 };
}

/**
 * Mensaje de aliento aleatorio (por hora + día) para mostrar antes del cierre.
 */
export function getEncouragement({ profile = {}, date = new Date(), encouragements = ENCOURAGEMENTS } = {}) {
  const list = encouragements.length ? encouragements : ENCOURAGEMENTS;
  const ctx = buildContext({ profile, date });
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const index = hash % list.length;
  const msg = fill(list[index].text(""), ctx);
  return { id: list[index].id, text: msg, index };
}

/**
 * Devuelve true si faltan menos de N minutos para el cierre de la jornada
 * y la meta diaria NO se cumplió. Soporta jornadas que cruzan medianoche.
 */
export function shouldShowEncouragement({
  workSchedule = {},
  now = new Date(),
  dailyMet = false,
  minutesBeforeClose = 15,
} = {}) {
  if (dailyMet) return false;
  const end = workSchedule.end;
  if (!end) return false;
  const parts = String(end).split(":");
  const endMin = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = workSchedule.start;
  const startParts = start ? String(start).split(":") : [];
  const startMin = startParts.length ? (parseInt(startParts[0], 10) || 0) * 60 + (parseInt(startParts[1], 10) || 0) : 0;
  const crossMidnight = endMin < startMin;
  if (crossMidnight) {
    const inSpan = nowMin >= startMin || nowMin < endMin;
    if (!inSpan) return false;
    const diff = nowMin >= endMin ? nowMin - endMin : nowMin + (24 * 60) - endMin;
    return diff <= minutesBeforeClose;
  }
  if (nowMin < startMin) return false;
  const diff = endMin - nowMin;
  return diff >= 0 && diff <= minutesBeforeClose;
}

/**
 * Mensaje de aliento completo listo para mostrar (o null si no corresponde).
 */
export function buildEncouragementMessage({
  profile = {},
  dailyMet = false,
  now = new Date(),
  minutesBeforeClose = 15,
} = {}) {
  if (!shouldShowEncouragement({ workSchedule: profile.workSchedule || {}, now, dailyMet, minutesBeforeClose })) {
    return null;
  }
  return getEncouragement({ profile, date: now });
}
