import React from "react";

export function TextInput({
  value,
  onChange,
  placeholder = "",
  type = "text",
  className = "",
  style = {},
  ...props
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input-optimized ${className}`}
      style={style}
      {...props}
    />
  );
}

export default TextInput;
