import React, { useState, useCallback } from "react";

const VARIANT_CLASSES = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  accent: "btn-accent",
  "outline-accent": "btn-outline-accent",
  outline: "btn-outline",
  solid: "btn-accent",
  positive: "btn-positive",
  contextual: "btn-contextual",
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
  textColor = "var(--color-text-on-accent)",
  size = "md",
  icon: Icon,
  className = "",
  disabled = false,
  loading = false,
  variant = "solid",
  ariaLabel = "",
  style = {},
  ...props
}) {
  const [successFlash, setSuccessFlash] = useState(false);

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

  const handleClick = useCallback(
    (e) => {
      if (loading || disabled) return;
      const result = onClick?.(e);
      if (result && typeof result.then === "function") {
        result.then(() => {
          setSuccessFlash(true);
          setTimeout(() => setSuccessFlash(false), 600);
        }).catch(() => {});
      }
    },
    [onClick, loading, disabled]
  );

  const stateClass = loading
    ? "btn-loading"
    : successFlash
    ? "btn-success-flash"
    : "";

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`btn-base animate-press ${!color ? variantClass : ""} ${sizeClass} ${stateClass} ${className}`}
      style={{ ...inlineColor, ...style }}
      aria-label={ariaLabel || (typeof children === "string" ? children : "")}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* C02c (1.10.1): antes el icono se DESMONTABA con `!loading` y el
          spinner lo dibujaba el CSS ::after sobre `color: transparent` —
          el ancho saltaba ~20px al empezar la carga y en los Btn con prop
          `color` (sin variantClass) el spinner salía invisible (las únicas
          reglas blancas eran para btn-primary/danger/accent). Ahora el
          icono permanece, el label solo queda oculto con `visibility`
          (conserva el ancho) y el spinner es un overlay centrado que
          hereda el color real del botón. */}
      {Icon && (
        <Icon
          size={size === "sm" ? 14 : size === "md" ? 16 : 18}
          className="flex-shrink-0"
        />
      )}
      <span className={loading ? "truncate btn-loading-label" : "truncate"}>
        {children}
      </span>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
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
