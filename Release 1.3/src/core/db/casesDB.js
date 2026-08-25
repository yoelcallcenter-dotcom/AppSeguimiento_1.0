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

setupDexieLifecycle(casesDB, { name: 'CasesDB' });

export default casesDB;
