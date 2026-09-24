import React from "react";

/**
 * FilterBar
 * Contenedor flex estándar de la barra de filtros: alineación, espaciado y
 * wrapping consistente. Usa los tokens visuales de la app (gap-3, mb-4).
 */
export function FilterBar({ children, className = "", style = {} }) {
  return (
    <div
      className={`flex items-end gap-3 mb-4 flex-wrap ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default FilterBar;