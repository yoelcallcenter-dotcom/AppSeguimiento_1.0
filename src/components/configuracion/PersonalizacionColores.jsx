import React, { useState } from "react";
import { Palette, RotateCcw, Moon, Sun, Type, ChevronDown, Check, Pipette, Sparkles } from "lucide-react";
import { BtnOutline } from "../common/BtnOutline";
import { Toggle } from "../common/Toggle";
import { useTheme } from "../../context/ThemeContext";
import { useFontSize } from "../../context/FontSizeContext";
import { ESTADOS } from "../../utils/constants";
import { ESTADO_COLOR_SWATCHES } from "../../core/theme/themeTokens";
import { getUiSettings, saveUiSettings } from "../../utils/uiSettings";

function PaletteCard({ palette, isActive, onClick }) {
  const { primary, accent, ring } = palette.colors;
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
        isActive ? "ring-2 ring-offset-2" : "hover:opacity-80"
      }`}
      style={{
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${isActive ? primary : "var(--color-border)"}`,
        ringColor: primary,
        outline: "none",
      }}
      title={palette.description}
    >
      {isActive && (
        <span
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: primary }}
        >
          <Check size={12} color="#fff" strokeWidth={3} />
        </span>
      )}
      <div className="flex gap-1">
        <span
          className="w-6 h-6 rounded-full border border-white/20"
          style={{ backgroundColor: primary }}
        />
        <span
          className="w-6 h-6 rounded-full border border-white/20"
          style={{ backgroundColor: accent }}
        />
        <span
          className="w-6 h-6 rounded-full border border-white/20"
          style={{ backgroundColor: ring, opacity: 0.8 }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
        {palette.label}
      </span>
      <span className="text-[10px] leading-tight text-center" style={{ color: "var(--color-text-muted)" }}>
        {palette.description}
      </span>
    </button>
  );
}

function EstadoColorItem({ estado, currentColor, expanded, onToggle, onColorChange }) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        border: `1px solid ${expanded ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
        aria-expanded={expanded}
      >
        <span
          className="w-7 h-7 rounded-full border-2 border-white/20 flex-shrink-0"
          style={{ backgroundColor: currentColor }}
        />
        <span className="text-xs font-medium flex-1 leading-tight truncate" style={{ color: "var(--color-text)" }}>
          {estado}
        </span>
        <ChevronDown
          size={14}
          style={{ color: "var(--color-text-muted)" }}
          className={`flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="grid grid-cols-6 gap-1.5">
            {ESTADO_COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(estado, c)}
                className={`aspect-square rounded-full transition-transform hover:scale-110 ${
                  currentColor === c ? "ring-2 ring-white" : ""
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <label
            className="mt-2.5 flex items-center gap-2 text-[10px] font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Pipette size={12} className="flex-shrink-0" />
            Personalizado
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(estado, e.target.value)}
              className="flex-1 h-6 rounded cursor-pointer border border-white/20"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function PersonalizacionColores({ showToast }) {
  const theme = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const [estadoColorEdits, setEstadoColorEdits] = useState({});
  const [openEstado, setOpenEstado] = useState(null);
  const [easterEggsEnabled, setEasterEggsEnabled] = useState(
    () => getUiSettings().easterEggsEnabled !== false
  );

  const fontSizes = [
    { value: "small", label: "Pequeño" },
    { value: "medium", label: "Mediano" },
    { value: "large", label: "Grande" },
  ];

  const handlePaletteChange = (paletteId) => {
    theme.changePalette(paletteId);
    if (showToast) showToast(`Paleta "${theme.palettes.find(p => p.id === paletteId)?.label}" aplicada`, "success");
  };

  const handleEstadoColorChange = (estado, color) => {
    setEstadoColorEdits((prev) => ({ ...prev, [estado]: color }));
    theme.updateEstadoColor(estado, color);
  };

  const handleReset = () => {
    theme.resetToDefaults();
    setEstadoColorEdits({});
    if (showToast) showToast("Colores restaurados por defecto", "info");
  };

  const handleEasterEggsToggle = (value) => {
    setEasterEggsEnabled(value);
    saveUiSettings({ easterEggsEnabled: value });
    if (showToast) {
      showToast(
        value ? "Efectos visuales y easter eggs activados" : "Efectos visuales y easter eggs desactivados",
        "info"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tema Oscuro/Claro */}
      <div className="config-section">
        <div className="config-section-title flex items-center gap-2">
          <Palette size={14} color="var(--color-accent)" />
          Modo de Tema
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => theme.changeTheme("dark")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 flex-1 justify-center ${
              theme.isDark
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
            }`}
          >
            <Moon size={16} /> Oscuro
          </button>
          <button
            onClick={() => theme.changeTheme("light")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 flex-1 justify-center ${
              theme.isLight
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
            }`}
          >
            <Sun size={16} /> Claro
          </button>
        </div>
      </div>

      {/* Paletas de color */}
      <div className="config-section">
        <div className="config-section-title flex items-center gap-2">
          <Palette size={14} color="var(--color-accent)" />
          Paleta de Color
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {theme.palettes.map((p) => (
            <PaletteCard
              key={p.id}
              palette={p}
              isActive={theme.palette === p.id}
              onClick={() => handlePaletteChange(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Tamaño de fuente */}
      <div className="config-section">
        <div className="config-section-title flex items-center gap-2">
          <Type size={14} color="var(--color-accent)" />
          Tamaño de Fuente
        </div>
        <div className="flex flex-wrap gap-2">
          {fontSizes.map((fs) => (
            <button
              key={fs.value}
              onClick={() => setFontSize(fs.value)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 ${
                fontSize === fs.value
                  ? "bg-[var(--color-accent)] text-[#14181F]"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              {fs.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colores por estado */}
      <div className="config-section">
        <div className="config-section-title flex items-center gap-2">
          <Palette size={14} color="var(--color-accent)" />
          Colores por Estado de Caso
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ESTADOS.map((estado) => {
            const currentColor =
              estadoColorEdits[estado.v] ||
              theme.getEstadoColor(estado.v) ||
              estado.accent ||
              "#6B7280";
            return (
              <EstadoColorItem
                key={estado.v}
                estado={estado.v}
                currentColor={currentColor}
                expanded={openEstado === estado.v}
                onToggle={() => setOpenEstado(openEstado === estado.v ? null : estado.v)}
                onColorChange={handleEstadoColorChange}
              />
            );
          })}
        </div>
      </div>

      {/* Efectos visuales y easter eggs */}
      <div className="config-section">
        <div className="config-section-title flex items-center gap-2">
          <Sparkles size={14} color="var(--color-accent)" />
          Efectos visuales y easter eggs
        </div>
        <div className="flex flex-wrap gap-4">
          <Toggle
            checked={easterEggsEnabled}
            onChange={handleEasterEggsToggle}
            label="Mostrar easter eggs según el uso de la app"
          />
        </div>
        <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
          Pequeños mensajes con iconos que aparecen al detectar patrones de uso (filtros,
          movimientos de casos, análisis). No interfieren con el trabajo y se pueden
          desactivar cuando quieras.
        </p>
      </div>

      {/* Reset */}
      <div className="flex pt-2 border-t border-[var(--color-border)]">
        <BtnOutline onClick={handleReset} size="sm">
          <RotateCcw size={14} /> Restaurar por defecto
        </BtnOutline>
      </div>
    </div>
  );
}
