import React from "react";
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Trophy,
  AlertTriangle,
} from "lucide-react";

function GoalProgressRow({ goal }) {
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
      <span className="inline-flex items-center gap-0.5 pill-compact font-semibold"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-success) 13.3%, transparent)", color: "var(--color-success)" }}>
        <CheckCircle2 size={9} />
        Completado
      </span>
    );
  }
  if (percent >= 75) {
    return (
      <span className="inline-flex items-center gap-0.5 pill-compact font-semibold"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)", color: "var(--color-accent)" }}>
        Cerca
      </span>
    );
  }
  return null;
}

function DailyGoals({ daily, paceMetrics, showProjection }) {
  const goals = [
    daily.cases.enabled ? { label: "Casos", ...daily.cases } : null,
    daily.reports.enabled ? { label: "Reportes", ...daily.reports } : null,
    daily.firmas?.enabled ? { label: "Firmas", ...daily.firmas } : null,
  ].filter(Boolean);

  if (goals.length === 0) return null;

  return (
    <div>
      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
        Objetivos diarios
      </div>
      <div className="mt-2 space-y-3">
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

function WeeklyGoals({ weeklyProgress }) {
  const enabledGoals = weeklyProgress.goals.filter((g) => g.enabled);
  if (enabledGoals.length === 0) return null;

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
        Objetivos semanales
      </div>
      <div className="mt-2 space-y-3">
        {enabledGoals.map((g) => (
          <div key={g.key}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--color-text)" }}>{g.label}</span>
                {g.met && (
                  <span className="inline-flex items-center gap-0.5 pill-compact font-semibold"
                    style={{ backgroundColor: "color-mix(in srgb, var(--color-success) 13.3%, transparent)", color: "var(--color-success)" }}>
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

function ProximoHito({ milestone }) {
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
      className="mt-4 pt-3 flex items-center gap-3"
      style={{
        borderTop: "1px solid var(--color-border)",
        backgroundColor: `color-mix(in srgb, ${color} 5.1%, transparent)`,
        borderRadius: "8px",
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        padding: "12px",
        marginTop: "16px",
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 13.3%, transparent)`, width: "36px", height: "36px" }}
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

export function MetasCard({ daily, paceMetrics, weeklyProgress, milestone, showProjection = true, showMilestones = true }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Metas
        </span>
      </div>

      <DailyGoals daily={daily} paceMetrics={paceMetrics} showProjection={showProjection} />

      <WeeklyGoals weeklyProgress={weeklyProgress} />

      {showMilestones && <ProximoHito milestone={milestone} />}
    </div>
  );
}

export default MetasCard;