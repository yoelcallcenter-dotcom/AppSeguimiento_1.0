import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

const FiltersContext = createContext(null);

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function FiltersProvider({ children }) {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  // Días seleccionados (multi-selección). Array vacío = todos los días.
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedView, setSelectedView] = useState("mi-espacio");
  const [searchQuery, setSearchQuery] = useState("");
  // Filtro rápido para drill-down (ej. { tipo: "estado", valor: "Firmo" }).
  const [quickFilter, setQuickFilter] = useState(null);

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "app-filters",
        JSON.stringify({
          selectedMonth,
          selectedYear,
          selectedDays,
          selectedView,
          searchQuery,
          quickFilter,
        })
      );
    } catch {}
  }, [selectedMonth, selectedYear, selectedDays, selectedView, searchQuery, quickFilter]);

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("app-filters");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.selectedMonth !== undefined)
          setSelectedMonth(data.selectedMonth);
        if (data.selectedYear !== undefined) setSelectedYear(data.selectedYear);
        // Migración: `selectedDay` (número) de versiones anteriores → `selectedDays` (array).
        if (data.selectedDays !== undefined) {
          setSelectedDays(data.selectedDays);
        } else if (data.selectedDay !== undefined) {
          setSelectedDays(data.selectedDay >= 0 ? [data.selectedDay] : []);
        }
        if (data.selectedView !== undefined && data.selectedView === 'mi-espacio') setSelectedView('mi-espacio');
        if (data.searchQuery !== undefined) setSearchQuery(data.searchQuery);
        if (data.quickFilter !== undefined) setQuickFilter(data.quickFilter);
      }
    } catch {}
  }, []);

  const getMonthLabel = useCallback((month) => MONTHS[month] || month, []);

  const value = useMemo(
    () => ({
      selectedMonth,
      selectedYear,
      selectedDays,
      selectedView,
      searchQuery,
      quickFilter,
      setSelectedMonth,
      setSelectedYear,
      setSelectedDays,
      setSelectedView,
      setSearchQuery,
      setQuickFilter,
      months: MONTHS,
      getMonthLabel,
    }),
    [
      selectedMonth,
      selectedYear,
      selectedDays,
      selectedView,
      searchQuery,
      quickFilter,
      setSelectedMonth,
      setSelectedYear,
      setSelectedDays,
      setSelectedView,
      setSearchQuery,
      setQuickFilter,
      getMonthLabel,
    ]
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within a FiltersProvider");
  }
  return context;
}
