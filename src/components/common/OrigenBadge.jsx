import React from "react";
import { Radio, UserCheck, Scale } from "lucide-react";

export const ORIGEN_OPTIONS = [
  { value: "Operador", label: "Operador", abbr: "OP", icon: Radio, color: "#60A5FA" },
  { value: "Primera Atención", label: "Primera Atención", abbr: "PA", icon: UserCheck, color: "#F59E0B" },
  { value: "Estudio Jurídico", label: "Estudio Jurídico", abbr: "EJ", icon: Scale, color: "#8B5CF6" },
];

export function getOrigenConfig(origen) {
  return ORIGEN_OPTIONS.find((o) => o.value === origen) || ORIGEN_OPTIONS[0];
}

/**
 * Badge visual para el origen de un reporte.
 * @param {string} origen - "Operador" | "Primera Atención" | "Estudio Jurídico"
 * @param {string} size - "sm" | "md"
 * @param {boolean} showLabel - mostrar texto completo en vez de abreviatura
 */
export function OrigenBadge({ origen, size = "sm", showLabel = false }) {
  const config = getOrigenConfig(origen);
  const Icon = config.icon;

  const sizeClasses = size === "sm"
    ? "text-[9px] px-1.5 py-px gap-0.5 leading-tight"
    : "text-[10px] px-2 py-0.5 gap-1";

  return (
    <span
      className={`inline-flex items-center self-center font-bold rounded-md flex-shrink-0 mr-1 ${sizeClasses}`}
      style={{
        backgroundColor: config.color + "18",
        color: config.color,
        border: `1px solid ${config.color}44`,
      }}
      title={config.value}
    >
      <Icon size={size === "sm" ? 10 : 12} />
      {showLabel ? config.label : config.abbr}
    </span>
  );
}

/**
 * Selector de origen para formularios.
 */
export function OrigenSelector({ value, onChange, size = "sm" }) {
  return (
    <div className="flex gap-1.5">
      {ORIGEN_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
              size === "sm" ? "text-[11px]" : "text-xs"
            }`}
            style={{
              backgroundColor: active ? opt.color + "22" : "var(--color-surface2)",
              color: active ? opt.color : "var(--color-text-muted)",
              border: active ? `1.5px solid ${opt.color}` : "1px solid var(--color-border)",
            }}
          >
            <Icon size={size === "sm" ? 12 : 14} />
            {opt.abbr}
          </button>
        );
      })}
    </div>
  );
}
