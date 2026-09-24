import React from "react";

/**
 * FilterLabel
 * Etiqueta estándar para controles de filtro: texto compacto en mayúsculas
 * con tracking ancho, color muted. Única fuente visual de los labels de
 * filtros en toda la aplicación (Mes, Día, Estado, Aseguradora, etc.).
 */
export function FilterLabel({ children, htmlFor, className = "", style = {} }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ color: "var(--color-text-muted)", ...style }}
    >
      {children}
    </label>
  );
}

export default FilterLabel;