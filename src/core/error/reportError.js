import db from '../db/indexedDB';
import { redactPII, redactObject } from '../../utils/redact';
import { eventBus, AppEvents } from '../events/eventBus';
import {
  esAlmacenamientoPerdido,
  registrarPerdidaAlmacenamiento,
} from '../status/storageHealth';

const MAX_ERRORS = 500;
const DEDUP_INTERVAL_MS = 5000;

function errorHash(error) {
  const msg = redactPII(error?.message || String(error));
  const stack = redactPII(error?.stack || '');
  const type = error?.type || 'UNKNOWN';
  return `${type}::${msg}::${stack.slice(0, 200)}`;
}

const recentHashes = new Set();
let lastCleanup = Date.now();

export async function reportError(error, metadata = {}) {
  // ==== v1.10.6 — hook CENTRAL de pérdida de almacenamiento ====
  // Corre PRIMERO y síncrono (sin awaits): los loaders (notes/events/cases)
  // llaman reportError sin esperar su promesa; si esto estuviera después de
  // un await, useAppStore.init() podría evaluar la huella ANTES de registrar
  // la pérdida. Cubre los tres patrones de llamada: (a) error real
  // (dos argumentos), (b) el heredado reportError({type, message, context:
  // err}) —donde el error real viajaba dentro del objeto— y (c)
  // rechazos no manejados (unhandledrejection).
  const causa =
    error && typeof error === 'object' && error.context && typeof error.context === 'object'
      ? error.context
      : null;
  if (esAlmacenamientoPerdido(error) || esAlmacenamientoPerdido(causa)) {
    registrarPerdidaAlmacenamiento(
      causa || error,
      (metadata && metadata.context) || (error && error.type)
    );
  }

  const hash = errorHash(error);

  if (recentHashes.has(hash)) return;
  recentHashes.add(hash);

  const now = Date.now();
  if (now - lastCleanup > 30000) {
    recentHashes.clear();
    lastCleanup = now;
  }

  const entry = {
    type: error?.type || 'RUNTIME_ERROR',
    message: redactPII(error?.message || String(error || 'Unknown error')),
    // v1.10.6: el patrón reportError({type, message, context: err}) metía el
    // error REAL dentro del objeto y se PERDÍA en el log (los reportes de
    // producción quedaron con stack "" y metadata {}). Ahora el stack del
    // error subyacente sirve de respaldo.
    stack: redactPII(error?.stack || (causa && causa.stack) || ''),
    timestamp: new Date().toISOString(),
    metadata: {
      ...redactObject(metadata),
      // v1.10.6: la causa raíz queda registrada como nombre+mensaje para que
      // un próximo diagnóstico no dependa de adivinar qué falló.
      ...(causa
        ? {
            cause: {
              name: causa.name || 'Error',
              message: redactPII(String(causa.message || '')),
            },
          }
        : {}),
    },
  };

  try {
    await db.errors.add(entry);

    const count = await db.errors.count();
    if (count > MAX_ERRORS) {
      const oldest = await db.errors.orderBy('id').limit(count - MAX_ERRORS).toArray();
      if (oldest.length > 0) {
        await db.errors.bulkDelete(oldest.map(e => e.id));
      }
    }
  } catch (dbError) {
    console.error('[reportError] Failed to store error:', dbError);
  }

  // Notificación visible al usuario (a menos que el llamador lo silencie).
  // El NotificationManager agrega toasts/notificaciones y deduplica.
  if (!metadata.silent) {
    eventBus.emit(AppEvents.ERROR_OCCURRED, {
      type: 'error',
      priority: 'critical',
      title: 'Ocurrió un error',
      message: entry.message || 'Error desconocido',
      timestamp: now,
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.groupCollapsed(`[${entry.type}] ${entry.message}`);
    console.error('Stack:', entry.stack);
    if (Object.keys(metadata).length) console.log('Metadata:', metadata);
    console.groupEnd();
  }
}

export function setupGlobalErrorListeners() {
  window.onerror = (message, source, lineno, colno, error) => {
    reportError(error || { message, type: 'WINDOW_ONERROR' }, { source, lineno, colno });
  };

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    reportError(error || { message: 'Unhandled Promise rejection', type: 'UNHANDLED_REJECTION' }, {
      reason: String(event.reason),
    });
  });
}

export async function getErrors(limit = 200, offset = 0) {
  return db.errors.orderBy('id').reverse().offset(offset).limit(limit).toArray();
}

export async function getErrorCount() {
  return db.errors.count();
}

export async function clearErrors() {
  return db.errors.clear();
}

export async function exportErrors() {
  const all = await db.errors.orderBy('id').toArray();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return all.length;
}
