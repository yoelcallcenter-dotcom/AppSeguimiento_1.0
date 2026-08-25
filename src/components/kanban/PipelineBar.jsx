import React from "react";
import { getEstados } from "../../utils/catalogos";
import { useTheme } from "../../context/ThemeContext";

export function PipelineBar({ casos, config }) {
  const theme = useTheme();
  const estados = getEstados(config);
  const total = casos.length || 1;

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
          return (
            <div
              key={e.v}
              title={`${e.v}: ${count}`}
              style={{
                width: `${(count / total) * 100}%`,
                backgroundColor: color,
                transition: "width 0.3s ease",
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
          return (
            <div
              key={e.v}
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {e.v} <span style={{ color: "var(--color-text)" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
