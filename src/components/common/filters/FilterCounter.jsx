import React from "react";

/**
 * FilterCounter
 * Contador de resultados del filtro: "Total: N prospectos" con el valor en
 * negrita. Estandariza el marcador total compartido por las barras de filtro.
 */
export function FilterCounter({ total, label = "prospecto", className = "" }) {
  if (total === undefined) return null;
  return (
    <span
      className={`text-xs pb-2.5 ${className}`}
      style={{ color: "var(--color-text-muted)" }}
    >
      Total: <b style={{ color: "var(--color-text)" }}>{total}</b>{" "}
      {label}
      {total !== 1 ? "s" : ""}
    </span>
  );
}

export default FilterCounter;