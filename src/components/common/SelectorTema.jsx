import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function SelectorTema({ className = "" }) {
  const theme = useTheme();

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <button
        onClick={() => theme.changeTheme("dark")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80 ${
          theme.isDark
            ? "bg-[var(--color-accent)] text-[#14181F]"
            : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
        }`}
        aria-label="Tema oscuro"
      >
        <Moon size={14} />
        <span className="hidden sm:inline">Oscuro</span>
      </button>
      <button
        onClick={() => theme.changeTheme("light")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80 ${
          theme.isLight
            ? "bg-[var(--color-accent)] text-[#14181F]"
            : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
        }`}
        aria-label="Tema claro"
      >
        <Sun size={14} />
        <span className="hidden sm:inline">Claro</span>
      </button>
    </div>
  );
}
