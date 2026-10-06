import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { SectionHeader as UISectionHeader } from "./ui";
import {
  Settings, Palette, Layout, Database, AlertTriangle, Download, Upload,
  FileSpreadsheet, FileText, Trash2, Bug, CheckCircle, XCircle,
  Globe, Bell, LayoutDashboard, Search, FileUp, Cpu, Navigation,
  ToggleLeft, Eye, EyeOff, Clock, ArrowUpDown, Tag, Mail, X,
  GripVertical, ChevronUp, ChevronDown, CircleDot, Lightbulb,
  LayoutGrid, Table2, ClipboardList, Wrench, Plus, Target, Type, CalendarClock, Sun,
  CalendarDays, ListTodo, Zap, Lock, Columns, MoreHorizontal, GitBranch,
  ListOrdered, MessageSquare, MessagesSquare, ShieldAlert, HeartPulse, Scale, Car, FileSearch,
  BarChart3, Building2, Filter, ClipboardPaste,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { Select } from "../common/Select";
import { TextInput } from "../common/TextInput";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Toggle } from "../common/Toggle";
import { useJustifyPestanas } from "../common/UINav";
import { PersonalizacionColores } from "./PersonalizacionColores";
import { KeywordsInput } from "./KeywordsInput";
import { TipografiaView } from "./TipografiaView";
import { getProductivitySettings, saveProductivitySettings, getGoalsState, setDailyTarget } from "../../features/productivity/productivityStore";
// v1.9.6 (fix metas): getOperatorGoals + subscribeOperatorGoals para que el
// input de meta muestre siempre el valor canónico (Mi Espacio) y se refresque
// si cambia desde otra vista en la misma pestaña.
import { getOperatorSettings, saveOperatorSettings, getOperatorGoals, subscribeOperatorGoals } from "../../features/operator/operatorStore";
import { getOrderedMiEspacioKeys, MI_ESPACIO_LABELS, DEFAULT_MI_ESPACIO_ORDER } from "../../features/operator/miEspacioConfig";
import { getMetricDefs, getDefaultCategories, getDefaultAlerts } from '../../features/dashboard/metricsEngine';
import {
  DASH_TAB_MAP,
  DASH_WIDGET_REGISTRY,
  getOrderedDashWidgets,
} from "../../features/dashboard/dashboardConfig";
import { ESTADOS, TIPOS_INGRESO_SUGERIDOS, TEMPLATE_CATEGORIES_SUGERIDOS, DEFAULT_FICHA_FIELDS, FICHA_TARGET_OPCIONES } from '../../utils/constants';
import { getEstados, getTiposIngreso, getTemplateCategories, getFichaFields } from '../../utils/catalogos';
// 1.9.6: modelo de Útiles → Conversación Sugerida (categorías + variables con llaves).
import {
  CATEGORIAS_CONVERSACION_DEFAULT,
  VARIABLE_OPERADOR,
  getConversacionesCategorias,
  getConversacionesVariables,
  leerMensajes,
  renombrarCategoria as renombrarClaveCategoria,
  eliminarMensajes,
  normalizarNombreVariable,
  errorNombreCategoria,
  errorNombreVariable,
} from '../../utils/conversaciones';
import { normalizarTexto } from '../../utils/helpers';
import { getAllTemplates } from '../../features/templates/templatesStore';
import {
  FORMATOS_FECHA, FORMATOS_TELEFONO, OPCIONES_CASOS_POR_PAGINA, COLUMNAS_DISPONIBLES,
} from "../../utils/constants";
import {
  exportCasesToCSV, exportConfigToJSON, importConfigFromJSON,
} from "../../utils/backup";
import { soundSystem } from "../../core/notifications/soundSystem";
import { getAvailableMonths, getMonthLabel, isSameMonth } from "../../utils/dateFilters";
import { Pill } from "../common/Pill";
import { Paginacion } from "../common/Paginacion";
import { parseCSV, detectFieldMappings, FIELD_OPTIONS, mapRowToCase } from "../../features/import/CSVImporter";
import { SystemLogs } from "../../pages/SystemLogs";
import useAppStore from "../../core/store/useAppStore";
import appDB from "../../core/db/appDB";
import casesDB from "../../core/db/casesDB";
import { useHelp } from "../../help";
import { useDelayedClose } from "../../hooks/useAnimatedPresence";
import { HelpSection } from "./HelpSection";
import * as backupService from "../../services/backupService";
import { localStorageAdapter } from "../../core/storage/localStorageAdapter";
import {
  getBackupHistory, deleteBackup, restoreFromHistory, runAutoBackup,
  getBackupFrequency, setBackupFrequency, daysSinceLastBackup,
  BACKUP_FREQUENCY_OPTIONS, getJornadaBackupSchedule,
} from "../../services/autoBackup";
import { copyToClipboard } from "../../utils/copyToClipboard";

function formatUtilesValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const todosPrimitivos = value.every(
      (v) => v === null || typeof v !== "object"
    );
    const preview = todosPrimitivos
      ? value.join(", ")
      : value
          .slice(0, 3)
          .map((v) =>
            typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)
          )
          .join(" | ");
    return `${value.length} elemento${value.length === 1 ? "" : "s"} — ${preview}`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    let json;
    try {
      json = JSON.stringify(value);
    } catch {
      return `${keys.length} claves`;
    }
    return json.length > 300 ? json.slice(0, 300) + "…" : json;
  }
  return String(value);
}

// ============ REDESIGN 1.8.4: encabezados unificados de sección ============
const SECTION_META = {
  general: "Preferencias del operador: nombre, formato de fecha/hora, idioma, sonidos y paginación.",
  columnas: "Muestra u oculta las columnas de la vista Tabla y su orden.",
  datos: "Backup completo, auto-backup, exportar/importar configuración y limpieza de datos.",
  citas: "Ajustes del calendario y de las citas vinculadas a casos.",
  plantillas: "Plantillas de reportes para agilizar el registro.",
  conversaciones:
    "Categorías y variables con llaves de Útiles → Conversación Sugerida.",
  apariencia: "Tema claro/oscuro, paletas de color y colores por estado de caso.",
  tipografia: "Presets tipográficos y tamaño de fuente de toda la app.",
  dashboard: "Orden de pestañas y widgets del Dashboard, Mi Espacio, Tablero, Tabla, Reportes y Útiles.",
  notificaciones: "Canales, prioridades, sonido y agrupación de notificaciones.",
  busqueda: "Campos indexados e historial de la búsqueda global.",
  productividad: "Funciones personales: memoria operativa, objetivos, micro-analítica y Mi Espacio.",
  ux: "Animaciones, microinteracciones, modo bajo consumo y confirmaciones.",
  "dashboard-config": "Métricas visibles, widgets, categorías de estado y reglas de alerta del Dashboard.",
  "estados-caso": "Estados del pipeline de casos y su configuración.",
  "tipos-ingreso": "Tipos de ingreso detectados al pegar una ficha.",
  "ficha-fields": "Etiquetas, palabras clave y destino de cada campo al pegar una ficha.",
  importacion: "Importación de casos desde CSV y mapeo de columnas.",
  diagnostico: "Autodiagnóstico, logs y estado general del sistema.",
};

function sectionMetaFor(seccion, grupos) {
  for (const g of grupos) {
    for (const item of g.items) {
      if (item.id === seccion) return { grupo: g, item };
    }
  }
  return { grupo: grupos[0], item: grupos[0]?.items?.[0] };
}

function SectionHeader({ seccion, grupos }) {
  const { item } = sectionMetaFor(seccion, grupos);
  return (
    <UISectionHeader
      icon={item?.icon || Settings}
      titulo={item?.label}
      descripcion={SECTION_META[seccion]}
      storageKey="configuracion"
    />
  );
}

export function ConfiguracionView({
  config,
  setConfig,
  pasos,
  setPasos,
  tips,
  setTips,
  links,
  setLinks,
  speechs,
  setSpeechs,
  speechsInteractivos,
  setSpeechsInteractivos,
  objeciones,
  setObjeciones,
  art,
  setArt,
  transito,
  setTransito,
  lesiones,
  setLesiones,
  mapeo,
  setMapeo,
  observacionesTransito,
  setObservacionesTransito,
  condicionales,
  setCondicionales,
  showToast,
  casos,
  onEliminarTodos,
  setCasos,
}) {
  const { updateContext } = useHelp();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const configFileInputRef = useRef(null);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  useEffect(() => {
    updateContext({ currentView: "settings" });
  }, [updateContext]);

  useEffect(() => {
    if (config.idioma && !["es", "en"].includes(config.idioma)) {
      setConfig({ ...config, idioma: "es" });
    }
  }, []);

  const [confirmFinal, setConfirmFinal] = useState(false);
  const [confirmDeleteNotes, setConfirmDeleteNotes] = useState(false);
  const [confirmDeleteEvents, setConfirmDeleteEvents] = useState(false);
  const [confirmDeleteCases, setConfirmDeleteCases] = useState(false);
  const [confirmDeleteUtiles, setConfirmDeleteUtiles] = useState(false);
  const [confirmRestoreBackupId, setConfirmRestoreBackupId] = useState(null);
  const [confirmDeleteBackupId, setConfirmDeleteBackupId] = useState(null);
  const [deleteKeyword, setDeleteKeyword] = useState("");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [previewEstrategia, setPreviewEstrategia] = useState("omitir");
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [csvPreview, setCsvPreview] = useState({ headers: [], rows: [], rawText: "" });
  const [importMapping, setImportMapping] = useState([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [showUtilesPreview, setShowUtilesPreview] = useState(false);
  const [utilesPreviewData, setUtilesPreviewData] = useState(null);
  const [utilesPage, setUtilesPage] = useState(1);
  const [showNcPreview, setShowNcPreview] = useState(false);
  const [ncPreviewData, setNcPreviewData] = useState(null);
  const backupFileInputRef = useRef(null);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [checksumMismatch, setChecksumMismatch] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [bloqueoVaciado, setBloqueoVaciado] = useState(null);
  const [backupStats, setBackupStats] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupHistoryLoading, setBackupHistoryLoading] = useState(false);
  const [backupFrequency, setBackupFrequencyState] = useState(() => getBackupFrequency());

  const previewAbierto =
    showImportPreview || showUtilesPreview || showNcPreview;

  const utilesClavesImportables = utilesPreviewData
    ? utilesPreviewData.keys.filter(
        (k) =>
          (config.importUtilesCategorias || {})[k.replace('-art-tracker', '')] !==
          false
      )
    : [];

  const {
    isClosing: importClosing,
    startClose: importClose,
  } = useDelayedClose(() => setShowImportPreview(false));
  const {
    isClosing: utilesClosing,
    startClose: utilesClose,
  } = useDelayedClose(() => setShowUtilesPreview(false));
  const {
    isClosing: ncClosing,
    startClose: ncClose,
  } = useDelayedClose(() => setShowNcPreview(false));

  useEffect(() => {
    if (!previewAbierto) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (showImportPreview) importClose();
      else if (showUtilesPreview) utilesClose();
      else if (showNcPreview) ncClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [showImportPreview, showUtilesPreview, showNcPreview, previewAbierto, importClose, utilesClose, ncClose]);

  const handleChangeBackupFrequency = (frequency) => {
    if (!setBackupFrequency(frequency)) return;
    setBackupFrequencyState(frequency);
    const label = BACKUP_FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label || frequency;
    showToast(
      frequency === "manual"
        ? "Backups automáticos desactivados"
        : `Frecuencia de backup: ${label}`,
      "success"
    );
  };

  // Cargar historial de backups automáticos al montar.
  useEffect(() => {
    let mounted = true;
    setBackupHistoryLoading(true);
    getBackupHistory().then((history) => {
      if (mounted) {
        setBackupHistory(history);
        setBackupHistoryLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRunAutoBackup = async () => {
    setLoading(true);
    const result = await runAutoBackup();
    setLoading(false);
    if (result.ok) {
      showToast("Backup automático creado correctamente", "success");
      setBackupHistory(await getBackupHistory());
    } else {
      showToast(result.error || "Error al crear el backup automático", "error");
    }
  };

  const handleRestoreFromHistory = async (id) => {
    if (confirmRestoreBackupId !== id) {
      setConfirmRestoreBackupId(id);
      setConfirmDeleteBackupId(null);
      return;
    }
    setConfirmRestoreBackupId(null);
    setLoading(true);
    try {
      await restoreFromHistory(id);
      // Evita que el beforeunload sobrescriba los datos recién importados
      // con el estado de React (que aún contiene los valores previos).
      sessionStorage.setItem("import-complete", "true");
      showToast("Backup restaurado correctamente. Recargando...", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast(err.message || "Error al restaurar backup", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (id) => {
    if (confirmDeleteBackupId !== id) {
      setConfirmDeleteBackupId(id);
      setConfirmRestoreBackupId(null);
      return;
    }
    setConfirmDeleteBackupId(null);
    try {
      await deleteBackup(id);
      setBackupHistory(await getBackupHistory());
      soundSystem.playAction("delete");
      showToast("Backup eliminado del historial", "info");
    } catch (err) {
      showToast("Error al eliminar el backup", "error");
    }
  };

  const kanbanSections = useAppStore((s) => s.kanbanSections);
  const setKanbanSections = useAppStore((s) => s.setKanbanSections);
  const tablaSections = useAppStore((s) => s.tablaSections);
  const setTablaSections = useAppStore((s) => s.setTablaSections);
  const reportesSections = useAppStore((s) => s.reportesSections);
  const setReportesSections = useAppStore((s) => s.setReportesSections);
  const utilesTabOrder = useAppStore((s) => s.utilesTabOrder);
  const setUtilesTabOrder = useAppStore((s) => s.setUtilesTabOrder);

  const GRUPOS_CONFIG = [
    {
      id: "general", label: "General", icon: Settings,
      items: [
        { id: "general", label: "General", icon: Settings },
        { id: "columnas", label: "Columnas", icon: Layout },
        { id: "datos", label: "Datos", icon: Database },
        { id: "citas", label: "Citas y Calendario", icon: CalendarClock },
        { id: "plantillas", label: "Plantillas", icon: FileText },
        // 1.9.6: editor de categorías y variables de Útiles → Conversación Sugerida.
        { id: "conversaciones", label: "Conversación Sugerida", icon: MessagesSquare },
      ],
    },
    {
      id: "apariencia", label: "Apariencia", icon: Palette,
      items: [
        { id: "apariencia", label: "Colores", icon: Palette },
        { id: "tipografia", label: "Tipografía", icon: Type },
        { id: "dashboard", label: "Vistas", icon: Eye },
        { id: "ux", label: "UX/Navegación", icon: Navigation },
      ],
    },
    {
      id: "notificaciones", label: "Notificaciones", icon: Bell,
      items: [
        { id: "notificaciones", label: "Notificaciones", icon: Bell },
      ],
    },
    {
      id: "busqueda", label: "Búsqueda", icon: Search,
      items: [
        { id: "busqueda", label: "Búsqueda", icon: Search },
      ],
    },
    {
      id: "productividad", label: "Productividad", icon: Target,
      items: [
        { id: "productividad", label: "Productividad personal", icon: Target },
      ],
    },
    {
      // Grupo fusionado (ex "Sistema" + ex "Avanzado").
      id: "sistema", label: "Avanzado", icon: Cpu,
      items: [
        { id: "dashboard-config", label: "Dashboard", icon: LayoutDashboard },
        { id: "estados-caso", label: "Estados de Caso", icon: CircleDot },
        { id: "tipos-ingreso", label: "Tipos de Ingreso", icon: Tag },
        { id: "ficha-fields", label: "Pegado de Ficha", icon: ClipboardPaste },
        { id: "importacion", label: "Importación", icon: FileUp },
        { id: "diagnostico", label: "Diagnóstico", icon: Bug },
      ],
    },
  ];

  const [grupoActivo, setGrupoActivo] = useState("general");

  const [seccion, setSeccion] = useState("general");

  // 1.9.6: estados locales del editor de Conversación Sugerida.
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [renombresCat, setRenombresCat] = useState({});
  const [confirmCatBorrar, setConfirmCatBorrar] = useState(null);
  const [nuevaVarNombre, setNuevaVarNombre] = useState("");
  const [nuevaVarValor, setNuevaVarValor] = useState("");

  const justifyPestanas = useJustifyPestanas();

  const cambiarGrupo = (groupId) => {
    setGrupoActivo(groupId);
    const grupo = GRUPOS_CONFIG.find((g) => g.id === groupId);
    if (grupo) {
      setSeccion(grupo.items[0].id);
    }
  };

  const cambiarSubseccion = (subId) => {
    setSeccion(subId);
  };

  const mesesDisponibles = useMemo(
    () => getAvailableMonths(casos, "fecha"),
    [casos]
  );

  const actualizarConfig = (campo, valor) => {
    setConfig({ ...config, [campo]: valor });
  };

  const toggleColumna = (key) => {
    setConfig({
      ...config,
      columnasVisibles: {
        ...config.columnasVisibles,
        [key]: !config.columnasVisibles[key],
      },
    });
  };

  // ============ EXPORTAR CASOS ============
  const handleExportCasesCSV = async () => {
    try {
      setLoading(true);
      const monthsToExport = selectedMonths.length > 0 ? selectedMonths : null;
      const data = await exportCasesToCSV(monthsToExport);

      const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `casos_exportados.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast("Casos exportados en CSV", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };
  // ============ IMPORTAR CASOS ============
  const MAPPING_TEMPLATE_LOCAL_KEY = "csv-mapping-template";

  /** Aplica la estrategia de duplicados y modo de importación configurados. */
  const ejecutarImportCasos = useCallback(async (cases, estrategiaOverride) => {
    const estrategia = estrategiaOverride || config.importDuplicados || "omitir";
    const modo = config.importModoCasos || "agregar";
    const store = useAppStore.getState();
    let toInsert = cases;
    let actualizados = 0;

    if (modo !== "reemplazar-mes" && estrategia !== "duplicar") {
      const norm = (v) => (v || "").trim().toLowerCase();
      const keyOf = (c) => `${norm(c.nombre)}|||${norm(c.telefono)}`;
      const existingByKey = new Map();
      store.cases.forEach((c) => {
        const k = keyOf(c);
        if (k !== "|||") existingByKey.set(k, c);
      });
      const nuevos = [];
      for (const c of cases) {
        const k = keyOf(c);
        const dup = k !== "|||" ? existingByKey.get(k) : null;
        if (!dup) { nuevos.push(c); continue; }
        if (estrategia === "actualizar") {
          await store.updateCase(dup.id, { ...c, id: dup.id });
          actualizados++;
        }
        // "omitir": descartar el duplicado
      }
      toInsert = nuevos;
    }

    if (modo === "reemplazar-mes" && cases.length > 0) {
      // Elimina los casos existentes de los meses presentes en el archivo
      // y luego inserta todo el contenido del archivo.
      const meses = [...new Set(cases.map((c) => (c.fecha || "").slice(0, 7)))].filter(Boolean);
      if (meses.length > 0) {
        try {
          const { default: casesDB } = await import('../../core/db/casesDB');
          const all = await casesDB.cases.toArray();
          const ids = all
            .filter((c) => meses.includes((c.fecha || "").slice(0, 7)))
            .map((c) => c.id)
            .filter(Boolean);
          if (ids.length > 0) await casesDB.cases.bulkDelete(ids);
          await store.loadCases();
          showToast(`${ids.length} casos existentes reemplazados por los del archivo`, "info");
        } catch {
          showToast("No se pudo reemplazar por mes; se agregaron a lo existente", "warning");
        }
      }
      toInsert = cases;
    }

    if (toInsert.length === 0) {
      showToast(
        actualizados > 0
          ? `Sin casos nuevos. ${actualizados} existente${actualizados === 1 ? "" : "s"} actualizado${actualizados === 1 ? "" : "s"}.`
          : "No hay casos nuevos para importar",
        "info"
      );
      return;
    }

    const result = await store.appendCases(toInsert);

    const historyToImport = toInsert
      .filter((c) => Array.isArray(c.caseHistory) && c.caseHistory.length > 0)
      .flatMap((c) => c.caseHistory.map((h) => ({
        caseId: c.id,
        timestamp: h.timestamp || Date.now(),
        type: h.type || 'manual',
        title: h.title || '',
        description: h.description || '',
      })));
    if (historyToImport.length > 0) {
      await casesDB.case_history.bulkAdd(historyToImport);
    }

    const partes = [`${result.added} casos importados`];
    if (actualizados > 0) partes.push(`${actualizados} actualizados`);
    if (result.skipped > 0) partes.push(`${result.skipped} duplicados omitidos`);
    showToast(partes.join(" · "), "success");
    window.dispatchEvent(new Event("storage-update"));
  }, [config.importDuplicados, config.importModoCasos, showToast]);

  const handleImportCases = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = "";

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0) { showToast("CSV vacío o inválido", "error"); return; }

        // Mapeo según preferencias (Avanzado > Importación).
        const mapeo = config.importAutoMapeo || "auto";
        let detected;
        if (mapeo === "manual") {
          detected = headers.map((header) => ({ header, field: null }));
        } else if (mapeo === "template") {
          let template = [];
          try { template = JSON.parse(localStorage.getItem(MAPPING_TEMPLATE_LOCAL_KEY) || "[]"); } catch { template = []; }
          detected = Array.isArray(template) && template.length > 0
            ? headers.map((header) => {
                const saved = template.find((t) => t.header === header);
                return { header, field: saved ? saved.field : null };
              })
            : detectFieldMappings(headers);
        } else {
          detected = detectFieldMappings(headers);
        }

        setCsvPreview({ headers, rows, rawText: text });
        setImportMapping(detected);
        setPreviewPage(1);

        // Sin preview (y mapeo no manual): importar directo con la estrategia configurada.
        if (config.importMostrarPreview === false && mapeo !== "manual") {
          const cases = rows.map((row) => mapRowToCase(row, detected));
          await ejecutarImportCasos(cases);
          setCsvPreview({ headers: [], rows: [], rawText: "" });
          setImportMapping([]);
          return;
        }

        setShowImportPreview(true);
      } catch (err) {
        showToast("Error al leer el archivo", "error");
      }
    };
    reader.onerror = () => showToast("Error al leer el archivo", "error");
    reader.readAsText(file);
  }, [showToast, config.importAutoMapeo, config.importMostrarPreview, ejecutarImportCasos]);

  const handleImportMappingChange = useCallback((index, field) => {
    setImportMapping(prev => {
      const next = [...prev];
      const oldField = next[index].field;
      if (oldField) {
        const conflictIdx = next.findIndex((m, i) => i !== index && m.field === field);
        if (conflictIdx >= 0) next[conflictIdx] = { ...next[conflictIdx], field: null };
      }
      next[index] = { ...next[index], field };
      return next;
    });
  }, []);

  const moveImportColumn = useCallback((fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= csvPreview.headers.length) return;
    setCsvPreview(prev => {
      const newHeaders = [...prev.headers];
      const newRows = prev.rows.map(r => [...r]);
      [newHeaders[fromIdx], newHeaders[toIdx]] = [newHeaders[toIdx], newHeaders[fromIdx]];
      newRows.forEach(r => { [r[fromIdx], r[toIdx]] = [r[toIdx], r[fromIdx]]; });
      return { ...prev, headers: newHeaders, rows: newRows };
    });
    setImportMapping(prev => {
      const next = [...prev];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      return next;
    });
  }, [csvPreview.headers.length]);

  const PREVIEW_PAGE_SIZE = 50;
  const totalPreviewPages = Math.max(
    1,
    Math.ceil(csvPreview.rows.length / PREVIEW_PAGE_SIZE)
  );

  useEffect(() => {
    if (previewPage > totalPreviewPages) setPreviewPage(totalPreviewPages);
  }, [totalPreviewPages, previewPage]);

  const safePreviewPage = Math.min(previewPage, totalPreviewPages);
  const previewStart = (safePreviewPage - 1) * PREVIEW_PAGE_SIZE;
  const previewRows = csvPreview.rows.slice(
    previewStart,
    previewStart + PREVIEW_PAGE_SIZE
  );

  const utilesKeys = utilesPreviewData?.keys || [];
  const utilesTotalPages = Math.max(
    1,
    Math.ceil(utilesKeys.length / PREVIEW_PAGE_SIZE)
  );

  useEffect(() => {
    if (utilesPage > utilesTotalPages) setUtilesPage(utilesTotalPages);
  }, [utilesTotalPages, utilesPage]);

  const safeUtilesPage = Math.min(utilesPage, utilesTotalPages);
  const utilesStart = (safeUtilesPage - 1) * PREVIEW_PAGE_SIZE;
  const utilesPageKeys = utilesKeys.slice(
    utilesStart,
    utilesStart + PREVIEW_PAGE_SIZE
  );

  const handlePreviewImport = useCallback(async () => {
    setLoading(true);
    try {
      const cases = csvPreview.rows.map(row => mapRowToCase(row, importMapping));
      await ejecutarImportCasos(cases, previewEstrategia);
      setShowImportPreview(false);
      setCsvPreview({ headers: [], rows: [], rawText: "" });
      setImportMapping([]);
    } catch (err) {
      showToast("Error al importar", "error");
    } finally {
      setLoading(false);
    }
  }, [csvPreview, importMapping, ejecutarImportCasos, previewEstrategia, showToast]);

  // ============ MANEJAR SELECCIÓN MÚLTIPLE DE MESES ============
  const toggleMonthSelection = (monthKey) => {
    setSelectedMonths((prev) => {
      if (prev.includes(monthKey)) {
        return prev.filter((m) => m !== monthKey);
      } else {
        return [...prev, monthKey];
      }
    });
  };

  const selectAllMonths = () => {
    setSelectedMonths(mesesDisponibles);
  };

  const clearMonths = () => {
    setSelectedMonths([]);
  };

  // ============ EXPORTAR CONFIGURACIÓN ============
  const handleExportConfig = async () => {
    try {
      setLoading(true);
      const data = await exportConfigToJSON();
      const blob = new Blob([data], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `configuracion_derivaciones_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast("Configuración exportada", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ============ IMPORTAR CONFIGURACIÓN ============
  const handleImportConfig = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = "";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);
        if (!data.configuracion || typeof data.configuracion !== 'object') {
          showToast("Archivo de configuración inválido: falta 'configuracion'", "error");
          return;
        }
        const keys = Object.keys(data.configuracion);
        if (keys.length === 0) {
          showToast("No hay datos de configuración para importar", "error");
          return;
        }
        setUtilesPreviewData({ raw: content, keys, config: data.configuracion, version: data.version, fecha: data.fechaExportacion });
        setUtilesPage(1);
        setShowUtilesPreview(true);
      } catch (err) {
        showToast("Error al leer el archivo JSON", "error");
      }
    };
    reader.onerror = () => showToast("Error al leer el archivo", "error");
    reader.readAsText(file);
  };

  const handleUtilesPreviewImport = useCallback(async () => {
    if (!utilesPreviewData) return;
    setLoading(true);
    try {
      const result = await importConfigFromJSON(utilesPreviewData.raw, {
        categorias: config.importUtilesCategorias || {},
      });
      if (result.success) {
        showToast("Configuración importada correctamente (" + result.count + " elementos)", "success");
        sessionStorage.setItem("import-complete", "true");
        setTimeout(() => window.location.reload(), 500);
      } else {
        showToast(result.error, "error");
      }
    } catch (err) {
      showToast("Error al importar configuración", "error");
    } finally {
      setLoading(false);
      setShowUtilesPreview(false);
      setUtilesPreviewData(null);
    }
  }, [utilesPreviewData, showToast, config.importUtilesCategorias]);

  // ============ EXPORTAR NOTAS Y CALENDARIO ============
  const [importNcStats, setImportNcStats] = useState(null);
  const ncFileInputRef = useRef(null);

  const handleExportNotesCalendar = async () => {
    try {
      setLoading(true);
      const { exportNotesCalendarToJSON } = await import('../../utils/backup/notesCalendarExport');
      const data = await exportNotesCalendarToJSON();
      const blob = new Blob([data], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notas_calendario_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Notas y calendario exportados', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportNotesCalendar = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);
        if (!data.notes || !data.events) {
          showToast('Formato inválido: se requieren notes y events', 'error');
          return;
        }
        setNcPreviewData({ raw: content, notes: data.notes, events: data.events });
        setShowNcPreview(true);
      } catch (err) {
        showToast('Error al leer el archivo JSON', 'error');
      }
    };
    reader.onerror = () => showToast('Error al leer el archivo', 'error');
    reader.readAsText(file);
  };

  const handleNcPreviewImport = useCallback(async () => {
    if (!ncPreviewData) return;
    setLoading(true);
    try {
      const { importNotesCalendarFromJSON } = await import('../../utils/backup/notesCalendarExport');
      const result = await importNotesCalendarFromJSON(ncPreviewData.raw, {
        incluirNotas: config.importNcNotas !== false,
        incluirEventos: config.importNcEventos !== false,
        duplicados: config.importNcDuplicados || "actualizar",
      });
      if (result.success) {
        setImportNcStats(result);
        showToast(`Importados: ${result.notesCount} notas, ${result.eventsCount} eventos`, 'success');
      } else {
        showToast(result.error || 'Error al importar', 'error');
      }
      window.dispatchEvent(new Event('storage-update'));
    } catch (err) {
      showToast('Error al importar', 'error');
    } finally {
      setLoading(false);
      setShowNcPreview(false);
      setNcPreviewData(null);
    }
  }, [ncPreviewData, showToast, config.importNcNotas, config.importNcEventos, config.importNcDuplicados]);

  // ============ BACKUP COMPLETO (IndexedDB + configuración) ============
  const handleExportFullBackup = async () => {
    setLoading(true);
    try {
      const result = await backupService.downloadBackup();
      setBackupStats({ name: result.name, sizeKB: result.sizeKB, at: new Date() });
      showToast(`Backup completo exportado (${result.sizeKB} KB)`, "success");
    } catch (err) {
      showToast(err.message || "Error al exportar backup", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackupFile = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setChecksumMismatch(false);
        const { backup, error, checksumMismatch: mismatch } =
          await backupService.parseBackupJSON(e.target.result);
        if (mismatch) {
          setPendingRestore(backup);
          setChecksumMismatch(true);
          showToast(
            "El checksum no coincide: el archivo pudo haber sido alterado. Podés importarlo igualmente desde la confirmación.",
            "warning",
            6000
          );
          return;
        }
        if (error || !backup) {
          showToast(error || "Backup inválido", "error");
          return;
        }
        const { needsMigration } = await import("../../utils/backup/backupMigrator");
        if (needsMigration(backup)) {
          showToast("Backup de versión anterior detectado. Se actualizará automáticamente al importar.", "info");
        }
        setPendingRestore(backup);
      } catch (err) {
        showToast(err.message || "Error al leer el archivo", "error");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setLoading(false);
      showToast("Error al leer el archivo", "error");
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async (forzarVaciado = false) => {
    if (!pendingRestore) return;
    if (restoreConfirmText.trim().toUpperCase() !== "RESTAURAR") {
      showToast("Escribí RESTAURAR para confirmar la restauración", "warning");
      return;
    }
    setLoading(true);
    let retenerPendiente = false;
    try {
      const result = await backupService.importBackup(pendingRestore, {
        casos: config.importRestoreCasos !== false,
        notas: config.importRestoreNotas !== false,
        eventos: config.importRestoreEventos !== false,
        config: config.importRestoreConfig !== false,
        permitirVaciar: forzarVaciado === true,
        omitirChecksum: checksumMismatch === true,
      });
      const partes = [];
      if (result.counts?.cases != null) partes.push(`${result.counts.cases} casos`);
      if (result.counts?.notes != null) partes.push(`${result.counts.notes} notas`);
      if (result.counts?.events != null) partes.push(`${result.counts.events} eventos`);
      const detalle = partes.length > 0 ? ` (${partes.join(", ")})` : "";
      let mensaje = `Backup restaurado correctamente${detalle}.`;
      if (result.safeguardId) mensaje += " Se creó una copia de seguridad previa en el Historial.";
      if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        showToast(`${mensaje} Advertencias: ${result.warnings.join(" ")}`, "warning", 6000);
      }
      if (result.migration && result.migration.applied.length > 0) {
        showToast(
          `Backup actualizado desde versión anterior (${result.migration.applied.map(m => `${m.from}→${m.to}`).join(', ')}). Restaurado correctamente. Recargando...`,
          "success"
        );
      } else {
        showToast(`${mensaje} Recargando...`, "success");
      }
      sessionStorage.setItem("import-complete", "true");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const msg = err.message || "Error al restaurar backup";
      if (/bloqueada por integridad/i.test(msg)) {
        setBloqueoVaciado({ mensaje: msg });
        retenerPendiente = true;
      } else {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
      if (!retenerPendiente) {
        setPendingRestore(null);
        setRestoreConfirmText("");
        setChecksumMismatch(false);
      }
    }
  };

  const handleCancelRestore = () => {
    setPendingRestore(null);
    setRestoreConfirmText("");
    setBloqueoVaciado(null);
    setChecksumMismatch(false);
  };

  // ============ ELIMINAR ÚTILES ============
  const handleEliminarUtiles = () => {
    if (!confirmDeleteUtiles) {
      setConfirmDeleteUtiles(true);
      return;
    }
    setConfirmDeleteUtiles(false);

    localStorageAdapter.set("pasos-art-tracker", []);
    localStorageAdapter.set("tips-art-tracker", []);
    localStorageAdapter.set("links-art-tracker", []);
    localStorageAdapter.set("speechs-art-tracker", []);
    localStorageAdapter.set("speechs-interactivos-art-tracker", []);
    localStorageAdapter.set("objeciones-art-tracker", []);
    localStorageAdapter.set("art-art-tracker", []);
    localStorageAdapter.set("transito-art-tracker", []);
    localStorageAdapter.set("lesiones-art-tracker", {
        "Accidente Laboral": [],
        "Enfermedad Profesional": [],
        "No Viable": [],
    });
    localStorageAdapter.set("mapeo-art-tracker", []);
    localStorageAdapter.set("observaciones-transito-art-tracker", []);
    localStorageAdapter.set("condicionales-art-tracker", []);
    localStorageAdapter.set("transito-seleccion-art-tracker", []);

    setPasos([]);
    setTips([]);
    setLinks([]);
    setSpeechs([]);
    setSpeechsInteractivos([]);
    setObjeciones([]);
    setArt([]);
    setTransito([]);
    setLesiones({
      "Accidente Laboral": [],
      "Enfermedad Profesional": [],
      "No Viable": [],
    });
    setMapeo([]);
    setObservacionesTransito([]);
    setCondicionales([]);

    showToast("Útiles eliminados correctamente", "info");
  };

  // ============ ELIMINAR CASOS ============
  const handleEliminarCasos = useCallback(async () => {
    if (selectedMonths.length === 0) {
      showToast("Selecciona uno o más meses para eliminar", "warning");
      return;
    }
    if (!confirmDeleteCases) {
      setConfirmDeleteCases(true);
      return;
    }
    try {
      const { default: casesDB } = await import('../../core/db/casesDB');
      const allCases = await casesDB.cases.toArray();
      const monthObjects = selectedMonths.map((m) => {
        const [year, month] = m.split("-").map(Number);
        return { year, month: month - 1 };
      });
      const toDelete = allCases.filter((c) =>
        monthObjects.some(({ year, month }) => isSameMonth(c.fecha, month, year))
      );
      const ids = toDelete.map((c) => c.id).filter(Boolean);
      if (ids.length > 0) await casesDB.cases.bulkDelete(ids);
      const remaining = allCases.filter((c) => !ids.includes(c.id));
      setCasos(remaining);
      soundSystem.playAction("delete");
      showToast(`${ids.length} casos eliminados correctamente`, "info");
      window.dispatchEvent(new Event("storage-update"));
    } catch (err) {
      showToast("Error al eliminar casos", "error");
    }
    setConfirmDeleteCases(false);
  }, [selectedMonths, confirmDeleteCases, showToast, setCasos]);

  // ============ ELIMINAR NOTAS ============
  const handleDeleteNotes = useCallback(async () => {
    if (!confirmDeleteNotes) {
      setConfirmDeleteNotes(true);
      return;
    }
    try {
      await appDB.notes.clear();
      useAppStore.getState().loadNotes();
      soundSystem.playAction("delete");
      showToast("Todas las notas eliminadas", "info");
    } catch (err) {
      showToast("Error al eliminar notas", "error");
    }
    setConfirmDeleteNotes(false);
  }, [confirmDeleteNotes, showToast]);

  // ============ ELIMINAR EVENTOS ============
  const handleDeleteEvents = useCallback(async () => {
    if (!confirmDeleteEvents) {
      setConfirmDeleteEvents(true);
      return;
    }
    try {
      await appDB.events.clear();
      useAppStore.getState().loadEvents();
      soundSystem.playAction("delete");
      showToast("Todos los eventos eliminados", "info");
    } catch (err) {
      showToast("Error al eliminar eventos", "error");
    }
    setConfirmDeleteEvents(false);
  }, [confirmDeleteEvents, showToast]);

  // ============ ELIMINAR TODOS ============
  const handleEliminarTodos = () => {
    if (!confirmEliminar) {
      setConfirmEliminar(true);
      return;
    }
    if (!confirmFinal) {
      setConfirmFinal(true);
      return;
    }
    if (deleteKeyword !== "ELIMINAR") return;

    setConfirmEliminar(false);
    setConfirmFinal(false);
    setDeleteKeyword("");
    soundSystem.playAction("delete");
    onEliminarTodos();
  };

  const [prodSettings, setProdSettings] = useState(() => getProductivitySettings());
  // v1.9.6 (fix metas): el valor inicial viene de la fuente canónica
  // (userOperatorGoals) en lugar de la clave legacy userProductivitySettings.
  const [dailyTarget, setDailyTargetState] = useState(
    () => getOperatorGoals().daily.cases.target || getProductivitySettings().caseTarget || 5
  );
  const [operatorSettings, setOperatorSettings] = useState(() => getOperatorSettings());

  // v1.9.6 (fix metas): si la meta cambia desde Mi Espacio (misma pestaña),
  // este input se refresca; sin esto mostraba el valor viejo hasta remontar.
  useEffect(
    () =>
      subscribeOperatorGoals(() =>
        setDailyTargetState(getOperatorGoals().daily.cases.target || 5)
      ),
    []
  );

  const updateProdSetting = (key, val) => {
    const updated = saveProductivitySettings({ [key]: val });
    setProdSettings(updated);
    showToast("Configuración de productividad actualizada", "success");
  };

  const handleTargetChange = (val) => {
    const num = Number(val) || 5;
    // v1.9.6 (fix metas): setDailyTarget escribe ahora en userOperatorGoals
    // (fuente canónica) y notifica a los suscriptores; se eliminó la llamada
    // duplicada que había (se invocaba dos veces por cada guardado).
    setDailyTarget(num);
    setDailyTargetState(num);
    showToast("Meta diaria actualizada", "success");
  };

  const updateOperatorSetting = (key, val) => {
    const updated = saveOperatorSettings({ [key]: val });
    setOperatorSettings(updated);
    showToast("Preferencias de Mi Espacio actualizadas", "success");
  };

  // ============ RENDER SECCIONES ============
  const renderSeccion = () => {
    switch (seccion) {
      case "productividad":
        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title">Productividad Personal</div>
              <div className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Herramientas orientadas a optimizar tu flujo de trabajo diario, memoria operativa y objetivos.
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Memoria operativa</div>
                    <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Registra últimos casos vistos y botón "Continuar donde lo dejaste".</div>
                  </div>
                  <Toggle
                    checked={prodSettings.memoryEnabled}
                    onChange={(v) => updateProdSetting("memoryEnabled", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Sugerencias inteligentes</div>
                    <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Sugerencias basadas en patrones (casos estancados, filtros frecuentes).</div>
                  </div>
                  <Toggle
                    checked={prodSettings.suggestionsEnabled}
                    onChange={(v) => updateProdSetting("suggestionsEnabled", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Objetivos personales</div>
                    <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Barra de progreso de meta diaria de casos movidos.</div>
                  </div>
                  <Toggle
                    checked={prodSettings.goalsEnabled}
                    onChange={(v) => updateProdSetting("goalsEnabled", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Micro-analítica</div>
                    <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Estadísticas de movimientos y cambios de estado diarios.</div>
                  </div>
                  <Toggle
                    checked={prodSettings.analyticsEnabled}
                    onChange={(v) => updateProdSetting("analyticsEnabled", v)}
                  />
                </div>
<div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Micro-interacciones</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Animaciones fluidas y feedback visual en acciones.</div>
                    </div>
                    <Toggle
                      checked={prodSettings.interactionsEnabled}
                      onChange={(v) => updateProdSetting("interactionsEnabled", v)}
                    />
                  </div>
                </div>
              </div>

              <div className="config-section mt-4">
                <div className="config-section-title">Mi Espacio (personal)</div>
                <div className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                  Centro personal del operador: jornada, disponibilidad, metas y accesos. Todo se guarda localmente en este dispositivo.
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Mostrar resumen de jornada</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Muestra el estado de la jornada y las metas del día en Mi Espacio.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.showDaySummary !== false}
                      onChange={(v) => updateOperatorSetting("showDaySummary", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Mostrar ritmo necesario</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Calcula cuántos casos/reportes por día se necesitan para alcanzar la meta mensual.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.showPace !== false}
                      onChange={(v) => updateOperatorSetting("showPace", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Mostrar disponibilidad en calendario</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Marca vacaciones, feriados, inasistencias y días no laborables en el calendario.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.showAvailabilityInCalendar !== false}
                      onChange={(v) => updateOperatorSetting("showAvailabilityInCalendar", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Recordatorios de jornada</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Avisos discretos sobre el fin de jornada habitual.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.jornadaReminders !== false}
                      onChange={(v) => updateOperatorSetting("jornadaReminders", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Recordatorios de metas</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Avisos cuando falta poco para cumplir la meta diaria o mensual.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.goalReminders !== false}
                      onChange={(v) => updateOperatorSetting("goalReminders", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Microinteracciones de objetivos</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Feedback visual discreto al completar una meta.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.goalMicroInteractions !== false}
                      onChange={(v) => updateOperatorSetting("goalMicroInteractions", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Sugerencias inteligentes personales</div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Sugerencias basadas en tu jornada, disponibilidad y metas.</div>
                    </div>
                    <Toggle
                      checked={operatorSettings.personalSuggestions !== false}
                      onChange={(v) => updateOperatorSetting("personalSuggestions", v)}
                    />
                  </div>
                </div>
              </div>

            <div className="config-section">
              <div className="config-section-title">Meta Diaria de Casos</div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Casos a cargar por día:
                </span>
                <TextInput
                  type="number"
                  value={dailyTarget}
                  onChange={(e) => setDailyTargetState(e.target.value)}
                  style={{ width: 100 }}
                />
                <Btn size="sm" onClick={() => handleTargetChange(dailyTarget)}>
                  Guardar Meta
                </Btn>
              </div>
              <div className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                {/* v1.9.6 (fix metas): la meta de reportes ya no se calcula
                    sola; es la misma meta editable de Mi Espacio → Metas. */}
                Esta meta se sincroniza con Mi Espacio → Metas (misma fuente que
                usa el Dashboard). Las metas de reportes y firmas se configuran
                directamente en Mi Espacio → Metas.
              </div>
            </div>
          </div>
        );
      case "general":
        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title">Preferencias</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="text-xs block mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Formato de fecha
                  </label>
                  <Select
                    value={config.formatoFecha || "DD/MM/YYYY"}
                    onChange={(e) =>
                      actualizarConfig("formatoFecha", e.target.value)
                    }
                    options={FORMATOS_FECHA}
                  />
                </div>
                <div>
                  <label
                    className="text-xs block mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Formato de teléfono
                  </label>
                  <Select
                    value={config.telefonoFormato || "argentina"}
                    onChange={(e) =>
                      actualizarConfig("telefonoFormato", e.target.value)
                    }
                    options={FORMATOS_TELEFONO}
                  />
                </div>
                <div>
                  <label
                    className="text-xs block mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Idioma
                  </label>
                  <Select
                    value={["es", "en"].includes(config.idioma) ? config.idioma : "es"}
                    onChange={(e) =>
                      actualizarConfig("idioma", e.target.value)
                    }
                    options={[
                      { value: "es", label: "Español" },
                      { value: "en", label: "English" },
                    ]}
                  />
                </div>
                <div>
                  <label
                    className="text-xs block mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Casos por página
                  </label>
                  <Select
                    value={config.casosPorPagina || 50}
                    onChange={(e) =>
                      actualizarConfig(
                        "casosPorPagina",
                        parseInt(e.target.value)
                      )
                    }
                    options={OPCIONES_CASOS_POR_PAGINA}
                  />
                </div>
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title">
                Sonidos y Notificaciones
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <Toggle
                  checked={config.notifSonido || false}
                  onChange={(v) => actualizarConfig("notifSonido", v)}
                  label="Activar sonidos de notificaciones"
                />
                <Toggle
                  checked={config.modoNoMolestar || false}
                  onChange={(v) => actualizarConfig("modoNoMolestar", v)}
                  label="Modo No Molestar por defecto"
                />
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Search size={14} color="var(--color-accent)" />
                Preferencias de búsqueda
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Filtro por defecto</label>
                <Select
                  value={config.busquedaFiltro || "todos"}
                  onChange={(e) => actualizarConfig("busquedaFiltro", e.target.value)}
                  options={[
                    { value: "todos", label: "Todos los casos" },
                    { value: "activos", label: "Solo activos" },
                    { value: "pendientes", label: "Solo pendientes" },
                    { value: "hoy", label: "Solo de hoy" },
                  ]}
                />
              </div>
              <div>
                <Toggle
                  checked={config.busquedaHistorial !== false}
                  onChange={(v) => actualizarConfig("busquedaHistorial", v)}
                  label="Guardar historial de búsqueda"
                />
              </div>
            </div>
          </div>

          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <ArrowUpDown size={14} color="var(--color-accent)" />
              Preferencias de navegación
            </div>
            <div className="flex flex-wrap gap-4">
              <Toggle checked={config.animaciones !== false} onChange={(v) => actualizarConfig("animaciones", v)} label="Animaciones UI" />
              <Toggle checked={config.atajosTeclado !== false} onChange={(v) => actualizarConfig("atajosTeclado", v)} label="Atajos de teclado" />
              <Toggle checked={config.confirmaciones || false} onChange={(v) => actualizarConfig("confirmaciones", v)} label="Confirmaciones antes de acciones" />
            </div>
          </div>

          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <Mail size={14} color="var(--color-accent)" />
              Sugerencias y Feedback
            </div>
            <div className="text-xs space-y-2" style={{ color: "var(--color-text-muted)" }}>
              <p>¿Tenés una sugerencia o encontraste un error? Envianos tu feedback directamente por correo.</p>
              <div className="flex items-center gap-2 mt-2">
                <Btn onClick={() => { window.location.href = `mailto:yoelcallcenter@gmail.com?subject=${encodeURIComponent("[Feedback] " + (config.operador || "Usuario"))}&body=${encodeURIComponent("Escribe tu mensaje aqui...")}`; }} icon={Mail} size="sm" color="var(--color-accent)">Enviar sugerencia</Btn>
                <BtnOutline onClick={async () => { const ok = await copyToClipboard("yoelcallcenter@gmail.com"); showToast(ok ? "Email copiado al portapapeles" : "No se pudo copiar el email", ok ? "success" : "error"); }} size="sm">Copiar email</BtnOutline>
              </div>
            </div>
          </div>

          <HelpSection />
        </div>
        );

      case "apariencia":
        return <PersonalizacionColores showToast={showToast} config={config} />;

      case "tipografia":
        return <TipografiaView showToast={showToast} />;

      case "notificaciones":
        return (
          <div className="space-y-4">
              <div className="config-section">
                <div className="config-section-title flex items-center gap-2">
                  <Bell size={14} color="var(--color-accent)" />
                  Canales de notificación
                </div>
                <div className="flex flex-wrap gap-4">
                  <Toggle checked={config.notifInApp !== false} onChange={(v) => actualizarConfig("notifInApp", v)} label="In-App (toasts)" />
                  <Toggle checked={config.notifSonido || false} onChange={(v) => actualizarConfig("notifSonido", v)} label="Sonido" />
                </div>
                <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                  Las notificaciones se muestran como toasts dentro de la aplicación.
                  No se utilizan notificaciones del navegador.
                </p>
              </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Tag size={14} color="var(--color-accent)" />
                Nivel mínimo para mostrar toast
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Mostrar toast desde:</span>
                <Select
                  value={config.notifMinToastPriority || "none"}
                  onChange={(e) => actualizarConfig("notifMinToastPriority", e.target.value)}
                  options={[
                    { value: "none", label: "Todas" },
                    { value: "media", label: "Media y grave" },
                    { value: "grave", label: "Solo grave" },
                  ]}
                  style={{ width: 180 }}
                />
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Las notificaciones de nivel bajo siempre se registran en el Centro de Notificaciones.
              </p>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Tag size={14} color="var(--color-accent)" />
                Sonido por nivel de prioridad
              </div>
              <div className="flex flex-wrap gap-4">
                <Toggle checked={config.notifGraveSound !== false} onChange={(v) => actualizarConfig("notifGraveSound", v)} label="Grave" />
                <Toggle checked={config.notifMediaSound === true} onChange={(v) => actualizarConfig("notifMediaSound", v)} label="Media" />
                <Toggle checked={config.notifBajaSound === true} onChange={(v) => actualizarConfig("notifBajaSound", v)} label="Baja" />
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Cada nivel tiene su propio interruptor de sonido. El interruptor general "Sonido" debe estar activado.
              </p>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Tag size={14} color="var(--color-accent)" />
                Notificar por tipo
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "notifCambioEstado", label: "Cambio de estado" },
                  { key: "notifReporte", label: "Reporte cargado" },
                  { key: "notifEvento", label: "Evento próximo" },
                  { key: "notifBackup", label: "Backup realizado" },
                  { key: "notifError", label: "Errores del sistema" },
                ].map(({ key, label }) => (
                  <Toggle key={key} checked={config[key] !== false} onChange={(v) => actualizarConfig(key, v)} label={label} />
                ))}
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Clock size={14} color="var(--color-accent)" />
                Frecuencia
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Agrupar notificaciones cada:</span>
                <Select
                  value={config.notifFrecuencia || "tiempo-real"}
                  onChange={(e) => actualizarConfig("notifFrecuencia", e.target.value)}
                  options={[
                    { value: "tiempo-real", label: "Tiempo real" },
                    { value: "5min", label: "5 minutos" },
                    { value: "15min", label: "15 minutos" },
                    { value: "30min", label: "30 minutos" },
                    { value: "1h", label: "1 hora" },
                  ]}
                  style={{ width: 180 }}
                />
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title">Niveles de prioridad</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p><strong>Grave:</strong> Se registra, muestra toast y reproduce sonido (si está activado).</p>
                <p><strong>Media:</strong> Se registra y muestra toast. No reproduce sonido por defecto.</p>
                <p><strong>Baja:</strong> Solo se registra en el Centro de Notificaciones. No muestra toast ni sonido.</p>
              </div>
            </div>
          </div>
        );
      case "dashboard-config":
        const metricDefs = getMetricDefs();
        const metricsConfig = config.metrics || {};
        const cats = metricsConfig.categorias || getDefaultCategories();
        const visibleMetrics = metricsConfig.visible || Object.keys(metricDefs);
        const alertasConfig = metricsConfig.alertas || getDefaultAlerts();

        const toggleMetric = (id) => {
          const next = visibleMetrics.includes(id)
            ? visibleMetrics.filter((m) => m !== id)
            : [...visibleMetrics, id];
          actualizarConfig("metrics", { ...metricsConfig, visible: next });
        };

        const updateCategoria = (cat, oldEstado, newEstado) => {
          const next = { ...cats };
          for (const k of Object.keys(next)) {
            next[k] = next[k].filter((e) => e !== oldEstado);
          }
          if (newEstado && !next[cat].includes(newEstado)) {
            next[cat] = [...next[cat], newEstado];
          }
          actualizarConfig("metrics", { ...metricsConfig, categorias: next });
        };

        const updateAlerta = (id, field, value) => {
          const next = {
            ...alertasConfig,
            [id]: { ...alertasConfig[id], [field]: value },
          };
          actualizarConfig("metrics", { ...metricsConfig, alertas: next });
        };

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Eye size={14} color="var(--color-accent)" />
                Métricas visibles
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(metricDefs).map((m) => (
                  <Toggle key={m.id} checked={visibleMetrics.includes(m.id)} onChange={() => toggleMetric(m.id)} label={m.label} />
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <LayoutDashboard size={14} color="var(--color-accent)" />
                Widgets del Dashboard
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "widgetFunnel", label: "Funnel de conversión" },
                  { key: "widgetActividad", label: "Actividad (7 días)" },
                  { key: "widgetQuickActions", label: "Acciones rápidas" },
                  { key: "widgetEventos", label: "Próximos eventos" },
                  { key: "widgetSinReporte", label: "Casos sin reporte" },
                  { key: "widgetNotas", label: "Notas recientes" },
                  { key: "widgetResumen", label: "Resumen rápido" },
                  { key: "widgetUltimosCasos", label: "Últimos casos" },
                  { key: "widgetMiDia", label: "Mi día" },
                  { key: "widgetLogroObjetivos", label: "Logro de Objetivos" },
                  { key: "widgetVistaMapa", label: "Mapa de casos" },
                  { key: "insightEnJornada", label: "Insight destacado en el 'Hoy'" },
                ].map(({ key, label }) => (
                  <Toggle key={key} checked={config[key] !== false} onChange={(v) => actualizarConfig(key, v)} label={label} />
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Tag size={14} color="var(--color-accent)" />
                Categorías de estado
              </div>
              <div className="space-y-3">
                {Object.entries(cats).map(([cat, estados]) => (
                  <div key={cat}>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                      {cat === 'success' ? 'Éxito' : cat === 'lost' ? 'Pérdida' : cat === 'contact' ? 'Contacto' : 'Pendientes'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getEstados(config).map((e) => {
                        const isActive = estados.includes(e.v);
                        return (
                          <button key={e.v} onClick={() => updateCategoria(cat, isActive ? e.v : null, isActive ? null : e.v)}
                            className="pill-md transition-colors"
                            style={{ backgroundColor: isActive ? `${e.accent}33` : 'var(--color-surface)', color: isActive ? e.accent : 'var(--color-text-muted)', border: `1px solid ${isActive ? e.accent : 'var(--color-border)'}` }}>
                            {e.v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Bell size={14} color="var(--color-accent)" />
                Reglas de alerta
              </div>
              <div className="space-y-2">
                {Object.entries(alertasConfig).map(([id, cfg]) => (
                  <div key={id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
                    <Toggle checked={cfg.active} onChange={(v) => updateAlerta(id, 'active', v)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{cfg.label}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Límite:</span>
                        <input type="number" value={cfg.threshold}
                          onChange={(e) => updateAlerta(id, 'threshold', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                          disabled={!cfg.active} />
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{id === 'casosSinReporte' ? 'casos' : '%'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "dashboard":
        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <LayoutDashboard size={14} color="var(--color-accent)" />
                Dashboard — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las pestañas del Dashboard
              </div>
              <DashboardTabOrderEditor />
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.75rem 0' }} />

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Sun size={14} color="var(--color-accent)" />
                Mi Espacio — secciones del "Hoy"
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar los bloques del centro de trabajo diario
              </div>
              <MiEspacioOrderEditor />
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.75rem 0' }} />

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <LayoutGrid size={14} color="var(--color-accent)" />
                Tablero (Kanban) — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las secciones del tablero Kanban
              </div>
              <ViewSectionEditor items={kanbanSections} setItems={setKanbanSections} labels={{ pipelineBar: 'Barra de distribución', columnas: 'Columnas del tablero' }} iconMap={TABLERO_ICONS} />
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Table2 size={14} color="var(--color-accent)" />
                Tabla — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las secciones de la vista de tabla
              </div>
              <ViewSectionEditor items={tablaSections} setItems={setTablaSections} labels={{ pipelineBar: 'Barra de distribución', tabla: 'Tabla de casos', paginacion: 'Paginación' }} iconMap={TABLA_ICONS} />
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <ClipboardList size={14} color="var(--color-accent)" />
                Reportes — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las secciones de la vista de reportes
              </div>
              <ViewSectionEditor items={reportesSections} setItems={setReportesSections} labels={{ pipelineBar: 'Barra de distribución', lista: 'Lista de reportes', paginacion: 'Paginación' }} iconMap={REPORTES_ICONS} />
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Wrench size={14} color="var(--color-accent)" />
                Útiles — orden de pestañas
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las pestañas internas de la vista Útiles
              </div>
              <ViewSectionEditor items={utilesTabOrder} setItems={setUtilesTabOrder} labels={{
                speechs: 'Speechs', objeciones: 'Objeciones',
                conversacion: 'Conversación Sugerida', pasos: 'Pasos a Seguir',
                aseguradoras: 'Aseguradoras', mapeo: 'Estudios Jurídicos',
                lesiones: 'Lesiones', transito: 'Tránsito', prolegal: 'Prolegal',
                condicionales: 'Condicionales', plantillas: 'Plantillas',
              }} iconMap={UTILES_ICONS} />
            </div>
          </div>
        );

      case "busqueda":
        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Search size={14} color="var(--color-accent)" />
                Configuración de búsqueda
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Campos a indexar</label>
                  <div className="space-y-1">
                    {[
                      { key: "idxNombre", label: "Nombre" },
                      { key: "idxTelefono", label: "Teléfono" },
                      { key: "idxLocalidad", label: "Localidad" },
                      { key: "idxAseguradora", label: "Aseguradora" },
                      { key: "idxObservaciones", label: "Observaciones" },
                    ].map(({ key, label }) => (
                      <Toggle key={key} checked={config[key] !== false} onChange={(v) => actualizarConfig(key, v)} label={label} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Historial</label>
                  <Toggle checked={config.busquedaHistorial !== false} onChange={(v) => actualizarConfig("busquedaHistorial", v)} label="Guardar historial" />
                  <div className="mt-2">
                    <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Máx. histórico</label>
                    <Select
                      value={config.busquedaMaxHistorial || 50}
                      onChange={(e) => actualizarConfig("busquedaMaxHistorial", parseInt(e.target.value))}
                      options={[
                        { value: 10, label: "10" },
                        { value: 25, label: "25" },
                        { value: 50, label: "50" },
                        { value: 100, label: "100" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Indexá los campos que más usás en las búsquedas diarias para mejores resultados.</p>
                <p>• Ajustá el máximo histórico para liberar espacio en navegadores con límites de almacenamiento.</p>
                <p>• Si no encontrás un caso, verificá que los campos necesarios estén indexados.</p>
              </div>
            </div>
          </div>
        );

      case "importacion": {
        const importHabilitar = config.importHabilitar || {};
        const importHabilitado = (k) => importHabilitar[k] !== false;
        const toggleHabilitado = (k, v) =>
          actualizarConfig("importHabilitar", { ...importHabilitar, [k]: v });

        const ELEMENTOS_IMPORTABLES = [
          { key: "casosCsv", label: "Casos (CSV)", desc: "Importación de casos desde archivos CSV (botón en General > Datos)." },
          { key: "utilesJson", label: "Útiles (JSON)", desc: "Pasos, tips, links, speechs, objeciones y demás útiles exportados." },
          { key: "notasCalendarioJson", label: "Notas y Calendario (JSON)", desc: "Notas personales y eventos del calendario de citas." },
          { key: "backupCompleto", label: "Backup completo (JSON)", desc: "Restauración total con casos, notas, eventos y configuración." },
        ];

        const UTILES_CATEGORIAS = [
          { key: "config", label: "Configuración general" },
          { key: "pasos", label: "Pasos a seguir" },
          { key: "tips", label: "Tips" },
          { key: "links", label: "Links útiles" },
          { key: "speechs", label: "Speechs" },
          { key: "speechs-interactivos", label: "Speechs interactivos" },
          { key: "objeciones", label: "Objeciones" },
          { key: "art", label: "Aseguradoras (ART)" },
          { key: "transito", label: "Tránsito" },
          { key: "lesiones", label: "Lesiones" },
          { key: "mapeo", label: "Estudios jurídicos" },
          { key: "observacionesTransito", label: "Observaciones de tránsito" },
          { key: "condicionales", label: "Condicionales" },
          { key: "transitoSeleccion", label: "Selección de píldoras de tránsito" },
          { key: "conversaciones", label: "Conversaciones sugeridas" },
        ];

        const utilesCategorias = config.importUtilesCategorias || {};
        const utilesCatOn = (k) => utilesCategorias[k] !== false;
        const toggleUtilesCat = (k, v) =>
          actualizarConfig("importUtilesCategorias", { ...utilesCategorias, [k]: v });
        const cantUtilesOn = UTILES_CATEGORIAS.filter((c) => utilesCatOn(c.key)).length;

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <FileUp size={14} color="var(--color-accent)" />
                Elementos a importar
              </div>
              <div className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                Elegí qué elementos se pueden importar. Al desactivar uno, su botón de
                importación en General &gt; Datos queda deshabilitado.
              </div>
              <div className="space-y-2">
                {ELEMENTOS_IMPORTABLES.map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start gap-3 p-2 rounded" style={{ backgroundColor: "var(--color-surface2)" }}>
                    <Toggle
                      checked={importHabilitado(key)}
                      onChange={(v) => toggleHabilitado(key, v)}
                    />
                    <div>
                      <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{label}</div>
                      <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Table2 size={14} color="var(--color-accent)" />
                Casos (CSV) — cómo importar
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Mapeo de columnas</label>
                  <Select
                    value={config.importAutoMapeo || "auto"}
                    onChange={(e) => actualizarConfig("importAutoMapeo", e.target.value)}
                    options={[
                      { value: "auto", label: "Automático (detectar)" },
                      { value: "manual", label: "Siempre preguntar" },
                      { value: "template", label: "Usar plantilla guardada" },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Duplicados (mismo nombre y teléfono)</label>
                  <Select
                    value={config.importDuplicados || "omitir"}
                    onChange={(e) => actualizarConfig("importDuplicados", e.target.value)}
                    options={[
                      { value: "preguntar", label: "Preguntar cada vez" },
                      { value: "omitir", label: "Omitir nuevos" },
                      { value: "actualizar", label: "Actualizar existentes" },
                      { value: "duplicar", label: "Crear duplicados" },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Modo de importación</label>
                  <Select
                    value={config.importModoCasos || "agregar"}
                    onChange={(e) => actualizarConfig("importModoCasos", e.target.value)}
                    options={[
                      { value: "agregar", label: "Agregar a los existentes" },
                      { value: "reemplazar-mes", label: "Reemplazar los meses del archivo" },
                    ]}
                  />
                  {config.importModoCasos === "reemplazar-mes" && (
                    <div className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "var(--color-warning)" }}>
                      <AlertTriangle size={10} />
                      Elimina los casos actuales de los meses presentes en el archivo antes de insertar.
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Validaciones</label>
                  <div className="space-y-1">
                    <Toggle checked={config.importValidarDuplicados !== false} onChange={(v) => actualizarConfig("importValidarDuplicados", v)} label="Advertir duplicados en la vista previa" />
                    <Toggle checked={config.importValidarTelefono !== false} onChange={(v) => actualizarConfig("importValidarTelefono", v)} label="Validar teléfono vacío" />
                    <Toggle checked={config.importMostrarPreview !== false} onChange={(v) => actualizarConfig("importMostrarPreview", v)} label="Mostrar preview antes de importar" />
                  </div>
                </div>
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Wrench size={14} color="var(--color-accent)" />
                Útiles (JSON) — categorías a importar
              </div>
              <div className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                Al importar un archivo de útiles, solo se reemplazan las categorías marcadas ({cantUtilesOn} de {UTILES_CATEGORIAS.length}).
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {UTILES_CATEGORIAS.map(({ key, label }) => (
                  <Toggle
                    key={key}
                    checked={utilesCatOn(key)}
                    onChange={(v) => toggleUtilesCat(key, v)}
                    label={label}
                  />
                ))}
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <ClipboardList size={14} color="var(--color-accent)" />
                Notas y Calendario (JSON)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Incluir</label>
                  <div className="space-y-1">
                    <Toggle checked={config.importNcNotas !== false} onChange={(v) => actualizarConfig("importNcNotas", v)} label="Notas" />
                    <Toggle checked={config.importNcEventos !== false} onChange={(v) => actualizarConfig("importNcEventos", v)} label="Eventos del calendario" />
                  </div>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "var(--color-text-muted)" }}>Duplicados (mismo ID)</label>
                  <Select
                    value={config.importNcDuplicados || "actualizar"}
                    onChange={(e) => actualizarConfig("importNcDuplicados", e.target.value)}
                    options={[
                      { value: "actualizar", label: "Actualizar existentes" },
                      { value: "omitir", label: "Omitir nuevos" },
                      { value: "duplicar", label: "Crear duplicados" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Database size={14} color="var(--color-accent)" />
                Backup completo (JSON) — qué restaurar por defecto
              </div>
              <div className="flex flex-wrap gap-4">
                <Toggle checked={config.importRestoreCasos !== false} onChange={(v) => actualizarConfig("importRestoreCasos", v)} label="Casos" />
                <Toggle checked={config.importRestoreNotas !== false} onChange={(v) => actualizarConfig("importRestoreNotas", v)} label="Notas" />
                <Toggle checked={config.importRestoreEventos !== false} onChange={(v) => actualizarConfig("importRestoreEventos", v)} label="Eventos" />
                <Toggle checked={config.importRestoreConfig !== false} onChange={(v) => actualizarConfig("importRestoreConfig", v)} label="Configuración y útiles" />
              </div>
              <div className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                Estas opciones se pueden ajustar también al confirmar cada restauración.
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Usá la vista previa para verificar datos antes de cargarlos.</p>
                <p>• La validación de duplicados evita ingresar casos que ya existen en el sistema.</p>
                <p>• Guardá una plantilla de mapeo si importás CSVs con las mismas columnas habitualmente.</p>
                <p>• Exportá periódicamente un backup de tus datos como respaldo.</p>
              </div>
            </div>
          </div>
        );
      }

      case "ux":
        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Navigation size={14} color="var(--color-accent)" />
                Experiencia de usuario
              </div>
              <div className="space-y-3">
                {[
                  { key: "animaciones", label: "Animaciones y transiciones", desc: "Activa efectos visuales suaves al navegar" },
                  { key: "microinteracciones", label: "Microinteracciones", desc: "Feedback visual al pasar el mouse sobre botones y elementos" },
                  { key: "emptyStates", label: "Estados vacíos ilustrados", desc: "Muestra ilustraciones cuando no hay datos que mostrar" },
                  { key: "skeletonLoader", label: "Skeleton loaders", desc: "Muestra esqueletos de carga mientras se cargan los datos" },
                  { key: "tooltipsMejorados", label: "Tooltips contextuales", desc: "Muestra ayuda emergente al pasar el mouse sobre elementos" },
                  { key: "atajosTeclado", label: "Atajos de teclado", desc: "Habilita navegación rápida con teclado (Ctrl+K, Ctrl+N, etc.)" },
                  { key: "confirmaciones", label: "Confirmaciones antes de acciones", desc: "Pide confirmación antes de eliminar o modificar datos importantes", defaultOn: false },
                  { key: "bajoConsumo", label: "Modo bajo consumo", desc: "Reduce animaciones y efectos para priorizar el rendimiento", defaultOn: false },
                ].map(({ key, label, desc, defaultOn }) => (
                  <div key={key} className="flex items-start gap-3 p-2 rounded" style={{ backgroundColor: "var(--color-surface2)" }}>
                    <Toggle
                      checked={defaultOn === false ? !!config[key] : config[key] !== false}
                      onChange={(v) => actualizarConfig(key, v)}
                    />
                    <div>
                      <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{label}</div>
                      <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Navigation size={14} color="var(--color-accent)" />
                Alineación de pestañas
              </div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Alineación de pestañas">
                {[
                  { value: "izquierda", label: "Izquierda" },
                  { value: "centro", label: "Centro" },
                  { value: "derecha", label: "Derecha" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={(config.alineacionPestanas || "centro") === opt.value}
                    onClick={() => actualizarConfig("alineacionPestanas", opt.value)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 ${
                      (config.alineacionPestanas || "centro") === opt.value
                        ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                        : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                Define cómo se distribuyen las pestañas dentro del espacio disponible.
              </p>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Desactivar animaciones en equipos con recursos limitados mejora el rendimiento.</p>
                <p>• Los atajos de teclado aceleran tareas repetitivas (Ctrl+K para buscar, Ctrl+N para nuevo caso).</p>
                <p>• Activar confirmaciones evita eliminaciones accidentales de datos importantes.</p>
              </div>
            </div>
          </div>
        );

      case "columnas":
        return (
          <div className="config-section">
            <div className="config-section-title">
              Columnas visibles en Tabla
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COLUMNAS_DISPONIBLES.map((col) => (
                <div
                  key={col.key}
                  className="flex items-center p-2 rounded"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Toggle
                    checked={config.columnasVisibles?.[col.key] !== false}
                    onChange={() => toggleColumna(col.key)}
                    label={col.label}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Btn
                size="sm"
                onClick={() => {
                  const todas = {};
                  COLUMNAS_DISPONIBLES.forEach((c) => {
                    todas[c.key] = true;
                  });
                  setConfig({ ...config, columnasVisibles: todas });
                  showToast("Todas las columnas visibles", "success");
                }}
              >
                Mostrar todas
              </Btn>
              <BtnOutline
                size="sm"
                color="var(--color-text-muted)"
                onClick={() => {
                  const basicas = {};
                  COLUMNAS_DISPONIBLES.forEach((c) => {
                    basicas[c.key] = [
                      "fecha",
                      "nombre",
                      "telefono",
                      "localidad",
                      "estado",
                    ].includes(c.key);
                  });
                  setConfig({ ...config, columnasVisibles: basicas });
                  showToast("Columnas básicas restauradas", "info");
                }}
              >
                Restaurar básicas
              </BtnOutline>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Mostrá solo las columnas que necesitás para una vista más limpia y rápida.</p>
                <p>• Usá "Restaurar básicas" si te perdés entre tantas columnas.</p>
                <p>• Los cambios se aplican al instante en la vista de Tabla.</p>
              </div>
            </div>
          </div>
        );

      case "datos": {
        const _importHab = config.importHabilitar || {};
        const _importOn = (k) => _importHab[k] !== false;
        return (
          <div className="space-y-4">
            {/* SECCION 0: Backup Completo */}
            <div className="config-section" style={{ borderColor: "var(--color-accent)" }}>
              <div className="config-section-title">Backup Completo</div>
              <div className="flex items-center gap-2 text-sm mb-3" style={{ color: "var(--color-text)" }}>
                <FileSpreadsheet size={16} color="var(--color-accent)" />
                <span>
                  Copia de seguridad de <strong>todos</strong> los datos: casos, notas, eventos y
                  configuración, en un solo archivo JSON.
                </span>
              </div>

              {backupStats && (
                <div className="mb-3 text-xs flex items-center gap-1" style={{ color: "var(--color-success)" }}>
                  <CheckCircle size={12} />
                  Último backup: {backupStats.name} ({backupStats.sizeKB} KB)
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={handleExportFullBackup}
                  disabled={loading}
                  size="sm"
                  color="var(--color-success)"
                  icon={Download}
                >
                  Exportar backup completo
                </Btn>
                <BtnOutline
                  onClick={() => backupFileInputRef.current?.click()}
                  disabled={loading || !_importOn("backupCompleto")}
                  size="sm"
                  color="var(--color-accent)"
                  icon={Upload}
                  title={_importOn("backupCompleto") ? undefined : "Deshabilitado en Avanzado > Importación"}
                >
                  Restaurar backup
                </BtnOutline>
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleSelectBackupFile}
                />
              </div>

              {pendingRestore && (
                <div
                  className="mt-3 rounded-lg p-3"
                  style={{ backgroundColor: "var(--color-danger)22", border: "1px solid var(--color-danger)44" }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--color-danger)" }}>
                    ¿Restaurar backup?
                  </div>
                  <div className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Se reemplazarán los elementos seleccionados con el contenido del backup.
                    Exportado: {pendingRestore.timestamp ? new Date(pendingRestore.timestamp).toLocaleString() : "—"}.
                    Esta acción es irreversible.
                  </div>
                  {checksumMismatch && (
                    <div
                      className="mb-2 rounded-lg p-2"
                      style={{ backgroundColor: "#F59E0B22", border: "1px solid #F59E0B66" }}
                      role="alert"
                    >
                      <div className="text-[11px] font-bold mb-0.5" style={{ color: "#F59E0B" }}>
                        Checksum no coincide
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        El archivo pudo haber sido alterado o corrompido. Si confiás en su
                        origen, podés importarlo igualmente.
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] font-semibold mb-1" style={{ color: "var(--color-text)" }}>
                    Qué restaurar (por defecto en Avanzado &gt; Importación):
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    <Toggle checked={config.importRestoreCasos !== false} onChange={(v) => actualizarConfig("importRestoreCasos", v)} label="Casos" />
                    <Toggle checked={config.importRestoreNotas !== false} onChange={(v) => actualizarConfig("importRestoreNotas", v)} label="Notas" />
                    <Toggle checked={config.importRestoreEventos !== false} onChange={(v) => actualizarConfig("importRestoreEventos", v)} label="Eventos" />
                    <Toggle checked={config.importRestoreConfig !== false} onChange={(v) => actualizarConfig("importRestoreConfig", v)} label="Configuración y útiles" />
                  </div>
                  <div className="flex flex-col gap-2 mb-2">
                    <label className="text-xs" style={{ color: "var(--color-text-muted)" }} htmlFor="restore-confirm">
                      Escribí <b>RESTAURAR</b> para confirmar la restauración:
                    </label>
                    <TextInput
                      id="restore-confirm"
                      value={restoreConfirmText}
                      onChange={(e) => setRestoreConfirmText(e.target.value)}
                      placeholder="RESTAURAR"
                      style={{ maxWidth: 220 }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      onClick={() => handleConfirmRestore(false)}
                      size="sm"
                      color="var(--color-danger)"
                      icon={AlertTriangle}
                      disabled={loading || restoreConfirmText.trim().toUpperCase() !== "RESTAURAR"}
                    >
                      {checksumMismatch ? "Importar igualmente" : "Restaurar"}
                    </Btn>
                    <BtnOutline onClick={handleCancelRestore} size="sm" color="var(--color-text-muted)">
                      Cancelar
                    </BtnOutline>
                  </div>

                  {bloqueoVaciado && (
                    <div
                      className="mt-3 rounded-lg p-3"
                      style={{ backgroundColor: "var(--color-danger)22", border: "1px solid var(--color-danger)66" }}
                      role="alert"
                    >
                      <div className="text-xs font-bold mb-1" style={{ color: "var(--color-danger)" }}>
                        Operación bloqueada por integridad de datos
                      </div>
                      <div className="text-[11px] mb-2" style={{ color: "var(--color-text)" }}>
                        {bloqueoVaciado.mensaje}
                      </div>
                      <div className="flex gap-2">
                        <Btn
                          onClick={() => { setBloqueoVaciado(null); handleConfirmRestore(true); }}
                          size="sm"
                          color="var(--color-danger)"
                          icon={AlertTriangle}
                          disabled={loading}
                        >
                          Vaciar y restaurar igualmente
                        </Btn>
                        <BtnOutline
                          onClick={() => setBloqueoVaciado(null)}
                          size="sm"
                          color="var(--color-text-muted)"
                        >
                          No vaciar
                        </BtnOutline>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                El backup incluye verificación de integridad (checksum) y se importa de forma
                atómica: ante cualquier error se restaura el estado anterior.
              </div>
            </div>

            {/* SECCION: Backup automático + historial */}
            <div className="config-section">
              <div className="config-section-title">Backup Automático y Historial</div>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <FileSpreadsheet size={16} color="var(--color-accent)" />
                <span className="text-sm" style={{ color: "var(--color-text)" }}>
                  Frecuencia de backup automático:
                </span>
                <Select
                  value={backupFrequency}
                  onChange={(e) => handleChangeBackupFrequency(e.target.value)}
                  options={BACKUP_FREQUENCY_OPTIONS}
                  style={{ width: 260 }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
                {backupFrequency === "manual" ? (
                  <span>
                    Backups automáticos <b>desactivados</b>. Podés crear uno manualmente con el
                    botón de abajo; la app te avisará si pasan varios días sin respaldar.
                  </span>
                ) : (
                  <span>
                    La app respalda automáticamente según la frecuencia elegida aquí (
                    <b>{backupFrequency}</b>
                    {daysSinceLastBackup() !== null
                      ? ` · ${daysSinceLastBackup()} día${daysSinceLastBackup() === 1 ? "" : "s"} desde el último`
                      : " · primer backup pendiente"}
                    ).
                  </span>
                )}
              </div>
              {(() => {
                const schedule = getJornadaBackupSchedule();
                if (!schedule) return null;
                const [h, m] = schedule.endTime.split(':').map(Number);
                const backupH = String(h).padStart(2, '0');
                const backupM = String(Math.max(0, m - 15)).padStart(2, '0');
                return (
                  <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--color-accent)11", border: "1px solid var(--color-accent)33", color: "var(--color-text)" }}>
                    <Clock size={14} color="var(--color-accent)" />
                    <span>
                      Backup automático programado a las <b>{backupH}:{backupM}</b> (15 min antes del cierre de jornada a las {schedule.endTime}).
                    </span>
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-2 mb-3">
                <Btn
                  onClick={handleRunAutoBackup}
                  disabled={loading}
                  size="sm"
                  color="var(--color-accent)"
                  icon={Download}
                >
                  Crear backup ahora
                </Btn>
              </div>
              {backupHistoryLoading ? (
                <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Cargando historial...</div>
              ) : backupHistory.length === 0 ? (
                <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Todavía no hay backups automáticos. Se crearán según la frecuencia configurada.
                </div>
              ) : (
                <div className="space-y-2">
                  {backupHistory.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                      style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                          {new Date(b.timestamp).toLocaleString()}
                          {b.kind === 'jornada' && (
                            <span className="ml-2 pill-compact" style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}>
                              Jornada
                            </span>
                          )}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          {b.counts?.cases || 0} casos · {b.counts?.notes || 0} notas ·{" "}
                          {b.counts?.events || 0} eventos · {b.sizeKB || "?"} KB
                        </div>
                      </div>
                      {/* Fix visual 1.9.6: columna vertical en lugar de fila única.
                          Antes la leyenda de confirmación quedaba ENTRE Restaurar y
                          Eliminar y los desplazaba al aparecer, y el label cambiaba
                          ("Restaurar"→"Confirmar") alterando el ancho y moviendo al
                          vecino. Ahora: labels fijos y la leyenda en su propia línea
                          debajo, sin tocar el layout de los botones.
                          Respuesta visual de confirmación: en reposo son outline y al
                          armar la 2da confirmación pasan a SOLID (fondo con color) +
                          icono AlertTriangle + title, así el estado se ve de un vistazo. */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex gap-1.5 items-center">
                          <Btn
                            onClick={() => handleRestoreFromHistory(b.id)}
                            size="sm"
                            color="var(--color-accent)"
                            variant={confirmRestoreBackupId === b.id ? "solid" : "outline-accent"}
                            icon={confirmRestoreBackupId === b.id ? AlertTriangle : Download}
                            disabled={loading}
                            title={confirmRestoreBackupId === b.id ? "Haz clic de nuevo para confirmar" : undefined}
                          >
                            Restaurar
                          </Btn>
                          <Btn
                            onClick={() => handleDeleteBackup(b.id)}
                            size="sm"
                            color="var(--color-danger)"
                            variant={confirmDeleteBackupId === b.id ? "solid" : "outline-accent"}
                            icon={confirmDeleteBackupId === b.id ? AlertTriangle : Trash2}
                            title={confirmDeleteBackupId === b.id ? "Haz clic de nuevo para confirmar" : undefined}
                          >
                            Eliminar
                          </Btn>
                        </div>
                        {(confirmRestoreBackupId === b.id || confirmDeleteBackupId === b.id) && (
                          <div className="text-xs" style={{ color: "var(--color-warning)" }}>
                            {confirmRestoreBackupId === b.id && "Haz clic en Restaurar de nuevo para confirmar"}
                            {confirmRestoreBackupId === b.id && confirmDeleteBackupId === b.id && " · "}
                            {confirmDeleteBackupId === b.id && "Haz clic en Eliminar de nuevo para confirmar"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCION 1: Gestion de Utiles */}
            <div className="config-section">
              <div className="config-section-title">Gestion de Utiles</div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Pasos:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {pasos?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Tips:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {tips?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Links:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {links?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Speechs:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {speechs?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Speechs interactivos:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {speechsInteractivos?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Objeciones:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {objeciones?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>ART:</span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {art?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Transito:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {transito?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Lesiones:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {Object.keys(lesiones || {}).reduce(
                      (acc, key) => acc + (lesiones[key]?.length || 0),
                      0
                    )}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Estudios:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {mapeo?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Obs. Transito:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {observacionesTransito?.length || 0}
                  </b>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Condicionales:
                  </span>{" "}
                  <b style={{ color: "var(--color-text)" }}>
                    {condicionales?.length || 0}
                  </b>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={handleExportConfig}
                  icon={Download}
                  size="sm"
                  color="var(--color-accent)"
                >
                  Exportar JSON
                </Btn>
                {/* Fix visual 1.9.6: "Importar" era un <label> crudo (borde 1px,
                    px-2.5 py-1.5, sin min-height) con una altura distinta al resto de
                    la sección. Ahora es BtnOutline (mismo .btn-sm/borde 1.5px) con input
                    oculto por ref, idéntico al patrón de "Restaurar backup" de Backup
                    Completo; además suma disabled por loading como los demás imports.
                    configFileInputRef (:190) estaba declarado sin uso y se recicla. */}
                <BtnOutline
                  onClick={() => configFileInputRef.current?.click()}
                  size="sm"
                  color="var(--color-accent)"
                  icon={Upload}
                  disabled={loading || !_importOn("utilesJson")}
                  title={_importOn("utilesJson") ? undefined : "Deshabilitado en Avanzado > Importación"}
                >
                  Importar
                </BtnOutline>
                <input
                  ref={configFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportConfig}
                  className="hidden"
                />
                {/* Fix visual 1.9.6: en reposo outline, al confirmar pasa a SOLID con
                    icono AlertTriangle + title: respuesta visual clara del estado. */}
                <Btn
                  onClick={handleEliminarUtiles}
                  color="var(--color-danger)"
                  size="sm"
                  variant={confirmDeleteUtiles ? "solid" : "outline-accent"}
                  icon={confirmDeleteUtiles ? AlertTriangle : Trash2}
                  title={confirmDeleteUtiles ? "Haz clic de nuevo para confirmar" : undefined}
                >
                  Eliminar
                </Btn>
              </div>
              {/* Fix visual 1.9.6: la leyenda estaba dentro de la fila flex; ahora vive
                  en su propia línea debajo para que no desplace a los botones. */}
              {confirmDeleteUtiles && (
                <div className="text-xs mt-1" style={{ color: "var(--color-warning)" }}>
                  Haz clic en Eliminar de nuevo para confirmar
                </div>
              )}
              <div
                className="text-xs mt-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                Los prospectos NO se incluyen. Solo se exportan/importan las
                configuraciones.
              </div>
            </div>

            {/* SECCION 2: Gestion de Casos */}
            <div className="config-section">
              <div className="config-section-title">Gestion de Casos</div>

              <div
                className="flex items-center gap-2 text-sm mb-3"
                style={{ color: "var(--color-text)" }}
              >
                <Database size={16} color="var(--color-accent)" />
                <span>
                  Total de casos:{" "}
                  <strong style={{ color: "var(--color-text)" }}>
                    {casos?.length || 0}
                  </strong>
                </span>
                {importStats && importStats.success && (
                  <span className="text-xs flex items-center gap-1 ml-2" style={{ color: "var(--color-success)" }}>
                    <CheckCircle size={12} /> {importStats.count} casos importados
                  </span>
                )}
                {importStats && !importStats.success && (
                  <span className="text-xs flex items-center gap-1 ml-2" style={{ color: "var(--color-danger)" }}>
                    <XCircle size={12} /> {importStats.error}
                  </span>
                )}
              </div>

              {/* Selector múltiple de meses */}
              <div className="mb-3">
                <label
                  className="text-xs block mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Seleccionar meses (exportar o eliminar):
                </label>
                {/* Fix visual 1.9.6: eran <button> crudos con px-2 py-1 (una tercera
                    altura distinta dentro de la misma sección). Ahora BtnOutline sm:
                    misma altura/borde/hover que el resto de los botones de Datos,
                    igual que "Cancelar" de Backup Completo. */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <BtnOutline onClick={selectAllMonths} size="sm" color="var(--color-text-muted)">
                    Seleccionar todos
                  </BtnOutline>
                  <BtnOutline onClick={clearMonths} size="sm" color="var(--color-text-muted)">
                    Limpiar selección
                  </BtnOutline>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-[var(--color-border)] rounded">
                  {mesesDisponibles.length === 0 ? (
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      No hay meses disponibles
                    </span>
                  ) : (
                    mesesDisponibles.map((m) => {
                      const [year, month] = m.split("-").map(Number);
                      const label = getMonthLabel(month - 1, year);
                      const isSelected = selectedMonths.includes(m);
                      return (
                        <label
                          key={m}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                              : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
                          }`}
                          style={{ border: "1px solid var(--color-border)" }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMonthSelection(m)}
                            className="accent-[var(--color-accent)]"
                          />
                          {label}
                        </label>
                      );
                    })
                  )}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {selectedMonths.length} meses seleccionados
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Btn
                  onClick={handleExportCasesCSV}
                  disabled={loading}
                  size="sm"
                  color="var(--color-success)"
                  icon={FileSpreadsheet}
                >
                  Exportar CSV
                </Btn>
                <BtnOutline
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || !_importOn("casosCsv")}
                  size="sm"
                  color="var(--color-accent)"
                  icon={Upload}
                  title={_importOn("casosCsv") ? undefined : "Deshabilitado en Avanzado > Importación"}
                >
                  Importar CSV
                </BtnOutline>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCases}
                />
                {/* Fix visual 1.9.6: label fijo (antes "Eliminar"→"Confirmar" cambiaba
                    el ancho y movía a los vecinos de la fila) y respuesta visual de
                    confirmación: outline en reposo → SOLID al armar la 2da confirmación,
                    con icono AlertTriangle + title. */}
                <Btn
                  onClick={handleEliminarCasos}
                  color="var(--color-danger)"
                  size="sm"
                  variant={confirmDeleteCases ? "solid" : "outline-accent"}
                  icon={confirmDeleteCases ? AlertTriangle : Trash2}
                  title={confirmDeleteCases ? "Haz clic de nuevo para confirmar" : undefined}
                >
                  Eliminar
                </Btn>
              </div>
              {/* Fix visual 1.9.6: leyenda fuera de la fila flex (antes al final de la
                  misma fila, podía hacer wrap y desplazar botones). */}
              {confirmDeleteCases && (
                <div className="text-xs mt-1" style={{ color: "var(--color-warning)" }}>
                  Haz clic en Eliminar de nuevo para confirmar
                </div>
              )}
              <div
                className="text-xs mt-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                Exporta/importa todos los casos con sus datos completos
                (reportes y comentarios incluidos).
              </div>
            </div>

            {/* SECCION: Notas y Calendario */}
            <div className="config-section">
              <div className="config-section-title">Notas y Calendario</div>
              <div className="flex items-center gap-2 text-sm mb-3" style={{ color: "var(--color-text)" }}>
                <FileText size={16} color="var(--color-accent)" />
                <span>Exporta, importa y administra notas y eventos del calendario</span>
                {importNcStats && importNcStats.success && (
                  <span className="text-xs flex items-center gap-1 ml-2" style={{ color: "var(--color-success)" }}>
                    <CheckCircle size={12} /> {importNcStats.notesCount} notas, {importNcStats.eventsCount} eventos
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Btn onClick={handleExportNotesCalendar} disabled={loading} size="sm" color="var(--color-accent)" icon={Download}>
                  Exportar JSON
                </Btn>
                <BtnOutline
                  onClick={() => ncFileInputRef.current?.click()}
                  disabled={loading || !_importOn("notasCalendarioJson")}
                  size="sm"
                  color="var(--color-accent)"
                  icon={Upload}
                  title={_importOn("notasCalendarioJson") ? undefined : "Deshabilitado en Avanzado > Importación"}
                >
                  Importar JSON
                </BtnOutline>
                <input ref={ncFileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportNotesCalendar} />
              </div>
              {/* Fix visual 1.9.6: labels fijos y ambas leyendas MOVIDAS fuera de la
                  fila. Antes la leyenda de "Eliminar notas" aparecía literalmente ENTRE
                  "Eliminar notas" y "Eliminar eventos" y empujaba el segundo botón al
                  confirmar (y el cambio de texto "Eliminar notas"→"Confirmar" también
                  movía al vecino).
                  Respuesta visual: outline en reposo → SOLID al armar la confirmación +
                  icono AlertTriangle + title, con la leyenda en línea propia debajo. */}
              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                <Btn
                  onClick={handleDeleteNotes}
                  color="var(--color-danger)"
                  size="sm"
                  variant={confirmDeleteNotes ? "solid" : "outline-accent"}
                  icon={confirmDeleteNotes ? AlertTriangle : Trash2}
                  title={confirmDeleteNotes ? "Haz clic de nuevo para confirmar" : undefined}
                >
                  Eliminar notas
                </Btn>
                <Btn
                  onClick={handleDeleteEvents}
                  color="var(--color-danger)"
                  size="sm"
                  variant={confirmDeleteEvents ? "solid" : "outline-accent"}
                  icon={confirmDeleteEvents ? AlertTriangle : Trash2}
                  title={confirmDeleteEvents ? "Haz clic de nuevo para confirmar" : undefined}
                >
                  Eliminar eventos
                </Btn>
              </div>
              {(confirmDeleteNotes || confirmDeleteEvents) && (
                <div className="text-xs mt-1" style={{ color: "var(--color-warning)" }}>
                  {confirmDeleteNotes && "Haz clic en Eliminar notas de nuevo para confirmar"}
                  {confirmDeleteNotes && confirmDeleteEvents && " · "}
                  {confirmDeleteEvents && "Haz clic en Eliminar eventos de nuevo para confirmar"}
                </div>
              )}
            </div>

            {/* SECCION 3: Eliminacion de Datos */}
            <div className="config-section" style={{ borderColor: "var(--color-danger)" }}>
              <div className="config-section-title" style={{ color: "var(--color-danger)" }}>
                Eliminacion de Datos
              </div>
              <div className="space-y-3">
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs" style={{ color: "var(--color-text)" }}>
                      Elimina TODOS los datos cargados (útiles y casos)
                    </span>
                    {/* Fix visual 1.9.6: label fijo en los 3 estados (antes cambiaba a
                        "Confirmar eliminacion"/"ULTIMA CONFIRMACION" y el ancho movía al
                        texto de la izquierda); los estados se comunican en los bloques de
                        abajo (leyenda de 2º clic y campo ELIMINAR).
                        Respuesta visual: outline en reposo → SOLID en cuanto se arma la
                        confirmación (1er clic), con icono AlertTriangle + title; igual
                        que todos los demás botones de doble clic de la sección. */}
                    <Btn
                      onClick={handleEliminarTodos}
                      color="var(--color-danger)"
                      size="sm"
                      variant={confirmEliminar || confirmFinal ? "solid" : "outline-accent"}
                      icon={confirmEliminar || confirmFinal ? AlertTriangle : Trash2}
                      disabled={confirmFinal && deleteKeyword !== "ELIMINAR"}
                      title={confirmEliminar && !confirmFinal ? "Haz clic de nuevo para confirmar" : undefined}
                    >
                      Eliminar todos los datos
                    </Btn>
                  </div>
                  {confirmEliminar && !confirmFinal && (
                    <div className="mt-2 text-xs" style={{ color: "var(--color-warning)" }}>
                      Haz clic nuevamente para confirmar la eliminacion
                    </div>
                  )}
                  {confirmFinal && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs font-bold" style={{ color: "var(--color-danger)" }}>
                        ULTIMA OPORTUNIDAD — Escribí ELIMINAR y hacé clic para borrar todo
                      </div>
                      <TextInput
                        value={deleteKeyword}
                        onChange={(e) => setDeleteKeyword(e.target.value)}
                        placeholder='Escribí "ELIMINAR" para confirmar'
                        className="text-xs"
                        style={{ maxWidth: 280 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Exportá respaldos periódicos de los datos antes de hacer limpieza general.</p>
                <p>• La importación de notas y eventos en JSON preserva todas las relaciones.</p>
                <p>• Usá "Exportar CSV" para compartir datos con otras herramientas sin perder información.</p>
              </div>
            </div>
          </div>
        );
      }

      case "citas":
        return (
          <div className="space-y-4">
            <div className="config-section" style={{ borderColor: "var(--color-accent)" }}>
              <div className="config-section-title">Citas y Calendario</div>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                Configurá cómo el sistema gestiona eventos, citas automáticas y reprogramaciones vinculadas a los casos.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--color-surface2)" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Crear eventos automáticamente desde CITA</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Cuando el campo CITA contiene una fecha y horario válido, se crea o actualiza un evento de calendario vinculado al caso.
                    </div>
                  </div>
                  <Toggle
                    checked={config.citasAutoCrear !== false}
                    onChange={(v) => setConfig({ ...config, citasAutoCrear: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--color-surface2)" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Actualizar evento al modificar CITA</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Si modificás el campo CITA de un caso, el evento vinculado se actualiza automáticamente con la nueva fecha y horario.
                    </div>
                  </div>
                  <Toggle
                    checked={config.citasAutoActualizar !== false}
                    onChange={(v) => setConfig({ ...config, citasAutoActualizar: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--color-surface2)" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Crear nueva cita al usar "Reprogramado"</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Al cambiar el estado de un reporte a "Reprogramado", se solicita nueva fecha y horario y se crea un evento de reprogramación.
                    </div>
                  </div>
                  <Toggle
                    checked={config.citasAutoReprogramar !== false}
                    onChange={(v) => setConfig({ ...config, citasAutoReprogramar: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--color-surface2)" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Mostrar información del caso en eventos</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      Muestra nombre, estado, aseguradora, estudio y localidad del caso en los eventos vinculados del calendario.
                    </div>
                  </div>
                  <Toggle
                    checked={config.citasMostrarInfoCaso !== false}
                    onChange={(v) => setConfig({ ...config, citasMostrarInfoCaso: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "estados-caso":
        const estadosList = getEstados(config);

        const actualizarEstado = (idx, campo, valor) => {
          const next = [...estadosList];
          const prev = next[idx];
          next[idx] = { ...prev, [campo]: valor };
          actualizarConfig("estados", next);
          // Si se renombró, actualizar también las categorías del dashboard.
          if (campo === "v" && prev.v !== valor && config.metrics?.categorias) {
            const categorias = { ...config.metrics.categorias };
            for (const k of Object.keys(categorias)) {
              categorias[k] = categorias[k].map((e) =>
                e === prev.v ? valor : e
              );
            }
            actualizarConfig("metrics", {
              ...config.metrics,
              categorias,
            });
          }
        };

        const agregarEstado = () => {
          actualizarConfig("estados", [
            ...estadosList,
            { v: "Nuevo estado", accent: "#6B7280", peso: 1 },
          ]);
        };

        const eliminarEstado = (idx) => {
          const quitar = estadosList[idx];
          const next = estadosList.filter((_, i) => i !== idx);
          actualizarConfig("estados", next);
          if (config.metrics?.categorias) {
            const categorias = { ...config.metrics.categorias };
            for (const k of Object.keys(categorias)) {
              categorias[k] = categorias[k].filter((e) => e !== quitar.v);
            }
            actualizarConfig("metrics", {
              ...config.metrics,
              categorias,
            });
          }
        };

        const restaurarEstados = () => {
          actualizarConfig("estados", ESTADOS);
          showToast("Estados restaurados a los valores por defecto", "info");
        };

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <CircleDot size={14} color="var(--color-accent)" />
                Estados de caso
              </div>
              <div className="text-[10px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                Nombres, colores y peso de cada estado. El peso ajusta las estadísticas:
                por ejemplo, un estado con peso 0 no suma en el dashboard.
              </div>
              <div className="space-y-2">
                {estadosList.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px" }}>
                    <input
                      type="color"
                      value={e.accent || "#6B7280"}
                      onChange={(ev) => actualizarEstado(idx, "accent", ev.target.value)}
                      style={{ width: 34, height: 30, border: "none", background: "transparent", cursor: "pointer" }}
                      aria-label={`Color de ${e.v}`}
                    />
                    <TextInput
                      value={e.v || ""}
                      onChange={(ev) => actualizarEstado(idx, "v", ev.target.value)}
                      className="flex-1 min-w-[150px]"
                      placeholder="Nombre del estado"
                    />
                    <label className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      Peso:
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={e.peso ?? 1}
                        onChange={(ev) => actualizarEstado(idx, "peso", Math.max(0, parseFloat(ev.target.value) || 0))}
                        className="w-16 text-[10px] px-1.5 py-1 rounded"
                        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                      />
                    </label>
                    <button
                      onClick={() => eliminarEstado(idx)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${e.v}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Btn onClick={agregarEstado} size="sm" icon={Plus}>Agregar estado</Btn>
                <BtnOutline onClick={restaurarEstados} size="sm" color="var(--color-text-muted)">Restaurar por defecto</BtnOutline>
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• El peso se usa para corregir estadísticas como el resumen del dashboard (suma ponderada).</p>
                <p>• Renombrar un estado actualiza automáticamente las categorías del dashboard.</p>
                <p>• Los cambios se guardan junto con la configuración y los backups.</p>
              </div>
            </div>
          </div>
        );

      case "tipos-ingreso":
        const tiposList = getTiposIngreso(config);

        const actualizarTipo = (idx, campo, valor) => {
          const next = [...tiposList];
          next[idx] = { ...next[idx], [campo]: valor };
          actualizarConfig("tiposIngreso", next);
        };

        const agregarTipo = () => {
          actualizarConfig("tiposIngreso", [
            ...tiposList,
            { v: "Nuevo tipo de ingreso", keywords: [], keywordsPriority: 3 },
          ]);
        };

        const eliminarTipo = (idx) => {
          const campo = tiposList[idx];
          const esSugerido = TIPOS_INGRESO_SUGERIDOS.some((d) => d.v === campo?.v);
          setConfig({
            ...config,
            tiposIngreso: tiposList.filter((_, i) => i !== idx),
            ...(esSugerido
              ? {
                  tiposIngresoDeleted: [
                    ...new Set([...(config.tiposIngresoDeleted || []), campo.v]),
                  ],
                }
              : {}),
          });
        };

        const restaurarTipos = () => {
          setConfig({
            ...config,
            tiposIngreso: TIPOS_INGRESO_SUGERIDOS,
            tiposIngresoDeleted: [],
          });
          showToast("Tipos de ingreso restaurados", "info");
        };

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Tag size={14} color="var(--color-accent)" />
                Tipos de ingreso
              </div>
              <div className="text-[10px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                Categorías de ingreso disponibles al cargar un caso (Accidente Laboral,
                Enfermedad Profesional, etc.). Las palabras clave se usan para detectar
                automáticamente el tipo de ingreso al pegar una ficha completa
                (la prioridad 1 es la más alta y gana sobre las demás).
              </div>
              <div className="space-y-2">
                {tiposList.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px" }}>
                    <TextInput
                      value={t.v || ""}
                      onChange={(ev) => actualizarTipo(idx, "v", ev.target.value)}
                      className="flex-1 min-w-[150px]"
                      placeholder="Nombre del tipo de ingreso"
                    />
                    <KeywordsInput
                      value={t.keywords}
                      onCommit={(lista) => actualizarTipo(idx, "keywords", lista)}
                      className="min-w-[180px] flex-1"
                      placeholder="Palabras clave (separadas por coma)"
                      ariaLabel={`Palabras clave de ${t.v || "tipo"}`}
                    />
                    <label className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      Prioridad:
                      <select
                        value={t.keywordsPriority ?? 3}
                        onChange={(ev) => actualizarTipo(idx, "keywordsPriority", parseInt(ev.target.value, 10))}
                        className="text-[10px] px-1.5 py-1 rounded"
                        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                        aria-label={`Prioridad de palabras clave de ${t.v}`}
                      >
                        <option value={1}>1 - Alta</option>
                        <option value={2}>2 - Media</option>
                        <option value={3}>3 - Baja</option>
                      </select>
                    </label>
                    <button
                      onClick={() => eliminarTipo(idx)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${t.v}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Btn onClick={agregarTipo} size="sm" icon={Plus}>Agregar tipo</Btn>
                <BtnOutline onClick={restaurarTipos} size="sm" color="var(--color-text-muted)">Restaurar por defecto</BtnOutline>
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Los tipos de ingreso aparecen como opciones al registrar un caso.</p>
                <p>• Las palabras clave permiten la detección automática del tipo al pegar una ficha completa.</p>
                <p>• Prioridad 1 (alta) gana sobre 2 y 3 en caso de coincidencias múltiples.</p>
                <p>• Podés mantenerlos ordenados: el orden de la lista es el orden de los desplegables.</p>
              </div>
            </div>
          </div>
        );

      case "ficha-fields": {
        const fichaList = getFichaFields(config);

        const actualizarCampoFicha = (idx, campo, valor) => {
          const next = [...fichaList];
          next[idx] = { ...next[idx], [campo]: valor };
          actualizarConfig("fichaFields", next);
        };

        const moverCampoFicha = (idx, delta) => {
          const j = idx + delta;
          if (j < 0 || j >= fichaList.length) return;
          const next = [...fichaList];
          [next[idx], next[j]] = [next[j], next[idx]];
          actualizarConfig("fichaFields", next);
        };

        const agregarCampoFicha = () => {
          actualizarConfig("fichaFields", [
            ...fichaList,
            { id: `campo-${Date.now()}`, label: "NUEVO CAMPO", keywords: [], target: "" },
          ]);
        };

        const eliminarCampoFicha = (idx) => {
          const campo = fichaList[idx];
          const esDefault = DEFAULT_FICHA_FIELDS.some((d) => d.id === campo?.id);
          setConfig({
            ...config,
            fichaFields: fichaList.filter((_, i) => i !== idx),
            ...(esDefault
              ? {
                  fichaFieldsDeleted: [
                    ...new Set([...(config.fichaFieldsDeleted || []), campo.id]),
                  ],
                }
              : {}),
          });
        };

        const restaurarFicha = () => {
          setConfig({
            ...config,
            fichaFields: DEFAULT_FICHA_FIELDS,
            fichaFieldsDeleted: [],
          });
          showToast("Campos de ficha restaurados", "info");
        };

        const keywordsDuplicadas = [];
        const keywordsVistas = new Set();
        for (const campo of fichaList) {
          for (const kw of campo.keywords || []) {
            const k = normalizarTexto(kw);
            if (!k) continue;
            if (keywordsVistas.has(k)) {
              if (!keywordsDuplicadas.includes(k)) keywordsDuplicadas.push(k);
            } else {
              keywordsVistas.add(k);
            }
          }
        }

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <ClipboardPaste size={14} color="var(--color-accent)" />
                Campos de la ficha
              </div>
              <div className="text-[10px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                Define cómo se interpreta el texto que pegás en "Pegar ficha
                completa" (Nuevo Caso). La etiqueta se reconoce al inicio de
                una línea seguida de ":" o "-", sin distinguir mayúsculas ni
                acentos; el orden de la lista es el orden de evaluación.
              </div>
              {keywordsDuplicadas.length > 0 && (
                <div
                  className="rounded p-2 text-[10px] flex items-start gap-1.5 mb-3"
                  style={{ backgroundColor: "#F59E0B22", border: "1px solid #F59E0B", color: "#F59E0B" }}
                  role="alert"
                >
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Palabras clave repetidas (gana la primera de la lista):{" "}
                    {keywordsDuplicadas.join(", ")}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                {fichaList.map((f, idx) => (
                  <div key={`${f.id}-${idx}`} className="flex items-center gap-2 flex-wrap" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px" }}>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moverCampoFicha(idx, -1)}
                        className="p-1 rounded transition-colors hover:bg-[var(--color-surface)]"
                        style={{ color: "var(--color-text-muted)" }}
                        aria-label={`Subir ${f.label || "campo"}`}
                        disabled={idx === 0}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moverCampoFicha(idx, 1)}
                        className="p-1 rounded transition-colors hover:bg-[var(--color-surface)]"
                        style={{ color: "var(--color-text-muted)" }}
                        aria-label={`Bajar ${f.label || "campo"}`}
                        disabled={idx === fichaList.length - 1}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <TextInput
                      value={f.label}
                      onChange={(ev) => actualizarCampoFicha(idx, "label", ev.target.value)}
                      className="w-32"
                      placeholder="Etiqueta"
                    />
                    <KeywordsInput
                      value={f.keywords}
                      onCommit={(lista) => actualizarCampoFicha(idx, "keywords", lista)}
                      className="min-w-[180px] flex-1"
                      placeholder="Palabras clave (separadas por coma)"
                      ariaLabel={`Palabras clave de ${f.label || "campo"}`}
                    />
                    <select
                      value={f.target || ""}
                      onChange={(ev) => actualizarCampoFicha(idx, "target", ev.target.value)}
                      className="text-[10px] px-1.5 py-1 rounded"
                      style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                      aria-label={`Destino de ${f.label || "campo"}`}
                    >
                      {FICHA_TARGET_OPCIONES.map((o) => (
                        <option key={o.v || "ignorar"} value={o.v}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => eliminarCampoFicha(idx)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${f.label || "campo"}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Btn onClick={agregarCampoFicha} size="sm" icon={Plus}>Agregar campo</Btn>
                <BtnOutline onClick={restaurarFicha} size="sm" color="var(--color-text-muted)">Restaurar por defecto</BtnOutline>
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• El orden de la lista es el orden en que se evalúan las etiquetas al pegar.</p>
                <p>• La primera ocurrencia de una etiqueta es la que se usa; las siguientes se ignoran.</p>
                <p>• Un campo sin palabras clave no se detecta; con destino "Ignorar" el valor se descarta.</p>
                <p>• Los cambios se guardan junto con la configuración y los backups.</p>
              </div>
            </div>
          </div>
        );
      }

      case "diagnostico":
        return <SystemLogs />;

      case "plantillas": {
        const catsList = getTemplateCategories(config);

        const actualizarCategoria = (idx, valor) => {
          const next = [...catsList];
          const prev = next[idx];
          next[idx] = valor;
          actualizarConfig("templateCategories", next);
          if (prev && prev !== valor) {
            getAllTemplates().then((templates) => {
              for (const t of templates) {
                if (t.category === prev) {
                  import('../../features/templates/templatesStore').then((m) =>
                    m.updateTemplate(t.id, { category: valor })
                  );
                }
              }
            });
          }
        };

        const agregarCategoria = () => {
          actualizarConfig("templateCategories", [...catsList, ""]);
        };

        const eliminarCategoria = (idx) => {
          actualizarConfig("templateCategories", catsList.filter((_, i) => i !== idx));
        };

        const restaurarCategorias = () => {
          actualizarConfig("templateCategories", TEMPLATE_CATEGORIES_SUGERIDOS);
          showToast("Categorías restauradas a los valores por defecto", "info");
        };

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <FileText size={14} color="var(--color-accent)" />
                Categorías de plantillas
              </div>
              <div className="text-[10px] mb-3" style={{ color: "var(--color-text-muted)" }}>
                Categorías disponibles al crear o editar plantillas en Útiles → Plantillas.
                Se muestran como opciones en el selector de categoría.
              </div>
              <div className="space-y-2">
                {catsList.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-2" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px" }}>
                    <TextInput
                      value={cat || ""}
                      onChange={(ev) => actualizarCategoria(idx, ev.target.value)}
                      className="flex-1"
                      placeholder="Nombre de la categoría"
                    />
                    <button
                      onClick={() => eliminarCategoria(idx)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${cat}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Btn onClick={agregarCategoria} size="sm" icon={Plus}>Agregar categoría</Btn>
                <BtnOutline onClick={restaurarCategorias} size="sm" color="var(--color-text-muted)">Restaurar por defecto</BtnOutline>
              </div>
            </div>
            <div className="config-section">
              <div className="config-section-title flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}><Lightbulb size={13} aria-hidden="true" /> Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Las categorías aparecen como opciones al crear o editar una plantilla.</p>
                <p>• Si renombrás una categoría, se actualiza automáticamente en todas las plantillas que la usen.</p>
              </div>
            </div>
          </div>
        );
      }

      // 1.9.6: editor de categorías y variables de Útiles → Conversación
      // Sugerida. Todo vive en config (viaja en backups y resetea con Configuración).
      case "conversaciones": {
        const categorias = getConversacionesCategorias(config);
        const variables = getConversacionesVariables(config);
        const mensajesDe = (cat) => leerMensajes(cat, config).length;

        const agregarCategoria = () => {
          const nombre = nuevaCategoria.trim();
          const error = errorNombreCategoria(nombre, categorias);
          if (error) {
            showToast(error, "error");
            return;
          }
          actualizarConfig("conversacionesCategorias", [
            ...categorias,
            nombre,
          ]);
          setNuevaCategoria("");
          showToast("Categoría agregada", "success");
        };

        // El rename se confirma al salir del campo (blur/Enter) para poder
        // migrar la clave de localStorage de sus mensajes en un solo paso.
        const confirmarRenombre = (idx) => {
          const anterior = categorias[idx];
          const propuesto = (renombresCat[idx] ?? anterior).trim();
          setRenombresCat((prev) => {
            const copia = { ...prev };
            delete copia[idx];
            return copia;
          });
          if (propuesto === anterior) return;
          const otras = categorias.filter((_, i) => i !== idx);
          const error = errorNombreCategoria(propuesto, otras);
          if (error) {
            showToast(error, "error");
            return;
          }
          if (!renombrarClaveCategoria(anterior, propuesto)) {
            showToast("Ya hay mensajes guardados con ese nombre", "error");
            return;
          }
          actualizarConfig(
            "conversacionesCategorias",
            categorias.map((c, i) => (i === idx ? propuesto : c))
          );
          showToast("Categoría renombrada", "success");
        };

        const eliminarCategoria = () => {
          const cat = confirmCatBorrar;
          if (!cat) return;
          const total = mensajesDe(cat);
          eliminarMensajes(cat);
          actualizarConfig(
            "conversacionesCategorias",
            categorias.filter((c) => c !== cat)
          );
          setConfirmCatBorrar(null);
          showToast(`Categoría eliminada (${total} mensajes)`, "info");
        };

        const restaurarCategorias = () => {
          actualizarConfig("conversacionesCategorias", [
            ...CATEGORIAS_CONVERSACION_DEFAULT,
          ]);
          showToast("Categorías restauradas a los 4 originales", "info");
        };

        const agregarVariable = () => {
          const nombre = normalizarNombreVariable(nuevaVarNombre);
          const error = errorNombreVariable(
            nombre,
            variables.map((v) => v.nombre)
          );
          if (error) {
            showToast(error, "error");
            return;
          }
          actualizarConfig("conversacionesVariables", [
            ...variables,
            { nombre, valor: nuevaVarValor },
          ]);
          setNuevaVarNombre("");
          setNuevaVarValor("");
          showToast("Variable agregada", "success");
        };

        // Normalización en vivo (mayúsculas y " " → "_"): el input siempre
        // muestra el nombre final que se usará en las llaves {NOMBRE_VARIABLE}.
        const cambiarNombreVariable = (idx, valor) => {
          actualizarConfig(
            "conversacionesVariables",
            variables.map((v, i) =>
              i === idx ? { ...v, nombre: normalizarNombreVariable(valor) } : v
            )
          );
        };
        const validarNombreVariable = (idx) => {
          const otras = variables
            .filter((_, i) => i !== idx)
            .map((v) => v.nombre);
          const error = errorNombreVariable(variables[idx]?.nombre, otras);
          if (error) showToast(error, "error");
        };
        const cambiarValorVariable = (idx, valor) => {
          actualizarConfig(
            "conversacionesVariables",
            variables.map((v, i) => (i === idx ? { ...v, valor } : v))
          );
        };
        const eliminarVariable = (idx) => {
          actualizarConfig(
            "conversacionesVariables",
            variables.filter((_, i) => i !== idx)
          );
          showToast("Variable eliminada", "info");
        };
        const restaurarVariables = () => {
          actualizarConfig("conversacionesVariables", []);
          showToast("Variables restauradas (solo OPERADOR)", "info");
        };

        return (
          <div className="space-y-4">
            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <MessagesSquare size={14} color="var(--color-accent)" />
                Variables con llaves
              </div>
              <div
                className="text-[10px] mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                Se usan en Útiles → Conversación Sugerida: al copiar un mensaje
                cada llave se reemplaza por su valor. Las llaves sin valor quedan
                como texto literal. OPERADOR siempre está disponible y toma el
                campo Operador.
              </div>
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                >
                  <TextInput
                    value={VARIABLE_OPERADOR}
                    disabled
                    className="flex-1"
                    aria-label="Variable reservada"
                  />
                  <TextInput
                    value={config.operador || ""}
                    disabled
                    placeholder="Sin operador definido"
                    className="flex-1"
                    aria-label="Valor de la variable OPERADOR"
                  />
                  <span
                    className="text-[10px] whitespace-nowrap"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Reservada
                  </span>
                </div>
                {variables.map((v, idx) => (
                  <div
                    key={`${idx}-${v.nombre}`}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: "var(--color-surface2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "8px",
                    }}
                  >
                    <TextInput
                      value={v.nombre}
                      onChange={(e) => cambiarNombreVariable(idx, e.target.value)}
                      onBlur={() => validarNombreVariable(idx)}
                      className="flex-1"
                      placeholder="NOMBRE_VARIABLE"
                      aria-label="Nombre de la variable"
                    />
                    <TextInput
                      value={v.valor}
                      onChange={(e) => cambiarValorVariable(idx, e.target.value)}
                      className="flex-1"
                      placeholder="Valor al copiar"
                      aria-label={`Valor de ${v.nombre}`}
                    />
                    <button
                      onClick={() => eliminarVariable(idx)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${v.nombre}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {variables.length === 0 && (
                  <div
                    className="text-xs py-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Sin variables personalizadas: solo OPERADOR.
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap items-center">
                <TextInput
                  value={nuevaVarNombre}
                  onChange={(e) => setNuevaVarNombre(e.target.value)}
                  placeholder="NOMBRE_VARIABLE"
                  style={{ maxWidth: 190 }}
                  aria-label="Nombre de la nueva variable"
                />
                <TextInput
                  value={nuevaVarValor}
                  onChange={(e) => setNuevaVarValor(e.target.value)}
                  placeholder="Valor al copiar"
                  style={{ maxWidth: 220 }}
                  aria-label="Valor de la nueva variable"
                />
                <Btn onClick={agregarVariable} size="sm" icon={Plus}>
                  Agregar variable
                </Btn>
                <BtnOutline
                  onClick={restaurarVariables}
                  size="sm"
                  color="var(--color-text-muted)"
                >
                  Restaurar por defecto
                </BtnOutline>
              </div>
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <MessagesSquare size={14} color="var(--color-accent)" />
                Categorías
              </div>
              <div
                className="text-[10px] mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                Pestañas de Útiles → Conversación Sugerida. Renombrar mueve los
                mensajes guardados; eliminar borra también sus mensajes.
              </div>
              <div className="space-y-2">
                {categorias.map((cat, idx) => (
                  <div
                    key={`${idx}-${cat}`}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: "var(--color-surface2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "8px",
                    }}
                  >
                    <TextInput
                      value={renombresCat[idx] ?? cat}
                      onChange={(e) =>
                        setRenombresCat((prev) => ({
                          ...prev,
                          [idx]: e.target.value,
                        }))
                      }
                      onBlur={() => confirmarRenombre(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                      }}
                      className="flex-1"
                      aria-label={`Nombre de la categoría ${cat}`}
                    />
                    <span
                      className="text-[10px] whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {mensajesDe(cat)} mensajes
                    </span>
                    <button
                      onClick={() => setConfirmCatBorrar(cat)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${cat}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap items-center">
                <TextInput
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") agregarCategoria();
                  }}
                  placeholder="Nueva categoría"
                  style={{ maxWidth: 240 }}
                  aria-label="Nueva categoría"
                />
                <Btn onClick={agregarCategoria} size="sm" icon={Plus}>
                  Agregar categoría
                </Btn>
                <BtnOutline
                  onClick={restaurarCategorias}
                  size="sm"
                  color="var(--color-text-muted)"
                >
                  Restaurar por defecto
                </BtnOutline>
              </div>
            </div>

            <div className="config-section">
              <div
                className="config-section-title flex items-center gap-1.5"
                style={{ color: "var(--color-accent)" }}
              >
                <Lightbulb size={13} aria-hidden="true" /> Sugerencias
              </div>
              <div
                className="text-xs space-y-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                <p>
                  • OPERADOR no se puede editar: su valor sale del campo
                  Operador (Configuración → General).
                </p>
                <p>
                  • Creá variables útiles como{" "}
                  <code>{"{HORARIO}"}</code> con valor "de 9 a 18" y usalas con
                  los chips de inserción en la vista.
                </p>
                <p>
                  • Los cambios se guardan junto con la configuración y los
                  backups.
                </p>
              </div>
            </div>

            <ConfirmDialog
              open={!!confirmCatBorrar}
              title="Eliminar categoría"
              message={`Se eliminarán los ${mensajesDe(
                confirmCatBorrar
              )} mensajes de "${confirmCatBorrar}". Esta acción no se puede deshacer.`}
              confirmLabel="Eliminar"
              confirmColor="var(--color-danger)"
              onCancel={() => setConfirmCatBorrar(null)}
              onConfirm={eliminarCategoria}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <><div className="space-y-4">
      <div
        className="flex flex-wrap gap-1.5 mb-3 p-1.5 rounded-xl"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          justifyContent: justifyPestanas,
        }}
        role="group"
        aria-label="Grupos de Configuración"
      >
        {GRUPOS_CONFIG.map((g) => (
          <button
            key={g.id}
            onClick={() => cambiarGrupo(g.id)}
            className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors hover:opacity-80 ${
              grupoActivo === g.id
                ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
            }`}
          >
            <g.icon size={14} aria-hidden="true" /> {g.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          minHeight: 300,
        }}
      >
        <div
          className="flex flex-wrap items-center gap-1.5 mb-4 pb-3"
          style={{
            borderBottom: "1px solid var(--color-border)",
            justifyContent: justifyPestanas,
          }}
          role="group"
          aria-label="Secciones de Configuración"
        >
          {GRUPOS_CONFIG.find((g) => g.id === grupoActivo)?.items.map((s) => (
            <button
              key={s.id}
              onClick={() => cambiarSubseccion(s.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:opacity-80 ${
                seccion === s.id
                  ? "border border-[var(--color-accent)] bg-[var(--color-accent)22] text-[var(--color-accent)]"
                  : "border border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)]"
              }`}
            >
              <s.icon size={14} aria-hidden="true" /> {s.label}
            </button>
          ))}
        </div>
        <SectionHeader seccion={seccion} grupos={GRUPOS_CONFIG} />
        {renderSeccion()}
      </div>
    </div>

      {showImportPreview && (
        <div
          className={`fixed inset-0 z-submodal flex items-center justify-center p-4 ${
            importClosing ? "animate-fade-out" : "animate-fade-in"
          }`}
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={importClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-5xl rounded-xl flex flex-col ${
              importClosing ? "animate-modal-rise-out" : "animate-modal-rise-in"
            }`}
            style={{
              maxHeight: "90vh",
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Vista previa de importación
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {csvPreview.rows.length} filas &mdash; Revisa y ajusta las columnas antes de importar
                </div>
              </div>
              <button
                onClick={importClose}
                className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 min-h-0 px-4 pb-2 flex flex-col">
              <div className="preview-scroll rounded-lg flex-1 min-h-0" style={{ border: "1px solid var(--color-border)" }}>
                <table className="w-full preview-table text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-surface)" }}>
                      {importMapping.map((m, i) => (
                        <th key={i} className="px-2 py-1.5 text-left align-top">
                          <div className="text-ds-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                            {m.header}
                          </div>
                          <select
                            value={m.field || ""}
                            onChange={(e) => handleImportMappingChange(i, e.target.value || null)}
                            className="w-full text-[10px] rounded px-1 py-0.5 mb-1"
                            style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          >
                            {FIELD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}
                                disabled={opt.value && importMapping.some((x, j) => j !== i && x.field === opt.value)}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveImportColumn(i, i - 1)}
                              disabled={i === 0}
                              className="p-0.5 rounded transition-colors hover:bg-white/10 disabled:opacity-30 text-[11px]"
                              style={{ color: "var(--color-text-muted)" }}
                              title="Mover izquierda"
                            >
                              &larr;
                            </button>
                            <button
                              onClick={() => moveImportColumn(i, i + 1)}
                              disabled={i === importMapping.length - 1}
                              className="p-0.5 rounded transition-colors hover:bg-white/10 disabled:opacity-30 text-[11px]"
                              style={{ color: "var(--color-text-muted)" }}
                              title="Mover derecha"
                            >
                              &rarr;
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr
                        key={previewStart + i}
                        style={{
                          backgroundColor: (previewStart + i) % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                          borderTop: "1px solid var(--color-border)",
                        }}
                      >
                        {row.map((cell, j) => {
                          const field = importMapping[j]?.field;
                          const isEstado = field === "estado";
                          return (
                            <td key={j} className="px-2 py-1.5 whitespace-nowrap text-[11px]"
                              style={{ color: "var(--color-text)" }}
                            >
                              {isEstado && cell ? (
                                <Pill estado={cell} small />
                              ) : cell ? (
                                cell
                              ) : (
                                <span style={{ color: "var(--color-text-muted)" }}>&mdash;</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                paginaActual={safePreviewPage}
                totalPaginas={totalPreviewPages}
                setPaginaActual={setPreviewPage}
                totalItems={csvPreview.rows.length}
              />
            </div>

            <div className="flex items-center justify-between p-4 pt-2 flex-shrink-0"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {importMapping.filter((m) => m.field).length} columnas mapeadas
                </span>
                {(config.importDuplicados || "omitir") === "preguntar" && (
                  <span className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Duplicados:</span>
                    <select
                      value={previewEstrategia}
                      onChange={(e) => setPreviewEstrategia(e.target.value)}
                      className="text-[10px] rounded px-1 py-0.5"
                      style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                    >
                      <option value="omitir">Omitir</option>
                      <option value="actualizar">Actualizar existentes</option>
                      <option value="duplicar">Crear duplicados</option>
                    </select>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <BtnOutline onClick={importClose} size="sm" color="var(--color-text-muted)">
                  Cancelar
                </BtnOutline>
                <Btn onClick={handlePreviewImport} size="sm" icon={Upload} disabled={loading}>
                  {loading ? "Importando..." : `Importar ${csvPreview.rows.length} casos`}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUtilesPreview && utilesPreviewData && (
        <div
          className={`fixed inset-0 z-submodal flex items-center justify-center p-4 ${
            utilesClosing ? "animate-fade-out" : "animate-fade-in"
          }`}
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={utilesClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-xl flex flex-col ${
              utilesClosing ? "animate-modal-rise-out" : "animate-modal-rise-in"
            }`}
            style={{
              maxHeight: "80vh",
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Vista previa de importación
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {utilesPreviewData.keys.length} configuraciones &mdash; Revisa antes de importar
                  {utilesPreviewData.version ? ` · v${utilesPreviewData.version}` : ""}
                  {utilesPreviewData.fecha ? ` · ${utilesPreviewData.fecha}` : ""}
                </div>
              </div>
              <button
                onClick={utilesClose}
                className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 px-4 pb-2 flex flex-col">
              <div className="preview-scroll rounded-lg flex-1 min-h-0" style={{ border: "1px solid var(--color-border)" }}>
                <table className="w-full preview-table text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-surface)" }}>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Clave</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilesPageKeys.map((key, i) => (
                      <tr key={key}
                        style={{
                          backgroundColor: (utilesStart + i) % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                          borderTop: "1px solid var(--color-border)",
                        }}
                      >
                        <td className="px-3 py-1.5 text-[11px] whitespace-nowrap" style={{ color: "var(--color-text)" }}>{key}</td>
                        <td className="px-3 py-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          <pre
                            className="m-0 whitespace-pre-wrap break-all"
                            style={{ fontFamily: "inherit", fontSize: "inherit", color: "inherit" }}
                          >
                            {formatUtilesValue(utilesPreviewData.config[key]) || (
                              <span style={{ color: "var(--color-text-muted)" }}>&mdash;</span>
                            )}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                paginaActual={safeUtilesPage}
                totalPaginas={utilesTotalPages}
                setPaginaActual={setUtilesPage}
                totalItems={utilesKeys.length}
                itemLabel="configuraciones"
              />
            </div>
            <div className="flex items-center justify-between p-4 pt-2 flex-shrink-0"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {utilesClavesImportables.length} de {utilesPreviewData.keys.length} configuraciones a importar
              </span>
              <div className="flex gap-2">
                <BtnOutline onClick={utilesClose} size="sm" color="var(--color-text-muted)">
                  Cancelar
                </BtnOutline>
                <Btn
                  onClick={handleUtilesPreviewImport}
                  size="sm"
                  icon={Upload}
                  disabled={loading || utilesClavesImportables.length === 0}
                >
                  {loading
                    ? "Importando..."
                    : `Importar ${utilesClavesImportables.length} configuraciones`}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNcPreview && ncPreviewData && (
        <div
          className={`fixed inset-0 z-submodal flex items-center justify-center p-4 ${
            ncClosing ? "animate-fade-out" : "animate-fade-in"
          }`}
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={ncClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl rounded-xl flex flex-col ${
              ncClosing ? "animate-modal-rise-out" : "animate-modal-rise-in"
            }`}
            style={{
              maxHeight: "85vh",
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Vista previa de importación
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {ncPreviewData.notes.length} notas, {ncPreviewData.events.length} eventos &mdash; Revisa antes de importar
                </div>
              </div>
              <button
                onClick={ncClose}
                className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-2 space-y-4">
              {ncPreviewData.notes.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Notas ({ncPreviewData.notes.length})</div>
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "var(--color-surface)" }}>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Título</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Contenido</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ncPreviewData.notes.slice(0, 20).map((n, i) => (
                          <tr key={n.id || i}
                            style={{
                              backgroundColor: i % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                              borderTop: "1px solid var(--color-border)",
                            }}
                          >
                            <td className="px-2 py-1.5 text-[11px] max-w-[150px] truncate" style={{ color: "var(--color-text)" }}>{n.title || 'Sin título'}</td>
                            <td className="px-2 py-1.5 text-[11px] max-w-[250px] truncate" style={{ color: "var(--color-text-muted)" }}>{(n.content || '').replace(/<[^>]*>/g, '').slice(0, 120)}</td>
                            <td className="px-2 py-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>{(n.tags || []).join(', ') || '—'}</td>
                          </tr>
                        ))}
                        {ncPreviewData.notes.length > 20 && (
                          <tr>
                            <td colSpan={3} className="px-2 py-2 text-center text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                              ...y {ncPreviewData.notes.length - 20} notas m&aacute;s
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {ncPreviewData.events.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Eventos ({ncPreviewData.events.length})</div>
                  <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "var(--color-surface)" }}>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Título</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Fecha</th>
                          <th className="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Prioridad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ncPreviewData.events.slice(0, 20).map((evt, i) => (
                          <tr key={evt.id || i}
                            style={{
                              backgroundColor: i % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                              borderTop: "1px solid var(--color-border)",
                            }}
                          >
                            <td className="px-2 py-1.5 text-[11px] max-w-[200px] truncate" style={{ color: "var(--color-text)" }}>{evt.title || 'Sin título'}</td>
                            <td className="px-2 py-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>{evt.startDate?.slice(0, 10) || '—'}</td>
                            <td className="px-2 py-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>{evt.priority || '—'}</td>
                          </tr>
                        ))}
                        {ncPreviewData.events.length > 20 && (
                          <tr>
                            <td colSpan={3} className="px-2 py-2 text-center text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                              ...y {ncPreviewData.events.length - 20} eventos m&aacute;s
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-4 pt-2 flex-shrink-0"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {ncPreviewData.notes.length} notas, {ncPreviewData.events.length} eventos a importar
                {" · "}Duplicados: {{ actualizar: "actualizar", omitir: "omitir", duplicar: "duplicar" }[config.importNcDuplicados || "actualizar"]}
                {config.importNcNotas === false && " · Notas: no"}
                {config.importNcEventos === false && " · Eventos: no"}
              </span>
              <div className="flex gap-2">
                <BtnOutline onClick={ncClose} size="sm" color="var(--color-text-muted)">
                  Cancelar
                </BtnOutline>
                <Btn onClick={handleNcPreviewImport} size="sm" icon={Upload} disabled={loading}>
                  {loading ? "Importando..." : `Importar ${ncPreviewData.notes.length + ncPreviewData.events.length} elementos`}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============ TAB ORDER EDITOR ============
function DashboardTabOrderEditor() {
  const tabOrder = useAppStore((s) => s.dashTabOrder);
  const setTabOrder = useAppStore((s) => s.setDashTabOrder);
  const dashWidgetOrder = useAppStore((s) => s.dashWidgetOrder);
  const setDashWidgetOrder = useAppStore((s) => s.setDashWidgetOrder);

  const [expandedTab, setExpandedTab] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [dragType, setDragType] = useState(null); // 'tab' | 'widget'
  const [dragTabId, setDragTabId] = useState(null);

  const moveTab = (from, to) => {
    if (from === to) return;
    const next = [...tabOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTabOrder(next);
  };

  const moveWidget = (tabId, from, to) => {
    if (from === to) return;
    const order = getOrderedDashWidgets(dashWidgetOrder[tabId] || [], tabId);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    setDashWidgetOrder({ ...dashWidgetOrder, [tabId]: order });
  };

  const handleDragStart = (e, type, idx, tabId) => {
    setDragIdx(idx);
    setDragType(type);
    setDragTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e, type, idx, tabId) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      setDragType(null);
      setDragTabId(null);
      return;
    }
    if (dragType === 'tab') {
      moveTab(dragIdx, idx);
    } else if (dragType === 'widget' && dragTabId === tabId) {
      moveWidget(tabId, dragIdx, idx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
    setDragType(null);
    setDragTabId(null);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDragIdx(null);
    setDragOverIdx(null);
    setDragType(null);
    setDragTabId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Arrastra para reordenar. Haz clic en un tab para ver sus widgets.
        </span>
        <button
          onClick={() => {
            useAppStore.getState().restoreDashboardDefaults();
          }}
          className="text-[10px] px-2 py-1 rounded transition-colors hover:bg-white/10"
          style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
        >
          Restaurar defecto
        </button>
      </div>
      {tabOrder.map((id, idx) => {
        const t = DASH_TAB_MAP[id];
        if (!t) return null;
        const hasWidgets = !!DASH_WIDGET_REGISTRY[id];
        const isExpanded = hasWidgets && expandedTab === id;
        const wOrder = getOrderedDashWidgets(dashWidgetOrder[id] || [], id);
        const isOver = dragOverIdx === idx && dragType === 'tab';
        return (
          <div key={id}>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'tab', idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'tab', idx)}
              onDragEnd={handleDragEnd}
              onClick={() => hasWidgets && setExpandedTab(isExpanded ? null : id)}
              className="flex items-center gap-2 p-1.5 rounded cursor-grab active:cursor-grabbing select-none transition-opacity transition-transform duration-150"
              style={{
                backgroundColor: 'var(--color-surface2)',
                border: isOver ? '2px solid var(--color-accent)' : '1px solid transparent',
                opacity: dragIdx === idx && dragType === 'tab' ? 0.4 : 1,
                transform: isOver ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <GripVertical size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <t.icon size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span className="text-[11px] flex-1" style={{ color: 'var(--color-text)' }}>{t.label}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {hasWidgets ? `${wOrder.length} widgets` : 'Contenido fijo'}
              </span>
            </div>
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-1 pl-3" style={{ borderLeft: '2px solid var(--color-border)' }}>
                {wOrder.map((wid, wIdx) => {
                  const wDef = DASH_WIDGET_REGISTRY[id]?.[wid];
                  if (!wDef) return null;
                  const isWOver = dragOverIdx === wIdx && dragType === 'widget' && dragTabId === id;
                  const WidgetIcon = wDef.icon;
                  return (
                    <div
                      key={wid}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'widget', wIdx, id)}
                      onDragOver={(e) => handleDragOver(e, wIdx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'widget', wIdx, id)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-2 p-1.5 rounded cursor-grab active:cursor-grabbing select-none transition-opacity transition-transform duration-150"
                      style={{
                        backgroundColor: 'var(--color-surface2)',
                        border: isWOver ? '2px solid var(--color-accent)' : '1px solid transparent',
                        opacity: dragIdx === wIdx && dragType === 'widget' && dragTabId === id ? 0.4 : 1,
                        transform: isWOver ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <GripVertical size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                      {WidgetIcon && <WidgetIcon size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
                      <span className="text-[11px] flex-1" style={{ color: 'var(--color-text)' }}>{wDef.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ SIMPLE DRAG-AND-DROP SECTION EDITOR ============
const MI_ESPACIO_ICONS = {
  hoy: Sun,
  jornada: Clock,
  proxima: CalendarClock,
  eventos: CalendarDays,
  pendientes: ListTodo,
  productividad: BarChart3,
  metas: Target,
  acciones: Zap,
  accesos: Lock,
};

const TABLERO_ICONS = { columnas: Columns, pipelineBar: Filter };
const TABLA_ICONS = { tabla: Table2, pipelineBar: Filter, paginacion: MoreHorizontal };
const REPORTES_ICONS = { lista: ClipboardList, pipelineBar: Filter, paginacion: MoreHorizontal };
const UTILES_ICONS = {
  condicionales: GitBranch,
  pasos: ListOrdered,
  speechs: MessageSquare,
  objeciones: ShieldAlert,
  conversacion: MessagesSquare,
  aseguradoras: Building2,
  lesiones: HeartPulse,
  prolegal: Scale,
  transito: Car,
  mapeo: FileSearch,
  plantillas: FileText,
};

function MiEspacioOrderEditor() {
  const [order, setOrder] = useState(() =>
    getOrderedMiEspacioKeys(getOperatorSettings().miEspacioOrder)
  );

  const apply = (next) => {
    const sanitized = getOrderedMiEspacioKeys(next);
    setOrder(sanitized);
    saveOperatorSettings({ miEspacioOrder: sanitized });
  };

  const restore = () => {
    setOrder([...DEFAULT_MI_ESPACIO_ORDER]);
    saveOperatorSettings({ miEspacioOrder: [...DEFAULT_MI_ESPACIO_ORDER] });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Hoy / Bienvenida, Mi Jornada, Próxima actividad, Próximos eventos, Pendientes, Productividad, Metas, Acciones rápidas y Accesos personales
        </span>
        <button
          onClick={restore}
          className="text-[10px] px-2 py-1 rounded transition-colors hover:bg-white/10 flex-shrink-0"
          style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
        >
          Restaurar defecto
        </button>
      </div>
      <ViewSectionEditor items={order} setItems={apply} labels={MI_ESPACIO_LABELS} iconMap={MI_ESPACIO_ICONS} />
    </div>
  );
}

function ViewSectionEditor({ items, setItems, labels, iconMap }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const moveItem = (from, to) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  return (
    <div className="space-y-1">
      {items.map((id, idx) => {
        const isOver = dragOverIdx === idx;
        const ItemIcon = iconMap?.[id];
        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); }}
            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={(e) => { e.preventDefault(); moveItem(dragIdx, idx); setDragIdx(null); setDragOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className="flex items-center gap-2 p-1.5 rounded cursor-grab active:cursor-grabbing select-none transition-opacity transition-transform duration-150"
            style={{
              backgroundColor: 'var(--color-surface2)',
              border: isOver ? '2px solid var(--color-accent)' : '1px solid transparent',
              opacity: dragIdx === idx ? 0.4 : 1,
              transform: isOver ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <GripVertical size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            {ItemIcon && <ItemIcon size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
            <span className="text-[11px] flex-1" style={{ color: 'var(--color-text)' }}>{labels[id] || id}</span>
          </div>
        );
      })}
    </div>
  );
}
