import React from "react";
import { Lightbulb, X, ArrowRight } from "lucide-react";

export function HintCard({ hint, onDismiss, onAction }) {
  return (
    <div
      className="rounded-xl p-4 relative group transition-all hover:shadow-md"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-accent)22" }}
        >
          <Lightbulb size={16} color="var(--color-accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--color-text)" }}>
            {hint.title}
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {hint.description}
          </div>
          {hint.action && (
            <button
              onClick={() => onAction?.(hint.action)}
              className="mt-2 flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-70"
              style={{ color: "var(--color-accent)" }}
            >
              {hint.action.label} <ArrowRight size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(hint.id)}
          className="p-1 rounded hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Descartar sugerencia"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
