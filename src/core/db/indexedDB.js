import Dexie from 'dexie';
import { setupDexieLifecycle } from './dbLifecycle';

const db = new Dexie('AppDiagnostics');

db.version(2).stores({
  errors: '++id, type, timestamp',
});

setupDexieLifecycle(db, { name: 'AppDiagnostics' });

export default db;
