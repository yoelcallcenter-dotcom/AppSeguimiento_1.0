import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../../core/db/casesDB';
import { exportCasesToCSV } from './exportCases';

describe('exportCasesToCSV conserva el tag [origen] de los reportes (1.9.3)', () => {
  beforeEach(async () => {
    await casesDB.cases.clear();
    await casesDB.cases.add({
      id: 'caso-origen-1',
      fecha: '2026-01-15',
      nombre: 'Test Origen',
      reporteHistory: [
        { fecha: '2026-01-16', texto: 'Derivado a estudio X', origen: 'Portal Web' },
        { fecha: '2026-01-17', texto: 'Llamada de seguimiento' },
      ],
    });
  });

  it('escribe (fecha) [origen] texto en la columna de reportes', async () => {
    const csv = await exportCasesToCSV();
    expect(csv).toContain('(2026-01-16) [Portal Web] Derivado a estudio X');
    expect(csv).toContain('(2026-01-17) Llamada de seguimiento');
  });

  it('los reportes sin origen conservan el formato (fecha) texto', async () => {
    await casesDB.cases.add({
      id: 'caso-origen-2',
      fecha: '2026-02-10',
      nombre: 'Sin origen',
      reporteHistory: [{ fecha: '2026-02-11', texto: 'Seguimiento telefónico' }],
    });
    const csv = await exportCasesToCSV();
    expect(csv).toContain('(2026-02-11) Seguimiento telefónico');
    expect(csv).not.toContain('(2026-02-11) []');
  });
});
