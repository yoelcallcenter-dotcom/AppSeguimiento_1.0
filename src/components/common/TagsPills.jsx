import React from "react";

/**
 * TagsPills.jsx
 * Muestra etiquetas como pills consistentes en toda la app
 * (modales, tarjetas, listas, eventos y resultados de búsqueda).
 */
export function TagsPills({ tags = [], size = "sm", showHash = true, onRemove, max = 20 }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const sizeClass = size === "xs" ? "text-[8px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.slice(0, max).map((t) => (
        <span
          key={t}
          className={`inline-flex items-center gap-0.5 rounded-full ${sizeClass}`}
          style={{
            backgroundColor: "var(--color-accent)22",
            color: "var(--color-accent)",
            border: "1px solid var(--color-accent)44",
          }}
        >
          {showHash && <span className="opacity-70">#</span>}
          {t}
          {onRemove && (
            <button
              onClick={() => onRemove(t)}
              className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
              aria-label={`Quitar etiqueta ${t}`}
            >
              &times;
            </button>
          )}
        </span>
      ))}
      {tags.length > max && (
        <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
          +{tags.length - max}
        </span>
      )}
    </div>
  );
}

export default TagsPills;
