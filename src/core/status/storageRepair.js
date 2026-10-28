/**
 * storageRepair.js — v1.10.8 (mejorado en v1.10.9)
 * Reparación PROFUNDA del almacenamiento local.
 *
 * Motivo: el estado "Data lost due to missing file" de Chromium vive en el
 * ARCHIVO del origen (perfil del navegador). Vaciar tablas con `.clear()` NO
 * lo cura — un clear sobre el registro dañado vuelve a fallar — y ninguna
 * otra acción de la app reinicia ese estado. La única vía desde dentro de la
 * app es `indexedDB.deleteDatabase()` de las bases COMPLETAS: el navegador
 * las descarta y, al reabrir, recrea un esquema sano.
 *
 * v1.10.9: se borran las TRES bases, no dos — faltaba AppDiagnostics (el log
 * de errores, `core/db/indexedDB.js`): si su archivo está dañado, cada
 * reportError vuelve a apretar la bandera de pérdida y jamás se curaba desde
 * la app. Además se deja una marca (storageHealth.marcarReparacionProfunda)
 * antes del drop: si tras la recarga las lecturas SIGUEN fallando, el banner
 * puede diagnosticar "el daño no está en las bases que la app recrea"
 * (borrado bloqueado por otra pestaña/PWA, u otro origen) en vez de mostrar
 * el mismo error sin contexto.
 *
 * A propósito NO se toca la huella de conteos ni la bandera de pérdida
 * (storageHealth): tras el drop + recarga, la verificación post-carga
 * compara la huella previa con la base nueva y dispara la alarma
 * "notas: X → 0" con "Restaurar desde archivo" a un clic. Sin la huella
 * intacta, el usuario no tendría cómo enterarse de qué perdió.
 *
 * Riesgo: el drop ELIMINA los datos locales que queden legibles. Por eso la
 * UI exige confirmación explícita y recomienda (previamente) "Descargar lo
 * disponible" o tener un archivo de backup.
 */

import appDB from "../db/appDB";
import casesDB from "../db/casesDB";
// v1.10.9: tercera base (log de errores) — ver comentario del header.
import diagnosticsDB from "../db/indexedDB";
import { marcarReparacionProfunda, limpiarReparacionProfunda } from "./storageHealth";

/** Espera máxima tras un `blocked` (otras pestañas con la base abierta). */
const TIMEOUT_BLOQUEO_MS = 8000;

/**
 * Borra una base completa. Resuelve SIEMPRE (nunca deja promesas colgadas):
 *  - ok: el navegador la descartó;
 *  - bloqueado: otra conexión la mantiene abierta tras el timeout;
 *  - error: fallo del deleteDatabase.
 * @param {Dexie} db
 * @param {number} timeoutMs
 * @returns {Promise<{ok: boolean, bloqueado?: boolean, error?: string}>}
 */
function borrarBase(db, timeoutMs) {
  return new Promise((resolve) => {
    let terminado = false;
    const fin = (resultado) => {
      if (!terminado) {
        terminado = true;
        resolve(resultado);
      }
    };
    try {
      const req = indexedDB.deleteDatabase(db.name);
      req.onsuccess = () => fin({ ok: true });
      req.onerror = () =>
        fin({
          ok: false,
          error: String((req.error && req.error.message) || "error desconocido"),
        });
      req.onblocked = () => {
        // Otras pestañas/instancias mantienen la base abierta. Dexie cierra
        // sus conexiones ante versionchange, así que se aguarda un tiempo a
        // que se soltten; si sigue tomada, se informa (cerrar pestañas).
        setTimeout(() => fin({ ok: false, bloqueado: true }), timeoutMs);
      };
    } catch (err) {
      fin({ ok: false, error: String((err && err.message) || err) });
    }
  });
}

/**
 * Borra y recrea las bases locales (AppData + CasesDB).
 * @param {object} [options]
 * @param {() => void} [options.recargar] inyección para tests (por defecto
 *        recarga la página — la app queda inutilizable con las bases cerradas).
 * @param {number} [options.timeoutMs] timeout de bloqueo (tests con timers).
 * @returns {Promise<{ok: boolean, bloqueado?: boolean, error?: string}>}
 */
export async function repararAlmacenamientoLocal(options = {}) {
  const recargar = options.recargar || (() => window.location.reload());
  const timeoutMs = options.timeoutMs || TIMEOUT_BLOQUEO_MS;

  // 1) Cerrar NUESTRAS conexiones: no deben bloquear el delete.
  try { casesDB.close(); } catch { /* ya cerrada */ }
  try { appDB.close(); } catch { /* ya cerrada */ }
  // v1.10.9: AppDiagnostics también — si su archivo está dañado, cada
  // escritura de log re-aprieta la bandera de pérdida.
  try { diagnosticsDB.close(); } catch { /* ya cerrada */ }

  // 2) Marca de reparación (v1.10.9): si las lecturas siguen fallando tras
  //    la recarga, el banner lo sabrá diagnosticar. Se setea ANTES del drop
  //    para sobrevivir a un cuelgue del navegador.
  marcarReparacionProfunda();

  // 3) Borrar las tres bases por completo (best-effort en paralelo).
  const resultados = await Promise.all([
    borrarBase(appDB, timeoutMs),
    borrarBase(casesDB, timeoutMs),
    // v1.10.9: log de errores incluido.
    borrarBase(diagnosticsDB, timeoutMs),
  ]);
  const falla = resultados.find((r) => !r.ok);
  if (falla) {
    // No hubo reparación real → la marca induciría a diagnósticos falsos.
    limpiarReparacionProfunda();
    return { ok: false, ...falla };
  }

  // 4) Recargar: al reabrir, bases sanas + huella intacta → la verificación
  //    post-carga dispara la alarma de pérdida con "Restaurar desde archivo".
  recargar();
  return { ok: true };
}
