import React from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Banner de actualización de la PWA: aparece cuando se detecta una
 * nueva versión desplegada y le ofrece al usuario recargar cuando
 * esté listo (refresco controlado, no interrumpe la tarea en curso).
 */
export function PwaUpdateBanner({ ready, onUpdate, onDismiss }) {
  if (!ready) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md animate-slide-up"
      style={{
        backgroundColor: "var(--color-surface2)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-lg"
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "var(--color-primary)",
            color: "#ffffff",
          }}
        >
          <RefreshCw size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Nueva versión disponible
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Hay una actualización lista. Recargá para usar la versión más
            reciente.
          </p>
        </div>
        <button
          onClick={() => onUpdate && onUpdate()}
          className="btn-base btn-primary btn-sm flex-shrink-0"
          aria-label="Actualizar ahora"
        >
          Actualizar
        </button>
        <button
          onClick={() => onDismiss && onDismiss()}
          className="flex-shrink-0 p-1 rounded-md hover:bg-white/5"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Cerrar aviso de actualización"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default PwaUpdateBanner;
