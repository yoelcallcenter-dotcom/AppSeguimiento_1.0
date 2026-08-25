import React, { useState } from "react";
import { UserCircle2, Save } from "lucide-react";
import { Btn } from "../../../components/common/Btn";
import { Field } from "../../../components/common/Field";
import { TextInput } from "../../../components/common/TextInput";
import { Select } from "../../../components/common/Select";
import { DAY_LABELS } from "../operatorDefaults";
import { initialsFromName } from "../operatorStore";

export function ProfileCard({ profile, updateProfile, showToast }) {
  const [form, setForm] = useState({
    fullName: profile.fullName || "",
    displayName: profile.displayName || "",
    workStart: profile.workSchedule?.start || "09:00",
    workEnd: profile.workSchedule?.end || "17:00",
    workingDays: profile.workingDays || [1, 2, 3, 4, 5],
  });

  const toggleDay = (d) => {
    setForm((f) => {
      const has = f.workingDays.includes(d);
      return {
        ...f,
        workingDays: has ? f.workingDays.filter((x) => x !== d) : [...f.workingDays, d].sort(),
      };
    });
  };

  const save = () => {
    const fullName = form.fullName.trim();
    const initials = fullName ? initialsFromName(fullName) : profile.initials || "";
    updateProfile({
      fullName,
      displayName: form.displayName.trim(),
      initials,
      workSchedule: { start: form.workStart, end: form.workEnd },
      workingDays: form.workingDays.length ? form.workingDays : [1, 2, 3, 4, 5],
    });
    showToast("Perfil actualizado", "success");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <UserCircle2 size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Mi perfil</span>
        </div>
        <div className="space-y-3">
          <Field label="Nombre completo">
            <TextInput
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ej: Yoel Yañez"
            />
          </Field>
          <Field label="Nombre corto (opcional)">
            <TextInput
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Ej: Yoel"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Entrada habitual">
              <TextInput
                type="time"
                value={form.workStart}
                onChange={(e) => setForm({ ...form, workStart: e.target.value })}
              />
            </Field>
            <Field label="Salida habitual">
              <TextInput
                type="time"
                value={form.workEnd}
                onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
              />
            </Field>
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>Días habituales de trabajo</div>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const active = form.workingDays.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors"
                    style={{
                      backgroundColor: active ? "var(--color-accent)22" : "var(--color-surface2)",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {profile.initials && (
            <div
              className="flex items-center justify-center rounded-full text-sm font-bold"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#14181F",
                width: "40px",
                height: "40px",
              }}
            >
              {profile.initials}
            </div>
          )}
          <Btn onClick={save} icon={Save}>Guardar perfil</Btn>
        </div>
      </div>

      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Resumen</div>
        <div className="space-y-2 text-xs" style={{ color: "var(--color-text)" }}>
          <div><span style={{ color: "var(--color-text-muted)" }}>Nombre: </span>{profile.fullName || "—"}</div>
          <div><span style={{ color: "var(--color-text-muted)" }}>Horario: </span>{profile.workSchedule?.start || "—"} — {profile.workSchedule?.end || "—"}</div>
          <div>
            <span style={{ color: "var(--color-text-muted)" }}>Jornada: </span>
            {(profile.workingDays || []).map((d) => DAY_LABELS[d]).join(", ") || "—"}
          </div>
          <div className="pt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            La app usa estos datos para personalizar los mensajes de bienvenida,
            el estado de la jornada y el cálculo de días laborables efectivos.
          </div>
        </div>
      </div>
    </div>
  );
}