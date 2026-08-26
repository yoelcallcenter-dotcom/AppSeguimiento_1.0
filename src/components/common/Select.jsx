import React from "react";

export function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = "",
  className = "",
  style = {},
  ...props
}) {
  return (
    <div
      className={`flex flex-col gap-1 ${className}`}
      style={{ minWidth: "150px" }}
    >
      {label && (
        <label
          className="text-xs font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="input-optimized"
        style={{
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7385' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          paddingRight: "2rem",
          cursor: "pointer",
          ...style,
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;
