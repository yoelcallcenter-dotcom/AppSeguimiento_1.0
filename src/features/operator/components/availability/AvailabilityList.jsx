import React from "react";
import { Trash2, Pencil } from "lucide-react";
import { TAB_META, tabColor, itemTitle, itemSubtitle, itemActive, itemStatusPill } from "./availabilityMeta";
// v1.9.7 (fix B3): día en hora local, no en UTC (ver OperatorView).
import { hoyISO } from "../../../../utils/dateUtils";

export function AvailabilityList({ availability, tab, onEdit, onRemove }) {
  const list = {
    vacaciones: availability.vacations || [],
    feriados: availability.holidays || [],
    inasistencias: availability.absences || [],
    dias: availability.customDaysOff || [],
  }[tab];

  if (list.length === 0) {
    return (
      <div
        className="text-center py-8 px-3 rounded-md text-xs"
        style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)", color: "var(--color-text-muted)" }}
      >
        {TAB_META[tab].empty}
      </div>
    );
  }

  const todayISO = hoyISO();

  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
      {list.map((item) => {
        const color = tabColor(tab);
        const isActive = itemActive(tab, item, todayISO);
        return (
          <div
            key={item.id}
            className={`flex items-start gap-1.5 p-2.5 rounded-md transition-shadow transition-opacity ${isActive ? "ring-1" : "opacity-60"}`}
            style={{
              backgroundColor: isActive ? "var(--color-surface2)" : "var(--color-surface)",
              border: isActive ? `1px solid color-mix(in srgb, ${color} 26.7%, transparent)` : "1px solid var(--color-border)",
              boxShadow: isActive ? `0 0 0 1px ${color}` : "none",
            }}
          >
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: isActive ? color : "var(--color-border)" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                  {itemTitle(tab, item)}
                </span>
                {isActive && (
                  <span
                    className="pill-compact font-bold"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 13.3%, transparent)`, color }}
                  >
                    {itemStatusPill(tab)}
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {itemSubtitle(tab, item)}
              </div>
              {(item.note || item.motivo) && (
                <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                  {item.note || item.motivo}
                </div>
              )}
            </div>
            <button
              onClick={() => onEdit({ ...item })}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Editar registro"
              title="Editar registro"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-danger)" }}
              aria-label="Eliminar registro"
              title="Eliminar registro"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default AvailabilityList;