/**
 * dbLifecycle.js
 * Manejo del ciclo de vida de las bases Dexie para migraciones multi-pestaña
 * seguras (eventos blocked / versionchange).
 */

function safeReload() {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.location !== "undefined" &&
      typeof window.location.reload === "function"
    ) {
      window.location.reload();
    }
  } catch (error) {
    console.warn("[DexieLifecycle] No se pudo recargar:", error);
  }
}

/**
 * Registra los manejadores de ciclo de vida de una base Dexie.
 * - 'blocked': otra pestaña intenta actualizar la base y esta conexión la
 *   bloquea; se cierra la conexión para dejarla avanzar.
 * - 'versionchange': otra pestaña abrió una versión nueva del esquema; se
 *   cierra la conexión y se recarga para usar la nueva versión.
 * @param {import('dexie').default} db
 * @param {{name?: string}} [opts]
 */
export function setupDexieLifecycle(db, { name = "db" } = {}) {
  db.on("blocked", () => {
    console.warn(
      `[DexieLifecycle] ${name}: otra pestaña intenta actualizar la base. Cerrando conexión para no bloquear.`
    );
    try {
      db.close();
    } catch {}
  });

  db.on("versionchange", () => {
    console.info(`[DexieLifecycle] ${name}: nueva versión detectada. Recargando.`);
    try {
      db.close();
    } catch {}
    safeReload();
  });
}
