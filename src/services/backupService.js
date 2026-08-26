/**
 * backupService.js
 * Sistema de backup completo y real basado en IndexedDB (Dexie).
 *
 * Exporta TODOS los datos del usuario:
 *  - Casos e historial de casos (casesDB)
 *  - Notas, eventos y versiones de notas (appDB)
 *  - Configuración y útiles (localStorage vía localStorageAdapter, prefijo app_)
 *
 * El import es atómico por base de datos (Dexie transaction) y se valida
 * esquema + checksum antes de escribir. Ante un fallo, se intenta restaurar
 * el estado previo desde una snapshot en memoria.
 */

import casesDB from "../core/db/casesDB";
import appDB from "../core/db/appDB";
import { localStorageAdapter } from "../core/storage/localStorageAdapter";
import { BACKUP_VERSION as APP_VERSION, LEGACY_BACKUP_KINDS } from "../utils/backup/constants";
import { notifyChange, SYNC_EVENTS } from "../core/sync/syncService";
import { migrateBackup, validateMigratedBackup, needsMigration } from "../utils/backup/backupMigrator";

export const BACKUP_KIND = "appseguimiento-backup";
export const BACKUP_SCHEMA_VERSION = 2;

/** Tablas de datos del usuario (excluye diagnostics/logs). */
const DB_TABLES = [
  { db: "casesDB", name: "cases" },
  { db: "casesDB", name: "case_history" },
  { db: "appDB", name: "notes" },
  { db: "appDB", name: "events" },
  { db: "appDB", name: "note_versions" },
];

const DB_INSTANCES = { casesDB, appDB };

function safeJSONParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Computa un checksum (SHA-256 cuando está disponible) del payload.
 * Fallback a un hash FNV-1a para entornos sin WebCrypto (tests/SSR).
 */
export async function computeChecksum(payload) {
  const json = JSON.stringify(payload);
  try {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const buf = await globalThis.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(json)
      );
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    /* fallthrough to FNV-1a */
  }
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}

async function readTable(dbName, tableName) {
  return await DB_INSTANCES[dbName][tableName].toArray();
}

/**
 * Exporta un backup completo con checksum.
 * @returns {Promise<object>} objeto backup listo para serializar.
 */
export async function exportBackup() {
  const entries = await Promise.all(
    DB_TABLES.map((t) => readTable(t.db, t.name).then((rows) => [t.name, rows]))
  );

  const db = {};
  for (const [name, rows] of entries) db[name] = rows;

  const storage = localStorageAdapter.getAll();

  const payload = { db, storage };
  const checksum = await computeChecksum(payload);

  return {
    kind: BACKUP_KIND,
    version: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    checksum,
    data: payload,
  };
}

/**
 * Valida la estructura de un backup. Devuelve array de errores (vacío = OK).
 */
export function validateBackup(backup) {
  const errors = [];
  if (!backup || typeof backup !== "object") {
    errors.push("El archivo no es un objeto válido");
    return errors;
  }
  if (backup.kind !== BACKUP_KIND && !LEGACY_BACKUP_KINDS.includes(backup.kind)) {
    errors.push("El archivo no es un backup de AppSeguimiento");
  }
  if (
    typeof backup.version === "number" &&
    backup.version > BACKUP_SCHEMA_VERSION
  ) {
    errors.push(
      `El backup proviene de una versión futura del esquema (${backup.version})`
    );
  }
  if (!backup.data || typeof backup.data !== "object") {
    errors.push("El backup no contiene datos");
    return errors;
  }
  if (backup.data.db && typeof backup.data.db !== "object") {
    errors.push("El backup tiene una estructura de base de datos inválida");
  }
  if (backup.data.storage && typeof backup.data.storage !== "object") {
    errors.push("El backup tiene una estructura de configuración inválida");
  }
  return errors;
}

/**
 * Verifica el checksum del backup (si está presente).
 * @returns {Promise<boolean>} true si coincide o no hay checksum.
 */
export async function verifyChecksum(backup) {
  if (!backup.checksum || !backup.data) return true;
  const expected = await computeChecksum(backup.data);
  return expected === backup.checksum;
}

/**
 * Tamaño aproximado en KB de un backup.
 */
export function backupSizeKB(backup) {
  try {
    const bytes = new Blob([JSON.stringify(backup)]).size;
    return Math.max(1, Math.round(bytes / 1024));
  } catch {
    return 0;
  }
}

/**
 * Importa un backup de forma segura (atómica por base + rollback).
 * Si el backup requiere migración, se ejecuta antes de restaurar.
 * @param {object} backup backup validado por validateBackup/verifyChecksum.
 * @param {object} [options] selección de componentes a restaurar.
 * @param {boolean} [options.casos=true] restaurar casos.
 * @param {boolean} [options.notas=true] restaurar notas (+ versiones).
 * @param {boolean} [options.eventos=true] restaurar eventos.
 * @param {boolean} [options.config=true] restaurar configuración y útiles.
 * @param {boolean} [options.permitirVaciar=false] Integridad 1.3.3: permite
 *        explícitamente que una restauración con 0 casos vacíe la colección
 *        existente (requiere confirmación del usuario en la UI).
 * @returns {Promise<{counts: object, migration?: object, warnings: string[], safeguardId: number|null}>}
 */
export async function importBackup(backup, options = {}) {
  // Aplicar migración si el backup es de un formato anterior.
  let effectiveBackup = backup;
  let migrationInfo = null;

  if (needsMigration(backup)) {
    const { migrated, applied, warnings } = migrateBackup(backup);
    const errors = validateMigratedBackup(migrated);
    if (errors.length > 0) {
      throw new Error(
        `Migración del backup falló: ${errors.join('. ')}`
      );
    }
    effectiveBackup = migrated;
    migrationInfo = { applied, warnings };
  }

  const errors = validateBackup(effectiveBackup);
  if (errors.length > 0) throw new Error(errors.join(". "));

  const checksumOk = await verifyChecksum(effectiveBackup);
  if (!checksumOk) {
    if (migrationInfo) {
      console.warn('[backupService] Checksum no coincide después de migración; se omite verificación.');
    } else {
      throw new Error("El backup está corrupto (checksum no coincide)");
    }
  }

  const opts = {
    casos: options.casos !== false,
    notas: options.notas !== false,
    eventos: options.eventos !== false,
    config: options.config !== false,
    // Integridad (1.3.3): solo en true tras confirmación explícita del usuario.
    permitirVaciar: options.permitirVaciar === true,
  };

  const db = effectiveBackup.data.db || {};
  const storage = effectiveBackup.data.storage || {};
  const warnings = [];

  // ============================================================
  // INTEGRIDAD (1.3.3): protección contra reemplazos que vacían datos.
  //   - Sección ausente → se omite el bloque con advertencia (no se borra).
  //   - Sección presente pero vacía con datos existentes → CRITICAL, salvo
  //     que el usuario confirme explícitamente el vaciado.
  // ============================================================
  if (opts.casos) {
    let actuales = [];
    try { actuales = await casesDB.cases.toArray(); } catch { actuales = []; }

    if (!Array.isArray(db.cases)) {
      if (actuales.length > 0) {
        opts.casos = false;
        warnings.push(
          "El backup no incluye la sección de casos: los casos actuales no fueron modificados."
        );
      }
    } else if (db.cases.length === 0 && actuales.length > 0 && !opts.permitirVaciar) {
      throw new Error(
        `Operación bloqueada por integridad de datos: el backup no contiene casos y la restauración vaciaría ${actuales.length} caso(s) existente(s). Si realmente querés reemplazar todo, confirmá explícitamente la operación de vaciado.`
      );
    }
  }

  // Snapshot "Seguridad" previo a escribir (best-effort; su fallo no bloquea).
  let safeguardId = null;
  if (opts.casos || opts.notas || opts.eventos) {
    try {
      const snapshot = await exportBackup();
      safeguardId = await appDB.auto_backups.add({
        timestamp: new Date().toISOString(),
        kind: "safeguard",
        sizeKB: backupSizeKB(snapshot),
        counts: {
          cases: snapshot.data?.db?.cases?.length || 0,
          notes: snapshot.data?.db?.notes?.length || 0,
          events: snapshot.data?.db?.events?.length || 0,
        },
        backup: snapshot,
      });
    } catch (err) {
      warnings.push(
        `No se pudo crear la salvaguarda previa: ${err?.message || err}. La restauración continúa.`
      );
    }
  }

  // Snapshot del estado actual para poder hacer rollback ante un fallo.
  const beforeDb = {};
  const beforeStorage = localStorageAdapter.getAll();

  for (const t of DB_TABLES) {
    try {
      beforeDb[t.name] = await readTable(t.db, t.name);
    } catch {
      beforeDb[t.name] = [];
    }
  }

  /** Conserva únicamente filas restaurables (objetos); informa las descartadas. */
  const filasRestaurables = (nombreTabla, rows) => {
    const utiles = rows.filter((r) => r && typeof r === "object" && !Array.isArray(r));
    const descartadas = rows.length - utiles.length;
    if (descartadas > 0) {
      warnings.push(
        `${nombreTabla}: ${descartadas} fila(s) con estructura inválida fueron omitidas.`
      );
    }
    return utiles;
  };

  try {
    // 1) Casos + historial (casesDB).
    //    El historial acompaña a los casos: si el backup es anterior a 1.3.1
    //    no contiene case_history y se aplica el default seguro (historial
    //    vacío), sin inventar eventos que no existieron.
    if (opts.casos) {
      const casosEntrantes = Array.isArray(db.cases)
        ? filasRestaurables("casos", db.cases)
        : [];
      const historyRows = Array.isArray(db.case_history)
        ? filasRestaurables("historial de casos", db.case_history)
        : [];
      await casesDB.transaction("rw", [casesDB.cases, casesDB.case_history], async () => {
        await casesDB.cases.clear();
        if (casosEntrantes.length > 0) {
          await casesDB.cases.bulkPut(casosEntrantes);
        }
        await casesDB.case_history.clear();
        if (historyRows.length > 0) {
          await casesDB.case_history.bulkPut(historyRows);
        }
      });
    }

    // 2) Notas, eventos y versiones (appDB) — un solo objeto de transacción.
    //    Las tablas se filtran según los componentes elegidos:
    //    notas → notes + note_versions; eventos → events.
    const appTables = DB_TABLES.filter((t) => t.db === "appDB").filter((t) => {
      if (t.name === "events") return opts.eventos;
      return opts.notas;
    });
    if (appTables.length > 0) {
      // Secciones ausentes del backup: se omiten con advertencia sin borrar
      // los datos actuales (preservación antes que limpieza).
      for (const t of appTables) {
        if (!(t.name in db)) {
          warnings.push(
            `El backup no incluye la sección "${t.name}": los datos actuales no fueron modificados.`
          );
        }
      }
      const presentes = appTables.filter((t) => Array.isArray(db[t.name]));
      if (presentes.length > 0) {
        await appDB.transaction(
          "rw",
          presentes.map((t) => appDB[t.name]),
          async () => {
            for (const t of presentes) {
              const utiles = filasRestaurables(t.name, db[t.name]);
              await appDB[t.name].clear();
              if (utiles.length > 0) {
                await appDB[t.name].bulkPut(utiles);
              }
            }
          }
        );
      }
    }

    // 3) Configuración y útiles (localStorage).
    //    Se limpian las claves actuales que no forman parte del backup para
    //    que la restauración sea completa (sin restos de versiones previas),
    //    incluyendo las claves sin prefijo (conversaciones_*, calendario-eventos).
    if (opts.config) {
      if (!storage || typeof storage !== "object" || Array.isArray(storage)) {
        warnings.push(
          "La sección de configuración del backup tiene estructura inválida y fue omitida."
        );
      } else {
        const isRawKey = (key) =>
          localStorageAdapter.unprefixedInclude(key);

        // getAllKeys() devuelve claves crudas (prefijadas app_* y sin prefijo).
        // Se convierten a su forma lógica para compararlas contra `storage`
        // y se eliminan correctamente sin volver a aplicar el prefijo.
        const currentRawKeys = localStorageAdapter.getAllKeys();
        for (const rawKey of currentRawKeys) {
          const logicalKey = rawKey.startsWith(localStorageAdapter.prefix)
            ? rawKey.slice(localStorageAdapter.prefix.length)
            : rawKey;
          if (!(logicalKey in storage)) {
            if (isRawKey(rawKey)) localStorageAdapter.removeRaw(rawKey);
            else localStorageAdapter.remove(logicalKey);
          }
        }
        for (const [key, value] of Object.entries(storage)) {
          if (isRawKey(key)) localStorageAdapter.setRaw(key, value);
          else localStorageAdapter.set(key, value);
        }
      }
    }

    const counts = {};
    for (const t of DB_TABLES) {
      if (t.db === "casesDB" && !opts.casos) continue;
      if (t.db === "appDB" && t.name === "events" && !opts.eventos) continue;
      if (t.db === "appDB" && t.name !== "events" && !opts.notas) continue;
      counts[t.name] = Array.isArray(db[t.name]) ? db[t.name].length : 0;
    }
    if (!opts.config) counts.config = 0;

    notifyChange(SYNC_EVENTS.ALL_DATA_UPDATED, { source: "backup-restore", counts });

    return {
      counts,
      storageKeys: opts.config && storage && typeof storage === "object" ? Object.keys(storage).length : 0,
      migration: migrationInfo,
      warnings,
      safeguardId,
    };
  } catch (error) {
    // Rollback del estado previo (solo de lo que se haya reemplazado).
    try {
      if (opts.casos) {
        await casesDB.transaction("rw", [casesDB.cases, casesDB.case_history], async () => {
          await casesDB.cases.clear();
          if (beforeDb.cases && beforeDb.cases.length > 0) {
            await casesDB.cases.bulkPut(beforeDb.cases);
          }
          await casesDB.case_history.clear();
          if (beforeDb.case_history && beforeDb.case_history.length > 0) {
            await casesDB.case_history.bulkPut(beforeDb.case_history);
          }
        });
      }
      if (opts.notas || opts.eventos) {
        const rollbackTables = DB_TABLES.filter((t) => t.db === "appDB").filter((t) => {
          if (t.name === "events") return opts.eventos;
          return opts.notas;
        });
        await appDB.transaction(
          "rw",
          rollbackTables.map((t) => appDB[t.name]),
          async () => {
            for (const t of rollbackTables) {
              await appDB[t.name].clear();
              if (beforeDb[t.name] && beforeDb[t.name].length > 0) {
                await appDB[t.name].bulkPut(beforeDb[t.name]);
              }
            }
          }
        );
      }
      if (opts.config) {
        for (const [key, value] of Object.entries(beforeStorage)) {
          try {
            if (key.startsWith("conversaciones_") || key === "calendario-eventos") {
              localStorageAdapter.setRaw(key, value);
            } else {
              localStorageAdapter.set(key, value);
            }
          } catch {
            /* best-effort */
          }
        }
      }
    } catch {
      /* rollback fallido: no podemos hacer nada más */
    }
    throw error;
  }
}

/**
 * Parsea y valida el contenido de un archivo de backup.
 * @param {string} json contenido del archivo.
 * @returns {Promise<{backup: object|null, error: string|null}>}
 */
export async function parseBackupJSON(json) {
  const backup = safeJSONParse(json, null);
  if (!backup) return { backup: null, error: "El archivo no es un JSON válido" };
  const errors = validateBackup(backup);
  if (errors.length > 0) return { backup: null, error: errors.join(". ") };
  const checksumOk = await verifyChecksum(backup);
  if (!checksumOk && !needsMigration(backup)) {
    return { backup: null, error: "El backup está corrupto (checksum no coincide)" };
  }
  return { backup, error: null };
}

/**
 * Descarga un backup completo como archivo JSON.
 * @returns {Promise<{name: string, sizeKB: number, counts: object}>}
 */
export async function downloadBackup() {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `backup_appseguimiento_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { name: a.download, sizeKB: backupSizeKB(backup) };
}
