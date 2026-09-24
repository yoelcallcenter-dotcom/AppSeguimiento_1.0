const VARIABLE_MAP = {
  NOMBRE: (ctx) => ctx.caso?.nombre || '',
  TELEFONO: (ctx) => ctx.caso?.telefono || '',
  FECHA: (ctx) => {
    if (ctx.fecha) return ctx.fecha;
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  },
  HORA: (ctx) => {
    if (ctx.hora) return ctx.hora;
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
  ASEGURADORA: (ctx) => ctx.caso?.aseguradora || '',
  ESTUDIO: (ctx) => ctx.caso?.estudioJuridico || '',
  ESTADO: (ctx) => ctx.caso?.estado || '',
  OPERADOR: (ctx) => ctx.config?.operador || '',
  LOCALIDAD: (ctx) => ctx.caso?.localidad || '',
  PROFESION: (ctx) => ctx.caso?.profesion || '',
};

/**
 * Reemplaza variables {VARIABLE} en un string o en todos los valores string de un objeto.
 * 100% determinista, sin IA.
 *
 * @param {string|object} input - String o objeto con valores string
 * @param {{ caso?: object, config?: object, fecha?: string, hora?: string }} context
 * @returns {string|object} - Mismo tipo que input con variables reemplazadas
 */
export function resolveVariables(input, context = {}) {
  const ctx = context;
  const resolver = (str) =>
    str.replace(/\{([A-Z_]+)\}/g, (match, varName) => {
      const fn = VARIABLE_MAP[varName];
      return fn ? fn(ctx) : match;
    });

  if (typeof input === 'string') return resolver(input);
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const result = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = typeof value === 'string' ? resolver(value) : value;
    }
    return result;
  }
  return input;
}

export const AVAILABLE_VARIABLES = Object.keys(VARIABLE_MAP).map((v) => ({
  key: v,
  label: `{${v}}`,
  description: {
    NOMBRE: 'Nombre del caso',
    TELEFONO: 'Teléfono del caso',
    FECHA: 'Fecha actual (DD/MM/YYYY)',
    HORA: 'Hora actual (HH:MM)',
    ASEGURADORA: 'Aseguradora del caso',
    ESTUDIO: 'Estudio jurídico del caso',
    ESTADO: 'Estado actual del caso',
    OPERADOR: 'Nombre del operador',
    LOCALIDAD: 'Localidad del caso',
    PROFESION: 'Profesión del caso',
  }[v] || v,
}));
