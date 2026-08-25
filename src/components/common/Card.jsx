import React from "react";

const CARD_VARIANTS = {
  default: {
    className: "",
    style: {
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
    },
  },
  elevated: {
    className: "",
    style: {
      backgroundColor: "var(--color-surface2)",
      border: "1px solid var(--color-border)",
      boxShadow: "var(--shadow-md)",
    },
  },
  bordered: {
    className: "",
    style: {
      backgroundColor: "var(--color-surface)",
      border: "1.5px solid var(--color-border-light)",
    },
  },
  ghost: {
    className: "",
    style: {
      backgroundColor: "transparent",
      border: "none",
    },
  },
};

export function Card({
  children,
  title,
  icon: Icon,
  className = "",
  style = {},
  variant = "default",
}) {
  const v = CARD_VARIANTS[variant] || CARD_VARIANTS.default;

  return (
    <div
      className={`rounded-lg p-4 ${v.className} ${className}`}
      style={{ ...v.style, ...style }}
    >
      {title && (
        <div
          className="flex items-center gap-2 mb-3"
          style={{ color: "var(--color-text)" }}
        >
          {Icon && <span style={{ color: "var(--color-accent)" }}>{Icon}</span>}
          <span className="text-sm font-semibold">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
