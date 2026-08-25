/**
 * operatorMessages.js
 * Saludos de bienvenida y mensajes de aliento para "Mi Espacio" (v1.2.1).
 * Lógica pura y testeable. Usa día, hora y nombre corto del operador.
 */

export const GREETINGS = [
  { id: "g1", text: (n) => `¡Hola{name}! ¡Feliz {day}! Que tengas un excelente comienzo de jornada.` },
  { id: "g2", text: (n) => `Buen día{name}, {day} es un gran día para alcanzar tus metas.` },
  { id: "g3", text: (n) => `¡Arrancamos{name}! Hoy es {day} y vas a lograr grandes cosas.` },
  { id: "g4", text: (n) => `Hola{name}. {day}: un nuevo desafío te espera. ¡Vamos con todo!` },
  { id: "g5", text: (n) => `Que tengas un día productivo{name}. Hoy es {day} y todo es posible.` },
  { id: "g6", text: (n) => `Bienvenido{name}. {day} es perfecto para superar tus metas.` },
  { id: "g7", text: (n) => `¡Hola{name}! Es {day}, un buen momento para enfocarte en tus objetivos.` },
  { id: "g8", text: (n) => `Día de logros{name}: {day} es tuyo. ¡Adelante!` },
  { id: "g9", text: (n) => `Buenos momentos se construyen con constancia{name}. Hoy es {day}.` },
  { id: "g10", text: (n) => `¡{day} de éxito{name}! Cada caso cuenta y vos lo sabés.` },
];

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
 * Saludo del día. Elegido por fecha (estable todo el día) y hora (mañana/tarde/noche).
 * El índice se deriva del hash de la fecha para que sea aleatorio pero estable.
 */
export function getDailyGreeting({ profile = {}, date = new Date(), greetings = GREETINGS } = {}) {
  const list = greetings.length ? greetings : GREETINGS;
  const ctx = buildContext({ profile, date });
  const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  }
  const hour = date.getHours();
  const periodIndex = hour < 12 ? 0 : hour < 19 ? 1 : 2;
  const index = (hash + periodIndex) % list.length;
  const msg = fill(list[index].text(""), ctx);
  return { id: list[index].id, text: msg, index, periodIndex };
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