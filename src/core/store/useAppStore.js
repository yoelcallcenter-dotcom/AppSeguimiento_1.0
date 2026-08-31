import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import appDB from '../db/appDB';
import { reportError } from '../error/reportError';
import { normalizarCasos } from '../../utils/ubicacionUtils';
import { caseRepository } from '../cases/caseRepository';
import { touchVersion, assertNoConflict } from '../db/versioning';
import { notifyChange, subscribeToChanges, SYNC_EVENTS } from '../sync/syncService';
import { repararPreferenciasPersistidas } from '../integrity/referentialChecks';

const savedTheme = (() => {
  try { return localStorage.getItem('app-theme') || 'dark'; } catch { return 'dark'; }
})();
const savedPalette = (() => {
  try { return localStorage.getItem('app-palette') || 'default'; } catch { return 'default'; }
})();

/**
 * Órdenes de secciones/vistas válidas (fuente única).
 * La capa de integridad usa estas listas para reparar preferencias
 * persistentes corruptas u obsoletas sin resetear las válidas.
 */
export const ORDENES_DEFAULT = {
  dashTabOrder: ['analitica', 'resumen', 'rendimiento', 'geografia', 'estudios', 'estados'],
  kanbanSections: ['pipelineBar', 'columnas'],
  tablaSections: ['pipelineBar', 'tabla', 'paginacion'],
  reportesSections: ['pipelineBar', 'lista', 'paginacion'],
  utilesTabOrder: ['condicionales', 'pasos', 'speechs', 'objeciones', 'conversacion', 'aseguradoras', 'lesiones', 'prolegal', 'transito', 'mapeo'],
};

const useAppStore = create(
  persist(
    (set, get) => ({
  // --- Data ---
  cases: [],
  casesLoaded: false,
  notes: [],
  notesLoaded: false,
  events: [],
  eventsLoaded: false,

  // --- Config ---
  theme: savedTheme,
  palette: savedPalette,

  // --- UI ---
  ui: {
    loading: false,
    globalSearchOpen: false,
    toasts: [],
    modals: {},
  },

  // --- Dashboard ---
  dashActiveFilter: null,
  dashTab: 'analitica',
  dashTabOrder: ORDENES_DEFAULT.dashTabOrder,
  dashWidgetOrder: {},

  setDashActiveFilter: (v) => set({ dashActiveFilter: v }),
  setDashTab: (v) => set({ dashTab: v }),
  setDashTabOrder: (v) => set({ dashTabOrder: v }),
  setDashWidgetOrder: (v) => set({ dashWidgetOrder: v }),

  // --- View Section Orders ---
  kanbanSections: ORDENES_DEFAULT.kanbanSections,
  tablaSections: ORDENES_DEFAULT.tablaSections,
  reportesSections: ORDENES_DEFAULT.reportesSections,
  utilesTabOrder: ORDENES_DEFAULT.utilesTabOrder,

  setKanbanSections: (v) => set({ kanbanSections: v }),
  setTablaSections: (v) => set({ tablaSections: v }),
  setReportesSections: (v) => set({ reportesSections: v }),
  setUtilesTabOrder: (v) => set({ utilesTabOrder: v }),

  // --- Errors ---
  errorLog: [],

  // ==================== CASES ====================
  loadCases: async () => {
    try {
      const data = normalizarCasos(await caseRepository.getAll());
      set({ cases: data, casesLoaded: true });
    } catch (err) {
      reportError({ type: 'db', message: 'Error loading cases', context: err });
    }
  },

  setCases: (cases) => {
    const normalized = normalizarCasos(cases);
    const prev = get().cases;
    if (prev.length === normalized.length && prev.every((c, i) => c === normalized[i])) return;
    set({ cases: normalized });
  },

  addCase: async (caso) => {
    try {
      const normal = normalizarCasos([caso])[0];
      const created = await caseRepository.create(normal);
      set((s) => ({ cases: [...s.cases, created] }));
      return created.id;
    } catch (err) {
      reportError({ type: 'db', message: 'Error adding case', context: err });
      throw err;
    }
  },

  updateCase: async (id, updates) => {
    try {
      const hasLoc = 'localidad' in updates || 'provincia' in updates;
      const normal = hasLoc
        ? normalizarCasos([{ ...get().cases.find((c) => c.id === id), ...updates }])[0]
        : updates;
      const updated = await caseRepository.update(id, normal);
      if (!updated) return;
      set((s) => ({
        cases: s.cases.map((c) => (c.id === id ? updated : c)),
      }));
    } catch (err) {
      reportError({ type: 'db', message: 'Error updating case', context: err });
      throw err;
    }
  },

  deleteCase: async (id) => {
    try {
      await caseRepository.remove(id);
      set((s) => ({ cases: s.cases.filter((c) => c.id !== id) }));
    } catch (err) {
      reportError({ type: 'db', message: 'Error deleting case', context: err });
      throw err;
    }
  },

  bulkSaveCases: async (newCases) => {
    try {
      const normal = normalizarCasos(newCases);
      const saved = await caseRepository.bulkReplace(normal);
      set({ cases: saved });
    } catch (err) {
      reportError({ type: 'db', message: 'Error bulk saving cases', context: err });
      throw err;
    }
  },

  appendCases: async (newCases) => {
    try {
      const normalized = normalizarCasos(newCases);
      const result = await caseRepository.bulkAppend(normalized);
      set({ cases: result.merged });
      return { added: result.added, skipped: result.skipped };
    } catch (err) {
      reportError({ type: 'db', message: 'Error appending cases', context: err });
      throw err;
    }
  },

  // ==================== NOTES ====================
  loadNotes: async () => {
    try {
      const data = await appDB.notes.orderBy('updatedAt').reverse().toArray();
      set({ notes: data, notesLoaded: true });
    } catch (err) {
      reportError({ type: 'db', message: 'Error loading notes', context: err });
    }
  },

  setNotes: (notes) => set({ notes }),

  addNote: async (note) => {
    try {
      const id = await appDB.notes.add(touchVersion(note));
      notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'create', id });
      set((s) => ({ notes: [{ ...note, id }, ...s.notes] }));
      return id;
    } catch (err) {
      reportError({ type: 'db', message: 'Error adding note', context: err });
      throw err;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const existing = await appDB.notes.get(id);
      if (!existing) throw new Error(`Note ${id} not found`);
      assertNoConflict(updates, existing);
      const merged = touchVersion({ ...existing, ...updates });
      await appDB.notes.put(merged);
      notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'update', id });
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? merged : n)),
      }));
    } catch (err) {
      reportError({ type: 'db', message: 'Error updating note', context: err });
      throw err;
    }
  },

  deleteNote: async (id) => {
    try {
      await appDB.notes.delete(id);
      notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'delete', id });
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    } catch (err) {
      reportError({ type: 'db', message: 'Error deleting note', context: err });
      throw err;
    }
  },

  // ==================== EVENTS ====================
  loadEvents: async () => {
    try {
      const data = await appDB.events.orderBy('startDate').toArray();
      set({ events: data, eventsLoaded: true });
    } catch (err) {
      reportError({ type: 'db', message: 'Error loading events', context: err });
    }
  },

  addEvent: async (event) => {
    try {
      const id = await appDB.events.add(touchVersion(event));
      notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'create', id });
      set((s) => ({ events: [...s.events, { ...event, id }] }));
      return id;
    } catch (err) {
      reportError({ type: 'db', message: 'Error adding event', context: err });
      throw err;
    }
  },

  updateEvent: async (id, updates) => {
    try {
      const existing = await appDB.events.get(id);
      if (!existing) throw new Error(`Event ${id} not found`);
      assertNoConflict(updates, existing);
      const merged = touchVersion({ ...existing, ...updates });
      await appDB.events.put(merged);
      notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'update', id });
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? merged : e)),
      }));
    } catch (err) {
      reportError({ type: 'db', message: 'Error updating event', context: err });
      throw err;
    }
  },

  deleteEvent: async (id) => {
    try {
      await appDB.events.delete(id);
      notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'delete', id });
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    } catch (err) {
      reportError({ type: 'db', message: 'Error deleting event', context: err });
      throw err;
    }
  },

  // ==================== THEME ====================
  setTheme: (theme) => {
    set({ theme });
    try { localStorage.setItem('app-theme', theme); } catch {}
  },

  setPalette: (palette) => {
    set({ palette });
    try { localStorage.setItem('app-palette', palette); } catch {}
  },

  // ==================== UI ====================
  setUIState: (ui) => set((s) => ({ ui: { ...s.ui, ...ui } })),

  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString(36);
    set((s) => ({ ui: { ...s.ui, toasts: [...s.ui.toasts, { id, message, type }] } }));
    setTimeout(() => {
      set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } }));
    }, duration);
  },

  removeToast: (id) => set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } })),

  // ==================== ERRORS ====================
  logError: (error) => set((s) => ({ errorLog: [...s.errorLog.slice(-99), { ...error, timestamp: new Date().toISOString() }] })),

  clearErrorLog: () => set({ errorLog: [] }),

  // ==================== INIT ====================
  init: async () => {
    set({ ui: { ...get().ui, loading: true } });
    try {
      await Promise.all([get().loadCases(), get().loadNotes(), get().loadEvents()]);
    } catch (err) {
      reportError({ type: 'system', message: 'Init failed', context: err });
    } finally {
      set({ ui: { ...get().ui, loading: false } });
    }
  },
}),
  {
    name: 'app-view-orders',
    // Persistir SOLO el orden de secciones/vistas configurado por el usuario.
    partialize: (state) => ({
      dashTabOrder: state.dashTabOrder,
      dashWidgetOrder: state.dashWidgetOrder,
      kanbanSections: state.kanbanSections,
      tablaSections: state.tablaSections,
      reportesSections: state.reportesSections,
      utilesTabOrder: state.utilesTabOrder,
    }),
    // Integridad (1.3.3): al hidratar, las órdenes guardadas se reparan contra
    // los defaults canónicos — se descartan IDs obsoletos, se agregan las
    // secciones nuevas al final y el orden válido existente se conserva.
    merge: (persisted, current) => {
      let patch = {};
      try {
        const resultado = repararPreferenciasPersistidas(persisted || {}, ORDENES_DEFAULT);
        patch = resultado.patch;
        if (resultado.cambios.length > 0) {
          try {
            const raw = localStorage.getItem('app_integrity_log');
            const log = raw ? JSON.parse(raw) : [];
            log.push({
              ts: new Date().toISOString(),
              tipo: 'preferencias-reparadas',
              detalle: `Órdenes ajustados al hidratar: ${resultado.cambios.map((c) => c.clave).join(', ')}`.slice(0, 300),
            });
            localStorage.setItem('app_integrity_log', JSON.stringify(log.slice(-50)));
          } catch { /* almacenamiento no disponible */ }
        }
      } catch {
        patch = {};
      }
      return { ...current, ...(persisted || {}), ...patch };
    },
  }
  )
);

export default useAppStore;

// ==================== SYNC MULTI-PESTAÑA ====================
// Recarga los datos del store cuando otra pestaña notifica cambios.
let syncListenersReady = false;
function initSyncListeners() {
  if (syncListenersReady) return;
  syncListenersReady = true;
  subscribeToChanges((event) => {
    const s = useAppStore.getState();
    switch (event.type) {
      case SYNC_EVENTS.CASES_UPDATED:
        s.loadCases();
        break;
      case SYNC_EVENTS.NOTES_UPDATED:
        s.loadNotes();
        break;
      case SYNC_EVENTS.EVENTS_UPDATED:
        s.loadEvents();
        break;
      case SYNC_EVENTS.DATA_IMPORTED:
      case SYNC_EVENTS.DATA_CLEARED:
      case SYNC_EVENTS.ALL_DATA_UPDATED:
        s.loadCases();
        s.loadNotes();
        s.loadEvents();
        break;
      default:
        break;
    }
  });
}
initSyncListeners();
