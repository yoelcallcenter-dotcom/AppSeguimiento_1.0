import React from "react";
import { getEstados } from "../../utils/catalogos";
import useAppStore from "../../core/store/useAppStore";
import { useFontSize } from "../../context/FontSizeContext";

export function Pill({ estado, small, estados }) {
  const { fontSize } = useFontSize();
  // C03 (1.10.1): antes el catálogo por defecto era la constante ESTADOS
  // (14 nombres fijos), así que un estado creado/renombrado en Configuración
  // no se encontraba y el pill tomaba el accent de la última entrada del
  // default (o gris). Solo TablaView pasaba `estados`. Ahora, si el caller
  // no inyecta catálogo, se resuelve desde `config` sincronizado en la store
  // (App.jsx lo empuja en el mismo effect que configure() de notificaciones);
  // sin config cargada (tests/config por defecto) getEstados devuelve los
  // defaults de siempre, o sea comportamiento idéntico al anterior.
  const config = useAppStore((s) => s && s.config);
  const catalogo = estados && estados.length > 0 ? estados : getEstados(config || {});
  const info =
    catalogo.find((e) => e.v === estado) || catalogo[catalogo.length - 1];

  const sizeClass = small ? "pill-compact" : "pill-md";

  const cssKey = estado.replace(/\s+/g, '-');

  return (
    <span
      className={`pill-estado ${sizeClass}`}
      style={{
        // v1.10.0 (auditoría H1): el sufijo hex-alpha pegado al cierre de la
        // llamada var() con fallback es sintaxis inválida (var() no concatena
        // tokens) → el fondo del pill salía transparente y el borde se
        // descartaba. Se reemplaza por color-mix() conservando la alfa.
        backgroundColor: `color-mix(in srgb, var(--color-estado-${cssKey}, ${info.accent}) 13.3%, transparent)`,
        color: `var(--color-estado-${cssKey}, ${info.accent})`,
        border: `1px solid color-mix(in srgb, var(--color-estado-${cssKey}, ${info.accent}) 26.7%, transparent)`,
      }}
      role="status"
      aria-label={`Estado: ${estado}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: `var(--color-estado-${cssKey}, ${info.accent})`,
        }}
      />
      {estado}
    </span>
  );
}

export const PillMemo = React.memo(Pill);
