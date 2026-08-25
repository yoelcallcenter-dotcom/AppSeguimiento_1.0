import React from "react";

/**
 * DayFilter
 * Selector de días compacto y multi-selección: solo muestra los días que
 * tienen casos en el mes seleccionado (los días vacíos no son útiles para
 * filtrar). Sin barra de desplazamiento y a la misma altura del filtro de mes.
 */
export function DayFilter({ selectedDays, onDayChange, diasDisponibles = [], style = {} }) {
  const dias = [...new Set(diasDisponibles)].sort((a, b) => a - b);

  const toggleDay = (d) => {
    const next = selectedDays.includes(d)
      ? selectedDays.filter((x) => x !== d)
      : [...selectedDays, d].sort((a, b) => a - b);
    onDayChange(next);
  };

  const btnStyle = {
    height: "2.5rem",
    minWidth: "2.25rem",
    padding: "0 0.5rem",
    borderRadius: "0.375rem",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface2)",
    color: "var(--color-text)",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.15s, color 0.15s, border-color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", ...style }}>
      <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        Día
      </label>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onDayChange([])}
          style={{
            ...btnStyle,
            backgroundColor: selectedDays.length === 0 ? "var(--color-accent)" : "var(--color-surface2)",
            color: selectedDays.length === 0 ? "#14181F" : "var(--color-text-muted)",
            borderColor: selectedDays.length === 0 ? "var(--color-accent)" : "var(--color-border)",
          }}
          aria-pressed={selectedDays.length === 0}
          title="Ver todos los días"
        >
          Todos
        </button>
        {dias.map((d) => {
          const active = selectedDays.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              style={{
                ...btnStyle,
                backgroundColor: active ? "var(--color-accent)22" : "var(--color-surface2)",
                color: active ? "var(--color-accent)" : "var(--color-text)",
                borderColor: active ? "var(--color-accent)" : "var(--color-border)",
              }}
              aria-pressed={active}
              title={`Día ${d}`}
            >
              {d}
            </button>
          );
        })}
        {dias.length === 0 && (
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Sin casos en el mes
          </span>
        )}
      </div>
    </div>
  );
}

export default DayFilter;
