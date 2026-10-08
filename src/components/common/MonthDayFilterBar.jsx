import React, { useMemo, useCallback } from "react";
import { Select } from "./Select";
import { DayFilter } from "./DayFilter";
import { FilterBar, FilterGroup, FilterCounter } from "./filters";
import { useFilters } from "../../context/FiltersContext";
import { getMonthLabel } from "../../utils/dateFilters";
import { normalizeDate } from "../../utils/dateFilters";
import { hoyISO } from "../../utils/dateUtils";

/**
 * Barra de filtro por mes/día compartida entre Tablero, Tabla, Reportes y Dashboard.
 * Usa FiltersContext para mantener el estado sincronizado entre vistas.
 */

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
  // v1.9.6 (fix bug 2): ANTES se agregaban también los días no disponibles de
  // Mi Espacio (vacaciones/feriados/inasistencias); eso violaba el contrato de
  // DayFilter ("solo muestra los días que tienen casos") y al seleccionarlos la
  // lista quedaba vacía. Ahora solo se renderizan días con casos reales.
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
    return [...set];
  }, [fuenteDias, selectedMonth, selectedYear]);

  const currentMonthValue =
    selectedMonth >= 0 && selectedYear >= 0
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
      : "all";

  // v1.10.0 (revisión): si el mes mostrado es el mes actual, pasamos el día de
  // HOY a DayFilter para que lo resalte con su marcador propio (atajo
  // discreto de "Solo de hoy"; el chip del header se quitó en esta revisión).
  const hoyDia = useMemo(() => {
    if (selectedMonth < 0 || selectedYear < 0) return null;
    const [hoyY, hoyM, hoyD] = hoyISO().split("-").map(Number);
    return selectedYear === hoyY && selectedMonth + 1 === hoyM ? hoyD : null;
  }, [selectedMonth, selectedYear]);

  return (
    <FilterBar>
      <FilterGroup label="Mes">
        <Select
          value={currentMonthValue}
          onChange={(e) => handleMonthChange(e.target.value)}
          aria-label="Filtrar por mes"
          options={opcionesMeses}
        />
      </FilterGroup>
      {selectedMonth >= 0 && selectedYear >= 0 && (
        <DayFilter
          selectedDays={selectedDays}
          onDayChange={setSelectedDays}
          diasDisponibles={diasDisponibles}
          hoyDia={hoyDia}
        />
      )}
      <FilterCounter total={total} label="prospecto" />
      {children}
    </FilterBar>
  );
}

export default MonthDayFilterBar;
