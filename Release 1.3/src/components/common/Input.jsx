import React from "react";

export function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  className = "",
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
        className="input-optimized focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        style={style}
        {...props}
      />
    </div>
  );
}

export default Input;
