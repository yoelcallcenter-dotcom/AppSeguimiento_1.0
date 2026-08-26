/**
 * validationResult.js
 * Resultado estructurado de validación (Release 1.3.3).
 *
 * Toda la capa de integridade devuelve objetos con esta forma en lugar de
 * booleanos sueltos, para poder informar qué falló, qué es recuperable y
 * qué datos normalizados se pueden usar con seguridad.
 */

export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Resultado base. `valid` significa "apto para la operación solicitada".
 * - valid=true + warnings → utilizable con observaciones.
 * - valid=false + recoverable → puede adaptarse con decisión explícita.
 * - valid=false + severity critical → no guardar/sobrescribir sin intervención.
 */
export function crearResultado({
  valid = true,
  severity = SEVERITY.INFO,
  warnings = [],
  errors = [],
  recoverable = false,
  normalizedData = null,
  detalle = null,
} = {}) {
  return { valid, severity, warnings, errors, recoverable, normalizedData, detalle };
}

export function ok(normalizedData = null, warnings = []) {
  return crearResultado({
    valid: true,
    severity: warnings.length > 0 ? SEVERITY.WARNING : SEVERITY.INFO,
    warnings,
    normalizedData,
    recoverable: false,
  });
}

export function conAdvertencias(normalizedData, warnings) {
  return crearResultado({
    valid: true,
    severity: SEVERITY.WARNING,
    warnings,
    normalizedData,
    recoverable: true,
  });
}

export function invalido(errors, { recoverable = false, severity = SEVERITY.ERROR } = {}) {
  return crearResultado({
    valid: false,
    severity,
    errors,
    recoverable,
  });
}

export function critico(errors) {
  return crearResultado({
    valid: false,
    severity: SEVERITY.CRITICAL,
    errors,
    recoverable: false,
  });
}

/** true si el resultado corresponde a un problema CRITICAL. */
export function esCritico(resultado) {
  return !!resultado && resultado.severity === SEVERITY.CRITICAL;
}
