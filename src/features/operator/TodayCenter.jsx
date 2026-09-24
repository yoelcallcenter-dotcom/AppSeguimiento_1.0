import React, { useState, useEffect, useMemo } from "react";
import {
  Sun,
  Clock,
  CalendarClock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Target,
} from "lucide-react";
import { DAY_LABELS } from "./operatorDefaults";
import {
  getDayPaceMetrics,
  getWeeklyGoalProgress,
  getNextMilestone,
} from "./operatorMetrics";
import { getLastRunTime, getJornadaBackupSchedule, getBackupFrequency, daysSinceLastBackup } from "../../services/autoBackup";
import { getPeriodRange } from "../analytics/periodUtils";
import {
  computeResumenPeriodo,
  promedioPersonalReciente,
  proyeccionObjetivos,
} from "../analytics/analyticsEngine";
import { generarInsightsAnaliticos } from "../analytics/smartInsights";
import { getDayClosureData } from "../../core/alerts/attentionRules";
import { getOrderedMiEspacioKeys } from "./miEspacioConfig";
import { BienvenidaCard } from "./components/BienvenidaCard";
import { ProximaActividad } from "./components/ProximaActividad";
import { ProximosEventos } from "./components/ProximosEventos";
import { PendientesCard } from "./components/PendientesCard";
import { ProductividadSection } from "./components/ProductividadSection";
import { AccionesRapidas } from "./components/AccionesRapidas";
import { MetasCard } from "./components/MetasCard";
import { AccesosCard } from "./components/AccesosCard";

export function TodayCenter({
  profile,
  availability,
  goals,
  cases,
  notes = [],
  events = [],
  dayState,
  daily,
  pace,
  todayISO,
  now: parentNow,
  onChangeView,
  showPace = true,
  settings = {},
  showInsight = true,
  greeting,
  encouragement,
  metaDiariaCumplida,
  credentials = { entries: [] },
  onVerCaso,
  onNavigateToEvent,
  onNavigateMetas,
  onNavigateAccesos,
  onNuevoCaso,
  onNuevoReporte,
  onNuevaNota,
  onNuevoEvento,
  onBuscar,
  onExportar,
}) {
  const now = parentNow || new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const paceMetrics = useMemo(
    () => getDayPaceMetrics(goals, cases, profile, availability, year, month, todayISO),
    [goals, cases, profile, availability, year, month, todayISO, tick, now]
  );

  const weeklyProgress = useMemo(
    () => getWeeklyGoalProgress(goals, cases, profile.workingDays, todayISO, availability),
    [goals, cases, profile.workingDays, todayISO, availability]
  );

  const milestone = useMemo(
    () => getNextMilestone(goals, cases, profile, availability, year, month, todayISO),
    [goals, cases, profile, availability, year, month, todayISO, now]
  );

  const backupStatus = useMemo(() => getBackupStatus(), [tick, now]);

  const closureData = useMemo(
    () => getDayClosureData(cases, notes, events, goals, todayISO),
    [cases, notes, events, goals, todayISO]
  );

  const insightDestacado = useMemo(() => {
    if (!showInsight) return null;
    try {
      const rango = getPeriodRange("30d");
      const workingDays =
        profile.workingDays?.length > 0 ? profile.workingDays : [1, 2, 3, 4, 5];
      const resumen = computeResumenPeriodo(cases, rango, workingDays, {}, availability);
      const promPersonal = promedioPersonalReciente(cases, {}, new Date(), undefined, workingDays, availability);
      let proyeccion = null;
      proyeccion = proyeccionObjetivos({
        goals,
        casos: cases,
        profile,
        availability,
        year,
        month,
        todayISO,
        workingDays,
      });
      const { insights } = generarInsightsAnaliticos({
        totalCasos: cases.length,
        resumen,
        tendencia: null,
        horas: null,
        aseguradoras: [],
        estudios: [],
        sinSeguimientoCount: 0,
        promedioPersonal: promPersonal,
        proyeccion,
      });
      return insights[0] || null;
    } catch {
      return null;
    }
  }, [showInsight, cases, goals, profile, availability, year, month, todayISO]);

  const order = useMemo(() => getOrderedMiEspacioKeys(settings.miEspacioOrder), [settings.miEspacioOrder]);

  // Los bloques vacíos (sin datos para hoy) se omiten salvo que el usuario
  // quiera mantenerlos visibles: por defecto solo se muestran los con contenido.
  const blocks = {
    hoy: (
      <BienvenidaCard
        profile={profile}
        now={now}
        greeting={greeting}
        encouragement={encouragement}
        metaDiariaCumplida={metaDiariaCumplida}
        events={events}
        onVerCaso={onVerCaso}
        onNavigateToEvent={onNavigateToEvent}
      />
    ),
    jornada: <JornadaCard profile={profile} paceMetrics={paceMetrics} dayState={dayState} now={now} />,
    proxima: (
      <ProximaActividad events={events} now={now} onVerCaso={onVerCaso} onNavigateToEvent={onNavigateToEvent} />
    ),
    eventos: (
      <ProximosEventos events={events} now={now} onNavigateToEvent={onNavigateToEvent} />
    ),
    pendientes:
      cases && cases.length > 0 && todayISO ? (
        <PendientesCard
          cases={cases}
          events={events}
          notes={notes}
          todayISO={todayISO}
          goals={goals}
          onVerCaso={onVerCaso}
          onNavigateToEvent={onNavigateToEvent}
          onNavigateMetas={onNavigateMetas}
        />
      ) : null,
    productividad:
      cases && cases.length > 0 && todayISO ? (
        <ProductividadSection
          daily={daily}
          closureData={closureData}
          paceMetrics={paceMetrics}
          pace={pace}
          showPace={showPace}
          cases={cases}
          events={events}
          notes={notes}
          todayISO={todayISO}
          onVerCaso={onVerCaso}
          onNavigateToEvent={onNavigateToEvent}
        />
      ) : null,
    metas: <MetasCard daily={daily} paceMetrics={paceMetrics} weeklyProgress={weeklyProgress} milestone={milestone} showProjection={settings.showProjection !== false} showMilestones={settings.showMilestones !== false} />,
    acciones: (onNuevoCaso || onNuevoReporte || onNuevaNota || onNuevoEvento || onBuscar || onExportar) ? (
      <AccionesRapidas
        onNuevoCaso={onNuevoCaso}
        onNuevoReporte={onNuevoReporte}
        onNuevaNota={onNuevaNota}
        onNuevoEvento={onNuevoEvento}
        onBuscar={onBuscar}
        onExportar={onExportar}
      />
    ) : null,
    accesos: <AccesosCard credentials={credentials} onNavigateAccesos={onNavigateAccesos} />,
  };

  return (
    <div className="space-y-4">
      {order.map((key) => {
        const block = blocks[key];
        return block === null || block === undefined ? null : (
          <div key={key}>{block}</div>
        );
      })}

      {insightDestacado && (
        <div
          className="rounded-lg px-4 py-3 flex items-start gap-2.5"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderLeft: "3px solid var(--color-accent)",
          }}
        >
          <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
              {insightDestacado.titulo}
            </div>
            <div className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--color-text-muted)" }}>
              {insightDestacado.detalle}
            </div>
          </div>
          {onChangeView && (
            <button
              onClick={() => onChangeView("dashboard")}
              className="flex items-center gap-1 flex-shrink-0 text-[11px] font-semibold hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-accent)" }}
            >
              Ver análisis <ArrowRight size={11} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {settings.showBackupStatus !== false && (
        <BackupStatusCard backupStatus={backupStatus} />
      )}

      {cases && cases.length > 0 && goals && todayISO && dayState && (dayState.key === "ended" || dayState.key === "goal-met") && (
        <DayClosureCard
          cases={cases}
          notes={notes}
          events={events}
          goals={goals}
          todayISO={todayISO}
          onVerCaso={onVerCaso}
          onNavigateToEvent={onNavigateToEvent}
        />
      )}

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {onChangeView && (
          <button
            onClick={() => onChangeView("dashboard")}
            className="font-semibold hover:opacity-70"
            style={{ color: "var(--color-accent)" }}
          >
            Ir al Dashboard →
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function JornadaCard({ profile, paceMetrics, dayState, now }) {
  const dayLabel = DAY_LABELS[now.getDay()];
  const formattedDate = `${dayLabel} ${now.getDate()} de ${now.toLocaleDateString("es-AR", { month: "long" })}`;
  const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sun size={16} color="var(--color-accent)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Mi Jornada
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 pill-lg"
          style={{
            backgroundColor: dayStateColor(dayState.key) + "22",
            color: dayStateColor(dayState.key),
            border: `1px solid ${dayStateColor(dayState.key)}44`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dayStateColor(dayState.key) }} />
          {dayState.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
        <TimeTile
          icon={Clock}
          label="Jornada"
          value={`${profile.workSchedule?.start || "—"} — ${profile.workSchedule?.end || "—"}`}
        />
        <TimeTile
          icon={Sun}
          label="Transcurrido"
          value={formatMinutes(paceMetrics.elapsedMinutes)}
          accent
        />
        <TimeTile
          icon={Clock}
          label="Restante"
          value={formatMinutes(paceMetrics.remainingMinutes)}
          warning={paceMetrics.remainingMinutes < 60 && paceMetrics.remainingMinutes > 0}
        />
        <TimeTile
          icon={CalendarClock}
          label="Fecha"
          value={formattedDate}
        />
      </div>

      <TimeProgressBar
        elapsed={paceMetrics.elapsedMinutes}
        total={paceMetrics.totalMinutes}
      />

      <div className="mt-2 text-[11px] text-right" style={{ color: "var(--color-text-muted)" }}>
        {formattedTime} hs
      </div>
    </div>
  );
}

function TimeTile({ icon: Icon, label, value, accent, warning }) {
  return (
    <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1 text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>
        <Icon size={11} />
        {label}
      </div>
      <div
        className="text-sm font-bold truncate"
        style={{
          color: warning ? "var(--color-warning)" : accent ? "var(--color-accent)" : "var(--color-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TimeProgressBar({ elapsed, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface2)" }}>
      <div
        className="h-full rounded-full transition-[width]"
        style={{
          width: `${pct}%`,
          backgroundColor: pct >= 90 ? "var(--color-success)" : "var(--color-accent)",
        }}
      />
    </div>
  );
}

function DayClosureCard({ cases, notes, events, goals, todayISO, onVerCaso, onNavigateToEvent }) {
  const closureData = useMemo(
    () => getDayClosureData(cases, notes, events, goals, todayISO),
    [cases, notes, events, goals, todayISO]
  );

  if (!closureData) return null;

  const { goalProgress, firmasRegistradas, casosTrabajados, eventosPendientes, proximosCompromisos, casosSinActividad } = closureData;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderTop: `3px solid ${goalProgress?.firmas?.completado ? "var(--color-success)" : "var(--color-warning)"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
          Resumen de Jornada
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {goalProgress?.firmas && (
          <div className="p-2 rounded" style={{ backgroundColor: "var(--color-surface2)" }}>
            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Firmas</div>
            <div className="text-sm font-bold" style={{ color: goalProgress.firmas.completado ? "var(--color-success)" : "var(--color-text)" }}>
              {goalProgress.firmas.resultado}/{goalProgress.firmas.objetivo}
            </div>
          </div>
        )}
        {goalProgress?.casos && (
          <div className="p-2 rounded" style={{ backgroundColor: "var(--color-surface2)" }}>
            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Casos</div>
            <div className="text-sm font-bold" style={{ color: goalProgress.casos.completado ? "var(--color-success)" : "var(--color-text)" }}>
              {goalProgress.casos.resultado}/{goalProgress.casos.objetivo}
            </div>
          </div>
        )}
        <div className="p-2 rounded" style={{ backgroundColor: "var(--color-surface2)" }}>
          <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Trabajados</div>
          <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{casosTrabajados}</div>
        </div>
        <div className="p-2 rounded" style={{ backgroundColor: "var(--color-surface2)" }}>
          <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Pendientes</div>
          <div className="text-sm font-bold" style={{ color: eventosPendientes > 0 ? "var(--color-warning)" : "var(--color-text)" }}>
            {eventosPendientes}
          </div>
        </div>
      </div>

      {(proximosCompromisos > 0 || casosSinActividad > 0) && (
        <div className="space-y-1 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {proximosCompromisos > 0 && <div>• {proximosCompromisos} compromisos próximos</div>}
          {casosSinActividad > 0 && <div>• {casosSinActividad} casos sin actividad</div>}
        </div>
      )}
    </div>
  );
}

function BackupStatusCard({ backupStatus }) {
  if (!backupStatus) return null;

  const { lastBackupLabel, nextBackupLabel, isOk, warning } = backupStatus;

  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          backgroundColor: isOk ? "var(--color-success)22" : "var(--color-warning)22",
          width: "36px",
          height: "36px",
        }}
      >
        {isOk
          ? <ShieldCheck size={18} style={{ color: "var(--color-success)" }} />
          : <AlertTriangle size={18} style={{ color: "var(--color-warning)" }} />
        }
      </div>
      <div className="flex-1 min-w-0 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: "var(--color-text)" }}>Backup automático</span>
          {warning && (
            <span className="pill-compact font-semibold"
              style={{ backgroundColor: "var(--color-warning)22", color: "var(--color-warning)" }}>
              {warning}
            </span>
          )}
        </div>
        <div className="mt-0.5">
          {lastBackupLabel && <span>Último: {lastBackupLabel}</span>}
          {lastBackupLabel && nextBackupLabel && <span> · </span>}
          {nextBackupLabel && <span>Próximo: {nextBackupLabel}</span>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UTILIDADES
// ============================================================

function formatMinutes(mins) {
  if (mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function dayStateColor(key) {
  switch (key) {
    case "goal-met": return "var(--color-success)";
    case "in-workday": return "var(--color-accent)";
    case "not-started": return "var(--color-text-muted)";
    case "ended": return "var(--color-warning)";
    case "vacation": return "var(--color-accent)";
    case "holiday": return "var(--color-warning)";
    case "absence": return "var(--color-danger)";
    case "day-off": return "var(--color-text-muted)";
    default: return "var(--color-text-muted)";
  }
}

function getBackupStatus() {
  try {
    const lastRun = getLastRunTime();
    const frequency = getBackupFrequency();
    const daysSince = daysSinceLastBackup();
    const schedule = getJornadaBackupSchedule();

    let lastBackupLabel = "";
    if (lastRun) {
      const diff = Date.now() - lastRun;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) lastBackupLabel = "Recién realizado";
      else if (mins < 60) lastBackupLabel = `Hace ${mins} min`;
      else if (mins < 1440) lastBackupLabel = `Hace ${Math.floor(mins / 60)}h`;
      else lastBackupLabel = `Hace ${Math.floor(mins / 1440)} día${Math.floor(mins / 1440) !== 1 ? "s" : ""}`;
    }

    let nextBackupLabel = "";
    if (schedule && schedule.backupTime) {
      const h = String(schedule.backupTime.getHours()).padStart(2, "0");
      const m = String(schedule.backupTime.getMinutes()).padStart(2, "0");
      nextBackupLabel = `Hoy a las ${h}:${m}`;
    } else if (frequency === "manual") {
      nextBackupLabel = "Manual";
    }

    let warning = null;
    if (frequency !== "manual" && daysSince !== null) {
      const limits = { diario: 2, semanal: 7, mensual: 15 };
      const limit = limits[frequency] || 2;
      if (daysSince >= limit) {
        warning = `${daysSince}d sin respaldar`;
      }
    }

    return {
      lastBackupLabel,
      nextBackupLabel,
      isOk: !warning,
      warning,
    };
  } catch {
    return null;
  }
}

export default TodayCenter;