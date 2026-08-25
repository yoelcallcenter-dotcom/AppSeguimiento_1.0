import React from "react";

export function Spinner({
  size = 24,
  color = "var(--color-accent)",
  className = "",
}) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${className}`}
      style={{
        width: size,
        height: size,
        color: color,
        borderWidth: size > 30 ? "3px" : "2px",
      }}
      role="status"
      aria-label="Cargando"
    />
  );
}
