import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const STORAGE_PREFIX = "app.sh.";

function readCollapsed(storageKey) {
  if (!storageKey || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + storageKey) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(storageKey, collapsed) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + storageKey, collapsed ? "1" : "0");
  } catch {
    /* localStorage no disponible: el estado vive solo en memoria */
  }
}

export function SectionHeader({ icon: Icon, titulo, descripcion, storageKey, overlayCollapsed = false, style }) {
  const [open, setOpen] = useState(() => !readCollapsed(storageKey));
  const collapsible = Boolean(storageKey);
  const overlay = !open && collapsible && overlayCollapsed;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeCollapsed(storageKey, !next);
  };

  return (
    <div
      className={
        open
          ? "flex items-start gap-3 rounded-lg px-4 py-3 mb-4"
          : overlay
            ? "relative h-0 m-0"
            : "flex items-center justify-end gap-3 rounded-lg mb-2"
      }
      style={
        open
          ? {
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderLeft: "3px solid var(--color-accent)",
              ...style,
            }
          : style
      }
    >
      {open && (
        <>
          <div
            className="flex items-center justify-center flex-shrink-0 rounded-md"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)", width: 32, height: 32 }}
          >
            {Icon && <Icon size={16} style={{ color: "var(--color-accent)" }} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {titulo}
            </div>
            {descripcion && (
              <div className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--color-text-muted)" }}>
                {descripcion}
              </div>
            )}
          </div>
        </>
      )}
      {collapsible && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? `Contraer ${titulo}` : `Expandir ${titulo}`}
          title={open ? "Contraer" : "Expandir"}
          className={
            overlay
              ? "absolute right-0 top-7 z-10 p-1 rounded hover:opacity-70 transition-opacity"
              : "p-1 rounded self-center hover:opacity-70 transition-opacity flex-shrink-0"
          }
          style={{ color: "var(--color-text-muted)", cursor: "pointer" }}
        >
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      )}
    </div>
  );
}

export function ConfigSectionTitle({ children, icon: Icon, style, className = "", ...rest }) {
  return (
    <div
      className={`config-section-title flex items-center gap-2 ${className}`.trim()}
      style={{ ...{ color: "var(--color-text-muted)" }, ...style }}
      {...rest}
    >
      {Icon && <Icon size={14} color="var(--color-accent)" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}

export function ConfigSection({ children, style, ...rest }) {
  return (
    <div className="config-section" style={style} {...rest}>
      {children}
    </div>
  );
}

export function ConfigRow({ label, desc, control, alignTop = false, style }) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        padding: "0.5rem 0",
        borderBottom: "1px solid var(--color-border)",
        alignItems: alignTop ? "flex-start" : "center",
        ...style,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          {label}
        </div>
        {desc && (
          <div className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {desc}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

export function ConfigField({ label, desc, children, style }) {
  return (
    <div className="space-y-1" style={style}>
      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
        {label}
      </div>
      {desc && (
        <div className="text-[11px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
          {desc}
        </div>
      )}
      {children}
    </div>
  );
}

export function ConfigGrid({ columns = 2, children, style }) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ConfigTip({ title = "Sugerencias", children, style }) {
  return (
    <div
      className="config-tip"
      style={{
        borderRadius: "var(--border-radius)",
        padding: "0.75rem",
        backgroundColor: "color-mix(in srgb, var(--color-accent) 5.1%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
        borderLeft: "3px solid var(--color-accent)",
        ...style,
      }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-accent)" }}>
        {title}
      </div>
      <div className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        {children}
      </div>
    </div>
  );
}

export function ConfigDivider({ style }) {
  return <div style={{ height: 1, backgroundColor: "var(--color-border)", margin: "0.5rem 0", ...style }} />;
}