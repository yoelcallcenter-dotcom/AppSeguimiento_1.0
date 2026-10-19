import React, { useState, useCallback, useMemo, useEffect } from "react";
// R01 (1.10.1): iconos/controles de la barra de reportes guardados.
import { FileText, Save, Copy, Pencil, Trash2, RotateCcw, Download } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { MonthDayFilterBar } from "../common/MonthDayFilterBar";
import { Paginacion } from "../common/Paginacion";
import { PipelineBar } from "../kanban/PipelineBar";
import { OrigenBadge } from "../common/OrigenBadge";
import { sanitizeString } from "../../utils/sanitize";
import { PhoneLink } from "../common/PhoneLink";
import { EmptyState } from "../common/EmptyState";
import { useStorage } from "../../hooks/useStorage";
import { ESTADOS } from "../../utils/constants";
import { casoVieneDeReporte } from "../../utils/dateFilters";
import { useFilters } from "../../context/FiltersContext";
import { onKeyActivate } from "../../utils/a11y";
import useAppStore from '../../core/store/useAppStore';
import { aplicarFiltros } from "../../features/dashboard/computeMetrics";
import {
  getAllReports,
  createReport,
  updateReport,
  deleteReport,
  duplicateReport,
} from "../../features/reportes/savedReportsStore";
import { exportarReporteCSV } from "../../features/reportes/exportarReporteCSV";
// R01 (1.10.1): la barra "Reportes guardados" volvió a la UI (antes solo
// existía el CRUD en Dexie, sin render — ver sección {/* R01 */} abajo).
import { SectionHeader } from "../configuracion/ui";

const FILTROS_DEFAULT = {
  estado: "todos",
  aseguradora: "todos",
  localidad: "todos",
  estudio: "todos",
  tipo: "todos",
};

export function ReportesView({ casos, casosBase = [], casosMes, onVerCaso, mesesDisponibles = [], setConfig, showToast, busqueda = "", onBusquedaChange }) {
  // X01 (1.10.1): la búsqueda del header ya no vive en FiltersContext (estado
  // muerto que repintaba a todos); viaja como props desde App (busqueda =
  // valor debounceado, onBusquedaChange = setter del header) y se usa para el
  // snapshot y para restaurar la búsqueda al aplicar un reporte guardado.
  const { selectedMonth, selectedYear, selectedDays, setSelectedMonth, setSelectedYear, setSelectedDays } = useFilters();
  const [paginaActual, setPaginaActual] = useState(1);
  const [config] = useStorage("config-art-tracker", {});
  const casosPorPagina = config.casosPorPagina || 50;
  const [reportes, setReportes] = useState([]);
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [filtrosPanel, setFiltrosPanel] = useState(FILTROS_DEFAULT);
  // R01 (1.10.1): estados de la UI de "Reportes guardados" (antes el CRUD
  // existía pero ningún componente lo renderizaba).
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNombre, setEditandoNombre] = useState("");
  const [eliminarId, setEliminarId] = useState(null);

  // Último reporte: el más recientemente cargado (último del array)
  const obtenerUltimoReporte = (reporteHistory) => {
    if (!reporteHistory || reporteHistory.length === 0) return null;
    return reporteHistory[reporteHistory.length - 1];
  };

  // ============ REPORTES GUARDADOS (1.7.10) ============
  const loadReportes = useCallback(async () => {
    const lista = await getAllReports();
    setReportes(lista);
  }, []);

  useEffect(() => {
    loadReportes();
  }, [loadReportes]);

  const seleccionado = reportes.find((r) => String(r.id) === String(seleccionadoId)) || null;

  // Snapshot actual: captura los filtros usados para armar el listado.
  const snapshotActual = useMemo(
    () => ({
      mes: selectedMonth,
      anio: selectedYear,
      dias: selectedDays,
      estado: filtrosPanel.estado,
      aseguradora: filtrosPanel.aseguradora,
      localidad: filtrosPanel.localidad,
      estudio: filtrosPanel.estudio,
      tipo: filtrosPanel.tipo,
      busqueda,
      busquedaFiltro: config.busquedaFiltro || "todos",
    }),
    [selectedMonth, selectedYear, selectedDays, busqueda, filtrosPanel, config.busquedaFiltro]
  );

  // Filtros de panel aplicados con la misma lógica que el resto del sistema.
  const casosConFiltros = useMemo(
    () => aplicarFiltros(casos, filtrosPanel),
    [casos, filtrosPanel]
  );

  const filtrosOptions = useMemo(() => {
    const unicos = (campo) =>
      Array.from(new Set(casos.map((c) => (c[campo] || "").trim()).filter(Boolean))).sort();
    return {
      estados: unicos("estado"),
      aseguradoras: unicos("aseguradora"),
      localidades: unicos("localidad"),
      estudios: unicos("estudioJuridico"),
      tipos: unicos("tipoIngreso"),
    };
  }, [casos]);

  const aplicarReporte = useCallback(
    (reporte) => {
      const snap = reporte.snapshot || {};
      if (snap.mes !== undefined) setSelectedMonth(snap.mes);
      if (snap.anio !== undefined) setSelectedYear(snap.anio);
      if (Array.isArray(snap.dias)) setSelectedDays(snap.dias);
      // X01 (1.10.1): la búsqueda la escribe App (header), vía prop.
      if (onBusquedaChange) onBusquedaChange(snap.busqueda || "");
      if (setConfig && snap.busquedaFiltro) {
        setConfig({ ...config, busquedaFiltro: snap.busquedaFiltro });
      }
      setFiltrosPanel({
        estado: snap.estado || "todos",
        aseguradora: snap.aseguradora || "todos",
        localidad: snap.localidad || "todos",
        estudio: snap.estudio || "todos",
        tipo: snap.tipo || "todos",
      });
      setPaginaActual(1);
      setSeleccionadoId(reporte.id);
    },
    [setSelectedMonth, setSelectedYear, setSelectedDays, onBusquedaChange, setConfig, config]
  );

  const handleApply = useCallback(
    async (id) => {
      if (!id) {
        setSeleccionadoId(null);
        setFiltrosPanel(FILTROS_DEFAULT);
        setPaginaActual(1);
        return;
      }
      const reporte = reportes.find((r) => String(r.id) === String(id));
      if (!reporte) return;
      aplicarReporte(reporte);
      if (showToast) showToast(`Reporte aplicado: ${reporte.nombre}`, "success");
    },
    [reportes, aplicarReporte, showToast]
  );

  const handleSave = useCallback(
    async (nombre, { reemplazarId }) => {
      try {
        if (reemplazarId) {
          await updateReport(reemplazarId, { nombre, snapshot: snapshotActual });
          setSeleccionadoId(reemplazarId);
          if (showToast) showToast("Reporte reemplazado", "success");
        } else {
          const nuevo = await createReport(nombre, snapshotActual);
          setSeleccionadoId(nuevo.id);
          if (showToast) showToast("Reporte guardado", "success");
        }
        await loadReportes();
      } catch (error) {
        if (showToast) showToast("Error al guardar el reporte", "error");
      }
    },
    [snapshotActual, loadReportes, showToast]
  );

  const handleRename = useCallback(
    async (id, nombre) => {
      try {
        await updateReport(id, { nombre });
        await loadReportes();
        if (showToast) showToast("Reporte renombrado", "success");
      } catch (error) {
        if (showToast) showToast("Error al renombrar el reporte", "error");
      }
    },
    [loadReportes, showToast]
  );

  const handleDuplicate = useCallback(
    async (id) => {
      try {
        await duplicateReport(id);
        await loadReportes();
        if (showToast) showToast("Reporte duplicado", "success");
      } catch (error) {
        if (showToast) showToast("Error al duplicar el reporte", "error");
      }
    },
    [loadReportes, showToast]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteReport(id);
        if (String(seleccionadoId) === String(id)) setSeleccionadoId(null);
        await loadReportes();
        if (showToast) showToast("Reporte eliminado", "info");
      } catch (error) {
        if (showToast) showToast("Error al eliminar el reporte", "error");
      }
    },
    [seleccionadoId, loadReportes, showToast]
  );

  const handleExport = useCallback(() => {
    if (casosConFiltros.length === 0) return;
    exportarReporteCSV(casosConFiltros, seleccionado?.nombre || "reporte", {
      mes: selectedMonth,
      anio: selectedYear,
    });
    if (showToast) showToast("Reporte exportado en CSV", "success");
  }, [casosConFiltros, seleccionado, selectedMonth, selectedYear, showToast]);

  const handleMonthChange = useCallback(() => {
    setPaginaActual(1);
  }, []);

  // R01: envoltorios de la UI (validación de nombre y cierre del modo editar).
  const guardarVistaActual = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) {
      if (showToast) showToast("Poné un nombre para guardar la vista", "warning");
      return;
    }
    handleSave(nombre, { reemplazarId: null });
    setNuevoNombre("");
  };
  const confirmarRenombrado = () => {
    const nombre = editandoNombre.trim();
    if (nombre) handleRename(editandoId, nombre);
    setEditandoId(null);
    setEditandoNombre("");
  };

  const totalPaginas = Math.max(1, Math.ceil(casosConFiltros.length / casosPorPagina));
  const casosPagina = casosConFiltros.slice(
    (paginaActual - 1) * casosPorPagina,
    paginaActual * casosPorPagina
  );

  const reportesSections = useAppStore((s) => s.reportesSections);
  const REPORTES_SECTIONS = {
    pipelineBar: () => casosBase.length > 0 && <PipelineBar casos={casosBase} config={config} />,
    lista: () => (
      <div className="space-y-3">
        {casosPagina.length === 0 ? (
          <EmptyState icon={FileText} message="No hay casos para mostrar." size="sm" />
        ) : (
          casosPagina.map((c) => {
            const ultimoReporte = obtenerUltimoReporte(c.reporteHistory);
            const est = ESTADOS.find(e => e.v === c.estado);
            const estadoColor = est?.accent || '#6B7280';
            const vieneDeReporte =
              selectedMonth >= 0 && selectedYear >= 0 &&
              casoVieneDeReporte(c, selectedMonth, selectedYear);
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver caso ${c.nombre || "Sin nombre"}`}
                className="rounded-lg overflow-hidden cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: vieneDeReporte
                    ? "1px dashed var(--color-accent)"
                    : "1px solid var(--color-border)",
                }}
                onClick={() => onVerCaso(c)}
                onKeyDown={onKeyActivate(() => onVerCaso(c))}
              >
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: estadoColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold truncate text-sm"
                          style={{ color: "var(--color-text)" }}
                        >
                          {sanitizeString(c.nombre || "Sin nombre")}
                        </span>
                        <span
                          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: c.leido === false ? estadoColor : 'transparent' }}
                        />
                      </div>
                      <div
                        className="flex items-center gap-3 text-xs mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <PhoneLink telefono={c.telefono} config={config} />
                        <span>{sanitizeString(c.localidad || "—")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 self-start">
                      {vieneDeReporte && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)", color: "var(--color-accent)", border: "1px dashed color-mix(in srgb, var(--color-accent) 40%, transparent)" }}
                          title="Aparece en este mes por su último reporte"
                        >
                          por reporte
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${estadoColor}14`, color: estadoColor, border: `1px solid ${estadoColor}22` }}
                      >
                        {c.estado}
                      </span>
                    </div>
                  </div>
                      {/* 1.10.3 (anti-doble-scrollbar): sin max-h-32 propio —
                          los últimos reportes se extienden y los baja el
                          único scroll de la página. */}
                      <div className="mt-2 pt-2 space-y-1.5" style={{ borderTop: "1px solid var(--color-border)" }}>
                    {!ultimoReporte ? (
                      <div
                        className="text-xs italic"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Sin reportes
                      </div>
                    ) : (
                      <div
                        className="text-xs leading-relaxed flex items-center gap-1.5"
                        style={{ color: "var(--color-text)" }}
                      >
                        <OrigenBadge origen={ultimoReporte.origen} size="md" />
                        <span style={{ color: estadoColor }}>
                          ▸ {sanitizeString(ultimoReporte.fecha)}{" "}
                        </span>
                        <span className="flex-1">{sanitizeString(ultimoReporte.texto)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    ),
    paginacion: () => totalPaginas > 1 && (
      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        setPaginaActual={setPaginaActual}
        totalItems={casosConFiltros.length}
      />
    ),
  };

  return (
    <div>
      <SectionHeader
        icon={FileText}
        titulo="Reportes"
        descripcion="Gestioná tus reportes guardados y el detalle de cada mes."
        storageKey="reportes"
        overlayCollapsed
      />
      <MonthDayFilterBar
        mesesDisponibles={mesesDisponibles}
        total={casosConFiltros.length}
        casos={casos}
        casosMes={casosMes}
        onMonthChange={handleMonthChange}
      />

      {/* R01 (1.10.1): "Reportes guardados" — el CRUD de saved_reports (desde
          1.7.10) no tenía UI desde algún refactor: la feature era completa e
          inalcanzable. Barra fija arriba de la lista: guardar la vista actual,
          aplicar/renombrar/duplicar/eliminar cada reporte y exportar el CSV del
          listado filtrado. (Antes: "#2 (1.8.6): sin barra Reportes guardados".) */}
      <div
        className="rounded-lg p-3 mb-3"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Reportes guardados
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardarVistaActual();
              }}
              placeholder="Nombre de la vista…"
              aria-label="Nombre del reporte a guardar"
              className="text-xs px-2 py-1.5 rounded-md w-44"
              style={{
                backgroundColor: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <Btn size="sm" icon={Save} onClick={guardarVistaActual}>
              Guardar vista
            </Btn>
            {seleccionado && (
              <BtnOutline
                size="sm"
                onClick={() => handleSave(seleccionado.nombre, { reemplazarId: seleccionado.id })}
                title={`Reemplazar los filtros de "${seleccionado.nombre}" por los actuales`}
              >
                Reemplazar
              </BtnOutline>
            )}
            {seleccionado && (
              <BtnOutline
                size="sm"
                icon={RotateCcw}
                onClick={() => handleApply(null)}
                title="Quitar el reporte aplicado y restablecer filtros"
              >
                Restablecer
              </BtnOutline>
            )}
            <BtnOutline
              size="sm"
              icon={Download}
              onClick={handleExport}
              title="Exportar el listado filtrado actual a CSV"
            >
              CSV
            </BtnOutline>
          </div>
        </div>

        {reportes.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Todavía no guardaste ninguna vista. Armá los filtros (mes, días, estado,
            búsqueda) y guardalos con un nombre para reutilizarlos después.
          </p>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {reportes.map((r) => {
              const activo = String(seleccionadoId) === String(r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors"
                  style={{
                    backgroundColor: activo
                      ? "color-mix(in srgb, var(--color-accent) 13.3%, transparent)"
                      : "var(--color-surface2)",
                    border: activo
                      ? "1px dashed var(--color-accent)"
                      : "1px solid var(--color-border)",
                  }}
                >
                  {editandoId === r.id ? (
                    <input
                      autoFocus
                      value={editandoNombre}
                      onChange={(e) => setEditandoNombre(e.target.value)}
                      onBlur={confirmarRenombrado}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarRenombrado();
                        if (e.key === "Escape") {
                          setEditandoId(null);
                          setEditandoNombre("");
                        }
                      }}
                      aria-label={`Nuevo nombre para ${r.nombre}`}
                      className="text-xs px-1 py-0.5 rounded w-36"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        border: "1px solid var(--color-accent)",
                        color: "var(--color-text)",
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => handleApply(r.id)}
                      className="text-xs font-medium max-w-48 truncate"
                      style={{ color: "var(--color-text)" }}
                      title={`Aplicar el reporte "${r.nombre}"`}
                      aria-pressed={activo}
                    >
                      {sanitizeString(r.nombre)}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditandoId(r.id);
                      setEditandoNombre(r.nombre || "");
                    }}
                    className="p-0.5 rounded transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                    aria-label={`Renombrar ${r.nombre}`}
                    title="Renombrar"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(r.id)}
                    className="p-0.5 rounded transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                    aria-label={`Duplicar ${r.nombre}`}
                    title="Duplicar"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onClick={() => setEliminarId(r.id)}
                    className="p-0.5 rounded transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-danger)" }}
                    aria-label={`Eliminar ${r.nombre}`}
                    title="Eliminar"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={eliminarId !== null}
          title="Eliminar reporte guardado"
          message={`¿Eliminar el reporte "${reportes.find((r) => String(r.id) === String(eliminarId))?.nombre || ""}"?`}
          confirmLabel="Eliminar"
          confirmColor="var(--color-danger)"
          onConfirm={async () => {
            await handleDelete(eliminarId);
            setEliminarId(null);
          }}
          onCancel={() => setEliminarId(null)}
        />
      </div>

      {/* Orden fijo 1.8.1: Pipeline Bar primero, luego Reportes guardados,
          y después las secciones restantes (lista, paginación) en el orden
          configurado por el usuario. */}
      {reportesSections.includes("pipelineBar") && REPORTES_SECTIONS.pipelineBar()}


      {reportesSections
        .filter((sec) => sec !== "pipelineBar")
        .map((sec) => {
          const fn = REPORTES_SECTIONS[sec];
          return fn ? <React.Fragment key={sec}>{fn()}</React.Fragment> : null;
        })}
    </div>
  );
}
