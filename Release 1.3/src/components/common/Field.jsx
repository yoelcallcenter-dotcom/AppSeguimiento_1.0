import React from "react";

export function Field({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

export default Field;
