import { describe, it, expect } from 'vitest';
import { GUIDE_SECTIONS, getGuideText } from './guideData';

// Tests 1.10.0: estructura del manual y cobertura de las funciones nuevas.
describe('guideData (guías del manual)', () => {
  it('cada capítulo tiene id, título y contenido, sin ids repetidos', () => {
    expect(GUIDE_SECTIONS.length).toBeGreaterThanOrEqual(16);
    GUIDE_SECTIONS.forEach((s) => {
      expect(typeof s.id).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(s.content.length).toBeGreaterThan(0);
    });
    const ids = GUIDE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cubre las funciones nuevas de 1.10.0', () => {
    const texto = getGuideText();
    // Widgets nuevos (A/E).
    expect(texto).toContain('Meta de firmas');
    expect(texto).toContain('Historial de metas');
    // "Solo de hoy" (C): en la revisión 1.10.0 el chip del header se quitó y
    // el atajo vive como marcador del día de HOY en el filtro de Día.
    expect(texto).toContain('Solo de hoy');
    expect(texto).toContain('filtro de Dia');
    // Reglas automáticas y navegador (D/B).
    expect(texto).toContain('REGLAS AUTOMATICAS');
    expect(texto).toContain('Navegador (escritorio)');
  });
});
