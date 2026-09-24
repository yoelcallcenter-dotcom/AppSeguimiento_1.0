import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useDebounce } from "../hooks/useDebounce";

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

// 1.8.7 (#3-7): filtro global. 1.8.8: cada dimensión pasa a multi-selección
// (array; vacío = sin filtro; OR dentro de la dimensión, AND entre dimensiones).
// Se aplica UNA vez en App.jsx sobre casosFiltrados; las vistas lo heredan.
export const FILTRO_GLOBAL_DEFAULT = {
  estado: [],
  aseguradora: [],
  localidad: [],
  estudio: [],
  provincia: [],
  tipo: [],
  origen: [],
  telefono: "",
};

export function normalizarValorFiltro(v) {
  if (Array.isArray(v)) return v;
  return v && v !== "todos" ? [v] : [];
}

export function normalizarFiltroGlobal(fg) {
  const out = { ...FILTRO_GLOBAL_DEFAULT };
  if (fg && typeof fg === "object") {
    for (const k of Object.keys(out)) {
      if (k === "telefono") {
        out.telefono = typeof fg.telefono === "string" ? fg.telefono : "";
      } else if (fg[k] !== undefined) {
        out[k] = normalizarValorFiltro(fg[k]);
      }
    }
  }
  return out;
}

const upper = (v) => (v ?? "").toString().trim().toUpperCase();

const CAMPO_CASO = {
  estado: "estado",
  aseguradora: "aseguradora",
  localidad: "localidad",
  estudio: "estudioJuridico",
  provincia: "provincia",
  tipo: "tipoIngreso",
};

export function aplicarFiltroGlobal(casos, fg) {
  if (!Array.isArray(casos)) return [];
  const f = normalizarFiltroGlobal(fg || FILTRO_GLOBAL_DEFAULT);

  const match = (campo) => {
    const field = CAMPO_CASO[campo];
    const vals = normalizarValorFiltro(f[campo]).map(upper).filter(Boolean);
    if (vals.length === 0) return () => true;
    return (c) => vals.includes(upper(c[field]));
  };

  const mEstado = match("estado");
  const mAseguradora = match("aseguradora");
  const mLocalidad = match("localidad");
  const mEstudio = match("estudio");
  const mProvincia = match("provincia");
  const mTipo = match("tipo");
  const origenes = normalizarValorFiltro(f.origen).map(upper).filter(Boolean);
  const tel = (f.telefono || "").replace(/\D/g, "");

  return casos.filter((c) => {
    if (!mEstado(c)) return false;
    if (!mAseguradora(c)) return false;
    if (!mLocalidad(c)) return false;
    if (!mEstudio(c)) return false;
    if (!mProvincia(c)) return false;
    if (!mTipo(c)) return false;
    if (origenes.length > 0) {
      const hist = c.reporteHistory || [];
      const ultimo = hist.length ? hist[hist.length - 1] : null;
      if (!ultimo || !origenes.includes(upper(ultimo.origen))) return false;
    }
    if (tel && !(c.telefono || "").replace(/\D/g, "").includes(tel)) return false;
    return true;
  });
}

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
  // 1.8.7 (#3-7): filtro global con modal (persistido en app-filters).
  const [filtroGlobal, setFiltroGlobal] = useState(FILTRO_GLOBAL_DEFAULT);
  const resetFiltroGlobal = useCallback(
    () => setFiltroGlobal(FILTRO_GLOBAL_DEFAULT),
    []
  );

  // Optimización 1.6.6: `searchQuery` debounced para persistencia, evitando
  // escrituras a localStorage en cada keystroke. El valor en vivo sigue siendo
  // `searchQuery`; solo el guardado usa la versión debounced.
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
          searchQuery: debouncedSearchQuery,
          quickFilter,
          filtroGlobal,
        })
      );
    } catch {}
  }, [selectedMonth, selectedYear, selectedDays, selectedView, debouncedSearchQuery, quickFilter, filtroGlobal]);

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
        if (data.filtroGlobal !== undefined)
          setFiltroGlobal(normalizarFiltroGlobal(data.filtroGlobal));
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
      filtroGlobal,
      setFiltroGlobal,
      resetFiltroGlobal,
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
      filtroGlobal,
      setFiltroGlobal,
      resetFiltroGlobal,
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
