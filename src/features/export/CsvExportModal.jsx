import React, { useState, useMemo, useCallback, useRef } from "react";
import { FileSpreadsheet, Check, BarChart3 } from "lucide-react";
import useAppStore from "../../core/store/useAppStore";
import { getEstados } from "../../utils/catalogos";
import { CSV_HEADERS } from "../../utils/backup/constants";
import { escapeCSV, sanitizeCSV } from "../../utils/backup/csvUtils";
import { Btn, OutlineButton } from "../../components/common/Btn";
import { SidePanel } from "../../components/common/SidePanel";
import { FilterChip } from "../../components/common/filters";
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

  const [estadosSeleccionados, setEstadosSeleccionados] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [aseguradora, setAseguradora] = useState("");
  const [estudioJuridico, setEstudioJuridico] = useState("");
  const [localidad, setLocalidad] = useState("");
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
      if (aseguradora && c.aseguradora !== aseguradora) return false;
      if (estudioJuridico && c.estudioJuridico !== estudioJuridico) return false;
      if (localidad && !(c.localidad || "").toLowerCase().includes(localidad.toLowerCase())) return false;
      return true;
    });
  }, [casos, estadosSeleccionados, fechaDesde, fechaHasta, aseguradora, estudioJuridico, localidad]);

  const toggleEstado = useCallback((v) => {
    setEstadosSeleccionados((prev) =>
      prev.includes(v) ? prev.filter((e) => e !== v) : [...prev, v]
    );
  }, []);

  const limpiarFiltros = useCallback(() => {
    setEstadosSeleccionados([]);
    setFechaDesde("");
    setFechaHasta("");
    setAseguradora("");
    setEstudioJuridico("");
    setLocalidad("");
  }, []);

  const hasFilters = estadosSeleccionados.length > 0 || fechaDesde || fechaHasta || aseguradora || estudioJuridico || localidad;

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
        onClose();
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
      onClose();
    } catch {
      showToast("Error al exportar CSV", "error");
    } finally {
      setExportando(false);
    }
  }, [casosFiltrados, estadosSeleccionados, tipoExport, fechaDesde, fechaHasta, config, showToast, onClose]);

  if (!open) return null;

  return (
    <SidePanel
      isOpen={open}
      onClose={onClose}
      title="Exportar casos a CSV"
      icon={FileSpreadsheet}
      footer={
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {tipoExport === "analitico" ? "Resume " : "Se exportarán "}
              <span className="font-bold" style={{ color: "var(--color-accent)" }}>
                {casosFiltrados.length}
              </span>{" "}
              {tipoExport === "analitico" ? "caso(s) en el resumen analítico" : "caso(s)"}
            </span>
            {hasFilters && (
              <button
                onClick={limpiarFiltros}
                className="text-[10px] px-2 py-0.5 rounded hover:opacity-70"
                style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <OutlineButton onClick={onClose} size="sm">
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
      <div className="p-4 space-y-3">
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

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
            Estado
          </label>
          <div className="flex flex-wrap gap-1.5">
            {estados.map((e) => {
              const sel = estadosSeleccionados.includes(e.v);
              return (
                <FilterChip
                  key={e.v}
                  active={sel}
                  onClick={() => toggleEstado(e.v)}
                  style={sel ? { backgroundColor: e.accent, borderColor: e.accent } : {}}
                >
                  {sel && <Check size={10} />}
                  {e.v}
                </FilterChip>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="csv-fechaDesde" className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Fecha desde
            </label>
            <input
              id="csv-fechaDesde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
            />
          </div>
          <div>
            <label htmlFor="csv-fechaHasta" className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Fecha hasta
            </label>
            <input
              id="csv-fechaHasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="csv-aseguradora" className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Aseguradora
            </label>
            <select
              id="csv-aseguradora"
              value={aseguradora}
              onChange={(e) => setAseguradora(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
            >
              <option value="">Todas</option>
              {aseguradorasUnicas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="csv-estudioJuridico" className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
              Estudio Jurídico
            </label>
            <select
              id="csv-estudioJuridico"
              value={estudioJuridico}
              onChange={(e) => setEstudioJuridico(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
            >
              <option value="">Todos</option>
              {estudiosUnicos.map((ej) => (
                <option key={ej} value={ej}>{ej}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="csv-localidad" className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
            Localidad
          </label>
          <input
            id="csv-localidad"
            type="text"
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            placeholder="Filtrar por localidad..."
            className="w-full text-xs px-2 py-1.5 rounded border"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
          />
        </div>
      </div>
    </SidePanel>
  );
}
