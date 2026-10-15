import React from "react";

/**
 * FilterCounter
 * Contador de resultados del filtro: "Total: N prospectos" con el valor en
 * negrita. Estandariza el marcador total compartido por las barras de filtro.
 * C02d (1.10.1): `pb-2.5` pasó a ser el DEFAULT de `className` (antes iba
 * hardcodeado y era in-sobreescribible). Las barras apiladas (FilterModal,
 * MonthDayFilterBar, CalendarFilters, DashboardFilters) no mandan className
 * y quedan idénticas; el footer en fila del CSV exporta `className=""` para
 * que el contador se centre vertical con los botones sin padding fantasma.
 */
export function FilterCounter({ total, label = "prospecto", className = "pb-2.5" }) {
  if (total === undefined) return null;
  return (
    <span
      className={`text-xs ${className}`}
      style={{ color: "var(--color-text-muted)" }}
    >
      Total: <b style={{ color: "var(--color-text)" }}>{total}</b>{" "}
      {label}
      {total !== 1 ? "s" : ""}
    </span>
  );
}

export default FilterCounter;