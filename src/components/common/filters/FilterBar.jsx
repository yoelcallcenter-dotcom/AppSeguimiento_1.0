import React from "react";

/**
 * FilterBar
 * Contenedor flex estándar de la barra de filtros: alineación, espaciado y
 * wrapping consistente. Usa los tokens visuales de la app (gap-3, mb-4).
 * T4c (1.10.1): acepta props extra (role, aria-label, id…) y las propaga al
 * contenedor — el panel de filtros del Calendario se abre/cierra desde la
 * toolbar y necesita un role="group" con nombre para ser identificable en
 * tests y por lectores de pantalla (antes no había forma de referenciarlo).
 */
export function FilterBar({ children, className = "", style = {}, ...props }) {
  return (
    <div
      className={`flex items-end gap-3 mb-4 flex-wrap ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

export default FilterBar;