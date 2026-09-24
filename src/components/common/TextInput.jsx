import React, { forwardRef } from "react";

export const TextInput = forwardRef(function TextInput(
  {
    value,
    onChange,
    placeholder = "",
    type = "text",
    className = "",
    style = {},
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input-optimized ${className}`}
      style={style}
      {...props}
    />
  );
});

export default TextInput;
