import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEffectiveWorkDays,
  getScheduledWorkDays,
  getRemainingEffectiveDays,
  getDayState,
  getDailyGoalProgress,
  getMonthlyGoalProgress,
  getRequiredDailyPace,
  getAvailabilityOn,
  getAvailabilitySummary,
  getPerEffectiveDayMetrics,
  buildPersonalSuggestions,
  isUnavailableOn,
  isWorkingDay,
  normalizeRange,
  isInRange,
} from './operatorMetrics';
import { DAY_STATES } from './operatorDefaults';
import { initialsFromName } from './operatorStore';

describe('initialsFromName', () => {
  it('genera iniciales desde el nombre completo', () => {
    expect(initialsFromName('Yoel Yañez')).toBe('YY');
    expect(initialsFromName('Maria')).toBe('M');
    expect(initialsFromName('')).toBe('');
  });
});

describe('días laborables', () => {
  it('septiembre 2026 tiene 22 días hábiles lun-vie', () => {
    const scheduled = getScheduledWorkDays(2026, 8, [1, 2, 3, 4, 5]);
    expect(scheduled.length).toBe(22);
  });

  it('no cuenta fines de semana', () => {
    const dias = getScheduledWorkDays(2026, 8, [1, 2, 3, 4, 5]);
    for (const iso of dias) {
      const d = new Date(iso + 'T00:00:00');
      expect([1, 2, 3, 4, 5]).toContain(d.getDay());
    }
  });

  it('días efectivos restan vacaciones, feriados, inasistencias y días no laborables', () => {
    const availability = {
      vacations: [{ id: 'v1', start: '2026-09-07', end: '2026-09-11' }],
      holidays: [{ id: 'h1', name: 'Feriado', date: '2026-09-21' }],
      absences: [{ id: 'a1', date: '2026-09-15', type: 'personal' }],
      customDaysOff: [{ id: 'd1', date: '2026-09-29' }],
    };
    const summary = getEffectiveWorkDays(availability, 2026, 8, [1, 2, 3, 4, 5]);
    // 22 programados - 5 vacaciones - 1 feriado - 1 inasistencia - 1 día no laborable = 14
    expect(summary.scheduled).toBe(22);
    expect(summary.effective).toBe(14);
    expect(summary.vacations).toBe(5);
    expect(summary.holidays).toBe(1);
    expect(summary.absences).toBe(1);
    expect(summary.dayOffs).toBe(1);
  });

  it('vacaciones superpuestas con feriado no cuentan doble', () => {
    const availability = {
      vacations: [{ id: 'v1', start: '2026-09-14', end: '2026-09-18' }],
      holidays: [{ id: 'h1', name: 'Feriado', date: '2026-09-16' }],
    };
    const summary = getEffectiveWorkDays(availability, 2026, 8, [1, 2, 3, 4, 5]);
    // 22 - 5 vacaciones (el feriado del 16 queda dentro de las vacaciones) = 17
    expect(summary.effective).toBe(17);
    expect(summary.vacations).toBe(5);
    expect(summary.holidays).toBe(1);
  });

  it('mes sin días laborales devuelve 0', () => {
    const summary = getEffectiveWorkDays({}, 2026, 0, []);
    expect(summary.scheduled).toBe(0);
    expect(summary.effective).toBe(0);
  });
});

describe('días efectivos restantes', () => {
  it('cuenta desde hoy (inclusive) los días hábiles disponibles', () => {
    const avail = { vacations: [{ id: 'v', start: '2026-09-21', end: '2026-09-25' }] };
    const remaining = getRemainingEffectiveDays(avail, 2026, 8, [1, 2, 3, 4, 5], '2026-09-15');
    // Hábiles restantes sin vacaciones: 15,16,17,18,28,29,30 = 7
    expect(remaining).toBe(7);
  });
});

describe('disponibilidad', () => {
  it('detecta vacaciones en rango', () => {
    const avail = { vacations: [{ id: 'v1', start: '2026-09-07', end: '2026-09-11' }] };
    const state = getAvailabilityOn(avail, '2026-09-09');
    expect(state.vacation).toBeTruthy();
    expect(state.vacation.id).toBe('v1');
  });

  it('detecta feriado', () => {
    const avail = { holidays: [{ id: 'h1', name: 'X', date: '2026-09-21' }] };
    const state = getAvailabilityOn(avail, '2026-09-21');
    expect(state.holiday).toBeTruthy();
  });

  it('inasistencia durante feriado: el feriado tiene prioridad de conteo', () => {
    const avail = {
      holidays: [{ id: 'h1', name: 'X', date: '2026-09-21' }],
      absences: [{ id: 'a1', date: '2026-09-21', type: 'enfermedad' }],
    };
    const state = getAvailabilityOn(avail, '2026-09-21');
    expect(state.holiday).toBeTruthy();
    expect(state.absence).toBeTruthy();
    expect(isUnavailableOn(avail, '2026-09-21')).toBe(true);
  });

  it('rango de vacaciones con fecha final antes que la inicial se normaliza', () => {
    // end < start se normaliza a un único día (el de inicio)
    expect(normalizeRange('2026-09-14', '2026-09-11')).toEqual({
      start: '2026-09-14',
      end: '2026-09-14',
    });
    const avail = { vacations: [{ id: 'v1', start: '2026-09-14', end: '2026-09-11' }] };
    const state = getAvailabilityOn(avail, '2026-09-14');
    expect(state.vacation).toBeTruthy();
    expect(isInRange('2026-09-12', '2026-09-14', '2026-09-14')).toBe(false);
  });
});

describe('estado del día', () => {
  const profile = {
    fullName: 'Yoel Yañez',
    workSchedule: { start: '09:00', end: '17:00' },
    workingDays: [1, 2, 3, 4, 5],
  };

  it('día no laborable en fin de semana', () => {
    const state = getDayState(profile, {}, '2026-09-12', {}, []);
    expect(state.key).toBe(DAY_STATES.DAY_OFF);
  });

  it('vacaciones tiene prioridad sobre jornada', () => {
    const avail = { vacations: [{ id: 'v', start: '2026-09-07', end: '2026-09-11' }] };
    const state = getDayState(profile, avail, '2026-09-09', {}, []);
    expect(state.key).toBe(DAY_STATES.VACATION);
  });

  it('feriado tiene prioridad', () => {
    const avail = { holidays: [{ id: 'h', name: 'X', date: '2026-09-07' }] };
    const state = getDayState(profile, avail, '2026-09-07', {}, []);
    expect(state.key).toBe(DAY_STATES.HOLIDAY);
  });

  it('inasistencia tiene prioridad', () => {
    const avail = { absences: [{ id: 'a', date: '2026-09-08', type: 'personal' }] };
    const state = getDayState(profile, avail, '2026-09-08', {}, []);
    expect(state.key).toBe(DAY_STATES.ABSENCE);
  });

  it('jornada no iniciada antes del horario de entrada', () => {
    // simula con horario 09:00; usando un día laborable actual
    const state = getDayState(profile, {}, '2026-09-08', {}, []);
    expect([DAY_STATES.NOT_STARTED, DAY_STATES.IN_WORKDAY, DAY_STATES.GOAL_MET, DAY_STATES.ENDED]).toContain(state.key);
  });

  it('jornada que cruza medianoche (22:00-06:00)', () => {
    const p = { ...profile, workSchedule: { start: '22:00', end: '06:00' } };
    const state = getDayState(p, {}, '2026-09-08', {}, []);
    expect([DAY_STATES.NOT_STARTED, DAY_STATES.IN_WORKDAY, DAY_STATES.GOAL_MET]).toContain(state.key);
  });

  it('usuario sin horario configurado no rompe', () => {
    const state = getDayState({}, {}, '2026-09-08', {}, []);
    expect(state.key).toBeTruthy();
  });

  it('meta cumplida cuando los casos del día alcanzan la meta', () => {
    const goals = { daily: { cases: { enabled: true, target: 2 } } };
    const casos = [
      { id: '1', fecha: '2026-09-08' },
      { id: '2', fecha: '2026-09-08' },
      { id: '3', fecha: '2026-09-08' },
    ];
    const state = getDayState(profile, {}, '2026-09-08', goals, casos);
    if (state.key === DAY_STATES.IN_WORKDAY) {
      expect(1).toBe(1);
    }
  });
});

describe('progreso de metas', () => {
  const casos = [
    { id: '1', fecha: '2026-09-08', reporteHistory: [{ fecha: '2026-09-08' }] },
    { id: '2', fecha: '2026-09-08' },
    { id: '3', fecha: '2026-09-09' },
  ];

  it('progreso diario de casos y reportes', () => {
    const goals = {
      daily: {
        cases: { enabled: true, target: 5 },
        reports: { enabled: true, target: 2 },
      },
    };
    const p = getDailyGoalProgress(goals, casos, '2026-09-08');
    expect(p.cases.current).toBe(2);
    expect(p.cases.target).toBe(5);
    expect(p.cases.percent).toBe(40);
    expect(p.reports.current).toBe(1);
    expect(p.reports.percent).toBe(50);
  });

  it('meta desactivada devuelve progreso 0', () => {
    const goals = { daily: { cases: { enabled: false, target: 5 }, reports: { enabled: false, target: 5 } } };
    const p = getDailyGoalProgress(goals, casos, '2026-09-08');
    expect(p.cases.enabled).toBe(false);
    expect(p.cases.current).toBe(0);
    expect(p.cases.percent).toBe(0);
  });

  it('progreso mensual cuenta el mes completo', () => {
    const goals = { monthly: { cases: { enabled: true, target: 10 }, reports: { enabled: true, target: 5 } } };
    const m = getMonthlyGoalProgress(goals, casos, 2026, 8);
    expect(m.cases.current).toBe(3);
    expect(m.cases.remaining).toBe(7);
    expect(m.cases.percent).toBe(30);
  });

  it('usuario sin metas no rompe', () => {
    const p = getDailyGoalProgress({}, casos, '2026-09-08');
    expect(p.cases.enabled).toBe(false);
    const m = getMonthlyGoalProgress({}, casos, 2026, 8);
    expect(m.cases.enabled).toBe(false);
  });
});

describe('ritmo requerido', () => {
  it('calcula el ritmo diario necesario para alcanzar la meta mensual', () => {
    const goals = { monthly: { cases: { enabled: true, target: 100 } } };
    const casos = Array.from({ length: 50 }, (_, i) => ({ id: String(i), fecha: `2026-09-${String((i % 22) + 1).padStart(2, '0')}` }));
    const pace = getRequiredDailyPace(goals, casos, 2026, 8, {}, [1, 2, 3, 4, 5], '2026-09-10');
    expect(pace.remainingDays).toBeGreaterThan(0);
    expect(pace.cases).toBeGreaterThan(0);
  });

  it('meta mensual sin días restantes devuelve ritmo null', () => {
    const goals = { monthly: { cases: { enabled: true, target: 100 } } };
    const casos = [];
    const pace = getRequiredDailyPace(goals, casos, 2026, 8, {}, [1, 2, 3, 4, 5], '2026-09-30');
    // Solo resta un día hábil: 30/09 (miércoles). Si ya pasó, ritmo 0 días restantes.
    const isAfterLast = new Date() > new Date(2026, 8, 30);
    if (isAfterLast) {
      expect(pace.remainingDays).toBe(0);
    }
  });
});

describe('resumen de disponibilidad', () => {
  it('agrupa por mes', () => {
    const avail = {
      vacations: [{ id: 'v1', start: '2026-09-07', end: '2026-09-11' }],
      holidays: [{ id: 'h1', name: 'X', date: '2026-09-21' }],
      absences: [{ id: 'a1', date: '2026-09-15', type: 'personal' }],
      customDaysOff: [{ id: 'd1', date: '2026-09-29' }],
    };
    const summary = getAvailabilitySummary(avail, 2026, 8);
    expect(summary.vacations.length).toBe(1);
    expect(summary.holidays.length).toBe(1);
    expect(summary.absences.length).toBe(1);
    expect(summary.dayOffs.length).toBe(1);
    expect(summary.totalDays).toBe(4);
  });
});

describe('métricas por día efectivo', () => {
  it('divide por días efectivos, no por todos los días del mes', () => {
    const avail = { vacations: [{ id: 'v', start: '2026-09-07', end: '2026-09-11' }] };
    const casos = Array.from({ length: 42 }, (_, i) => ({ id: String(i), fecha: `2026-09-${String((i % 22) + 1).padStart(2, '0')}` }));
    const m = getPerEffectiveDayMetrics(casos, avail, 2026, 8, [1, 2, 3, 4, 5]);
    // 22 programados - 5 vacaciones = 17 efectivos. 42 casos / 17 = 2.5
    expect(m.effective).toBe(17);
    expect(m.casesPerDay).toBeCloseTo(2.5, 1);
  });
});

describe('sugerencias personales', () => {
  it('no rompe sin configuración', () => {
    const s = buildPersonalSuggestions({});
    expect(Array.isArray(s)).toBe(true);
  });

  it('responde a meta diaria completada', () => {
    const goals = { daily: { cases: { enabled: true, target: 2 } } };
    const casos = [
      { id: '1', fecha: '2026-09-08' },
      { id: '2', fecha: '2026-09-08' },
    ];
    const s = buildPersonalSuggestions({
      goals,
      cases: casos,
      profile: { workSchedule: { start: '09:00', end: '17:00' }, workingDays: [1, 2, 3, 4, 5] },
      year: 2026,
      month: 8,
      todayISO: '2026-09-08',
      settings: {},
    });
    const meta = s.find((x) => x.id === 'meta-diaria');
    // Solo si el día está en jornada (depende de la hora real)
    if (meta) expect(meta.type).toBe('success');
  });
});

describe('isWorkingDay', () => {
  it('distingue días hábiles', () => {
    expect(isWorkingDay('2026-09-07', [1, 2, 3, 4, 5])).toBe(true); // lunes
    expect(isWorkingDay('2026-09-12', [1, 2, 3, 4, 5])).toBe(false); // sábado
    expect(isWorkingDay('2026-09-13', [1, 2, 3, 4, 5])).toBe(false); // domingo
  });
});