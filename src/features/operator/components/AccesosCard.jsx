import React from "react";
import { KeyRound, ArrowRight, Lock } from "lucide-react";

export function AccesosCard({ credentials, onNavigateAccesos }) {
  const entries = credentials?.entries || [];
  const visible = entries.slice(0, 4);
  const extra = entries.length - visible.length;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <KeyRound size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Accesos personales ({entries.length})
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Sin accesos guardados todavía.
        </div>
      ) : (
        <div className="space-y-1">
          {visible.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
              style={{ backgroundColor: "var(--color-surface2)" }}
            >
              <Lock size={11} className="flex-shrink-0" style={{ color: "var(--color-text-muted)" }} aria-hidden="true" />
              <span className="font-medium truncate flex-1" style={{ color: "var(--color-text)" }}>
                {e.service || "Servicio sin nombre"}
              </span>
              <span className="text-[10px] truncate max-w-[140px]" style={{ color: "var(--color-text-muted)" }}>
                {e.user || "—"}
              </span>
            </div>
          ))}
          {extra > 0 && (
            <div className="text-[10px] px-2" style={{ color: "var(--color-text-muted)" }}>
              +{extra} más
            </div>
          )}
        </div>
      )}

      {onNavigateAccesos && (
        <button
          type="button"
          onClick={onNavigateAccesos}
          className="mt-2 flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--color-accent)" }}
        >
          Gestionar accesos <ArrowRight size={11} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default AccesosCard;