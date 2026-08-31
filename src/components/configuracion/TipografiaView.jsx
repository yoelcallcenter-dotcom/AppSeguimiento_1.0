import React from "react";
import { Type, Check, Ruler, RotateCcw } from "lucide-react";
import { BtnOutline } from "../common/BtnOutline";
import { useTypography } from "../../context/TypographyContext";

/**
 * Vista previa compacta de un preset usando las fuentes REALES del estilo
 * (no simula con la fuente global): nombre, título, subtítulo, datos
 * numéricos y elemento de interfaz.
 */
function PresetPreview({ preset }) {
  const previewStyle = {
    fontFamily: preset.ui,
    backgroundColor: "var(--color-surface2)",
    border: "1px solid var(--color-border)",
    borderRadius: "0.5rem",
    padding: "0.75rem",
  };
  const headingStyle = { fontFamily: preset.heading, margin: 0 };
  const metricStyle = {
    fontFamily: preset.metric,
    fontWeight: 700,
    fontSize: "1.1rem",
    lineHeight: 1.2,
    margin: 0,
  };
  const uiStyle = {
    fontFamily: preset.ui,
    display: "inline-block",
    border: "1px solid var(--color-border)",
    borderRadius: "0.375rem",
    padding: "0.15rem 0.5rem",
    fontSize: "0.68rem",
  };

  return (
    <div style={previewStyle} aria-hidden="true">
      <div style={{ fontSize: "0.95rem", fontWeight: 800, ...headingStyle }}>
        AppSeguimiento
      </div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "0.3rem", ...headingStyle }}>
        Gestión de Casos
      </div>
      <div style={metricStyle}>128 casos · 15/09 · 14:30</div>
      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
        <span style={uiStyle}>Tablero</span>
        <span style={{ ...uiStyle, fontWeight: 700 }}>Dashboard</span>
        <span style={uiStyle}>Reportes</span>
      </div>
    </div>
  );
}

function PresetCard({ preset, active, onClick }) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      aria-label={`Estilo ${preset.name}`}
      className={`relative flex flex-col gap-2 p-3 rounded-lg text-left transition-transform transition-opacity hover:scale-[1.02] active:scale-[0.98] ${
        active ? "ring-2" : "hover:opacity-90"
      }`}
      style={{
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
        transitionProperty: "transform, opacity",
        outline: "none",
      }}
    >
      {active && (
        <span
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          <Check size={12} color="#14181F" strokeWidth={3} />
        </span>
      )}

      <div
        className="flex items-center gap-1.5"
        style={{ fontFamily: preset.ui }}
      >
        <span className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
          {preset.name}
        </span>
      </div>

      <PresetPreview preset={preset} />

      <p
        className="text-[10px] leading-tight"
        style={{ color: "var(--color-text-muted)", fontFamily: preset.ui }}
      >
        {preset.description}
      </p>
    </button>
  );
}

export function TipografiaView({ showToast }) {
  const { preset, setPreset, fontSize, setFontSize, presets, resetToDefaults } =
    useTypography();

  const handlePreset = (id) => {
    if (id === preset) return;
    setPreset(id);
    if (showToast) showToast("Estilo tipográfico actualizado", "success");
  };

  const fontSizes = [
    { value: "small", label: "Pequeño" },
    { value: "medium", label: "Mediano" },
    { value: "large", label: "Grande" },
  ];

  return (
    <div className="space-y-6">
      {/* Estilos tipográficos */}
      <div>
        <div className="config-section-title flex items-center gap-2">
          <Type size={14} color="var(--color-accent)" />
          Estilo Tipográfico
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3"
          role="radiogroup"
          aria-label="Estilos tipográficos"
        >
          {presets.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              active={preset === p.id}
              onClick={() => handlePreset(p.id)}
            />
          ))}
        </div>
        <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
          Seleccioná un estilo completo de combinaciones tipográficas diseñadas
          (interfaz, títulos y métricas). Se aplica al instante en toda la
          interfaz sin cambios de tamaño.
        </p>
      </div>

      {/* Tamaño de fuente */}
      <div className="config-section">
        <div className="config-section-title flex items-center gap-2">
          <Ruler size={14} color="var(--color-accent)" />
          Tamaño de Fuente
        </div>
        <div className="flex flex-wrap gap-2">
          {fontSizes.map((fs) => (
            <button
              key={fs.value}
              onClick={() => setFontSize(fs.value)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 ${
                fontSize === fs.value
                  ? "bg-[var(--color-accent)] text-[#14181F]"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              {fs.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
          Escala global (pequeña, normal o grande). Es independiente del estilo
          tipográfico: cambiar uno no modifica el otro.
        </p>
      </div>

      {/* Restaurar */}
      <div className="flex pt-2 border-t border-[var(--color-border)]">
        <BtnOutline onClick={resetToDefaults} size="sm">
          <RotateCcw size={14} /> Restaurar tipografía por defecto
        </BtnOutline>
      </div>
    </div>
  );
}
