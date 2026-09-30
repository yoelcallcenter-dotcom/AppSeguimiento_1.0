import React, { useState } from "react";
import { Modal } from "../../common/Modal";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { Play, ArrowLeft, RotateCcw, AlertTriangle } from "lucide-react";
import { validarSpeech } from "./interactiveSpeechModel";
import { resolverObjeciones } from "./resolveObjeciones";

export function SpeechRunner({ speech, onClose, objeciones = [] }) {
  const steps = speech.steps || [];
  const [stepId, setStepId] = useState(speech.startStepId || steps[0]?.id || null);
  const [historial, setHistorial] = useState([]);

  const errores = validarSpeech(speech);
  const pasoIdx = steps.findIndex((s) => s.id === stepId);
  const paso = pasoIdx >= 0 ? steps[pasoIdx] : null;

  const elegir = (targetId) => {
    setHistorial((h) => [...h, stepId]);
    setStepId(targetId);
  };

  const atras = () => {
    if (!historial.length) return;
    setHistorial((h) => h.slice(0, -1));
    setStepId(historial[historial.length - 1]);
  };

  const reiniciar = () => {
    setHistorial([]);
    setStepId(speech.startStepId || steps[0]?.id || null);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={speech.nombre || "Speech interactivo"}
      icon={Play}
      size="lg"
      closeOnOverlayClick={false}
      subheader={
        <div className="space-y-1">
          {speech.descripcion ? (
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {speech.descripcion}
            </div>
          ) : null}
          <div
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Modo ejecución
          </div>
        </div>
      }
      footer={
        <>
          <BtnOutline
            onClick={atras}
            icon={ArrowLeft}
            size="sm"
            disabled={!historial.length}
            title={historial.length ? "Paso anterior" : "No hay pasos anteriores"}
          >
            Atrás
          </BtnOutline>
          <BtnOutline onClick={reiniciar} icon={RotateCcw} size="sm">
            Reiniciar
          </BtnOutline>
          <Btn onClick={onClose} size="sm">
            Cerrar
          </Btn>
        </>
      }
    >
      {errores.length > 0 ? (
        <div
          className="rounded-lg p-4 flex items-start gap-2 text-sm"
          style={{
            backgroundColor: "var(--color-danger)11",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            Este speech tiene errores y no puede ejecutarse.
            <ul className="mt-1 space-y-0.5 text-[11px]">
              {errores.map((err) => (
                <li key={err}>• {err}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : !paso ? (
        <div
          className="text-sm py-8 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          Este speech no tiene pasos.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="pill-sm font-bold"
              style={{
                backgroundColor: "var(--color-accent)22",
                color: "var(--color-accent)",
              }}
            >
              PASO {pasoIdx + 1} / {steps.length}
            </span>
            {speech.startStepId === paso.id && (
              <span
                className="pill-sm font-bold"
                style={{
                  backgroundColor: "var(--color-success)22",
                  color: "var(--color-success)",
                }}
              >
                INICIO
              </span>
            )}
          </div>

          <div>
            {paso.titulo ? (
              <div
                className="text-base font-bold mb-1"
                style={{ color: "var(--color-text)" }}
              >
                {paso.titulo}
              </div>
            ) : null}
            <div
              className="text-sm whitespace-pre-wrap"
              style={{ color: "var(--color-text)", lineHeight: 1.7 }}
            >
              {resolverObjeciones(paso.contenido, objeciones)}
            </div>
          </div>

          {(paso.opciones || []).length > 0 ? (
            <div className="space-y-2">
              {(paso.opciones || []).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => elegir(op.targetStepId)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: "var(--color-accent)22",
                    border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)",
                  }}
                >
                  {op.texto || "(sin texto)"}
                </button>
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg px-3 py-2 text-sm font-semibold text-center"
              style={{
                backgroundColor: "var(--color-success)22",
                color: "var(--color-success)",
              }}
            >
              Fin del recorro
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
