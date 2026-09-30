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
import { casoEnMes, getAvailableMonthsConReportes } from "./utils/dateFilters";
import { casoCoincide } from "./utils/searchEngine";
import { aplicarQuickFilter, quickFilterChip } from "./utils/filtrarQuickFilter";
import { trackEvent, evaluate } from "./utils/behaviorEngine";
import { notificationManager } from "./core/notifications/notificationManager";
import { soundSystem } from "./core/notifications/soundSystem";
import { eventBus, AppEvents } from "./core/events/eventBus";
import { notifyChange, SYNC_EVENTS } from "./core/sync/syncService";
import { reportError } from "./core/error/reportError";
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

// Detecta si el mes del caso alcanzó la meta de firmas y felicita (una vez por mes).
function celebrarLogroSiCorresponde(casos, caso) {
  if (!caso) return;
  const mes = (caso.fecha || "").slice(0, 7);
  if (!mes) return;
  const firmas = casos.filter(
    (c) => (c.fecha || "").startsWith(mes) && c.estado === "Firmo"
  ).length - casos.filter(
    (c) => (c.fecha || "").startsWith(mes) && c.estado === "Baja"
  ).length;
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
import { startAlertSystem } from "./features/alerts/alertsSystem";
import {
  computeCaseChanges,
  recordCaseChanges,
  deleteCaseHistory,
} from "./core/cases/caseHistory";
import { runIntegrityCheck } from "./core/integrity/integrityService";
import {
  syncCitaEvent,
  createRescheduleEvent,
} from "./core/cases/citaAutoEvents";
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
          style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
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
        <Icon size={13} />
        <span className="hidden xs:inline">{t(`tabs.${k}`, label)}</span>
      </button>
    );
  };

  return (
    <div
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
    searchQuery,
    setSearchQuery,
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
  const [config, setConfig] = useStorage("config-art-tracker", CONFIG_DEFAULT);
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
  const [modalCaso, setModalCaso] = useState(null);
  const [modalReporte, setModalReporte] = useState(false);
  const [casoReporteRapido, setCasoReporteRapido] = useState(null);
  const [estadoReporteRapido, setEstadoReporteRapido] = useState(null);
  const [modalComentarios, setModalComentarios] = useState(null);
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

  const pushUndo = useCallback((label) => {
    setUndoState({ prevCasos: casos, label, ts: Date.now() });
  }, [casos]);

  const showToast = useCallback((message, type = "success") => {
    notificationManager.notify({
      type,
      title: "",
      message,
      source: "app",
    });
  }, []);

  const deshacer = useCallback(() => {
    if (!undoState) return;
    setCasos(undoState.prevCasos);
    setUndoState(null);
    showToast("Cambio deshecho", "info");
  }, [undoState, setCasos, showToast]);

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
      filtered = filtered.filter(c => {
        const parts = (c.fecha || '').split('-');
        return parts.length === 3 && pads.has(parts[2]);
      });
    }
    const filtro = config.busquedaFiltro || "todos";
    if (filtro === "activos") {
      filtered = filtered.filter((c) => !catsFiltro.lost.includes(c.estado));
    } else if (filtro === "pendientes") {
      filtered = filtered.filter((c) => catsFiltro.contact.includes(c.estado));
    } else if (filtro === "hoy") {
      const hoy = new Date().toISOString().slice(0, 10);
      filtered = filtered.filter((c) => (c.fecha || '').slice(0, 10) === hoy);
    }

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
        } else {
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
        if (caso.estado === "Firmo" || caso.estado === "Pendiente") {
          celebrarEstado(caso, caso.estado);
        }
        if (caso.estado === "Firmo") {
          const updatedForGoal = casos.map((c) =>
            c.id === caso.id ? caso : c
          );
          celebrarLogroSiCorresponde(updatedForGoal, caso);
        }
      }
    },
    [setCasos, showToast, casos, pushUndo]
  );

  const eliminarCaso = useCallback(
    (id) => {
      const deleted = casos.find((c) => c.id === id);
      pushUndo("Caso eliminado");
      setCasos((list) => list.filter((c) => c.id !== id));
      deleteCaseHistory(id);
      setModalCaso(null);
      soundSystem.playAction("delete");
      if (deleted) {
        eventBus.emit(AppEvents.CASE_DELETED, { type: "info", title: "Caso eliminado", message: `${deleted.nombre} fue eliminado`, source: "cases" });
      }
    },
    [setCasos, casos, pushUndo]
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
        if (estado === "Firmo" && !c.fechaFirma) {
          base.fechaFirma = new Date().toISOString().slice(0, 10);
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
        if (estado === "Firmo" || estado === "Pendiente") {
          celebrarEstado(cambio, estado);
        }
        if (estado === "Firmo") {
          celebrarLogroSiCorresponde(updated, cambio);
        }
      }
      setCasos(updated);
    },
    [setCasos, casos, pushUndo]
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
      if (prev) {
        const cambios = computeCaseChanges(prev, caso);
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
        if (casoFinal.estado === "Firmo" || casoFinal.estado === "Pendiente") {
          celebrarEstado(casoFinal, casoFinal.estado);
        }
        if (casoFinal.estado === "Firmo") {
          const updatedForGoal = casos.map((c) =>
            c.id === casoFinal.id ? casoFinal : c
          );
          celebrarLogroSiCorresponde(updatedForGoal, casoFinal);
        }
      }
    },
    [setCasos, casos, pushUndo]
  );

  const actualizarCaso = useCallback(
    (caso) => {
      const prev = casos.find((c) => c.id === caso.id);
      let casoFinal = caso;
      if (prev) {
        const cambios = computeCaseChanges(prev, caso);
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
    },
    [setCasos, casos, pushUndo]
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
      ]);
    } catch (e) {
      reportError(e, { context: 'App:clearDatabases' });
    }

    notifyChange(SYNC_EVENTS.DATA_CLEARED, { source: "app" });

    // 1) Limpiar todas las claves con prefijo app_ (underscore)
    localStorageAdapter.clear();

    // 2) Limpiar claves con prefijo app- (guión) — no cubiertas por el adapter
    const hyphenKeys = [
      "app-view-orders", "app-theme", "app-palette", "app-estado-colors",
      "app-onboarding-done", "app-font-size", "app-filters",
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

    // 4) Limpiar claves con prefijo conversaciones_*, tour_* y app_*
    Object.keys(localStorage)
      .filter((key) =>
        key.startsWith("conversaciones_") ||
        key.startsWith("tour_") ||
        key.startsWith("app_")
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
    exportarPDF(casosExport, "Casos seleccionados");
    setCasosSeleccionados([]);
  }, [casos, casosSeleccionados, showToast]);

  // ============ KEYBOARD SHORTCUTS ============
  useKeyboardShortcuts({
    onNuevo: () => setModalCaso({ ...casoVacio(), estado: config.estadoDefault || 'Cita virtual' }),
    onReporte: () => setModalReporte(true),
    onBuscar: () =>
      document.querySelector('input[placeholder*="Buscar"]')?.focus(),
    onCerrarModal: () => {
      setModalCaso(null);
      setModalReporte(false);
      setVerCaso(null);
      setModalComentarios(null);
      setOverlayOpen(null);
      setShowCalendar(false);
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
            backgroundColor: "var(--color-danger)11",
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

      {/* CONTENIDO */}
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto relative overflow-x-clip">
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
