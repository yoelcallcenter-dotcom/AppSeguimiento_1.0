/**
 * FilterModal.jsx
 * Panel de filtro global (1.8.7, #3-7): un punto de entrada unico para filtrar
 * todas las dimensiones del filtroGlobal. Trabaja sobre un borrador local:
 * los cambios solo se escriben al tocar "Aplicar Filtro" y X/Escape los
 * descartan. Escribe en FiltersContext, que App aplica UNA vez sobre
 * casosFiltrados y todas las vistas lo heredan.
 */

import React from "react";
import { Filter, RotateCcw, Check } from "lucide-react";
import { SidePanel } from "../../components/common/SidePanel";
import { FilterGroup, FilterCounter } from "../../components/common/filters";
import { MultiSelect } from "../../components/common/MultiSelect";
import {
  normalizarValorFiltro,
  normalizarFiltroGlobal,
  aplicarFiltroGlobal,
  opcionesFiltroGlobal,
} from "../../context/FiltersContext";

export function FilterModal({
  isOpen,
  onClose,
  opcionesCasos = [],
  baseCasos = [],
  filtroGlobal,
  onChange,
  showToast,
}) {
  const panelRef = React.useRef(null);
  const [draft, setDraft] = React.useState(() =>
    normalizarFiltroGlobal(filtroGlobal)
  );

  React.useEffect(() => {
    if (isOpen) setDraft(normalizarFiltroGlobal(filtroGlobal));
  }, [isOpen, filtroGlobal]);

  const options = React.useMemo(
    () => opcionesFiltroGlobal(opcionesCasos),
    [opcionesCasos]
  );

  const fields = [
    { label: "Estado", key: "estado", items: options.estados, all: "Todos los estados" },
    { label: "Aseguradora", key: "aseguradora", items: options.aseguradoras, all: "Todas las aseguradoras" },
    { label: "Localidad", key: "localidad", items: options.localidades, all: "Todas las localidades" },
    { label: "Estudio", key: "estudio", items: options.estudios, all: "Todos los estudios" },
    { label: "Provincia", key: "provincia", items: options.provincias, all: "Todas las provincias" },
    { label: "Tipo", key: "tipo", items: options.tipos, all: "Todos los tipos" },
    { label: "Origen (ultimo reporte)", key: "origen", items: options.origenes, all: "Todos los origenes" },
  ];

  const aplicado = React.useMemo(
    () => normalizarFiltroGlobal(filtroGlobal),
    [filtroGlobal]
  );
  const hayCambios = JSON.stringify(draft) !== JSON.stringify(aplicado);

  const draftActivo =
    fields.some((f) => normalizarValorFiltro(draft[f.key]).length > 0) ||
    !!((draft.telefono || "").trim());

  const totalPreview = React.useMemo(
    () => aplicarFiltroGlobal(baseCasos, draft).length,
    [baseCasos, draft]
  );

  const setDim = (key) => (vals) => setDraft((d) => ({ ...d, [key]: vals }));

  const handleLimpiarSeccion = () => setDraft(normalizarFiltroGlobal(null));

  const handleAplicar = () => {
    if (hayCambios) {
      onChange(draft);
      if (showToast) {
        showToast(
          `Filtro aplicado: ${totalPreview} caso${totalPreview === 1 ? "" : "s"}`,
          "info"
        );
      }
    }
    panelRef.current?.startClose();
  };

  return (
    <SidePanel
      ref={panelRef}
      isOpen={isOpen}
      onClose={onClose}
      title="Filtros globales"
      icon={Filter}
      footer={
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <FilterCounter total={totalPreview} label="caso" />
          <div className="flex items-center gap-2">
            {draftActivo && (
              <button
                type="button"
                onClick={handleLimpiarSeccion}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
                style={{
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface2)",
                }}
              >
                <RotateCcw size={12} />
                Limpiar sección
              </button>
            )}
            <button
              type="button"
              onClick={handleAplicar}
              disabled={!hayCambios}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-opacity"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "var(--color-text-on-accent)",
                opacity: hayCambios ? 1 : 0.5,
                cursor: hayCambios ? "pointer" : "not-allowed",
              }}
            >
              <Check size={12} />
              Aplicar Filtro
            </button>
          </div>
        </div>
      }
    >
      <div className="p-4 grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <FilterGroup key={field.key} label={field.label}>
            <MultiSelect
              id={`fm-${field.key}`}
              value={normalizarValorFiltro(draft[field.key])}
              onChange={setDim(field.key)}
              options={field.items.map((v) => ({ value: v, label: v }))}
              placeholder={field.all}
            />
          </FilterGroup>
        ))}
        <FilterGroup label="Telefono (prefijo)">
          <input
            type="text"
            value={draft.telefono || ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                telefono: e.target.value.replace(/\D/g, ""),
              }))
            }
            placeholder="Ej: 11"
            inputMode="tel"
            className="px-2.5 py-1.5 text-xs rounded-md w-full"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            aria-label="Prefijo de telefono"
          />
        </FilterGroup>
      </div>
    </SidePanel>
  );
}
