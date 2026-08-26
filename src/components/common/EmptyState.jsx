import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  message = "Sin datos",
  submessage,
  ctaLabel,
  onCta,
  size = "md",
  className = "",
}) {
  const iconSize = size === "sm" ? 24 : size === "lg" ? 48 : 36;
  const padding = size === "sm" ? "py-4" : size === "lg" ? "py-10" : "py-6";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${padding} animate-fade-in ${className}`}
    >
      <Icon
        size={iconSize}
        className="mb-2"
        style={{ color: "var(--color-text-muted)", opacity: 0.35 }}
      />
      <div
        className={`${size === "sm" ? "text-xs" : "text-sm"} font-medium`}
        style={{ color: "var(--color-text-muted)" }}
      >
        {message}
      </div>
      {submessage && (
        <div
          className={`${size === "sm" ? "text-[10px]" : "text-xs"} mt-1`}
          style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
        >
          {submessage}
        </div>
      )}
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="btn-base btn-accent btn-sm mt-3"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
