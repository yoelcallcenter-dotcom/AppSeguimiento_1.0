import React, { useMemo, useCallback } from "react";
import { Select } from "./Select";
import { DayFilter } from "./DayFilter";
import { useFilters } from "../../context/FiltersContext";
import { getMonthLabel } from "../../utils/dateFilters";
import { normalizeDate } from "../../utils/dateFilters";
import { getOperatorAvailability } from "../../features/operator/operatorStore";

/**
 * Barra de filtro por mes/día compartida entre Tablero, Tabla, Reportes y Dashboard.
 * Usa FiltersContext para mantener el estado sincronizado entre vistas.
 */
function rangoFechas(start, end) {
  const out = [];
  const d = new Date(start + "T00:00:00");
  const fin = new Date(end + "T00:00:00");
  if (isNaN(d.getTime()) || isNaN(fin.getTime())) return out;
  while (d <= fin) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function MonthDayFilterBar({
  mesesDisponibles = [],
  total,
  onMonthChange,
  casos = [],
  casosMes,
  children,
}) {
  const {
    selectedMonth,
    selectedYear,
    selectedDays,
    setSelectedMonth,
    setSelectedYear,
    setSelectedDays,
  } = useFilters();

  const opcionesMeses = useMemo(
    () => [
      { value: "all", label: "Todos los meses" },
      ...mesesDisponibles.map((m) => {
        const [year, month] = m.split("-").map(Number);
        return { value: m, label: getMonthLabel(month - 1, year) };
      }),
    ],
    [mesesDisponibles]
  );

  const handleMonthChange = useCallback(
    (value) => {
      if (value === "all") {
        setSelectedMonth(-1);
        setSelectedYear(-1);
      } else {
        const [year, month] = value.split("-").map(Number);
        setSelectedMonth(month - 1);
        setSelectedYear(year);
      }
      setSelectedDays([]);
      onMonthChange?.(value);
    },
    [setSelectedMonth, setSelectedYear, setSelectedDays, onMonthChange]
  );

  // Días con casos dentro del mes seleccionado (solo esos se pueden filtrar).
  // Se usan los casos del mes SIN el filtro de día (`casosMes`) para que al
  // seleccionar un día no desaparezcan los demás días disponibles.
  const fuenteDias = casosMes ?? casos;
  const diasDisponibles = useMemo(() => {
    const set = new Set();
    if (selectedMonth < 0 || selectedYear < 0) return [];
    for (const c of fuenteDias || []) {
      const iso = normalizeDate(c.fecha);
      if (!iso) continue;
      const [y, m, d] = iso.split("-").map(Number);
      if (y === selectedYear && m === selectedMonth + 1) set.add(d);
    }
    // Días no disponibles configurados en Mi Espacio: también se renderizan en
    // las estadísticas para no dejar espacios vacíos sin justificación.
    try {
      const availability = getOperatorAvailability() || {};
      const noDisponibles = [
        ...(availability.absences || []),
        ...(availability.vacations || []),
        ...(availability.holidays || []),
        ...(availability.customDaysOff || []),
      ];
      for (const item of noDisponibles) {
        const fechas = item.start && item.end
          ? rangoFechas(item.start, item.end)
          : [item.date].filter(Boolean);
        for (const iso of fechas) {
          const [y, m, d] = iso.split("-").map(Number);
          if (y === selectedYear && m === selectedMonth + 1) set.add(d);
        }
      }
    } catch {
      /* sin disponibilidad configurada */
    }
    return [...set];
  }, [fuenteDias, selectedMonth, selectedYear]);

  const currentMonthValue =
    selectedMonth >= 0 && selectedYear >= 0
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
      : "all";

  const count = total ?? 0;

  return (
    <div className="flex items-end gap-3 mb-4 flex-wrap">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 150 }}>
        <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Mes
        </label>
        <Select
          value={currentMonthValue}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label="Filtrar por mes"
          options={opcionesMeses}
        />
      </div>
      {selectedMonth >= 0 && selectedYear >= 0 && (
        <DayFilter
          selectedDays={selectedDays}
          onDayChange={setSelectedDays}
          diasDisponibles={diasDisponibles}
        />
      )}
      {total !== undefined && (
        <span className="text-xs pb-2.5" style={{ color: "var(--color-text-muted)" }}>
          Total: <b style={{ color: "var(--color-text)" }}>{count}</b>{" "}
          prospecto{count !== 1 ? "s" : ""}
        </span>
      )}
      {children}
    </div>
  );
}

export default MonthDayFilterBar;
