import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import {
  Search,
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
import { FontSizeProvider, useFontSize } from "./context/FontSizeContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { FiltersProvider, useFilters } from "./context/FiltersContext";
import { I18nProvider, useI18n } from "./context/I18nContext";
import { UXProvider } from "./context/UXContext";
import { getDefaultCategories } from "./features/dashboard/metricsEngine";
// Hooks
import { useStorage } from "./hooks/useStorage";
import { useCases } from "./hooks/useCases";
import { useDebounce } from "./hooks/useDebounce";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { recordGoalAction, pushLastCase } from "./features/productivity/productivityStore";

// Utils
import { casoEnMes, getAvailableMonthsConReportes } from "./utils/dateFilters";
import { casoCoincide } from "./utils/searchEngine";
import { trackEvent, evaluate } from "./utils/behaviorEngine";
import { notificationManager } from "./core/notifications/notificationManager";
import { soundSystem } from "./core/notifications/soundSystem";
import { eventBus, AppEvents } from "./core/events/eventBus";
import { notifyChange, SYNC_EVENTS } from "./core/sync/syncService";
import { localStorageAdapter } from "./core/storage/localStorageAdapter";
import { setupAutoBackupWatcher } from "./services/autoBackup";
import { startSystemStatusMonitor } from "./core/status/storageHealth";
import { SystemStatusBanner } from "./components/common/SystemStatusBanner";
import { NotificationBell } from "./components/notifications/NotificationBell";
import { ToastContainer } from "./components/notifications/ToastContainer";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { PersistentAlertContainer } from "./components/notifications/PersistentAlert";
import { UndoBanner } from "./components/common/UndoBanner";
import useCelebrationStore from "./core/celebrations/celebrationStore";
import useNotificationStore from "./core/notifications/notificationStore";

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
import { BtnOutline } from "./components/common/BtnOutline";
import { TextInput } from "./components/common/TextInput";
import { Spinner } from "./components/common/Spinner";
import { OverlayPanel } from "./components/common/OverlayPanel";

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

// Components - Views (lazy)
const KanbanView = lazy(() => import("./components/kanban/KanbanView").then((m) => ({ default: m.KanbanView })));
const TablaView = lazy(() => import("./components/tabla/TablaView").then((m) => ({ default: m.TablaView })));
const ReportesView = lazy(() => import("./components/reportes/ReportesView").then((m) => ({ default: m.ReportesView })));
const GlobalStatsHeader = lazy(() => import("./components/common/GlobalStatsHeader").then((m) => ({ default: m.GlobalStatsHeader })));

const UtilesView = lazy(() => import("./components/utiles/UtilesView").then((m) => ({ default: m.UtilesView })));
const ConfiguracionView = lazy(() => import("./components/configuracion/ConfiguracionView").then((m) => ({ default: m.ConfiguracionView })));
const ComoUsarView = lazy(() => import("./components/ayuda/ComoUsarView").then((m) => ({ default: m.ComoUsarView })));
const OperatorView = lazy(() => import("./features/operator/OperatorView").then((m) => ({ default: m.OperatorView })));

// Tour
import { TourProvider, useTour } from "./tour";
// Help
import { HelpProvider } from "./help";

// Components - Modales (lazy)
const VerCasoModal = lazy(() => import("./components/modales/VerCasoModal").then((m) => ({ default: m.VerCasoModal })));
const CasoEditModal = lazy(() => import("./components/modales/CasoEditModal").then((m) => ({ default: m.CasoEditModal })));
const ReporteRapidoModal = lazy(() => import("./components/modales/ReporteRapidoModal").then((m) => ({ default: m.ReporteRapidoModal })));

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

function ViewTabs({ tabs, selectedView, onSelect }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-0.5 pb-2 animate-stagger">
      {tabs.map(([k, label, Icon]) => {
        const isActive = selectedView === k;
        const isMiEspacio = k === "mi-espacio";
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            data-tour={k}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-all ${
              isActive
                ? isMiEspacio
                  ? "text-[#14181F] shadow-md"
                  : "bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]"
                : isMiEspacio
                  ? "bg-[var(--color-accent)] text-[#14181F] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:opacity-70"
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
      })}
    </div>
  );
}

function AppContent() {
  const { fontSize } = useFontSize();
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
  } = useFilters();

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
  const [modalComentarios, setModalComentarios] = useState(null);
  const [verCaso, setVerCaso] = useState(null);
  const [casosSeleccionados, setCasosSeleccionados] = useState([]);
  const [overlayOpen, setOverlayOpen] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBlocNotas, setShowBlocNotas] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState(null);
  // Deshacer: snapshot previo de casos para revertir la última mutación.
  const [undoState, setUndoState] = useState(null);

  const pushUndo = useCallback((label) => {
    setUndoState({ prevCasos: casos, label, ts: Date.now() });
  }, [casos]);

  const showToast = useCallback((message, type = "success") => {
    useNotificationStore.getState().addToast({ message, type });
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
        console.error("[App] Error actualizando casos:", error);
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

    // Filtro rápido de drill-down desde el dashboard (estado/estudio/provincia/grupo).
    if (quickFilter && quickFilter.tipo && quickFilter.valor) {
      const qv = String(quickFilter.valor).trim().toUpperCase();
      if (quickFilter.tipo === "grupo") {
        switch (qv) {
          case "ACTIVOS":
            filtered = filtered.filter((c) => !catsFiltro.lost.includes(c.estado) && !catsFiltro.success.includes(c.estado));
            break;
          case "CERRADOS":
            filtered = filtered.filter((c) => catsFiltro.lost.includes(c.estado) || catsFiltro.success.includes(c.estado));
            break;
          case "FIRMAS":
            filtered = filtered.filter((c) => catsFiltro.success.includes(c.estado));
            break;
          case "PERDIDOS":
            filtered = filtered.filter((c) => catsFiltro.lost.includes(c.estado));
            break;
          case "SINRESPUESTA":
            filtered = filtered.filter((c) => catsFiltro.pending.includes(c.estado));
            break;
          case "SINREPORTE":
            filtered = filtered.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0);
            break;
          case "SINASIGNACION":
            filtered = filtered.filter((c) => !(c.estudioJuridico || '').trim());
            break;
          default:
            break;
        }
      } else if (quickFilter.tipo === "sinReporte") {
        filtered = filtered.filter((c) => !c.reporteHistory || c.reporteHistory.length === 0);
      } else {
        filtered = filtered.filter((c) =>
          (c[quickFilter.tipo] || '').toString().trim().toUpperCase() === qv
        );
      }
    }

    return filtered;
  }, [casos, selectedMonth, selectedYear, selectedDays, config.busquedaFiltro, catsFiltro, quickFilter]);

  const casosFiltrados = useMemo(() => {
    if (!debouncedQuery.trim()) return casosFiltradosPorMes;
    return casosFiltradosPorMes.filter((c) => casoCoincide(c, debouncedQuery));
  }, [casosFiltradosPorMes, debouncedQuery]);

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
    objeciones,
    art,
    transito,
    lesiones,
    observacionesTransito,
    condicionales,
  ]);

  // ============ CRUD ============
  const guardarCaso = useCallback(
    (caso) => {
      const validation = validateCaso(caso);
      if (!validation.valid) {
        showToast(`Errores: ${validation.errors.join(", ")}`, "error");
        return;
      }
      const isNew = !caso.id || !casos.some((c) => c.id === caso.id);
      const prev = casos.find((c) => c.id === caso.id)?.estado;
      pushUndo(isNew ? "Caso creado" : "Caso actualizado");
      setCasos((list) => {
        const updated = list.some((c) => c.id === caso.id)
          ? list.map((c) => (c.id === caso.id ? caso : c))
          : [...list, caso];
        if (isNew) {
          trackEvent("CASE_CREATED");
          eventBus.emit(AppEvents.CASE_CREATED, { type: "success", title: "Caso creado", message: `${caso.nombre} fue agregado`, source: "cases" });
        } else {
          trackEvent("CASE_EDITED");
          eventBus.emit(AppEvents.CASE_UPDATED, { type: "info", title: "Caso actualizado", message: `${caso.nombre} fue modificado`, source: "cases" });
        }
        return updated;
      });
      setModalCaso(null);
      soundSystem.playAction(isNew ? "create" : "save");
      if (!isNew && prev && prev !== caso.estado) {
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
      setModalCaso(null);
      showToast("Caso eliminado", "info");
      soundSystem.playAction("delete");
      if (deleted) {
        eventBus.emit(AppEvents.CASE_DELETED, { type: "info", title: "Caso eliminado", message: `${deleted.nombre} fue eliminado`, source: "cases" });
      }
    },
    [setCasos, showToast, casos, pushUndo]
  );

  const cambiarEstado = useCallback(
    (id, estado) => {
      const oldState = casos.find((c) => c.id === id)?.estado;
      if (oldState && oldState !== estado) {
        pushUndo(`Estado: ${oldState} → ${estado}`);
      }
      const updated = casos.map((c) => {
        if (c.id !== id) return c;
        if (estado === "Firmo" && !c.fechaFirma) {
          return {
            ...c,
            estado,
            fechaFirma: new Date().toISOString().slice(0, 10),
            alertaFirmaEnviada: false,
          };
        }
        return { ...c, estado };
      });
      setCasos(updated);
      if (oldState && oldState !== estado) {
        const caso = updated.find((c) => c.id === id);
        recordGoalAction('CASE_MOVED');
        eventBus.emit(AppEvents.CASE_STATUS_CHANGED, { type: "info", title: "Estado actualizado", message: `${casos.find((c) => c.id === id)?.nombre || "Caso"}: ${oldState} → ${estado}`, source: "cases", priority: "medium" });
        if (estado === "Firmo" || estado === "Pendiente") {
          celebrarEstado(caso, estado);
        }
        if (estado === "Firmo") {
          celebrarLogroSiCorresponde(updated, caso);
        }
      }
    },
    [setCasos, casos, pushUndo]
  );

  const guardarReporteRapido = useCallback(
    (caso) => {
      const prev = casos.find((c) => c.id === caso.id)?.estado;
      pushUndo("Reporte cargado");
      setCasos((list) => list.map((c) => (c.id === caso.id ? caso : c)));
      setModalReporte(false);
      soundSystem.playAction("save");
      if (prev && prev !== caso.estado) {
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
    [setCasos, casos, pushUndo]
  );

  const actualizarCaso = useCallback(
    (caso) => {
      pushUndo("Caso actualizado");
      trackEvent("CASE_EDITED");
      setCasos((list) => list.map((c) => (c.id === caso.id ? caso : c)));
    },
    [setCasos, pushUndo]
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
    setModalReporte(true);
  }, []);

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
      await Promise.all([
        appDB.notes.clear(),
        appDB.events.clear(),
        appDB.note_versions.clear(),
      ]);
    } catch (e) {
      console.error("[App] Error clearing databases:", e);
    }

    notifyChange(SYNC_EVENTS.DATA_CLEARED, { source: "app" });

    // 1) Limpiar todas las claves con prefijo app_
    localStorageAdapter.clear();

    // 2) Limpiar claves sin prefijo: Mi Espacio, productividad, backups, etc.
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
    ];
    unprefixedKeys.forEach((key) => localStorage.removeItem(key));

    // 3) Limpiar claves con prefijo conversaciones_*
    Object.keys(localStorage)
      .filter((key) => key.startsWith("conversaciones_") || key.startsWith("tour_"))
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
      if (config.confirmaciones && !confirm(`Eliminar caso "${verCaso.nombre}"?`)) return;
      eliminarCaso(verCaso.id);
      setVerCaso(null);
    },
    enabled: config.atajosTeclado !== false,
  });

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
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}><Spinner size={40} /><span className="ml-3">Cargando...</span></div>}>
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
      <header className="app-header sticky top-0 z-30">
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
                    color: "#14181F",
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
            <div className="relative flex-1 min-w-[160px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, teléfono, #etiqueta o @comentario..."
                className="pl-8"
                style={{ width: "100%" }}
                data-tour="buscar"
              />
            </div>
            <Btn
              onClick={() => setModalReporte(true)}
              icon={ClipboardList}
              size="sm"
              variant="accent"
              data-tour="cargar-reporte"
            >
              NUEVO REPORTE
            </Btn>
            <Btn
              onClick={() => setModalCaso({ ...casoVacio(), estado: config.estadoDefault || 'Cita virtual' })}
              icon={Plus}
              size="sm"
              data-tour="nuevo-caso"
            >
              NUEVO CASO
            </Btn>
          </div>

          <ViewTabs tabs={tabs} selectedView={selectedView} onSelect={setSelectedView} />
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto animate-fade-in">
        <SystemStatusBanner />
        {selectedView === "dashboard" && (
          <>
            <GlobalStatsHeader casos={casosFiltrados} quickFilter={quickFilter} onClearQuickFilter={() => setQuickFilter(null)} />
            <Dashboard
              config={config}
              casos={casosFiltrados}
              casosMes={casosDelMes}
              mesesDisponibles={mesesDisponibles}
              onVerCaso={handleVerCaso}
              onNuevoCaso={() => setModalCaso({ ...casoVacio(), estado: config.estadoDefault || 'Cita virtual' })}
              onImportarCSV={() => setOverlayOpen("csv-import")}
              onTour={() => startTour("onboarding")}
            />
          </>
        )}
        {selectedView === "kanban" && (
          <>
            <GlobalStatsHeader casos={casosFiltrados} quickFilter={quickFilter} onClearQuickFilter={() => setQuickFilter(null)} />
            <KanbanView
              casos={casosFiltrados}
              casosMes={casosDelMes}
              config={config}
              onOpen={setVerCaso}
              onEstadoChange={cambiarEstado}
              showToast={showToast}
              mesesDisponibles={mesesDisponibles}
            />
          </>
        )}
        {selectedView === "tabla" && (
          <>
            <GlobalStatsHeader casos={casosFiltrados} quickFilter={quickFilter} onClearQuickFilter={() => setQuickFilter(null)} />
            <TablaView
              casos={casosFiltrados}
              casosMes={casosDelMes}
              config={config}
              onOpen={setVerCaso}
              onSeleccionar={setCasosSeleccionados}
              seleccionados={casosSeleccionados}
              mesesDisponibles={mesesDisponibles}
            />
          </>
        )}
        {selectedView === "reportes" && (
          <>
            <GlobalStatsHeader casos={casosFiltrados} quickFilter={quickFilter} onClearQuickFilter={() => setQuickFilter(null)} />
            <ReportesView
              casos={casosFiltrados}
              casosMes={casosDelMes}
              onVerCaso={setVerCaso}
              mesesDisponibles={mesesDisponibles}
            />
          </>
        )}
        {selectedView === "mi-espacio" && (
          <OperatorView
            config={config}
            casos={casosFiltrados}
            showToast={showToast}
            onChangeView={setSelectedView}
          />
        )}
        {selectedView === "utiles" && (
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
        )}
        {selectedView === "configuracion" && (
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
        )}
        {selectedView === "como-usar" && <ComoUsarView showToast={showToast} />}
      </div>

      {/* CALENDARIO - Overlay */}
      {showCalendar && (
        <OverlayPanel
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          title="Calendario de Citas"
          icon={CalendarIcon}
          fullscreen
        >
          <CalendarView
            showToast={showToast}
            onClose={() => setShowCalendar(false)}
            casos={casos}
          />
        </OverlayPanel>
      )}

      {/* BLOC DE NOTAS - Overlay */}
      {showBlocNotas && (
        <OverlayPanel
          isOpen={showBlocNotas}
          onClose={() => setShowBlocNotas(false)}
          title="Bloc de Notas"
          icon={FileText}
          fullscreen
        >
          <NotesView
            showToast={showToast}
            casos={casos}
            selectedNoteId={pendingNoteId}
            onSelectedNoteIdConsumed={() => setPendingNoteId(null)}
            onCreateEvent={(evt) => { showToast('Evento creado desde nota', 'success'); }}
          />
        </OverlayPanel>
      )}

      {/* OVERLAYS */}
      <OverlayPanel
        isOpen={overlayOpen === "config"}
        onClose={() => setOverlayOpen(null)}
        title="Configuración"
        icon={Settings}
        fullscreen
      >
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
      </OverlayPanel>

      <OverlayPanel
        isOpen={overlayOpen === "help"}
        onClose={() => setOverlayOpen(null)}
        title="Ayuda y Guías"
        icon={HelpCircle}
        fullscreen
      >
        <HelpPanel showToast={showToast} onClose={() => setOverlayOpen(null)} />
      </OverlayPanel>

      <OverlayPanel
        isOpen={overlayOpen === "csv-import"}
        onClose={() => setOverlayOpen(null)}
        title="Importador Inteligente CSV"
        icon={FileText}
        fullscreen
      >
        <CSVImporter onComplete={() => {
          setOverlayOpen(null);
          window.dispatchEvent(new Event("storage-update"));
        }} />
      </OverlayPanel>

      {/* MODALES */}
      {verCaso && (
        <VerCasoModal
          caso={verCaso}
          config={config}
          onClose={() => setVerCaso(null)}
          onEdit={(caso) => {
            setModalCaso(caso);
            setVerCaso(null);
          }}
          onComentarios={actualizarCaso}
          onDelete={eliminarCaso}
           onNuevaNota={handleNuevaNota}
           onNuevoEvento={handleNuevoEvento}
           onReporteRapido={handleReporteRapido}
           onNavigateToNote={handleNavigateToNote}
           showToast={showToast}
         />
      )}

      {modalCaso && (
        <CasoEditModal
          caso={modalCaso}
          casos={casos}
          mapeo={mapeo}
          config={config}
          onConfigChange={setConfig}
          onSave={guardarCaso}
          onDelete={eliminarCaso}
          onClose={() => setModalCaso(null)}
          onNuevaNota={handleNuevaNota}
          onNuevoEvento={handleNuevoEvento}
          showToast={showToast}
        />
      )}

      {modalReporte && (
        <ReporteRapidoModal
          casos={casos}
          casoInicial={casoReporteRapido}
          config={config}
          onGuardar={guardarReporteRapido}
          onClose={() => { setModalReporte(false); setCasoReporteRapido(null); }}
          showToast={showToast}
        />
      )}

      {/* Global Search (Ctrl+K) */}
      <GlobalSearch
        onSelectCase={(id) => {
          const c = casos.find((c) => c.id === id);
          if (c) setVerCaso(c);
        }}
        onSelectNote={(id) => setShowBlocNotas(true)}
        onSelectEvent={(id) => setShowCalendar(true)}
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
    </Suspense>
    </UXProvider>
    </I18nProvider>
  );
}

export default function App() {
  return (
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
  );
}
