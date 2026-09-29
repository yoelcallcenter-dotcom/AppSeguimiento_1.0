import React from "react";
import { useUX } from "../../context/UXContext";

const JUSTIFY_PESTANAS = {
  izquierda: "flex-start",
  centro: "space-between",
  derecha: "flex-end",
};

export function useJustifyPestanas() {
  const { alineacionPestanas } = useUX();
  return JUSTIFY_PESTANAS[alineacionPestanas] || JUSTIFY_PESTANAS.centro;
}

export function NavDock({ items, active, onSelect, className = "", style, ariaLabel }) {
  const justifyContent = useJustifyPestanas();
  return (
    <div
      className={`flex flex-wrap gap-1.5 mb-3 p-1.5 rounded-xl ${className}`.trim()}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        ...style,
        justifyContent,
      }}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 h-[32px] rounded-lg transition-colors hover:opacity-80 ${
              isActive
                ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
            }`}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            <span>{item.label}</span>
            {item.badge != null && (
              <span
                className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? "bg-white/25" : "bg-[var(--color-surface2)]"
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SubPills({ items, active, onSelect, className = "", style, ariaLabel, itemClassName = "", singleLine = false }) {
  const justifyContent = useJustifyPestanas();
  return (
    <div
      className={`flex ${singleLine ? "tab-strip" : "flex-wrap"} gap-1 ${className}`.trim()}
      style={{ ...style, justifyContent }}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        const nuevoGrupo =
          Boolean(item.group) && index > 0 && item.group !== items[index - 1].group;
        return (
          <React.Fragment key={item.id}>
            {nuevoGrupo && (
              <span
                className="flex items-center gap-1.5 flex-shrink-0 select-none"
                aria-hidden="true"
              >
                <span className="w-px h-4" style={{ backgroundColor: "var(--color-border)" }} />
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {item.groupLabel || item.group}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 h-[30px] text-xs font-semibold transition-colors hover:opacity-80 border ${
                isActive
                  ? "bg-[var(--color-accent)22] text-[var(--color-accent)] border-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
              } ${itemClassName}`.trim()}
            >
              {Icon && <Icon size={13} aria-hidden="true" />}
              <span>{item.label}</span>
              {item.badge != null && (
                <span
                  className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? "bg-[var(--color-accent)22]" : "bg-[var(--color-surface2)]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}