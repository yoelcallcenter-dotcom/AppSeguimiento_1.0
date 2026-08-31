/**
 * attentionRules.js — Motor centralizado de reglas determinísticas para
 * "casos que requieren atención" y "próximas acciones".
 *
 * Sin IA, sin ML, sin predicciones. Cada regla es explícita, transparente y justificable.
 */

const DEFAULT_CONFIG = {
  staleDays: 15,
  upcomingDays: 3,
  maxProximasAcciones: 8,
  pendingStates: ['Cita virtual', 'Cita presencial', 'Lo piensa', 'Pendiente'],
  activeStates: ['Activo', 'En proceso', 'Contacto', 'Cita virtual', 'Cita presencial', 'Lo piensa', 'Pendiente'],
};

function resolveConfig(overrides) {
  return { ...DEFAULT_CONFIG, ...overrides };
}

function todayMidnight(todayISO) {
  return new Date(todayISO + 'T00:00:00');
}

function daysBetween(dateA, dateB) {
  const msPerDay = 86400000;
  return Math.floor((dateB.getTime() - dateA.getTime()) / msPerDay);
}

function formatDaysText(days) {
  if (days === 0) return 'hoy';
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
}

function caseLastActivityDate(caso) {
  const candidates = [caso.lastActivityAt, caso.updatedAt, caso.fecha].filter(Boolean);
  if (candidates.length === 0) return null;
  return new Date(candidates.sort().pop());
}

function caseIsStale(caso, todayISO, thresholdDays) {
  const lastActivity = caseLastActivityDate(caso);
  if (!lastActivity) return false;
  const today = todayMidnight(todayISO);
  return daysBetween(lastActivity, today) >= thresholdDays;
}

function caseDaysSinceActivity(caso, todayISO) {
  const lastActivity = caseLastActivityDate(caso);
  if (!lastActivity) return 999;
  const today = todayMidnight(todayISO);
  return daysBetween(lastActivity, today);
}

// ============================================================
// CASOS SIN ACTIVIDAD (STALE)
// ============================================================

export function getStaleCases(cases, todayISO, thresholdDays) {
  const cfg = resolveConfig({ staleDays: thresholdDays });
  if (!cases || !todayISO) return [];
  return cases
    .filter((c) => {
      const isActive = cfg.activeStates.includes(c.estado);
      return isActive && caseIsStale(c, todayISO, cfg.staleDays);
    })
    .map((caso) => ({
      caso,
      daysSinceActivity: caseDaysSinceActivity(caso, todayISO),
      lastActivityDate: caseLastActivityDate(caso),
    }))
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
}

// ============================================================
// EVENTOS VENCIDOS
// ============================================================

export function getOverdueEvents(events, todayISO) {
  if (!events || !todayISO) return [];
  const today = todayMidnight(todayISO);
  return events
    .filter((e) => {
      const start = new Date(e.startDate || e.fecha);
      const status = (e.status || '').toLowerCase();
      const isCompleted = status === 'completado' || status === 'completada' || status === 'completed';
      return !isNaN(start.getTime()) && start < today && !isCompleted;
    })
    .map((event) => ({
      event,
      daysOverdue: daysBetween(new Date(event.startDate || event.fecha), today),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// ============================================================
// EVENTOS DE HOY
// ============================================================

export function getTodayEvents(events, todayISO) {
  if (!events || !todayISO) return [];
  return events.filter((e) => {
    const start = e.startDate || e.fecha || '';
    return start.slice(0, 10) === todayISO;
  });
}

// ============================================================
// EVENTOS PRÓXIMOS (HOY + N DÍAS)
// ============================================================

export function getUpcomingEvents(events, todayISO, daysAhead) {
  const cfg = resolveConfig({ upcomingDays: daysAhead });
  if (!events || !todayISO) return [];
  const today = todayMidnight(todayISO);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + cfg.upcomingDays);
  return events
    .filter((e) => {
      const start = new Date(e.startDate || e.fecha);
      const status = (e.status || '').toLowerCase();
      const isCompleted = status === 'completado' || status === 'completada' || status === 'completed';
      return !isNaN(start.getTime()) && start >= today && start <= limit && !isCompleted;
    })
    .map((event) => {
      const start = new Date(event.startDate || event.fecha);
      return {
        event,
        daysUntil: daysBetween(today, start),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// ============================================================
// CASOS SIN REPORTE
// ============================================================

export function getCasesWithoutReport(cases) {
  if (!cases) return [];
  return cases.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0);
}

// ============================================================
// CASOS SIN ESTUDIO ASIGNADO
// ============================================================

export function getUnassignedCases(cases) {
  if (!cases) return [];
  return cases.filter((c) => !c.estudioJuridico || c.estudioJuridico.trim() === '');
}

// ============================================================
// CASOS QUE REQUIEREN ATENCIÓN (CONSOLIDADO)
// ============================================================

export function getCasesNeedingAttention(cases, notes, events, todayISO, overrides) {
  const cfg = resolveConfig(overrides);
  const items = [];

  const stale = getStaleCases(cases, todayISO, cfg.staleDays);
  for (const { caso, daysSinceActivity } of stale) {
    items.push({
      caso,
      reason: 'Sin actividad reciente',
      reasonDetail: `Sin actividad registrada desde hace ${formatDaysText(daysSinceActivity)}`,
      severity: daysSinceActivity >= 30 ? 'danger' : 'warning',
      actionType: 'open_case',
      group: 'stale',
    });
  }

  const sinReporte = getCasesWithoutReport(cases);
  for (const caso of sinReporte) {
    if (items.some((i) => i.caso.id === caso.id)) continue;
    items.push({
      caso,
      reason: 'Sin reporte',
      reasonDetail: 'No tiene reportes cargados en el historial',
      severity: 'info',
      actionType: 'open_case',
      group: 'sinReporte',
    });
  }

  const unassigned = getUnassignedCases(cases);
  for (const caso of unassigned) {
    if (items.some((i) => i.caso.id === caso.id)) continue;
    items.push({
      caso,
      reason: 'Sin estudio asignado',
      reasonDetail: 'No tiene estudio jurídico asignado',
      severity: 'info',
      actionType: 'open_case',
      group: 'unassigned',
    });
  }

  const overdue = getOverdueEvents(events, todayISO);
  for (const { event, daysOverdue } of overdue) {
    const linkedCaseId = (event.relatedCaseIds || [])[0];
    const caso = linkedCaseId ? cases.find((c) => String(c.id) === String(linkedCaseId)) : null;
    items.push({
      caso,
      event,
      reason: 'Evento vencido',
      reasonDetail: `Evento "${event.title || 'Sin título'}" vence hace ${formatDaysText(daysOverdue)}`,
      severity: 'danger',
      actionType: caso ? 'open_case' : 'open_event',
      group: 'overdueEvent',
    });
  }

  return items;
}

// ============================================================
// PRÓXIMAS ACCIONES PRIORIZADAS
// ============================================================

export function getProximasAcciones(cases, notes, events, todayISO, overrides) {
  const cfg = resolveConfig(overrides);
  const acciones = [];
  const usedIds = new Set();

  const overdue = getOverdueEvents(events, todayISO);
  for (const { event, daysOverdue } of overdue) {
    const id = `overdue-${event.id}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    acciones.push({
      id,
      type: 'overdue_event',
      icon: 'AlertTriangle',
      title: event.title || 'Sin título',
      detail: `Vence hace ${formatDaysText(daysOverdue)}`,
      severity: 'danger',
      action: { type: 'open_event', event },
    });
  }

  const todayEvts = getTodayEvents(events, todayISO);
  for (const event of todayEvts) {
    const id = `today-${event.id}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    acciones.push({
      id,
      type: 'today_event',
      icon: 'Calendar',
      title: event.title || 'Sin título',
      detail: 'Evento programado para hoy',
      severity: 'warning',
      action: { type: 'open_event', event },
    });
  }

  const stale = getStaleCases(cases, todayISO, cfg.staleDays);
  for (const { caso, daysSinceActivity } of stale) {
    const id = `stale-${caso.id}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    acciones.push({
      id,
      type: 'stale_case',
      icon: 'Clock',
      title: caso.nombre || 'Sin nombre',
      detail: `Sin actividad desde hace ${formatDaysText(daysSinceActivity)}`,
      severity: daysSinceActivity >= 30 ? 'danger' : 'warning',
      action: { type: 'open_case', caso },
    });
  }

  const sinReporte = getCasesWithoutReport(cases);
  for (const caso of sinReporte) {
    const id = `sinReporte-${caso.id}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    acciones.push({
      id,
      type: 'no_report',
      icon: 'FileText',
      title: caso.nombre || 'Sin nombre',
      detail: 'Sin reportes cargados',
      severity: 'info',
      action: { type: 'open_case', caso },
    });
  }

  const unassigned = getUnassignedCases(cases);
  for (const caso of unassigned) {
    const id = `unassigned-${caso.id}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    acciones.push({
      id,
      type: 'unassigned',
      icon: 'User',
      title: caso.nombre || 'Sin nombre',
      detail: 'Sin estudio jurídico asignado',
      severity: 'info',
      action: { type: 'open_case', caso },
    });
  }

  return acciones.slice(0, cfg.maxProximasAcciones);
}

// ============================================================
// DATOS PARA CIERRE DE JORNADA
// ============================================================

export function getDayClosureData(cases, notes, events, goals, todayISO) {
  if (!cases || !todayISO) return null;

  const casesActiveToday = cases.filter((c) => {
    const created = (c.createdAt || '').slice(0, 10);
    const lastActivity = (c.lastActivityAt || '').slice(0, 10);
    return created === todayISO || lastActivity === todayISO;
  });

  const firmasHoy = cases.filter((c) => {
    if (!c.reporteHistory || c.reporteHistory.length === 0) return false;
    return c.reporteHistory.some((r) => {
      const fecha = (r.fecha || '').slice(0, 10);
      return fecha === todayISO;
    });
  });

  const eventosHoy = getTodayEvents(events, todayISO);
  const eventosVencidos = getOverdueEvents(events, todayISO);
  const proximos = getUpcomingEvents(events, todayISO, 7);
  const staleCases = getStaleCases(cases, todayISO, 15);

  const goalProgress = goals
    ? {
        firmas: {
          objetivo: goals.firmas || 0,
          resultado: firmasHoy.length,
          completado: (goals.firmas || 0) > 0 && firmasHoy.length >= goals.firmas,
        },
        casos: {
          objetivo: goals.casos || 0,
          resultado: casesActiveToday.length,
          completado: (goals.casos || 0) > 0 && casesActiveToday.length >= goals.casos,
        },
      }
    : null;

  return {
    fecha: todayISO,
    casosTrabajados: casesActiveToday.length,
    firmasRegistradas: firmasHoy.length,
    eventosCompletados: eventosHoy.filter(
      (e) => (e.status || '').toLowerCase() === 'completado' || (e.status || '').toLowerCase() === 'completada'
    ).length,
    eventosPendientes: eventosHoy.length,
    eventosVencidos: eventosVencidos.length,
    proximosCompromisos: proximos.length,
    casosSinActividad: staleCases.length,
    goalProgress,
    casosActivos: casesActiveToday.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      estado: c.estado,
    })),
    proximosEventos: proximos.slice(0, 5).map(({ event, daysUntil }) => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate || event.fecha,
      daysUntil,
    })),
    eventosVencidosDetalle: eventosVencidos.slice(0, 5).map(({ event, daysOverdue }) => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate || event.fecha,
      daysOverdue,
    })),
  };
}

// ============================================================
// SEGUIMIENTOS PENDIENTES
// ============================================================

export function getSeguimientosPendientes(cases, events, todayISO, overrides) {
  const cfg = resolveConfig(overrides);
  if (!cases || !todayISO) return [];

  return cases
    .filter((c) => {
      const isPending = cfg.pendingStates.includes(c.estado);
      return isPending && caseIsStale(c, todayISO, 3);
    })
    .map((caso) => ({
      caso,
      daysSinceActivity: caseDaysSinceActivity(caso, todayISO),
    }))
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
    .slice(0, 10);
}
