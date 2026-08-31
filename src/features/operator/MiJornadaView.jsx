import React, { useState, useEffect, useMemo } from "react";
import {
  Sun,
  Clock,
  Target,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  CalendarClock,
  Zap,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Users,
} from "lucide-react";
import { DAY_LABELS } from "./operatorDefaults";
import {
  getDayPaceMetrics,
  getWeeklyGoalProgress,
  getNextMilestone,
  getMonthlyGoalProgress,
  getEffectiveWorkDays,
} from "./operatorMetrics";
import { getLastRunTime, getJornadaBackupSchedule, getBackupFrequency, daysSinceLastBackup } from "../../services/autoBackup";
import { getPeriodRange } from "../analytics/periodUtils";
import {
  computeResumenPeriodo,
  promedioPersonalReciente,
  proyeccionObjetivos,
} from "../analytics/analyticsEngine";
import { generarInsightsAnaliticos } from "../analytics/smartInsights";
import { Sparkles, ArrowRight } from "lucide-react";
import { getUpcomingEvents, getSeguimientosPendientes, getDayClosureData } from "../../core/alerts/attentionRules";

export function MiJornadaView({
  profile,
  availability,
  goals,
  cases,
  notes = [],
  events = [],
  dayState,
  daily,
  monthly,
  pace,
  effective,
  perDay,
  todayISO,
  onChangeView,
  showToast,
  showPace = true,
  settings = {},
  showInsight = true,
  onVerCaso,
  onNavigateToEvent,
  now: parentNow,
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
    () => getWeeklyGoalProgress(goals, cases, profile.workingDays, todayISO),
    [goals, cases, profile.workingDays, todayISO]
  );

  const milestone = useMemo(
    () => getNextMilestone(goals, cases, profile, availability, year, month, todayISO),
    [goals, cases, profile, availability, year, month, todayISO, now]
  );

  const backupStatus = useMemo(() => getBackupStatus(), [tick, now]);

  // Insight destacado (1.3.2): un único mensaje de mayor prioridad.
  // Se calcula con el mismo motor de Analítica; nunca se persiste.
  const insightDestacado = useMemo(() => {
    if (!showInsight) return null;
    try {
      const rango = getPeriodRange("30d");
      const workingDays =
        profile.workingDays?.length > 0 ? profile.workingDays : [1, 2, 3, 4, 5];
      const resumen = computeResumenPeriodo(cases, rango, workingDays, {});
      const promPersonal = promedioPersonalReciente(cases, {});
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

  const dayLabel = DAY_LABELS[now.getDay()];
  const formattedDate = `${dayLabel} ${now.getDate()} de ${now.toLocaleDateString("es-AR", { month: "long" })}`;
  const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* ESTADO DE JORNADA */}
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
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
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

        {/* Resumen de tiempo */}
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

        {/* Barra de progreso del tiempo */}
        <TimeProgressBar
          elapsed={paceMetrics.elapsedMinutes}
          total={paceMetrics.totalMinutes}
        />

        <div className="mt-2 text-[11px] text-right" style={{ color: "var(--color-text-muted)" }}>
          {formattedTime} hs
        </div>
      </div>

      {/* INSIGHT DESTACADO (1.3.2): un solo mensaje, acceso a Analítica */}
      {insightDestacado && (
        <div
          className="rounded-lg px-4 py-3 flex items-start gap-2.5"
          style={{
            backgroundColor: "var(--color-surface)",
            border: `1px solid var(--color-border)`,
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

      {/* ACTIVIDAD DE HOY */}
      {cases && cases.length > 0 && todayISO && (
        <TodayActivityCard cases={cases} todayISO={todayISO} onVerCaso={onVerCaso} />
      )}

      {/* PRÓXIMOS COMPROMISOS */}
      {cases && cases.length > 0 && todayISO && (
        <UpcomingCommitmentsCard
          cases={cases}
          events={events}
          todayISO={todayISO}
          onVerCaso={onVerCaso}
          onNavigateToEvent={onNavigateToEvent}
        />
      )}

      {/* SEGUIMIENTOS PENDIENTES */}
      {cases && cases.length > 0 && todayISO && (
        <PendingFollowUpsCard
          cases={cases}
          events={events}
          todayISO={todayISO}
          onVerCaso={onVerCaso}
        />
      )}

      {/* OBJETIVOS DIARIOS */}
      <DailyGoalsCard
        daily={daily}
        paceMetrics={paceMetrics}
        showPace={showPace}
        showProjection={settings.showProjection !== false}
      />

      {/* RITMO Y PROYECCIÓN */}
      {showPace && (
        <PaceCard paceMetrics={paceMetrics} pace={pace} />
      )}

      {/* OBJETIVOS SEMANALES */}
      {settings.weeklyGoalsEnabled !== false && (
        <WeeklyGoalsCard weeklyProgress={weeklyProgress} />
      )}

      {/* PRÓXIMO HITO */}
      {settings.showMilestones !== false && (
        <MilestoneCard milestone={milestone} />
      )}

      {/* ESTADO DEL BACKUP */}
      {settings.showBackupStatus !== false && (
        <BackupStatusCard backupStatus={backupStatus} />
      )}

      {/* RESUMEN DE JORNADA (al finalizar) */}
      {cases && cases.length > 0 && goals && todayISO && dayState && (dayState.key === 'ended' || dayState.key === 'goal-met') && (
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

      {/* ACCESO RÁPIDO */}
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
        <span>·</span>
        <span>
          {effective.effective}/{effective.scheduled} días efectivos este mes
        </span>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function TodayActivityCard({ cases, todayISO, onVerCaso }) {
  const todayCases = useMemo(() => {
    if (!cases || !todayISO) return [];
    return cases
      .filter((c) => {
        const created = (c.createdAt || "").slice(0, 10);
        const lastActivity = (c.lastActivityAt || "").slice(0, 10);
        return created === todayISO || lastActivity === todayISO;
      })
      .slice(0, 5);
  }, [cases, todayISO]);

  if (todayCases.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Actividad de hoy ({todayCases.length})
        </span>
      </div>
      <div className="space-y-1">
        {todayCases.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onVerCaso && onVerCaso(c)}
            className="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--color-surface2)" }}
          >
            <span className="font-medium truncate" style={{ color: "var(--color-text)" }}>
              {c.nombre || "Sin nombre"}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: "var(--color-accent)22",
                color: "var(--color-accent)",
              }}
            >
              {c.estado || "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UpcomingCommitmentsCard({ cases, events, todayISO, onVerCaso, onNavigateToEvent }) {
  const upcoming = useMemo(() => getUpcomingEvents(events, todayISO, 2), [events, todayISO]);

  if (upcoming.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={14} style={{ color: "var(--color-accent)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Próximos compromisos ({upcoming.length})
        </span>
      </div>
      <div className="space-y-1">
        {upcoming.slice(0, 5).map(({ event, daysUntil }) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onNavigateToEvent && onNavigateToEvent(event)}
            className="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--color-surface2)" }}
          >
            <span className="font-medium truncate" style={{ color: "var(--color-text)" }}>
              {event.title || "Sin título"}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: daysUntil === 0 ? "var(--color-warning)22" : "var(--color-accent)22",
                color: daysUntil === 0 ? "var(--color-warning)" : "var(--color-accent)",
              }}
            >
              {daysUntil === 0 ? "Hoy" : daysUntil === 1 ? "Mañana" : `En ${daysUntil} días`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PendingFollowUpsCard({ cases, events, todayISO, onVerCaso }) {
  const pending = useMemo(() => getSeguimientosPendientes(cases, events, todayISO), [cases, events, todayISO]);

  if (pending.length === 0) return null;

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Users size={14} style={{ color: "var(--color-warning)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          Seguimientos pendientes ({pending.length})
        </span>
      </div>
      <div className="space-y-1">
        {pending.slice(0, 5).map(({ caso, daysSinceActivity }) => (
          <button
            key={caso.id}
            type="button"
            onClick={() => onVerCaso && onVerCaso(caso)}
            className="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs hover:opacity-70 transition-opacity"
            style={{ backgroundColor: "var(--color-surface2)" }}
          >
            <span className="font-medium truncate" style={{ color: "var(--color-text)" }}>
              {caso.nombre || "Sin nombre"}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: "var(--color-warning)22",
                color: "var(--color-warning)",
              }}
            >
              {daysSinceActivity}d sin actividad
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DayClosureCard({ cases, notes, events, goals, todayISO, onVerCaso, onNavigateToEvent }) {
  const closureData = useMemo(
    () => getDayClosureData(cases, notes, events, goals, todayISO),
    [cases, notes, events, goals, todayISO]
  );

  if (!closureData) return null;

  const { goalProgress, firmasRegistradas, casosTrabajados, eventosPendientes, eventosVencidos, proximosCompromisos, casosSinActividad } = closureData;

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
          backgroundColor:
            pct >= 90 ? "var(--color-success)" :
            pct >= 60 ? "var(--color-accent)" :
            "var(--color-accent)",
        }}
      />
    </div>
  );
}

function DailyGoalsCard({ daily, paceMetrics, showPace, showProjection }) {
  const goals = [
    daily.cases.enabled ? { label: "Casos", ...daily.cases } : null,
    daily.reports.enabled ? { label: "Reportes", ...daily.reports } : null,
    daily.firmas?.enabled ? { label: "Firmas", ...daily.firmas } : null,
  ].filter(Boolean);

  if (goals.length === 0) return null;

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Objetivos diarios
        </span>
      </div>
      <div className="space-y-3">
        {goals.map((g) => (
          <GoalProgressRow key={g.label} goal={g} />
        ))}
      </div>
      {showProjection && paceMetrics.dailyGoal > 0 && (
        <div className="mt-3 pt-3 text-[11px]" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} color="var(--color-accent)" />
            <span>
              Proyección de cierre:{" "}
              <span style={{ color: "var(--color-text)" }}>
                {paceMetrics.projectedCases} caso{paceMetrics.projectedCases !== 1 ? "s" : ""}
              </span>
              {" "}de {paceMetrics.dailyGoal} objetivo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalProgressRow({ goal }) {
  const statusLabel = getStatusLabel(goal.status || goal.met);
  const statusColor = goal.met ? "var(--color-success)" : "var(--color-accent)";

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--color-text)" }}>{goal.label}</span>
          <GoalStatusBadge met={goal.met} percent={goal.percent} status={goal.status} />
        </div>
        <span style={{ color: statusColor }}>
          {goal.current} / {goal.target} · {goal.percent}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface2)" }}>
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${goal.percent}%`, backgroundColor: statusColor }}
        />
      </div>
      {!goal.met && goal.target > 0 && (
        <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
          Faltan {goal.target - goal.current} para completar
        </div>
      )}
    </div>
  );
}

function GoalStatusBadge({ met, percent, status }) {
  if (met) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: "var(--color-success)22", color: "var(--color-success)" }}>
        <CheckCircle2 size={9} />
        Completado
      </span>
    );
  }
  if (percent >= 75) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}>
        Cerca
      </span>
    );
  }
  return null;
}

function PaceCard({ paceMetrics, pace }) {
  const { casesPerHour, avgCasesPerDay, paceComparison, paceMessage, casesToday } = paceMetrics;

  const ComparisonIcon =
    paceComparison === "above-average" ? ArrowUpRight :
    paceComparison === "below-average" ? ArrowDownRight :
    Minus;

  const comparisonColor =
    paceComparison === "above-average" ? "var(--color-success)" :
    paceComparison === "below-average" ? "var(--color-warning)" :
    "var(--color-text-muted)";

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Ritmo
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <StatTile label="Ritmo actual" value={`${casesPerHour}/hora`} />
        <StatTile
          label="vs. promedio"
          value={paceMessage || "Sin datos"}
          icon={ComparisonIcon}
          iconColor={comparisonColor}
        />
        <StatTile label="Promedio habitual" value={`${avgCasesPerDay}/día`} />
      </div>
      {pace && pace.cases != null && pace.remainingDays > 0 && (
        <div className="mt-3 pt-3 text-[11px]" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
          <span>Ritmo necesario para meta mensual: </span>
          <span style={{ color: "var(--color-accent)" }}>{pace.cases} casos/día</span>
          <span> ({pace.remainingDays} días restantes)</span>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, iconColor }) {
  return (
    <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</div>
      <div className="flex items-center gap-1">
        {Icon && <Icon size={12} style={{ color: iconColor || "var(--color-text)" }} />}
        <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{value}</div>
      </div>
    </div>
  );
}

function WeeklyGoalsCard({ weeklyProgress }) {
  const enabledGoals = weeklyProgress.goals.filter((g) => g.enabled);
  if (enabledGoals.length === 0) return null;

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Objetivos semanales
        </span>
      </div>
      <div className="space-y-3">
        {enabledGoals.map((g) => (
          <div key={g.key}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--color-text)" }}>{g.label}</span>
                {g.met && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--color-success)22", color: "var(--color-success)" }}>
                    <CheckCircle2 size={9} />
                    Logrado
                  </span>
                )}
              </div>
              <span style={{ color: g.met ? "var(--color-success)" : "var(--color-accent)" }}>
                {g.current}/{g.target} · {g.percent}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface2)" }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${g.percent}%`,
                  backgroundColor: g.met ? "var(--color-success)" : "var(--color-accent)",
                }}
              />
            </div>
            {!g.met && g.remaining > 0 && (
              <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Restan {g.remaining} · {weeklyProgress.end}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestoneCard({ milestone }) {
  if (!milestone) return null;

  const iconMap = {
    urgent: AlertTriangle,
    achievement: Trophy,
    success: CheckCircle2,
    info: Target,
    neutral: Target,
  };
  const colorMap = {
    urgent: "var(--color-warning)",
    achievement: "var(--color-success)",
    success: "var(--color-success)",
    info: "var(--color-accent)",
    neutral: "var(--color-text-muted)",
  };

  const Icon = iconMap[milestone.type] || Target;
  const color = colorMap[milestone.type] || "var(--color-text-muted)";

  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3"
      style={{
        backgroundColor: color + "0D",
        border: `1px solid ${color}33`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ backgroundColor: color + "22", width: "36px", height: "36px" }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
          Próximo hito
        </div>
        <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          {milestone.text}
        </div>
      </div>
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
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
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

function getStatusLabel(met) {
  if (met) return "Completado";
  return "En progreso";
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

export default MiJornadaView;
