import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { UserCircle2, CalendarDays, Target, KeyRound, Sun, ArrowRight, FileDown } from "lucide-react";
import useCelebrationStore from "../../core/celebrations/celebrationStore";
import { useOperatorState } from "./useOperatorState";
import { getDayState, getDailyGoalProgress, getMonthlyGoalProgress, getRequiredDailyPace, getEffectiveWorkDays, getAvailabilitySummary, buildPersonalSuggestions, getPerEffectiveDayMetrics } from "./operatorMetrics";
import { DAY_STATES } from "./operatorDefaults";
import { getDailyGreeting, buildEncouragementMessage } from "./operatorMessages";
import { ProfileCard } from "./components/ProfileCard";
import { AvailabilityCard } from "./components/availability";
import { GoalsSection } from "./components/GoalsSection";
import { CredentialsSection } from "./components/CredentialsSection";
import { TodayCenter } from "./TodayCenter";
// Optimización 1.6.6: PdfExportModal se carga bajo demanda (solo al exportar).
const PdfExportModal = lazy(() =>
  import("./PdfExportModal").then((m) => ({ default: m.PdfExportModal }))
);
import { readOperatorCases } from "./operatorStore";
import useAppStore from "../../core/store/useAppStore";
import { NavDock } from "../../components/common/UINav";
import { ConfigTip } from "../../components/configuracion/ui";
// v1.9.7 (fix B3): toLocalDateStr en vez de toISOString() — con UTC, entre
// 21:00 y medianoche (UTC-3) el "hoy" de Mi Espacio era el día siguiente y las
// metas diarias se contaban en 0.
import { toLocalDateStr } from "../../utils/dateUtils";

export function OperatorView({ config, casos, showToast, onChangeView, onVerCaso, onNavigateToEvent, onNuevoCaso, onNuevoReporte, onNuevaNota, onNuevoEvento, onBuscar, onExportar }) {
  const state = useOperatorState();
  const { profile, availability, goals, settings } = state;
  const notes = useAppStore((s) => s.notes);
  const events = useAppStore((s) => s.events);

  const [activeSection, setActiveSection] = useState("hoy");
  const [showPdfModal, setShowPdfModal] = useState(false);

  const allCases = useMemo(() => {
    const stored = readOperatorCases();
    if (Array.isArray(stored) && stored.length) return stored;
    return casos || [];
  }, [casos]);

  // Reloj por-minuto: mantiene TODOS los cálculos de la jornada (estado del día,
  // ritmo, transcurrido, sugerencias y hora) sincronizados con la hora real.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // v1.9.7 (fix B3): toLocalDateStr(now) en lugar de toISOString() (UTC).
  const todayISO = toLocalDateStr(now);
  const year = now.getFullYear();
  const month = now.getMonth();

  const dayState = getDayState(profile, availability, todayISO, goals, allCases);
  const daily = getDailyGoalProgress(goals, allCases, todayISO);
  const monthly = getMonthlyGoalProgress(goals, allCases, year, month);
  const pace = getRequiredDailyPace(goals, allCases, year, month, availability, profile.workingDays, todayISO);
  const effective = getEffectiveWorkDays(availability, year, month, profile.workingDays);
  const availabilitySummary = getAvailabilitySummary(availability, year, month, profile.workingDays);
  const suggestions = buildPersonalSuggestions({ goals, cases: allCases, availability, profile, year, month, todayISO, settings });
  const perDay = getPerEffectiveDayMetrics(allCases, availability, year, month, profile.workingDays);

  const greeting = useMemo(() => getDailyGreeting({ profile, date: now }), [profile, now]);
  const encouragement = useMemo(
    () =>
      buildEncouragementMessage({
        profile,
        dailyMet: (daily.cases.enabled ? daily.cases.met : true) && (daily.reports.enabled ? daily.reports.met : true) && (daily.firmas?.enabled ? daily.firmas.met : true),
        now,
      }),
    [profile, daily.cases.met, daily.reports.met, now]
  );

  // Microinteracciones de objetivos: celebración discreta al cumplir la meta diaria.
  const prevMetaRef = useRef(false);
  useEffect(() => {
    const cumplida = daily.cases.enabled && daily.cases.met;
    const antes = prevMetaRef.current;
    prevMetaRef.current = cumplida;
    if (cumplida && !antes && settings.goalMicroInteractions !== false) {
      useCelebrationStore.getState().celebrate("¡Meta diaria de casos cumplida!", { pieces: 36 });
    }
  }, [daily.cases.enabled, daily.cases.met, settings.goalMicroInteractions]);

  // Recordatorios discretos de jornada y metas (máximo uno por día y tipo).
  useEffect(() => {
    if (settings.jornadaReminders === false && settings.goalReminders === false) return undefined;
    const check = () => {
      const ahora = new Date();
      const mins = ahora.getHours() * 60 + ahora.getMinutes();
      if (settings.jornadaReminders !== false && profile.workSchedule?.end) {
        const [h, m] = profile.workSchedule.end.split(":").map(Number);
        if (!Number.isNaN(h)) {
          const diff = h * 60 + (m || 0) - mins;
          const flag = `op-rem-jornada-${todayISO}`;
          if (diff > 0 && diff <= 30 && !sessionStorage.getItem(flag)) {
            sessionStorage.setItem(flag, "1");
            showToast(`Tu jornada habitual termina en ${diff} minutos.`, "info");
          }
        }
      }
      if (settings.goalReminders !== false && daily.cases.enabled && !daily.cases.met) {
        const restantes = daily.cases.target - daily.cases.current;
        const flag = `op-rem-meta-${todayISO}`;
        if (restantes > 0 && restantes <= 2 && mins >= 14 * 60 && !sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, "1");
          showToast(
            `Te falta${restantes === 1 ? "" : "n"} ${restantes} caso${restantes === 1 ? "" : "s"} para cumplir tu meta diaria.`,
            "info"
          );
        }
      }
    };
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [
    settings.jornadaReminders,
    settings.goalReminders,
    profile.workSchedule?.end,
    daily.cases.enabled,
    daily.cases.met,
    daily.cases.current,
    daily.cases.target,
    todayISO,
    showToast,
  ]);

  const metaDiariaCumplida = (daily.cases.enabled && daily.cases.met) && (daily.reports.enabled && daily.reports.met) && (!daily.firmas?.enabled || daily.firmas.met);

  const sections = [
    { key: "hoy", label: "Hoy", icon: Sun },
    { key: "perfil", label: "Mi perfil", icon: UserCircle2 },
    { key: "disponibilidad", label: "Mi disponibilidad", icon: CalendarDays },
    { key: "metas", label: "Mis metas", icon: Target },
    { key: "accesos", label: "Accesos personales", icon: KeyRound },
  ];

  return (
    <div className="space-y-4">
      {/* ENCABEZADO */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              backgroundColor: "var(--color-accent)",
              width: "42px",
              height: "42px",
              color: "var(--color-text-on-accent)",
            }}
          >
            <UserCircle2 size={24} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Mi Espacio
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Hoy — tu centro de trabajo diario.
            </div>
          </div>
          {dayState && (
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
          )}
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 pill-lg transition-colors"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            <FileDown size={12} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* SUGERENCIAS */}
      {suggestions.length > 0 && (
        <ConfigTip title="Sugerencias para vos">
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text)" }}>
                <ArrowRight size={12} className="mt-0.5 flex-shrink-0" style={{ color: suggestionColor(s.type) }} />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </ConfigTip>
      )}

      {/* NAVEGACIÓN DE SECCIONES */}
      <NavDock
        items={sections.map((s) => ({ id: s.key, label: s.label, icon: s.icon }))}
        active={activeSection}
        onSelect={setActiveSection}
        ariaLabel="Secciones de Mi Espacio"
      />

      {/* CONTENIDO POR SECCIÓN */}
      <div className="space-y-4">
        {activeSection === "hoy" && (
          <TodayCenter
            profile={profile}
            availability={availability}
            goals={goals}
            cases={allCases}
            notes={notes}
            events={events}
            dayState={dayState}
            daily={daily}
            monthly={monthly}
            pace={pace}
            effective={effective}
            todayISO={todayISO}
            now={now}
            onChangeView={onChangeView}
            showToast={showToast}
            showPace={settings.showPace !== false}
            settings={settings}
            showInsight={config?.insightEnJornada !== false}
            greeting={greeting}
            encouragement={encouragement}
            metaDiariaCumplida={metaDiariaCumplida}
            credentials={state.credentials}
            onVerCaso={onVerCaso}
            onNavigateToEvent={onNavigateToEvent}
            onNavigateMetas={() => setActiveSection("metas")}
            onNavigateAccesos={() => setActiveSection("accesos")}
            onNuevoCaso={onNuevoCaso}
            onNuevoReporte={onNuevoReporte}
            onNuevaNota={onNuevaNota}
            onNuevoEvento={onNuevoEvento}
            onBuscar={onBuscar}
            onExportar={onExportar}
          />
        )}
        {activeSection === "perfil" && (
          <ProfileCard profile={profile} updateProfile={state.updateProfile} showToast={showToast} />
        )}
        {activeSection === "disponibilidad" && (
          <AvailabilityCard availability={availability} updateAvailability={state.updateAvailability} showToast={showToast} />
        )}
        {activeSection === "metas" && (
          <GoalsSection
            goals={goals}
            updateGoals={state.updateGoals}
            daily={daily}
            monthly={monthly}
            pace={pace}
            effective={effective}
            perDay={perDay}
            availabilitySummary={availabilitySummary}
            cases={allCases}
            availability={availability}
            profile={profile}
            showToast={showToast}
            showPace={settings.showPace !== false}
          />
        )}
        {activeSection === "accesos" && (
          <CredentialsSection
            credentials={state.credentials}
            createCredential={state.createCredential}
            editCredential={state.editCredential}
            removeCredential={state.removeCredential}
            showToast={showToast}
          />
        )}
      </div>

      <Suspense fallback={null}>
        <PdfExportModal
          open={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          config={config}
          casos={allCases}
          eventos={events}
          showToast={showToast}
        />
      </Suspense>
    </div>
  );
}

function dayStateColor(key) {
  switch (key) {
    case DAY_STATES.GOAL_MET: return "var(--color-success)";
    case DAY_STATES.IN_WORKDAY: return "var(--color-accent)";
    case DAY_STATES.NOT_STARTED: return "var(--color-text-muted)";
    case DAY_STATES.ENDED: return "var(--color-warning)";
    case DAY_STATES.VACATION: return "var(--color-accent)";
    case DAY_STATES.HOLIDAY: return "var(--color-warning)";
    case DAY_STATES.ABSENCE: return "var(--color-danger)";
    case DAY_STATES.DAY_OFF: return "var(--color-text-muted)";
    default: return "var(--color-text-muted)";
  }
}

function suggestionColor(type) {
  switch (type) {
    case "success": return "var(--color-success)";
    case "warning": return "var(--color-warning)";
    case "danger": return "var(--color-danger)";
    default: return "var(--color-accent)";
  }
}

export default OperatorView;