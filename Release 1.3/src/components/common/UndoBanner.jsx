import React, { useEffect, useRef } from "react";
import { Undo2 } from "lucide-react";

export function UndoBanner({ label, onUndo, onTimeout }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (onTimeout) onTimeout();
    }, 6000);
    return () => clearTimeout(timerRef.current);
  }, [label, onTimeout]);

  return (
    <div
      className="fixed bottom-5 right-5 z-[95] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border-light)",
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
        {label}
      </span>
      <button
        onClick={onUndo}
        className="flex items-center gap-1 text-xs font-bold rounded-md px-3 py-1.5 transition-opacity hover:opacity-80"
        style={{ backgroundColor: "var(--color-accent)", color: "#14181F" }}
      >
        <Undo2 size={13} />
        Deshacer
      </button>
    </div>
  );
}
