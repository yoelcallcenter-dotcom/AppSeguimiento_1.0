import React from "react";

export function NavDock({ items, active, onSelect, className = "", style, ariaLabel }) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 mb-3 p-1.5 rounded-xl ${className}`.trim()}
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", ...style }}
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
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors hover:opacity-80"
            style={
              isActive
                ? { backgroundColor: "var(--color-accent)", color: "var(--color-text-on-accent)" }
                : { color: "var(--color-text-muted)" }
            }
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            <span>{item.label}</span>
            {item.badge != null && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "var(--color-surface2)" }}
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

export function SubPills({ items, active, onSelect, className = "", style, ariaLabel, itemClassName = "" }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()} style={style} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80 ${itemClassName}`.trim()}
            style={
              isActive
                ? { backgroundColor: "var(--color-accent)22", color: "var(--color-accent)", border: "1px solid var(--color-accent)" }
                : { color: "var(--color-text-muted)", border: "1px solid transparent" }
            }
          >
            {Icon && <Icon size={13} aria-hidden="true" />}
            <span>{item.label}</span>
            {item.badge != null && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: isActive ? "var(--color-accent)22" : "var(--color-surface2)" }}
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