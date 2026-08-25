/**
 * redact.js
 * Redacción de datos personales (PII) para logs/diagnóstico.
 * Teléfonos, CUIL/CUIT, emails y claves con nombres personales se
 * reemplazan por marcadores antes de persistir o mostrar errores.
 */

const PHONE_RE = /\+?[0-9][0-9\s\-().]{8,}[0-9]/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CUIL_RE = /(?:20|23|24|25|26|27|30|33|34)[\s-]?\d{7,8}[\s-]?\d/g;

export function redactPII(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(CUIL_RE, "[CUIL]")
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_RE, "[TEL]");
}

const PII_KEYS = /(nombre|name|apellido|telefono|phone|celular|email|mail|cuil|cuit|dni|direccion|address|paciente)/i;

export function redactObject(obj, depth = 0) {
  if (depth > 10) return "[REDACTED]";
  if (!obj || typeof obj !== "object") {
    if (typeof obj === "string") return redactPII(obj);
    return obj;
  }

  const result = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    if (PII_KEYS.test(key)) {
      result[key] = "[PII]";
    } else {
      result[key] = redactObject(obj[key], depth + 1);
    }
  }

  return result;
}
