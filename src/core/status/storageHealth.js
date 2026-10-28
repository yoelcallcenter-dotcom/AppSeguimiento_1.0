/**
 * storageHealth.js
 * Salud del almacenamiento: solicita persistencia, estima el uso de cuota y
 * detecta si IndexedDB está disponible. Actualiza systemStatusStore.
 */

import useSystemStatus from "./systemStatusStore";
import appDB from "../db/appDB";
import casesDB from "../db/casesDB";

/**
 * Detecta un downgrade de schema: si los datos en IndexedDB fueron creados por
 * una versión más nueva de la app, IndexedDB lanza VersionError al abrir.
 * @returns {Promise<Error|null>} el error de downgrade o null si todo está bien.
 */
export async function checkSchemaDowngrade() {
  try {
    await Promise.all([appDB.open(), casesDB.open()]);
    useSystemStatus.getState().setSchemaDowngrade(false);
    return null;
  } catch (err) {
    const isDowngrade =
      !!err &&
      (err.name === "VersionError" ||
        /version/i.test(String(err && err.message || "")));
    if (isDowngrade) {
      useSystemStatus.getState().setSchemaDowngrade(true);
      return err;
    }
    return null;
  }
}

/** Solicita almacenamiento persistente (evita que el navegador evite los datos). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      useSystemStatus.getState().setStoragePersisted(persisted);
      return persisted;
    }
  } catch {
    /* API no disponible */
  }
  useSystemStatus.getState().setStoragePersisted(false);
  return false;
}

/** Estima el uso de cuota y lo refleja en el store (porcentaje + bytes). */
export async function refreshStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      useSystemStatus.getState().setStorageUsage(pct, quota);
      return pct;
    }
  } catch {
    /* API no disponible */
  }
  useSystemStatus.getState().setStorageUsage(null, null);
  return null;
}

/** Comprueba si IndexedDB está disponible (falla en modo privado/restricciones). */
export function isIndexedDBAvailable() {
  try {
    if (typeof indexedDB === "undefined") return false;
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// v1.10.6 — PÉRDIDA DEL ARCHIVO DE INDEXEDDB (errores críticos de información)
// ============================================================
// Chromium puede abortar TODAS las operaciones de un origen con
// "AbortError NotReadableError Data lost due to missing file. Affected
// record should be considered irrecoverable" cuando los archivos que
// respaldan IndexedDB desaparecen (limpieza de disco, antivirus, OneDrive
// sobre el perfil del navegador, corrupción del perfil). Síntoma en la app
// hasta esta versión: listas vacías SIN aviso (los loaders tragaban el
// error) — el usuario creía que sus datos no existían. Este bloque:
//   1. clasifica el error (esAlmacenamientoPerdido), puro y sin efectos;
//   2. registra el estado global (systemStatusStore.storageLost) que consume
//      el banner de emergencia StorageLossBanner;
//   3. guarda una "huella" de conteos en localStorage para detectar al
//      arrancar que la DB se recreó vacía (pérdida silenciosa tras recarga);
//   4. gestiona la alarma de datos (activa → aceptada por el usuario o
//      resuelta mediante restauración).
// ============================================================

/** Bandera: hubo (o hay) pérdida de archivo pendiente de resolver. */
const CLAVE_BANDERA_PERDIDA = "app-storage-lost";
/** Huella de conteos por tabla: evidencia para detectar recreación vacía. */
const CLAVE_HUELLA_DATOS = "app-data-fingerprint";
/** Tablas de la huella (casos viven en CasesDB; notas/eventos en AppData). */
const TABLAS_HUELLA = ["cases", "notes", "events"];

/** Últimos conteos vistos en la verificación post-carga (para aceptar alarma). */
let ultimosConteos = null;

/**
 * ¿El error corresponde a la familia de pérdida del archivo de IndexedDB?
 * Puro: lo llama reportError en CUALQUIER camino de error (carga, escritura,
 * reglas, backups, rechazos no manejados). Desciende en `err.inner` porque
 * Dexie envuelve el error interno.
 * OJO: un AbortError de fetch ("The user aborted a request") NO debe activar
 * la alarma — por eso el nombre por sí solo nunca basta: siempre se exige
 * una señal de mensaje ligada a almacenamiento/base de datos.
 * @param {unknown} err
 * @returns {boolean}
 */
export function esAlmacenamientoPerdido(err) {
  if (!err || typeof err !== "object") return false;
  const nombre = String(err.name || "");
  const mensaje = String(err.message || "");
  // Señal fuerte: el mensaje literal de Chromium. Cubre el shape real
  // observado en producción ("AbortError NotReadableError Data lost due to
  // missing file. Affected record should be considered irrecoverable").
  if (/data lost due to missing file/i.test(mensaje)) return true;
  if (/affected record should be considered irrecoverable/i.test(mensaje)) return true;
  if (/failed to read the .*database/i.test(mensaje)) return true;
  // Señales por familia + contexto de almacenamiento (sin confundir con
  // aborts de fetch u otros AbortError ajenos a la base de datos).
  if (nombre === "NotReadableError" && /database|indexeddb|storage|disk/i.test(mensaje)) return true;
  if (nombre === "AbortError" && /missing file|database|indexeddb|storage|disk/i.test(mensaje)) return true;
  if (err.inner && err.inner !== err) return esAlmacenamientoPerdido(err.inner);
  return false;
}

/**
 * Registra (idempotente) la pérdida de almacenamiento: marca el store global
 * y deja la bandera en localStorage para preservar la evidencia entre
 * sesiones (mientras exista, la huella de conteos no se actualiza).
 * Lo llama reportError de forma SÍNCRONA al inicio: los loaders llaman
 * reportError sin esperar su promesa, así el estado queda registrado antes de
 * que useAppStore.init() ejecute la verificación post-carga.
 * @param {unknown} err
 * @param {string} [contexto]
 */
export function registrarPerdidaAlmacenamiento(err, contexto) {
  const estado = useSystemStatus.getState();
  if (estado.storageLost) return; // ya registrado en esta sesión
  const detalle = {
    mensaje: String((err && (err.message || err.name)) || "Error desconocido").slice(0, 300),
    contexto: contexto ? String(contexto).slice(0, 120) : null,
    desde: new Date().toISOString(),
  };
  estado.setStorageLost(detalle);
  try {
    localStorage.setItem(CLAVE_BANDERA_PERDIDA, "1");
  } catch {
    /* almacenamiento no disponible */
  }
}

/** ¿Queda bandera de pérdida pendiente (de esta o de una sesión anterior)? */
export function hayPerdidaAlmacenamientoPendiente() {
  try {
    return localStorage.getItem(CLAVE_BANDERA_PERDIDA) === "1";
  } catch {
    return false;
  }
}

/** Libera la bandera (recuperación verificada o aceptación/restore del usuario). */
function liberarBanderaPerdida() {
  try {
    localStorage.removeItem(CLAVE_BANDERA_PERDIDA);
  } catch {
    /* almacenamiento no disponible */
  }
}

// ---------- Huella de conteos (evidencia anti-recreación-vacía) ----------

/** Lee la huella persistida ({cases, notes, events, ts}) o null. */
export function leerHuellaDatos() {
  try {
    const raw = localStorage.getItem(CLAVE_HUELLA_DATOS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Actualiza la huella con los conteos cargados CON Éxito (solo esos llamados
 * la invocan). MIENTRAS HAYA BANDERA DE PÉRDIDA NO SE ESCRIBE: si la DB se
 * recreó vacía, el load del arranque la pisaría con 0 y la verificación
 * posterior no encontraría nada que comparar (perderíamos la evidencia).
 * Solo escribe si algo cambió (los loads corren también ante cada sync
 * multi-pestaña: evitar escrituras triviales en localStorage).
 * @param {{cases?: number, notes?: number, events?: number}} conteos
 */
export function actualizarHuellaDatos(conteos) {
  if (!conteos || typeof conteos !== "object") return;
  if (hayPerdidaAlmacenamientoPendiente()) return;
  const prev = leerHuellaDatos();
  const base = prev || {};
  const sig = { ...base, ts: Date.now() };
  let cambia = !prev;
  for (const k of TABLAS_HUELLA) {
    if (typeof conteos[k] !== "number") continue;
    if (base[k] !== conteos[k]) cambia = true;
    sig[k] = conteos[k];
  }
  if (!cambia) return;
  try {
    localStorage.setItem(CLAVE_HUELLA_DATOS, JSON.stringify(sig));
  } catch {
    /* almacenamiento no disponible */
  }
}

/**
 * Compara conteos actuales contra la huella (puro, sin efectos).
 * Alarma SOLO si alguna tabla quedó MENOS que la última sesión (firma de DB
 * recreada vacía). Un crecimiento o la igualdad nunca son alarma: los
 * borrados legítimos actualizan la huella en el mismo load que los refleja,
 * y un restore con menos datos que la huella vieja la re-sincroniza.
 * @param {{cases?: number, notes?: number, events?: number}} conteos
 * @returns {{alarma: boolean, perdidas: Array<{tabla: string, antes: number, ahora: number}>}}
 */
export function evaluarHuellaDatos(conteos) {
  const prev = leerHuellaDatos();
  if (!prev || !conteos) return { alarma: false, perdidas: [] };
  const perdidas = [];
  for (const k of TABLAS_HUELLA) {
    const antes = prev[k];
    const ahora = conteos[k];
    if (typeof antes === "number" && typeof ahora === "number" && ahora < antes) {
      perdidas.push({ tabla: k, antes, ahora });
    }
  }
  return { alarma: perdidas.length > 0, perdidas };
}

/**
 * Verificación post-carga — la llama useAppStore.init() tras terminar los
 * loaders. Casos:
 *  - 'perdido':     la DB no se pudo leer; el banner de emergencia ya está
 *                   activo (reportError la registró) y la huella no se toca.
 *  - 'alarma':      bandera de una sesión anterior + la DB tiene MENOS datos
 *                   que la huella → pérdida silenciosa (recreación vacía).
 *                   La bandera permanece: sigue bloqueando la huella.
 *  - 'recuperado':  había bandera pero los conteos están completos → la
 *                   recarga reparó el acceso; se libera y se avisa.
 *  - 'sin-huellas': había bandera pero NO existe huella previa con qué
 *                   comparar (primer arranque 1.10.6 con la base ya rota):
 *                   no se puede verificar que los datos estén completos →
 *                   init() emite un aviso honesto, no un "todo bien".
 *  - 'ok':          sin novedad.
 * @param {{cases?: number, notes?: number, events?: number}} conteos
 * @returns {{caso: string, perdidas?: Array}}
 */
export function verificarDatosPostCarga(conteos) {
  ultimosConteos = conteos && typeof conteos === "object" ? { ...conteos } : null;
  const estado = useSystemStatus.getState();
  if (estado.storageLost) return { caso: "perdido" };
  const bandera = hayPerdidaAlmacenamientoPendiente();
  const { alarma, perdidas } = evaluarHuellaDatos(conteos || {});
  if (alarma) {
    estado.setDataAlarm(perdidas);
    return { caso: "alarma", perdidas };
  }
  if (bandera) {
    // v1.10.7: si la pérdida se detectó en una sesión SIN huella previa
    // (p. ej. primer arranque en 1.10.6 ya con la base rota), no hay
    // evidencia con qué comparar → no se PUEDE verificar que los datos estén
    // completos. Se devuelve 'sin-huellas' para que init() informe un aviso
    // honesto en lugar del toast de "todo recuperado".
    const hayHuella = !!leerHuellaDatos();
    liberarBanderaPerdida();
    estado.clearStorageLost();
    return hayHuella ? { caso: 'recuperado' } : { caso: 'sin-huellas' };
  }
  return { caso: "ok" };
}

/**
 * El usuario aceptó (botón "Entendido") que los datos visibles pueden estar
 * incompletos: se cierra la alarma, se libera la bandera y se graba la huella
 * con los conteos ACTUALES para que el próximo arranque no vuelva a alarmar
 * por lo ya aceptado explícitamente.
 */
export function aceptarPerdidaDatos() {
  const estado = useSystemStatus.getState();
  estado.clearDataAlarm();
  liberarBanderaPerdida();
  if (ultimosConteos) actualizarHuellaDatos(ultimosConteos);
}

/**
 * Restauración desde archivo exitosa: limpia TODO el estado de pérdida/alarma
 * y sincroniza la huella con los conteos restaurados. Sin esto, la huella
 * anterior (más grande) dispararía una alarma FALSA en el próximo arranque
 * al ver menos datos que antes del restore. Lo llama backupService al
 * finalizar importBackup (también cubre el flujo de Configuración).
 * @param {{cases?: number, notes?: number, events?: number}} [conteos]
 */
export function confirmarRecuperacionDatos(conteos) {
  liberarBanderaPerdida();
  const estado = useSystemStatus.getState();
  estado.clearStorageLost();
  estado.clearDataAlarm();
  if (conteos && typeof conteos === "object") {
    ultimosConteos = { ...(ultimosConteos || {}), ...conteos };
    actualizarHuellaDatos(conteos);
  }
}

/** Solo tests: limpia estado de módulo, store y claves de localStorage. */
export function __resetStorageHealthParaTest() {
  ultimosConteos = null;
  const s = useSystemStatus.getState();
  s.clearStorageLost();
  s.clearDataAlarm();
  try {
    localStorage.removeItem(CLAVE_BANDERA_PERDIDA);
    localStorage.removeItem(CLAVE_HUELLA_DATOS);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Inicializa monitoreo online/offline y dispara las comprobaciones iniciales. */
export function startSystemStatusMonitor() {
  const applyOnline = () => {
    useSystemStatus.getState().setOnline(navigator.onLine);
    if (navigator.onLine) {
      refreshStorageUsage();
    }
  };

  window.addEventListener("online", applyOnline);
  window.addEventListener("offline", applyOnline);

  requestPersistentStorage().finally(refreshStorageUsage);
  checkSchemaDowngrade();

  return () => {
    window.removeEventListener("online", applyOnline);
    window.removeEventListener("offline", applyOnline);
  };
}
