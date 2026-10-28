import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import appDB from '../db/appDB';
import casesDB from '../db/casesDB';
import { reportError } from '../error/reportError';
import { normalizarCasos } from '../../utils/ubicacionUtils';
import { caseRepository } from '../cases/caseRepository';
import { touchVersion, assertNoConflict } from '../db/versioning';
import { notifyChange, subscribeToChanges, SYNC_EVENTS } from '../sync/syncService';
import { repararPreferenciasPersistidas } from '../integrity/referentialChecks';
// v1.10.6: huella de conteos + verificación post-carga contra pérdida del
// archivo de IndexedDB (ver storageHealth.js).
import { actualizarHuellaDatos, verificarDatosPostCarga } from '../status/storageHealth';
// C02b (1.10.1): import estático seguro — ruleEngine es un módulo hoja sin
// imports propios, así que no reintroduce el ciclo que obliga al import
// dinámico de notificationManager/soundSystem más abajo.
import { ruleEngine } from '../notifications/ruleEngine';
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
  dashTabOrder: ['insights', 'analitica', 'resumen', 'rendimiento', 'geografia', 'estudios', 'estados'],
  kanbanSections: ['pipelineBar', 'columnas'],
  tablaSections: ['pipelineBar', 'tabla', 'paginacion'],
  reportesSections: ['pipelineBar', 'lista', 'paginacion'],
  utilesTabOrder: ['speechs', 'objeciones', 'conversacion', 'pasos', 'aseguradoras', 'mapeo', 'lesiones', 'transito', 'prolegal', 'condicionales', 'plantillas'],
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
  // C03 (1.10.1): espejo (no persistido) de la config de usuario para que
  // componentes profundos (Pill y futuros consumidores de catálogos) puedan
  // resolver `getEstados(config)` por la store sin recibir config por props.
  // La fuente de verdad sigue siendo `config-art-tracker` (useStorage en
  // App.jsx), que la empuja aquí en el mismo effect que llama a
  // notificationManager.configure().
  config: null,
  setConfig: (config) => set({ config }),

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
  dashTab: 'analitica',
  dashTabOrder: ORDENES_DEFAULT.dashTabOrder,
  dashWidgetOrder: {},

  setDashTab: (v) => set({ dashTab: v }),
  setDashTabOrder: (v) => set({ dashTabOrder: v }),
  setDashWidgetOrder: (v) => set({ dashWidgetOrder: v }),
  restoreDashboardDefaults: () => set({
    dashTabOrder: ORDENES_DEFAULT.dashTabOrder,
    dashWidgetOrder: {},
    dashTab: 'analitica',
  }),

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
      // v1.10.6: huella de integridad (detecta recreación vacía de la DB).
      actualizarHuellaDatos({ cases: data.length });
    } catch (err) {
      // v1.10.6: mensaje localizado (aparece en el toast) y el reporte
      // central extrae `context` y clasifica la pérdida de almacenamiento.
      reportError({ type: 'db', message: 'Error al cargar los casos', context: err });
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
      const prev = get().cases.find((c) => c.id === id);
      const hasLoc = 'localidad' in updates || 'provincia' in updates;
      const normal = hasLoc
        ? normalizarCasos([{ ...prev, ...updates }])[0]
        : updates;
      const updated = await caseRepository.update(id, normal);
      if (!updated) return;
      set((s) => {
        const current = s.cases;
        const idx = current.findIndex((c) => c.id === id);
        if (idx === -1) return { cases: [...current, updated] };
        if (current[idx] === updated) return {};
        const next = current.slice();
        next[idx] = updated;
        return { cases: next };
      });
    } catch (err) {
      reportError({ type: 'db', message: 'Error updating case', context: err });
      throw err;
    }
  },

  deleteCase: async (id) => {
    try {
      const removeCaseRef = (ids) => Array.isArray(ids) ? ids.filter((cid) => cid !== id) : ids;

      await Promise.all([
        appDB.notes.filter((note) => Array.isArray(note.relatedCaseIds) && note.relatedCaseIds.includes(id)).modify((note) => {
          note.relatedCaseIds = removeCaseRef(note.relatedCaseIds);
        }),
        appDB.events.filter((event) => Array.isArray(event.relatedCaseIds) && event.relatedCaseIds.includes(id)).modify((event) => {
          event.relatedCaseIds = removeCaseRef(event.relatedCaseIds);
        }),
        casesDB.case_history.where('caseId').equals(id).delete(),
      ]);

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
      // v1.10.6: huella de integridad (detecta recreación vacía de la DB).
      actualizarHuellaDatos({ notes: data.length });
    } catch (err) {
      // v1.10.6: mensaje localizado (aparece en el toast) y el reporte
      // central extrae `context` y clasifica la pérdida de almacenamiento
      // (antes el error se tragaba y la lista quedaba vacía sin aviso).
      reportError({ type: 'db', message: 'Error al cargar las notas', context: err });
    }
  },

  setNotes: (notes) => set({ notes }),

  addNote: async (note) => {
    try {
      const id = await appDB.notes.add(touchVersion(note));
      notifyChange(SYNC_EVENTS.NOTES_UPDATED, { action: 'create', id });
      const created = { ...note, id };
      set((s) =>
        s.notes.some((n) => n.id === id)
          ? {}
          : { notes: [created, ...s.notes] }
      );
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
      set((s) => {
        const current = s.notes;
        const idx = current.findIndex((n) => n.id === id);
        if (idx === -1) return {};
        if (current[idx] === merged) return {};
        const next = current.slice();
        next[idx] = merged;
        return { notes: next };
      });
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
      // v1.10.6: huella de integridad (detecta recreación vacía de la DB).
      actualizarHuellaDatos({ events: data.length });
    } catch (err) {
      // v1.10.6: mensaje localizado (aparece en el toast) y el reporte
      // central extrae `context` y clasifica la pérdida de almacenamiento.
      reportError({ type: 'db', message: 'Error al cargar los eventos', context: err });
    }
  },

  addEvent: async (event) => {
    try {
      const id = await appDB.events.add(touchVersion(event));
      notifyChange(SYNC_EVENTS.EVENTS_UPDATED, { action: 'create', id });
      const created = { ...event, id };
      set((s) =>
        s.events.some((e) => e.id === id)
          ? {}
          : { events: [...s.events, created] }
      );
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
      set((s) => {
        const current = s.events;
        const idx = current.findIndex((e) => e.id === id);
        if (idx === -1) return {};
        if (current[idx] === merged) return {};
        const next = current.slice();
        next[idx] = merged;
        return { events: next };
      });
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

  // T01 (1.10.1): antes iba directo a notificationStore.addToast y se saltaba
  // TODOS los gates de config (notifInApp, notifMinToastPriority,
  // notifFrecuencia, modoNoMolestar, sonido, escritorio y el Centro de
  // notificaciones). Ahora delega en notificationManager.notify — el mismo
  // canal que usa showToast de App—, por lo que esas preferencias por fin
  // aplican a alertsSystem y CSVImporter. Se conserva la firma
  // (message, type, duration) para no romper a los consumidores; solo cambia
  // el destino. El import es dinámico (mismo patrón que antes con
  // notificationStore) para no introducir un import cíclico estático
  // useAppStore → notificationManager → soundSystem → productivityStore → …
  addToast: (message, type = 'info', duration = 3000) => {
    const payload = {
      title: '',
      message,
      type,
      // Sin `priority` explícita: ruleEngine.resolvePriority la deriva del
      // type (error→high, warning→medium, info/success→low).
      timestamp: Date.now(),
      duration: duration || 3000,
    };
    try {
      import('../notifications/notificationManager').then(({ notificationManager }) => {
        const result = notificationManager.notify(payload);
        // Fallback: si el manager aún no inicializó (init corre en App.jsx al
        // montar; antes de eso, o en tests/unit, notify devuelve null) se
        // mantiene el comportamiento viejo (toast directo) para no perder el
        // mensaje. Si el manager SÍ está inicializado y devolvió null, fue
        // filtrado por config (modoNoMolestar, toggle de tipo, duplicado…):
        // se respeta el gate, que es justamente el objetivo del fix.
        if (result === null && !notificationManager.isReady()) {
          // C02b (1.10.1): el fallback escribía el toast sin NINGÚN gate de
          // config, así que en esa ventana (arranque de React previo a
          // notificationManager.init, o tests) `ignorarLowPriority` no se
          // aplicaba y un aviso de prioridad baja se pintaba igual — el
          // usuario veía "el toggle no funciona". Ahora se lee la config
          // persistida y se aplica el mismo shouldShowToast del pipeline
          // central (además notifInApp y notifMinToastPriority, que tampoco
          // se respetaban). `priority` se deriva igual que en notify() para
          // que info/success caigan en 'baja' y un error (high) no se
          // silencie por accidente.
          let savedCfg = {};
          try {
            const rawCfg = localStorage.getItem("config-art-tracker");
            savedCfg = rawCfg ? JSON.parse(rawCfg) : {};
          } catch {
            savedCfg = {};
          }
          payload.priority = ruleEngine.resolvePriority(payload);
          if (!ruleEngine.shouldShowToast(payload, savedCfg || {})) return;
          import('../notifications/notificationStore').then(({ default: store }) => {
            if (!store || !store.getState) return;
            store.getState().addToast(payload);
          });
        }
      });
    } catch {}
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
    // v1.10.6: verificación de integridad post-carga — DEBE correr después de
    // que los loaders terminaron (ellos registran la huella y, si fallaron,
    // reportError ya marcó la pérdida). Detecta: (a) DB ilegible (banner de
    // emergencia ya activo), (b) DB recreada con menos datos que la última
    // sesión (alarma de pérdida silenciosa) o (c) pérdida previa recuperada
    // con la recarga (se libera la bandera y se avisa).
    const resumen = verificarDatosPostCarga({
      cases: get().cases.length,
      notes: get().notes.length,
      events: get().events.length,
    });
    if (resumen.caso === 'recuperado') {
      get().addToast('El almacenamiento local volvió a estar disponible.', 'success', 6000);
    } else if (resumen.caso === 'sin-huellas') {
      // v1.10.7: la base volvió a leerse pero no hay huella previa con la
      // que verificar que los datos estén completos (p. ej. primer arranque
      // en 1.10.6 ya con la base dañada). Un "todo bien" aquí taparía una
      // pérdida real: se informa la limitación y la vía de recuperación.
      get().addToast(
        'El almacenamiento local volvió a estar disponible, pero no hay registros previos para verificar que los datos estén completos. Si faltan datos, restaurá desde un backup.',
        'warning',
        10000
      );
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
