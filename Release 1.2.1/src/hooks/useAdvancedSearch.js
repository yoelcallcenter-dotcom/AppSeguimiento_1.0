import { useState, useMemo } from "react";

export function useAdvancedSearch(casos) {
  const [filtros, setFiltros] = useState({
    estado: "todos",
    fechaDesde: "",
    fechaHasta: "",
    tieneReporte: false,
    aseguradora: "todas",
    tag: "todos",
  });

  const aseguradorasUnicas = useMemo(() => {
    const set = new Set(casos.map((c) => c.aseguradora).filter(Boolean));
    return ["todas", ...set];
  }, [casos]);

  const tagsUnicos = useMemo(() => {
    const set = new Set(casos.flatMap((c) => c.tags || []));
    return ["todos", ...set];
  }, [casos]);

  const filtrados = useMemo(() => {
    return casos.filter((c) => {
      if (filtros.estado !== "todos" && c.estado !== filtros.estado)
        return false;
      if (filtros.fechaDesde && c.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && c.fecha > filtros.fechaHasta) return false;
      if (
        filtros.tieneReporte &&
        (!c.reporteHistory || c.reporteHistory.length === 0)
      )
        return false;
      if (
        filtros.aseguradora !== "todas" &&
        c.aseguradora !== filtros.aseguradora
      )
        return false;
      if (filtros.tag !== "todos" && !(c.tags || []).includes(filtros.tag))
        return false;
      return true;
    });
  }, [casos, filtros]);

  return { filtros, setFiltros, filtrados, aseguradorasUnicas, tagsUnicos };
}
