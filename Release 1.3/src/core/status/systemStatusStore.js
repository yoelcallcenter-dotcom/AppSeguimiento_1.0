/**
 * systemStatusStore.js
 * Estado global del sistema: conectividad, almacenamiento y salud de la DB.
 * Consumido por SystemStatusBanner y otros componentes.
 */

import { create } from "zustand";

const useSystemStatus = create((set) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  storagePersisted: null,
  storageUsagePct: null,
  storageQuotaBytes: null,
  dbAvailable: true,
  lastQuotaErrorAt: 0,
  schemaDowngrade: false,

  setOnline: (online) => set({ online }),
  setStoragePersisted: (storagePersisted) => set({ storagePersisted }),
  setStorageUsage: (usagePct, quotaBytes) =>
    set({ storageUsagePct: usagePct, storageQuotaBytes: quotaBytes }),
  setDbAvailable: (dbAvailable) => set({ dbAvailable }),
  setQuotaError: () => set({ lastQuotaErrorAt: Date.now() }),
  setSchemaDowngrade: (schemaDowngrade) => set({ schemaDowngrade }),
}));

export default useSystemStatus;
