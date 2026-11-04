import React, { useState, useEffect } from "react";
import {
  CaseUpper,
  CaseLower,
  CaseSensitive,
  Type,
  Shuffle,
  Eraser,
  Check,
} from "lucide-react";
import { applyCaseMode, MODOS_TRANSFORMACION } from "../../utils/textCase";

/**
 * TextCaseToolbar.jsx (v1.10.11)
 * Toolbar de transformación de texto (estilo mayusculasminusculas.ar)
 * para los campos largos de Notas y Reportes:
 * ABC (MAYÚSCULAS) · abc (minúsculas) · Oración · Título · aLtErNaR ·
 * Quitar espacios.
 *
 * API deliberadamente mínima: recibe `value` + `onChange(valorNuevo)` (string
 * plano, NO evento) — igual para TextInput, TextArea y el editor de Notas.
 * Los modos viven en utils/textCase.js para compartirlos con el MenuBar de
 * tiptap (misma lógica, un solo lugar que testear).
 *
 * Identidad visual (1.10.11, ajuste posterior al primer recorte): botones
 * GRANDES tipo botón (clase .textcase-btn de globals.css: radio 6px, borde
 * definido, superficie sólida, icono + label de 12px) — no pills chicas.
 * Además, respuesta visual al usarlos: tras aplicar un modo el botón queda
 * 900ms en estado --ok (borde/fondo verde + ícono de check) y luego vuelve
 * a su icono. El timeout vive en un effect con cleanup (sin timers colgados
 * al desmontar) y el estado es un objeto nuevo por clic para que el flash
 * se reinicie aunque se repita el mismo modo.
 *
 * Los hooks van SIEMPRE arriba del early return sin onChange (regla de
 * hooks: el componente debe renderizar el mismo orden de hooks siempre).
 */
const ICONOS = {
  upper: CaseUpper,
  lower: CaseLower,
  sentence: CaseSensitive,
  title: Type,
  alter: Shuffle,
  spaces: Eraser,
};

export function TextCaseToolbar({
  value,
  onChange,
  ariaLabel = "Transformar texto",
  className = "",
}) {
  // Respuesta visual (1.10.11): { modo } mientras dura el flash, null después.
  const [ok, setOk] = useState(null);

  useEffect(() => {
    if (!ok) return undefined;
    const t = setTimeout(() => setOk(null), 900);
    return () => clearTimeout(t); // evita timers colgados al desmontar
  }, [ok]); // `ok` es objeto nuevo en cada clic → el timer se reinicia

  // Sin onChange no hay nada que hacer (evita renders inútiles en pads/read-only).
  if (!onChange) return null;

  const aplicar = (modo) => {
    onChange(applyCaseMode(value, modo));
    setOk({ modo }); // dispara/renueva el flash del botón usado
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-wider mr-0.5"
        style={{ color: "var(--color-text-muted)" }}
      >
        Formato:
      </span>
      {MODOS_TRANSFORMACION.map((m) => {
        const Icono = ICONOS[m.modo];
        const flash = ok && ok.modo === m.modo;
        return (
          <button
            key={m.modo}
            type="button"
            onClick={() => aplicar(m.modo)}
            title={m.titulo}
            aria-label={m.titulo}
            className={`textcase-btn ${flash ? "textcase-btn--ok" : ""}`}
          >
            {/* El check reemplaza al icono del modo durante el flash: mismo
                tamaño de caja → el botón no cambia de ancho. */}
            {flash ? <Check size={15} /> : <Icono size={15} />}
            {m.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

export default TextCaseToolbar;
