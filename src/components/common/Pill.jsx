import React from "react";
import { ESTADOS } from "../../utils/constants";
import { useFontSize } from "../../context/FontSizeContext";

export function Pill({ estado, small, estados }) {
  const { fontSize } = useFontSize();
  const catalogo = estados && estados.length > 0 ? estados : ESTADOS;
  const info =
    catalogo.find((e) => e.v === estado) || catalogo[catalogo.length - 1];

  const sizeClass = small ? "pill-compact" : "pill-md";

  const cssKey = estado.replace(/\s+/g, '-');

  return (
    <span
      className={`pill-estado ${sizeClass}`}
      style={{
        backgroundColor: `var(--color-estado-${cssKey}, ${info.accent})22`,
        color: `var(--color-estado-${cssKey}, ${info.accent})`,
        border: `1px solid var(--color-estado-${cssKey}, ${info.accent})55`,
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
