/**
 * ProductivityWidget.jsx
 * Widget opcional para el dashboard que muestra los objetivos diarios,
 * memoria operativa ("Continuar donde lo dejaste") y micro-analítica personal.
 */

import React, { useState, useEffect } from 'react';
import { Target, ArrowRight, Play, TrendingUp, FileText, Lightbulb } from 'lucide-react';
import { getGoalsState, getContextMemory, getProductivitySettings } from './productivityStore';
import {
  getOperatorProfile,
  getOperatorAvailability,
  getOperatorGoals,
  getOperatorSettings,
  readOperatorCases,
} from '../operator/operatorStore';
import { buildPersonalSuggestions } from '../operator/operatorMetrics';

function suggestionColor(type) {
  switch (type) {
    case 'success': return 'var(--color-success)';
    case 'warning': return 'var(--color-warning)';
    case 'danger': return 'var(--color-danger)';
    default: return 'var(--color-accent)';
  }
}

export function ProductivityWidget({ onOpenCaso, onChangeView, dayISO }) {
  const [goals, setGoals] = useState(() => getGoalsState(dayISO));
  const [memory, setMemory] = useState(() => getContextMemory());
  const settings = getProductivitySettings();

  useEffect(() => {
    setGoals(getGoalsState(dayISO));
    setMemory(getContextMemory());
  }, [dayISO]);

  const suggestions = settings.suggestionsEnabled
    ? buildPersonalSuggestions({
        goals: getOperatorGoals(),
        cases: readOperatorCases(),
        availability: getOperatorAvailability(),
        profile: getOperatorProfile(),
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        todayISO: dayISO || new Date().toISOString().slice(0, 10),
        settings: getOperatorSettings(),
      })
    : [];

  if (
    !settings.goalsEnabled &&
    !settings.memoryEnabled &&
    !settings.analyticsEnabled &&
    suggestions.length === 0
  ) {
    return null;
  }

  const diaLabel = dayISO ? `día ${dayISO.slice(-2)}/${dayISO.slice(5, 7)}` : "hoy";
  const casesProgress = Math.min(100, Math.round(((goals.casesLoadedToday || 0) / (goals.dailyTarget || 1)) * 100));
  const reportsTarget = goals.reportsTarget || 0;
  const reportsProgress = reportsTarget > 0
    ? Math.min(100, Math.round(((goals.reportsDoneToday || 0) / reportsTarget) * 100))
    : 100;
  const lastCase = memory.lastCases && memory.lastCases.length > 0 ? memory.lastCases[0] : null;

  return (
    <div
      className="rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* 1. OBJETIVOS PERSONALES */}
      {settings.goalsEnabled && (
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
              <Target size={14} style={{ color: 'var(--color-accent)' }} /> Meta Diaria
            </span>
<span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            {goals.casesLoadedToday || 0} / {goals.dailyTarget || 0} casos cargados {diaLabel}
          </span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden mb-2" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${casesProgress}%`,
                backgroundColor: casesProgress >= 100 ? 'var(--color-success)' : 'var(--color-accent)',
              }}
            />
          </div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {casesProgress >= 100
              ? 'Meta de casos cargados completada.'
              : `Faltan ${Math.max(0, (goals.dailyTarget || 0) - (goals.casesLoadedToday || 0))} casos para la meta.`}
          </div>

          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
              <FileText size={13} style={{ color: 'var(--color-accent)' }} /> Reportes
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {goals.reportsDoneToday || 0} / {reportsTarget} reportes
            </span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${reportsProgress}%`,
                backgroundColor: reportsProgress >= 100 ? 'var(--color-success)' : 'var(--color-accent)',
              }}
            />
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {reportsTarget > 0
              ? `Meta de reportes del día hábil anterior (${goals.prevDayISO || 'sin casos previos'}).`
              : 'Sin casos del día hábil anterior. Meta de reportes completada.'}
          </div>
        </div>
      )}

      {/* 2. CONTINUAR DONDE LO DEJASTE */}
      {settings.memoryEnabled && lastCase && (
        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-r-0 md:border-r border-[var(--color-border)] pt-3 md:pt-0 md:px-4">
          <div className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2" style={{ color: 'var(--color-text)' }}>
            <Play size={14} style={{ color: 'var(--color-success)' }} /> Continuar donde lo dejaste
          </div>
          <div
            onClick={() => onOpenCaso && onOpenCaso(lastCase.id)}
            className="p-2 rounded-lg cursor-pointer transition-colors hover:opacity-80 flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-surface2)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <div className="text-xs font-bold truncate max-w-[180px]" style={{ color: 'var(--color-text)' }}>
                {lastCase.nombre}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {lastCase.estado} • {lastCase.telefono || 'Sin teléfono'}
              </div>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--color-accent)' }} />
          </div>
        </div>
      )}

      {/* 3. MICRO-ANALÍTICA */}
      {settings.analyticsEnabled && (
        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:px-4">
          <div className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider mb-2" style={{ color: 'var(--color-text)' }}>
            <TrendingUp size={14} style={{ color: 'var(--color-accent)' }} /> Micro-analítica {diaLabel}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-extrabold" style={{ color: 'var(--color-accent)' }}>
                {goals.casesMovedToday || 0}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Movimientos</div>
            </div>
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-extrabold" style={{ color: 'var(--color-success)' }}>
                {goals.stateChangesToday || 0}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Cambios estado</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUGERENCIAS PERSONALES */}
      {settings.suggestionsEnabled && suggestions.length > 0 && (
        <div className="md:col-span-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-accent)' }}>
            <Lightbulb size={14} /> Sugerencias
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {suggestions.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-start gap-1.5 text-[11px] p-1.5 rounded-md" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}>
                <ArrowRight size={11} className="mt-0.5 flex-shrink-0" style={{ color: suggestionColor(s.type) }} />
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}