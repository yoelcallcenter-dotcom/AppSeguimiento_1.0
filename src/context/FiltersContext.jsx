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

export function opcionesFiltroGlobal(casos) {
  const lista = Array.isArray(casos) ? casos : [];
  const unico = (get) =>
    Array.from(
      new Set(
        lista.map((c) => (get(c) ?? "").toString().trim()).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  const ultimoOrigen = (c) => {
    const hist = c.reporteHistory || [];
    return hist.length ? hist[hist.length - 1].origen : null;
  };
  return {
    estados: unico((c) => c.estado),
    aseguradoras: unico((c) => c.aseguradora),
    localidades: unico((c) => c.localidad),
    estudios: unico((c) => c.estudioJuridico),
    provincias: unico((c) => c.provincia),
    tipos: unico((c) => c.tipoIngreso),
    origenes: unico(ultimoOrigen),
  };
}

export function FiltersProvider({ children }) {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  // Días seleccionados (multi-selección). Array vacío = todos los días.
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedView, setSelectedView] = useState("mi-espacio");
  // X01/N18 (1.10.1): se eliminó `searchQuery` del contexto. La búsqueda real
  // vive como estado local en App (el header) y viaja como props a quien la
  // necesita (ReportesView para los snapshots, Dashboard la limpia con
  // onClearSearch); antes este searchQuery nadie lo escribía con teclas (estaba
  // muerto) y al entrar en el value del contexto re-renderizaba TODOS los
  // consumidores —incluidas vistas montadas con display:none— en cada cambio.
  // Filtro rápido para drill-down (ej. { tipo: "estado", valor: "Firmo" }).
  const [quickFilter, setQuickFilter] = useState(null);
  // 1.8.7 (#3-7): filtro global con modal (persistido en app-filters).
  const [filtroGlobal, setFiltroGlobal] = useState(FILTRO_GLOBAL_DEFAULT);
  const resetFiltroGlobal = useCallback(
    () => setFiltroGlobal(FILTRO_GLOBAL_DEFAULT),
    []
  );

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
          quickFilter,
          filtroGlobal,
        })
      );
    } catch {}
  }, [selectedMonth, selectedYear, selectedDays, selectedView, quickFilter, filtroGlobal]);

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
        // RUN-01 (1.10.1): los atajos PWA (#dashboard, #kanban, …) se aplican en
        // un efecto HIJO de App que corre ANTES que este restore del padre
        // (React ejecuta efectos de hijos primero); sin este guard, la vista
        // persistida pisaba la del hash y el atajo no abría nada en arranque
        // frío. Si hay hash de atajos en la URL, gana el hash (este guard solo
        // afecta la vista; el resto de los filtros se restaura igual).
        const hashAtajo = window.location.hash.replace(/^#\/?/, "").toLowerCase();
        const hashDefineVista =
          hashAtajo !== "" &&
          ["dashboard", "kanban", "tabla", "reportes", "mi-espacio", "utiles"].includes(
            hashAtajo
          );
        if (
          !hashDefineVista &&
          data.selectedView !== undefined &&
          data.selectedView === 'mi-espacio'
        ) {
          setSelectedView('mi-espacio');
        }
        if (data.quickFilter !== undefined) setQuickFilter(data.quickFilter);
        if (data.filtroGlobal !== undefined)
          setFiltroGlobal(normalizarFiltroGlobal(data.filtroGlobal));
      }
    } catch {}
  }, []);

  // C03 (1.10.1): al renombrar/eliminar un estado en Configuración hay que
  // migrar también el filtro global y el filtro rápido guardados. El estado
  // vive acá (useState) y no en localStorage: sin este listener, el contexto
  // seguiría con el nombre viejo y el efecto de guardado de arriba lo
  // re-pisaría encima de la migración hecha en el DOM.
  useEffect(() => {
    const onRenombrado = (ev) => {
      const { prev, next } = ev.detail || {};
      if (!prev || !next || prev === next) return;
      setFiltroGlobal((fg) =>
        Array.isArray(fg?.estado) && fg.estado.includes(prev)
          ? { ...fg, estado: fg.estado.map((e) => (e === prev ? next : e)) }
          : fg
      );
      setQuickFilter((qf) =>
        qf && qf.tipo === "estado" && qf.valor === prev
          ? { ...qf, valor: next }
          : qf
      );
    };
    const onEliminado = (ev) => {
      const nombre = ev.detail && ev.detail.nombre;
      if (!nombre) return;
      setFiltroGlobal((fg) =>
        Array.isArray(fg?.estado) && fg.estado.includes(nombre)
          ? { ...fg, estado: fg.estado.filter((e) => e !== nombre) }
          : fg
      );
      setQuickFilter((qf) =>
        qf && qf.tipo === "estado" && qf.valor === nombre ? null : qf
      );
    };
    window.addEventListener("app:estado-renombrado", onRenombrado);
    window.addEventListener("app:estado-eliminado", onEliminado);
    return () => {
      window.removeEventListener("app:estado-renombrado", onRenombrado);
      window.removeEventListener("app:estado-eliminado", onEliminado);
    };
  }, []);

  const getMonthLabel = useCallback((month) => MONTHS[month] || month, []);

  const value = useMemo(
    () => ({
      selectedMonth,
      selectedYear,
      selectedDays,
      selectedView,
      quickFilter,
      setSelectedMonth,
      setSelectedYear,
      setSelectedDays,
      setSelectedView,
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
      quickFilter,
      setSelectedMonth,
      setSelectedYear,
      setSelectedDays,
      setSelectedView,
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
