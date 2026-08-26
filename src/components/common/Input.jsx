import React from "react";

export function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  className = "",
  error,
  style = {},
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          className="text-xs font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-optimized ${error ? "input-error" : ""}`}
        style={style}
        {...props}
      />
      {error && (
        <span className="text-xs animate-fade-in" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export default Input;
