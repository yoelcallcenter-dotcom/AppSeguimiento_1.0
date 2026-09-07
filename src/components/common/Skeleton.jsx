import React from "react";

/**
 * Skeleton (Patrón de loading unificado, 1.6.2)
 * Placeholder de carga con el shimmer estandarizado (.animate-skeleton).
 * Variants: text, avatar, circle, card, list, table, button.
 */

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className = "",
  style = {},
}) {
  const base = "animate-skeleton";

  const variantStyle = () => {
    switch (variant) {
      case "avatar":
        return { width: width || 40, height: height || 40, borderRadius: "50%" };
      case "circle":
        return { width: width || 24, height: height || 24, borderRadius: "50%" };
      case "button":
        return { width: width || 120, height: height || 32 };
      case "card":
        return { width: width || "100%", height: height || 120 };
      case "table":
        return { width: width || "100%", height: height || 16 };
      case "list":
        return { width: width || "100%", height: height || 14 };
      default:
        return { width: width || "100%", height: height || 14 };
    }
  };

  const style_variant = variantStyle();

  if (variant === "list") {
    return (
      <div
        className={`space-y-2 ${className}`}
        style={{ width: style_variant.width, ...style }}
        aria-hidden="true"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={base}
            style={{
              width: i === lines - 1 && lines > 1 ? "60%" : "100%",
              height: style_variant.height,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`animate-skeleton rounded-lg ${className}`}
        style={{ ...style_variant, ...style }}
        aria-hidden="true"
      >
        <div className="flex h-full w-full flex-col justify-between p-3 opacity-90">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={base}
              style={{
                width: i === 0 ? "70%" : i === lines - 1 ? "40%" : "90%",
                height: 12,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${base} ${className}`}
      style={{ ...style_variant, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonText: bloque de líneas de texto para sustituir un párrafo.
 */
export function SkeletonText({
  lines = 3,
  className = "",
  style = {},
}) {
  return (
    <div className={`space-y-2 ${className}`} style={style} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-skeleton"
          style={{
            width: i === lines - 1 ? "55%" : "100%",
            height: 13,
          }}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonTable: simula una tabla de filas y columnas.
 */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = "",
  style = {},
}) {
  return (
    <div className={className} style={style} aria-hidden="true">
      <div className="mb-2 flex gap-3">
        {Array.from({ length: cols }).map((_, j) => (
          <div
            key={j}
            className="animate-skeleton"
            style={{ width: `${100 / cols}%`, height: 16, opacity: 0.6 }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 py-1.5">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="animate-skeleton"
              style={{
                width: `${100 / cols}%`,
                height: 14,
                opacity: j === 0 ? 0.9 : 0.55,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
