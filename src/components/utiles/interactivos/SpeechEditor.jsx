import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Play,
  AlertTriangle,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { TextInput } from "../../common/TextInput";
import { TextArea } from "../../common/TextArea";
import { Select } from "../../common/Select";
import { Modal } from "../../common/Modal";
import {
  agregarPaso,
  duplicarPaso,
  eliminarPaso,
  actualizarPaso,
  marcarInicio,
  agregarOpcion,
  actualizarOpcion,
  eliminarOpcion,
  actualizarInfo,
  validarSpeech,
  advertenciasSpeech,
  referenciasA,
  moverPaso,
  moverOpcion,
  duplicarOpcion,
  crearPasoConectado,
} from "./interactiveSpeechModel";
import { FlowTree } from "./FlowTree";

const etiquetaPaso = (speech, paso, index) => {
  const titulo = String(paso.titulo || "").trim();
  return titulo || `Paso ${index + 1}`;
};

export function SpeechEditor({
  speech,
  onChange,
  onVolver,
  onEjecutar,
  showToast,
}) {
  const steps = speech.steps || [];
  const [pasoId, setPasoId] = useState(speech.startStepId || steps[0]?.id || null);
  const [eliminando, setEliminando] = useState(null);
  const [destinoElim, setDestinoElim] = useState("");

  const errores = validarSpeech(speech);
  const advertencias = advertenciasSpeech(speech);
  const paso = steps.find((s) => s.id === pasoId) || steps[0] || null;
  const pasoIndex = paso ? steps.findIndex((s) => s.id === paso.id) : -1;
  const refsEliminacion = eliminando ? referenciasA(speech, eliminando.id) : [];

  const aplicar = (nuevo, mensaje) => {
    onChange(nuevo);
    if (mensaje && showToast) showToast(mensaje, "success");
  };

  const handleNuevoPaso = () => {
    const nuevo = agregarPaso(speech);
    setPasoId(nuevo.steps[nuevo.steps.length - 1].id);
    aplicar(nuevo, "Paso agregado");
  };

  const handleMoverPaso = (stepId, delta) => {
    onChange(moverPaso(speech, stepId, delta));
  };

  const handleDuplicar = () => {
    if (!paso) return;
    const nuevo = duplicarPaso(speech, paso.id);
    setPasoId(nuevo.steps[pasoIndex + 1]?.id || paso.id);
    aplicar(nuevo, "Paso duplicado");
  };

  const confirmarEliminar = () => {
    if (!eliminando) return;
    if (refsEliminacion.length > 0 && !destinoElim) return;
    const nuevo = eliminarPaso(
      speech,
      eliminando.id,
      refsEliminacion.length > 0 ? destinoElim : null
    );
    setPasoId(nuevo.steps[0]?.id || null);
    setEliminando(null);
    setDestinoElim("");
    aplicar(nuevo, "Paso eliminado");
  };

  const handleNuevaOpcion = () => {
    if (!paso) return;
    aplicar(agregarOpcion(speech, paso.id, ""));
  };

  const opcionesDestino = steps.map((s, i) => ({
    value: s.id,
    label: etiquetaPaso(speech, s, i),
  }));

  const cambiarDestino = (pasoActual, op, valor) => {
    if (valor === "__nuevo__") {
      const nuevo = crearPasoConectado(speech, pasoActual.id, op.id);
      if (nuevo === speech) return;
      setPasoId(nuevo.steps[nuevo.steps.length - 1].id);
      aplicar(nuevo, "Paso creado y conectado");
      return;
    }
    onChange(
      actualizarOpcion(speech, pasoActual.id, op.id, { targetStepId: valor })
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <BtnOutline onClick={onVolver} icon={ArrowLeft} size="sm">
          Volver a la lista
        </BtnOutline>
        <div className="flex-1 min-w-[160px] max-w-[320px]">
          <TextInput
            value={speech.nombre || ""}
            onChange={(e) =>
              onChange(actualizarInfo(speech, { nombre: e.target.value }))
            }
            placeholder="Nombre del speech"
            aria-label="Nombre del speech"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {errores.length > 0 ? (
            <span
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: "var(--color-danger)" }}
              title={errores.join(" · ")}
            >
              <AlertTriangle size={13} />
              {errores.length} error{errores.length !== 1 ? "es" : ""}
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: "var(--color-success)" }}
            >
              <Check size={13} /> Listo para ejecutar
            </span>
          )}
          <Btn
            onClick={() => onEjecutar(speech.id)}
            icon={Play}
            size="sm"
            disabled={errores.length > 0}
          >
            Iniciar Speech
          </Btn>
        </div>
      </div>

      <TextInput
        value={speech.descripcion || ""}
        onChange={(e) =>
          onChange(actualizarInfo(speech, { descripcion: e.target.value }))
        }
        placeholder="Descripción del speech (opcional)"
        aria-label="Descripción del speech"
        className="w-full"
      />

      {errores.length > 0 && (
        <ul
          className="rounded-lg p-2 space-y-0.5 text-[11px]"
          style={{
            backgroundColor: "var(--color-danger)11",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
          }}
        >
          {errores.map((err) => (
            <li key={err}>• {err}</li>
          ))}
        </ul>
      )}

      {advertencias.length > 0 && (
        <ul
          className="rounded-lg p-2 space-y-0.5 text-[11px]"
          style={{
            backgroundColor: "var(--color-warning)11",
            border: "1px solid var(--color-warning)",
            color: "var(--color-warning)",
          }}
          aria-label="Advertencias"
        >
          {advertencias.map((adv) => (
            <li key={adv}>• {adv}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 items-start">
        <FlowTree
          speech={speech}
          pasoId={paso ? paso.id : null}
          onSelectPaso={setPasoId}
          onNuevoPaso={handleNuevoPaso}
          onMoverPaso={handleMoverPaso}
        />

        <div
          className="rounded-lg p-3 space-y-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {!paso ? (
            <div
              className="text-sm py-8 text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              Seleccioná o creá un paso para editarlo.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[160px]">
                  <TextInput
                    value={paso.titulo || ""}
                    onChange={(e) =>
                      onChange(
                        actualizarPaso(speech, paso.id, { titulo: e.target.value })
                      )
                    }
                    placeholder="Título del paso (opcional)"
                    aria-label="Título del paso"
                  />
                </div>
                {speech.startStepId === paso.id ? (
                  <span
                    className="pill-sm font-bold"
                    style={{
                      backgroundColor: "var(--color-success)22",
                      color: "var(--color-success)",
                    }}
                  >
                    INICIO
                  </span>
                ) : (
                  <BtnOutline
                    onClick={() => onChange(marcarInicio(speech, paso.id))}
                    size="sm"
                    color="var(--color-success)"
                  >
                    Marcar como INICIO
                  </BtnOutline>
                )}
              </div>

              <TextArea
                rows={3}
                value={paso.contenido || ""}
                onChange={(e) =>
                  onChange(
                    actualizarPaso(speech, paso.id, { contenido: e.target.value })
                  )
                }
                placeholder="Contenido del paso..."
                className="w-full"
                aria-label="Contenido del paso"
              />

              <div className="flex items-center gap-2">
                <BtnOutline onClick={handleDuplicar} icon={Copy} size="sm">
                  Duplicar
                </BtnOutline>
                <BtnOutline
                  onClick={() => {
                    setEliminando(paso);
                    setDestinoElim("");
                  }}
                  icon={Trash2}
                  size="sm"
                  color="var(--color-danger)"
                >
                  Eliminar paso
                </BtnOutline>
              </div>

              <div
                className="pt-2"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Opciones de salida
                  </span>
                  <Btn onClick={handleNuevaOpcion} icon={Plus} size="sm">
                    Agregar opción
                  </Btn>
                </div>

                <div className="space-y-2">
                  {(paso.opciones || []).map((op, j) => (
                    <div key={op.id} className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          aria-label={`Subir opción ${j + 1}`}
                          onClick={() => onChange(moverOpcion(speech, paso.id, op.id, -1))}
                          className="p-1 rounded transition-colors hover:bg-white/5"
                          style={{ color: "var(--color-text-muted)" }}
                          disabled={j === 0}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Bajar opción ${j + 1}`}
                          onClick={() => onChange(moverOpcion(speech, paso.id, op.id, 1))}
                          className="p-1 rounded transition-colors hover:bg-white/5"
                          style={{ color: "var(--color-text-muted)" }}
                          disabled={j === (paso.opciones || []).length - 1}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <TextInput
                          value={op.texto || ""}
                          onChange={(e) =>
                            onChange(
                              actualizarOpcion(speech, paso.id, op.id, {
                                texto: e.target.value,
                              })
                            )
                          }
                          placeholder={`Opción ${j + 1}: texto para elegir`}
                          aria-label={`Opción ${j + 1} texto`}
                        />
                      </div>
                      <Select
                        value={op.targetStepId || ""}
                        onChange={(e) => cambiarDestino(paso, op, e.target.value)}
                        options={[
                          { value: "", label: "— Sin destino —" },
                          ...opcionesDestino,
                          { value: "__nuevo__", label: "+ Crear nuevo paso…" },
                        ]}
                        aria-label={`Opción ${j + 1} destino`}
                        className="flex-shrink-0"
                      />
                      <button
                        type="button"
                        aria-label={`Duplicar opción ${j + 1}`}
                        onClick={() => onChange(duplicarOpcion(speech, paso.id, op.id))}
                        className="p-1 rounded hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar opción ${j + 1}`}
                        onClick={() => onChange(eliminarOpcion(speech, paso.id, op.id))}
                        className="p-1 rounded hover:bg-white/5 transition-colors"
                        style={{ color: "var(--color-danger)" }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {(paso.opciones || []).length === 0 && (
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Sin opciones: este paso sería el final del recorrido.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={eliminando !== null}
        onClose={() => setEliminando(null)}
        title="Eliminar paso"
        icon={AlertTriangle}
        size="md"
        footer={
          <>
            <BtnOutline
              onClick={() => setEliminando(null)}
              color="var(--color-text-muted)"
              size="sm"
            >
              Cancelar
            </BtnOutline>
            <Btn
              onClick={confirmarEliminar}
              icon={Trash2}
              size="sm"
              color="var(--color-danger)"
              disabled={refsEliminacion.length > 0 && !destinoElim}
            >
              Eliminar
            </Btn>
          </>
        }
      >
        {eliminando && (
          <div className="space-y-3 text-sm" style={{ color: "var(--color-text)" }}>
            <p>
              ¿Eliminar el paso{" "}
              <b>
                &quot;
                {etiquetaPaso(
                  speech,
                  eliminando,
                  steps.findIndex((s) => s.id === eliminando.id)
                )}
                &quot;
              </b>
              ?
            </p>
            {refsEliminacion.length > 0 ? (
              <div
                className="rounded-lg p-3 space-y-2 text-xs"
                style={{
                  backgroundColor: "var(--color-warning)11",
                  border: "1px solid var(--color-warning)",
                }}
              >
                <p style={{ color: "var(--color-warning)" }} className="font-semibold">
                  Es destino de {refsEliminacion.length} opción
                  {refsEliminacion.length !== 1 ? "es" : ""}. Elegí a dónde apuntar
                  antes de eliminar:
                </p>
                <Select
                  label="Nuevo destino de las referencias"
                  value={destinoElim}
                  onChange={(e) => setDestinoElim(e.target.value)}
                  placeholder="— Elegir paso —"
                  options={steps
                    .filter((s) => s.id !== eliminando.id)
                    .map((s) => ({
                      value: s.id,
                      label: etiquetaPaso(
                        speech,
                        s,
                        steps.findIndex((x) => x.id === s.id)
                      ),
                    }))}
                  aria-label="Nuevo destino de las referencias"
                />
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Ninguna opción de otro paso apunta a este paso.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
