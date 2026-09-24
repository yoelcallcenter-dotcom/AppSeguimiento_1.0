import React, { useMemo } from "react";
import { getEstados } from "../../utils/catalogos";
import { useTheme } from "../../context/ThemeContext";
import { useFilters } from "../../context/FiltersContext";
import { contarCasosPorEstado } from "../../utils/casosStats";
import { quickFilterEstados } from "../../utils/filtrarQuickFilter";

/**
 * Barra de distribución de casos por estado.
 * Multi-selección: permite filtrar por uno o varios estados a la vez.
 *  - Clic en un estado lo agrega/quita de la selección.
 *  - Segmentos y chips no seleccionados se atenúan (opacity).
 *  - Footer muestra la selección actual con opción "Limpiar".
 */
export function PipelineBar({ casos, config, activeFilter }) {
  const theme = useTheme();
  const { quickFilter, setQuickFilter } = useFilters();
  const estados = getEstados(config);
  const total = casos.length || 1;

  const counts = useMemo(() => contarCasosPorEstado(casos), [casos]);
  const seleccionados = useMemo(() => quickFilterEstados(quickFilter), [quickFilter]);
  const hayFiltro = seleccionados.length > 0;

  const handleFilter = (estado) => {
    if (seleccionados.includes(estado)) {
      const next = seleccionados.filter((e) => e !== estado);
      if (next.length === 0) {
        setQuickFilter(null);
      } else {
        setQuickFilter({ tipo: "estado", valor: next });
      }
    } else {
      setQuickFilter({ tipo: "estado", valor: [...seleccionados, estado] });
    }
  };

  const isFiltered = (estado) => seleccionados.includes(estado);

  return (
    <div className="mb-5">
      <div
        className="flex w-full h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {estados.map((e) => {
          const count = counts[e.v] || 0;
          if (!count) return null;
          const color = theme.getEstadoColor(e.v) || e.accent || "#6B7280";
          const active = isFiltered(e.v);
          return (
            <div
              key={e.v}
              title={`${e.v}: ${count}`}
              className="transition-opacity"
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: color,
                transition:
                  "width var(--duration-slow, 0.35s) var(--ease-standard, cubic-bezier(0.4,0,0.2,1))",
                opacity: hayFiltro && !active ? 0.3 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {estados.map((e) => {
          const count = counts[e.v] || 0;
          if (!count) return null;
          const color = theme.getEstadoColor(e.v) || e.accent || "#6B7280";
          const active = isFiltered(e.v);
          return (
            <button
              key={e.v}
              type="button"
              aria-pressed={active}
              onClick={() => handleFilter(e.v)}
              className="flex items-center gap-1.5 text-[11px] rounded px-1 py-0.5 transition-all hover:bg-white/5"
              style={{
                color: "var(--color-text-muted)",
                opacity: hayFiltro && !active ? 0.4 : 1,
                fontWeight: active ? 700 : 400,
                boxShadow: active
                  ? `0 0 0 1.5px ${color}55`
                  : "none",
                backgroundColor: active ? `${color}1a` : "transparent",
              }}
              title={`Clic para filtrar por ${e.v}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {e.v} <span style={{ color: "var(--color-text)" }}>{count}</span>
              {active && (
                <span className="text-[9px]" style={{ color: "var(--color-accent)" }}>✕</span>
              )}
            </button>
          );
        })}
      </div>
      {hayFiltro && (
        <div className="mt-2 flex items-center gap-2 text-[11px] flex-wrap">
          <span style={{ color: "var(--color-text-muted)" }}>
            Filtrado por:{" "}
            <strong style={{ color: "var(--color-accent)" }}>
              {seleccionados.slice(0, 3).join(", ")}
              {seleccionados.length > 3 &&
                ` (+${seleccionados.length - 3} más)`}
            </strong>
          </span>
          <button
            onClick={() => setQuickFilter(null)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: "var(--color-danger)",
              backgroundColor: "var(--color-surface2)",
            }}
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

export default PipelineBar;