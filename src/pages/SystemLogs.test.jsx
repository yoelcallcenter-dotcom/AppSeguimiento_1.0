import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SystemLogs } from './SystemLogs';

// El panel de integridad es lazy y ajeno a esta prueba (se testea en su
// propio archivo); se mockea para que el Suspense quede vacío sin ruido.
vi.mock('../components/diagnostico/IntegridadPanel', () => ({
  IntegridadPanel: () => null,
}));
// v1.10.8: la reparación profunda (drop de AppData + CasesDB) se mockea —
// acá solo se testea la UI de doble confirmación y el mensaje de fallo.
vi.mock('../core/status/storageRepair', () => ({
  repararAlmacenamientoLocal: vi.fn(),
}));
import { repararAlmacenamientoLocal } from '../core/status/storageRepair';

describe('SystemLogs — reparación del almacenamiento (1.10.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repararAlmacenamientoLocal.mockResolvedValue({ ok: false, error: 'boom' });
  });

  it('confirmación en dos pasos: el primer clic arma, el segundo ejecuta', async () => {
    render(<SystemLogs />);

    fireEvent.click(screen.getByRole('button', { name: /Reparar base de datos/ }));
    // Armado: NO se borró nada todavía.
    expect(repararAlmacenamientoLocal).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Sí, borrar y recrear la base/ })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Sí, borrar y recrear la base/ }));
    await waitFor(() => expect(repararAlmacenamientoLocal).toHaveBeenCalledTimes(1));
  });

  it('un fallo de la reparación se informa en la propia tarjeta', async () => {
    render(<SystemLogs />);
    fireEvent.click(screen.getByRole('button', { name: /Reparar base de datos/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sí, borrar y recrear la base/ }));

    await waitFor(() =>
      expect(screen.getByText(/No se pudo reparar: boom/)).toBeTruthy()
    );
  });

  it('"Cancelar" desarma sin ejecutar la reparación', () => {
    render(<SystemLogs />);
    fireEvent.click(screen.getByRole('button', { name: /Reparar base de datos/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));

    expect(screen.getByRole('button', { name: /Reparar base de datos/ })).toBeTruthy();
    expect(repararAlmacenamientoLocal).not.toHaveBeenCalled();
  });
});
