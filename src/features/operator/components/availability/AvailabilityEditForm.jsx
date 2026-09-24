import React, { useState } from "react";
import { Btn } from "../../../../components/common/Btn";
import { BtnOutline } from "../../../../components/common/BtnOutline";
import { Field } from "../../../../components/common/Field";
import { TextInput } from "../../../../components/common/TextInput";
import { TextArea } from "../../../../components/common/TextArea";
import { Select } from "../../../../components/common/Select";
import { TAB_META } from "./availabilityMeta";
import { ABSENCE_TYPES } from "../../operatorDefaults";

export function AvailabilityEditForm({ tab, editing, onCancel, onSave }) {
  const isRange = tab === "vacaciones";
  const isHoliday = tab === "feriados";
  const isAbsence = tab === "inasistencias";
  const isDayOff = tab === "dias";

  const [form, setForm] = useState(() => {
    const id = editing?.id || "nuevo";
    if (isRange) return { id, start: editing?.start || "", end: editing?.end || "", note: editing?.note || "" };
    if (isHoliday) return { id, name: editing?.name || "", date: editing?.date || "" };
    if (isAbsence) return { id, date: editing?.date || "", type: editing?.type || "personal", motivo: editing?.motivo || "" };
    return { id, date: editing?.date || "", note: editing?.note || "" };
  });

  if (!editing) return null;

  const submit = () => {
    if (isRange && !form.start) return;
    if ((isHoliday || isAbsence || isDayOff) && !form.date) return;
    const id = editing.id === "nuevo" ? Date.now().toString(36) + Math.random().toString(36).slice(2, 6) : editing.id;
    const base = { id };
    const payload = isRange
      ? { ...base, start: form.start, end: form.end || form.start, note: form.note || "" }
      : isHoliday
        ? { ...base, name: form.name || "", date: form.date }
        : isAbsence
          ? { ...base, date: form.date, type: form.type, motivo: form.motivo || "" }
          : { ...base, date: form.date, note: form.note || "" };
    onSave(payload);
  };

  const titulo = editing.id === "nuevo"
    ? `Agregar a ${TAB_META[tab].label.toLowerCase()}`
    : `Editar ${TAB_META[tab].label.toLowerCase()}`;

  return (
    <div
      className="p-3 rounded-md space-y-2 animate-fade-in"
      style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-accent)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{titulo}</div>
      {isHoliday && (
        <Field label="Nombre del feriado">
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Feriado nacional" />
        </Field>
      )}
      {isRange && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Desde">
            <TextInput type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </Field>
          <Field label="Hasta">
            <TextInput type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </Field>
        </div>
      )}
      {(isHoliday || isAbsence || isDayOff) && (
        <Field label="Fecha">
          <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
      )}
      {isAbsence && (
        <Field label="Tipo">
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={ABSENCE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>
      )}
      {(isRange || isAbsence || isDayOff) && (
        <Field label="Nota / motivo (opcional)">
          <TextArea rows={2} value={form.note || form.motivo || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Btn size="sm" onClick={submit}>Guardar</Btn>
        <BtnOutline size="sm" onClick={onCancel}>Cancelar</BtnOutline>
      </div>
    </div>
  );
}

export default AvailabilityEditForm;