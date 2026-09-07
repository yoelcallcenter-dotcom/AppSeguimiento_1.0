import React, { useMemo } from "react";
import { PillMemo } from "../common/Pill";
import { onKeyActivate } from "../../utils/a11y";

export function UltimosCasos({ casos, onVerCaso, limite = 5 }) {
  const ultimos = useMemo(() => {
    return [...casos]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
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
