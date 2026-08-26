import React, { useState } from "react";
import { CalendarDays, Sun, Flag, Stethoscope, CalendarOff, Plus, Trash2, Pencil, CalendarClock, CalendarPlus } from "lucide-react";
import { Btn } from "../../../components/common/Btn";
import { BtnOutline } from "../../../components/common/BtnOutline";
import { Field } from "../../../components/common/Field";
import { TextInput } from "../../../components/common/TextInput";
import { TextArea } from "../../../components/common/TextArea";
import { Select } from "../../../components/common/Select";
import { ABSENCE_TYPES } from "../operatorDefaults";
import { formatearFechaLarga } from "../operatorFormat";

const TAB_META = {
  vacaciones: { label: "Vacaciones", icon: Sun, empty: "Sin períodos de vacaciones cargados." },
  feriados: { label: "Feriados", icon: Flag, empty: "Sin feriados cargados." },
  inasistencias: { label: "Inasistencias", icon: Stethoscope, empty: "Sin inasistencias cargadas." },
  dias: { label: "Días no laborables", icon: CalendarOff, empty: "Sin días no laborables cargados." },
};

function itemTitle(tab, item) {
  if (tab === "vacaciones") return "Vacaciones";
  if (tab === "feriados") return item.name || "Feriado";
  if (tab === "inasistencias") return ABSENCE_TYPES.find((t) => t.value === item.type)?.label || "Otro";
  return "Día no laborable";
}

function itemSubtitle(tab, item) {
  return tab === "vacaciones"
    ? `${formatearFechaLarga(item.start)} — ${formatearFechaLarga(item.end)}`
    : formatearFechaLarga(item.date);
}

export function AvailabilityCard({ availability, updateAvailability, showToast }) {
  const [tab, setTab] = useState("vacaciones");
  const [editing, setEditing] = useState(null);

  const list = {
    vacaciones: availability.vacations || [],
    feriados: availability.holidays || [],
    inasistencias: availability.absences || [],
    dias: availability.customDaysOff || [],
  }[tab];

  const setList = (key, newList) => {
    const patch = {};
    if (key === "vacaciones") patch.vacations = newList;
    if (key === "feriados") patch.holidays = newList;
    if (key === "inasistencias") patch.absences = newList;
    if (key === "dias") patch.customDaysOff = newList;
    updateAvailability(patch);
  };

  const removeItem = (id) => {
    setList(tab, list.filter((i) => i.id !== id));
    showToast("Eliminado", "info");
  };

  // Próximos períodos/días a futuro, entre todas las categorías.
  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = [
    ...(availability.vacations || []).map((v) => ({ tab: "vacaciones", date: v.start, end: v.end, label: `Vacaciones hasta el ${formatearFechaLarga(v.end)}`, item: v })),
    ...(availability.holidays || []).map((h) => ({ tab: "feriados", date: h.date, label: h.name || "Feriado", item: h })),
    ...(availability.absences || []).map((a) => ({ tab: "inasistencias", date: a.date, label: ABSENCE_TYPES.find((t) => t.value === a.type)?.label || "Ausencia", item: a })),
    ...(availability.customDaysOff || []).map((d) => ({ tab: "dias", date: d.date, label: d.note || "Día no laborable", item: d })),
  ]
    .filter((e) => e.date && e.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const startNew = () => setEditing({ id: "nuevo" });

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <CalendarDays size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Mi disponibilidad</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
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

      <div className="flex flex-wrap gap-1 mb-3">
        {Object.entries(TAB_META).map(([key, meta]) => {
          const count = {
            vacaciones: availability.vacations || [],
            feriados: availability.holidays || [],
            inasistencias: availability.absences || [],
            dias: availability.customDaysOff || [],
          }[key].length;
          const Icon = meta.icon;
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => { setTab(key); setEditing(null); }}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                active
                  ? "bg-[var(--color-accent)22] text-[var(--color-accent)] border border-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] border border-[var(--color-border)] hover:opacity-80"
              }`}
              aria-pressed={active}
            >
              <Icon size={12} />
              {meta.label}
              <span
                className="ml-0.5 px-1.5 rounded-full text-[9px] font-bold"
                style={{
                  backgroundColor: active ? "var(--color-accent)" : "var(--color-surface2)",
                  color: active ? "#14181F" : "var(--color-text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Columna izquierda: resumen del estado o formulario de edición */}
        <div className="space-y-2">
          {editing ? (
            <EditForm
              key={editing ? `${tab}-${editing.id}` : tab}
              tab={tab}
              editing={editing}
              onCancel={() => setEditing(null)}
              onSave={(item) => {
                const exists = list.some((i) => i.id === item.id);
                setList(tab, exists ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list]);
                setEditing(null);
                showToast("Guardado", "success");
              }}
            />
          ) : upcoming.length > 0 ? (
            <div
              className="p-3 rounded-md"
              style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-accent)44" }}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold mb-2" style={{ color: "var(--color-accent)" }}>
                <CalendarClock size={13} /> Tu estado próximo
              </div>
              <div className="space-y-1.5">
                {upcoming.map((e, i) => {
                  const Meta = TAB_META[e.tab];
                  const Icon = Meta.icon;
                  return (
                    <button
                      key={`${e.tab}-${e.item.id}-${i}`}
                      onClick={() => setTab(e.tab)}
                      className="w-full flex items-center gap-2 p-1.5 rounded text-left transition-colors hover:bg-white/5"
                      title={`Ir a ${Meta.label.toLowerCase()}`}
                    >
                      <Icon size={12} className="flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      <span className="text-[11px] font-semibold truncate" style={{ color: "var(--color-text)" }}>{e.label}</span>
                      <span className="ml-auto text-[10px] whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                        desde {formatearFechaLarga(e.date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="p-4 rounded-md text-center"
              style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)" }}
            >
              <div className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
                Disponibilidad al día
              </div>
              <div className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
                No hay vacaciones, feriados, ausencias ni días libres a futuro.
              </div>
              <BtnOutline size="sm" onClick={startNew}>
                <CalendarPlus size={14} /> Registrar primera entrada
              </BtnOutline>
            </div>
          )}
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {list.length} registro{list.length !== 1 ? "s" : ""} en {TAB_META[tab].label.toLowerCase()}.
          </div>
        </div>

        {/* Columna derecha: lista completa de la categoría activa */}
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
          {list.length === 0 && (
            <div
              className="text-center py-8 px-3 rounded-md text-xs"
              style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)", color: "var(--color-text-muted)" }}
            >
              {TAB_META[tab].empty}
            </div>
          )}
          {list.map((item) => {
            const tabMeta = TAB_META[tab];
            const isActive = item.end ? (item.end >= todayISO) : (item.date >= todayISO);
            return (
              <div
                key={item.id}
                className={`flex items-start gap-1.5 p-2.5 rounded-md transition-shadow transition-opacity ${isActive ? "ring-1" : "opacity-60"}`}
                style={{
                  backgroundColor: isActive ? "var(--color-surface2)" : "var(--color-surface)",
                  border: isActive ? `1px solid ${tab === 'vacaciones' ? 'var(--color-accent)' : tab === 'feriados' ? '#F59E0B' : tab === 'inasistencias' ? '#EF4444' : 'var(--color-text-muted)'}44` : "1px solid var(--color-border)",
                  ringColor: isActive ? (tab === 'vacaciones' ? 'var(--color-accent)' : tab === 'feriados' ? '#F59E0B' : tab === 'inasistencias' ? '#EF4444' : 'var(--color-text-muted)') : 'transparent',
                }}
              >
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isActive
                      ? (tab === 'vacaciones' ? 'var(--color-accent)' : tab === 'feriados' ? '#F59E0B' : tab === 'inasistencias' ? '#EF4444' : 'var(--color-text-muted)')
                      : 'var(--color-border)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                      {itemTitle(tab, item)}
                    </span>
                    {isActive && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (tab === 'vacaciones' ? 'var(--color-accent)' : tab === 'feriados' ? '#F59E0B' : tab === 'inasistencias' ? '#EF4444' : 'var(--color-text-muted)') + '22',
                          color: (tab === 'vacaciones' ? 'var(--color-accent)' : tab === 'feriados' ? '#F59E0B' : tab === 'inasistencias' ? '#EF4444' : 'var(--color-text-muted)'),
                        }}
                      >
                        {tab === 'vacaciones' ? 'FUERA' : tab === 'feriados' ? 'FERIADO' : tab === 'inasistencias' ? 'AUSENTE' : 'NO LAB.'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {itemSubtitle(tab, item)}
                  </div>
                  {(item.note || item.motivo) && (
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                      {item.note || item.motivo}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditing({ ...item })}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-text-muted)" }}
                  aria-label="Editar registro"
                  title="Editar registro"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-danger)" }}
                  aria-label="Eliminar registro"
                  title="Eliminar registro"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditForm({ tab, editing, onCancel, onSave }) {
  const isRange = tab === "vacaciones";
  const isHoliday = tab === "feriados";
  const isAbsence = tab === "inasistencias";
  const isDayOff = tab === "dias";

  const [form, setForm] = useState(() => {
    if (isRange) return { id: editing?.id === "nuevo" ? "nuevo" : editing?.id || "nuevo", start: editing?.start || "", end: editing?.end || "", note: editing?.note || "" };
    if (isHoliday) return { id: editing?.id === "nuevo" ? "nuevo" : editing?.id || "nuevo", name: editing?.name || "", date: editing?.date || "" };
    if (isAbsence) return { id: editing?.id === "nuevo" ? "nuevo" : editing?.id || "nuevo", date: editing?.date || "", type: editing?.type || "personal", motivo: editing?.motivo || "" };
    return { id: editing?.id === "nuevo" ? "nuevo" : editing?.id || "nuevo", date: editing?.date || "", note: editing?.note || "" };
  });

  if (!editing) return null;

  const submit = () => {
    if (isRange && !form.start) return;
    if ((isHoliday || isAbsence || isDayOff) && !form.date) return;
    const id = editing?.id === "nuevo" ? Date.now().toString(36) + Math.random().toString(36).slice(2, 6) : editing?.id;
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

export default AvailabilityCard;
