import React, { useId } from "react";

export function Field({ label, children, className = "", id }) {
  // Optimización 1.6.7: asocia el <label> con su control mediante htmlFor/id,
  // generando un id único automáticamente (o usando el `id` explícito si se pasa).
  const generatedId = useId();
  const fieldId = id || generatedId;

  let control = children;
  if (React.isValidElement(control) && !control.props.id) {
    control = React.cloneElement(control, { id: fieldId });
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </label>
      )}
      {control}
    </div>
  );
}

export default Field;
