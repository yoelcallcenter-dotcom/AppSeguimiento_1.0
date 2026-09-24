import React from "react";
import { CalendarDays, Plus } from "lucide-react";
import { BtnOutline } from "../../../../components/common/BtnOutline";
import { AvailabilityMonthStrip } from "./AvailabilityMonthStrip";

export function AvailabilityHeader({ availability, editing, startNew }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <CalendarDays size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Mi disponibilidad</span>
        <span
          className="pill-sm"
          style={{ backgroundColor: "var(--color-surface2)", color: "var(--color-text-muted)" }}
          title="Los datos de disponibilidad no salen de este dispositivo"
        >
          Solo en este dispositivo
        </span>
        {!editing && (
          <BtnOutline size="sm" onClick={startNew} className="ml-auto">
            <Plus size={12} /> Agregar
          </BtnOutline>
        )}
      </div>
      <AvailabilityMonthStrip availability={availability} />
    </>
  );
}

export default AvailabilityHeader;