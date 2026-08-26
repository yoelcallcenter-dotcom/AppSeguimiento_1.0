import React, { useState, useMemo, useEffect, useRef } from "react";
import { UserCircle2, CalendarDays, Target, KeyRound, Lightbulb, Sun, ArrowRight, Clock, CalendarClock, Sparkles, MessagesSquare, Trophy, Zap, FileDown } from "lucide-react";
import useCelebrationStore from "../../core/celebrations/celebrationStore";
import { useOperatorState } from "./useOperatorState";
import { getDayState, getDailyGoalProgress, getMonthlyGoalProgress, getRequiredDailyPace, getEffectiveWorkDays, getAvailabilitySummary, buildPersonalSuggestions, getPerEffectiveDayMetrics } from "./operatorMetrics";
import { DAY_STATES, DAY_LABELS } from "./operatorDefaults";
import { getDailyGreeting, buildEncouragementMessage } from "./operatorMessages";
import { ProfileCard } from "./components/ProfileCard";
import { AvailabilityCard } from "./components/AvailabilityCard";
import { GoalsSection } from "./components/GoalsSection";
import { CredentialsSection } from "./components/CredentialsSection";
import { MiJornadaView } from "./MiJornadaView";
import { PdfExportModal } from "./PdfExportModal";
import { readOperatorCases } from "./operatorStore";

export function OperatorView({ config, casos, showToast, onChangeView }) {
  const state = useOperatorState();
  const { profile, availability, goals, settings } = state;

  const [activeSection, setActiveSection] = useState("hoy");
  const [showPdfModal, setShowPdfModal] = useState(false);

  const allCases = useMemo(() => {
    const stored = readOperatorCases();
    if (Array.isArray(stored) && stored.length) return stored;
    return casos || [];
  }, [casos]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const dayState = getDayState(profile, availability, todayISO, goals, allCases);
  const daily = getDailyGoalProgress(goals, allCases, todayISO);
  const monthly = getMonthlyGoalProgress(goals, allCases, year, month);
  const pace = getRequiredDailyPace(goals, allCases, year, month, availability, profile.workingDays, todayISO);
  const effective = getEffectiveWorkDays(availability, year, month, profile.workingDays);
  const availabilitySummary = getAvailabilitySummary(availability, year, month);
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
    { key: "hoy", label: "Mi Jornada", icon: Sun },
    { key: "perfil", label: "Mi perfil", icon: UserCircle2 },
    { key: "disponibilidad", label: "Mi disponibilidad", icon: CalendarDays },
    { key: "metas", label: "Mis metas", icon: Target },
    { key: "accesos", label: "Accesos personales", icon: KeyRound },
  ];

  const dayLabel = DAY_LABELS[now.getDay()];

  return (
    <div className="space-y-4">
      {/* ENCABEZADO */}
      <div
        className="rounded-lg p-4"
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
              color: "#14181F",
            }}
          >
            <UserCircle2 size={24} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Mi Espacio
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Tu jornada, tus objetivos y tu organización personal.
            </div>
          </div>
          {dayState && (
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
          )}
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
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

        <div
          className="mt-3 rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
          style={{ backgroundColor: "var(--color-accent)11", border: "1px solid var(--color-accent)44" }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} className="flex-shrink-0" style={{ color: "var(--color-accent)" }} />
            <span className="text-sm font-bold truncate" style={{ color: "var(--color-accent)" }}>
              {greeting.text}
            </span>
          </span>
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {dayLabel} {now.getDate()} de {now.toLocaleDateString("es-AR", { month: "long" })} · {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")} hs
          </span>
        </div>

        {(metaDiariaCumplida || encouragement) && (
          <div className="mt-2 space-y-2">
            {metaDiariaCumplida && (
              <div
                className="rounded-md px-3 py-2 flex items-center gap-2 animate-fade-in"
                style={{ backgroundColor: "var(--color-success)11", border: "1px solid var(--color-success)44" }}
                role="status"
              >
                <Trophy size={15} className="flex-shrink-0" style={{ color: "var(--color-success)" }} />
                <div className="text-xs font-bold" style={{ color: "var(--color-success)" }}>
                  ¡Meta diaria cumplida! Completaste tus objetivos de casos y reportes de hoy.
                </div>
              </div>
            )}
            {encouragement && (
              <div
                className="rounded-md px-3 py-2 flex items-start gap-2 animate-fade-in"
                style={{ backgroundColor: "var(--color-warning)11", border: "1px solid var(--color-warning)44" }}
                role="status"
              >
                <MessagesSquare size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
                <div className="text-xs font-semibold" style={{ color: "var(--color-warning)" }}>
                  {encouragement.text}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className="mt-3 pt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {profile.workSchedule?.start && (
            <span className="flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
              <CalendarClock size={13} color="var(--color-accent)" />
              Jornada: {profile.workSchedule.start} — {profile.workSchedule.end || "..."}
            </span>
          )}
          <span className="flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
            <Target size={13} color="var(--color-accent)" />
            Meta diaria: {daily.cases.enabled ? `${daily.cases.current}/${daily.cases.target}` : "—"} ·{" "}
            {daily.reports.enabled ? `${daily.reports.current}/${daily.reports.target}` : "—"} ·{" "}
            {daily.firmas?.enabled ? `${daily.firmas.current}/${daily.firmas.target}` : "—"}
          </span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
            <CalendarDays size={13} color="var(--color-accent)" />
            {effective.effective} / {effective.scheduled} días efectivos · {availabilitySummary.totalDays} ausencias
          </span>
        </div>
      </div>

      {/* SUGERENCIAS */}
      {suggestions.length > 0 && (
        <div
          className="rounded-lg p-3 space-y-2"
          style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
            <Lightbulb size={14} /> Sugerencias para vos
          </div>
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text)" }}>
              <ArrowRight size={12} className="mt-0.5 flex-shrink-0" style={{ color: suggestionColor(s.type) }} />
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* NAVEGACIÓN DE SECCIONES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {sections.map((s) => {
          const active = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex flex-col items-center gap-1.5 text-xs font-semibold px-3 py-3 rounded-xl transition-shadow transition-transform transition-colors ${
                active
                  ? "text-[#14181F] shadow-md scale-[1.03]"
                  : "text-[var(--color-text-muted)] hover:opacity-80 hover:scale-[1.02]"
              }`}
              style={{
                backgroundColor: active ? "var(--color-accent)" : "var(--color-surface)",
                border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              <s.icon size={18} strokeWidth={2} style={{ color: active ? "#14181F" : "var(--color-accent)" }} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENIDO POR SECCIÓN */}
      <div className="space-y-4">
        {activeSection === "hoy" && (
          <MiJornadaView
            profile={profile}
            availability={availability}
            goals={goals}
            cases={allCases}
            dayState={dayState}
            daily={daily}
            monthly={monthly}
            pace={pace}
            effective={effective}
            perDay={perDay}
            todayISO={todayISO}
            onChangeView={onChangeView}
            showToast={showToast}
            showPace={settings.showPace !== false}
            settings={settings}
            showInsight={config?.insightEnJornada !== false}
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

      <PdfExportModal
        open={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        config={config}
        casos={allCases}
        showToast={showToast}
      />
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