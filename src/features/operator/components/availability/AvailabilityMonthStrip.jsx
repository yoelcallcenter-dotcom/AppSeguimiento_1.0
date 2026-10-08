import React, { useMemo } from "react";
import { listForTab } from "./availabilityMeta";

const MESES_ABREV = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function buildCells(availability, count) {
  const today = new Date();
  const dates = [
    ...(listForTab(availability, "vacaciones") || []).map((v) => v.start),
    ...(listForTab(availability, "feriados") || []).map((h) => h.date),
    ...(listForTab(availability, "inasistencias") || []).map((a) => a.date),
    ...(listForTab(availability, "dias") || []).map((d) => d.date),
  ]
    .map((d) => (d || "").slice(0, 7))
    .filter(Boolean);

  const cells = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    cells.push({
      key,
      label: MESES_ABREV[date.getMonth()],
      year: date.getFullYear(),
      isCurrent: i === 0,
      has: dates.includes(key),
    });
  }
  return cells;
}

export function AvailabilityMonthStrip({ availability, count = 6 }) {
  const cells = useMemo(() => buildCells(availability, count), [availability, count]);

  return (
    <div className="flex gap-1 mb-3" role="group" aria-label="Resumen mensual de disponibilidad">
      {cells.map((cell) => (
        <button
          key={cell.key}
          type="button"
          className={`flex-1 flex flex-col items-center gap-1 rounded-md px-1 py-1.5 transition-colors ${
            cell.isCurrent ? "" : "hover:opacity-80"
          }`}
          style={{
            backgroundColor: cell.isCurrent ? "color-mix(in srgb, var(--color-accent) 13.3%, transparent)" : "var(--color-surface2)",
            border: `1px solid ${cell.isCurrent ? "color-mix(in srgb, var(--color-accent) 33.3%, transparent)" : "var(--color-border)"}`,
          }}
          title={`${cell.key}${cell.has ? " — hay registros" : ""}`}
          aria-label={`${cell.label} ${cell.year}${cell.has ? " con registros" : ""}`}
        >
          <span
            className="text-[9px] font-bold"
            style={{ color: cell.isCurrent ? "var(--color-accent)" : "var(--color-text-muted)" }}
          >
            {cell.label}
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: cell.has
                ? cell.isCurrent ? "var(--color-accent)" : "var(--color-warning)"
                : "transparent",
              border: cell.has ? "none" : "1px solid var(--color-border)",
            }}
          />
        </button>
      ))}
    </div>
  );
}

export default AvailabilityMonthStrip;