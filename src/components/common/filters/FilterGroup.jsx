import React from "react";

/**
 * FilterGroup
 * Contenedor estándar de un control de filtro: columna con etiqueta y control.
 * Define el ancho mínimo y el espaciado vertical entre etiqueta y control,
 * base visual consistente para todos los filtros de la aplicación.
 */
export function FilterGroup({
  label,
  htmlFor,
  children,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${className}`}
      style={{ minWidth: 150, ...style }}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export default FilterGroup;