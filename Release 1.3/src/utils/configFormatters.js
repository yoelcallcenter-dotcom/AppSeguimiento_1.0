import { localStorageAdapter } from '../core/storage/localStorageAdapter';

export function readConfig() {
  try {
    const stored = localStorageAdapter.get('config-art-tracker', null);
    if (stored && typeof stored === 'object') return stored;
    const raw = localStorage.getItem('config-art-tracker');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function formatDateWithConfig(dateStr, config) {
  if (!dateStr) return "";
  const cfg = config || readConfig();
  const formato = cfg.formatoFecha || "DD/MM/YYYY";
  return formatearFecha(dateStr, formato);
}

function formatearFecha(fecha, formato) {
  if (!fecha) return "";
  // Fecha solo-día (YYYY-MM-DD): se formatea por partes porque new Date()
  // la interpreta como UTC medianoche y los getters locales mostraban el
  // día anterior en zonas UTC-negativas (ej: Argentina UTC-3).
  const soloDia = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/);
  let dia, mes, año;
  if (soloDia) {
    [, año, mes, dia] = soloDia;
  } else {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    dia = String(d.getDate()).padStart(2, "0");
    mes = String(d.getMonth() + 1).padStart(2, "0");
    año = d.getFullYear();
  }
  switch (formato) {
    case "DD/MM": return `${dia}/${mes}`;
    case "DD/MM/YYYY": return `${dia}/${mes}/${año}`;
    case "YYYY-MM-DD": return `${año}-${mes}-${dia}`;
    case "MM/DD": return `${mes}/${dia}`;
    case "MM/DD/YYYY": return `${mes}/${dia}/${año}`;
    default: return `${dia}/${mes}/${año}`;
  }
}

export function formatPhoneWithConfig(phone, config) {
  if (!phone) return "";
  const cfg = config || readConfig();
  const formato = cfg.telefonoFormato || "argentina";
  return formatPhone(phone, formato);
}

function formatPhone(phone, formato) {
  const cleaned = phone.replace(/\D/g, "");
  if (formato === "argentina" && cleaned.length === 10) {
    const area = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const suffix = cleaned.slice(6);
    return `(${area}) ${prefix}-${suffix}`;
  }
  if (formato === "mexico" && cleaned.length === 10) {
    const area = cleaned.slice(0, 3);
    const rest = cleaned.slice(3);
    return `${area} ${rest.slice(0, 3)} ${rest.slice(3, 5)} ${rest.slice(5)}`;
  }
  if (formato === "usa" && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (formato === "internacional" && cleaned.length >= 10) {
    const code = cleaned.slice(0, cleaned.length - 10);
    const rest = cleaned.slice(cleaned.length - 10);
    return `+${code || "XX"} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  return phone;
}
