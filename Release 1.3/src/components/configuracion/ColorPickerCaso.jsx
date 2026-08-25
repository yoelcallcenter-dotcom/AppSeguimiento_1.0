import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const COLOR_PALETTE = [
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F43F5E",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#8B8B8B",
  "#6B7280",
  "#4B5563",
];

export function ColorPickerCaso({ estado, color, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(color || "#6B7280");
  const [customColor, setCustomColor] = useState(color || "#6B7280");
  const pickerRef = useRef(null);

  useEffect(() => {
    setSelectedColor(color || "#6B7280");
    setCustomColor(color || "#6B7280");
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (newColor) => {
    setSelectedColor(newColor);
    setCustomColor(newColor);
    onChange(newColor);
    setIsOpen(false);
  };

  const handleCustomChange = (e) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    setSelectedColor(newColor);
    onChange(newColor);
  };

  const defaultColors = {
    "Cita virtual": "#3B82F6",
    "Cita presencial": "#6366F1",
    "No responde": "#F59E0B",
    "Lo piensa": "#FCD34D",
    Reprogramado: "#F97316",
    "2do Llamado": "#F97316",
    "Tiene Abogado": "#8B5CF6",
    "No le interesa": "#EF4444",
    "No viable": "#DC2626",
    Incontactable: "#E11D48",
    Pendiente: "#10B981",
    Firmo: "#059669",
    "Sin reporte": "#6B7280",
  };

  const handleReset = () => {
    const defaultColor = defaultColors[estado] || "#6B7280";
    setSelectedColor(defaultColor);
    setCustomColor(defaultColor);
    onChange(defaultColor);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium transition-all hover:opacity-80"
        style={{
          backgroundColor: selectedColor + "22",
          color: selectedColor,
          border: `1px solid ${selectedColor}44`,
        }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: selectedColor }}
        />
        <span className="truncate max-w-[80px]">{estado}</span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-50 p-3 rounded-lg shadow-xl w-64"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              {estado}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleReset}
                className="px-2 py-0.5 text-[10px] rounded transition-colors hover:opacity-70"
                style={{
                  backgroundColor: "var(--color-surface2)",
                  color: "var(--color-text-muted)",
                }}
              >
                Restaurar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => handleSelect(c)}
                className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: selectedColor === c ? "#FFFFFF" : "transparent",
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className="text-[10px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Personalizado:
            </span>
            <input
              type="color"
              value={customColor}
              onChange={handleCustomChange}
              className="w-7 h-7 rounded cursor-pointer border-0 p-0"
              style={{ backgroundColor: "transparent" }}
            />
            <input
              type="text"
              value={customColor}
              onChange={handleCustomChange}
              className="flex-1 px-2 py-0.5 text-xs rounded"
              style={{
                backgroundColor: "var(--color-surface2)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>

          <div
            className="mt-2 pt-2 text-[10px]"
            style={{
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            Color actual: {selectedColor}
          </div>
        </div>
      )}
    </div>
  );
}
