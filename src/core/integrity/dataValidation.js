/**
 * dataValidation.js
 * Validadores estructurados de entidades (Release 1.3.3).
 *
 * Reglas:
 *  - Los casos antiguos con campos faltantes son VÁLIDOS con advertencias,
 *    nunca "corruptos": solo se rechaza lo inservible para la operación.
 *  - Nunca se inventan datos (fechas "hoy", provincias, aseguradoras).
 *  - Una fecha irrecuperable conserva su valor original y genera advertencia;
 *    el vacío permanece vacío.
 *  - Los eventos de historial con tipos desconocidos se preservan
 *    (representación genérica en UI), no se descartan.
 */

import { normalizeDate } from '../../utils/dateFilters';
import { CONFIG_DEFAULT } from '../../utils/constants';
import {
  ok,
  conAdvertencias,
  invalido,
  critico,
} from './validationResult';

function esFechaIrrecuperable(valor) {
  if (valor === null || valor === undefined) return false; // ausente ≠ corrupta
  const s = String(valor).trim();
  if (!s) return false;
  return !normalizeDate(s);
}

/**
 * Valida un caso para operaciones de guardado/importación.
 * @returns resultado estructurado con normalizedData aplicable.
 */
export function validateCaseIntegrity(caso) {
  if (!caso || typeof caso !== 'object') {
    return invalido(['El registro no es un objeto válido']);
  }

  const warnings = [];
  const errors = [];
  const normalized = { ...caso };

  const nombre = typeof caso.nombre === 'string' ? caso.nombre.trim() : '';
  const telefono = typeof caso.telefono === 'string' ? String(caso.telefono).trim() : '';

  if (!nombre && !telefono) {
    return invalido(['El caso no tiene nombre ni teléfono: no puede identificarse'], {
      severity: 'error',
    });
  }
  normalized.nombre = nombre;
  normalized.telefono = telefono;

  // ID: ausente es recuperable (el repositorio genera uno); presente pero
  // vacío tras trim también. NUNCA se cambia un ID existente válido.
  if (!caso.id || (typeof caso.id === 'string' && !caso.id.trim())) {
    warnings.push('Sin id: se generará uno al guardar');
  }

  // Fecha: interpretable → se normaliza a ISO (seguro y sin ambigüedad);
  // irrecuperable → se conserva tal cual con advertencia (nunca "hoy").
  const fechaIso = normalizeDate(caso.fecha);
  if (fechaIso) {
    normalized.fecha = fechaIso;
  } else if (esFechaIrrecuperable(caso.fecha)) {
    warnings.push(`Fecha inválida conservada sin cambios ("${String(caso.fecha).trim()}")`);
  } else if (!caso.fecha) {
    normalized.fecha = '';
    warnings.push('Sin fecha');
  }
  if (
    caso.fechaFirma !== undefined && caso.fechaFirma !== null && caso.fechaFirma !== '' &&
    esFechaIrrecuperable(caso.fechaFirma)
  ) {
    warnings.push('Fecha de firma inválida conservada sin cambios');
  } else if (caso.fechaFirma && esFechaIrrecuperable(caso.fechaFirma) === false) {
    const firmaIso = normalizeDate(caso.fechaFirma);
    if (firmaIso) normalized.fechaFirma = firmaIso;
  }

  // Arrays funcionales: default seguro sin tocar el resto.
  for (const campo of ['tags', 'reporteHistory', 'comentarios', 'notasVinculadas', 'agendaVinculada']) {
    if (normalized[campo] !== undefined && !Array.isArray(normalized[campo])) {
      warnings.push(`Campo "${campo}" no era una lista; se restablece a lista vacía`);
      normalized[campo] = [];
    }
  }

  // Estado vacío: recuperable con default del sistema (no inventa significado).
  if (!caso.estado || !String(caso.estado).trim()) {
    warnings.push('Sin estado: se usará el estado por defecto del sistema');
    normalized.estado = CONFIG_DEFAULT.estadoDefault;
  }

  if (warnings.length > 0) {
    return conAdvertencias(normalized, warnings);
  }
  return ok(normalized);
}

/** Valida una nota (estructura mínima; los campos viejos incompletos pasan). */
export function validateNoteIntegrity(nota) {
  if (!nota || typeof nota !== 'object') {
    return invalido(['La nota no es un objeto válido']);
  }
  const warnings = [];
  if (!nota.id) warnings.push('Nota sin id');
  const tieneContenido = (nota.title || nota.titulo) || (nota.content || nota.contenido);
  if (!tieneContenido) warnings.push('Nota sin título ni contenido');

  if (warnings.length >= 2) {
    return invalido(['Nota sin identificador ni contenido utilizable']);
  }
  if (warnings.length > 0) return conAdvertencias({ ...nota }, warnings);
  return ok({ ...nota });
}

/** Valida un evento de calendario (un evento roto no debe romper la vista). */
export function validateEventIntegrity(evento) {
  if (!evento || typeof evento !== 'object') {
    return invalido(['El evento no es un objeto válido']);
  }
  const warnings = [];
  if (!evento.id) warnings.push('Evento sin id');
  if (!evento.startDate || !normalizeDate(evento.startDate)) {
    warnings.push('Evento sin fecha de inicio válida');
  }
  if (!evento.title && !evento.titulo) warnings.push('Evento sin título');

  // Sin fecha no puede ubicarse en el calendario: recuperable pero aislado.
  if (warnings.includes('Evento sin fecha de inicio válida')) {
    return conAdvertencias({ ...evento }, warnings);
  }
  if (warnings.length > 0) return conAdvertencias({ ...evento }, warnings);
  return ok({ ...evento });
}

/**
 * Valida un evento de historial de casos.
 * Los tipos desconocidos (versiones futuras) son VÁLIDOS: se preservan.
 */
export function validateHistoryEventIntegrity(evento) {
  if (!evento || typeof evento !== 'object') {
    return invalido(['El evento de historial no es un objeto válido']);
  }
  const warnings = [];
  if (!evento.caseId) warnings.push('Evento sin caseId');
  if (!evento.type || typeof evento.type !== 'string') warnings.push('Evento sin tipo');
  const tsOk = evento.timestamp && !isNaN(new Date(evento.timestamp).getTime());
  if (!tsOk) warnings.push('Evento con timestamp inválido');

  if (warnings.includes('Evento sin caseId') || warnings.includes('Evento sin tipo')) {
    return invalido(warnings, { recoverable: true });
  }
  if (warnings.length > 0) return conAdvertencias({ ...evento }, warnings);

  // Metadata debe ser serializable; si no lo es, se marca sin alterarla.
  try {
    JSON.stringify(evento.metadata ?? null);
  } catch {
    return conAdvertencias({ ...evento }, ['Metadata no serializable']);
  }
  return ok({ ...evento });
}

/**
 * Esquema de claves críticas de configuración con validación por tipo.
 * Las claves desconocidas NUNCA se tocan (preservación).
 */
const ESQUEMA_CONFIG = {
  estadoDefault: { tipo: 'string', default: CONFIG_DEFAULT.estadoDefault },
  formatoFecha: { tipo: 'string', default: CONFIG_DEFAULT.formatoFecha },
  casosPorPagina: { tipo: 'number', default: CONFIG_DEFAULT.casosPorPagina },
  estados: { tipo: 'array', default: null },
  tiposIngreso: { tipo: 'array', default: null },
};

function valorAceptable(valor, tipo) {
  switch (tipo) {
    case 'string':
      return typeof valor === 'string';
    case 'number':
      return typeof valor === 'number' && !isNaN(valor);
    case 'array':
      return Array.isArray(valor) && valor.length > 0;
    case 'boolean':
      return typeof valor === 'boolean';
    default:
      return true;
  }
}

/**
 * Valida la configuración persistida. Devuelve defaults seguros SOLO para
 * las claves conocidas que estén rotas; todo lo demás se conserva intacto.
 */
export function validateConfigIntegrity(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return critico(['La configuración no es un objeto válido']);
  }
  const warnings = [];
  const normalized = { ...config };

  for (const [clave, regla] of Object.entries(ESQUEMA_CONFIG)) {
    const valor = config[clave];
    if (valor === undefined) continue; // ausente = versión antigua: OK
    if (valorAceptable(valor, regla.tipo)) continue;

    // Booleanos llegados como string "true"/"false" tienen conversión clara.
    if (regla.tipo === 'boolean' && (valor === 'true' || valor === 'false')) {
      normalized[clave] = valor === 'true';
      warnings.push(`"${clave}" convertida de string a booleano`);
      continue;
    }

    const fallback = regla.default !== null ? regla.default : undefined;
    if (fallback === undefined) {
      delete normalized[clave];
      warnings.push(`"${clave}" inválida: se omitirá y usará el catálogo por defecto`);
    } else {
      normalized[clave] = fallback;
      warnings.push(`"${clave}" inválida: se restauró el valor por defecto`);
    }
  }

  if (warnings.length > 0) return conAdvertencias(normalized, warnings);
  return ok(normalized);
}
