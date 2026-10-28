/**
 * integrityService.test.js — v1.10.7
 *
 * Blinda el diagnóstico del historial de backups y del bloque principal de
 * verificación ante PÉRDIDA DE ALMACENAMIENTO:
 * - "Todavía no existe ningún backup en el historial" solo cuando el
 *   historial realmente está vacío (antes getBackupHistory tragaba el error
 *   de lectura y devolvía [], con lo que el informe MENTÍA con la base rota).
 * - Con la base dañada se informa "Historial de backups ilegible" (nivel
 *   error) y el bloque principal explica la salida (recargar / restaurar).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runIntegrityCheck } from './integrityService';
import appDB from '../db/appDB';

// Mock parcial: solo se controla getBackupHistory; el resto (exportBackup,
// normalización, etc.) sigue siendo el real.
vi.mock('../../services/autoBackup', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getBackupHistory: vi.fn() };
});
import { getBackupHistory } from '../../services/autoBackup';

/** Error tal como lo produce el navegador al perder el archivo de la DB. */
function errPerdida() {
  return Object.assign(
    new Error(
      'AbortError NotReadableError Data lost due to missing file. Affected record should be considered irrecoverable'
    ),
    { name: 'AbortError' }
  );
}

describe('runIntegrityCheck · historial de backups (1.10.7)', () => {
  let spies = [];

  beforeEach(() => {
    vi.clearAllMocks();
    getBackupHistory.mockReset();
  });

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies = [];
    vi.restoreAllMocks();
  });

  it('historial vacío REAL → warning "Todavía no existe ningún backup"', async () => {
    getBackupHistory.mockResolvedValue([]);
    const informe = await runIntegrityCheck({ completo: true });
    expect(
      informe.problemas.some((p) => p.mensaje === 'Todavía no existe ningún backup en el historial')
    ).toBe(true);
  });

  it('historial con un backup → sin ese warning y ultimoBackup poblado', async () => {
    getBackupHistory.mockResolvedValue([
      { timestamp: '2026-01-01T00:00:00.000Z', kind: 'auto', sizeKB: 42 },
    ]);
    const informe = await runIntegrityCheck({ completo: true });
    expect(informe.ultimoBackup).toMatchObject({ kind: 'auto', sizeKB: 42 });
    expect(
      informe.problemas.some((p) => p.mensaje.includes('Todavía no existe ningún backup'))
    ).toBe(false);
  });

  it('lectura fallida por pérdida de storage → error honesto, NO "no existe"', async () => {
    getBackupHistory.mockRejectedValue(errPerdida());
    const informe = await runIntegrityCheck({ completo: true });
    const p = informe.problemas.find((x) => x.mensaje.includes('Historial de backups ilegible'));
    expect(p).toBeTruthy();
    expect(p.nivel).toBe('error');
    // La mentira pre-1.10.7: "Todavía no existe ningún backup" con la base rota.
    expect(
      informe.problemas.some((x) => x.mensaje === 'Todavía no existe ningún backup en el historial')
    ).toBe(false);
  });

  it('lectura fallida por otra causa → warning genérico (no storage perdido)', async () => {
    getBackupHistory.mockRejectedValue(new Error('fallo raro'));
    const informe = await runIntegrityCheck({ completo: true });
    expect(
      informe.problemas.some((x) => x.mensaje.startsWith('No se pudo leer el historial de backups:'))
    ).toBe(true);
  });

  it('bloque principal falla por pérdida → mensaje con guía de recuperación', async () => {
    getBackupHistory.mockResolvedValue([]);
    spies.push(
      vi.spyOn(appDB.notes, 'toArray').mockRejectedValue(errPerdida())
    );
    const informe = await runIntegrityCheck({ completo: true });
    const p = informe.problemas.find((x) =>
      x.mensaje.startsWith('No se pudo completar la verificación de datos')
    );
    expect(p).toBeTruthy();
    expect(p.mensaje).toContain('almacenamiento local dañado');
    expect(p.mensaje).toContain('restaurá desde un archivo de backup');
  });
});
