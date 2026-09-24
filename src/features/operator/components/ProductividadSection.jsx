import React, { useMemo } from "react";
import {
  TrendingUp,
  Users,
  FileText,
  PenLine,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { buildTodayTimeline } from "../operatorMetrics";
import { TimelineActividades } from "./TimelineActividades";

function StatTile({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1 text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>
        {Icon && <Icon size={11} style={{ color }} />}
        {label}
      </div>
      <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{sub}</div>}
    </div>
  );
}

export function ProductividadSection({
  daily,
  closureData,
  paceMetrics,
  pace,
  showPace = true,
  cases = [],
  events = [],
  notes = [],
  todayISO,
  onVerCaso,
  onNavigateToEvent,
}) {
  const actividadCount = useMemo(
    () => (todayISO ? buildTodayTimeline(cases, events, notes, todayISO).length : 0),
    [cases, events, notes, todayISO]
  );

  const casos = daily?.cases?.enabled
    ? { value: `${daily.cases.current}/${daily.cases.target}`, sub: "meta diaria" }
    : { value: closureData?.casosTrabajados ?? 0, sub: "trabajados hoy" };

  const reportes = daily?.reports?.enabled
    ? { value: `${daily.reports.current}/${daily.reports.target}`, sub: "meta diaria" }
    : { value: "—", sub: "sin meta configurada" };

  const firmas = daily?.firmas?.enabled
    ? { value: `${daily.firmas.current}/${daily.firmas.target}`, sub: "meta diaria" }
    : { value: closureData?.firmasRegistradas ?? 0, sub: "firmas hoy" };

  const comparisonIcon =
    paceMetrics?.paceComparison === "above-average" ? ArrowUpRight :
    paceMetrics?.paceComparison === "below-average" ? ArrowDownRight :
    Minus;
  const comparisonColor =
    paceMetrics?.paceComparison === "above-average" ? "var(--color-success)" :
    paceMetrics?.paceComparison === "below-average" ? "var(--color-warning)" :
    "var(--color-text-muted)";

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Productividad
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="Casos" value={casos.value} sub={casos.sub} icon={Users} color="var(--chart-color-cases)" />
        <StatTile label="Reportes" value={reportes.value} sub={reportes.sub} icon={FileText} color="var(--color-accent)" />
        <StatTile label="Firmas" value={firmas.value} sub={firmas.sub} icon={PenLine} color="var(--color-success)" />
        <StatTile label="Actividad" value={actividadCount} sub="registros de hoy" icon={Activity} color="var(--chart-color-orange)" />
      </div>

      {showPace && paceMetrics && (
        <div className="mt-3 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)" }}>
            <div className="text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>Ritmo actual</div>
            <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              {paceMetrics.casesPerHour}/hora
            </div>
          </div>
          <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)" }}>
            <div className="text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>vs. promedio</div>
            <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--color-text)" }}>
              <comparisonIcon size={12} style={{ color: comparisonColor }} />
              {paceMetrics.paceMessage || "Sin datos"}
            </div>
          </div>
          <div className="p-2 rounded-md" style={{ backgroundColor: "var(--color-surface2)" }}>
            <div className="text-[10px] mb-1" style={{ color: "var(--color-text-muted)" }}>Promedio habitual</div>
            <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              {paceMetrics.avgCasesPerDay}/día
            </div>
          </div>
        </div>
      )}

      {showPace && pace && pace.cases != null && pace.remainingDays > 0 && (
        <div className="mt-3 pt-3 text-[11px]" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
          <span>Ritmo necesario para meta mensual: </span>
          <span style={{ color: "var(--color-accent)" }}>{pace.cases} casos/día</span>
          <span> ({pace.remainingDays} días restantes)</span>
        </div>
      )}

      {todayISO && cases && cases.length > 0 && (
        <div className="mt-3">
          <TimelineActividades
            cases={cases}
            events={events}
            notes={notes}
            todayISO={todayISO}
            onVerCaso={onVerCaso}
            onNavigateToEvent={onNavigateToEvent}
          />
        </div>
      )}
    </div>
  );
}

export default ProductividadSection;