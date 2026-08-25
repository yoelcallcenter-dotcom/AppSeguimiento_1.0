import { useState, useEffect, useCallback } from 'react';
import { liveQuery } from 'dexie';
import casesDB from '../core/db/casesDB';
import { caseRepository } from '../core/cases/caseRepository';
import { subscribeToChanges, SYNC_EVENTS } from '../core/sync/syncService';
import useSystemStatus from '../core/status/systemStatusStore';
import { reportError } from '../core/error/reportError';

export function useCases() {
  const [casos, setCasos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const marcarError = useCallback((err) => {
    setError(err);
    useSystemStatus.getState().setDbAvailable(false);
    reportError(err, { context: 'useCases' });
  }, []);

  const aplicarDatos = useCallback((data) => {
    setCasos(data);
    setLoaded(true);
    setError(null);
    useSystemStatus.getState().setDbAvailable(true);
  }, []);

  // Reactividad intra-pestaña: se actualiza automáticamente ante cambios en
  // casesDB (mismo tab u otros tabs, vía el mecanismo de Dexie liveQuery).
  useEffect(() => {
    const subscription = liveQuery(() => casesDB.cases.toArray()).subscribe({
      next: aplicarDatos,
      error: (err) => marcarError(err),
    });
    return () => subscription.unsubscribe();
  }, [aplicarDatos, marcarError]);

  // Cross-pestaña explícita: refresca ante eventos de sync (importaciones,
  // restauraciones o limpieza de datos que no pasan por casesDB directo).
  useEffect(() => {
    return subscribeToChanges((event) => {
      if (
        event.type === SYNC_EVENTS.CASES_UPDATED ||
        event.type === SYNC_EVENTS.ALL_DATA_UPDATED ||
        event.type === SYNC_EVENTS.DATA_IMPORTED ||
        event.type === SYNC_EVENTS.DATA_CLEARED
      ) {
        casesDB.cases.toArray().then(aplicarDatos).catch(marcarError);
      }
    });
  }, [aplicarDatos, marcarError]);

  // Reemplazo total atómico (transacción Dexie) + notificación multi-pestaña.
  const saveAll = useCallback(async (newCasos) => {
    await caseRepository.bulkReplace(newCasos);
  }, []);

  const updateCasos = useCallback(
    (updater) => {
      setCasos((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        saveAll(next);
        return next;
      });
    },
    [saveAll]
  );

  const reload = useCallback(async () => {
    try {
      const data = await casesDB.cases.toArray();
      aplicarDatos(data);
    } catch (err) {
      marcarError(err);
    }
  }, [aplicarDatos, marcarError]);

  const clearAll = useCallback(async () => {
    await caseRepository.bulkReplace([]);
    aplicarDatos([]);
  }, [aplicarDatos]);

  return [casos, updateCasos, loaded, clearAll, reload, error];
}
