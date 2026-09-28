import React from "react";
import { Plus, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { Btn } from "../../common/Btn";
import { pasosAlcanzables } from "./interactiveSpeechModel";

const etiquetaPaso = (paso, index) => {
  const titulo = String(paso.titulo || "").trim();
  return titulo || `Paso ${index + 1}`;
};

export function FlowTree({ speech, pasoId, onSelectPaso, onNuevoPaso, onMoverPaso }) {
  const steps = speech.steps || [];
  const sinInicio = !steps.some((s) => s.id === speech.startStepId);
  const alcanzables = pasosAlcanzables(speech);
  const conectados = sinInicio ? steps : steps.filter((s) => alcanzables.has(s.id));
  const huerfanos = sinInicio ? [] : steps.filter((s) => !alcanzables.has(s.id));

  const tieneError = (p) =>
    (p.opciones || []).some(
      (op) =>
        !String(op.texto || "").trim() ||
        !op.targetStepId ||
        !steps.some((s) => s.id === op.targetStepId)
    );

  const indiceDe = (stepId) => steps.findIndex((s) => s.id === stepId);

  const renderPaso = (paso) => {
    const i = indiceDe(paso.id);
    const esInicio = speech.startStepId === paso.id;
    const huerfano = !sinInicio && !alcanzables.has(paso.id);
    const seleccionado = pasoId === paso.id;
    return (
      <div key={paso.id}>
        <div className="flex items-center gap-1">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Paso ${i + 1}`}
            onClick={() => onSelectPaso(paso.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectPaso(paso.id);
              }
            }}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer"
            style={{
              backgroundColor: seleccionado ? "var(--color-accent)22" : "transparent",
              color: seleccionado ? "var(--color-accent)" : "var(--color-text)",
              border: seleccionado
                ? "1px solid var(--color-accent)"
                : "1px solid transparent",
            }}
          >
            {esInicio && (
              <span
                className="pill-sm font-bold flex-shrink-0"
                style={{
                  backgroundColor: "var(--color-success)22",
                  color: "var(--color-success)",
                }}
              >
                INICIO
              </span>
            )}
            <span className="truncate">{etiquetaPaso(paso, i)}</span>
            {huerfano && (
              <AlertTriangle
                size={12}
                aria-hidden="true"
                style={{ color: "var(--color-warning)", flexShrink: 0 }}
              />
            )}
            {tieneError(paso) && (
              <AlertTriangle
                size={12}
                aria-hidden="true"
                style={{ color: "var(--color-danger)", flexShrink: 0 }}
              />
            )}
          </div>
          <button
            type="button"
            aria-label={`Subir paso ${i + 1}`}
            onClick={() => onMoverPaso(paso.id, -1)}
            className="p-1 rounded transition-colors hover:bg-white/5"
            style={{ color: "var(--color-text-muted)" }}
            disabled={i === 0}
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            aria-label={`Bajar paso ${i + 1}`}
            onClick={() => onMoverPaso(paso.id, 1)}
            className="p-1 rounded transition-colors hover:bg-white/5"
            style={{ color: "var(--color-text-muted)" }}
            disabled={i === steps.length - 1}
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {(paso.opciones || []).length > 0 && (
          <div
            className="ml-4 pl-2 space-y-0.5 mt-0.5"
            style={{ borderLeft: "2px solid var(--color-border)" }}
          >
            {paso.opciones.map((op) => {
              const destinoIdx = op.targetStepId ? indiceDe(op.targetStepId) : -1;
              const destino = destinoIdx >= 0 ? steps[destinoIdx] : null;
              return (
                <button
                  key={op.id}
                  type="button"
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-left transition-colors hover:bg-white/5"
                  style={{ color: destino ? "var(--color-text-muted)" : "var(--color-danger)" }}
                  title={
                    destino
                      ? `Ir a "${etiquetaPaso(destino, destinoIdx)}"`
                      : "Sin destino: elegí uno en la edición del paso"
                  }
                  onClick={() => onSelectPaso(destino ? destino.id : paso.id)}
                >
                  <span aria-hidden="true" className="flex-shrink-0">
                    ├
                  </span>
                  <span className="truncate">{op.texto || "(sin texto)"}</span>
                  <span className="flex-shrink-0 ml-auto">
                    {destino ? `→ ${etiquetaPaso(destino, destinoIdx)}` : "→ (sin destino)"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="rounded-lg p-2 space-y-1"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Flujo
        </span>
        <Btn onClick={onNuevoPaso} icon={Plus} size="sm">
          Nuevo paso
        </Btn>
      </div>

      {steps.length === 0 && (
        <div className="text-xs py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
          Sin pasos. Cargá el primero.
        </div>
      )}

      {conectados.map((p) => renderPaso(p))}

      {huerfanos.length > 0 && (
        <>
          <div
            className="flex items-center gap-1 pt-2 mt-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-warning)" }}
          >
            <AlertTriangle size={11} aria-hidden="true" />
            Sin conexión ({huerfanos.length})
          </div>
          {huerfanos.map((p) => renderPaso(p))}
        </>
      )}
    </div>
  );
}

export default FlowTree;
