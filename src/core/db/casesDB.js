import Dexie from 'dexie';
import { setupDexieLifecycle } from './dbLifecycle';

const casesDB = new Dexie('CasesDB');

casesDB.version(1).stores({
  cases: 'id, fecha, estado, nombre',
});

// v2: índice de updatedAt y backfill de version/updatedAt para casos existentes.
casesDB.version(2).stores({
  cases: 'id, fecha, estado, nombre, updatedAt',
}).upgrade((tx) => {
  return tx.table('cases').toCollection().modify((c) => {
    if (c.updatedAt === undefined) {
      c.updatedAt = c.createdAt || new Date().toISOString();
    }
    if (typeof c.version !== 'number') {
      c.version = 1;
    }
  });
});

// v3: historial y seguimiento de casos (Release 1.3.1). Cambio aditivo:
// agrega la tabla case_history indexada por caso y fecha; no modifica datos
// existentes ni requiere acción del usuario.
casesDB.version(3).stores({
  cases: 'id, fecha, estado, nombre, updatedAt',
  case_history: '++id, caseId, timestamp, type',
});

setupDexieLifecycle(casesDB, { name: 'CasesDB' });

export default casesDB;
