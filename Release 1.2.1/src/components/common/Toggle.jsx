import React from "react";

export function Toggle({
  checked,
  onChange,
  label,
  className = "",
  style = {},
  ...props
}) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      style={{ color: "var(--color-text)" }}
    >
      <div
        style={{
          position: "relative",
          width: "44px",
          height: "24px",
          flexShrink: 0,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            position: "absolute",
            opacity: 0,
            width: 0,
            height: 0,
          }}
          {...props}
        />
        <div
          style={{
            position: "absolute",
            cursor: "pointer",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: checked
              ? "var(--color-accent)"
              : "var(--color-border)",
            transition: "0.3s",
            borderRadius: "24px",
          }}
        />
        <div
          style={{
            position: "absolute",
            content: '""',
            height: "18px",
            width: "18px",
            left: checked ? "22px" : "3px",
            bottom: "3px",
            backgroundColor: "white",
            transition: "0.3s",
            borderRadius: "50%",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

export default Toggle;
