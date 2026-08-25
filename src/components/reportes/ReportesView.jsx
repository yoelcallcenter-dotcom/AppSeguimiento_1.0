import React, { useState, useCallback } from "react";
import { MonthDayFilterBar } from "../common/MonthDayFilterBar";
import { Paginacion } from "../common/Paginacion";
import { PipelineBar } from "../kanban/PipelineBar";
import { OrigenBadge } from "../common/OrigenBadge";
import { sanitizeString } from "../../utils/sanitize";
import { formatPhoneWithConfig } from "../../utils/configFormatters";
import { useStorage } from "../../hooks/useStorage";
import { ESTADOS } from "../../utils/constants";
import { casoVieneDeReporte } from "../../utils/dateFilters";
import { useFilters } from "../../context/FiltersContext";
import useAppStore from '../../core/store/useAppStore';

export function ReportesView({ casos, casosMes, onVerCaso, mesesDisponibles = [] }) {
  const { selectedMonth, selectedYear } = useFilters();
  const [paginaActual, setPaginaActual] = useState(1);
  const [config] = useStorage("config-art-tracker", {});
  const casosPorPagina = config.casosPorPagina || 50;

  // Función para obtener el último reporte por fecha
  const obtenerUltimoReporte = (reporteHistory) => {
    if (!reporteHistory || reporteHistory.length === 0) return null;

    return [...reporteHistory].sort((a, b) => {
      const [aDia, aMes] = (a.fecha || "00/00").split("/").map(Number);
      const [bDia, bMes] = (b.fecha || "00/00").split("/").map(Number);
      if (aMes !== bMes) return bMes - aMes;
      return bDia - aDia;
    })[0];
  };

  const handleMonthChange = useCallback(() => {
    setPaginaActual(1);
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(casos.length / casosPorPagina));
  const casosPagina = casos.slice(
    (paginaActual - 1) * casosPorPagina,
    paginaActual * casosPorPagina
  );

  const reportesSections = useAppStore((s) => s.reportesSections);
  const REPORTES_SECTIONS = {
    pipelineBar: () => casos.length > 0 && <PipelineBar casos={casos} config={config} />,
    lista: () => (
      <div className="space-y-3">
        {casosPagina.length === 0 ? (
          <div
            className="text-sm py-8 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            No hay casos para mostrar.
          </div>
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
                className="rounded-lg overflow-hidden cursor-pointer transition-all duration-150"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: vieneDeReporte
                    ? "1px dashed var(--color-accent)"
                    : "1px solid var(--color-border)",
                }}
                onClick={() => onVerCaso(c)}
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
                        {vieneDeReporte && (
                          <span
                            className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)", border: "1px dashed var(--color-accent)66" }}
                            title="Aparece en este mes por su último reporte"
                          >
                            por reporte
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-3 text-xs mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <span>{formatPhoneWithConfig(c.telefono, config) || "—"}</span>
                        <span>{sanitizeString(c.localidad || "—")}</span>
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 self-start px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${estadoColor}14`, color: estadoColor, border: `1px solid ${estadoColor}22` }}
                    >
                      {c.estado}
                    </span>
                  </div>
                      <div className="mt-2 pt-2 space-y-1.5 max-h-32 overflow-y-auto" style={{ borderTop: "1px solid var(--color-border)" }}>
                    {!ultimoReporte ? (
                      <div
                        className="text-xs italic"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Sin reportes
                      </div>
                    ) : (
                      <div
                        className="text-xs leading-relaxed flex items-start gap-1.5"
                        style={{ color: "var(--color-text)" }}
                      >
                        <span style={{ color: estadoColor }}>
                          ▸ {sanitizeString(ultimoReporte.fecha)}{" "}
                        </span>
                        <span className="flex-1">{sanitizeString(ultimoReporte.texto)}</span>
                        {ultimoReporte.origen && (
                          <OrigenBadge origen={ultimoReporte.origen} size="md" />
                        )}
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
        totalItems={casos.length}
      />
    ),
  };

  return (
    <div>
      <MonthDayFilterBar
        mesesDisponibles={mesesDisponibles}
        total={casos.length}
        casos={casos}
        casosMes={casosMes}
        onMonthChange={handleMonthChange}
      />

      {reportesSections.map((sec) => {
        const fn = REPORTES_SECTIONS[sec];
        return fn ? <React.Fragment key={sec}>{fn()}</React.Fragment> : null;
      })}
    </div>
  );
}
