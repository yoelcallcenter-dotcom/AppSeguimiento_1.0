import React, { useMemo } from "react";
import { X } from "lucide-react";

const StatCard = React.memo(({ label, value, color }) => (
  <div
    className="rounded-lg p-3 text-center"
    style={{
      backgroundColor: "var(--color-surface)",
      border: "1px solid var(--color-border)",
    }}
  >
    <div className="text-lg font-bold" style={{ color }}>
      {value}
    </div>
    <div
      className="text-[10px] uppercase tracking-wider"
      style={{ color: "var(--color-text-muted)" }}
    >
      {label}
    </div>
  </div>
));

export function GlobalStatsHeader({ casos, showTitle = true, quickFilter = null, onClearQuickFilter }) {
  const stats = useMemo(() => {
    const total = casos.length;
    const activos = casos.filter(
      (c) =>
        c.estado !== "No le interesa" &&
        c.estado !== "No viable" &&
        c.estado !== "Incontactable" &&
        c.estado !== "Firmo"
    ).length;
    const firmados = casos.filter((c) => c.estado === "Firmo").length;
    const sinReporte = casos.filter(
      (c) => !c.reporteHistory || c.reporteHistory.length === 0
    ).length;
    const noViables = casos.filter(
      (c) =>
        c.estado === "No le interesa" ||
        c.estado === "No viable" ||
        c.estado === "Incontactable" ||
        c.estado === "Tiene Abogado"
    ).length;
    return { total, activos, firmados, sinReporte, noViables };
  }, [casos]);

  const cards = [
    { label: "TOTAL", value: stats.total, color: "var(--color-primary)" },
    { label: "ACTIVOS", value: stats.activos, color: "var(--color-success)" },
    { label: "FIRMADOS", value: stats.firmados, color: "var(--color-warning)" },
    { label: "SIN REPORTE", value: stats.sinReporte, color: "var(--color-danger)" },
    { label: "NO VIABLES", value: stats.noViables, color: "var(--color-text-muted)" },
  ];

  return (
    <div className="mb-4">
      {showTitle && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Estadísticas globales
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Total: <b style={{ color: "var(--color-text)" }}>{stats.total}</b> caso{stats.total !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {quickFilter && quickFilter.tipo && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
          >
            Filtro activo
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
            {getQuickFilterLabel(quickFilter)}
          </span>
          <button
            onClick={onClearQuickFilter}
            aria-label="Quitar filtro"
            title="Quitar filtro"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
            style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
          >
            <X size={12} /> Quitar
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} color={card.color} />
        ))}
      </div>
    </div>
  );
}

const QUICK_FILTER_LABELS = {
  grupo: "Grupo",
  sinReporte: "Sin reporte",
  estado: "Estado",
  provincia: "Provincia",
  localidad: "Localidad",
  estudioJuridico: "Estudio",
  estudio: "Estudio",
  tipo: "Tipo",
};

function getQuickFilterLabel(qf) {
  const tipo = QUICK_FILTER_LABELS[qf.tipo] || qf.tipo;
  return `${tipo}: ${qf.valor}`;
}

export default GlobalStatsHeader;
