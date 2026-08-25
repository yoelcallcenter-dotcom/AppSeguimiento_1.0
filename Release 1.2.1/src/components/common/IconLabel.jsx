import React from "react";

export function IconLabel({
  icon: Icon,
  children,
  color = "var(--color-text-muted)",
  strong = false,
}) {
  if (!children) return null;

  return (
    <div
      className="flex items-center gap-1 text-[11px]"
      style={{
        color,
        fontWeight: strong ? 600 : 400,
      }}
    >
      <Icon size={10} className="flex-shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

export const IconLabelMemo = React.memo(IconLabel);
