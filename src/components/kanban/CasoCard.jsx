import React from "react";
import { Phone, MapPin, Building2, FileText } from "lucide-react";
import { getEstados } from "../../utils/catalogos";
import { IconLabelMemo } from "../common/IconLabel";
import { sanitizeString } from "../../utils/sanitize";
import { formatPhoneWithConfig } from "../../utils/configFormatters";
import { useTheme } from "../../context/ThemeContext";

export const CasoCard = React.memo(
  ({ caso, config, onOpen, onDragStart, dragging, vieneDeReporte }) => {
    const theme = useTheme();

    // Obtener color del estado desde el tema o usar el catálogo configurable
    const estados = getEstados(config);
    const estadoInfo =
      estados.find((e) => e.v === caso.estado) ||
      estados[estados.length - 1];
    const estadoColor =
      theme.getEstadoColor(caso.estado) || estadoInfo.accent || "#6B7280";

    // Obtener el último reporte por FECHA (no por orden de creación)
    const obtenerUltimoReporte = () => {
      if (!caso.reporteHistory || caso.reporteHistory.length === 0) return null;

      // Ordenar por fecha de reporte (formato DD/MM)
      return [...caso.reporteHistory].sort((a, b) => {
        // Convertir DD/MM a comparación
        const [aDia, aMes] = (a.fecha || "00/00").split("/").map(Number);
        const [bDia, bMes] = (b.fecha || "00/00").split("/").map(Number);

        // Primero comparar por mes, luego por día
        if (aMes !== bMes) return bMes - aMes;
        return bDia - aDia;
      })[0];
    };

    const ultimoReporte = obtenerUltimoReporte();

    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, caso.id)}
        onClick={() => onOpen(caso)}
        className="rounded-lg p-3 cursor-pointer transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
        style={{
          backgroundColor: "var(--color-surface)",
          border: vieneDeReporte
            ? "1px dashed var(--color-accent)"
            : "1px solid var(--color-border)",
          borderLeft: `3px solid ${estadoColor}`,
          borderLeftWidth: "3px",
          borderLeftColor: estadoColor,
          opacity: dragging ? 0.4 : 1,
          boxShadow:
            caso.estado === "Firmo" ? `0 0 0 1px ${estadoColor}66` : "none",
        }}
        role="button"
        tabIndex={0}
        aria-label={`Caso: ${caso.nombre || "Sin nombre"} - Estado: ${
          caso.estado
        }${vieneDeReporte ? " - incluido por reporte" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(caso);
          }
        }}
      >
        <div
          className="font-semibold text-sm mb-1.5 truncate"
          style={{ color: "var(--color-text)" }}
        >
          {sanitizeString(caso.nombre || "Sin nombre")}
        </div>
        <div className="space-y-0.5">
          <IconLabelMemo icon={Building2} color="var(--color-accent)" strong>
            {sanitizeString(caso.estudioJuridico || "Sin estudio")}
          </IconLabelMemo>
          <IconLabelMemo icon={Phone} color="var(--color-text-muted)">
            {formatPhoneWithConfig(caso.telefono) || "—"}
          </IconLabelMemo>
          <IconLabelMemo icon={MapPin} color="var(--color-text-muted)">
            {sanitizeString(caso.localidad || "—")}
          </IconLabelMemo>
          <IconLabelMemo icon={FileText} color="var(--color-primary)">
            {sanitizeString(caso.aseguradora || "Sin ART")}
          </IconLabelMemo>
          {caso.tags?.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-0.5">
              {caso.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[8px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--color-accent)22",
                    color: "var(--color-accent)",
                  }}
                >
                  {sanitizeString(t)}
                </span>
              ))}
              {caso.tags.length > 3 && (
                <span
                  className="text-[8px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  +{caso.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        {ultimoReporte && (
          <div
            className="mt-2 pt-2 text-[11px] leading-snug line-clamp-2"
            style={{
              borderTop: "1px dashed var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <span style={{ color: "var(--color-accent)" }}>
              ({sanitizeString(ultimoReporte.fecha)}){" "}
            </span>
            {sanitizeString(ultimoReporte.texto)}
          </div>
        )}
      </div>
    );
  }
);
