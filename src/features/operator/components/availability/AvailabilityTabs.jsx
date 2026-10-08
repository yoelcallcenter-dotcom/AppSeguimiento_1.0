import React from "react";
import { TAB_META } from "./availabilityMeta";
import { listForTab } from "./availabilityMeta";
import { useJustifyPestanas } from "../../../../components/common/UINav";

export function AvailabilityTabs({ availability, tab, onTabChange }) {
  const justifyContent = useJustifyPestanas();
  return (
    <div className="flex flex-wrap gap-1 mb-3" style={{ justifyContent }}>
      {Object.entries(TAB_META).map(([key, meta]) => {
        const count = listForTab(availability, key).length;
        const Icon = meta.icon;
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
              active
                ? "bg-[color-mix(in_srgb,var(--color-accent)_13.3%,_transparent)] text-[var(--color-accent)] border border-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] border border-[var(--color-border)] hover:opacity-80"
            }`}
            aria-pressed={active}
          >
            <Icon size={12} />
            {meta.label}
            <span
              className="ml-0.5 px-1.5 rounded-full text-[9px] font-bold"
              style={{
                backgroundColor: active ? "var(--color-accent)" : "var(--color-surface2)",
                color: active ? "var(--color-text-on-accent)" : "var(--color-text-muted)",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default AvailabilityTabs;