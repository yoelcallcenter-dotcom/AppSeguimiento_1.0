/**
 * backup/backupMigrator.js
 * Motor de migración de backups antiguos al formato actual.
 *
 * Cada migración es explícita, incremental, idempotente y no destructiva.
 * Se trabaja sobre una copia en memoria; el archivo original no se modifica.
 *
 * Flujo:
 *   backup antiguo → detección de formato → identificación de versión
 *   → migración incremental → validación → backup compatible actual
 */

import { BACKUP_VERSION, STORAGE_KEYS, CONFIG_KEYS, LEGACY_BACKUP_KINDS } from './constants';

const BACKUP_SCHEMA_VERSION_CURRENT = 2;

/**
 * Registra de migraciones conocidas. Cada entrada:
 * {
 *   from: number (schema version de origen),
 *   to:   number (schema version de destino),
 *   migrate: (backup) => backup  (función pura, trabaja sobre copia)
 * }
 */
const MIGRATIONS = [
  {
    from: 0,
    to: 1,
    migrate(backup) {
      const copy = structuredClone(backup);
      if (!copy.kind) copy.kind = 'appseguimiento-backup';
      if (typeof copy.version !== 'number') copy.version = 1;
      if (!copy.data) copy.data = {};
      if (!copy.data.db) copy.data.db = {};
      if (!copy.data.storage) copy.data.storage = {};
      return copy;
    },
  },
  {
    from: 1,
    to: 2,
    migrate(backup) {
      const copy = structuredClone(backup);
      if (LEGACY_BACKUP_KINDS.includes(copy.kind)) {
        copy.kind = 'appseguimiento-backup';
      }
      if (!copy.data) copy.data = {};
      if (!copy.data.db) copy.data.db = {};
      if (!copy.data.storage) copy.data.storage = {};
      if (!copy.data.storage['transito-seleccion-art-tracker']) {
        copy.data.storage['transito-seleccion-art-tracker'] = [];
      }
      return copy;
    },
  },
];

/**
 * Migra un backup desde su versión de esquema original hasta la actual.
 * @param {object} backup - Backup original (no se modifica).
 * @returns {{ migrated: object, applied: Array<{from:number,to:number}>, warnings: string[] }}
 * @throws Si la migración falla o no es segura.
 */
export function migrateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Backup inválido');
  }

  const copy = structuredClone(backup);
  let currentVersion = typeof copy.version === 'number' ? copy.version : 0;
  const applied = [];
  const warnings = [];

  if (currentVersion >= BACKUP_SCHEMA_VERSION_CURRENT) {
    return { migrated: copy, applied, warnings };
  }

  let iterations = 0;
  const MAX_ITERATIONS = 20;

  while (currentVersion < BACKUP_SCHEMA_VERSION_CURRENT && iterations < MAX_ITERATIONS) {
    const migration = MIGRATIONS.find((m) => m.from === currentVersion);
    if (!migration) {
      warnings.push(`No se encontró migración desde versión ${currentVersion}. Se detiene.`);
      break;
    }
    const result = migration.migrate(copy);
    if (!result || typeof result !== 'object') {
      throw new Error(`La migración ${currentVersion}→${migration.to} devolvió un resultado inválido`);
    }
    Object.assign(copy, result);
    currentVersion = migration.to;
    copy.version = currentVersion;
    applied.push({ from: migration.from, to: migration.to });
    iterations++;
  }

  if (currentVersion < BACKUP_SCHEMA_VERSION_CURRENT) {
    warnings.push(`Backup en versión ${currentVersion}, esperado ${BACKUP_SCHEMA_VERSION_CURRENT}.`);
  }

  copy.appVersion = copy.appVersion || BACKUP_VERSION;
  return { migrated: copy, applied, warnings };
}

/**
 * Detecta si un backup requiere migración.
 */
export function needsMigration(backup) {
  if (!backup || typeof backup !== 'object') return false;
  const v = typeof backup.version === 'number' ? backup.version : 0;
  return v < BACKUP_SCHEMA_VERSION_CURRENT;
}

/**
 * Detecta el formato legacy de un backup sin versión.
 */
export function detectLegacyFormat(backup) {
  if (!backup || typeof backup !== 'object') return null;
  if (!backup.kind) return null;
  const legacyKinds = ['seguimiento-art-backup'];
  if (legacyKinds.includes(backup.kind)) return 'legacy-seguimiento';
  return null;
}

/**
 * Valida que un backup migrado tenga la estructura mínima esperada.
 * @returns {string[]} Array de errores (vacío = válido)
 */
export function validateMigratedBackup(backup) {
  const errors = [];
  if (!backup || typeof backup !== 'object') {
    errors.push('El backup migrado no es un objeto válido');
    return errors;
  }
  if (backup.kind !== 'appseguimiento-backup') {
    errors.push('Kind de backup incorrecto después de migración');
  }
  if (typeof backup.version !== 'number' || backup.version < BACKUP_SCHEMA_VERSION_CURRENT) {
    errors.push(`Versión de esquema inválida después de migración: ${backup.version}`);
  }
  if (!backup.data || typeof backup.data !== 'object') {
    errors.push('Estructura de datos faltante después de migración');
  }
  return errors;
}

/**
 * Migra y valida un backup, preparándolo para restauración.
 * @param {object} backup - Backup original.
 * @returns {{ backup: object, applied: Array, warnings: string[], needsRestore: boolean }}
 */
export function prepareBackupForRestore(backup) {
  if (!needsMigration(backup)) {
    return { backup, applied: [], warnings: [], needsRestore: true };
  }

  const { migrated, applied, warnings } = migrateBackup(backup);
  const errors = validateMigratedBackup(migrated);
  if (errors.length > 0) {
    return {
      backup: null,
      applied,
      warnings: [...warnings, ...errors],
      needsRestore: false,
    };
  }

  return { backup: migrated, applied, warnings, needsRestore: true };
}
