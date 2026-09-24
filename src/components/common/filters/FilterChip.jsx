import React from "react";

/**
 * FilterChip
 * Píldora/botón estándar de filtros compactos (día, período, toggle).
 * Estado seleccionado vs. no seleccionado con los tokens de color de la app.
 */
export function FilterChip({
  active = false,
  disabled = false,
  onClick,
  title,
  children,
  className = "",
  style = {},
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition-all hover:opacity-80 whitespace-nowrap ${className}`}
      style={{
        backgroundColor: active ? "var(--color-accent)" : "var(--color-surface2)",
        color: active ? "var(--color-text-on-accent)" : "var(--color-text-muted)",
        border: `1px solid ${
          active ? "var(--color-accent)" : "var(--color-border)"
        }`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export default FilterChip;