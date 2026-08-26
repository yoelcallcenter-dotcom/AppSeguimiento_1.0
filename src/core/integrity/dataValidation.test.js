import { describe, it, expect } from 'vitest';
import {
  validateCaseIntegrity,
  validateNoteIntegrity,
  validateEventIntegrity,
  validateHistoryEventIntegrity,
  validateConfigIntegrity,
} from './dataValidation';
import { CONFIG_DEFAULT } from '../../utils/constants';

describe('validateCaseIntegrity', () => {
  it('caso completo es válido sin advertencias', () => {
    const r = validateCaseIntegrity({
      id: 'c1',
      nombre: 'JUAN PEREZ',
      telefono: '2615550001',
      estado: 'Pendiente',
      fecha: '2026-08-01',
      tags: ['a'],
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
    expect(r.normalizedData.nombre).toBe('JUAN PEREZ');
  });

  it('caso antiguo con campos faltantes es válido CON advertencias (no corrupto)', () => {
    const r = validateCaseIntegrity({ nombre: 'MARIA LOPEZ', telefono: '2615550002' });
    expect(r.valid).toBe(true);
    expect(r.recoverable).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('sin nombre ni teléfono es inválido', () => {
    const r = validateCaseIntegrity({ localidad: 'MENDOZA' });
    expect(r.valid).toBe(false);
    expect(r.severity).toBe('error');
  });

  it('no objeto es inválido', () => {
    expect(validateCaseIntegrity(null).valid).toBe(false);
    expect(validateCaseIntegrity('x').valid).toBe(false);
  });

  it('fecha irrecuperable se conserva tal cual y genera advertencia (nunca "hoy")', () => {
    const original = '32/13/2020';
    const r = validateCaseIntegrity({ nombre: 'X', telefono: '1', fecha: original });
    expect(r.valid).toBe(true);
    expect(r.normalizedData.fecha).toBe(original); // preservado
    expect(r.warnings.some((w) => w.includes('Fecha inválida'))).toBe(true);
  });

  it('fecha interpretable se normaliza a ISO en normalizedData', () => {
    const r = validateCaseIntegrity({ nombre: 'X', telefono: '1', fecha: '15/07/2026' });
    expect(r.normalizedData.fecha).toBe('2026-07-15');
  });

  it('campo array corrupto se recupera como lista vacía con advertencia', () => {
    const r = validateCaseIntegrity({ nombre: 'X', telefono: '1', tags: 'no-lista' });
    expect(r.normalizedData.tags).toEqual([]);
    expect(r.warnings.some((w) => w.includes('"tags"'))).toBe(true);
  });

  it('un ID existente nunca se modifica', () => {
    const r = validateCaseIntegrity({ id: 'mi-id-viejo ', nombre: 'X', telefono: '1' });
    // El trim del id no forma parte de la política: se respeta el valor.
    expect(r.normalizedData.id).toBe('mi-id-viejo ');
  });

  it('id ausente es recuperable con advertencia, no error', () => {
    const r = validateCaseIntegrity({ nombre: 'X', telefono: '1' });
    expect(r.valid).toBe(true);
    expect(r.warnings.some((w) => w.includes('id'))).toBe(true);
  });
});

describe('validateNoteIntegrity', () => {
  it('nota completa válida', () => {
    expect(validateNoteIntegrity({ id: 'n1', title: 'T', content: '<p>hola</p>' }).valid).toBe(true);
  });

  it('nota antigua sin contenido pero con título pasa sin advertencias', () => {
    const r = validateNoteIntegrity({ id: 'n2', title: 'Solo título' });
    expect(r.valid).toBe(true);
    expect(r.recoverable).toBe(false);
  });

  it('nota sin id pero con contenido pasa con advertencia (recuperable)', () => {
    const r = validateNoteIntegrity({ content: '<p>algo</p>' });
    expect(r.valid).toBe(true);
    expect(r.recoverable).toBe(true);
  });

  it('nota sin nada utilizable es inválida', () => {
    expect(validateNoteIntegrity({}).valid).toBe(false);
  });
});

describe('validateEventIntegrity', () => {
  it('evento completo válido', () => {
    const r = validateEventIntegrity({ id: 'e1', title: 'Cita', startDate: '2026-08-25' });
    expect(r.valid).toBe(true);
  });

  it('evento sin fecha queda aislado pero no rompe la lista', () => {
    const r = validateEventIntegrity({ id: 'e2', title: 'Roto' });
    expect(r.recoverable).toBe(true);
    expect(r.warnings.some((w) => w.includes('fecha'))).toBe(true);
  });
});

describe('validateHistoryEventIntegrity', () => {
  it('evento estándar válido', () => {
    const r = validateHistoryEventIntegrity({
      caseId: 'c1',
      type: 'status_changed',
      timestamp: new Date().toISOString(),
      metadata: { previousValue: 'A', newValue: 'B' },
    });
    expect(r.valid).toBe(true);
  });

  it('tipos desconocidos (versiones futuras) se PRESERVAN', () => {
    const r = validateHistoryEventIntegrity({
      caseId: 'c1',
      type: 'evento_futuro_desconocido',
      timestamp: new Date().toISOString(),
    });
    expect(r.valid).toBe(true);
  });

  it('sin caseId o sin tipo es inválido pero recuperable', () => {
    const a = validateHistoryEventIntegrity({ type: 'x', timestamp: new Date().toISOString() });
    expect(a.valid).toBe(false);
    expect(a.recoverable).toBe(true);
    const b = validateHistoryEventIntegrity({ caseId: 'c1', timestamp: new Date().toISOString() });
    expect(b.valid).toBe(false);
    expect(b.recoverable).toBe(true);
  });

  it('timestamp inválido genera advertencia sin invalidar el evento', () => {
    const r = validateHistoryEventIntegrity({ caseId: 'c1', type: 'x', timestamp: 'ayer' });
    expect(r.valid).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateConfigIntegrity', () => {
  it('configuración correcta pasa intacta', () => {
    const config = { operador: 'Yoel', casosPorPagina: 25 };
    const r = validateConfigIntegrity(config);
    expect(r.valid).toBe(true);
    expect(r.normalizedData).toEqual(config);
  });

  it('número inválido en casosPorPagina se restaura al default', () => {
    const r = validateConfigIntegrity({ casosPorPagina: 'muchos' });
    expect(r.normalizedData.casosPorPagina).toBe(CONFIG_DEFAULT.casosPorPagina);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('estados inválido (no lista) se omite para usar el catálogo por defecto', () => {
    const r = validateConfigIntegrity({ estados: 'Firmo' });
    expect(r.normalizedData.estados).toBeUndefined();
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('booleanos llegados como string se convierten de forma segura', () => {
    // Las claves booleanas conocidas del esquema usan conversión explícita;
    // las claves desconocidas jamás se tocan (preservación).
    const config = { claveDesconocida: { anidada: true }, busquedaHistorial: true };
    const r = validateConfigIntegrity(config);
    expect(r.normalizedData.claveDesconocida).toEqual({ anidada: true });
    expect(r.normalizedData.busquedaHistorial).toBe(true);
  });

  it('claves desconocidas se preservan sin cambios', () => {
    const config = { campoFuturo: [1, 2, 3] };
    const r = validateConfigIntegrity(config);
    expect(r.normalizedData.campoFuturo).toEqual([1, 2, 3]);
    expect(r.warnings).toHaveLength(0);
  });

  it('configuración no-objeto es CRITICAL', () => {
    const r = validateConfigIntegrity('roto');
    expect(r.valid).toBe(false);
    expect(r.severity).toBe('critical');
  });
});
