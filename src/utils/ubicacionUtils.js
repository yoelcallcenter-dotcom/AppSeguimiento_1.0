const PROVINCE_MAP = new Map([
  ['BUENOS AIRES', 'BUENOS AIRES'],
  ['CATAMARCA', 'CATAMARCA'],
  ['CHACO', 'CHACO'],
  ['CHUBUT', 'CHUBUT'],
  ['CÓRDOBA', 'CÓRDOBA'],
  ['CORDOBA', 'CÓRDOBA'],
  ['CORRIENTES', 'CORRIENTES'],
  ['ENTRE RÍOS', 'ENTRE RÍOS'],
  ['ENTRE RIOS', 'ENTRE RÍOS'],
  ['FORMOSA', 'FORMOSA'],
  ['JUJUY', 'JUJUY'],
  ['LA PAMPA', 'LA PAMPA'],
  ['LA RIOJA', 'LA RIOJA'],
  ['MENDOZA', 'MENDOZA'],
  ['MISIONES', 'MISIONES'],
  ['NEUQUÉN', 'NEUQUÉN'],
  ['NEUQUEN', 'NEUQUÉN'],
  ['RÍO NEGRO', 'RÍO NEGRO'],
  ['RIO NEGRO', 'RÍO NEGRO'],
  ['SALTA', 'SALTA'],
  ['SAN JUAN', 'SAN JUAN'],
  ['SAN LUIS', 'SAN LUIS'],
  ['SANTA CRUZ', 'SANTA CRUZ'],
  ['SANTA FE', 'SANTA FE'],
  ['SANTIAGO DEL ESTERO', 'SANTIAGO DEL ESTERO'],
  ['TIERRA DEL FUEGO', 'TIERRA DEL FUEGO'],
  ['TUCUMÁN', 'TUCUMÁN'],
  ['TUCUMAN', 'TUCUMÁN'],
]);

const PROVINCIA_KEYS = [...PROVINCE_MAP.keys()].sort((a, b) => b.length - a.length);

/**
 * Extrae la provincia de un string de localidad con coma.
 * Casos soportados:
 *   "La Plata, Buenos Aires" → { localidad: "LA PLATA, BUENOS AIRES", provincia: "BUENOS AIRES" }
 *   "La Plata, Buenos"      → { localidad: "LA PLATA, BUENOS", provincia: "" } (no match)
 *   "CABA"                   → { localidad: "CABA", provincia: "CABA" }
 *   "Mendoza Capital"        → { localidad: "MENDOZA CAPITAL", provincia: "MENDOZA" }
 */
export function normalizarUbicacion(localidad) {
  if (!localidad || !localidad.trim()) return { localidad: '', provincia: '' };

  const raw = localidad.trim().replace(/\s+/g, ' ');
  const upper = raw.toUpperCase();

  if (upper === 'CABA') return { localidad: 'CABA', provincia: 'CABA' };

  if (upper.endsWith(' CAPITAL')) {
    const candidate = upper.slice(0, -8).trim();
    for (const key of PROVINCIA_KEYS) {
      if (candidate === key) {
        return { localidad: upper, provincia: PROVINCE_MAP.get(key) };
      }
    }
  }

  for (const key of PROVINCIA_KEYS) {
    const suffix = ' ' + key;
    if (upper.endsWith(suffix)) {
      const cityRaw = raw.slice(0, upper.length - key.length).trimEnd();
      const city = cityRaw.replace(/,\s*$/, '').trim();
      if (!city) continue;
      const normalizedCity = city.toUpperCase();
      const province = PROVINCE_MAP.get(key);
      return { localidad: normalizedCity + ', ' + province, provincia: province };
    }
  }

  return { localidad: upper, provincia: '' };
}

/**
 * Normaliza la ubicación de un caso.
 * La provincia existente tiene prioridad sobre la derivada.
 * Si la localidad contiene una coma y la provincia derivada es válida,
 * se asigna automáticamente la provincia.
 */
export function normalizarCasos(casos) {
  let changed = false;
  const result = casos.map((c) => {
    const loc = normalizarUbicacion(c.localidad);
    const existingProv = (c.provincia || '').trim();
    const provincia = existingProv ? existingProv.toUpperCase() : loc.provincia;
    if (!provincia && loc.localidad === (c.localidad || '').toUpperCase().trim()) return c;
    changed = true;
    return { ...c, localidad: loc.localidad, provincia };
  });
  return changed ? result : casos;
}
