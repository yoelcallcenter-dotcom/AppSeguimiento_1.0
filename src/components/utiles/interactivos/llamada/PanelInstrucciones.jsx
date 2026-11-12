/**
 * PanelInstrucciones.jsx (Release 1.11.2 — Modo llamada)
 *
 * Panel lateral de apoyo del Modo llamada. Reúne, SIN inventar contenido, todo
 * lo que el operador puede necesitar tener a mano durante la conversación:
 *
 * - Descripción del guion (por qué existe la llamada).
 * - Objetivo de la etapa actual (campo `objetivo` del speech).
 * - Reglas operativas del guion (`reglas[]`, texto editable por el usuario).
 * - Módulos de apoyo que abren las opciones de la etapa (`moduloId` →
 *   `modulos[]` del guion). Solo se muestran los títulos configurados: el
 *   contenido de cada módulo no vive en el speech y no se inventa acá.
 *
 * Se apoya en SidePanel (z-notification 110) para quedar por encima del
 * overlay del Modo llamada (z-modal 50), igual que Objeciones y Resumen.
 */

import React from "react";
import { BookOpen, Target, ListChecks, Layers } from "lucide-react";
import { SidePanel } from "../../../common/SidePanel";
import { BtnOutline } from "../../../common/BtnOutline";

function Seccion({ icon: Icon, titulo, children }) {
  return (
    <section className="space-y-2">
      <h3
        className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: "var(--color-accent)" }}
      >
        {Icon ? <Icon size={13} /> : null}
        {titulo}
      </h3>
      <div className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.6 }}>
        {children}
      </div>
    </section>
  );
}

export function PanelInstrucciones({
  open,
  onClose,
  speech,
  paso,
  opciones = [],
}) {
  const reglas = Array.isArray(speech?.reglas) ? speech.reglas.filter(Boolean) : [];
  const modulos = Array.isArray(speech?.modulos) ? speech.modulos.filter(Boolean) : [];

  // Módulos referenciados por las opciones de la etapa (ids únicos, en orden).
  const modulosDeLaEtapa = [];
  (Array.isArray(opciones) ? opciones : []).forEach((op) => {
    const id = op?.moduloId;
    if (!id || modulosDeLaEtapa.some((m) => m.id === id)) return;
    const modulo = modulos.find((m) => m && m.id === id);
    // Si el guion referencia un módulo inexistente no se muestra nada raro:
    // la validación ya lo reporta en el constructor.
    if (modulo) modulosDeLaEtapa.push(modulo);
  });

  return (
    <SidePanel
      isOpen={open}
      onClose={onClose}
      title="Instrucciones"
      icon={BookOpen}
      footer={
        <div
          className="px-4 py-3 border-t flex justify-end"
          style={{ borderColor: "var(--color-border)" }}
        >
          <BtnOutline size="sm" onClick={onClose}>
            Volver a la llamada
          </BtnOutline>
        </div>
      }
    >
      <div className="p-4 space-y-5">
        <Seccion icon={BookOpen} titulo="Guion">
          <div className="font-semibold">{speech?.nombre || "(sin nombre)"}</div>
          {speech?.descripcion ? (
            <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
              {speech.descripcion}
            </p>
          ) : (
            <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
              Este guion no tiene descripción.
            </p>
          )}
        </Seccion>

        <Seccion icon={Target} titulo="Etapa actual">
          <div className="font-semibold">{paso?.titulo || "(sin título)"}</div>
          {paso?.objetivo ? (
            <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
              {paso.objetivo}
            </p>
          ) : (
            <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
              Esta etapa no tiene objetivo definido.
            </p>
          )}
        </Seccion>

        <Seccion icon={ListChecks} titulo="Reglas de la llamada">
          {reglas.length ? (
            <ul className="space-y-1.5">
              {reglas.map((regla, i) => (
                <li key={`${i}-${regla}`} className="flex gap-2">
                  <span style={{ color: "var(--color-accent)" }}>•</span>
                  <span>{regla}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>
              Este guion no tiene reglas configuradas.
            </p>
          )}
        </Seccion>

        <Seccion icon={Layers} titulo="Módulos de apoyo de esta etapa">
          {modulosDeLaEtapa.length ? (
            <ul className="space-y-1.5">
              {modulosDeLaEtapa.map((m) => (
                <li key={m.id}>
                  <span className="font-semibold">{m.titulo || "(sin título)"}</span>
                  {m.tipo ? (
                    <span style={{ color: "var(--color-text-muted)" }}> · {m.tipo}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>
              Las opciones de esta etapa no abren módulos de apoyo.
            </p>
          )}
        </Seccion>
      </div>
    </SidePanel>
  );
}

export default PanelInstrucciones;
