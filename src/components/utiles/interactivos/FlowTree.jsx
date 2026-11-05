/**
 * FlowTree.jsx (Release 1.11.0 — adaptación al modelo v2, §4)
 * Árbol de navegación del editor: etapa → preguntas → opciones.
 *
 * Cambios y por qué:
 * - Las opciones ahora viven DENTRO de cada pregunta (v2, §2): el árbol las
 *   muestra anidadas bajo su pregunta para que se vea la ramificación real
 *   del guion en lugar de una lista plana por etapa.
 * - `tieneError` ya NO marca "sin destino" como error: en la 1.11.0 una
 *   opción sin destino avanza en línea (§2.2). Solo se marca cuando falta el
 *   texto de la opción o el destino apunta a una etapa inexistente (los dos
 *   casos que `validarSpeech` reporta como error).
 * - Lectura defensiva dual-shape (`paso.preguntas` v2 o `paso.opciones` v1):
 *   el árbol renderiza bien aunque el padre aún no haya normalizado, sin
 *   depender de que pase por `normalizarSpeech` antes (mismo criterio que
 *   `pasosAlcanzables`).
 *
 * Contrato: los aria-labels "Paso N" / "Subir paso N" / "Bajar paso N" y el
 * botón "Nuevo paso" los usan los tests de InteractivosView y la navegación
 * por teclado: conservarlos.
 */
import React from "react";
import { Plus, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { Btn } from "../../common/Btn";
import { pasosAlcanzables } from "./interactiveSpeechModel";

const etiquetaPaso = (paso, index) => {
  const titulo = String(paso.titulo || "").trim();
  return titulo || `Paso ${index + 1}`;
};

/**
 * Preguntas de la etapa tolerando la forma v1: si el paso todavía trae
 * `opciones` sueltas (guion sin normalizar) se envuelven en una pregunta
 * implícita SOLO para mostrarlas (sin tocar el dato original).
 */
function preguntasDeFlujo(paso) {
  if (Array.isArray(paso?.preguntas)) return paso.preguntas;
  if (Array.isArray(paso?.opciones)) {
    return [{ id: `v1-${paso.id}`, texto: "", obligatoria: false, opciones: paso.opciones }];
  }
  return [];
}

export function FlowTree({ speech, pasoId, onSelectPaso, onNuevoPaso, onMoverPaso }) {
  const steps = speech.steps || [];
  const sinInicio = !steps.some((s) => s.id === speech.startStepId);
  const alcanzables = pasosAlcanzables(speech);
  const conectados = sinInicio ? steps : steps.filter((s) => alcanzables.has(s.id));
  const huerfanos = sinInicio ? [] : steps.filter((s) => !alcanzables.has(s.id));

  // Error REAL de validación (1.11.0): sin destino ya no cuenta (§2.2).
  const tieneError = (p) =>
    preguntasDeFlujo(p).some((pr) =>
      (Array.isArray(pr.opciones) ? pr.opciones : []).some(
        (op) =>
          !String(op.texto || "").trim() ||
          (Boolean(op.targetStepId) &&
            !steps.some((s) => s.id === op.targetStepId))
      )
    );

  const indiceDe = (stepId) => steps.findIndex((s) => s.id === stepId);

  const renderPaso = (paso) => {
    const i = indiceDe(paso.id);
    const esInicio = speech.startStepId === paso.id;
    const huerfano = !sinInicio && !alcanzables.has(paso.id);
    const seleccionado = pasoId === paso.id;
    const preguntas = preguntasDeFlujo(paso);
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
              backgroundColor: seleccionado
                ? "color-mix(in srgb, var(--color-accent) 13.3%, transparent)"
                : "transparent",
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
                  backgroundColor:
                    "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
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

        {/* Preguntas de la etapa con sus opciones anidadas (v2 §2). */}
        {preguntas.map((pr) => (
          <div
            key={pr.id}
            className="ml-4 pl-2 space-y-0.5 mt-0.5"
            style={{ borderLeft: "2px solid var(--color-border)" }}
          >
            <div
              className="flex items-center gap-1.5 px-1.5 py-0.5 text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span aria-hidden="true" className="flex-shrink-0">
                └
              </span>
              <span className="truncate italic">
                {pr.texto || "(pregunta sin texto)"}
              </span>
            </div>
            {(pr.opciones || []).map((op) => {
              const destinoIdx = op.targetStepId ? indiceDe(op.targetStepId) : -1;
              const destino = destinoIdx >= 0 ? steps[destinoIdx] : null;
              return (
                <button
                  key={op.id}
                  type="button"
                  className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-left transition-colors hover:bg-white/5"
                  style={{
                    color: destino ? "var(--color-text-muted)" : "var(--color-text-muted)",
                  }}
                  title={
                    destino
                      ? `Ir a "${etiquetaPaso(destino, destinoIdx)}"`
                      : "Sin destino: avanza a la siguiente pregunta o etapa (lineal)"
                  }
                  onClick={() => onSelectPaso(destino ? destino.id : paso.id)}
                >
                  <span aria-hidden="true" className="flex-shrink-0">
                    ├
                  </span>
                  <span className="truncate">{op.texto || "(sin texto)"}</span>
                  <span className="flex-shrink-0 ml-auto">
                    {destino
                      ? `→ ${etiquetaPaso(destino, destinoIdx)}`
                      : "→ siguiente"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
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
        <div
          className="text-xs py-4 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          Sin pasos. Cargá el primero.
        </div>
      )}

      {conectados.map((p) => renderPaso(p))}

      {huerfanos.length > 0 && (
        <>
          <div
            className="flex items-center gap-1 pt-2 mt-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-warning)",
            }}
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
