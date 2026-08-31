import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Settings, Palette, Layout, Database, AlertTriangle, Download, Upload,
  FileSpreadsheet, FileText, Trash2, Bug, CheckCircle, XCircle,
  Globe, Bell, LayoutDashboard, Search, FileUp, Cpu, Navigation,
  ToggleLeft, Eye, EyeOff, Clock, ArrowUpDown, Tag, Mail, X,
  GripVertical, ChevronUp, ChevronDown, BarChart3, CircleDot, MapPin, Building2,
  LayoutGrid, Table2, ClipboardList, Wrench, Plus, Target, Type,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { Select } from "../common/Select";
import { TextInput } from "../common/TextInput";
import { Toggle } from "../common/Toggle";
import { PersonalizacionColores } from "./PersonalizacionColores";
import { TipografiaView } from "./TipografiaView";
import { getProductivitySettings, saveProductivitySettings, getGoalsState, setDailyTarget } from "../../features/productivity/productivityStore";
import { getOperatorSettings, saveOperatorSettings } from "../../features/operator/operatorStore";
import { getMetricDefs, getDefaultCategories, getDefaultAlerts } from '../../features/dashboard/metricsEngine';
import { ESTADOS, TIPOS_INGRESO_SUGERIDOS } from '../../utils/constants';
import { getEstados, getTiposIngreso } from '../../utils/catalogos';
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
import { HelpSection } from "./HelpSection";
import * as backupService from "../../services/backupService";
import { localStorageAdapter } from "../../core/storage/localStorageAdapter";
import {
  getBackupHistory, deleteBackup, restoreFromHistory, runAutoBackup,
  getBackupFrequency, setBackupFrequency, daysSinceLastBackup,
  BACKUP_FREQUENCY_OPTIONS, getJornadaBackupSchedule,
} from "../../services/autoBackup";

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
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [bloqueoVaciado, setBloqueoVaciado] = useState(null);
  const [backupStats, setBackupStats] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupHistoryLoading, setBackupHistoryLoading] = useState(false);
  const [backupFrequency, setBackupFrequencyState] = useState(() => getBackupFrequency());

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
      ],
    },
    {
      id: "apariencia", label: "Apariencia", icon: Palette,
      items: [
        { id: "apariencia", label: "Colores", icon: Palette },
        { id: "tipografia", label: "Tipografía", icon: Type },
        { id: "dashboard", label: "Vistas", icon: Eye },
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
      // El id interno se mantiene como "sistema" para no romper
      // los valores guardados en localStorage ("config-tab-activa").
      id: "sistema", label: "Avanzado", icon: Cpu,
      items: [
        { id: "ux", label: "UX/Navegación", icon: Navigation },
        { id: "dashboard-config", label: "Dashboard", icon: LayoutDashboard },
        { id: "estados-caso", label: "Estados de Caso", icon: CircleDot },
        { id: "tipos-ingreso", label: "Tipos de Ingreso", icon: Tag },
        { id: "importacion", label: "Importación", icon: FileUp },
        { id: "diagnostico", label: "Diagnóstico", icon: Bug },
      ],
    },
  ];

  const [grupoActivo, setGrupoActivo] = useState(() => {
    const saved = localStorage.getItem("config-tab-activa");
    if (saved && GRUPOS_CONFIG.some((g) => g.items.some((i) => i.id === saved))) {
      const grupo = GRUPOS_CONFIG.find((g) => g.items.some((i) => i.id === saved));
      return grupo.id;
    }
    return "general";
  });

  const [seccion, setSeccion] = useState(() => {
    return localStorage.getItem("config-tab-activa") || "general";
  });

  const cambiarGrupo = (groupId) => {
    setGrupoActivo(groupId);
    const grupo = GRUPOS_CONFIG.find((g) => g.id === groupId);
    if (grupo) {
      setSeccion(grupo.items[0].id);
      localStorage.setItem("config-tab-activa", grupo.items[0].id);
    }
  };

  const cambiarSubseccion = (subId) => {
    setSeccion(subId);
    localStorage.setItem("config-tab-activa", subId);
  };

  // Aplanar para busqueda de seccion
  const seccionesConfig = GRUPOS_CONFIG.flatMap((g) => g.items);

  const mesesDisponibles = getAvailableMonths(casos, "fecha");

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
        const { backup, error } = await backupService.parseBackupJSON(e.target.result);
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
      }
    }
  };

  const handleCancelRestore = () => {
    setPendingRestore(null);
    setRestoreConfirmText("");
    setBloqueoVaciado(null);
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
  const [dailyTarget, setDailyTargetState] = useState(() => getProductivitySettings().caseTarget || 5);
  const [operatorSettings, setOperatorSettings] = useState(() => getOperatorSettings());

  const updateProdSetting = (key, val) => {
    const updated = saveProductivitySettings({ [key]: val });
    setProdSettings(updated);
    showToast("Configuración de productividad actualizada", "success");
  };

  const handleTargetChange = (val) => {
    const num = Number(val) || 5;
    setDailyTarget(num);
    setDailyTargetState(num);
    setDailyTarget(num);
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
                La meta de reportes diaria se calcula automáticamente según los casos
                cargados el día hábil anterior (ignorando fines de semana y días sin casos).
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
                    value={config.idioma || "es"}
                    onChange={(e) =>
                      actualizarConfig("idioma", e.target.value)
                    }
                    options={[
                      { value: "es", label: "Español" },
                      { value: "en", label: "English" },
                      { value: "pt", label: "Português" },
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
                <BtnOutline onClick={() => { navigator.clipboard.writeText("yoelcallcenter@gmail.com"); showToast("Email copiado al portapapeles", "success"); }} size="sm">Copiar email</BtnOutline>
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
                  { key: "insightEnJornada", label: "Insight destacado en Mi Jornada" },
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
                            className="text-[10px] px-2 py-1 rounded-full transition-colors"
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
                <LayoutGrid size={14} color="var(--color-accent)" />
                Tablero (Kanban) — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las secciones del tablero Kanban
              </div>
              <ViewSectionEditor items={kanbanSections} setItems={setKanbanSections} labels={{ pipelineBar: 'Barra de distribución', columnas: 'Columnas del tablero' }} />
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <Table2 size={14} color="var(--color-accent)" />
                Tabla — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las secciones de la vista de tabla
              </div>
              <ViewSectionEditor items={tablaSections} setItems={setTablaSections} labels={{ pipelineBar: 'Barra de distribución', tabla: 'Tabla de casos', paginacion: 'Paginación' }} />
            </div>

            <div className="config-section">
              <div className="config-section-title flex items-center gap-2">
                <ClipboardList size={14} color="var(--color-accent)" />
                Reportes — secciones
              </div>
              <div className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Arrastrá para reordenar las secciones de la vista de reportes
              </div>
              <ViewSectionEditor items={reportesSections} setItems={setReportesSections} labels={{ pipelineBar: 'Barra de distribución', lista: 'Lista de reportes', paginacion: 'Paginación' }} />
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
                condicionales: 'Condicionales', pasos: 'Pasos a Seguir', speechs: 'Speechs',
                objeciones: 'Objeciones', conversacion: 'Conversaciones',
                aseguradoras: 'Aseguradoras', lesiones: 'Lesiones', prolegal: 'Prolegal',
                transito: 'Tránsito', mapeo: 'Estudios Jurídicos',
              }} />
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
              <div className="config-section-title">Sugerencias</div>
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
              <div className="config-section-title">Sugerencias</div>
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
              <div className="config-section-title">Sugerencias</div>
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
              <div className="config-section-title">Sugerencias</div>
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
                      Restaurar
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
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}>
                              Jornada
                            </span>
                          )}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          {b.counts?.cases || 0} casos · {b.counts?.notes || 0} notas ·{" "}
                          {b.counts?.events || 0} eventos · {b.sizeKB || "?"} KB
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 items-center">
                        <Btn
                          onClick={() => handleRestoreFromHistory(b.id)}
                          size="sm"
                          color="var(--color-accent)"
                          icon={confirmRestoreBackupId === b.id ? AlertTriangle : Download}
                          disabled={loading}
                        >
                          {confirmRestoreBackupId === b.id ? "Confirmar" : "Restaurar"}
                        </Btn>
                        {confirmRestoreBackupId === b.id && <span className="text-xs" style={{ color: "var(--color-warning)" }}>Haz clic de nuevo</span>}
                        <BtnOutline
                          onClick={() => handleDeleteBackup(b.id)}
                          size="sm"
                          color="var(--color-danger)"
                          icon={confirmDeleteBackupId === b.id ? AlertTriangle : Trash2}
                        >
                          {confirmDeleteBackupId === b.id ? "Confirmar" : "Eliminar"}
                        </BtnOutline>
                        {confirmDeleteBackupId === b.id && <span className="text-xs" style={{ color: "var(--color-warning)" }}>Haz clic de nuevo</span>}
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
                <div className="relative">
                  <label
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors hover:opacity-70"
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid var(--color-accent)",
                      color: "var(--color-accent)",
                      opacity: _importOn("utilesJson") ? 1 : 0.4,
                      pointerEvents: _importOn("utilesJson") ? "auto" : "none",
                    }}
                    title={_importOn("utilesJson") ? undefined : "Deshabilitado en Avanzado > Importación"}
                  >
                    <Upload size={13} /> Importar
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfig}
                      className="hidden"
                      disabled={!_importOn("utilesJson")}
                    />
                  </label>
                </div>
                <BtnOutline
                  onClick={handleEliminarUtiles}
                  color="var(--color-danger)"
                  size="sm"
                  icon={confirmDeleteUtiles ? AlertTriangle : Trash2}
                >
                  {confirmDeleteUtiles ? "Confirmar" : "Eliminar"}
                </BtnOutline>
                {confirmDeleteUtiles && <span className="text-xs" style={{ color: "var(--color-warning)" }}>Haz clic de nuevo para confirmar</span>}
              </div>
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
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={selectAllMonths}
                    className="px-2 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={clearMonths}
                    className="px-2 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Limpiar selección
                  </button>
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
                              ? "bg-[var(--color-accent)] text-[#14181F]"
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
                <BtnOutline
                  onClick={handleEliminarCasos}
                  color="var(--color-danger)"
                  size="sm"
                  icon={confirmDeleteCases ? AlertTriangle : Trash2}
                >
                  {confirmDeleteCases ? "Confirmar" : "Eliminar"}
                </BtnOutline>
                {confirmDeleteCases && (
                  <span className="text-xs" style={{ color: "var(--color-warning)" }}>
                    Haz clic de nuevo para confirmar
                  </span>
                )}
              </div>
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
              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                <Btn onClick={handleDeleteNotes} color="var(--color-danger)" size="sm" icon={confirmDeleteNotes ? AlertTriangle : Trash2}>
                  {confirmDeleteNotes ? "Confirmar" : "Eliminar notas"}
                </Btn>
                {confirmDeleteNotes && <span className="text-xs" style={{ color: "var(--color-warning)" }}>Haz clic de nuevo para confirmar</span>}
                <Btn onClick={handleDeleteEvents} color="var(--color-danger)" size="sm" icon={confirmDeleteEvents ? AlertTriangle : Trash2}>
                  {confirmDeleteEvents ? "Confirmar" : "Eliminar eventos"}
                </Btn>
                {confirmDeleteEvents && <span className="text-xs" style={{ color: "var(--color-warning)" }}>Haz clic de nuevo para confirmar</span>}
              </div>
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
                    <Btn onClick={handleEliminarTodos} color="var(--color-danger)" size="sm" icon={AlertTriangle} disabled={confirmFinal && deleteKeyword !== "ELIMINAR"}>
                      {confirmFinal ? "ULTIMA CONFIRMACION" : confirmEliminar ? "Confirmar eliminacion" : "Eliminar todos los datos"}
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
              <div className="config-section-title">Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Exportá respaldos periódicos de los datos antes de hacer limpieza general.</p>
                <p>• La importación de notas y eventos en JSON preserva todas las relaciones.</p>
                <p>• Usá "Exportar CSV" para compartir datos con otras herramientas sin perder información.</p>
              </div>
            </div>
          </div>
        );
      }

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
              <div className="config-section-title">Sugerencias</div>
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

        const actualizarTipo = (idx, valor) => {
          const next = [...tiposList];
          next[idx] = valor;
          actualizarConfig("tiposIngreso", next);
        };

        const agregarTipo = () => {
          actualizarConfig("tiposIngreso", [...tiposList, ""]);
        };

        const eliminarTipo = (idx) => {
          actualizarConfig("tiposIngreso", tiposList.filter((_, i) => i !== idx));
        };

        const restaurarTipos = () => {
          actualizarConfig("tiposIngreso", TIPOS_INGRESO_SUGERIDOS);
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
                Enfermedad Profesional, etc.).
              </div>
              <div className="space-y-2">
                {tiposList.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2" style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px" }}>
                    <TextInput
                      value={t || ""}
                      onChange={(ev) => actualizarTipo(idx, ev.target.value)}
                      className="flex-1"
                      placeholder="Nombre del tipo de ingreso"
                    />
                    <button
                      onClick={() => eliminarTipo(idx)}
                      className="p-1.5 rounded transition-colors hover:bg-[var(--color-surface)]"
                      style={{ color: "var(--color-danger)" }}
                      aria-label={`Eliminar ${t}`}
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
              <div className="config-section-title">Sugerencias</div>
              <div className="text-xs space-y-1" style={{ color: "var(--color-text-muted)" }}>
                <p>• Los tipos de ingreso aparecen como opciones al registrar un caso.</p>
                <p>• Podés mantenerlos ordenados: el orden de la lista es el orden de los desplegables.</p>
              </div>
            </div>
          </div>
        );

      case "diagnostico":
        return <SystemLogs />;

      default:
        return null;
    }
  };

  return (
    <><div className="space-y-4">
      <div className="flex flex-wrap gap-1 mb-3">
        {GRUPOS_CONFIG.map((g) => (
          <button
            key={g.id}
            onClick={() => cambiarGrupo(g.id)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors hover:opacity-70 ${
              grupoActivo === g.id
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <g.icon size={14} /> {g.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          minHeight: 300,
        }}
      >
        <div className="flex items-center gap-1 mb-4 pb-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          {GRUPOS_CONFIG.find((g) => g.id === grupoActivo)?.items.map((s) => (
            <button
              key={s.id}
              onClick={() => cambiarSubseccion(s.id)}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors hover:opacity-70 ${
                seccion === s.id
                  ? "bg-[var(--color-surface2)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <s.icon size={12} /> {s.label}
            </button>
          ))}
        </div>
        {renderSeccion()}
      </div>
    </div>

      {showImportPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowImportPreview(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl rounded-xl flex flex-col"
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
                onClick={() => setShowImportPreview(false)}
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
                          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
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
                <BtnOutline onClick={() => setShowImportPreview(false)} size="sm" color="var(--color-text-muted)">
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowUtilesPreview(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl flex flex-col"
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
                </div>
              </div>
              <button
                onClick={() => setShowUtilesPreview(false)}
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
                          {formatUtilesValue(utilesPreviewData.config[key]) || (
                            <span style={{ color: "var(--color-text-muted)" }}>&mdash;</span>
                          )}
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
                {utilesPreviewData.keys.length} configuraciones a importar
              </span>
              <div className="flex gap-2">
                <BtnOutline onClick={() => setShowUtilesPreview(false)} size="sm" color="var(--color-text-muted)">
                  Cancelar
                </BtnOutline>
                <Btn onClick={handleUtilesPreviewImport} size="sm" icon={Upload} disabled={loading}>
                  {loading ? "Importando..." : `Importar ${utilesPreviewData.keys.length} configuraciones`}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNcPreview && ncPreviewData && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowNcPreview(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-xl flex flex-col"
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
                onClick={() => setShowNcPreview(false)}
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
                <BtnOutline onClick={() => setShowNcPreview(false)} size="sm" color="var(--color-text-muted)">
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

  const TAB_MAP_CFG = {
    analitica: { id: 'analitica', label: 'Analítica', icon: BarChart3 },
    resumen: { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    rendimiento: { id: 'rendimiento', label: 'Rendimiento', icon: BarChart3 },
    geografia: { id: 'geografia', label: 'Geografía', icon: MapPin },
    estudios: { id: 'estudios', label: 'Estudios', icon: Building2 },
    estados: { id: 'estados', label: 'Estados', icon: CircleDot },
  };

  const WIDGET_REGISTRY_CFG = {
    resumen: {
      alertBanner: { label: 'Alertas automáticas' },
      quickActions: { label: 'Acciones rápidas' },
      analyticHeader: { label: 'Encabezado analítico' },
      generalMetrics: { label: 'Métricas generales' },
      alertsPanel: { label: 'Alertas' },
      activityFeed: { label: 'Actividad reciente' },
      eventos: { label: 'Próximos eventos' },
      sinReporte: { label: 'Casos sin reporte' },
      notas: { label: 'Notas recientes' },
      resumen: { label: 'Resumen rápido' },
      ultimosCasos: { label: 'Últimos casos' },
      miDia: { label: 'Mi día' },
    },
    rendimiento: {
      perfMetrics: { label: 'Métricas de performance' },
      timeMetrics: { label: 'Métricas de tiempo' },
      logroObjetivos: { label: 'Logro de Objetivos' },
    },
    geografia: {
      provinciasTable: { label: 'Tabla de provincias' },
      topProvincias: { label: 'Mejores provincias' },
      vistaMapa: { label: 'Mapa de casos' },
    },
    estudios: {
      estudiosTable: { label: 'Tabla de estudios' },
      topEstudios: { label: 'Mejores estudios' },
    },
    estados: {
      estadosTable: { label: 'Distribución por estado' },
    },
  };

  const DEFAULT_WIDGET_ORDER_CFG = Object.fromEntries(
    Object.entries(WIDGET_REGISTRY_CFG).map(([tab, widgets]) => [
      tab,
      Object.keys(widgets),
    ])
  );

  const moveTab = (from, to) => {
    if (from === to) return;
    const next = [...tabOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTabOrder(next);
  };

  const moveWidget = (tabId, from, to) => {
    if (from === to) return;
    const order = [...(dashWidgetOrder[tabId] || DEFAULT_WIDGET_ORDER_CFG[tabId])];
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
    <div className="space-y-1">
      {tabOrder.map((id, idx) => {
        const t = TAB_MAP_CFG[id];
        if (!t) return null;
        const hasWidgets = !!WIDGET_REGISTRY_CFG[id];
        const isExpanded = hasWidgets && expandedTab === id;
        const wOrder = dashWidgetOrder[id] || DEFAULT_WIDGET_ORDER_CFG[id] || [];
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
                  const wDef = WIDGET_REGISTRY_CFG[id]?.[wid];
                  if (!wDef) return null;
                  const isWOver = dragOverIdx === wIdx && dragType === 'widget' && dragTabId === id;
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
function ViewSectionEditor({ items, setItems, labels }) {
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
            <span className="text-[11px] flex-1" style={{ color: 'var(--color-text)' }}>{labels[id] || id}</span>
          </div>
        );
      })}
    </div>
  );
}
