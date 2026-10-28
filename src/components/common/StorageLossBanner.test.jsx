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
vi.mock('../../services/backupService', () => ({
  parseBackupJSON: vi.fn(),
  importBackup: vi.fn(),
  downloadBackup: vi.fn(),
}));
import { parseBackupJSON, importBackup, downloadBackup } from '../../services/backupService';

/**
 * v1.10.6 — StorageLossBanner (emergencia de pérdida de datos):
 *  - sin estado no renderiza nada;
 *  - variante A (storageLost): aviso + recargar + restaurar + descarte de sesión;
 *  - variante B (dataAlarm): muestra los conteos perdidos, descarga lo
 *    disponible y "Entendido" cierra la alarma de verdad (no solo la UI);
 *  - flujo de restauración desde archivo: parse → import → confirma
 *    recuperación (limpia bandera y alarma).
 */
describe('StorageLossBanner · v1.10.6', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetStorageHealthParaTest();
    vi.clearAllMocks();
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
    expect(screen.getByText('Descargar lo disponible')).toBeTruthy();

    fireEvent.click(screen.getByText('Entendido, continuar'));

    expect(useSystemStatus.getState().dataAlarm).toBeNull();
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
    expect(container.innerHTML).toBe('');
  });

  it('restauración desde archivo: parse → import → confirma recuperación', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    localStorage.setItem('app-storage-lost', '1');
    parseBackupJSON.mockResolvedValue({ ok: true });
    importBackup.mockResolvedValue({ counts: { cases: 2, notes: 4, events: 1 } });

    const { container } = render(<StorageLossBanner />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    expect(parseBackupJSON).toHaveBeenCalledTimes(1);
    // Estado limpio tras el restore (bandera + store).
    expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
    expect(useSystemStatus.getState().storageLost).toBe(false);
    // El banner desaparece solo.
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('un fallo del restore guía a recargar y NO limpia el estado', async () => {
    useSystemStatus.getState().setStorageLost({ mensaje: 'Data lost due to missing file' });
    localStorage.setItem('app-storage-lost', '1');
    parseBackupJSON.mockResolvedValue({ ok: true });
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
    fireEvent.click(screen.getByText('Descargar lo disponible'));

    await waitFor(() => expect(downloadBackup).toHaveBeenCalledTimes(1));
  });
});
