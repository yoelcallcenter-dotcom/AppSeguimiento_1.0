import React, { useState, useMemo } from "react";
import { Target } from "lucide-react";
import { PillMemo } from "../common/Pill";
import { sanitizeString } from "../../utils/sanitize";
import { ESTADOS } from "../../utils/constants";
import { useFilters } from "../../context/FiltersContext";

export function LogroObjetivos({ casos, onVerCaso, showHeader = true }) {
  const { selectedMonth, selectedYear } = useFilters();
  const [showDetalle, setShowDetalle] = useState(false);

  const statsMes = useMemo(() => {
    const casosMes = casos.filter((c) => {
      if (selectedMonth < 0 || selectedYear < 0) return true;
      const fecha = c.fecha || "";
      const [year, month] = fecha.split("-").map(Number);
      return year === selectedYear && month === selectedMonth + 1;
    });
    const firmados = casosMes.filter((c) => c.estado === "Firmo").length - casosMes.filter((c) => c.estado === "Baja").length;
    const pendientes = casosMes.filter(
      (c) =>
        c.estado === "Cita virtual" ||
        c.estado === "Cita presencial" ||
        c.estado === "Lo piensa"
    ).length;
    const noResponden = casosMes.filter(
      (c) =>
        c.estado === "No responde" ||
        c.estado === "Reprogramado" ||
        c.estado === "2do Llamado"
    ).length;
    const meta = 14;
    const progreso = Math.min(100, (firmados / meta) * 100);
    const cumplido = firmados >= meta;
    return {
      casosMes,
      firmados,
      pendientes,
      noResponden,
      meta,
      progreso,
      cumplido,
      total: casosMes.length,
    };
  }, [casos, selectedMonth, selectedYear]);

  if (!casos || casos.length === 0) {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {showHeader && (
          <div className="flex items-center gap-2">
            <Target size={18} color="var(--color-accent)" />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Logro de Objetivos
            </span>
          </div>
        )}
        <div
          className="text-xs mt-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          No hay casos cargados para mostrar estadisticas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target size={18} color="var(--color-accent)" />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Logro de Objetivos
            </span>
          </div>
          <button
            onClick={() => setShowDetalle(!showDetalle)}
            className="text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-accent)" }}
          >
            {showDetalle ? "Ocultar detalle" : "Ver detalle"}
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowDetalle(!showDetalle)}
            className="text-xs font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-accent)" }}
          >
            {showDetalle ? "Ocultar detalle" : "Ver detalle"}
          </button>
        </div>
      )}

      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div
              className="text-2xl font-bold"
              style={{
                color: statsMes.cumplido
                  ? "var(--color-success)"
                  : "var(--color-accent)",
              }}
            >
              {statsMes.firmados} / {statsMes.meta}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Casos firmados
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                statsMes.cumplido
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-warning)]"
              }`}
            >
              {statsMes.cumplido
                ? "Objetivo cumplido"
                : `${Math.round(statsMes.progreso)}%`}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Meta: 14 firmas por mes
            </div>
          </div>
        </div>

        <div
          className="w-full h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-border)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${statsMes.progreso}%`,
              backgroundColor: statsMes.cumplido
                ? "var(--color-success)"
                : "var(--color-accent)",
            }}
          />
        </div>

        <div
          className="flex gap-4 mt-3 text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span>
            Total:{" "}
            <b style={{ color: "var(--color-text)" }}>{statsMes.total}</b>
          </span>
          <span>
            Pendientes:{" "}
            <b style={{ color: "var(--color-warning)" }}>
              {statsMes.pendientes}
            </b>
          </span>
          <span>
            No responden:{" "}
            <b style={{ color: "#F97316" }}>{statsMes.noResponden}</b>
          </span>
        </div>
      </div>

      {showDetalle && statsMes.casosMes.length > 0 && (
        <div
          className="rounded-lg p-3 max-h-64 overflow-y-auto"
          style={{
            backgroundColor: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="text-xs font-semibold mb-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            Detalle de casos del mes:
          </div>
          <div className="space-y-1">
            {statsMes.casosMes.map((c) => {
              const info =
                ESTADOS.find((e) => e.v === c.estado) ||
                ESTADOS[ESTADOS.length - 1];
              return (
                <div
                  key={c.id}
                  onClick={() => onVerCaso(c.id)}
                  className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:opacity-70 transition-opacity text-xs"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: info.accent }}
                  />
                  <span
                    className="flex-1 truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {sanitizeString(c.nombre || "Sin nombre")}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {c.fecha}
                  </span>
                  <PillMemo estado={c.estado} small />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
