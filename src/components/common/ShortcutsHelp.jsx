import React, { useRef } from "react";
import { Keyboard, X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";

const SHORTCUTS = [
  { keys: ["Ctrl", "N"], label: "Nuevo caso" },
  { keys: ["Ctrl", "R"], label: "Cargar reporte" },
  { keys: ["Ctrl", "F"], label: "Buscar casos" },
  { keys: ["Ctrl", "S"], label: "Guardar datos" },
  { keys: ["Ctrl", "D"], label: "Duplicar caso" },
  { keys: ["Ctrl", "E"], label: "Exportar seleccionados" },
  { keys: ["Ctrl", "H"], label: "Este panel de ayuda" },
  { keys: ["Ctrl", "K"], label: "Busqueda global" },
  { keys: ["Ctrl", "1-5"], label: "Cambiar vista" },
  { keys: ["Esc"], label: "Cerrar modal" },
  { keys: ["Supr"], label: "Eliminar caso" },
];

function KeyCap({ children }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded text-[10px] font-bold"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text)",
        boxShadow: "0 1px 0 var(--color-border)",
      }}
    >
      {children}
    </span>
  );
}

export function ShortcutsHelp({ open, onClose }) {
  const dialogRef = useRef(null);
  useDialogA11y(dialogRef, open);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-5"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard size={18} style={{ color: "var(--color-accent)" }} />
            <div
              id="shortcuts-title"
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Atajos de teclado
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1"
              style={{ borderBottom: i < SHORTCUTS.length - 1 ? "1px solid var(--color-border)" : "none" }}
            >
              <span className="text-xs" style={{ color: "var(--color-text)" }}>{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>+</span>}
                    <KeyCap>{k}</KeyCap>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            Presiona <KeyCap>?</KeyCap> o <KeyCap>Ctrl</KeyCap>+<KeyCap>/</KeyCap> para abrir
          </span>
        </div>
      </div>
    </div>
  );
}
