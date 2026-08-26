import React, { useState } from "react";
import { Target, TrendingUp, CalendarDays, Plus, Trash2, CheckCircle2, CalendarRange } from "lucide-react";
import { Btn } from "../../../components/common/Btn";
import { BtnOutline } from "../../../components/common/BtnOutline";
import { Field } from "../../../components/common/Field";
import { TextInput } from "../../../components/common/TextInput";
import { Select } from "../../../components/common/Select";
import { Toggle } from "../../../components/common/Toggle";
import { getWeeklyGoalProgress } from "../operatorMetrics";

export function GoalsSection({ goals, updateGoals, daily, monthly, pace, effective, availabilitySummary, cases, availability, profile, perDay, showToast, showPace = true }) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ name: "", type: "casos", target: "", deadline: "" });

  const todayISO = new Date().toISOString().slice(0, 10);
  const weeklyProgress = getWeeklyGoalProgress(goals, cases, profile.workingDays, todayISO);

  const setDaily = (kind, patch) => {
    updateGoals({ daily: { ...goals.daily, [kind]: { ...goals.daily[kind], ...patch } } });
  };

  const setMonthly = (kind, patch) => {
    updateGoals({ monthly: { ...goals.monthly, [kind]: { ...goals.monthly[kind], ...patch } } });
  };

  const setWeekly = (kind, patch) => {
    updateGoals({ weekly: { ...goals.weekly, [kind]: { ...goals.weekly[kind], ...patch } } });
  };

  const addCustom = () => {
    if (!customForm.name.trim()) return;
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: customForm.name.trim(),
      type: customForm.type,
      target: customForm.target ? Number(customForm.target) : null,
      deadline: customForm.deadline || "",
      done: false,
    };
    updateGoals({ custom: [item, ...(goals.custom || [])] });
    setCustomForm({ name: "", type: "casos", target: "", deadline: "" });
    setShowCustomForm(false);
    showToast("Objetivo creado", "success");
  };

  const toggleCustomDone = (id) => {
    updateGoals({ custom: (goals.custom || []).map((g) => (g.id === id ? { ...g, done: !g.done } : g)) });
  };

  const removeCustom = (id) => {
    updateGoals({ custom: (goals.custom || []).filter((g) => g.id !== id) });
    showToast("Objetivo eliminado", "info");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* METAS DIARIAS */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Mis metas diarias</span>
        </div>
        <div className="space-y-3">
          <GoalRow
            label="Casos por día"
            enabled={daily.cases.enabled}
            target={daily.cases.target}
            current={daily.cases.current}
            percent={daily.cases.percent}
            met={daily.cases.met}
            onToggle={(v) => setDaily("cases", { enabled: v })}
            onTarget={(v) => setDaily("cases", { target: Number(v) || 0 })}
          />
          <GoalRow
            label="Reportes por día"
            enabled={daily.reports.enabled}
            target={daily.reports.target}
            current={daily.reports.current}
            percent={daily.reports.percent}
            met={daily.reports.met}
            onToggle={(v) => setDaily("reports", { enabled: v })}
            onTarget={(v) => setDaily("reports", { target: Number(v) || 0 })}
          />
          <GoalRow
            label="Firmas por día"
            enabled={daily.firmas.enabled}
            target={daily.firmas.target}
            current={daily.firmas.current}
            percent={daily.firmas.percent}
            met={daily.firmas.met}
            onToggle={(v) => setDaily("firmas", { enabled: v })}
            onTarget={(v) => setDaily("firmas", { target: Number(v) || 0 })}
          />
        </div>
      </div>

      {/* METAS SEMANALES */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Objetivos semanales</span>
        </div>
        <div className="space-y-3">
          <WeekGoalRow
            label="Casos por semana"
            g={(goals.weekly || {}).cases || {}}
            progress={weeklyProgress.goals.find((g) => g.key === "cases")}
            onToggle={(v) => setWeekly("cases", { enabled: v })}
            onTarget={(v) => setWeekly("cases", { target: Number(v) || 0 })}
          />
          <WeekGoalRow
            label="Reportes por semana"
            g={(goals.weekly || {}).reports || {}}
            progress={weeklyProgress.goals.find((g) => g.key === "reports")}
            onToggle={(v) => setWeekly("reports", { enabled: v })}
            onTarget={(v) => setWeekly("reports", { target: Number(v) || 0 })}
          />
          <WeekGoalRow
            label="Firmas por semana"
            g={(goals.weekly || {}).signed || {}}
            progress={weeklyProgress.goals.find((g) => g.key === "signed")}
            onToggle={(v) => setWeekly("signed", { enabled: v })}
            onTarget={(v) => setWeekly("signed", { target: Number(v) || 0 })}
          />
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Semana: {weeklyProgress.start} — {weeklyProgress.end}
        </div>
      </div>

      {/* METAS MENSUALES */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Objetivos mensuales</span>
        </div>
        <div className="space-y-3">
          <MonthGoalRow
            label="Casos mensuales"
            g={monthly.cases}
            pace={showPace ? pace?.cases : null}
            remainingDays={pace?.remainingDays}
            onToggle={(v) => setMonthly("cases", { enabled: v })}
            onTarget={(v) => setMonthly("cases", { target: Number(v) || 0 })}
          />
          <MonthGoalRow
            label="Reportes mensuales"
            g={monthly.reports}
            pace={showPace ? pace?.reports : null}
            remainingDays={pace?.remainingDays}
            onToggle={(v) => setMonthly("reports", { enabled: v })}
            onTarget={(v) => setMonthly("reports", { target: Number(v) || 0 })}
          />
          <MonthGoalRow
            label="Firmas mensuales"
            g={monthly.signed}
            pace={null}
            remainingDays={pace?.remainingDays}
            onToggle={(v) => setMonthly("signed", { enabled: v })}
            onTarget={(v) => setMonthly("signed", { target: Number(v) || 0 })}
          />
        </div>
      </div>

      {/* RENDIMIENTO AJUSTADO */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Mi rendimiento</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="Días trabajados" value={`${effective.effective} / ${effective.scheduled}`} />
          <Stat label="Días no trabajados" value={availabilitySummary.totalDays} />
          <Stat label="Casos por día efectivo" value={perDay.casesPerDay} />
          <Stat label="Reportes por día efectivo" value={perDay.reportsPerDay} />
        </div>
        <div className="mt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          <div>Vacaciones: {availabilitySummary.vacationDays} día(s) · Feriados: {availabilitySummary.holidayDays}</div>
          <div>Inasistencias: {availabilitySummary.absenceDays} · Días no laborables: {availabilitySummary.dayOffDays}</div>
          {availabilitySummary.absences.length > 0 && (
            <div className="pt-1">
              {availabilitySummary.absences.map((ab) => (
                <div key={ab.id} className="truncate" title={ab.motivo || undefined}>
                  {ab.motivo ? `• ${ab.motivo}` : `• ${ab.type || "Sin justificación"}`}
                </div>
              ))}
            </div>
          )}
          <div className="pt-1">La productividad se calcula sobre días efectivos, no sobre todos los días del mes.</div>
        </div>
      </div>

      {/* OBJETIVOS PERSONALIZADOS */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Objetivos personalizados</span>
        </div>
        <div className="space-y-1.5">
          {(goals.custom || []).length === 0 && (
            <div className="text-center py-6 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Sin objetivos personalizados. Creá objetivos simples como "Vaciar pendientes" o "Completar 20 reportes".
            </div>
          )}
          {(goals.custom || []).map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2 p-2.5 rounded-md"
              style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}
            >
              <button
                onClick={() => toggleCustomDone(g.id)}
                className="flex-shrink-0"
                style={{ color: g.done ? "var(--color-success)" : "var(--color-text-muted)" }}
                aria-label="Completar"
              >
                <CheckCircle2 size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold" style={{ color: g.done ? "var(--color-text-muted)" : "var(--color-text)", textDecoration: g.done ? "line-through" : "none" }}>
                  {g.name}
                </div>
                <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {g.type} {g.target ? `· ${g.target}` : ""} {g.deadline ? `· vence ${g.deadline}` : ""}
                </div>
              </div>
              <button
                onClick={() => removeCustom(g.id)}
                className="p-1 rounded hover:opacity-70"
                style={{ color: "var(--color-danger)" }}
                aria-label="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {showCustomForm ? (
            <div
              className="p-3 rounded-md space-y-2"
              style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)" }}
            >
              <Field label="Nombre del objetivo">
                <TextInput value={customForm.name} onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })} placeholder="Ej: Vaciar pendientes" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Tipo">
                  <Select
                    value={customForm.type}
                    onChange={(e) => setCustomForm({ ...customForm, type: e.target.value })}
                    options={[
                      { value: "casos", label: "Casos" },
                      { value: "reportes", label: "Reportes" },
                      { value: "general", label: "General" },
                    ]}
                  />
                </Field>
                <Field label="Valor objetivo (opcional)">
                  <TextInput type="number" value={customForm.target} onChange={(e) => setCustomForm({ ...customForm, target: e.target.value })} />
                </Field>
              </div>
              <Field label="Fecha límite (opcional)">
                <TextInput type="date" value={customForm.deadline} onChange={(e) => setCustomForm({ ...customForm, deadline: e.target.value })} />
              </Field>
              <div className="flex items-center gap-2">
                <Btn size="sm" onClick={addCustom}>Crear</Btn>
                <BtnOutline size="sm" onClick={() => setShowCustomForm(false)}>Cancelar</BtnOutline>
              </div>
            </div>
          ) : (
            <BtnOutline size="sm" onClick={() => setShowCustomForm(true)}>
              <Plus size={12} /> Nuevo objetivo
            </BtnOutline>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalRow({ label, enabled, target, current, percent, met, onToggle, onTarget }) {
  return (
    <div className="p-3 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{label}</span>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span style={{ color: "var(--color-text)" }}>{current} / {target}</span>
            <span style={{ color: met ? "var(--color-success)" : "var(--color-accent)" }}>{percent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${percent}%`, backgroundColor: met ? "var(--color-success)" : "var(--color-accent)" }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TextInput
              type="number"
              value={target || ""}
              onChange={(e) => onTarget(e.target.value)}
              style={{ width: 80 }}
              aria-label={`Meta de ${label}`}
            />
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>meta</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthGoalRow({ label, g, pace, remainingDays, onToggle, onTarget }) {
  return (
    <div className="p-3 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{label}</span>
        <Toggle checked={g.enabled} onChange={onToggle} />
      </div>
      {g.enabled && (
        <div className="mt-2 space-y-1 text-[11px]" style={{ color: "var(--color-text)" }}>
          <div className="flex items-center justify-between">
            <span>Progreso: {g.current} / {g.target}</span>
            <span style={{ color: g.met ? "var(--color-success)" : "var(--color-accent)" }}>{g.percent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${g.percent}%`, backgroundColor: g.met ? "var(--color-success)" : "var(--color-accent)" }}
            />
          </div>
          {!g.met && g.remaining > 0 && (
            <div className="pt-1">
              <div>Restan: {g.remaining}</div>
              {pace != null && remainingDays > 0 && (
                <div>Días efectivos restantes: {remainingDays} · Necesario: {pace} /día</div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <TextInput
              type="number"
              value={g.target || ""}
              onChange={(e) => onTarget(e.target.value)}
              style={{ width: 80 }}
              aria-label={`Meta de ${label}`}
            />
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>meta</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekGoalRow({ label, g, progress, onToggle, onTarget }) {
  const enabled = g.enabled;
  const p = progress || {};
  return (
    <div className="p-3 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{label}</span>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <div className="mt-2 space-y-1 text-[11px]" style={{ color: "var(--color-text)" }}>
          <div className="flex items-center justify-between">
            <span>Progreso: {p.current || 0} / {g.target || 0}</span>
            <span style={{ color: p.met ? "var(--color-success)" : "var(--color-accent)" }}>{p.percent || 0}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${p.percent || 0}%`, backgroundColor: p.met ? "var(--color-success)" : "var(--color-accent)" }}
            />
          </div>
          {!p.met && p.remaining > 0 && (
            <div className="pt-1">
              <div>Restan: {p.remaining}</div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <TextInput
              type="number"
              value={g.target || ""}
              onChange={(e) => onTarget(e.target.value)}
              style={{ width: 80 }}
              aria-label={`Meta de ${label}`}
            />
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>meta</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{label}</div>
      <div className="text-base font-bold" style={{ color: "var(--color-text)" }}>{value}</div>
    </div>
  );
}