/**
 * GlobalSearch.test.jsx — Tests 1.10.1 (Release 1.10.1)
 *
 * Cubre los hallazgos de la auditoría sobre la Búsqueda Global:
 * - X04 (ALTO): la consulta se debouncea 300ms; el motor NO corre en cada tecla
 *   (recorría casos/notas/eventos + TODO case_history por pulsación).
 * - X10 (MEDIO): role=dialog con gestor de foco/Escape vía useDialogA11y.
 * - X18 (MEDIO): resultados con role=listbox/option + aria-activedescendant.
 * - S11/S11b (ALTO/MEDIO): grupo "Estudios Jurídicos" con el campo real
 *   .estudio del mapeo y subtítulos con casesCount/.estudio reales.
 * - X14 (MEDIO): firma exacta del handler de navegación a Útiles
 *   (onNavigateUtiles(tab, nombre, tipo) / onSelectEntity(tipo, nombre)).
 *
 * El store se mockea con la misma convención que CsvExportModal.test.jsx
 * (vi.fn + mockImplementation por selector) para no arrastrar estado global.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GlobalSearch from './GlobalSearch';
import useAppStore from '../../core/store/useAppStore';

vi.mock('../../core/store/useAppStore', () => ({ default: vi.fn() }));

// El load de case_history (Dexie) se sustituye por una promesa vacía: el
// comportamiento bajo test es de UI/debounce, no de indexado de historial.
vi.mock('../../core/db/casesDB', () => ({
  default: { case_history: { toArray: () => Promise.resolve([]) } },
}));

const CASES = [
  { id: 'c1', nombre: 'NIZ PATRICIA', aseguradora: 'SANCOR', estudioJuridico: 'Estudio Ejemplo & Asoc.', tags: [], comentarios: [] },
  { id: 'c2', nombre: 'OTRO CASO', aseguradora: 'SANCOR', estudioJuridico: 'Estudio Ejemplo & Asoc.', tags: [], comentarios: [] },
];

// Shape real de MAPEO_EJEMPLO: mismo estudio repetido por provincia.
const MAPEO = [
  { id: 'm1', estudio: 'Estudio Ejemplo & Asoc.', provincia: 'Buenos Aires' },
  { id: 'm2', estudio: 'Estudio Ejemplo & Asoc.', provincia: 'CABA' },
];

const CONDICIONALES = [
  { aseguradora: 'SANCOR', estudio: 'Estudio Ejemplo & Asoc.', condicion: 'no-toma' },
];

const setUIState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.mockImplementation((selector) =>
    selector({
      ui: { globalSearchOpen: true },
      setUIState,
      cases: CASES,
      notes: [],
      events: [],
    })
  );
});

const renderBusqueda = (props = {}) =>
  render(
    <GlobalSearch
      aseguradoras={['SANCOR', 'OSDE']}
      mapeo={MAPEO}
      condicionales={CONDICIONALES}
      {...props}
    />
  );

// El debounce son 300ms: todo assertion de "resultados" espera ese lapso.
const OP_TIMEOUT = { timeout: 3000 };

describe('GlobalSearch · X04 (debounce 300ms)', () => {
  it('no muestra resultados en la misma tecla; recién aparecen tras el debounce', async () => {
    renderBusqueda();
    const input = screen.getByRole('combobox');
    const inicio = Date.now();

    fireEvent.change(input, { target: { value: 'sancor' } });

    // Síncrono (React ya flusheó la tecla) NO hay listbox: el motor no corrió.
    expect(screen.queryByRole('listbox')).toBeNull();

    await screen.findByRole('listbox', {}, OP_TIMEOUT);
    // Margen mínima por reloj: si el debounce desapareciera, esto es ~0ms.
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(290);
    // El input sigue controlado y tipeable en vivo mientras tanto.
    expect(input.value).toBe('sancor');
  });
});

describe('GlobalSearch · X18 (listbox/option + aria-activedescendant)', () => {
  it('expone listbox con options y el input apunta a la opción cursor', async () => {
    renderBusqueda();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'ejemplo' } });

    const listbox = await screen.findByRole('listbox', {}, OP_TIMEOUT);
    expect(listbox.id).toBe('gs-listbox');
    expect(input.getAttribute('aria-controls')).toBe('gs-listbox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');

    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);

    // Las flechas mueven el cursor y el input lo refleja (id de la opción).
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id);
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });
});

describe('GlobalSearch · S11/S11b (grupos y subtítulos de entidades)', () => {
  it('S11: el grupo "Estudios Jurídicos" aparece leyendo .estudio (deduplicado)', async () => {
    renderBusqueda();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ejemplo' } });

    await screen.findByRole('listbox', {}, OP_TIMEOUT);
    expect(screen.getByText('Estudios Jurídicos')).toBeTruthy();
    // Dos filas de mapeo del mismo estudio → un solo resultado.
    expect(screen.getAllByText('Estudio Ejemplo & Asoc.').length).toBeGreaterThanOrEqual(1);
  });

  it('S11b: el subtítulo de aseguradora muestra el casesCount real', async () => {
    renderBusqueda();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sancor' } });

    await screen.findByRole('listbox', {}, OP_TIMEOUT);
    expect(screen.getByText('2 casos')).toBeTruthy();
    // Nunca debe aparecer el "0 casos" fijo de 1.10.0.
    expect(screen.queryByText('0 casos')).toBeNull();
  });

  it('S11b: el subtítulo de condicional usa .estudio y la etiqueta legible', async () => {
    renderBusqueda();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sancor' } });

    await screen.findByRole('listbox', {}, OP_TIMEOUT);
    expect(screen.getByText('No toma — Estudio Ejemplo & Asoc.')).toBeTruthy();
  });
});

describe('GlobalSearch · X10 (dialog a11y)', () => {
  it('expone role=dialog y Escape cierra el buscador', async () => {
    renderBusqueda();
    const dialog = screen.getByRole('dialog', { name: 'Búsqueda global' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(setUIState).toHaveBeenCalledWith({ globalSearchOpen: false })
    );
  });
});

describe('GlobalSearch · X14 (firma de navegación a Útiles)', () => {
  // 'ejemplo' no matchea casos por Fuse (sin aseguradora/nombre "ejemplo"):
  // el primer resultado es el estudio y Enter lo selecciona directo.
  it('sin onNavigateUtiles cae en el prop legado onSelectEntity(tipo, nombre)', async () => {
    const onSelectEntity = vi.fn();
    renderBusqueda({ onSelectEntity });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ejemplo' } });
    await screen.findByRole('listbox', {}, OP_TIMEOUT);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelectEntity).toHaveBeenCalledWith('lawFirm', 'Estudio Ejemplo & Asoc.');
    await waitFor(() =>
      expect(setUIState).toHaveBeenCalledWith({ globalSearchOpen: false })
    );
  });

  it('con onNavigateUtiles(tab, nombre, tipo) navega al tab exacto de Útiles', async () => {
    const onNavigateUtiles = vi.fn();
    renderBusqueda({ onNavigateUtiles });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ejemplo' } });
    await screen.findByRole('listbox', {}, OP_TIMEOUT);

    // item 0 = estudio (lawFirm → tab 'mapeo'), item 1 = condicional.
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onNavigateUtiles).toHaveBeenCalledWith(
      'mapeo',
      'Estudio Ejemplo & Asoc.',
      'lawFirm'
    );
  });

  it('un condicional navega al tab condicionales con su aseguradora', async () => {
    const onNavigateUtiles = vi.fn();
    renderBusqueda({ onNavigateUtiles });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ejemplo' } });
    await screen.findByRole('listbox', {}, OP_TIMEOUT);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onNavigateUtiles).toHaveBeenCalledWith(
      'condicionales',
      'SANCOR',
      'condicional'
    );
  });
});
