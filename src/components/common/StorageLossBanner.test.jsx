import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorageLossBanner } from './StorageLossBanner';
import useSystemStatus from '../../core/status/systemStatusStore';
import {
  hayPerdidaAlmacenamientoPendiente,
  __resetStorageHealthParaTest,
} from '../../core/status/storageHealth';

// backupService se mockea completo: en este test solo importa el flujo del
// banner (parse → import → confirmar), no Dexie ni el checksum real.
// v1.10.8: + describirSalvage (aviso de backup PARCIAL en la descarga).
vi.mock('../../services/backupService', () => ({
  parseBackupJSON: vi.fn(),
  importBackup: vi.fn(),
  downloadBackup: vi.fn(),
  describirSalvage: vi.fn(() => null),
}));
// v1.10.8: snapshot local (localStorage) y reparación profunda (drop de las
// bases) — el banner solo orquesta la llamada; la lógica se testea aparte.
vi.mock('../../services/autoBackup', () => ({
  haySnapshotLocal: vi.fn(() => false),
  restaurarSnapshotLocal: vi.fn(),
}));
vi.mock('../../core/status/storageRepair', () => ({
  repararAlmacenamientoLocal: vi.fn(),
}));
import {
  parseBackupJSON,
  importBackup,
  downloadBackup,
  describirSalvage,
} from '../../services/backupService';
import {
  haySnapshotLocal,
  restaurarSnapshotLocal,
} from '../../services/autoBackup';
import { repararAlmacenamientoLocal } from '../../core/status/storageRepair';

/**
 * v1.10.6 — StorageLossBanner (emergencia de pérdida de datos):
 *  - sin estado no renderiza nada;
 *  - variante A (storageLost): aviso + recargar + restaurar + descarte de sesión;
 *  - variante B (dataAlarm): muestra los conteos perdidos, descarga lo
 *    disponible y "Entendido" cierra la alarma de verdad (no solo la UI);
 *  - flujo de restauración desde archivo: parse → import → confirma
 *    recuperación (limpia bandera y alarma).
 * v1.10.8 — el restore ahora importa el backup REAL (bug 1.10.6: se le pasaba
 * el wrapper de parseBackupJSON y fallaba SIEMPRE en producción) y se agregan:
 * descarga PARCIAL con aviso de salvamento, reparación profunda en dos pasos
 * y restauración del snapshot local de emergencia.
 */
describe('StorageLossBanner · v1.10.6 + v1.10.8', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetStorageHealthParaTest();
    vi.clearAllMocks();
    // clearAllMocks NO borra implementaciones: se restauran los defaults del
    // factory para que ningún test contamine al siguiente.
    describirSalvage.mockReturnValue(null);
    haySnapshotLocal.mockReturnValue(false);
  });

  it('sin estado de pérdida no renderiza nada', () => {
    const { container } = render(<StorageLossBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('variante A (storageLost): muestra el aviso con Recargar y Restaurar', () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });

    render(<StorageLossBanner />);

    expect(
      screen.getByText('Se perdió el acceso al almacenamiento local')
    ).toBeTruthy();
    // OJO: los mismos textos aparecen en el <details> de ayuda → se consulta
    // por rol de botón para que la query sea única.
    expect(
      screen.getByRole('button', { name: /Recargar la app/ })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Restaurar desde archivo/ })
    ).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    // v1.10.9: la guía de Clear site data SOLO aparece tras una reparación
    // reciente (si no, es ruido para una pérdida normal).
    expect(screen.queryByText(/Clear site data/)).toBeNull();
  });

  it('v1.10.9 · trasReparacion: la guía de Clear site data aparece en el banner', () => {
    // storageLost con la marca que pone registrarPerdidaAlmacenamiento cuando
    // el error ocurre DESPUÉS de un drop ok (el daño no está en las bases).
    useSystemStatus
      .getState()
      .setStorageLost({ mensaje: 'Data lost due to missing file', trasReparacion: true });

    render(<StorageLossBanner />);

    expect(
      screen.getByText(/La reparación se completó pero el almacenamiento sigue dañado/)
    ).toBeTruthy();
    expect(screen.getByText(/Clear site data/)).toBeTruthy();
    expect(screen.getByText(/otra URL/)).toBeTruthy();
  });

  it('el descarte de la variante A oculta el banner solo para la sesión', () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    const { container } = render(<StorageLossBanner />);

    fireEvent.click(
      screen.getByLabelText(
        'Descartar aviso de pérdida de datos (solo esta sesión)'
      )
    );

    expect(container.innerHTML).toBe('');
    // el estado de fondo NO se limpia (la pérdida sigue real)
    expect(useSystemStatus.getState().storageLost).toBe(true);
  });

  it('variante B (dataAlarm): lista los conteos perdidos y "Entendido" cierra la alarma', () => {
    localStorage.setItem(
      'app-data-fingerprint',
      JSON.stringify({ cases: 3, notes: 5, events: 2, ts: 1 })
    );
    localStorage.setItem('app-storage-lost', '1');
    useSystemStatus.getState().setDataAlarm([
      { tabla: 'notes', antes: 5, ahora: 0 },
      { tabla: 'cases', antes: 3, ahora: 0 },
    ]);

    const { container } = render(<StorageLossBanner />);

    expect(screen.getByText('Posible pérdida de datos')).toBeTruthy();
    expect(screen.getByText(/notas: 5 → 0/)).toBeTruthy();
    expect(screen.getByText(/casos: 3 → 0/)).toBeTruthy();
    // OJO (1.10.8): "Descargar lo disponible" también aparece en el <details>
    // de ayuda → se consulta por rol de botón para que la query sea única.
    expect(
      screen.getByRole('button', { name: 'Descargar lo disponible' })
    ).toBeTruthy();

    fireEvent.click(screen.getByText('Entendido, continuar'));

    expect(useSystemStatus.getState().dataAlarm).toBeNull();
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
    expect(container.innerHTML).toBe('');
  });

  it('restauración desde archivo: parse → import → confirma recuperación', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    localStorage.setItem('app-storage-lost', '1');
    const backupReal = { kind: 'appseguimiento-backup', version: 3, data: {} };
    parseBackupJSON.mockResolvedValue({ backup: backupReal, error: null, checksumMismatch: false });
    importBackup.mockResolvedValue({ counts: { cases: 2, notes: 4, events: 1 } });

    const { container } = render(<StorageLossBanner />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    expect(parseBackupJSON).toHaveBeenCalledTimes(1);
    // v1.10.8 (bug 1.10.6): se importa el backup REAL, no el wrapper
    // {backup, error} de parseBackupJSON (con el wrapper, la validación de
    // kind fallaba SIEMPRE en producción).
    expect(importBackup).toHaveBeenCalledWith(backupReal, { omitirChecksum: false });
    // Estado limpio tras el restore (bandera + store).
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
    expect(useSystemStatus.getState().storageLost).toBe(false);
    // El banner desaparece solo.
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('checksum que no coincide: importa igual con omitirChecksum (contrato de parse)', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    const backupReal = { kind: 'appseguimiento-backup', version: 3, data: {} };
    parseBackupJSON.mockResolvedValue({
      backup: backupReal,
      error: 'checksum no coincide',
      checksumMismatch: true,
    });
    importBackup.mockResolvedValue({ counts: { cases: 1, notes: 0, events: 0 } });

    const { container } = render(<StorageLossBanner />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    expect(importBackup).toHaveBeenCalledWith(backupReal, { omitirChecksum: true });
  });

  it('archivo inválido: NO llama a importBackup (solo aviso de error)', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    parseBackupJSON.mockResolvedValue({
      backup: null,
      error: 'El archivo no es un backup de AppSeguimiento',
    });

    const { container } = render(<StorageLossBanner />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['no soy backup'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(parseBackupJSON).toHaveBeenCalledTimes(1));
    expect(importBackup).not.toHaveBeenCalled();
    // El banner sigue presente (el usuario puede reintentar).
    expect(container.innerHTML).not.toBe('');
  });

  it('un fallo del restore guía a recargar y NO limpia el estado', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    localStorage.setItem('app-storage-lost', '1');
    parseBackupJSON.mockResolvedValue({
      backup: { kind: 'appseguimiento-backup', version: 3, data: {} },
      error: null,
      checksumMismatch: false,
    });
    importBackup.mockRejectedValue(new Error('el almacenamiento sigue dañado'));

    const { container } = render(<StorageLossBanner />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    // El estado permanece (para que el usuario recargue e reintente).
    await waitFor(() =>
      expect(useSystemStatus.getState().storageLost).toBe(true)
    );
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(true);
    expect(container.innerHTML).not.toBe('');
  });

  it('descarga el backup disponible desde la variante B', async () => {
    useSystemStatus.getState().setDataAlarm([{ tabla: 'notes', antes: 5, ahora: 0 }]);
    downloadBackup.mockResolvedValue(undefined);

    render(<StorageLossBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar lo disponible' }));

    await waitFor(() => expect(downloadBackup).toHaveBeenCalledTimes(1));
  });

  // ============ v1.10.8 — salvamento, reparación y snapshot ============

  it('variante A (1.10.8): ofrece "Descargar lo disponible" y consulta el salvamento', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    downloadBackup.mockResolvedValue({
      name: 'backup_x.json',
      sizeKB: 12,
      salvage: { perdidas: [{ tabla: 'notes', registros: 1 }] },
    });
    describirSalvage.mockReturnValue('notes: 1 registro(s) perdido(s)');

    render(<StorageLossBanner />);
    // Con salvamento la descarga SÍ funciona con la base dañada → es la
    // acción prioritaria de la variante A (antes no existía acá).
    expect(
      screen.getByRole('button', { name: 'Descargar lo disponible' })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar lo disponible' }));

    await waitFor(() => expect(downloadBackup).toHaveBeenCalledTimes(1));
    expect(describirSalvage).toHaveBeenCalledWith({
      perdidas: [{ tabla: 'notes', registros: 1 }],
    });
  });

  it('reparación profunda (1.10.8): confirmación en dos pasos antes de borrar', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    repararAlmacenamientoLocal.mockResolvedValue({ ok: true });

    render(<StorageLossBanner />);
    // Paso 1: armado — NO se borra nada todavía.
    fireEvent.click(screen.getByRole('button', { name: /Reparar base de datos/ }));
    expect(repararAlmacenamientoLocal).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Sí, borrar y recrear la base/ })
    ).toBeTruthy();

    // Paso 2: ejecución destructiva.
    fireEvent.click(screen.getByRole('button', { name: /Sí, borrar y recrear la base/ }));
    await waitFor(() => expect(repararAlmacenamientoLocal).toHaveBeenCalledTimes(1));
  });

  it('reparación bloqueada (otra pestaña): informa y el banner permanece', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    repararAlmacenamientoLocal.mockResolvedValue({ ok: false, bloqueado: true });

    render(<StorageLossBanner />);
    fireEvent.click(screen.getByRole('button', { name: /Reparar base de datos/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sí, borrar y recrear la base/ }));

    await waitFor(() => expect(repararAlmacenamientoLocal).toHaveBeenCalledTimes(1));
    // La pérdida sigue real: el banner NO desaparece.
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('snapshot local (1.10.8): se ofrece y restaura por el mismo camino seguro', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    haySnapshotLocal.mockReturnValue(true);
    restaurarSnapshotLocal.mockResolvedValue({
      ok: true,
      counts: { cases: 1, notes: 0, events: 0 },
    });

    render(<StorageLossBanner />);
    fireEvent.click(screen.getByRole('button', { name: /Restaurar snapshot local/ }));

    await waitFor(() => expect(restaurarSnapshotLocal).toHaveBeenCalledTimes(1));
    // Éxito: confirma recuperación → el store limpia la pérdida y el banner se va.
    await waitFor(() => expect(useSystemStatus.getState().storageLost).toBe(false));
  });
});
