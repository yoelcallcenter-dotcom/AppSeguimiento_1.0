import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Plus,
  Briefcase,
  LayoutGrid,
  Table2,
  ClipboardList,
  BarChart3,
  Settings,
  FileText,
  HelpCircle,
  Calendar as CalendarIcon,
  Activity,
  AlertCircle,
  UserCircle2,
  FileSpreadsheet,
  FilePlus,
  Filter,
  RotateCcw,
  X,
} from "lucide-react";

// Constants
import {
  CONFIG_DEFAULT,
  DEFAULT_PASOS,
  DEFAULT_TIPS,
  DEFAULT_LINKS,
  DEFAULT_SPEECHS,
  DEFAULT_OBJECIONES,
  DEFAULT_ASEGURADORAS_ART,
  DEFAULT_ASEGURADORAS_TRANSITO,
  DEFAULT_LESIONES,
  DEFAULT_TRANSITO_OBSERVACIONES,
  DEFAULT_CONDICIONALES,
  MAPEO_EJEMPLO,
} from "./utils/constants";

// Contexts
import { FontSizeProvider } from "./context/FontSizeContext";
import { TypographyProvider } from "./context/TypographyContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import {
  FiltersProvider,
  useFilters,
  aplicarFiltroGlobal,
  normalizarValorFiltro,
} from "./context/FiltersContext";
import { I18nProvider, useI18n } from "./context/I18nContext";
import { UXProvider } from "./context/UXContext";
import { getDefaultCategories } from "./features/dashboard/metricsEngine";
// Hooks
import { useStorage } from "./hooks/useStorage";
import { useCases } from "./hooks/useCases";
import { useDebounce } from "./hooks/useDebounce";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useViewTransition } from "./hooks/useViewTransition";
import { useModalStack } from "./hooks/useModalStack";

import { recordGoalAction, pushLastCase } from "./features/productivity/productivityStore";

// Utils
import { casoEnMes, getAvailableMonthsConReportes, normalizeDate } from "./utils/dateFilters";
// M25 (1.10.1): firmas del mes con la regla canónica (fechaFirma) para la
// celebración de la meta mensual (antes Firmo−Baja por c.fecha crudo).
import { countSignedInMonth, setEstadosSuccess } from "./features/operator/operatorMetrics";
import { casoCoincide } from "./utils/searchEngine";
// v1.9.7 (fix B7): limpieza one-time de claves conversaciones_* huérfanas
// (nota conocida de 1.9.6 al importar backups viejos).
import { limpiarConversacionesHuerfanas } from "./utils/conversaciones";
// v1.9.7 (fix B1): aplicarBusquedaFiltro reemplaza el bloque inline del filtro
// "todos/activos/pendientes/hoy" — la lógica vive testeada en filtrarQuickFilter.js.
import { aplicarQuickFilter, quickFilterChip, aplicarBusquedaFiltro } from "./utils/filtrarQuickFilter";
import { trackEvent, evaluate } from "./utils/behaviorEngine";
import { notificationManager } from "./core/notifications/notificationManager";
import { soundSystem } from "./core/notifications/soundSystem";
import { eventBus, AppEvents } from "./core/events/eventBus";
import { notifyChange, SYNC_EVENTS } from "./core/sync/syncService";
// P01 (1.10.1): clearErrors para vaciar el log de diagnóstico en el borrado total.
import { reportError, clearErrors } from "./core/error/reportError";
import { localStorageAdapter } from "./core/storage/localStorageAdapter";
import { setupAutoBackupWatcher, normalizeAutoBackupHistory } from "./services/autoBackup";
import { startSystemStatusMonitor } from "./core/status/storageHealth";
import { SystemStatusBanner } from "./components/common/SystemStatusBanner";
import { NotificationBell } from "./components/notifications/NotificationBell";
import { ToastContainer } from "./components/notifications/ToastContainer";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { PersistentAlertContainer } from "./components/notifications/PersistentAlert";
import { UndoBanner } from "./components/common/UndoBanner";
import { CsvExportModal } from "./features/export/CsvExportModal";
import useCelebrationStore from "./core/celebrations/celebrationStore";

// PWA
import { initPWA, applyPWAUpdate } from "./pwa/pwa";
import { PwaUpdateBanner } from "./pwa/PwaUpdateBanner";
import { InstallButton } from "./pwa/InstallButton";

// Meta de firmas para el "Logro de Objetivos" (coincide con LogroObjetivos.jsx).
const META_FIRMAS_MES = 14;

// Felicita cuando un caso pasa a "Firmo" o "Pendiente".
function celebrarEstado(caso, estado) {
  if (!caso) return;
  useCelebrationStore.getState().celebrate(
    `El caso ${caso.nombre || "sin nombre"} pasó a ${estado}`
  );
}

// C03 (1.10.1): "firmó" = estado en la categoría `success` del dashboard
// (por defecto ["Firmo"]). Antes había literales "Firmo" en App que se
// desincronizaban al renombrar el estado en Configuración: no se seteaba
// fechaFirma y la meta de firmas dejaba de contar. Las categorías se migran
// junto con el renombrado, así que este check sigue al estado nuevo.
// "Pendiente" en la celebración sigue siendo literal (no pertenece a ninguna
// categoría de forma exclusiva): límite documentado en el CHANGELOG de 1.10.1.
function esFirmaEstado(cats, estado) {
  return Array.isArray(cats?.success) && cats.success.includes(estado);
}

// Detecta si el mes del caso alcanzó la meta de firmas y felicita (una vez por mes).
function celebrarLogroSiCorresponde(casos, caso) {
  if (!caso) return;
  // M25/R03 (1.10.1): el mes se determina por la fecha de FIRMA normalizada
  // (fallback: fecha de creación normalizada) y las firmas del mes usan la
  // regla canónica countSignedInMonth (fechaFirma, sin resta de "Baja" y sin
  // `startsWith(c.fecha)` crudo, que ignoraba fechas legadas DD/MM/YYYY).
  const iso = normalizeDate(caso.fechaFirma) || normalizeDate(caso.fecha);
  if (!iso) return;
  const mes = iso.slice(0, 7);
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7)) - 1;
  const firmas = countSignedInMonth(casos, year, month);
  if (firmas < META_FIRMAS_MES) return;
  try {
    if (localStorage.getItem(`app_goal_celebrated_${mes}`) === "1") return;
    localStorage.setItem(`app_goal_celebrated_${mes}`, "1");
  } catch {}
  useCelebrationStore.getState().celebrate(
    `Objetivo del mes alcanzado: ${firmas} firmas`
  );
}

// Components - Common
import { Btn } from "./components/common/Btn";
import { FilterChip } from "./components/common/filters";
import { BtnOutline } from "./components/common/BtnOutline";
import { TextInput } from "./components/common/TextInput";
import { SearchInput } from "./components/common/SearchInput";
import { Spinner } from "./components/common/Spinner";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { OverlayPanel } from "./components/common/OverlayPanel";
import { useJustifyPestanas } from "./components/common/UINav";

// Features (lazy: se cargan bajo demanda para reducir el bundle inicial)
const NotesView = lazy(() => import("./features/notes").then((m) => ({ default: m.NotesView })));
const CalendarView = lazy(() => import("./features/calendar").then((m) => ({ default: m.CalendarView })));
const Dashboard = lazy(() => import("./features/dashboard/Dashboard"));
const GlobalSearch = lazy(() => import("./features/search/GlobalSearch"));
const CSVImporter = lazy(() => import("./features/import/CSVImporter"));

// Core
import useAppStore from "./core/store/useAppStore";
import { initTheme } from "./core/theme/themeManager";
import { startAlertSystem, runCaseRules } from "./features/alerts/alertsSystem";
// v1.10.0 (feature D): el motor de reglas se sincroniza con Configuración
// (toggles on/off + reglas custom creadas desde la UI).
import {
  getRules,
  registerRule,
  unregisterRule,
  enableRule,
} from "./features/rules/rulesEngine";
import {
  computeCaseChanges,
  recordCaseChanges,
  HISTORY_TYPES,
} from "./core/cases/caseHistory";
import { runIntegrityCheck } from "./core/integrity/integrityService";
import {
  syncCitaEvent,
  createRescheduleEvent,
} from "./core/cases/citaAutoEvents";
// 1.10.1: completar el evento automático de cita al recibir un reporte
// (helper idempotente en calendarStore; ver comentario ahí).
import { completarCitasDeCaso } from "./features/calendar/calendarStore";
import { formatCita } from "./utils/citaParser";

// Components - Views (lazy)
const KanbanView = lazy(() => import("./components/kanban/KanbanView").then((m) => ({ default: m.KanbanView })));
const TablaView = lazy(() => import("./components/tabla/TablaView").then((m) => ({ default: m.TablaView })));
const ReportesView = lazy(() => import("./components/reportes/ReportesView").then((m) => ({ default: m.ReportesView })));
const UtilesView = lazy(() => import("./components/utiles/UtilesView").then((m) => ({ default: m.UtilesView })));
const ConfiguracionView = lazy(() => import("./components/configuracion/ConfiguracionView").then((m) => ({ default: m.ConfiguracionView })));
const OperatorView = lazy(() => import("./features/operator/OperatorView").then((m) => ({ default: m.OperatorView })));

// Tour
import { TourProvider, useTour } from "./tour";
// Help
import { HelpProvider } from "./help";

// Components - Modales (lazy)
const VerCasoModal = lazy(() => import("./components/modales/VerCasoModal").then((m) => ({ default: m.VerCasoModal })));
const CasoEditModal = lazy(() => import("./components/modales/CasoEditModal").then((m) => ({ default: m.CasoEditModal })));
const ReporteRapidoModal = lazy(() => import("./components/modales/ReporteRapidoModal").then((m) => ({ default: m.ReporteRapidoModal })));
const FilterModal = lazy(() => import("./features/filtros/FilterModal").then((m) => ({ default: m.FilterModal })));

// Components - Overlays (lazy)
const HelpPanel = lazy(() => import("./components/ayuda/HelpPanel"));

// Error monitoring
import { ErrorBoundary } from "./components/ErrorBoundary";

// Services
import { saveKey, setupAutoSave } from "./services/StorageService";

// Utils
import { casoVacio, hoyISO, uid } from "./utils/helpers";
import { validateCaso } from "./validators/casoValidator";
import { exportarPDF } from "./utils/exportPDF";
import { APP_VERSION } from "./core/version";

/**
 * Serializa la reprogramación elegida en ReporteRapido al formato CITA del caso:
 * "DD/MM - (HH:MM a HH:MM)".
 * @param {{fecha:string, horaIni:string, horaFin:string}} repro
 * @returns {string}
 */
function citaDesdeReprogramacion(repro) {
  if (!repro || !repro.fecha) return "";
  const match = String(repro.fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
  let day = "";
  let month = "";
  if (match) {
    [, , month, day] = match;
  } else {
    const alt = String(repro.fecha).split("/");
    day = alt[0] || "";
    month = alt[1] || "";
  }
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} - (${repro.horaIni} a ${repro.horaFin})`;
}

// ============================================================
// CHROME (usa i18n para el título y las pestañas)
// ============================================================
function AppTitle() {
  const { t } = useI18n();
  return (
    <div className="hidden sm:block">
      <div className="flex items-center gap-1.5">
        <div
          className="text-sm font-bold leading-tight"
          style={{ color: "var(--color-accent)", textTransform: "uppercase" }}
        >
          {t("appTitle")}
        </div>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)", color: "var(--color-accent)" }}
          title={`Versión ${APP_VERSION}`}
        >
          v{APP_VERSION}
        </span>
      </div>
    </div>
  );
}

const VIEW_IMPORTS = {
  "mi-espacio": () => import("./features/operator/OperatorView"),
  dashboard: () => import("./features/dashboard/Dashboard"),
  kanban: () => import("./components/kanban/KanbanView"),
  tabla: () => import("./components/tabla/TablaView"),
  reportes: () => import("./components/reportes/ReportesView"),
  utiles: () => import("./components/utiles/UtilesView"),
};

function ViewTabs({ tabs, selectedView, onSelect }) {
  const { t } = useI18n();
  const justifyContent = useJustifyPestanas();
  const grupoPrincipal = tabs.filter(([k]) => k === "mi-espacio" || k === "dashboard");
  const grupoSecundario = tabs.filter(([k]) => k !== "mi-espacio" && k !== "dashboard");

  const renderBtn = ([k, label, Icon]) => {
    const isActive = selectedView === k;
    const isMiEspacio = k === "mi-espacio";
    const visibleLabel = t(`tabs.${k}`, label);
    return (
      <button
        key={k}
        onClick={() => onSelect(k)}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => {
          const load = VIEW_IMPORTS[k];
          if (load) load().catch(() => {});
        }}
        data-tour={k}
        // X08 (1.10.1): semántica de pestañas para lectores de pantalla —
        // aria-selected + aria-current; el grupo se marca como tablist más abajo.
        role="tab"
        aria-selected={isActive}
        aria-current={isActive ? "page" : undefined}
        // X09 (1.10.1): bajo 480px la etiqueta visible se oculta (hidden xs:inline),
        // por lo que el nombre accesible solo existía como texto del ícono (vacío).
        // Se agrega aria-label con la etiqueta completa en todos los breakpoints.
        aria-label={visibleLabel}
        title={visibleLabel}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors transition-shadow ${
          isActive
            ? isMiEspacio
              ? "text-[var(--color-text-on-accent)] shadow-md"
              : "bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]"
            : isMiEspacio
              ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)] shadow-sm"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
        }`}
        style={
          isActive && isMiEspacio
            ? { backgroundColor: "var(--color-accent)", border: "1px solid var(--color-accent)" }
            : undefined
        }
      >
        <Icon size={13} aria-hidden="true" />
        <span className="hidden xs:inline" aria-hidden="true">{visibleLabel}</span>
      </button>
    );
  };

  return (
    // X08: el strip de pestañas se expone como tablist.
    <div
      role="tablist"
      aria-label="Vistas principales"
      className="tab-strip scrollbar-hide items-center gap-0.5 pb-2 grow"
      style={{ justifyContent }}
    >
      {grupoPrincipal.map(renderBtn)}
      <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: "var(--color-border)" }} />
      {grupoSecundario.map(renderBtn)}
    </div>
  );
}

const VIEW_ORDER = [
  "mi-espacio",
  "dashboard",
  "kanban",
  "tabla",
  "reportes",
  "utiles",
];

function AppContent() {
  const { startTour } = useTour();
  const {
    selectedMonth,
    selectedYear,
    selectedDays,
    selectedView,
    setSelectedView,
    setSelectedMonth,
    setSelectedYear,
    setSelectedDays,
    quickFilter,
    setQuickFilter,
    filtroGlobal,
    setFiltroGlobal,
    resetFiltroGlobal,
  } = useFilters();

  const { showView, classNameFor } = useViewTransition(selectedView, VIEW_ORDER);

  // ============ STORAGE STATE ============
  const [casos, setCasos, casosLoaded, clearCasos, reloadCasos, casosError] = useCases();
  const [mapeo, setMapeo, mapeoLoaded] = useStorage(
    "mapeo-art-tracker",
    MAPEO_EJEMPLO
  );
  // configLoaded (v1.9.7): necesario para ejecutar la limpieza de claves
  // conversaciones_* con la config REAL de storage (useStorage carga async; con
  // el CONFIG_DEFAULT se borrarían mensajes de categorías custom).
  const [config, setConfig, configLoaded] = useStorage("config-art-tracker", CONFIG_DEFAULT);
  const [pasos, setPasos] = useStorage("pasos-art-tracker", DEFAULT_PASOS);
  const [tips, setTips] = useStorage("tips-art-tracker", DEFAULT_TIPS);
  const [links, setLinks] = useStorage("links-art-tracker", DEFAULT_LINKS);
  const [speechs, setSpeechs] = useStorage(
    "speechs-art-tracker",
    DEFAULT_SPEECHS
  );
  const [speechsInteractivos, setSpeechsInteractivos] = useStorage(
    "speechs-interactivos-art-tracker",
    []
  );
  const [objeciones, setObjeciones] = useStorage(
    "objeciones-art-tracker",
    DEFAULT_OBJECIONES
  );
  const [art, setArt] = useStorage("art-art-tracker", DEFAULT_ASEGURADORAS_ART);
  const [transito, setTransito] = useStorage(
    "transito-art-tracker",
    DEFAULT_ASEGURADORAS_TRANSITO
  );
  const [lesiones, setLesiones] = useStorage(
    "lesiones-art-tracker",
    DEFAULT_LESIONES
  );
  const [observacionesTransito, setObservacionesTransito] = useStorage(
    "observaciones-transito-art-tracker",
    DEFAULT_TRANSITO_OBSERVACIONES
  );
  const [condicionales, setCondicionales] = useStorage(
    "condicionales-art-tracker",
    DEFAULT_CONDICIONALES
  );

  // ============ UI STATE ============
  const [query, setQuery] = useState("");
  // v1.10.0 (revisión): se quitó el chip "Solo de hoy" del header (resultó muy
  // llamativo); el mismo atajo ahora vive en el filtro de Día (arriba de la
  // Pipeline Bar) marcando el día de HOY con un estilo propio (ver DayFilter).
  const [modalCaso, setModalCaso] = useState(null);
  const [modalReporte, setModalReporte] = useState(false);
  const [casoReporteRapido, setCasoReporteRapido] = useState(null);
  const [estadoReporteRapido, setEstadoReporteRapido] = useState(null);
  // N17/F12 (1.10.1): se eliminó `modalComentarios` — declarado en 1.3 y jamás
  // leído (solo se le asignaba null); ComentariosUI vive dentro de VerCasoModal.
  const [verCaso, setVerCaso] = useState(null);
  const [casosSeleccionados, setCasosSeleccionados] = useState([]);
  const [overlayOpen, setOverlayOpen] = useState(null);
  // Pila de modales (1.8.1): Editar y Reporte se apilan sobre VerCaso sin desmontarlo.
  const modalStack = useModalStack({ verCaso, modalCaso, modalReporte });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBlocNotas, setShowBlocNotas] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState(null);
  const [pendingEventId, setPendingEventId] = useState(null);
  // X14 (1.10.1): pestaña destino de Útiles para la navegación desde
  // GlobalSearch (se pasa como subvistaInicial a UtilesView).
  const [utilesTab, setUtilesTab] = useState(null);
  // Deshacer: snapshot previo de casos para revertir la última mutación.
  const [undoState, setUndoState] = useState(null);
  // Navegación contextual: pila de contextos para breadcrumb/back.
  const [navigationStack, setNavigationStack] = useState([]);
  const [confirmDeleteCaso, setConfirmDeleteCaso] = useState(false);
  // Lista memoizada de aseguradoras únicas de los casos
  const aseguradorasFromCases = useMemo(
    () => [...new Set(casos.map((c) => c.aseguradora).filter(Boolean))],
    [casos]
  );

  // Callbacks estables para GlobalSearch
  const handleGlobalSearchSelectCase = useCallback((id) => {
    const c = casos.find((c) => String(c.id) === String(id));
    if (c) setVerCaso(c);
  }, [casos]);

  const handleGlobalSearchSelectNote = useCallback((noteId) => {
    setPendingNoteId(noteId);
    setShowBlocNotas(true);
    setVerCaso(null);
  }, []);

  const handleGlobalSearchSelectEvent = useCallback((eventId) => {
    setPendingEventId(eventId);
    setShowCalendar(true);
  }, []);

  const handleGlobalSearchSelectEntity = useCallback(() => {
    setSelectedView('utiles');
  }, []);

  // X14 (1.10.1): navegación real desde GlobalSearch a la pestaña de Útiles
  // correspondiente (antes solo cambiaba de vista sin seleccionar la subvista).
  // setUtilesTab ANTES de setSelectedView: si Útiles ya estaba montada, el
  // effect de UtilesView reacciona al cambio de prop; si no, el valor inicial
  // (subvistaInicial) la abre directa.
  const handleGlobalSearchNavigateUtiles = useCallback((tab) => {
    setUtilesTab(tab);
    setSelectedView('utiles');
  }, [setSelectedView]);

  // X01/N18 (1.10.1): la búsqueda real del header vive acá (estado local);
  // Dashboard la limpia al hacer drill-down y ReportesView la snapshota.
  const limpiarBusquedaHeader = useCallback(() => setQuery(''), []);

  // F01/F17 (1.10.1): pushUndo acepta un payload `cascade` con las filas de
  // historial y las referencias relatedCaseIds que se pierden al borrar; el
  // deshacer las restaura (antes el undo devolvía el caso pero el timeline
  // quedaba vacío y los vínculos de notas/eventos no volvían).
  const pushUndo = useCallback((label, cascade = null) => {
    setUndoState({ prevCasos: casos, label, ts: Date.now(), cascade });
  }, [casos]);

  const showToast = useCallback((message, type = "success") => {
    notificationManager.notify({
      type,
      title: "",
      message,
      source: "app",
    });
  }, []);

  // F17 (1.10.1): restaura historial y vínculos al deshacer un borrado.
  const restaurarBorradoCascade = useCallback(async (cascade) => {
    try {
      const { default: casesDB } = await import("./core/db/casesDB");
      const { default: appDB } = await import("./core/db/appDB");
      const jobs = [];
      if (cascade.historyRows && cascade.historyRows.length > 0) {
        // bulkPut conserva los ids originales de los eventos del historial.
        jobs.push(casesDB.case_history.bulkPut(cascade.historyRows));
      }
      (cascade.notesRefs || []).forEach((n) => {
        jobs.push(appDB.notes.update(n.id, { relatedCaseIds: n.relatedCaseIds }));
      });
      (cascade.eventsRefs || []).forEach((e) => {
        jobs.push(appDB.events.update(e.id, { relatedCaseIds: e.relatedCaseIds }));
      });
      await Promise.all(jobs);
    } catch (e) {
      reportError(e, { context: "deshacer:restaurarBorradoCascade", silent: true });
    }
  }, []);

  const deshacer = useCallback(() => {
    if (!undoState) return;
    setCasos(undoState.prevCasos);
    if (undoState.cascade) restaurarBorradoCascade(undoState.cascade);
    setUndoState(null);
    showToast("Cambio deshecho", "info");
  }, [undoState, setCasos, showToast, restaurarBorradoCascade]);

  // PWA: registrar SW, avisar de nuevas versiones y de offline-ready.
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    initPWA({
      onNeedRefresh: () => setUpdateReady(true),
      onOfflineReady: () =>
        showToast("App lista para usar sin conexión", "success"),
    });
  }, [showToast]);

  // PWA shortcuts (#dashboard, #nuevo-caso, ...): abren vistas/acciones
  // directas cuando la app se lanza desde un shortcut instalado.
  useEffect(() => {
    const applyHashRoute = () => {
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (!hash) return;
      if (hash === "nuevo-caso" || hash === "nuevo") {
        setModalCaso({ ...casoVacio(), estado: config.estadoDefault || 'Cita virtual' });
        window.history.replaceState(null, "", window.location.pathname);
      } else if (
        ["dashboard", "kanban", "tabla", "reportes", "mi-espacio", "utiles"].includes(hash)
      ) {
        setSelectedView(hash);
      }
    };
    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, []);

  // Initialize Zustand store + theme + alerts + notifications
  useEffect(() => {
    initTheme();
    const store = useAppStore.getState();
    store.init().then(() => {
      startAlertSystem();
    });
    try {
      const raw = localStorage.getItem("config-art-tracker");
      const savedConfig = raw ? JSON.parse(raw) : {};
      notificationManager.init(savedConfig);
    } catch {}
    const stopAutoBackup = setupAutoBackupWatcher();
    const stopStatusMonitor = startSystemStatusMonitor();
    // Integridad (1.3.3): verificación ligera al iniciar. Silenciosa salvo
    // problemas CRITICAL; jamás bloquea el arranque.
    runIntegrityCheck({ completo: false })
      .then((informe) => {
        const criticos = (informe.problemas || []).filter((p) => p.nivel === "critical");
        if (criticos.length > 0) {
          showToast(
            `Integridad de datos: ${criticos[0].mensaje}. Revisá Configuración > Sistema > Diagnóstico.`,
            "error",
            8000
          );
        }
      })
      .catch(() => {});
    // Normalización one-time del historial de backups (1.9.5): corre en
    // background, fuera del arranque, para limpiar el anidamiento heredado.
    setTimeout(() => {
      normalizeAutoBackupHistory();
    }, 3000);
    return () => {
      stopAutoBackup();
      stopStatusMonitor();
    };
  }, []);

  // v1.9.7 (fix B7): limpieza ONE-TIME de claves `conversaciones_*` huérfanas
  // (nota conocida de 1.9.6: importar un backup viejo dejaba mensajes de
  // categorías ya borradas, invisibles en la UI). Corre una sola vez por
  // montaje, recién con config ya cargada de storage (configLoaded).
  const conversacionesCleanupRef = useRef(false);
  useEffect(() => {
    if (!configLoaded || conversacionesCleanupRef.current) return;
    conversacionesCleanupRef.current = true;
    limpiarConversacionesHuerfanas(config);
  }, [configLoaded, config]);

  // v1.10.0 (feature D): sincroniza el motor de reglas (memoria del módulo)
  // con la config persistida. Corre al cargar storage y ante cada cambio de
  // config.rulesCustom / config.rulesEnabled:
  //  1) da de baja las reglas custom que ya no están en config;
  //  2) (re)registra las custom (condición declarativa {field, operator,
  //     value} y acción "alert" con mensaje e interpolación {campo});
  //  3) aplica los toggles a TODAS las reglas (default: encendidas).
  useEffect(() => {
    if (!configLoaded) return;
    try {
      const custom = Array.isArray(config?.rulesCustom) ? config.rulesCustom : [];
      const enabled = config?.rulesEnabled || {};

      getRules()
        .filter((r) => r.custom)
        .forEach((r) => {
          // v1.10.0 (auditoría H3): guard ante entries corruptas en
          // rulesCustom; sin él, una entrada null acá abortaba TODO el sync
          // (código dentro de try/catch → se perdía la sincronización entera).
          if (!custom.some((c) => c && c.name === r.name)) unregisterRule(r.name);
        });

      custom.forEach((r) => {
        if (!r || !r.name || !r.field || !r.operator) return;
        unregisterRule(r.name); // re-registro limpio (registerRule rechaza duplicados)
        registerRule({
          name: r.name,
          description: r.description || `${r.field} ${r.operator} ${r.value ?? ""}`.trim(),
          enabled: true,
          custom: true,
          condition: { field: r.field, operator: r.operator, value: r.value },
          action: async (entity) => ({
            action: "alert",
            // Interpolación simple de {campo} del caso en el mensaje.
            message: (r.message || `Regla "${r.name}" detectada`).replace(
              /\{(\w+)\}/g,
              (_, k) => (entity[k] !== undefined && entity[k] !== null ? String(entity[k]) : "")
            ),
            severity: r.severity === "error" ? "error" : r.severity === "warning" ? "warning" : "info",
          }),
        });
      });

      getRules().forEach((rule) => {
        const pref = enabled[rule.name];
        if (pref === false) enableRule(rule.name, false);
        else if (pref === true) enableRule(rule.name, true);
      });
    } catch (err) {
      reportError(err, { context: "rulesSync" });
    }
  }, [configLoaded, config?.rulesCustom, config?.rulesEnabled]);

  // Sync cases changes to Zustand store
  useEffect(() => {
    useAppStore.getState().setCases(casos);
  }, [casos]);

  // Aviso de posibles datos perdidos: hay backups con casos, pero la app está vacía.
  useEffect(() => {
    if (!casosLoaded) return;
    if (casos.length > 0) return;
    let cancelled = false;
    import("./core/db/appDB")
      .then(({ default: appDB }) =>
        appDB.auto_backups.orderBy("timestamp").reverse().limit(1).toArray()
      )
      .then((rows) => {
        if (cancelled) return;
        if (rows.some((b) => (b.counts?.cases || 0) > 0)) {
          import("./core/notifications/notificationStore").then(({ default: store }) => {
            store.getState().addPersistentAlert({
              type: "warning",
              title: "No se encontraron casos cargados",
              message:
                "Si antes tenías datos, podés restaurar un backup desde Configuración > Datos > Historial de backups.",
              id: "lost-data-warning",
            });
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [casosLoaded, casos.length]);

  // Reconfigure notification manager when config changes
  useEffect(() => {
    try {
      notificationManager.configure(config);
    } catch {}
    // C03 (1.10.1): además se espeja la config en la store para que los
    // componentes profundos (Pill) resuelvan catálogos por `getEstados(config)`
    // y los estados creados/renombrados en Configuración se pinten en todas
    // las vistas, no solo en las que reciben config por props.
    try {
      useAppStore.getState().setConfig(config);
    } catch {}
    // C03 (1.10.1): operatorMetrics es un módulo puro (sin React) y usa la
    // categoría success para el fallback de fechaFirmaDe; se le pasa la lista
    // vigente para que renombrar "Firmo" no rompa metas/logros.
    try {
      setEstadosSuccess(config?.metrics?.categorias?.success);
    } catch {}
  }, [config]);

  // Ctrl+K global search
  useEffect(() => {
    if (config.atajosTeclado === false) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().setUIState({ globalSearchOpen: true });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [config.atajosTeclado]);

  const debouncedQuery = useDebounce(query, 300);
  const loaded = casosLoaded && mapeoLoaded;

  // ============ ONBOARDING ============
  // En el primer uso, arranca el tour de bienvenida automáticamente.
  const onboardingRanRef = useRef(false);
  useEffect(() => {
    if (!loaded || onboardingRanRef.current) return;
    onboardingRanRef.current = true;
    try {
      if (localStorage.getItem("app-onboarding-done")) return undefined;
      localStorage.setItem("app-onboarding-done", "true");
      const t = setTimeout(() => startTour("onboarding"), 900);
      return () => clearTimeout(t);
    } catch {
      return undefined;
    }
  }, [loaded, startTour]);

  useEffect(() => {
    const handleStorageUpdate = async () => {
      try {
        await reloadCasos();
        setSelectedMonth(-1);
        setSelectedYear(-1);
        setSelectedDays([]);
      } catch (error) {
        reportError(error, { context: 'App:reloadCasos' });
      }
    };

    window.addEventListener("storage-update", handleStorageUpdate);
    return () =>
      window.removeEventListener("storage-update", handleStorageUpdate);
  }, [reloadCasos, setSelectedMonth, setSelectedYear, setSelectedDays]);

  // ============ FILTRADO GLOBAL ============
  const catsFiltro = useMemo(
    () => ({ ...getDefaultCategories(), ...(config.metrics?.categorias || {}) }),
    [config]
  );

  const casosFiltradosPorMes = useMemo(() => {
    let filtered = casos;
    if (selectedMonth >= 0 && selectedYear >= 0) {
      // Un caso pertenece al mes si se creó en ese mes o si su último reporte
      // fue en ese mes.
      filtered = filtered.filter((c) =>
        casoEnMes(c, selectedMonth, selectedYear)
      );
    }
    if (selectedDays.length > 0) {
      const pads = new Set(selectedDays.map((d) => String(d).padStart(2, '0')));
      // v1.9.6 (fix bug 1): se normaliza la fecha con normalizeDate para que el
      // filtro por día coincida con MonthDayFilterBar/DayFilter (que usan
      // normalizeDate). Antes se partía `c.fecha` a mano y las fechas legado en
      // DD/MM/YYYY no coincidían con el día seleccionado → el día se renderizaba
      // pero la lista quedaba vacía.
      filtered = filtered.filter(c => {
        const iso = normalizeDate(c.fecha);
        return iso ? pads.has(iso.slice(8, 10)) : false;
      });
    }
    // v1.9.7 (fix B1): filtro de búsqueda extraído a aplicarBusquedaFiltro
    // (lógica pura testeable). El branch "hoy" ahora normaliza la fecha con
    // normalizeDate (acepta ISO y legado DD/MM/YYYY) y compara contra hoyISO()
    // (día en hora local); antes usaba slice crudo + fecha en UTC y las fechas
    // legadas nunca coincidían (lista vacía).
    const filtro = config.busquedaFiltro || "todos";
    filtered = aplicarBusquedaFiltro(filtered, filtro, catsFiltro);
    // v1.10.0 (revisión): se quitó la capa "Solo de hoy" del header; el filtro
    // de día (selectedDays) que ahora marca el día de HOY en DayFilter ya
    // cubre ese caso vía el memo de más arriba.

    return filtered;
  }, [casos, selectedMonth, selectedYear, selectedDays, config.busquedaFiltro, catsFiltro]);

  // Casos del alcance actual (mes + día + busquedaFiltro) SIN el quickFilter:
  // base para la Pipeline Bar, que debe conservar todos los estados visibles
  // aunque el listado ya esté filtrado por estados (multi-selección).
  const casosScope = casosFiltradosPorMes;

  const casosQuickFiltrados = useMemo(
    () => aplicarQuickFilter(casosFiltradosPorMes, quickFilter, catsFiltro),
    [casosFiltradosPorMes, quickFilter, catsFiltro]
  );

  const casosFiltrados = useMemo(() => {
    if (!debouncedQuery.trim()) return casosQuickFiltrados;
    return casosQuickFiltrados.filter((c) => casoCoincide(c, debouncedQuery));
  }, [casosQuickFiltrados, debouncedQuery]);

  // 1.8.7 (#3-7): filtro global con modal — capa única aplicada UNA vez sobre
  // casosFiltrados; todas las vistas (Dashboard/Tabla/Reportes/Kanban/MiEspacio)
  // lo heredan por composición sin tocar su pipeline interno.
  const casosGlobales = useMemo(
    () => aplicarFiltroGlobal(casosFiltrados, filtroGlobal),
    [casosFiltrados, filtroGlobal]
  );

  const filtrosDetalle = useMemo(() => {
    if (!filtroGlobal) return [];
    const labels = {
      estado: "Estado",
      aseguradora: "Aseguradora",
      localidad: "Localidad",
      estudio: "Estudio",
      provincia: "Provincia",
      tipo: "Tipo",
      origen: "Origen",
    };
    const activos = Object.entries(labels).flatMap(([k, label]) =>
      normalizarValorFiltro(filtroGlobal[k])
        .filter((v) => String(v).trim())
        .map((v) => ({
          key: `${k}:${v}`,
          label,
          valor: v,
          limpiar: () =>
            setFiltroGlobal({
              ...filtroGlobal,
              [k]: normalizarValorFiltro(filtroGlobal[k]).filter((x) => x !== v),
            }),
        }))
    );
    const tel = (filtroGlobal.telefono || "").trim();
    if (tel) {
      activos.push({
        key: "telefono",
        label: "Teléfono",
        valor: tel,
        limpiar: () => setFiltroGlobal({ ...filtroGlobal, telefono: "" }),
      });
    }
    return activos;
  }, [filtroGlobal, setFiltroGlobal]);

  // Filtro rápido (drill del dashboard / Pipeline Bar): se muestra con el
  // mismo formato que los chips de filtroGlobal para que sea visible en
  // todas las vistas y se pueda limpiar desde el header.
  const chipRapido = useMemo(() => quickFilterChip(quickFilter), [quickFilter]);

  const filtrosActivos = filtrosDetalle.length > 0 || !!chipRapido;

  // Casos del mes seleccionado SIN el filtro de día: sirve para que el selector
  // de día siga mostrando todos los días con casos aunque ya se haya elegido uno.
  const casosDelMes = useMemo(() => {
    if (selectedMonth >= 0 && selectedYear >= 0) {
      return casos.filter((c) => casoEnMes(c, selectedMonth, selectedYear));
    }
    return casos;
  }, [casos, selectedMonth, selectedYear]);

  // Easter eggs: registra cambios de filtro reales (sin contar la carga inicial)
  // y evalúa periódicamente reglas de inactividad/duración de sesión.
  const filtroArmado = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      filtroArmado.current = true;
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!filtroArmado.current) return;
    trackEvent("FILTER_CHANGE", { selectedDays: selectedDays.length });
  }, [selectedMonth, selectedYear, selectedDays]);

  useEffect(() => {
    if (!filtroArmado.current) return;
    trackEvent("VIEW_CHANGE", { view: selectedView });
  }, [selectedView]);

  useEffect(() => {
    const id = setInterval(() => evaluate(), 60000);
    return () => clearInterval(id);
  }, []);

  const mesesDisponibles = useMemo(() => {
    return getAvailableMonthsConReportes(casos);
  }, [casos]);

  // ============ AUTO-SAVE ============
  useEffect(() => {
    if (!loaded) return;
    const keys = [
      "mapeo-art-tracker",
      "config-art-tracker",
    ];
    const data = { mapeo, config };
    const interval = setupAutoSave(data, keys);
    return () => clearInterval(interval);
  }, [mapeo, config, loaded]);

  // ============ BEFORE UNLOAD ============
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem("app-data-cleared")) return;
      if (sessionStorage.getItem("import-complete")) {
        sessionStorage.removeItem("import-complete");
        return;
      }
      saveKey("mapeo-art-tracker", mapeo);
      saveKey("config-art-tracker", config);
      saveKey("pasos-art-tracker", pasos);
      saveKey("tips-art-tracker", tips);
      saveKey("links-art-tracker", links);
      saveKey("speechs-art-tracker", speechs);
      saveKey("speechs-interactivos-art-tracker", speechsInteractivos);
      saveKey("objeciones-art-tracker", objeciones);
      saveKey("art-art-tracker", art);
      saveKey("transito-art-tracker", transito);
      saveKey("lesiones-art-tracker", lesiones);
      saveKey("observaciones-transito-art-tracker", observacionesTransito);
      saveKey("condicionales-art-tracker", condicionales);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [
    mapeo,
    config,
    pasos,
    tips,
    links,
    speechs,
    speechsInteractivos,
    objeciones,
    art,
    transito,
    lesiones,
    observacionesTransito,
    condicionales,
  ]);

  // ============ CRUD ============
  const guardarCaso = useCallback(
    async (caso) => {
      const validation = validateCaso(caso);
      if (!validation.valid) {
        showToast(`Errores: ${validation.errors.join(", ")}`, "error");
        return;
      }
      const prev = casos.find((c) => c.id === caso.id);
      const isNew = !caso.id || !prev;
      // Historial (1.3.1): solo actividad real genera eventos y actualiza
      // la última actividad; guardar sin cambios no registra nada.
      const cambios = isNew ? [] : computeCaseChanges(prev, caso);
      const huboActividad = isNew || cambios.length > 0;
      const casoFinal = huboActividad
        ? { ...caso, lastActivityAt: new Date().toISOString() }
        : caso;
      pushUndo(isNew ? "Caso creado" : "Caso actualizado");
      setCasos((list) => {
        const updated = list.some((c) => c.id === casoFinal.id)
          ? list.map((c) => (c.id === casoFinal.id ? casoFinal : c))
          : [...list, casoFinal];
        if (isNew) {
          trackEvent("CASE_CREATED");
          eventBus.emit(AppEvents.CASE_CREATED, { type: "success", title: "Caso creado", message: `${casoFinal.nombre} fue agregado`, source: "cases" });
        } else if (huboActividad) {
          // 1.10.1-fix: antes se emitía CASE_UPDATED sin importar si hubo
          // cambios reales; guardar sin editar generaba toast "Caso
          // actualizado" + entrada en el Centro + sonido. Ahora solo se emite
          // si computeCaseChanges detectó actividad (coherente con
          // recordCaseChanges que ya estaba condicionado).
          trackEvent("CASE_EDITED");
          eventBus.emit(AppEvents.CASE_UPDATED, { type: "info", title: "Caso actualizado", message: `${casoFinal.nombre} fue modificado`, source: "cases" });
        }
        return updated;
      });
      if (huboActividad) {
        recordCaseChanges(casoFinal.id, isNew ? null : prev, casoFinal);
      }
      // Citas (1.5.0): sincronizar el evento de calendario con el campo CITA,
      // solo en guardados intencionales desde el modal (no en init/restore).
      try {
        await syncCitaEvent(casoFinal, { config });
      } catch (err) {
        reportError(err, { context: 'guardarCaso:syncCitaEvent', silent: true });
      }
      setModalCaso(null);
      soundSystem.playAction(isNew ? "create" : "save");
      if (!isNew && prev && prev.estado !== caso.estado) {
        if (esFirmaEstado(catsFiltro, caso.estado) || caso.estado === "Pendiente") {
          celebrarEstado(caso, caso.estado);
        }
        if (esFirmaEstado(catsFiltro, caso.estado)) {
          const updatedForGoal = casos.map((c) =>
            c.id === caso.id ? caso : c
          );
          celebrarLogroSiCorresponde(updatedForGoal, caso);
        }
      }
      // v1.10.0 (feature D): motor de reglas en altas (el estado inicial
      // cuenta como transición) y en ediciones con cambio de estado.
      if (isNew || (prev && prev.estado !== casoFinal.estado)) {
        runCaseRules(casoFinal, isNew ? null : prev);
      }
      // 1.10.1: si el guardado agregó un reporte a un caso existente, el
      // evento automático de cita (tag 'regla-cita') se marca completado —
      // la cita ya tuvo su contacto. Fire-and-forget, igual que syncCitaEvent.
      // Solo casos existentes: en un alta con reporte inicial el evento recién
      // creado queda pendiente hasta el próximo reporte.
      if (cambios.some((c) => c.type === HISTORY_TYPES.REPORT_ADDED)) {
        completarCitasDeCaso(casoFinal.id);
      }
    },
    // catsFiltro (C03): las celebraciones/metas resuelven la categoría success.
    [setCasos, showToast, casos, pushUndo, catsFiltro]
  );

  // F01/F19 (1.10.1): borrado con cascade compartido por el borrado simple
  // (eliminarCaso) y el masivo por mes (Configuración). Limpia case_history y
  // las referencias relatedCaseIds de notas/eventos (antes quedaban huérfanos;
  // el cascade de useAppStore.deleteCase la UI nunca lo invocaba) y devuelve el
  // payload para que el deshacer pueda restaurarlo (F17).
  const borrarCasosConCascade = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return null;
    const { default: casesDB } = await import("./core/db/casesDB");
    const { default: appDB } = await import("./core/db/appDB");
    const idSet = new Set(ids.map(String));
    const tieneRef = (refs) =>
      Array.isArray(refs) && refs.some((r) => idSet.has(String(r)));
    const [historyRows, notesConRef, eventsConRef] = await Promise.all([
      casesDB.case_history.where("caseId").anyOf(ids.map(String)).toArray(),
      appDB.notes.filter((n) => tieneRef(n.relatedCaseIds)).toArray(),
      appDB.events.filter((e) => tieneRef(e.relatedCaseIds)).toArray(),
    ]);
    const quitarRef = (refs) =>
      Array.isArray(refs) ? refs.filter((r) => !idSet.has(String(r))) : refs;
    await Promise.all([
      casesDB.case_history.where("caseId").anyOf(ids.map(String)).delete(),
      appDB.notes
        .filter((n) => tieneRef(n.relatedCaseIds))
        .modify((n) => { n.relatedCaseIds = quitarRef(n.relatedCaseIds); }),
      appDB.events
        .filter((e) => tieneRef(e.relatedCaseIds))
        .modify((e) => { e.relatedCaseIds = quitarRef(e.relatedCaseIds); }),
    ]);
    return {
      historyRows,
      notesRefs: notesConRef.map((n) => ({ id: n.id, relatedCaseIds: n.relatedCaseIds })),
      eventsRefs: eventsConRef.map((e) => ({ id: e.id, relatedCaseIds: e.relatedCaseIds })),
    };
  }, []);

  const eliminarCaso = useCallback(
    async (id) => {
      const deleted = casos.find((c) => c.id === id);
      // F01/F17 (1.10.1): cascade + payload de undo (antes solo borraba
      // case_history sin posibilidad de restauración y dejaba notas/eventos
      // apuntando al caso).
      const cascade = await borrarCasosConCascade([id]);
      pushUndo("Caso eliminado", cascade);
      setCasos((list) => list.filter((c) => c.id !== id));
      setModalCaso(null);
      soundSystem.playAction("delete");
      if (deleted) {
        eventBus.emit(AppEvents.CASE_DELETED, { type: "info", title: "Caso eliminado", message: `${deleted.nombre} fue eliminado`, source: "cases" });
      }
    },
    [setCasos, casos, pushUndo, borrarCasosConCascade]
  );

  // F19 (1.10.1): borrado masivo por mes desde Configuración, con el mismo
  // cascade (historial + referencias) y undo que el borrado simple. Antes
  // ConfiguracionView hacía casesDB.cases.bulkDelete directo: huérfanos en
  // lote, sin historial ni deshacer.
  const handleEliminarCasosBatch = useCallback(
    async (ids) => {
      if (!ids || ids.length === 0) return 0;
      const cascade = await borrarCasosConCascade(ids);
      pushUndo("Casos eliminados", cascade);
      const idSet = new Set(ids.map(String));
      setCasos((list) => list.filter((c) => !idSet.has(String(c.id))));
      return ids.length;
    },
    [borrarCasosConCascade, pushUndo, setCasos]
  );

  const cambiarEstado = useCallback(
    (id, estado) => {
      const prev = casos.find((c) => c.id === id);
      const oldState = prev?.estado;
      if (oldState && oldState !== estado) {
        pushUndo(`Estado: ${oldState} → ${estado}`);
      }
      const updated = casos.map((c) => {
        if (c.id !== id) return c;
        const base = { ...c, estado };
        if (esFirmaEstado(catsFiltro, estado) && !c.fechaFirma) {
          // R03/D07 (1.10.1): fechaFirma en hora LOCAL (hoyISO) — antes usaba
          // toISOString().slice(0,10) (UTC): entre 21:00 y 24:00 (UTC-3) la
          // firma se fechaba al día siguiente (rompía metas/logro por fecha).
          base.fechaFirma = hoyISO();
          base.alertaFirmaEnviada = false;
        }
        return base;
      });
      if (oldState && oldState !== estado) {
        const cambio = updated.find((c) => c.id === id);
        cambio.lastActivityAt = new Date().toISOString();
        recordCaseChanges(id, prev, cambio);
        recordGoalAction('CASE_MOVED');
        eventBus.emit(AppEvents.CASE_STATUS_CHANGED, { type: "info", title: "Estado actualizado", message: `${prev?.nombre || "Caso"}: ${oldState} → ${estado}`, source: "cases", priority: "medium" });
        if (esFirmaEstado(catsFiltro, estado) || estado === "Pendiente") {
          celebrarEstado(cambio, estado);
        }
        if (esFirmaEstado(catsFiltro, estado)) {
          celebrarLogroSiCorresponde(updated, cambio);
        }
        // v1.10.0 (feature D): reglas al cambiar estado desde la vista
        // (tabla/kanban/dropdown).
        runCaseRules(cambio, prev);
      }
      setCasos(updated);
    },
    // catsFiltro (C03): fechaFirma/celebraciones resuelven la categoría success.
    [setCasos, casos, pushUndo, catsFiltro]
  );

  const guardarReporteRapido = useCallback(
    async (casoEntrante) => {
      const repro = casoEntrante.reprogramacion || null;
      // Preparar el caso final (sin el campo transitorio de reprogramación).
      const base = { ...casoEntrante };
      delete base.reprogramacion;
      if (repro) {
        base.cita = citaDesdeReprogramacion(repro);
      }
      const caso = base;
      const prev = casos.find((c) => c.id === caso.id) || null;
      let casoFinal = caso;
      let reportAdded = false;
      if (prev) {
        const cambios = computeCaseChanges(prev, caso);
        // 1.10.1: ¿este reporte creció el reporteHistory del caso?
        reportAdded = cambios.some((c) => c.type === HISTORY_TYPES.REPORT_ADDED);
        if (cambios.length > 0) {
          casoFinal = { ...caso, lastActivityAt: new Date().toISOString() };
          recordCaseChanges(casoFinal.id, prev, casoFinal);
        }
      } else {
        casoFinal = { ...caso, lastActivityAt: new Date().toISOString() };
      }
      pushUndo("Reporte cargado");
      setCasos((list) => list.map((c) => (c.id === casoFinal.id ? casoFinal : c)));
      setModalReporte(false);
      soundSystem.playAction("save");

      // Reprogramación (1.5.0): crear evento de reprogramación vinculado.
      if (repro && casoFinal.id) {
        try {
          const evento = await createRescheduleEvent(casoFinal, {
            date: repro.fecha,
            startTime: repro.horaIni,
            endTime: repro.horaFin,
          }, { config });
          showToast("Nueva cita de reprogramación creada", "success");
        } catch (reproErr) {
          reportError(reproErr, { context: 'ReporteRapido:reprogramacion', silent: true });
          showToast("El caso se guardó pero no se pudo crear la reprogramación", "warning");
        }
      }

      if (prev && prev.estado !== casoFinal.estado) {
        if (esFirmaEstado(catsFiltro, casoFinal.estado) || casoFinal.estado === "Pendiente") {
          celebrarEstado(casoFinal, casoFinal.estado);
        }
        if (esFirmaEstado(catsFiltro, casoFinal.estado)) {
          const updatedForGoal = casos.map((c) =>
            c.id === casoFinal.id ? casoFinal : c
          );
          celebrarLogroSiCorresponde(updatedForGoal, casoFinal);
        }
        // v1.10.0 (feature D): reglas al cargar un reporte que cambia el estado.
        runCaseRules(casoFinal, prev);
      }
      // 1.10.1: reporte agregado a un caso existente → el evento automático
      // de cita (tag 'regla-cita') queda completado. Fire-and-forget.
      if (reportAdded) {
        completarCitasDeCaso(casoFinal.id);
      }
    },
    // catsFiltro (C03): celebraciones/metas resuelven la categoría success.
    [setCasos, casos, pushUndo, catsFiltro]
  );

  const actualizarCaso = useCallback(
    (caso) => {
      const prev = casos.find((c) => c.id === caso.id);
      let casoFinal = caso;
      let reportAdded = false;
      if (prev) {
        const cambios = computeCaseChanges(prev, caso);
        // 1.10.1: ¿este guardado (VerCasoModal/comentarios) agregó un reporte?
        reportAdded = cambios.some((c) => c.type === HISTORY_TYPES.REPORT_ADDED);
        if (cambios.length > 0) {
          casoFinal = { ...caso, lastActivityAt: new Date().toISOString() };
          recordCaseChanges(casoFinal.id, prev, casoFinal);
        }
      } else {
        casoFinal = { ...caso, lastActivityAt: new Date().toISOString() };
      }
      pushUndo("Caso actualizado");
      trackEvent("CASE_EDITED");
      setCasos((list) => list.map((c) => (c.id === casoFinal.id ? casoFinal : c)));
      // v1.10.0 (feature D): reglas si la edición cambió el estado
      // (esta ruta no tenía detección de transición).
      if (prev && prev.estado !== casoFinal.estado) {
        runCaseRules(casoFinal, prev);
      }
      // 1.10.1: reporte agregado a un caso existente → el evento automático
      // de cita (tag 'regla-cita') queda completado. Fire-and-forget.
      if (reportAdded) {
        completarCitasDeCaso(casoFinal.id);
      }
    },
    [setCasos, casos, pushUndo]
  );

  // F20 (1.10.1): el drop de un evento CITA en el calendario ahora pasa por la
  // orquestación de App (actualizarCaso → persistencia + historial + undo +
  // lastActivityAt) y luego sincroniza el evento automático con syncCitaEvent.
  // Antes CalendarView hacía un casesDB.update directo sin historial/undo.
  const handleCitaDrop = useCallback(
    async (casoActualizado) => {
      actualizarCaso(casoActualizado);
      try {
        await syncCitaEvent(casoActualizado, { config });
      } catch (err) {
        reportError(err, { context: "handleCitaDrop:syncCitaEvent", silent: true });
      }
    },
    [actualizarCaso, config]
  );

  const handleNavigateToNote = useCallback((noteId) => {
    setPendingNoteId(noteId);
    setShowBlocNotas(true);
    setVerCaso(null);
  }, []);

  const handleNuevaNota = useCallback(async (caso) => {
    setShowBlocNotas(true);
    // If case provided, store it so NotesView can auto-link
    if (caso) {
      sessionStorage.setItem('nota-caso-vincular', caso.id);
    }
  }, []);

  const handleNuevoEvento = useCallback(async (caso) => {
    setShowCalendar(true);
    if (caso) {
      sessionStorage.setItem('evento-caso-vincular', caso.id);
    }
  }, []);

  // ============ NAVEGACIÓN CONTEXTUAL ============
  const navigateContextual = useCallback((type, label, data) => {
    if (type === 'insurer' || type === 'lawFirm') {
      // Entidades conectadas eliminadas (1.5.1)
      return;
    }
    setNavigationStack((prev) => [...prev, { type, label, data, ts: Date.now() }]);
  }, []);

  const goBackNavigation = useCallback(() => {
    setNavigationStack((prev) => prev.slice(0, -1));
  }, []);

  const clearNavigation = useCallback(() => {
    setNavigationStack([]);
  }, []);

  // onVerCaso estable para no forzar re-renders del Dashboard memoizado.
  const handleVerCaso = useCallback((id) => {
    const c = casos.find((c) => c.id === id);
    if (c) {
      pushLastCase(c);
      setVerCaso(c);
    }
  }, [casos]);

  const handleReporteRapido = useCallback((caso) => {
    setCasoReporteRapido(caso);
    setEstadoReporteRapido(null);
    setModalReporte(true);
  }, []);

  const handleNuevoCaso = useCallback(() => {
    setModalCaso({ ...casoVacio(), estado: config.estadoDefault || "Cita virtual" });
  }, [config]);

  const handleImportarCSV = useCallback(() => setOverlayOpen("csv-import"), []);

  const handleTour = useCallback(() => startTour("onboarding"), [startTour]);

  const closeFilterModal = useCallback(() => setShowFilterModal(false), []);

  const eliminarTodosLosDatos = useCallback(async () => {
    sessionStorage.setItem("app-data-cleared", "true");

    const clearAllState = () => {
      setCasos([]);
      setMapeo([]);
      setConfig(CONFIG_DEFAULT);
      setPasos([]);
      setTips([]);
      setLinks([]);
      setSpeechs([]);
      setObjeciones([]);
      setArt([]);
      setTransito([]);
      setLesiones({
        "Accidente Laboral": [],
        "Enfermedad Profesional": [],
        "No Viable": [],
      });
      setObservacionesTransito([]);
      setCondicionales([]);
    };

    clearAllState();

    try {
      const { default: casesDB } = await import("./core/db/casesDB");
      const { default: appDB } = await import("./core/db/appDB");
      await casesDB.cases.clear();
      await casesDB.case_history.clear();
      await Promise.all([
        appDB.notes.clear(),
        appDB.events.clear(),
        appDB.note_versions.clear(),
        appDB.auto_backups.clear(),
        // P01 (1.10.1): survivors del "borrar todos los datos" — el usuario
        // creía que limpiaba todo pero plantillas, reportes guardados y los
        // snapshots de migración (que contienen copias de notes/events/
        // auto_backups) sobrevivían en AppData.
        appDB.templates.clear(),
        appDB.saved_reports.clear(),
        appDB.migration_snapshots.clear(),
      ]);
      // P01 (1.10.1): log de errores de diagnóstico (DB AppDiagnostics).
      await clearErrors();
    } catch (e) {
      reportError(e, { context: 'App:clearDatabases' });
    }

    notifyChange(SYNC_EVENTS.DATA_CLEARED, { source: "app" });

    // 1) Limpiar todas las claves con prefijo app_ (underscore)
    localStorageAdapter.clear();

    // 2) Limpiar claves con prefijo app- (guión) — no cubiertas por el adapter
    //    P01 (1.10.1): se agregó app-typography-preset, que quedaba fuera.
    const hyphenKeys = [
      "app-view-orders", "app-theme", "app-palette", "app-estado-colors",
      "app-onboarding-done", "app-font-size", "app-filters",
      "app-typography-preset",
    ];
    hyphenKeys.forEach((key) => localStorage.removeItem(key));

    // 3) Limpiar claves sin prefijo: Mi Espacio, productividad, backups, etc.
    const unprefixedKeys = [
      "userOperatorProfile",
      "userOperatorAvailability",
      "userOperatorGoals",
      "userOperatorSettings",
      "userOperatorCredentials",
      "userProductivitySettings",
      "userGoals",
      "userContextMemory",
      "backup-frecuencia",
      "backup-last-run",
      "backup-last-jornada-run",
      "backup-list",
      "calendario-eventos",
      "calendar-events",
      "global-search-history",
      "recent-entities-art-tracker",
      "help_dismissed_hints",
      "help_user_level",
      "utiles-tab-activa",
      "config-tab-activa",
      "tabla-sort-key",
      "tabla-sort-dir",
      "kanban-ordenes",
      "speech-font-size",
      "objeciones-font-size",
      "notas-sort-order",
      "csv-mapping-template",
    ];
    unprefixedKeys.forEach((key) => localStorage.removeItem(key));

    // 4) Limpiar claves con prefijo conversaciones_*, tour_*, app_* y,
    //    P01 (1.10.1), los prefijos que faltaban: app.* (estado colapsado de
    //    secciones app.sh.* y el flag app.auto-backups-normalized) y
    //    seg-art:* (banners de estado de almacenamiento).
    Object.keys(localStorage)
      .filter((key) =>
        key.startsWith("conversaciones_") ||
        key.startsWith("tour_") ||
        key.startsWith("app_") ||
        key.startsWith("app.") ||
        key.startsWith("seg-art:")
      )
      .forEach((key) => localStorage.removeItem(key));

    // 5) Limpiar claves de útiles (sufijo -art-tracker): pasos, tips, links,
    //    speechs, objeciones, art, transito, lesiones, mapeo, condicionales, etc.
    Object.keys(localStorage)
      .filter((key) => key.endsWith("-art-tracker"))
      .forEach((key) => localStorage.removeItem(key));

    showToast("Todos los datos eliminados. Recargando...", "warning");
    setTimeout(() => window.location.reload(), 1500);
  }, [
    showToast, setCasos, setMapeo, setConfig, setPasos, setTips, setLinks,
    setSpeechs, setObjeciones, setArt, setTransito, setLesiones, setObservacionesTransito,
    setCondicionales,
  ]);

  const exportarSeleccionados = useCallback(() => {
    if (casosSeleccionados.length === 0) {
      showToast("Selecciona al menos un caso para exportar", "warning");
      return;
    }
    const casosExport = casos.filter((c) => casosSeleccionados.includes(c.id));
    exportarPDF(casosExport, "Casos seleccionados", { categorias: catsFiltro });
    setCasosSeleccionados([]);
  }, [casos, casosSeleccionados, showToast]);

  // ============ KEYBOARD SHORTCUTS ============
  useKeyboardShortcuts({
    onNuevo: () => setModalCaso({ ...casoVacio(), estado: config.estadoDefault || 'Cita virtual' }),
    onReporte: () => setModalReporte(true),
    onBuscar: () =>
      document.querySelector('input[placeholder*="Buscar"]')?.focus(),
    // N17 (1.10.1): Escape ya NO cierra todas las capas a la vez. Los diálogos
    // y Overlays (VerCaso, Editar, Reporte, ConfirmDialog, GlobalSearch,
    // Calendar/Notas/Config…) se cierran solos desde la pila global de
    // useDialogA11y (capture + tope LIFO), que además cancela el evento para
    // este listener. Acá solo quedan las capas SIN diálogo propio
    // (CsvExportModal y FilterModal), y solo si no hay ninguna capa con
    // Escape propio abierta (si la hay, esa se cierra sola).
    onCerrarModal: () => {
      if (verCaso || modalCaso || modalReporte || confirmDeleteCaso) return;
      if (showCalendar || showBlocNotas || overlayOpen) return;
      if (useAppStore.getState().ui.globalSearchOpen) return;
      if (showCsvModal) {
        setShowCsvModal(false);
        return;
      }
      if (showFilterModal) setShowFilterModal(false);
    },
    onExportar: exportarSeleccionados,
    onCambiarVista: setSelectedView,
    onAyuda: () => setOverlayOpen("help"),
    onEliminar: () => {
      if (!verCaso) return;
      if (config.confirmaciones) {
        setConfirmDeleteCaso(true);
      } else {
        eliminarCaso(verCaso.id);
        setVerCaso(null);
      }
    },
    enabled: config.atajosTeclado !== false,
  });

  useEffect(() => {
    const preload = () => {
      Promise.all([
        ...Object.values(VIEW_IMPORTS).map((load) => load()),
        import("./features/notes"),
        import("./features/calendar"),
        import("./components/configuracion/ConfiguracionView"),
      ]).catch(() => {});
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(preload, 2500);
    return () => clearTimeout(t);
  }, []);

  // ============ TABS ============
  const tabs = [
    ["mi-espacio", "Mi Espacio", UserCircle2],
    ["dashboard", "Dashboard", Activity],
    ["kanban", "Tablero", LayoutGrid],
    ["tabla", "Tabla", Table2],
    ["reportes", "Reportes", ClipboardList],
    ["utiles", "Utiles", Settings],
  ];

  if (casosError) {
    return (
      <div
        className="w-full h-96 flex flex-col items-center justify-center gap-3"
        style={{ color: "var(--color-text-muted)" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
            borderColor: "var(--color-danger)",
          }}
          role="alert"
        >
          <AlertCircle size={18} color="var(--color-danger)" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            No se pudo acceder al almacenamiento local
          </span>
        </div>
        <p className="text-xs max-w-md text-center">
          El navegador impide guardar datos (modo privado o permisos bloqueados).
          Probá en una ventana normal de Chrome, Edge o Firefox.
        </p>
        <BtnOutline size="sm" onClick={() => window.location.reload()}>
          Reintentar
        </BtnOutline>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div
        className="w-full h-96 flex items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Spinner size={40} />
        <span className="ml-3">Cargando...</span>
      </div>
    );
  }

  return (
    <I18nProvider config={config}>
    <UXProvider config={config}>
    <div
      className={`w-full min-h-screen ${config.animaciones === false || config.bajoConsumo === true ? 'no-animations' : ''} ${config.microinteracciones === false || config.bajoConsumo === true ? 'no-micro' : ''}`}
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .xs\\:inline { display: none; }
        @media (min-width: 480px) { .xs\\:inline { display: inline; } }
      `}</style>

      <PwaUpdateBanner
        ready={updateReady}
        onUpdate={() => {
          setUpdateReady(false);
          applyPWAUpdate();
        }}
        onDismiss={() => setUpdateReady(false)}
      />

      {/* X13 (1.10.1): skip-link de accesibilidad — primer foco al cargar,
          visible solo al recibir foco (estilo inline para no depender de CSS). */}
      <a
        href="#contenido-principal"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          zIndex: 9999,
          padding: "8px 16px",
          backgroundColor: "var(--color-accent)",
          color: "var(--color-text-on-accent)",
          borderRadius: "0 0 8px 0",
          fontWeight: 600,
          textDecoration: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = "0";
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = "-9999px";
        }}
      >
        Saltar al contenido principal
      </a>

      {/* HEADER */}
      <header className="app-header sticky top-0 z-sticky">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 w-full">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--color-text)" }}
              >
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    width: "38px",
                    height: "38px",
                    color: "var(--color-text-on-accent)",
                  }}
                >
                  <Briefcase size={20} strokeWidth={2.5} />
                </div>
                <AppTitle />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <InstallButton />
              <NotificationBell />
              <button
                onClick={() => setShowFilterModal(true)}
                className="relative p-2.5 rounded-md transition-colors hover:bg-white/5"
                style={{
                  color:
                    showFilterModal || filtrosActivos
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                }}
                aria-label="Filtros globales"
                title={filtrosActivos ? "Filtros globales (filtro activo)" : "Filtros globales"}
                data-tour="filtros-globales"
              >
                <Filter size={20} />
                {filtrosActivos && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: "var(--color-danger)",
                      border: "1px solid var(--color-bg)",
                    }}
                  />
                )}
              </button>
              <button
                onClick={() => setShowCsvModal(true)}
                className="p-2.5 rounded-md transition-colors hover:bg-white/5"
                style={{
                  color: showCsvModal
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                }}
                aria-label="Exportar CSV"
                title="Exportar casos a CSV"
                data-tour="exportar-csv"
              >
                <FileSpreadsheet size={20} />
              </button>
              <button
                onClick={() => setShowCalendar(true)}
                className="p-2.5 rounded-md transition-colors hover:bg-white/5"
                style={{
                  color: showCalendar
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                }}
                aria-label="Calendario"
                title="Calendario de citas"
                data-tour="calendario"
              >
                <CalendarIcon size={20} />
              </button>
              <button
                onClick={() => setShowBlocNotas(true)}
                className="p-2.5 rounded-md transition-colors hover:bg-white/5"
                style={{
                  color: showBlocNotas
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                }}
                aria-label="Bloc de Notas"
                title="Bloc de Notas"
                data-tour="notas"
              >
                <FileText size={20} />
              </button>
              <button
                onClick={() => setOverlayOpen("config")}
                data-tour="configuracion"
                className="p-2.5 rounded-md transition-colors hover:bg-white/5"
                style={{
                  color:
                    overlayOpen === "config"
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                }}
                aria-label="Configuración"
                title="Configuración"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => setOverlayOpen("help")}
                className="p-2.5 rounded-md transition-colors hover:bg-white/5"
                style={{
                  color:
                    overlayOpen === "help"
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                }}
                aria-label="Ayuda"
                title="Ayuda"
                data-tour="ayuda"
              >
                <HelpCircle size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-2.5 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <SearchInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, teléfono, #etiqueta o @comentario..."
                style={{ width: "100%" }}
                data-tour="buscar"
              />
            </div>
            {/* v1.10.0 (revisión): se quitó el chip "Solo de hoy" de acá
                (demasiado llamatorio); el atajo ahora es el día de HOY
                destacado en DayFilter (filtro de Día, arriba de la Pipeline
                Bar), que sí se persiste con selectedDays. */}
            {filtrosActivos && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {filtrosDetalle.map((f) => (
                  <FilterChip
                    key={f.key}
                    active
                    onClick={f.limpiar}
                    title={`Quitar filtro: ${f.label} = ${f.valor}`}
                  >
                    {f.label}: {f.valor}
                    <X size={10} />
                  </FilterChip>
                ))}
                {chipRapido && (
                  <FilterChip
                    active
                    onClick={() => setQuickFilter(null)}
                    title={`Quitar filtro rápido: ${chipRapido.label}${
                      chipRapido.valor ? ` = ${chipRapido.valor}` : ""
                    }`}
                  >
                    {chipRapido.label}
                    {chipRapido.valor ? `: ${chipRapido.valor}` : ""}
                    <X size={10} />
                  </FilterChip>
                )}
                <FilterChip
                  onClick={() => {
                    resetFiltroGlobal();
                    setQuickFilter(null);
                    // v1.10.0 (revisión): "Limpiar todo" ya no apaga el chip
                    // del header (se quitó); el filtro de día se limpia desde
                    // el propio filtro de Día (botón "Todos").
                  }}
                  title="Limpiar todos los filtros"
                  style={{
                    color: "var(--color-danger)",
                    border: "1px solid var(--color-danger)",
                  }}
                >
                  <RotateCcw size={10} />
                  Limpiar todo
                </FilterChip>
              </div>
            )}
            <div className="flex items-center gap-0.5 bg-[var(--color-surface)] rounded-md px-1 py-0.5">
              <Btn
                onClick={() => setModalCaso({ ...casoVacio(), estado: config.estadoDefault || 'Cita virtual' })}
                icon={FilePlus}
                size="sm"
                data-tour="nuevo-caso"
              >
                Caso
              </Btn>
              <Btn
                onClick={() => setModalReporte(true)}
                onMouseDown={(e) => e.preventDefault()}
                variant="outline"
                icon={ClipboardList}
                size="sm"
                data-tour="cargar-reporte"
              >
                Reporte
              </Btn>
            </div>
          </div>

          <ViewTabs tabs={tabs} selectedView={selectedView} onSelect={setSelectedView} />
        </div>
      </header>

      {/* CONTENIDO — X13 (1.10.1): se marca como landmark main (role="main")
          y recibe id para el skip-link. */}
      <div id="contenido-principal" role="main" tabIndex={-1} className="p-4 sm:p-6 max-w-[1400px] mx-auto relative overflow-x-clip outline-none">
        <SystemStatusBanner />
        <Suspense
          fallback={
            <div className="space-y-4" aria-busy="true">
              <div className="h-9 w-72 rounded-lg animate-pulse" style={{ backgroundColor: "var(--color-surface2)" }} />
              <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface2)" }} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface2)" }} />
                <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface2)" }} />
              </div>
              <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface2)" }} />
            </div>
          }
        >
        <div className="relative">
        {showView("dashboard") && (
          <div key="view-dashboard" className={classNameFor("dashboard")}>
            <Dashboard
              config={config}
              casos={casosGlobales}
              casosMes={casosDelMes}
              mesesDisponibles={mesesDisponibles}
              onVerCaso={handleVerCaso}
              onNuevoCaso={handleNuevoCaso}
              onImportarCSV={handleImportarCSV}
              onTour={handleTour}
              onClearSearch={limpiarBusquedaHeader}
            />
          </div>
        )}
        {showView("kanban") && (
          <div key="view-kanban" className={classNameFor("kanban")}>
            <KanbanView
              casos={casosGlobales}
              casosBase={casosScope}
              casosMes={casosDelMes}
              config={config}
              onOpen={setVerCaso}
              onEstadoChange={cambiarEstado}
              showToast={showToast}
              mesesDisponibles={mesesDisponibles}
            />
          </div>
        )}
        {showView("tabla") && (
          <div key="view-tabla" className={classNameFor("tabla")}>
            <TablaView
              casos={casosGlobales}
              casosBase={casosScope}
              casosMes={casosDelMes}
              config={config}
              onOpen={setVerCaso}
              onSeleccionar={setCasosSeleccionados}
              seleccionados={casosSeleccionados}
              mesesDisponibles={mesesDisponibles}
            />
          </div>
        )}
        {showView("reportes") && (
          <div key="view-reportes" className={classNameFor("reportes")}>
            <ReportesView
              casos={casosGlobales}
              casosBase={casosScope}
              casosMes={casosDelMes}
              onVerCaso={setVerCaso}
              mesesDisponibles={mesesDisponibles}
              setConfig={setConfig}
              showToast={showToast}
              busqueda={debouncedQuery}
              onBusquedaChange={setQuery}
            />
          </div>
        )}
        {showView("mi-espacio") && (
          <div key="view-mi-espacio" className={classNameFor("mi-espacio")}>
            <OperatorView
              config={config}
              casos={casosGlobales}
              showToast={showToast}
              onChangeView={setSelectedView}
              onVerCaso={(c) => setVerCaso(c)}
              onNavigateToEvent={(e) => setShowCalendar(true)}
              onNuevoCaso={handleNuevoCaso}
              onNuevoReporte={() => { setCasoReporteRapido(null); setEstadoReporteRapido(null); setModalReporte(true); }}
              onNuevaNota={() => setShowBlocNotas(true)}
              onNuevoEvento={() => setShowCalendar(true)}
              onBuscar={() => useAppStore.getState().setUIState({ globalSearchOpen: true })}
              onExportar={() => setShowCsvModal(true)}
            />
          </div>
        )}
        {showView("utiles") && (
          <div key="view-utiles" className={classNameFor("utiles")}>
            <UtilesView
              config={config}
              setConfig={setConfig}
              subvistaInicial={utilesTab}
              pasos={pasos}
              setPasos={setPasos}
              tips={tips}
              setTips={setTips}
              links={links}
              setLinks={setLinks}
              speechs={speechs}
              setSpeechs={setSpeechs}
              speechsInteractivos={speechsInteractivos}
              setSpeechsInteractivos={setSpeechsInteractivos}
              objeciones={objeciones}
              setObjeciones={setObjeciones}
              art={art}
              setArt={setArt}
              transito={transito}
              setTransito={setTransito}
              lesiones={lesiones}
              setLesiones={setLesiones}
              mapeo={mapeo}
              setMapeo={setMapeo}
              observacionesTransito={observacionesTransito}
              setObservacionesTransito={setObservacionesTransito}
              condicionales={condicionales}
              setCondicionales={setCondicionales}
              casos={casos}
              showToast={showToast}
            />
          </div>
        )}
        </div>
        </Suspense>
      </div>

      {/* CALENDARIO - Overlay */}
      <OverlayPanel
        isOpen={showCalendar}
        onClose={() => { setShowCalendar(false); setPendingEventId(null); }}
        title="Calendario de Citas"
        icon={CalendarIcon}
        fullscreen
      >
        <Suspense fallback={null}>
          <CalendarView
            showToast={showToast}
            onClose={() => { setShowCalendar(false); setPendingEventId(null); }}
            casos={casos}
            config={config}
            onVerCaso={(c) => { setVerCaso(c); }}
            onActualizarCaso={handleCitaDrop}
            initialEventId={pendingEventId}
            onInitialEventConsumed={() => setPendingEventId(null)}
          />
        </Suspense>
      </OverlayPanel>

      {/* BLOC DE NOTAS - Overlay */}
      <OverlayPanel
        isOpen={showBlocNotas}
        onClose={() => setShowBlocNotas(false)}
        title="Bloc de Notas"
        icon={FileText}
        fullscreen
      >
        <Suspense fallback={null}>
          <NotesView
            showToast={showToast}
            casos={casos}
            config={config}
            selectedNoteId={pendingNoteId}
            onSelectedNoteIdConsumed={() => setPendingNoteId(null)}
            onCreateEvent={(evt) => { showToast('Evento creado desde nota', 'success'); }}
            onVerCaso={(c) => { setVerCaso(c); }}
          />
        </Suspense>
      </OverlayPanel>

      {/* OVERLAYS */}
      <OverlayPanel
        isOpen={overlayOpen === "config"}
        onClose={() => setOverlayOpen(null)}
        title="Configuración"
        icon={Settings}
        fullscreen
      >
        <Suspense fallback={null}>
          <ConfiguracionView
            config={config}
            setConfig={setConfig}
            pasos={pasos}
            setPasos={setPasos}
            tips={tips}
            setTips={setTips}
            links={links}
            setLinks={setLinks}
            speechs={speechs}
            setSpeechs={setSpeechs}
            speechsInteractivos={speechsInteractivos}
            setSpeechsInteractivos={setSpeechsInteractivos}
            objeciones={objeciones}
            setObjeciones={setObjeciones}
            art={art}
            setArt={setArt}
            transito={transito}
            setTransito={setTransito}
            lesiones={lesiones}
            setLesiones={setLesiones}
            mapeo={mapeo}
            setMapeo={setMapeo}
            observacionesTransito={observacionesTransito}
            setObservacionesTransito={setObservacionesTransito}
            condicionales={condicionales}
            setCondicionales={setCondicionales}
            showToast={showToast}
            casos={casos}
            onEliminarTodos={eliminarTodosLosDatos}
            onEliminarCasos={handleEliminarCasosBatch}
            setCasos={setCasos}
          />
        </Suspense>
      </OverlayPanel>

      <OverlayPanel
        isOpen={overlayOpen === "help"}
        onClose={() => setOverlayOpen(null)}
        title="Ayuda y Guías"
        icon={HelpCircle}
        fullscreen
      >
        <Suspense fallback={null}>
          <HelpPanel showToast={showToast} onClose={() => setOverlayOpen(null)} />
        </Suspense>
      </OverlayPanel>

      <OverlayPanel
        isOpen={overlayOpen === "csv-import"}
        onClose={() => setOverlayOpen(null)}
        title="Importador Inteligente CSV"
        icon={FileText}
        fullscreen
      >
        <Suspense fallback={null}>
          <CSVImporter onComplete={() => {
            setOverlayOpen(null);
            window.dispatchEvent(new Event("storage-update"));
          }} />
        </Suspense>
      </OverlayPanel>

      {/* MODALES */}
      {verCaso && (
        <Suspense fallback={null}>
        <VerCasoModal
          caso={casos.find((c) => c.id === verCaso.id) || verCaso}
          config={config}
          casos={casos}
          onClose={() => { setVerCaso(null); clearNavigation(); }}
          onEdit={(caso) => {
            setModalCaso(caso);
          }}
          covered={modalStack.stacked}
          onComentarios={actualizarCaso}
          onActualizarCaso={actualizarCaso}
          onDelete={(id) => { eliminarCaso(id); clearNavigation(); }}
           onNuevaNota={handleNuevaNota}
           onNuevoEvento={handleNuevoEvento}
            onReporteRapido={handleReporteRapido}
            onNavigateToNote={handleNavigateToNote}
           onNavigateToEvent={(eventId) => { setShowCalendar(true); }}
           onNavigateInsurer={(name) => navigateContextual('insurer', name, { name })}
           onNavigateLawFirm={(name) => navigateContextual('lawFirm', name, { name })}
           navigationStack={navigationStack}
           onBackNavigation={goBackNavigation}
           showToast={showToast}
           condicionales={condicionales}
           speechs={speechs}
           objeciones={objeciones}
          />
        </Suspense>
      )}

      <ConfirmDialog
        open={confirmDeleteCaso}
        title="Eliminar caso"
        message={`¿Eliminar el caso "${verCaso?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onConfirm={() => {
          setConfirmDeleteCaso(false);
          eliminarCaso(verCaso.id);
          setVerCaso(null);
        }}
        onCancel={() => setConfirmDeleteCaso(false)}
      />

      {modalCaso && (
        <Suspense fallback={null}>
          <CasoEditModal
            caso={modalCaso}
            casos={casos}
            mapeo={mapeo}
            config={config}
            onConfigChange={setConfig}
            onSave={guardarCaso}
            onDelete={(id) => {
              eliminarCaso(id);
              if (verCaso && String(verCaso.id) === String(id)) {
                setVerCaso(null);
                clearNavigation();
              }
            }}
            stacked={modalStack.stacked}
            onClose={() => setModalCaso(null)}
            onNuevaNota={handleNuevaNota}
            onNuevoEvento={handleNuevoEvento}
            showToast={showToast}
          />
        </Suspense>
      )}

      {modalReporte && (
        <Suspense fallback={null}>
          <ReporteRapidoModal
            casos={casos}
            casoInicial={casoReporteRapido}
            estadoInicial={estadoReporteRapido}
            config={config}
            onGuardar={guardarReporteRapido}
            onClose={() => { setModalReporte(false); setCasoReporteRapido(null); setEstadoReporteRapido(null); }}
            stacked={modalStack.stacked}
            showToast={showToast}
          />
        </Suspense>
      )}

      {/* Global Search (Ctrl+K) */}
      <Suspense fallback={null}>
        <GlobalSearch
          onSelectCase={handleGlobalSearchSelectCase}
          onSelectNote={handleGlobalSearchSelectNote}
          onSelectEvent={handleGlobalSearchSelectEvent}
          onSelectEntity={handleGlobalSearchSelectEntity}
          onNavigateUtiles={handleGlobalSearchNavigateUtiles}
          condicionales={condicionales}
          aseguradoras={aseguradorasFromCases}
          mapeo={mapeo}
        />
      </Suspense>

      <Suspense fallback={null}>
        <FilterModal
          isOpen={showFilterModal}
          onClose={closeFilterModal}
          opcionesCasos={casosDelMes}
          baseCasos={casosFiltrados}
          filtroGlobal={filtroGlobal}
          onChange={setFiltroGlobal}
          showToast={showToast}
        />
      </Suspense>

      <CsvExportModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        showToast={showToast}
      />

      {/* Notification System (includes ToastContainer with Celebrations) */}
      <ToastContainer />
      <NotificationCenter />
      <PersistentAlertContainer />

      {/* Deshacer última mutación */}
      {undoState && (
        <UndoBanner
          label={undoState.label}
          onUndo={deshacer}
          onTimeout={() => setUndoState(null)}
        />
      )}
    </div>
    </UXProvider>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <TypographyProvider>
      <FontSizeProvider>
        <ThemeProvider>
          <FiltersProvider>
            <ErrorBoundary context="AppContent">
              <TourProvider>
                <HelpProvider>
                  <AppContent />
                </HelpProvider>
              </TourProvider>
            </ErrorBoundary>
          </FiltersProvider>
        </ThemeProvider>
      </FontSizeProvider>
    </TypographyProvider>
  );
}
