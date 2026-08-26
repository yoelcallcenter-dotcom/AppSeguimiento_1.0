import React, { useState, useMemo, useCallback } from "react";
import { Download, X, Check } from "lucide-react";
import useAppStore from "../../core/store/useAppStore";
import { getEstados } from "../../utils/catalogos";
import { CSV_HEADERS } from "../../utils/backup/constants";
import { escapeCSV, sanitizeCSV } from "../../utils/backup/csvUtils";
import { Btn, OutlineButton } from "../../components/common/Btn";

const CAMPOS = [
  "id", "fecha", "nombre", "telefono", "localidad", "aseguradora",
  "profesion", "ingreso", "lesion", "tipoIngreso", "cita", "estado",
  "estudioJuridico", "observaciones",
];

function formatearReportes(reportes) {
  if (!reportes || reportes.length === 0) return "";
  return reportes.map((r) => `(${r.fecha}) ${r.texto}`).join(" // ");
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
      const rows = casosFiltrados.map((c) => {
        const base = CAMPOS.map((campo) => escapeCSV(sanitizeCSV(c[campo] || "")));
        const extras = [
          (c.tags || []).join("; "),
          formatearReportes(c.reporteHistory),
          formatearComentarios(c.comentarios),
          "",
          "",
        ].map((v) => escapeCSV(sanitizeCSV(v)));
        return [...base, ...extras].join(",");
      });

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
  }, [casosFiltrados, estadosSeleccionados, showToast, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-export-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl my-6 animate-scale-in max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="modal-header flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2" id="csv-export-title">
            <Download size={18} style={{ color: "var(--color-accent)" }} />
            <span className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              Exportar casos a CSV
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" aria-label="Cerrar">
            <X size={18} style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
                Estado
              </label>
              <div className="flex flex-wrap gap-1">
                {estados.map((e) => {
                  const sel = estadosSeleccionados.includes(e.v);
                  return (
                    <button
                      key={e.v}
                      onClick={() => toggleEstado(e.v)}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full transition-colors"
                      style={{
                        backgroundColor: sel ? e.accent : "var(--color-surface)",
                        color: sel ? "#14181F" : "var(--color-text-muted)",
                        border: `1px solid ${sel ? e.accent : "var(--color-border)"}`,
                      }}
                    >
                      {sel && <Check size={10} />}
                      {e.v}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded border"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded border"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
                Aseguradora
              </label>
              <select
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
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
                Estudio Jurídico
              </label>
              <select
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

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>
                Localidad
              </label>
              <input
                type="text"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Filtrar por localidad..."
                className="w-full text-xs px-2 py-1.5 rounded border"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Se exportarán{" "}
              <span className="font-bold" style={{ color: "var(--color-accent)" }}>
                {casosFiltrados.length}
              </span>{" "}
              caso(s)
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
          <div className="flex gap-2">
            <OutlineButton onClick={onClose} size="sm">
              Cancelar
            </OutlineButton>
            <Btn
              onClick={handleExport}
              disabled={casosFiltrados.length === 0}
              loading={exportando}
              icon={Download}
              size="sm"
              color="var(--color-success)"
              textColor="#ffffff"
            >
              Exportar CSV
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
