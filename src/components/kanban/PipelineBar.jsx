import React from "react";
import { getEstados } from "../../utils/catalogos";
import { useTheme } from "../../context/ThemeContext";
import { useFilters } from "../../context/FiltersContext";

export function PipelineBar({ casos, config, activeFilter }) {
  const theme = useTheme();
  const { quickFilter, setQuickFilter } = useFilters();
  const estados = getEstados(config);
  const total = casos.length || 1;

  const handleFilter = (estado) => {
    if (quickFilter && quickFilter.tipo === "estado" && quickFilter.valor === estado) {
      setQuickFilter(null);
    } else {
      setQuickFilter({ tipo: "estado", valor: estado });
    }
  };

  const isFiltered = (estado) => quickFilter && quickFilter.tipo === "estado" && quickFilter.valor === estado;

  return (
    <div className="mb-5">
      <div
        className="flex w-full h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {estados.map((e) => {
          const count = casos.filter((c) => c.estado === e.v).length;
          if (!count) return null;
          const color = theme.getEstadoColor(e.v) || e.accent || "#6B7280";
          const active = isFiltered(e.v);
          return (
            <div
              key={e.v}
              title={`${e.v}: ${count} — clic para filtrar`}
              onClick={() => handleFilter(e.v)}
              className="cursor-pointer transition-all hover:brightness-125"
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: color,
                transition: "width 0.3s ease",
                opacity: quickFilter && !active ? 0.3 : 1,
                outline: active ? `2px solid ${color}` : "none",
                outlineOffset: "-1px",
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {estados.map((e) => {
          const count = casos.filter((c) => c.estado === e.v).length;
          if (!count) return null;
          const color = theme.getEstadoColor(e.v) || e.accent || "#6B7280";
          const active = isFiltered(e.v);
          return (
            <button
              key={e.v}
              onClick={() => handleFilter(e.v)}
              className="flex items-center gap-1.5 text-[11px] rounded px-1 py-0.5 transition-all hover:bg-white/5"
              style={{
                color: "var(--color-text-muted)",
                opacity: quickFilter && !active ? 0.4 : 1,
                fontWeight: active ? 700 : 400,
              }}
              title={`Clic para filtrar por ${e.v}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {e.v} <span style={{ color: "var(--color-text)" }}>{count}</span>
              {active && <span className="text-[9px]" style={{ color: "var(--color-accent)" }}>✕</span>}
            </button>
          );
        })}
      </div>
      {quickFilter && quickFilter.tipo === "estado" && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span style={{ color: "var(--color-text-muted)" }}>
            Filtrado por: <strong style={{ color: "var(--color-accent)" }}>{quickFilter.valor}</strong>
          </span>
          <button
            onClick={() => setQuickFilter(null)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{ color: "var(--color-danger)", backgroundColor: "var(--color-surface2)" }}
          >
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}
