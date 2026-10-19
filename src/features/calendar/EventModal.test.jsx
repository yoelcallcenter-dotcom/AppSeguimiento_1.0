import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventModal from './EventModal';

// 1.10.3 (rediseño modales de evento): tests del rediseño y del fix del
// nombre del caso duplicado en "Vincular casos" (antes aparecía en los chips
// del propio modal Y en los chips internos del CaseLinker).

const CASOS = [
  { id: 'c1', nombre: 'Yoel Libay', telefono: '1234', estado: 'Activo', aseguradora: 'ART X' },
  { id: 'c2', nombre: 'Ana Diaz', telefono: '5678', estado: 'Cita virtual', aseguradora: 'ART Y' },
];

const EVENTO = {
  id: 42,
  title: 'Cita con cliente',
  startDate: '2026-10-19T09:00:00',
  endDate: '2026-10-19T10:00:00',
  status: 'pending',
  priority: 'medium',
  relatedCaseIds: ['c1'],
};

function renderModal(extra = {}) {
  const props = {
    isOpen: true,
    onClose: () => {},
    onSave: () => {},
    event: EVENTO,
    casos: CASOS,
    ...extra,
  };
  return render(<EventModal {...props} />);
}

describe('EventModal (1.10.3 · rediseño)', () => {
  it('muestra el nombre del caso vinculado UNA sola vez (fix duplicado)', () => {
    renderModal();
    expect(screen.getAllByText('Yoel Libay')).toHaveLength(1);
  });

  it('el chip del caso vinculado permite abrirlo (onVerCaso) y quitarlo', () => {
    const onVerCaso = vi.fn();
    renderModal({ onVerCaso });

    // Abrir: el chip gana la acción "abrir" que antes solo tenían los
    // chips duplicados del modal.
    fireEvent.click(screen.getByLabelText('Abrir caso: Yoel Libay'));
    expect(onVerCaso).toHaveBeenCalledTimes(1);
    expect(onVerCaso).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));

    // Quitar: el vínculo desaparece de la lista de seleccionados.
    fireEvent.click(screen.getByLabelText('Quitar vínculo: Yoel Libay'));
    expect(screen.queryByText('Yoel Libay')).toBeNull();
  });

  it('arrasta la hora fin al mover el inicio (duración conservada)', () => {
    renderModal();
    // Evento 09:00–10:00 (1 h) → mover inicio a 12:30 arrastra fin a 13:30.
    fireEvent.change(screen.getByLabelText('Hora inicio'), { target: { value: '12:30' } });
    expect(screen.getByLabelText('Hora fin').value).toBe('13:30');
  });

  it('no pisa la hora fin si el usuario la editó a mano', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Hora fin'), { target: { value: '15:00' } });
    fireEvent.change(screen.getByLabelText('Hora inicio'), { target: { value: '12:00' } });
    expect(screen.getByLabelText('Hora fin').value).toBe('15:00');
  });

  it('los chips de estado exponen aria-pressed (select nativo reemplazado)', () => {
    renderModal();
    const grupo = screen.getByRole('group', { name: 'Estado' });
    expect(screen.getByRole('button', { name: 'Pendiente' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Confirmado' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Completado' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Cancelado' }).getAttribute('aria-pressed')).toBe('false');
    // El grupo existe y agrupa los 4 estados.
    expect(grupo.querySelectorAll('button')).toHaveLength(4);
  });

  it('valida el título obligatorio con role=alert (conservado del a11y)', () => {
    renderModal({ event: null });
    fireEvent.click(screen.getByText('Crear evento'));
    const alerta = screen.getAllByRole('alert').find(
      (a) => a.parentElement && a.parentElement.textContent.includes('El titulo es requerido')
    );
    expect(alerta).toBeTruthy();
    expect(alerta.getAttribute('aria-live')).toBe('polite');
  });
});
