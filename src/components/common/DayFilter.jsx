import React from "react";

/**
 * DayFilter
 * Selector de días compacto y multi-selección: solo muestra los días que
 * tienen casos en el mes seleccionado (los días vacíos no es útil filtrar).
 * Sin barra de desplazamiento y a la misma altura del filtro de mes.
 *
 * 1.10.1 (revisión del usuario): `hoyDia` (número de día o null) marca el día
 * de HOY con un OUTLINE accent (borde 2px) — antes era un punto debajo del
 * número + negrita, poco visible. El outline solo se aplica cuando el día NO
 * está seleccionado; si además está activo manda el estilo de selección
 * (fondo tintado + borde accent). El clic es el mismo toggle de siempre, así
 * el atajo "Solo de hoy" queda discreto dentro de la tira de días. Si hoy no
 * tiene casos en el mes, el día no está en `diasDisponibles` y no se muestra
 * ningún marcador.
 */
export function DayFilter({ selectedDays, onDayChange, diasDisponibles = [], hoyDia = null, style = {} }) {
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
    transition: "background-color var(--duration-normal, 0.18s) var(--ease-standard, cubic-bezier(0.4,0,0.2,1)), color var(--duration-normal, 0.18s) var(--ease-standard, cubic-bezier(0.4,0,0.2,1)), border-color var(--duration-normal, 0.18s) var(--ease-standard, cubic-bezier(0.4,0,0.2,1))",
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
            color: selectedDays.length === 0 ? "var(--color-text-on-accent)" : "var(--color-text-muted)",
            borderColor: selectedDays.length === 0 ? "var(--color-accent)" : "var(--color-border)",
          }}
          aria-pressed={selectedDays.length === 0}
          title="Ver todos los días"
        >
          Todos
        </button>
        {dias.map((d) => {
          const active = selectedDays.includes(d);
          // 1.10.1: resaltado de HOY con outline accent (borde 2px) en vez del
          // punto+negrita de 1.10.0 — más visible y consistente con el resto.
          // Con el día seleccionado manda el estilo de selección (sin outline
          // doble); el title/aria-label siguen indicando "(hoy)".
          const esHoy = hoyDia === d;
          const outlineHoy = esHoy && !active;
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              style={{
                ...btnStyle,
                backgroundColor: active ? "color-mix(in srgb, var(--color-accent) 13.3%, transparent)" : "var(--color-surface2)",
                color: active ? "var(--color-accent)" : "var(--color-text)",
                borderColor: active || outlineHoy ? "var(--color-accent)" : "var(--color-border)",
                border: outlineHoy ? "2px solid var(--color-accent)" : undefined,
              }}
              aria-pressed={active}
              title={
                esHoy
                  ? `Día ${d} (hoy) — clic para ver solo los casos de hoy`
                  : `Día ${d}`
              }
              aria-label={esHoy ? `Día ${d} (hoy)` : `Día ${d}`}
              data-tour={esHoy ? "dia-hoy" : undefined}
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
