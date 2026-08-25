import React from "react";

const VARIANT_CLASSES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  accent: "btn-accent",
  "outline-accent": "btn-outline-accent",
  outline: "btn-outline",
  solid: "btn-accent",
};

const SIZE_CLASSES = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

export function Btn({
  children,
  onClick,
  color,
  textColor = "#14181F",
  size = "md",
  icon: Icon,
  className = "",
  disabled = false,
  variant = "solid",
  ariaLabel = "",
  style = {},
  ...props
}) {
  const variantClass = VARIANT_CLASSES[variant] || "btn-accent";
  const sizeClass = SIZE_CLASSES[size] || "btn-md";

  const inlineColor = color
    ? variant === "solid" || variant === "accent"
      ? { backgroundColor: color, color: textColor, border: "none" }
      : variant === "outline" || variant === "outline-accent"
      ? { backgroundColor: "transparent", color, border: `1.5px solid ${color}` }
      : variant === "ghost"
      ? { backgroundColor: "transparent", color, border: "none" }
      : {}
    : {};

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-base animate-press ${!color ? variantClass : ""} ${sizeClass} ${className}`}
      style={{ ...inlineColor, ...style }}
      aria-label={ariaLabel || (typeof children === "string" ? children : "")}
      {...props}
    >
      {Icon && (
        <Icon
          size={size === "sm" ? 14 : size === "md" ? 16 : 18}
          className="flex-shrink-0"
        />
      )}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function PrimaryButton(props) {
  return <Btn variant="primary" {...props} />;
}

export function SecondaryButton(props) {
  return <Btn variant="secondary" {...props} />;
}

export function OutlineButton(props) {
  return <Btn variant="outline-accent" {...props} />;
}

export default Btn;
