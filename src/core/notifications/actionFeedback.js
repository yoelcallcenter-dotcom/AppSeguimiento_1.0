/**
 * core/notifications/actionFeedback.js
 * Feedback unificado de acciones. Cada acción lógica (copiar, guardar, eliminar,
 * crear, importar, exportar, restaurar, reprogramar, etc.) mapea a un evento con
 * prioridad y tipo determinados, y se enruta únicamente a través de
 * `notificationManager` (pipeline central: Centro → Toast → Sonido según prioridad).
 *
 * Semántica de prioridad (ver ruleEngine):
 *   - low   → Centro, sin toast, sin sonido.
 *   - medium→ Centro + toast, sin sonido.
 *   - high/critical → Centro + toast + sonido.
 */

import { notificationManager } from "./notificationManager";

// Catálogo de acciones → (tipo de notificación, prioridad).
// La prioridad determina el comportamiento según el pipeline central.
export const ACCION_CATALOG = {
  copiar: { type: "success", priority: "low" },
  crear: { type: "success", priority: "low" },
  guardar: { type: "success", priority: "low" },
  eliminar: { type: "info", priority: "medium" },
  importar: { type: "success", priority: "medium" },
  exportar: { type: "success", priority: "medium" },
  restaurar: { type: "success", priority: "high" },
  reprogramar: { type: "info", priority: "medium" },
  cancelar: { type: "warning", priority: "medium" },
};

// Acciones que ejecutan una mutación destructiva o reversible con impacto:
// se consideran de prioridad alta para asegurar feedback visible.
const ACCIONES_CRITICAS = new Set(["restaurar", "eliminar"]);

export function notifyAccion(accion, message, options = {}) {
  const meta = ACCION_CATALOG[accion] || {
    type: options.type || "info",
    priority: options.priority || "medium",
  };

  const event = {
    type: options.type || meta.type,
    title: options.title || "",
    message,
    source: options.source || "app",
    // id/eventKey para deduplicación: una misma acción lógica + mensaje
    // genera una sola notificación en la ventana de dedup del sistema.
    id: options.key || `accion-${accion}-${message}`,
    priority:
      options.priority ||
      (ACCIONES_CRITICAS.has(accion) ? "high" : meta.priority),
    ...options,
  };

  return notificationManager.notify(event);
}

export function copiar(msg, opts) { return notifyAccion("copiar", msg, opts); }
export function crear(msg, opts) { return notifyAccion("crear", msg, opts); }
export function guardar(msg, opts) { return notifyAccion("guardar", msg, opts); }
export function eliminar(msg, opts) { return notifyAccion("eliminar", msg, opts); }
export function importar(msg, opts) { return notifyAccion("importar", msg, opts); }
export function exportar(msg, opts) { return notifyAccion("exportar", msg, opts); }
export function restaurar(msg, opts) { return notifyAccion("restaurar", msg, opts); }
export function reprogramar(msg, opts) { return notifyAccion("reprogramar", msg, opts); }
