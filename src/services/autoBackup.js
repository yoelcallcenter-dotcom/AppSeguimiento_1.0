/**
 * autoBackup.js
 * Backup automático local con historial rotativo en IndexedDB.
 * Guarda snapshots completos (casos + notas + eventos + config) y permite
 * restaurarlos desde la UI.
 *
 * A partir de v1.3.0:
 * - Backup programado 15 minutos antes del cierre de jornada de Mi Espacio.
 * - Notificación importante cuando se ejecuta el backup automático.
 * - Estado del backup integrado en Mi Jornada.
 * - Se mantiene compatibilidad con la frecuencia existente.
 */

import appDB from "../core/db/appDB";
// v1.10.8: + validateBackup para el restore del snapshot local de emergencia.
import { exportBackup, importBackup, backupSizeKB, validateBackup } from "./backupService";
import { notifyChange, SYNC_EVENTS } from "../core/sync/syncService";
import { reportError } from "../core/error/reportError";

const LAST_RUN_KEY = "backup-last-run";
const LAST_JOURNADAY_RUN_KEY = "backup-last-jornada-run";
const MAX_BACKUPS = 6;

// ============================================================
// v1.10.8 — SNAPSHOT LOCAL DE EMERGENCIA (localStorage)
// ============================================================
// Los backups automáticos viven en la MISMA IndexedDB que puede perderse:
// si el archivo desaparece, no queda NADA con qué restaurar. Este snapshot
// guarda el último backup como JSON en localStorage (origen de datos
// independiente de IndexedDB) para poder restaurar aun con la base muerta.
// Clave RAW sin prefijo y fuera del whitelist del adapter → NO viaja dentro
// del campo `storage` de los backups (evita crecimiento recursivo) ni se
// pisa con `localStorageAdapter.clear()`.
// ============================================================
export const SNAPSHOT_LOCAL_KEY = "backup-last-snapshot";
/** Límite conservador en caracteres para no agotar la cuota (~5 MB) de localStorage. */
export const SNAPSHOT_MAX_CHARS = 4_500_000;

/**
 * Guarda el último backup en localStorage. Best-effort: si no entra por cuota
 * o falla, se informa el motivo pero NUNCA rompe el flujo del backup.
 * @param {object} backup
 * @returns {{guardado: boolean, motivo?: "limite"|"error", bytes?: number}}
 */
export function guardarSnapshotLocal(backup) {
  try {
    const json = JSON.stringify(backup);
    if (json.length > SNAPSHOT_MAX_CHARS) {
      return { guardado: false, motivo: "limite" };
    }
    localStorage.setItem(SNAPSHOT_LOCAL_KEY, json);
    return { guardado: true, bytes: json.length };
  } catch (e) {
    return {
      guardado: false,
      motivo: e && e.name === "QuotaExceededError" ? "limite" : "error",
    };
  }
}

/** Lee el snapshot local (objeto) o null si no existe/está corrupto. */
export function leerSnapshotLocal() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * ¿Existe snapshot local? Barato (sin parsear): pensado para evaluarse en
 * cada render de la UI (el snapshot puede pesar MBs).
 */
export function haySnapshotLocal() {
  try {
    return !!localStorage.getItem(SNAPSHOT_LOCAL_KEY);
  } catch {
    return false;
  }
}

/** Elimina el snapshot local (vaciado deliberado de datos, p. ej. "borrar todo"). */
export function limpiarSnapshotLocal() {
  try {
    localStorage.removeItem(SNAPSHOT_LOCAL_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

export const FREQUENCIES = {
  diario: 24 * 60 * 60 * 1000,
  semanal: 7 * 24 * 60 * 60 * 1000,
  mensual: 30 * 24 * 60 * 60 * 1000,
};

/** Opciones para la UI (General > Datos). */
export const BACKUP_FREQUENCY_OPTIONS = [
  { value: "manual", label: "Manual (sin backups automáticos)" },
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
];

const FREQUENCY_LABELS = {
  manual: "manual",
  diario: "diario",
  semanal: "semanal",
  mensual: "mensual",
};

/** Días sin respaldar que disparan el aviso, según la frecuencia. */
const REMINDER_LIMIT_DAYS = {
  manual: Infinity,
  diario: 2,
  semanal: 7,
  mensual: 15,
};

export function getBackupFrequency() {
  try {
    const raw = localStorage.getItem("backup-frecuencia") || "diario";
    return FREQUENCY_LABELS[raw] ? raw : "diario";
  } catch {
    return "diario";
  }
}

/** Guarda la frecuencia de backup automático (manual | diario | semanal | mensual). */
export function setBackupFrequency(frequency) {
  try {
    if (!FREQUENCY_LABELS[frequency]) return false;
    localStorage.setItem("backup-frecuencia", frequency);
    return true;
  } catch {
    return false;
  }
}

export function getLastRunTime() {
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    const t = raw ? Number(raw) : 0;
    return Number.isFinite(t) && t > 0 ? t : 0;
  } catch {
    return 0;
  }
}

function setLastRunTime(ts) {
  try {
    localStorage.setItem(LAST_RUN_KEY, String(ts));
  } catch {}
}

/** ¿Corresponde ejecutar un backup automático según la frecuencia? */
export function isBackupDue(frequency = getBackupFrequency()) {
  if (frequency === "manual") return false;
  const period = FREQUENCIES[frequency] || FREQUENCIES.diario;
  const last = getLastRunTime();
  if (!last) return true;
  return Date.now() - last >= period;
}

/** Días transcurridos desde el último backup (0 si nunca). */
export function daysSinceLastBackup() {
  const last = getLastRunTime();
  if (!last) return null;
  return Math.max(0, Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000)));
}

/**
 * Obtiene el horario de cierre de jornada desde Mi Espacio (operatorStore).
 * @returns {string|null} Hora en formato "HH:MM" o null si no está configurada.
 */
function getWorkScheduleEnd() {
  try {
    const raw = localStorage.getItem("userOperatorProfile");
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return profile?.workSchedule?.end || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene los días laborables configurados en Mi Espacio.
 * @returns {number[]} Array de días (0=Dom, 1=Lun, ..., 6=Sáb).
 */
function getWorkingDays() {
  try {
    const raw = localStorage.getItem("userOperatorProfile");
    if (!raw) return [1, 2, 3, 4, 5];
    const profile = JSON.parse(raw);
    return Array.isArray(profile?.workingDays) && profile.workingDays.length > 0
      ? profile.workingDays
      : [1, 2, 3, 4, 5];
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

/**
 * Verifica si hoy es un día laborable según Mi Espacio.
 */
function isWorkDay(date = new Date()) {
  const workingDays = getWorkingDays();
  return workingDays.includes(date.getDay());
}

/**
 * Calcula el timestamp del backup programado (15 minutos antes del cierre de jornada).
 * Si la hora ya pasó hoy, retorna null (no se ejecuta).
 * @returns {{ backupTime: Date, endTime: string } | null}
 */
export function getJornadaBackupSchedule() {
  const endStr = getWorkScheduleEnd();
  if (!endStr) return null;

  const [hours, minutes] = endStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const now = new Date();
  const backupDate = new Date(now);
  backupDate.setHours(hours, minutes - 15, 0, 0);

  if (backupDate <= now) return null;

  return { backupTime: backupDate, endTime: endStr };
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 */
function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Verifica si ya se ejecutó el backup de jornada para el día actual.
 */
function hasJornadaBackupRunToday() {
  try {
    const raw = localStorage.getItem(LAST_JOURNADAY_RUN_KEY);
    return raw === todayKey();
  } catch {
    return false;
  }
}

function markJornadaBackupRunToday() {
  try {
    localStorage.setItem(LAST_JOURNADAY_RUN_KEY, todayKey());
  } catch {}
}

/**
 * Ejecuta un backup automático y lo guarda en el historial local.
 * @param {object} [options]
 * @param {string} [options.reason] Razón del backup (para la notificación).
 * @param {boolean} [options.silent] Si es true, no muestra notificación.
 * @returns {Promise<{ok: boolean, id?: number, error?: string}>}
 */
export async function runAutoBackup(options = {}) {
  // v1.10.8: se declara fuera del try para informar en el catch si el
  // snapshot local YA se guardó aunque falle la escritura del historial.
  let snap = null;
  try {
    const backup = await exportBackup();
    // v1.10.8: snapshot local ANTES de depender de auto_backups (que puede
    // estar dañada): si el historial no se puede escribir, la copia en
    // localStorage ya quedó y el usuario puede restaurarla desde la UI.
    snap = guardarSnapshotLocal(backup);
    const id = await appDB.auto_backups.add({
      timestamp: new Date().toISOString(),
      kind: options.reason === 'jornada' ? 'jornada' : 'auto',
      sizeKB: backupSizeKB(backup),
      counts: {
        cases: backup.data?.db?.cases?.length || 0,
        notes: backup.data?.db?.notes?.length || 0,
        events: backup.data?.db?.events?.length || 0,
      },
      backup,
    });

    // Rotación: conservar solo los últimos MAX_BACKUPS.
    const all = await appDB.auto_backups.orderBy("timestamp").reverse().keys();
    const keep = all.slice(0, MAX_BACKUPS);
    const toDelete = all.filter((k) => !keep.includes(k));
    if (toDelete.length > 0) {
      await appDB.auto_backups.bulkDelete(toDelete);
    }

    setLastRunTime(Date.now());
    markJornadaBackupRunToday();
    notifyChange(SYNC_EVENTS.ALL_DATA_UPDATED, { source: "auto-backup" });

    if (!options.silent) {
      import("../core/notifications/notificationStore").then(({ default: store }) => {
        const title = options.reason === 'jornada'
          ? "Backup automático antes del cierre de jornada"
          : "Backup automático creado";
        const message = options.reason === 'jornada'
          ? "Se realizó un backup automático 15 minutos antes del cierre de tu jornada. Tus datos están protegidos."
          : "Se creó un backup automático de todos tus datos.";
        store.getState().addNotification({
          title,
          message,
          type: "success",
          important: true,
        });
        store.getState().addPersistentAlert({
          type: "success",
          title,
          message,
          id: `auto-backup-${options.reason || 'frecuencia'}-${todayKey()}`,
        });
      });
    }

    return { ok: true, id, snapshot: snap };
  } catch (error) {
    reportError(error, { context: "autoBackup.runAutoBackup" });
    // v1.10.8: si el snapshot local ya se guardó, no es un fallo total —
    // la UI puede decirle al usuario que esa copia SÍ existe y cómo usarla.
    return { ok: false, error: error.message, snapshotGuardado: !!(snap && snap.guardado) };
  }
}

/**
 * Restaura el último snapshot guardado en localStorage (v1.10.8).
 * Funciona aunque la IndexedDB esté MUERTA: el snapshot vive en otro origen
 * de datos. Mismo camino de seguridad que un archivo (validación + import
 * atómico con rollback; importBackup ya limpia pérdida/alarma y resincroniza
 * la huella al terminar).
 * @returns {Promise<{ok: boolean, counts?: object, warnings?: string[], error?: string}>}
 */
export async function restaurarSnapshotLocal() {
  try {
    const snap = leerSnapshotLocal();
    if (!snap) {
      return { ok: false, error: "No hay snapshot local de respaldo." };
    }
    const errores = validateBackup(snap);
    if (errores.length > 0) {
      return { ok: false, error: `El snapshot local no es válido: ${errores.join(". ")}` };
    }
    const res = await importBackup(snap, {});
    return { ok: true, counts: res && res.counts, warnings: res && res.warnings };
  } catch (err) {
    reportError(err, { context: "autoBackup.restaurarSnapshotLocal" });
    return { ok: false, error: (err && err.message) || String(err) };
  }
}

/**
 * Historial de backups automáticos (más reciente primero).
 * v1.10.7: `{ relanzar: true }` propaga el error al llamador — al Diagnóstico
 * le importa distinguir "no hay backups" de "el historial NO se puede leer"
 * (con la base dañada devolvía [] y el informe mentía con "Todavía no existe
 * ningún backup en el historial"). Los callers de UI conservan el fallback a [].
 * @param {{relanzar?: boolean}} [options]
 */
export async function getBackupHistory(options = {}) {
  try {
    return await appDB.auto_backups
      .orderBy("timestamp")
      .reverse()
      .toArray();
  } catch (error) {
    reportError(error, { context: "autoBackup.getBackupHistory" });
    if (options.relanzar) throw error;
    return [];
  }
}

/**
 * ¿Toca ejecutar un backup automático? (v1.10.7)
 * - frecuencia "manual": nunca automático (decisión del usuario);
 * - `isBackupDue()` según frecuencia (comportamiento original);
 * - NUEVO: historial vacío aunque NO esté vencido el período. Cubre el caso
 *   de la DB recreada tras una pérdida de archivos: `backup-last-run` vive en
 *   localStorage y sobrevive al desastre, así que el automático no volvía a
 *   correr hasta 24 h después y el historial quedaba vacío un día entero
 *   (justo el aviso "Todavía no existe ningún backup"). Si la tabla ni
 *   siquiera se puede leer (storage dañado), devuelve false: no tiene
 *   sentido reintentar cada minuto algo que sigue roto (el fallo ya queda
 *   reportado por runAutoBackup/watcher).
 * @returns {Promise<boolean>}
 */
export async function hayQueEjecutarBackup() {
  if (getBackupFrequency() === "manual") return false;
  if (isBackupDue()) return true;
  try {
    return (await appDB.auto_backups.count()) === 0;
  } catch {
    return false;
  }
}

const NORMALIZED_KEY = "app.auto-backups-normalized";

function yieldToUI() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Normalización one-time (1.9.5): los snapshots antiguos incluían la tabla
 * `auto_backups` completa (backups dentro de backups) y los snapshots de
 * migración guardaban otra copia del historial. Se elimina ese anidamiento
 * registro por registro, cediendo el hilo entre cada uno, para que leer el
 * historial deje de congelar la UI. Idempotente: solo corre una vez.
 */
export async function normalizeAutoBackupHistory() {
  try {
    if (localStorage.getItem(NORMALIZED_KEY)) return 0;

    let normalizados = 0;
    // Se itera por clave primaria (`++id`) y se recupera fila por fila para
    // no cargar todo el historial en memoria de una sola vez.
    const ids = await appDB.auto_backups.toCollection().primaryKeys();
    for (const id of ids) {
      const row = await appDB.auto_backups.get(id);
      const anidados = row?.backup?.data?.db?.auto_backups;
      if (Array.isArray(anidados) && anidados.length > 0) {
        delete row.backup.data.db.auto_backups;
        await appDB.auto_backups.put(row);
        normalizados += 1;
      }
      await yieldToUI();
    }

    const snapshotIds = await appDB.migration_snapshots.toCollection().primaryKeys();
    for (const id of snapshotIds) {
      const snapshot = await appDB.migration_snapshots.get(id);
      const copia = snapshot?.data?.auto_backups;
      if (Array.isArray(copia) && copia.length > 0) {
        snapshot.data.auto_backups = [];
        await appDB.migration_snapshots.put(snapshot);
        normalizados += 1;
      }
      await yieldToUI();
    }

    localStorage.setItem(NORMALIZED_KEY, "1");
    return normalizados;
  } catch (error) {
    reportError(error, { context: "autoBackup.normalizeAutoBackupHistory" });
    return 0;
  }
}

/** Elimina un backup del historial. */
export async function deleteBackup(id) {
  await appDB.auto_backups.delete(id);
}

/** Restaura un backup del historial. */
export async function restoreFromHistory(id) {
  const record = await appDB.auto_backups.get(id);
  if (!record || !record.backup) throw new Error("Backup no encontrado");
  await importBackup(record.backup);
}

/**
 * Verificación periódica: ejecuta backup si corresponde y avisa al usuario
 * si hace mucho que no se respalda. Devuelve un handler para limpiar timers.
 *
 * A partir de v1.3.0, también verifica si es momento de hacer backup
 * según el cierre de jornada de Mi Espacio.
 */
export function setupAutoBackupWatcher() {
  const check = async () => {
    try {
      // 1) Backup por frecuencia O historial vacío (v1.10.7: ver
      //    hayQueEjecutarBackup — evita que, tras recrearse la DB, el
      //    historial quede vacío hasta la próxima ventana de 24 h).
      if (await hayQueEjecutarBackup()) {
        const result = await runAutoBackup({ reason: 'frecuencia' });
        if (!result.ok) {
          import("../core/notifications/notificationStore").then(({ default: store }) =>
            store.getState().addPersistentAlert({
              type: "warning",
              title: "No se pudo hacer el backup automático",
              message: result.error || "Ocurrió un error. Revisá tu almacenamiento.",
              id: "auto-backup-failed",
            })
          );
        }
        return;
      }

      // 2) Backup por cierre de jornada
      if (isWorkDay() && !hasJornadaBackupRunToday()) {
        const schedule = getJornadaBackupSchedule();
        if (schedule) {
          const now = new Date();
          const diff = schedule.backupTime.getTime() - now.getTime();
          // Si estamos dentro del minuto del backup programado
          // Ventana amplia (±5 min) para compensar throttling de setInterval en tabs background
          if (diff <= 300000 && diff >= -300000) {
            await runAutoBackup({ reason: 'jornada' });
            return;
          }
        }
      }

      // 3) Recordatorio si hace mucho sin backup
      const days = daysSinceLastBackup();
      if (days === null || days < 1) return;
      const frequency = getBackupFrequency();
      const limit = REMINDER_LIMIT_DAYS[frequency] ?? 2;
      if (days >= limit) {
        import("../core/notifications/notificationStore").then(({ default: store }) =>
          store.getState().addPersistentAlert({
            type: "warning",
            title: `Hacé un backup (${days} día${days === 1 ? "" : "s"} sin respaldar)`,
            message:
              "Podés exportar un respaldo desde Configuración > General > Datos para proteger tus datos.",
            id: "backup-reminder",
          })
        );
      }
    } catch (error) {
      reportError(error, { context: "autoBackup.check" });
    }
  };

  check();
  // Verificar cada 1 minuto para detectar el momento exacto del backup de jornada
  const interval = setInterval(check, 60 * 1000);
  window.addEventListener("online", check);
  return () => {
    clearInterval(interval);
    window.removeEventListener("online", check);
  };
}
