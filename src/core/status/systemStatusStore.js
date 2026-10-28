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

  // ==== v1.10.6 — pérdida de datos del almacenamiento local ====
  // storageLost: Chromium abortó las operaciones del origen con
  //   "Data lost due to missing file" (los archivos de IndexedDB
  //   desaparecieron: limpieza de disco, antivirus, OneDrive sobre el
  //   perfil, corrupción). Las lecturas fallan o devuelven tablas vacías:
  //   las vistas NO reflejan los datos reales. Lo consume StorageLossBanner
  //   (banner de emergencia fijo) — ver storageHealth.registrarPerdidaAlmacenamiento.
  storageLost: false,
  storageLostDetail: null, // { mensaje, contexto, desde }
  // dataAlarm: la DB volvió a leerse pero con MENOS datos que la última
  //   sesión (firma de recreación vacía tras una recarga). null | { perdidas, desde }.
  dataAlarm: null,

  setOnline: (online) => set({ online }),
  setStoragePersisted: (storagePersisted) => set({ storagePersisted }),
  setStorageUsage: (usagePct, quotaBytes) =>
    set({ storageUsagePct: usagePct, storageQuotaBytes: quotaBytes }),
  setDbAvailable: (dbAvailable) => set({ dbAvailable }),
  setQuotaError: () => set({ lastQuotaErrorAt: Date.now() }),
  setSchemaDowngrade: (schemaDowngrade) => set({ schemaDowngrade }),
  // v1.10.6: acciones del estado de pérdida (idempotentes).
  setStorageLost: (detalle) => set({ storageLost: true, storageLostDetail: detalle || null }),
  clearStorageLost: () => set({ storageLost: false, storageLostDetail: null }),
  setDataAlarm: (perdidas) =>
    set({
      dataAlarm: { perdidas: perdidas || [], desde: new Date().toISOString() },
    }),
  clearDataAlarm: () => set({ dataAlarm: null }),
}));

export default useSystemStatus;
