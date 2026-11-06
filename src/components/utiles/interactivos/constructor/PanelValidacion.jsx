import React from "react";
import { AlertTriangle, Check, Eye } from "lucide-react";

/**
 * PanelValidacion.jsx (Release 1.11.1)
 *
 * Validación navegable del constructor. Reutiliza `diagnosticosSpeech`, que
 * conserva los mensajes del editor tradicional y agrega la ubicación del nodo.
 * Regla de producto: los ERRORES bloquean la ejecución pero NUNCA el guardado
 * del borrador; las ADVERTENCIAS son ayudas y no bloquean nada.
 */

export function PanelValidacion({
  diagnosticos = [],
  onIrANodo,
  onEjecutarPreview,
  puedeEjecutar = true,
}) {
  const errores = diagnosticos.filter((d) => d.severidad === "error");
  const advertencias = diagnosticos.filter((d) => d.severidad === "advertencia");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          Validación
        </span>
        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {errores.length} error(es) · {advertencias.length} advertencia(s)
        </span>
      </div>

      {errores.length === 0 && advertencias.length === 0 ? (
        <div
          className="flex items-center gap-1.5 rounded p-2 text-[11px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-success) 6.7%, transparent)",
            border: "1px solid var(--color-success)",
            color: "var(--color-success)",
          }}
        >
          <Check size={12} /> Sin errores ni advertencias. El guion está listo.
        </div>
      ) : null}

      {errores.length > 0 ? (
        <div
          className="rounded p-2 space-y-1"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
            border: "1px solid var(--color-danger)",
          }}
        >
          <div
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "var(--color-danger)" }}
          >
            <AlertTriangle size={11} /> Errores que bloquean la ejecución
          </div>
          {errores.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onIrANodo && onIrANodo(d)}
              className="block w-full text-left text-[10px] rounded px-1 py-0.5"
              style={{ color: "var(--color-danger)", backgroundColor: "transparent" }}
              title={
                d.nodoKey
                  ? "Ir al nodo con este problema"
                  : "Este problema no pertenece a un nodo"
              }
              aria-label={`Ir al error: ${d.mensaje}`}
            >
              • {d.mensaje}
            </button>
          ))}
        </div>
      ) : null}

      {advertencias.length > 0 ? (
        <div
          className="rounded p-2 space-y-1"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-warning) 6.7%, transparent)",
            border: "1px solid var(--color-warning)",
          }}
          aria-label="Advertencias del constructor"
        >
          <div
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "var(--color-warning)" }}
          >
            Advertencias (no bloquean el borrador)
          </div>
          {advertencias.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onIrANodo && onIrANodo(d)}
              className="block w-full text-left text-[10px] rounded px-1 py-0.5"
              style={{ color: "var(--color-warning)", backgroundColor: "transparent" }}
              title={
                d.nodoKey
                  ? "Ir al nodo con esta advertencia"
                  : "Esta advertencia no pertenece a un nodo"
              }
              aria-label={`Ir a la advertencia: ${d.mensaje}`}
            >
              • {d.mensaje}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="text-[10px]"
        style={{ color: "var(--color-text-muted)" }}
      >
        El borrador se guarda siempre. Los errores solo impiden ejecutar la
        llamada; la vista previa permite recorrer el guion igual.
      </div>

      {onEjecutarPreview ? (
        <button
          type="button"
          onClick={onEjecutarPreview}
          className="btn-base btn-sm w-full flex items-center justify-center gap-1.5"
          style={{
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)",
            backgroundColor: "transparent",
            opacity: puedeEjecutar ? 1 : 0.7,
          }}
        >
          <Eye size={12} /> Probar recorrido
        </button>
      ) : null}
    </div>
  );
}
