import React, { useState, useMemo, useEffect, useCallback } from "react";
import { MonthDayFilterBar } from "../common/MonthDayFilterBar";
import { PillMemo } from "../common/Pill";
import { Paginacion } from "../common/Paginacion";
import { PipelineBar } from "../kanban/PipelineBar";
import { sanitizeString } from "../../utils/sanitize";
import { useUX } from "../../context/UXContext";
import { COLUMNAS_DISPONIBLES } from "../../utils/constants";
import { getOrigenConfig } from "../common/OrigenBadge";
import { formatDateWithConfig, formatPhoneWithConfig } from "../../utils/configFormatters";
import { getEstados } from "../../utils/catalogos";
import { trackEvent } from "../../utils/behaviorEngine";
import useAppStore from '../../core/store/useAppStore';
import { Inbox } from 'lucide-react';

export function TablaView({
  casos,
  casosMes,
  onOpen,
  onSeleccionar,
  seleccionados,
  mesesDisponibles = [],
  config,
}) {
  const [sortKey, setSortKey] = useState(() => {
    return localStorage.getItem("tabla-sort-key") || "fecha";
  });
  const [sortDir, setSortDir] = useState(() => {
    return parseInt(localStorage.getItem("tabla-sort-dir")) || -1;
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const casosPorPagina = config?.casosPorPagina || 50;
  const ux = useUX();
  const casesLoaded = useAppStore((s) => s.casesLoaded);

  useEffect(() => {
    localStorage.setItem("tabla-sort-key", sortKey);
    localStorage.setItem("tabla-sort-dir", String(sortDir));
  }, [sortKey, sortDir]);

  const columnasVisibles = config?.columnasVisibles || {
    fecha: true,
    nombre: true,
    telefono: true,
    localidad: true,
    aseguradora: true,
    tipoIngreso: false,
    cita: true,
    estudioJuridico: false,
    estado: true,
    reporte: true,
  };

  const valorOrden = (c, key) => {
    if (key === "reporte") {
      const ultimo = c.reporteHistory?.[c.reporteHistory.length - 1];
      return ultimo ? `${ultimo.fecha}${ultimo.texto}` : "";
    }
    return (c[key] || "").toString();
  };

  const sorted = useMemo(() => {
    return [...casos].sort((a, b) => {
      const av = valorOrden(a, sortKey).toLowerCase();
      const bv = valorOrden(b, sortKey).toLowerCase();
      return av < bv ? -1 * sortDir : av > bv ? 1 * sortDir : 0;
    });
  }, [casos, sortKey, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(sorted.length / casosPorPagina));
  const casosPagina = sorted.slice(
    (paginaActual - 1) * casosPorPagina,
    paginaActual * casosPorPagina
  );

  const toggleSort = (k) => {
    trackEvent("TABLE_INTERACTION");
    if (sortKey === k) setSortDir((d) => -d);
    else {
      setSortKey(k);
      setSortDir(1);
    }
    setPaginaActual(1);
  };

  const toggleSeleccion = (id) => {
    if (onSeleccionar) {
      const nuevos = seleccionados.includes(id)
        ? seleccionados.filter((s) => s !== id)
        : [...seleccionados, id];
      onSeleccionar(nuevos);
    }
  };

  const seleccionarTodos = () => {
    if (onSeleccionar) {
      const ids = casosPagina.map((c) => c.id);
      const todosSeleccionados = ids.every((id) => seleccionados.includes(id));
      onSeleccionar(todosSeleccionados ? [] : ids);
    }
  };

  const colsVisibles = COLUMNAS_DISPONIBLES.filter(({ key }) => columnasVisibles[key] !== false);

  const handleMonthChange = useCallback(() => {
    setPaginaActual(1);
  }, []);

  const handlePagina = useCallback((p) => {
    trackEvent("TABLE_INTERACTION");
    setPaginaActual(p);
  }, []);

  const tablaSections = useAppStore((s) => s.tablaSections);
  const TABLA_SECTIONS = {
    pipelineBar: () => sorted.length > 0 && <PipelineBar casos={sorted} config={config} />,
    tabla: () => (
      <div
        className="rounded-lg overflow-x-auto"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--color-surface)" }}>
              {onSeleccionar && (
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={
                      casosPagina.length > 0 &&
                      casosPagina.every((c) => seleccionados.includes(c.id))
                    }
                    onChange={seleccionarTodos}
                    className="accent-[var(--color-accent)]"
                  />
                </th>
              )}
              {colsVisibles.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:opacity-70"
                  style={{ color: "var(--color-text-muted)" }}
                  title={ux.tooltipsMejorados ? `Ordenar por ${label}` : undefined}
                >
                  {label} {sortKey === key && (sortDir === 1 ? "\u2191" : "\u2193")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ux.skeletonLoader && !casesLoaded && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td colSpan={colsVisibles.length + (onSeleccionar ? 1 : 0)} className="px-3 py-3">
                    <div className="animate-pulse h-3.5 rounded" style={{ backgroundColor: "var(--color-surface2)", width: `${60 + (i * 17) % 35}%` }} />
                  </td>
                </tr>
              ))
            )}
            {casosPagina.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => { trackEvent("TABLE_INTERACTION"); onOpen(c); }}
                className={`cursor-pointer transition-colors ${ux.microinteracciones ? "hover:bg-white/10" : "hover:opacity-70"}`}
                style={{
                  backgroundColor:
                    i % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                {onSeleccionar && (
                  <td
                    className="px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(c.id)}
                      onChange={() => toggleSeleccion(c.id)}
                      className="accent-[var(--color-accent)]"
                    />
                  </td>
                )}
                {colsVisibles.map(({ key }) => {
                  switch (key) {
                    case 'fecha':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text-muted)" }}>{formatDateWithConfig(c.fecha, config)}</td>;
                    case 'nombre':
                      return <td key={key} className="px-3 py-2.5 font-medium whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{sanitizeString(c.nombre)}</td>;
                    case 'telefono':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{formatPhoneWithConfig(c.telefono, config)}</td>;
                    case 'localidad':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{sanitizeString(c.localidad)}</td>;
                    case 'aseguradora':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{sanitizeString(c.aseguradora)}</td>;
                    case 'tipoIngreso':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{sanitizeString(c.tipoIngreso)}</td>;
                    case 'cita':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{sanitizeString(c.cita)}</td>;
                    case 'estudioJuridico':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap text-xs" style={{ color: "var(--color-text)" }}>{sanitizeString(c.estudioJuridico)}</td>;
                    case 'estado':
                      return <td key={key} className="px-3 py-2.5 whitespace-nowrap"><PillMemo estado={c.estado} small estados={getEstados(config)} /></td>;
                    case 'reporte':
                      return <td key={key} className="px-3 py-2.5 max-w-[240px] text-xs" style={{ color: "var(--color-text)" }} title={c.reporteHistory?.map((r) => `(${r.fecha}) ${r.texto}${r.origen && r.origen !== 'Operador' ? ' [' + r.origen + ']' : ''}`).join(" // ")}><span className="line-clamp-2">{c.reporteHistory?.length > 0 ? c.reporteHistory.map((r) => {
                        const origenCfg = r.origen && r.origen !== 'Operador' ? getOrigenConfig(r.origen) : null;
                        return `(${sanitizeString(r.fecha)}) ${sanitizeString(r.texto)}${origenCfg ? ' [' + origenCfg.abbr + ']' : ''}`;
                      }).join(" // ") : <span style={{ color: "var(--color-text-muted)" }}>{"\u2014"}</span>}</span></td>;
                    default:
                      return null;
                  }
                })}
              </tr>
            ))}
            {ux.skeletonLoader && !casesLoaded ? null : sorted.length === 0 && (
              <tr>
                <td
                  colSpan={colsVisibles.length + (onSeleccionar ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {ux.emptyStates ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Inbox size={32} style={{ opacity: 0.3 }} />
                      <span>No hay casos que coincidan con los filtros.</span>
                      <span className="text-xs" style={{ opacity: 0.7 }}>Probá cambiar el mes o limpiar la búsqueda.</span>
                    </div>
                  ) : (
                    "No hay casos que coincidan."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    ),
    paginacion: () => (
      <>
        {totalPaginas > 1 && (
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            setPaginaActual={handlePagina}
            totalItems={sorted.length}
          />
        )}
        {totalPaginas === 1 && sorted.length > 0 && (
          <div
            className="flex justify-center mt-4 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            Mostrando {sorted.length} casos
          </div>
        )}
      </>
    ),
  };

  return (
    <div>
      <MonthDayFilterBar
        mesesDisponibles={mesesDisponibles}
        total={sorted.length}
        casos={casos}
        casosMes={casosMes}
        onMonthChange={handleMonthChange}
      >
        {onSeleccionar && (
          <span className="text-xs pb-2.5" style={{ color: "var(--color-text-muted)" }}>
            — {seleccionados.length} seleccionados
          </span>
        )}
      </MonthDayFilterBar>
      {tablaSections.map((sec) => {
        const fn = TABLA_SECTIONS[sec];
        return fn ? <React.Fragment key={sec}>{fn()}</React.Fragment> : null;
      })}
    </div>
  );
}
