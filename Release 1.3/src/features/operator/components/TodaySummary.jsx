import React from "react";
import { Sun, Clock, Target, FileText, CalendarClock, TrendingUp, CheckCircle2 } from "lucide-react";
import { DAY_LABELS } from "../operatorDefaults";

export function TodaySummary({ profile, availability, goals, cases, dayState, daily, monthly, pace, effective, perDay, todayISO, onChangeView, showToast, showPace = true }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const upcomingEvents = getUpcomingEvents(now);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ESTADO DEL DÍA */}
      <div
        className="rounded-lg p-4 lg:col-span-2"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sun size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Hoy</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <SummaryTile icon={Clock} label="Jornada" value={`${profile.workSchedule?.start || "—"} — ${profile.workSchedule?.end || "—"}`} />
          <SummaryTile icon={Target} label="Casos" value={daily.cases.enabled ? `${daily.cases.current} / ${daily.cases.target}` : "—"} color={daily.cases.met ? "var(--color-success)" : undefined} />
          <SummaryTile icon={FileText} label="Reportes" value={daily.reports.enabled ? `${daily.reports.current} / ${daily.reports.target}` : "—"} color={daily.reports.met ? "var(--color-success)" : undefined} />
          <SummaryTile icon={CalendarClock} label="Próximo evento" value={upcomingEvents || "—"} />
        </div>
        <div className="mt-3">
          <ProgressBars daily={daily} />
        </div>
        {daily.cases.enabled && daily.cases.met && daily.reports.enabled && daily.reports.met && (
          <div
            className="mt-3 flex items-center gap-2 text-[11px] font-semibold rounded-md px-3 py-2"
            style={{ backgroundColor: "var(--color-success)11", color: "var(--color-success)", border: "1px solid var(--color-success)44" }}
          >
            <CheckCircle2 size={13} />
            ¡Objetivo diario cumplido! Completaste tus metas de casos y reportes de hoy.
          </div>
        )}
        {effective.effective > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            <TrendingUp size={13} color="var(--color-accent)" />
            <span>
              {effective.effective} / {effective.scheduled} días laborables efectivos este mes · {perDay.casesPerDay} casos/día efectivo
            </span>
          </div>
        )}
        {onChangeView && (
          <button
            onClick={() => onChangeView("dashboard")}
            className="mt-3 text-[11px] font-semibold hover:opacity-70"
            style={{ color: "var(--color-accent)" }}
          >
            Ir al Dashboard →
          </button>
        )}
      </div>

      {/* OBJETIVOS MENSUALES */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Objetivos del mes</div>
        <div className="space-y-2 text-xs" style={{ color: "var(--color-text)" }}>
          {monthly.signed && monthly.signed.enabled ? (
            <div>
              <div className="flex items-center justify-between">
                <span>Firmas mensuales</span>
                <span style={{ color: monthly.signed.met ? "var(--color-success)" : "var(--color-accent)" }}>
                  {monthly.signed.met ? "Objetivo logrado" : `${monthly.signed.percent}%`}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--color-surface2)" }}>
                <div className="h-full rounded-full" style={{ width: `${monthly.signed.percent}%`, backgroundColor: monthly.signed.met ? "var(--color-success)" : "var(--color-accent)" }} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                {monthly.signed.current} / {monthly.signed.target} firmas · {monthly.signed.met ? "Meta cumplida" : `Faltan ${monthly.signed.remaining}`}
              </div>
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Meta de firmas mensual desactivada.</div>
          )}
          {monthly.cases && monthly.cases.enabled ? (
            <div>
              <div className="flex items-center justify-between">
                <span>Casos mensuales</span>
                <span style={{ color: monthly.cases.met ? "var(--color-success)" : "var(--color-accent)" }}>{monthly.cases.percent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--color-surface2)" }}>
                <div className="h-full rounded-full" style={{ width: `${monthly.cases.percent}%`, backgroundColor: monthly.cases.met ? "var(--color-success)" : "var(--color-accent)" }} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                {monthly.cases.current} / {monthly.cases.target} · Restan {monthly.cases.remaining}
                {showPace && pace?.cases != null && ` · ${pace.cases}/día`}
              </div>
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Meta mensual de casos desactivada.</div>
          )}
          {monthly.reports && monthly.reports.enabled && (
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <span>Reportes mensuales</span>
                <span style={{ color: monthly.reports.met ? "var(--color-success)" : "var(--color-accent)" }}>{monthly.reports.percent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--color-surface2)" }}>
                <div className="h-full rounded-full" style={{ width: `${monthly.reports.percent}%`, backgroundColor: monthly.reports.met ? "var(--color-success)" : "var(--color-accent)" }} />
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                {monthly.reports.current} / {monthly.reports.target} · Restan {monthly.reports.remaining}
              </div>
            </div>
          )}
          {showPace && pace && pace.remainingDays > 0 && (
            <div className="pt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Días efectivos restantes: <span style={{ color: "var(--color-text)" }}>{pace.remainingDays}</span>
              {pace.cases != null && <div>Ritmo necesario: <span style={{ color: "var(--color-accent)" }}>{pace.cases} casos/día</span></div>}
              {pace.reports != null && <div>Ritmo necesario: <span style={{ color: "var(--color-accent)" }}>{pace.reports} reportes/día</span></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, color }) {
  return (
    <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1 text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>
        <Icon size={11} />
        {label}
      </div>
      <div className="text-sm font-bold truncate" style={{ color: color || "var(--color-text)" }}>{value}</div>
    </div>
  );
}

function ProgressBars({ daily }) {
  return (
    <div className="space-y-2">
      {daily.cases.enabled && <Bar label="Casos" p={daily.cases} />}
      {daily.reports.enabled && <Bar label="Reportes" p={daily.reports} />}
    </div>
  );
}

function Bar({ label, p }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span style={{ color: "var(--color-text)" }}>{label}</span>
        <span style={{ color: p.met ? "var(--color-success)" : "var(--color-accent)" }}>
          {p.current} / {p.target} · {p.percent}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface2)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${p.percent}%`, backgroundColor: p.met ? "var(--color-success)" : "var(--color-accent)" }}
        />
      </div>
    </div>
  );
}

function getUpcomingEvents(now) {
  try {
    const raw = localStorage.getItem("app_events") || localStorage.getItem("events");
    if (!raw) return "";
    const events = JSON.parse(raw);
    const list = Array.isArray(events) ? events : events.events || [];
    if (!list.length) return "";
    const nowTime = now.getTime();
    const upcoming = list
      .filter((e) => e.startDate && new Date(e.startDate).getTime() >= nowTime)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    if (!upcoming) return "";
    const d = new Date(upcoming.startDate);
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${time} ${upcoming.title || "Evento"}`;
  } catch {
    return "";
  }
}