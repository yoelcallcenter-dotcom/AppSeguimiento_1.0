import React, { useMemo } from "react";
import { PillMemo } from "../common/Pill";
import { onKeyActivate } from "../../utils/a11y";
// M28 (1.10.1): normalizeDate convierte DD/MM/YYYY (fechas legadas) y ISO a
// "YYYY-MM-DD"; sin él, new Date("15/07/2026") es Invalid Date (NaN) y el sort
// quedaba indeterminado/inestable para esos casos.
import { normalizeDate } from "../../utils/dateFilters";

export function UltimosCasos({ casos, onVerCaso, limite = 5 }) {
  const ultimos = useMemo(() => {
    // Ordena por timestamp descendente. Fallback para fechas vacías o no
    // parseables: 0 → quedan al final (se consideran "más viejas"), evitando
    // que NaN contamine la comparación del Array.sort.
    const ts = (fecha) => {
      const iso = normalizeDate(fecha);
      if (!iso) return 0;
      const t = new Date(iso).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    return [...casos]
      .sort((a, b) => ts(b.fecha) - ts(a.fecha))
      .slice(0, limite);
  }, [casos, limite]);

  if (ultimos.length === 0) {
    return (
      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        No hay casos recientes
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {ultimos.map((c) => (
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          aria-label={`Ver caso ${c.nombre || "Sin nombre"}`}
          onClick={() => onVerCaso(c.id)}
          onKeyDown={onKeyActivate(() => onVerCaso(c.id))}
          className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-white/5 transition-colors text-xs"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span style={{ color: "var(--color-text-muted)" }}>{c.fecha}</span>
          <span
            className="flex-1 truncate"
            style={{ color: "var(--color-text)" }}
          >
            {c.nombre || "Sin nombre"}
          </span>
          <PillMemo estado={c.estado} small />
          {c.leido === false && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: "var(--color-accent)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
