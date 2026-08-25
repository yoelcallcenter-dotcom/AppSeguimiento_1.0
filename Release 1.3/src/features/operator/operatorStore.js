/**
 * operatorStore.js
 * Persistencia del módulo "Mi Espacio" (v1.3.0).
 * Almacenamiento local centralizado para perfil, disponibilidad, metas,
 * credenciales y preferencias personales del operador.
 *
 * Reglas de seguridad:
 *  - Las credenciales NUNCA se registran en logs.
 *  - Las credenciales NO se incluyen en backups/exportaciones.
 *  - Las credenciales NO se incluyen en estadísticas ni reportes.
 */

import {
  DEFAULT_PROFILE,
  DEFAULT_AVAILABILITY,
  DEFAULT_GOALS,
  DEFAULT_CREDENTIALS,
  DEFAULT_OPERATOR_SETTINGS,
  OPERATOR_STORAGE_KEYS,
} from "./operatorDefaults";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function readArrayJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

// ============================================================
// MIGRACIÓN DESDE DATOS LEGACY (v1.1.x)
// ============================================================
/**
 * Migra la meta diaria de casos del sistema de productividad anterior
 * (userProductivitySettings.caseTarget y userGoals.dailyTarget) hacia la
 * nueva estructura operatorGoals. Es idempotente y no duplica datos.
 */
function migrateLegacyGoals(goals) {
  try {
    const legacySettings = JSON.parse(
      localStorage.getItem("userProductivitySettings") || "{}"
    );
    const legacyGoals = JSON.parse(localStorage.getItem("userGoals") || "{}");

    const legacyCaseTarget =
      legacySettings.caseTarget != null
        ? Number(legacySettings.caseTarget)
        : null;
    const legacyDailyTarget =
      legacyGoals.dailyTarget != null ? Number(legacyGoals.dailyTarget) : null;

    const target =
      legacyCaseTarget || legacyDailyTarget || goals.daily.cases.target || 5;

    if (target !== goals.daily.cases.target || !goals.daily.cases.enabled) {
      return {
        ...goals,
        daily: {
          ...goals.daily,
          cases: { enabled: true, target },
        },
      };
    }
    return goals;
  } catch {
    return goals;
  }
}

// ============================================================
// PERFIL PERSONAL
// ============================================================
export function getOperatorProfile() {
  const profile = readJSON(OPERATOR_STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  if (!profile.workSchedule) profile.workSchedule = { ...DEFAULT_PROFILE.workSchedule };
  if (!Array.isArray(profile.workingDays) || profile.workingDays.length === 0) {
    profile.workingDays = [...DEFAULT_PROFILE.workingDays];
  }
  return profile;
}

export function saveOperatorProfile(patch) {
  const current = getOperatorProfile();
  const updated = { ...current, ...patch };
  if (updated.fullName && !updated.initials) {
    updated.initials = initialsFromName(updated.fullName);
  }
  writeJSON(OPERATOR_STORAGE_KEYS.PROFILE, updated);
  return updated;
}

export function initialsFromName(fullName) {
  return (fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// ============================================================
// DISPONIBILIDAD
// ============================================================
export function getOperatorAvailability() {
  return readArrayJSON(OPERATOR_STORAGE_KEYS.AVAILABILITY, DEFAULT_AVAILABILITY);
}

export function saveOperatorAvailability(patch) {
  const current = getOperatorAvailability();
  const updated = { ...current, ...patch };
  writeJSON(OPERATOR_STORAGE_KEYS.AVAILABILITY, updated);
  return updated;
}

// ============================================================
// METAS Y OBJETIVOS
// ============================================================
export function getOperatorGoals() {
  const goals = readArrayJSON(OPERATOR_STORAGE_KEYS.GOALS, DEFAULT_GOALS);
  return migrateLegacyGoals(goals);
}

export function saveOperatorGoals(patch) {
  const current = getOperatorGoals();
  const updated = { ...current, ...patch };
  writeJSON(OPERATOR_STORAGE_KEYS.GOALS, updated);
  syncCaseTargetToLegacy(updated);
  return updated;
}

/**
 * Mantiene la compatibilidad con el sistema de productividad v1.1.x:
 * refleja la meta diaria de casos en userProductivitySettings.caseTarget
 * para que los widgets existentes consuman el mismo valor.
 */
function syncCaseTargetToLegacy(goals) {
  try {
    const legacySettings = JSON.parse(
      localStorage.getItem("userProductivitySettings") || "{}"
    );
    const target = goals.daily.cases.target;
    if (legacySettings.caseTarget !== target) {
      legacySettings.caseTarget = target;
      localStorage.setItem("userProductivitySettings", JSON.stringify(legacySettings));
    }
    const legacyGoals = JSON.parse(localStorage.getItem("userGoals") || "{}");
    if (legacyGoals.dailyTarget !== target) {
      legacyGoals.dailyTarget = target;
      localStorage.setItem("userGoals", JSON.stringify(legacyGoals));
    }
  } catch {
    /* ignore */
  }
}

// ============================================================
// CREDENCIALES (ACCESOS PERSONALES)
// ============================================================
export function getOperatorCredentials() {
  return readArrayJSON(OPERATOR_STORAGE_KEYS.CREDENTIALS, DEFAULT_CREDENTIALS);
}

/**
 * Guarda credenciales SIN registrarlas en logs. Solo persiste en localStorage.
 */
export function saveOperatorCredentials(patch) {
  const current = getOperatorCredentials();
  const updated = { ...current, ...patch };
  writeJSON(OPERATOR_STORAGE_KEYS.CREDENTIALS, updated);
  return updated;
}

export function addCredential(entry) {
  const current = getOperatorCredentials();
  const entries = [
    {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      service: "",
      user: "",
      password: "",
      url: "",
      note: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...entry,
    },
    ...(current.entries || []),
  ];
  return saveOperatorCredentials({ entries });
}

export function updateCredential(id, patch) {
  const current = getOperatorCredentials();
  const entries = (current.entries || []).map((e) =>
    e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
  );
  return saveOperatorCredentials({ entries });
}

export function deleteCredential(id) {
  const current = getOperatorCredentials();
  const entries = (current.entries || []).filter((e) => e.id !== id);
  return saveOperatorCredentials({ entries });
}

// ============================================================
// PREFERENCIAS DEL MÓDULO
// ============================================================
export function getOperatorSettings() {
  return readJSON(OPERATOR_STORAGE_KEYS.SETTINGS, DEFAULT_OPERATOR_SETTINGS);
}

export function saveOperatorSettings(patch) {
  const current = getOperatorSettings();
  const updated = { ...current, ...patch };
  writeJSON(OPERATOR_STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// ============================================================
// LECTURA DE CASOS (para progreso de metas)
// ============================================================
export function readOperatorCases() {
  try {
    const raw = localStorage.getItem("app_casos-art-tracker");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}