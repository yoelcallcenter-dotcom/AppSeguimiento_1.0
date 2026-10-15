import React, { useState, useMemo, useCallback, useRef } from "react";
// 1.10.1 (rediseño completo del sidebar): ahora sigue el patrón REAL del
// sidebar de Filtros (FilterModal) — MultiSelect multi-valor para Aseguradora,
// Estudio Jurídico y Localidad (antes <select> single y texto libre),
// chips de estado con estilo Pill legible (antes fondo sólido e.accent con
// texto blanco: contraste pobre en estados claros) y cuerpo en 1 columna
// (antes grillas de 2 columnas que desbordaban el panel angosto).
import { FileSpreadsheet, Check, BarChart3, RotateCcw } from "lucide-react";
import useAppStore from "../../core/store/useAppStore";
import { getEstados } from "../../utils/catalogos";
import { CSV_HEADERS } from "../../utils/backup/constants";
import { escapeCSV, sanitizeCSV } from "../../utils/backup/csvUtils";
import { Btn, OutlineButton } from "../../components/common/Btn";
import { SidePanel } from "../../components/common/SidePanel";
import { FilterChip, FilterGroup, FilterCounter } from "../../components/common/filters";
import { MultiSelect } from "../../components/common/MultiSelect";
import casesDB from "../../core/db/casesDB";
import appDB from "../../core/db/appDB";
import { buildCsvAnalitico } from "./csvAnalitico";
import { getOperatorAvailability } from "../operator/operatorStore";

const CAMPOS = [
  "id", "fecha", "nombre", "telefono", "localidad", "aseguradora",
  "profesion", "ingreso", "lesion", "tipoIngreso", "cita", "estado",
  "estudioJuridico", "observaciones",
];

function formatearReportes(reportes) {
  if (!reportes || reportes.length === 0) return "";
  return reportes
    .map((r) => {
      const origen = r.origen ? `[${r.origen}] ` : "";
      return `(${r.fecha}) ${origen}${r.texto}`;
    })
    .join(" // ");
}

function formatearComentarios(comentarios) {
  if (!comentarios || comentarios.length === 0) return "";
  return comentarios.map((c) => `(${c.fecha}) ${c.texto}`).join(" // ");
}

export function CsvExportModal({ open, onClose, showToast }) {
  const casos = useAppStore((s) => s.cases);
  const config = useAppStore((s) => s.config);
  // 1.10.1: ref del SidePanel para cerrar con la animación de drawer
  // (startClose, 250 ms) como en FilterModal — antes onClose directo y el
  // panel desaparecía de golpe.
  const panelRef = useRef(null);

  const [estadosSeleccionados, setEstadosSeleccionados] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  // 1.10.1 (rediseño): multi-valor como el FilterModal — permite exportar,
  // por ejemplo, dos aseguradoras a la vez (antes era un <select> single).
  const [aseguradoras, setAseguradoras] = useState([]);
  const [estudios, setEstudios] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [tipoExport, setTipoExport] = useState("casos");
  const [exportando, setExportando] = useState(false);

  const estados = useMemo(() => getEstados(config), [config]);

  const aseguradorasUnicas = useMemo(() => {
    const set = new Set(casos.map((c) => c.aseguradora).filter(Boolean));
    return [...set].sort();
  }, [casos]);

  const estudiosUnicos = useMemo(() => {
    const set = new Set(casos.map((c) => c.estudioJuridico).filter(Boolean));
    return [...set].sort();
  }, [casos]);

  const localidadesUnicas = useMemo(() => {
    const set = new Set(casos.map((c) => c.localidad).filter(Boolean));
    return [...set].sort();
  }, [casos]);

  const casosFiltrados = useMemo(() => {
    return casos.filter((c) => {
      if (estadosSeleccionados.length > 0 && !estadosSeleccionados.includes(c.estado)) return false;
      if (fechaDesde && (c.fecha || "") < fechaDesde) return false;
      if (fechaHasta && (c.fecha || "") > fechaHasta) return false;
      // 1.10.1 (rediseño): match exacto multi-valor (como FilterModal);
      // antes Aseguradora/Estudio eran selects single y Localidad substring.
      if (aseguradoras.length > 0 && !aseguradoras.includes(c.aseguradora)) return false;
      if (estudios.length > 0 && !estudios.includes(c.estudioJuridico)) return false;
      if (localidades.length > 0 && !localidades.includes(c.localidad)) return false;
      return true;
    });
  }, [casos, estadosSeleccionados, fechaDesde, fechaHasta, aseguradoras, estudios, localidades]);

  const toggleEstado = useCallback((v) => {
    setEstadosSeleccionados((prev) =>
      prev.includes(v) ? prev.filter((e) => e !== v) : [...prev, v]
    );
  }, []);

  const limpiarFiltros = useCallback(() => {
    setEstadosSeleccionados([]);
    setFechaDesde("");
    setFechaHasta("");
    setAseguradoras([]);
    setEstudios([]);
    setLocalidades([]);
  }, []);

  const hasFilters = estadosSeleccionados.length > 0 || fechaDesde || fechaHasta || aseguradoras.length > 0 || estudios.length > 0 || localidades.length > 0;

  const handleExport = useCallback(async () => {
    if (casosFiltrados.length === 0) return;
    setExportando(true);
    try {
      if (tipoExport === "analitico") {
        const hoy = new Date();
        const desde = fechaDesde ? new Date(fechaDesde + "T00:00:00") : new Date(hoy.getFullYear(), 0, 1);
        const hasta = fechaHasta ? new Date(fechaHasta + "T23:59:59") : new Date(hoy);
        const isoDe = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        };
        const rango = {
          id: "personalizado",
          label: "Período seleccionado",
          startISO: isoDe(desde),
          endISO: isoDe(hasta),
        };
        const csv = buildCsvAnalitico(casosFiltrados, config, {
          fecha: hoy,
          rango,
          availability: getOperatorAvailability() || {},
        });
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AppSeguimiento_Analitico_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`CSV analítico exportado (${casosFiltrados.length} caso(s))`, "success");
        // 1.10.1: cierre animado (startClose) en vez de onClose directo.
        panelRef.current?.startClose();
        return;
      }
      const serializarNotas = (notas) => {
        if (!notas || notas.length === 0) return '';
        return notas.map((n) => `${n.titulo || n.title || ''}: ${n.contenido || n.content || ''} (${n.fecha || ''})`).join(' // ');
      };
      const serializarAgenda = (eventos) => {
        if (!eventos || eventos.length === 0) return '';
        return eventos.map((e) => {
          const fecha = e.fecha || (e.startDate ? e.startDate.slice(0, 10) : '');
          return `${e.titulo || e.title || ''} (${fecha})`;
        }).join(' // ');
      };
      const serializarHistorial = (eventos) => {
        if (!eventos || eventos.length === 0) return '';
        return eventos.map((e) => {
          const fecha = e.timestamp ? new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ') : '';
          return `${fecha}|${e.type || ''}|${e.title || ''}|${e.description || ''}`;
        }).join('; ');
      };

      const allNotes = await appDB.notes.toArray();
      const allEvents = await appDB.events.toArray();
      const allHistory = await casesDB.case_history.toArray();

      const rows = await Promise.all(casosFiltrados.map(async (c) => {
        const base = CAMPOS.map((campo) => escapeCSV(sanitizeCSV(c[campo] || "")));
        const notas = allNotes.filter((n) => (n.relatedCaseIds || []).includes(c.id));
        const eventos = allEvents.filter((e) => (e.relatedCaseIds || []).includes(c.id));
        const historial = allHistory.filter((h) => h.caseId === c.id);
        const extras = [
          (c.tags || []).join("; "),
          formatearReportes(c.reporteHistory),
          formatearComentarios(c.comentarios),
          serializarNotas(notas),
          serializarAgenda(eventos),
          serializarHistorial(historial),
        ].map((v) => escapeCSV(sanitizeCSV(v)));
        return [...base, ...extras].join(",");
      }));

      const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = estadosSeleccionados.length === 1 ? `_${estadosSeleccionados[0]}` : "";
      a.download = `AppSeguimiento_Casos${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`CSV exportado: ${casosFiltrados.length} caso(s)`, "success");
      // 1.10.1: cierre animado (startClose) en vez de onClose directo.
      panelRef.current?.startClose();
    } catch {
      showToast("Error al exportar CSV", "error");
    } finally {
      setExportando(false);
    }
  }, [casosFiltrados, estadosSeleccionados, tipoExport, fechaDesde, fechaHasta, config, showToast]);

  if (!open) return null;

  return (
    <SidePanel
      ref={panelRef}
      isOpen={open}
      onClose={onClose}
      title="Exportar casos a CSV"
      icon={FileSpreadsheet}
      footer={
        // C02d (1.10.1): antes era UNA fila `justify-between` + `flex-wrap`
        // con el contador (que arrastraba un `pb-2.5` interno) y 3 botones:
        // en el ancho mínimo del panel (320px) "Limpiar filtros" + "Cancelar"
        // + "Exportar CSV" no entran, la fila hacía wrap y los botones
        // quedaban pisados/cortados contra el contador. Ahora es una columna:
        // fila 1 = contador + "Limpiar filtros" (asociados a los filtros),
        // fila 2 = Cancelar + Exportar alineados a la derecha (2 botones
        // caben siempre en 320px; si aun así hiciera wrap, lo hace en su
        // propia línea sin tocar al contador).
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <FilterCounter
              total={casosFiltrados.length}
              label="caso"
              className=""
            />
            {/* Mismo estilo que "Limpiar sección" del sidebar de Filtros. */}
            {hasFilters && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                style={{
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface2)",
                }}
              >
                <RotateCcw size={12} />
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <OutlineButton onClick={() => panelRef.current?.startClose()} size="sm">
              Cancelar
            </OutlineButton>
            <Btn
              onClick={handleExport}
              disabled={casosFiltrados.length === 0}
              loading={exportando}
              icon={FileSpreadsheet}
              size="sm"
              color="var(--color-success)"
              textColor="#ffffff"
            >
              Exportar CSV
            </Btn>
          </div>
        </div>
      }
    >
      {/* 1.10.1 (rediseño): cuerpo idéntico en estructura al FilterModal —
          1 columna de FilterGroup + MultiSelect multi-valor. Los chips de
          estado conservan el color real de cada estado (mejor UX que un
          MultiSelect genérico) pero con estilo Pill legible: fondo tintado
          13.3%, texto del color y borde del color — antes fondo sólido
          e.accent con texto blanco, ilegible en estados claros. */}
      <div className="p-4 grid grid-cols-1 gap-4">
        <FilterGroup label="Tipo de export">
          <div className="grid grid-cols-2 gap-2">
            <FilterChip
              active={tipoExport === "casos"}
              onClick={() => setTipoExport("casos")}
              title="Detalle por caso"
              className="justify-center"
            >
              <FileSpreadsheet size={11} />
              Detalle por caso
            </FilterChip>
            <FilterChip
              active={tipoExport === "analitico"}
              onClick={() => setTipoExport("analitico")}
              title="Analítico (resumen)"
              className="justify-center"
            >
              <BarChart3 size={11} />
              Analítico (resumen)
            </FilterChip>
          </div>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {tipoExport === "analitico"
              ? "Resumen KPIs del período (desde/hasta; sin fechas: año actual)."
              : "Una fila por caso con todos los campos, reportes, notas e historial."}
          </span>
        </FilterGroup>

        <FilterGroup label="Estado">
          {/* 1.10.1: chips en grilla de 2 columnas y tamaño un poco mayor
              (11px / padding 6-10, antes 10px / 4-8 de FilterChip). Antes
              eran flex-wrap: con 14 estados de anchos distintos las filas
              quedaban irregulares, con huecos vacíos y saltos de línea
              feos. La grilla alinea las dos columnas y todos los chips
              ocupan su celda (justify-center). El size va por style inline
              porque gana determinísticamente sobre las clases Tailwind. */}
          <div className="grid grid-cols-2 gap-1.5">
            {estados.map((e) => {
              const sel = estadosSeleccionados.includes(e.v);
              return (
                <FilterChip
                  key={e.v}
                  active={sel}
                  onClick={() => toggleEstado(e.v)}
                  className="justify-center"
                  style={
                    sel
                      ? {
                          fontSize: "11px",
                          padding: "6px 10px",
                          backgroundColor: `color-mix(in srgb, ${e.accent} 13.3%, transparent)`,
                          color: e.accent,
                          borderColor: e.accent,
                        }
                      : { fontSize: "11px", padding: "6px 10px" }
                  }
                >
                  {sel && <Check size={12} />}
                  {e.v}
                </FilterChip>
              );
            })}
          </div>
        </FilterGroup>

        <FilterGroup label="Fecha desde" htmlFor="csv-fechaDesde">
          <input
            id="csv-fechaDesde"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="input-optimized text-xs"
          />
        </FilterGroup>

        <FilterGroup label="Fecha hasta" htmlFor="csv-fechaHasta">
          <input
            id="csv-fechaHasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="input-optimized text-xs"
          />
        </FilterGroup>

        <FilterGroup label="Aseguradora">
          <MultiSelect
            id="csv-aseguradora"
            value={aseguradoras}
            onChange={setAseguradoras}
            options={aseguradorasUnicas.map((a) => ({ value: a, label: a }))}
            placeholder="Todas"
          />
        </FilterGroup>

        <FilterGroup label="Estudio Jurídico">
          <MultiSelect
            id="csv-estudio"
            value={estudios}
            onChange={setEstudios}
            options={estudiosUnicos.map((ej) => ({ value: ej, label: ej }))}
            placeholder="Todos"
          />
        </FilterGroup>

        <FilterGroup label="Localidad">
          <MultiSelect
            id="csv-localidad"
            value={localidades}
            onChange={setLocalidades}
            options={localidadesUnicas.map((l) => ({ value: l, label: l }))}
            placeholder="Todas"
          />
        </FilterGroup>
      </div>
    </SidePanel>
  );
}
