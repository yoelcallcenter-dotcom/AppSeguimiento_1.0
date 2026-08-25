import { useState, useEffect } from "react";
import { liveQuery } from "dexie";
import { subscribeToChanges } from "../core/sync/syncService";

/**
 * useLiveQuery
 * Hook base de reactividad consistente sobre Dexie.
 *
 * - Suscripción reactiva intra-pestaña vía liveQuery (se actualiza solo ante
 *   cambios en la base).
 * - Suscripción cross-pestaña vía BroadcastChannel para forzar recargas.
 *
 * @param {() => Promise<*>} queryFn función de consulta (Dexie).
 * @param {{deps?: Array, reloadOnChange?: boolean|string[]}} [opts]
 *   - deps: dependencias que reinician la suscripción.
 *   - reloadOnChange: true para recargar ante cualquier evento sync, o array
 *     de tipos de evento que disparan la recarga.
 * @returns {{data: *, loading: boolean, error: Error|null}}
 */
export function useLiveQuery(
  queryFn,
  { deps = [], reloadOnChange = null } = {}
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const subscription = liveQuery(queryFn).subscribe({
      next: (value) => {
        setData(value);
        setLoading(false);
        setError(null);
      },
      error: (err) => {
        setError(err);
        setLoading(false);
      },
    });
    return () => subscription.unsubscribe();
  }, deps);

  useEffect(() => {
    if (!reloadOnChange) return;
    const shouldReload = (type) =>
      reloadOnChange === true ||
      (Array.isArray(reloadOnChange) && reloadOnChange.includes(type));

    return subscribeToChanges((event) => {
      if (shouldReload(event.type)) {
        queryFn().then((value) => {
          setData(value);
          setLoading(false);
          setError(null);
        });
      }
    });
  }, deps);

  return { data, loading, error };
}
