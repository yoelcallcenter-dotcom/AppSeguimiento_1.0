import { describe, it, expect } from 'vitest';
import { ruleEngine } from './ruleEngine';

describe('ruleEngine.shouldNotify', () => {
  it('bloquea todo en modo no molestar', () => {
    const event = { type: 'error', priority: 'critical', title: 'X' };
    expect(ruleEngine.shouldNotify(event, { modoNoMolestar: true })).toBe(false);
  });

  it('permite eventos críticos incluso con filtros de tipo', () => {
    const event = { type: 'warning', priority: 'critical', title: 'X' };
    expect(ruleEngine.shouldNotify(event, { notifReporte: false })).toBe(true);
  });

  it('respeta el filtro notifCambioEstado para success', () => {
    const event = { type: 'success', title: 'Caso actualizado' };
    expect(ruleEngine.shouldNotify(event, { notifCambioEstado: false })).toBe(false);
  });

  it('usa notifBackup para eventos de backup', () => {
    const event = { type: 'success', title: 'Backup realizado' };
    expect(ruleEngine.shouldNotify(event, { notifBackup: false })).toBe(false);
    expect(ruleEngine.shouldNotify(event, {})).toBe(true);
  });

  // C02-fix (1.10.1): ignorarLowPriority YA NO filtra shouldNotify. Antes
  // suprimía el registro en el Centro; ahora solo suprime toast y sonido
  // (shouldShowToast / shouldPlaySound). shouldNotify debe permitir el paso
  // para que la notificación llegue al Centro.
  it('ignorarLowPriority NO filtra shouldNotify (llega al Centro)', () => {
    const event = { type: 'info', priority: 'low', title: 'X' };
    expect(ruleEngine.shouldNotify(event, { ignorarLowPriority: true })).toBe(true);
  });

  it('sin ignorarLowPriority en config NO filtra low (default asumido false)', () => {
    const event = { type: 'info', priority: 'low', title: 'X' };
    expect(ruleEngine.shouldNotify(event, {})).toBe(true);
    expect(ruleEngine.shouldNotify(event, { ignorarLowPriority: false })).toBe(true);
    expect(ruleEngine.shouldNotify(event, { ignorarLowPriority: true })).toBe(true);
    // Prioridades superiores no se ven afectadas por el filtro.
    expect(
      ruleEngine.shouldNotify({ ...event, priority: 'medium' }, { ignorarLowPriority: true })
    ).toBe(true);
  });

  // T18c (1.10.1): los overrides de tipo miraban solo `title`; alertsSystem
  // emite "Evento proximo: …" con title vacío y el texto en `message`, con lo
  // cual caían en warning→notifReporte y el toggle de Eventos no lo frenaba.
  it('el override de notifEvento mira también message (toasts sin title)', () => {
    const event = { type: 'warning', title: '', message: 'Evento proximo: "X" en 3h' };
    expect(ruleEngine.shouldNotify(event, { notifEvento: false })).toBe(false);
    expect(ruleEngine.shouldNotify(event, {})).toBe(true);
  });

  it('el override de notifBackup mira también message', () => {
    const event = { type: 'warning', title: '', message: 'Backup automático fallido' };
    expect(ruleEngine.shouldNotify(event, { notifBackup: false })).toBe(false);
  });
});

// C02-fix (1.10.1): ignorarLowPriority se movió de shouldNotify a
// shouldShowToast + shouldPlaySound (los dos efectos que el texto de
// Configuración promete suprimir; el Centro no se filtra).
describe('ruleEngine.shouldShowToast (ignorarLowPriority)', () => {
  const low = { type: 'info', priority: 'low', title: 'X' };
  const med = { type: 'info', priority: 'medium', title: 'Y' };

  it('suprime el toast de prioridad baja cuando ignorarLowPriority está activo', () => {
    expect(ruleEngine.shouldShowToast(low, { ignorarLowPriority: true })).toBe(false);
  });

  it('permite el toast de prioridad baja cuando ignorarLowPriority está inactivo', () => {
    expect(ruleEngine.shouldShowToast(low, { ignorarLowPriority: false })).toBe(true);
    expect(ruleEngine.shouldShowToast(low, {})).toBe(true);
  });

  it('prioridades medias y superiores no se ven afectadas', () => {
    expect(ruleEngine.shouldShowToast(med, { ignorarLowPriority: true })).toBe(true);
  });

  it('respeta notifInApp aunque ignorarLowPriority esté activo', () => {
    expect(ruleEngine.shouldShowToast(low, { ignorarLowPriority: true, notifInApp: false })).toBe(false);
  });
});

describe('ruleEngine.shouldPlaySound (ignorarLowPriority)', () => {
  const low = { type: 'info', priority: 'low', title: 'X' };
  const med = { type: 'info', priority: 'medium', title: 'Y' };

  it('suprime el sonido de prioridad baja cuando ignorarLowPriority está activo', () => {
    expect(ruleEngine.shouldPlaySound(low, { notifSonido: true, notifBajaSound: true, ignorarLowPriority: true })).toBe(false);
  });

  it('permite el sonido de prioridad baja cuando ignorarLowPriority está inactivo', () => {
    expect(ruleEngine.shouldPlaySound(low, { notifSonido: true, notifBajaSound: true, ignorarLowPriority: false })).toBe(true);
  });

  it('prioridades medias no se ven afectadas (depende de notifMediaSound)', () => {
    expect(ruleEngine.shouldPlaySound(med, { notifSonido: true, notifMediaSound: true, ignorarLowPriority: true })).toBe(true);
    expect(ruleEngine.shouldPlaySound(med, { notifSonido: true, notifMediaSound: false, ignorarLowPriority: true })).toBe(false);
  });
});

describe('ruleEngine.isDuplicate', () => {
  it('detecta duplicados recientes', () => {
    const now = Date.now();
    const event = { title: 'A', message: 'B', timestamp: now };
    const recent = [{ title: 'A', message: 'B', timestamp: now - 500 }];
    expect(ruleEngine.isDuplicate(event, recent)).toBe(true);
  });

  it('no detecta duplicados antiguos', () => {
    const now = Date.now();
    const event = { title: 'A', message: 'B', timestamp: now };
    const recent = [{ title: 'A', message: 'B', timestamp: now - 10000 }];
    expect(ruleEngine.isDuplicate(event, recent)).toBe(false);
  });
});

describe('ruleEngine.shouldAggregate', () => {
  it('agrega cuando hay 3+ notificaciones recientes del mismo grupo', () => {
    const now = Date.now();
    const event = { title: 'N', message: 'm', timestamp: now, source: 's' };
    const recent = [
      { title: 'N1', source: 's', timestamp: now - 100 },
      { title: 'N2', source: 's', timestamp: now - 200 },
      { title: 'N3', source: 's', timestamp: now - 300 },
    ];
    expect(ruleEngine.shouldAggregate(event, recent)).toBe(true);
  });

  it('no agrega con pocas notificaciones', () => {
    const now = Date.now();
    const event = { title: 'N', source: 's', timestamp: now };
    const recent = [{ title: 'N1', source: 's', timestamp: now - 100 }];
    expect(ruleEngine.shouldAggregate(event, recent)).toBe(false);
  });
});

describe('ruleEngine.resolvePriority', () => {
  it('mantiene la prioridad explícita', () => {
    expect(ruleEngine.resolvePriority({ priority: 'critical' })).toBe('critical');
  });

  it('mapea por tipo', () => {
    expect(ruleEngine.resolvePriority({ type: 'error' })).toBe('high');
    expect(ruleEngine.resolvePriority({ type: 'warning' })).toBe('medium');
    expect(ruleEngine.resolvePriority({ type: 'info' })).toBe('low');
    expect(ruleEngine.resolvePriority({ type: 'success' })).toBe('low');
    expect(ruleEngine.resolvePriority({ type: 'otro' })).toBe('low');
  });
});
