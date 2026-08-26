import React, { useState, useEffect } from "react";
import { MonthDayFilterBar } from "../common/MonthDayFilterBar";
import { PipelineBar } from "./PipelineBar";
import { CasoCard } from "./CasoCard";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { EmptyState } from "../common/EmptyState";
import { Inbox } from "lucide-react";
import { ESTADOS } from "../../utils/constants";
import { getEstados } from "../../utils/catalogos";
import { casoVieneDeReporte } from "../../utils/dateFilters";
import { trackEvent } from "../../utils/behaviorEngine";
import { useFilters } from "../../context/FiltersContext";
import useAppStore from '../../core/store/useAppStore';

export function KanbanView({
  casos,
  casosMes,
  config,
  onOpen,
  onEstadoChange,
  showToast,
  mesesDisponibles = [],
}) {
  const { selectedMonth, selectedYear } = useFilters();
  const [draggingId, setDraggingId] = useState(null);
  const [confirmCambio, setConfirmCambio] = useState(null);
  const [ordenes, setOrdenes] = useState(() => {
    const saved = localStorage.getItem("kanban-ordenes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("kanban-ordenes", JSON.stringify(ordenes));
  }, [ordenes]);

  const getOrden = (estado) => ordenes[estado] || "fecha-desc";
  const setOrden = (estado, orden) =>
    setOrdenes({ ...ordenes, [estado]: orden });

  const onDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e, estado) => {
    e.preventDefault();
    if (draggingId) {
      const caso = casos.find((c) => c.id === draggingId);
      if (caso && caso.estado === estado) {
        setDraggingId(null);
        return;
      }
      setConfirmCambio({ id: draggingId, estado });
    }
    setDraggingId(null);
  };

  const handleConfirmCambio = () => {
    if (confirmCambio) {
      onEstadoChange(confirmCambio.id, confirmCambio.estado);
      trackEvent("CASE_MOVED");
      showToast(`Estado cambiado a "${confirmCambio.estado}"`, "success");
      setConfirmCambio(null);
    }
  };

  const casosPorEstado = {};
  const estados = getEstados(config);
  estados.forEach((e) => {
    casosPorEstado[e.v] = casos.filter((c) => c.estado === e.v);
  });

  const ordenarCasos = (items, orden) => {
    if (!items || items.length === 0) return items;

    switch (orden) {
      case "fecha-asc":
        return [...items].sort((a, b) =>
          (a.fecha || "").localeCompare(b.fecha || "")
        );
      case "fecha-desc":
        return [...items].sort((a, b) =>
          (b.fecha || "").localeCompare(a.fecha || "")
        );
      case "nombre-asc":
        return [...items].sort((a, b) =>
          (a.nombre || "").localeCompare(b.nombre || "")
        );
      case "nombre-desc":
        return [...items].sort((a, b) =>
          (b.nombre || "").localeCompare(a.nombre || "")
        );
      default:
        return items;
    }
  };

  const kanbanSections = useAppStore((s) => s.kanbanSections);
  const KANBAN_SECTIONS = {
    pipelineBar: () => casos.length > 0 && <PipelineBar casos={casos} config={config} />,
    columnas: () => (
      <div className="space-y-3">
        {estados.map((e) => {
          const items = ordenarCasos(casosPorEstado[e.v] || [], getOrden(e.v));
          return (
            <div
              key={e.v}
              onDragOver={(ev) => ev.preventDefault()}
              onDrop={(ev) => onDrop(ev, e.v)}
              className="rounded-lg p-2.5"
              style={{
                backgroundColor: "var(--color-surface2)",
                border: `1px solid ${e.accent}44`,
              }}
            >
              <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: e.accent }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {e.v}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  ({items.length})
                </span>
                <div className="ml-auto">
                  <select
                    value={getOrden(e.v)}
                    onChange={(o) => setOrden(e.v, o.target.value)}
                    style={{
                      padding: "4px 24px 4px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                      appearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7385' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 4px center",
                      cursor: "pointer",
                    }}
                  >
                    <option value="fecha-desc">Mas reciente</option>
                    <option value="fecha-asc">Mas antiguo</option>
                    <option value="nombre-asc">A-Z</option>
                    <option value="nombre-desc">Z-A</option>
                  </select>
                </div>
              </div>
              <div
                className="flex gap-2 overflow-x-auto pb-2 scroll-smooth"
                style={{ scrollbarWidth: "thin" }}
              >
                {items.length === 0 ? (
                  <EmptyState icon={Inbox} message="Sin casos" size="sm" className="w-full" />
                ) : (
                  items.map((c) => (
                    <div
                      key={c.id}
                      className="flex-shrink-0"
                      style={{ width: 260 }}
                    >
                      <CasoCard
                        caso={c}
                        config={config}
                        onOpen={onOpen}
                        onDragStart={onDragStart}
                        dragging={draggingId === c.id}
                        vieneDeReporte={
                          selectedMonth >= 0 && selectedYear >= 0 &&
                          casoVieneDeReporte(c, selectedMonth, selectedYear)
                        }
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    ),
  };

  return (
    <div>
      <MonthDayFilterBar mesesDisponibles={mesesDisponibles} total={casos.length} casos={casos} casosMes={casosMes} />
      {kanbanSections.map((sec) => {
        const fn = KANBAN_SECTIONS[sec];
        return fn ? <React.Fragment key={sec}>{fn()}</React.Fragment> : null;
      })}
      <ConfirmDialog
        open={!!confirmCambio}
        title="Cambiar estado"
        message={`¿Deseas mover este caso al estado "${confirmCambio?.estado}"?`}
        confirmLabel="Cambiar"
        onCancel={() => setConfirmCambio(null)}
        onConfirm={handleConfirmCambio}
      />
    </div>
  );
}
