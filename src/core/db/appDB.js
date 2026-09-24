import Dexie from 'dexie';
import { setupDexieLifecycle } from './dbLifecycle';

const appDB = new Dexie('AppData');

appDB.version(1).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
});

appDB.version(2).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
});

// v3: backfill de version/updatedAt en notas, eventos y versiones existentes.
appDB.version(3).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
}).upgrade((tx) => {
  const stamp = (item) => {
    if (item.updatedAt === undefined) {
      item.updatedAt = item.createdAt || new Date().toISOString();
    }
    if (typeof item.version !== 'number') {
      item.version = 1;
    }
  };
  return Promise.all([
    tx.table('notes').toCollection().modify(stamp),
    tx.table('events').toCollection().modify(stamp),
    tx.table('note_versions').toCollection().modify(stamp),
  ]);
});

// v4: respaldos automáticos locales (historial con rotación).
appDB.version(4).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
});

// v5: snapshot previo al upgrade + auditoría de migraciones. Antes de aplicar
// cualquier cambio de schema futuro, se vuelca el estado completo de las tablas
// a migration_snapshots para poder revertir o diagnosticar una migración.
const MAX_SNAPSHOTS = 5;
appDB.version(5).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
  migration_snapshots: '++id, fromVersion, toVersion, createdAt',
}).upgrade(async (tx) => {
  const tables = ['events', 'notes', 'note_versions', 'auto_backups'];
  const data = {};
  for (const t of tables) {
    try {
      data[t] = await tx.table(t).toArray();
    } catch {
      data[t] = [];
    }
  }
  await tx.table('migration_snapshots').add({
    fromVersion: 4,
    toVersion: 5,
    createdAt: new Date().toISOString(),
    data,
  });
  const snapshots = await tx.table('migration_snapshots').orderBy('id').toArray();
  const excess = snapshots.length - MAX_SNAPSHOTS;
  if (excess > 0) {
    const toRemove = snapshots.slice(0, excess);
    await Promise.all(toRemove.map((s) => tx.table('migration_snapshots').delete(s.id)));
  }
});

// v6: sistema de plantillas reutilizables (1.7.4).
appDB.version(6).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
  migration_snapshots: '++id, fromVersion, toVersion, createdAt',
  templates: '++id, name, category, type, active, createdAt, updatedAt',
});

// v7: (histórico).
appDB.version(7).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
  migration_snapshots: '++id, fromVersion, toVersion, createdAt',
  templates: '++id, name, category, type, active, createdAt, updatedAt',
});

// v8: (histórico).
appDB.version(8).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
  migration_snapshots: '++id, fromVersion, toVersion, createdAt',
  templates: '++id, name, category, type, active, createdAt, updatedAt',
});

// v9: el sistema de automatizaciones fue eliminado; se descartan las tablas
// automation_rules y automation_execution_logs de instalaciones existentes.
appDB.version(9).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
  migration_snapshots: '++id, fromVersion, toVersion, createdAt',
  templates: '++id, name, category, type, active, createdAt, updatedAt',
});

// v10: reportes guardados (1.7.10) — configuraciones de filtros persistidas
// desde la vista Reportes, incluidas en backup/export/import.
appDB.version(10).stores({
  events: '++id, startDate, endDate, status, priority, relatedNoteId, createdAt',
  notes: '++id, title, createdAt, updatedAt, *tags',
  note_versions: '++id, noteId, createdAt',
  auto_backups: '++id, timestamp, kind',
  migration_snapshots: '++id, fromVersion, toVersion, createdAt',
  templates: '++id, name, category, type, active, createdAt, updatedAt',
  saved_reports: '++id, nombre, updatedAt',
});

/** Versión de schema actual que la app conoce. */
export const APP_DB_SCHEMA_VERSION = 10;

setupDexieLifecycle(appDB, { name: 'AppData' });

export default appDB;
