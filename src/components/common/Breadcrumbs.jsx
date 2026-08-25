import React from "react";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs({ path }) {
  if (!path || path.length === 0) return null;

  const items = [{ label: "Inicio", view: "kanban" }, ...path];

  return (
    <div
      className="flex items-center gap-1.5 text-xs flex-wrap"
      style={{ color: "var(--color-text-muted)" }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight
              size={12}
              style={{ color: "var(--color-text-muted)" }}
            />
          )}
          <span
            className={index === items.length - 1 ? "font-semibold" : ""}
            style={{
              color:
                index === items.length - 1
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
              cursor: index < items.length - 1 ? "pointer" : "default",
            }}
            onClick={() => {
              if (index < items.length - 1 && item.onClick) {
                item.onClick();
              }
            }}
          >
            {item.icon && <item.icon size={12} className="inline mr-1" />}
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
