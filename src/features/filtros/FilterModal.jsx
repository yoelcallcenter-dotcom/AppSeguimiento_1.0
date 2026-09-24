/**
 * FilterModal.jsx
 * Modal de filtro global (1.8.7, #3-7): un punto de entrada unico para filtrar
 * todas las dimensiones del filtroGlobal. Escribe en FiltersContext, que App
 * aplica UNA vez sobre casosFiltrados y todas las vistas lo heredan.
 */

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { SidePanel } from "../../components/common/SidePanel";
import { FilterGroup, FilterCounter } from "../../components/common/filters";
import { MultiSelect } from "../../components/common/MultiSelect";
import { normalizarValorFiltro } from "../../context/FiltersContext";

function unicos(lista) {
  return Array.from(new Set((lista || []).map((v) => (v || "").toString().trim()).filter(Boolean))).sort();
}

function ultimoOrigen(caso) {
  const hist = caso.reporteHistory || [];
  return hist.length ? hist[hist.length - 1].origen : null;
}

export function FilterModal({ isOpen, onClose, casos = [], total, filtroGlobal, onChange, onReset, showToast }) {
  const options = React.useMemo(() => {
    return {
      estados: unicos(casos.map((c) => c.estado)),
      aseguradoras: unicos(casos.map((c) => c.aseguradora)),
      localidades: unicos(casos.map((c) => c.localidad)),
      estudios: unicos(casos.map((c) => c.estudioJuridico)),
      provincias: unicos(casos.map((c) => c.provincia)),
      tipos: unicos(casos.map((c) => c.tipoIngreso)),
      origenes: unicos(casos.map(ultimoOrigen)),
    };
  }, [casos]);

  const fields = [
    { label: "Estado", key: "estado", items: options.estados, all: "Todos los estados" },
    { label: "Aseguradora", key: "aseguradora", items: options.aseguradoras, all: "Todas las aseguradoras" },
    { label: "Localidad", key: "localidad", items: options.localidades, all: "Todas las localidades" },
    { label: "Estudio", key: "estudio", items: options.estudios, all: "Todos los estudios" },
    { label: "Provincia", key: "provincia", items: options.provincias, all: "Todas las provincias" },
    { label: "Tipo", key: "tipo", items: options.tipos, all: "Todos los tipos" },
    { label: "Origen (ultimo reporte)", key: "origen", items: options.origenes, all: "Todos los origenes" },
  ];

  const toggle = (key) => (vals) => {
    const prev = normalizarValorFiltro(filtroGlobal?.[key]);
    onChange({ ...filtroGlobal, [key]: vals });
    if (showToast && vals.length > prev.length) {
      showToast(`Filtro aplicado: ${fields.find((f) => f.key === key)?.label || key}`, "info");
    }
  };

  const hasActive =
    (filtroGlobal &&
      fields.some((f) => normalizarValorFiltro(filtroGlobal[f.key]).length > 0)) ||
    !!((filtroGlobal?.telefono || "").trim());

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Filtros globales"
      icon={Filter}
      footer={
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <FilterCounter total={total} label="caso" />
          {hasActive && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
              style={{
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface2)",
              }}
            >
              <RotateCcw size={12} />
              Limpiar filtros
            </button>
          )}
        </div>
      }
    >
      <div className="p-4 grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <FilterGroup key={field.key} label={field.label}>
            <MultiSelect
              id={`fm-${field.key}`}
              value={normalizarValorFiltro(filtroGlobal?.[field.key])}
              onChange={toggle(field.key)}
              options={field.items.map((v) => ({ value: v, label: v }))}
              placeholder={field.all}
            />
          </FilterGroup>
        ))}
        <FilterGroup label="Telefono (prefijo)">
          <input
            type="text"
            value={filtroGlobal?.telefono || ""}
            onChange={(e) => onChange({ ...filtroGlobal, telefono: e.target.value.replace(/\D/g, "") })}
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
