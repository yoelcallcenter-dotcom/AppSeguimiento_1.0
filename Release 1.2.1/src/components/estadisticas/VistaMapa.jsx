import React, { useState, useMemo } from "react";
import { MapPin, Search, ChevronDown, ChevronUp } from "lucide-react";
import { TextInput } from "../common/TextInput";
import { Select } from "../common/Select";

const CARD_LIMIT = 9;

export function VistaMapa({ casos, onVerCaso }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("localidad");
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const agruparPor = useMemo(() => {
    const mapa = {};
    casos.forEach((c) => {
      const key = filtroTipo === "localidad"
        ? (c.localidad || "Sin localidad")
        : (c.provincia || "Sin provincia");
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(c);
    });
    return mapa;
  }, [casos, filtroTipo]);

  const keys = useMemo(() => Object.keys(agruparPor).sort(), [agruparPor]);

  const keysFiltradas = useMemo(() => {
    if (!busqueda.trim()) return keys;
    const q = busqueda.trim().toLowerCase();
    return keys.filter((k) => k.toLowerCase().includes(q));
  }, [keys, busqueda]);

  const visibleKeys = mostrarTodas ? keysFiltradas : keysFiltradas.slice(0, CARD_LIMIT);
  const hasMore = keysFiltradas.length > CARD_LIMIT;

  if (keys.length === 0) {
    return (
      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        No hay casos con ubicacion
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[120px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar ubicaciones..."
            className="pl-8"
          />
        </div>
        <Select
          value={filtroTipo}
          onChange={(e) => { setFiltroTipo(e.target.value); setMostrarTodas(false); }}
          options={[
            { value: "localidad", label: "Por Localidad" },
            { value: "provincia", label: "Por Provincia" },
          ]}
          style={{ width: 140, padding: "4px 8px", fontSize: "12px" }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-full overflow-y-auto">
        {visibleKeys.map((key) => (
          <div
            key={key}
            className="rounded p-2.5"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin size={12} color="var(--color-accent)" />
              <span
                className="text-xs font-semibold truncate"
                style={{ color: "var(--color-text)" }}
              >
                {key}
              </span>
              <span
                className="text-[10px] ml-auto"
                style={{ color: "var(--color-text-muted)" }}
              >
                ({agruparPor[key].length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {agruparPor[key].slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onVerCaso(c.id)}
                  className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors truncate max-w-[120px]"
                  style={{
                    backgroundColor: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  {c.nombre || "Sin nombre"}
                </button>
              ))}
              {agruparPor[key].length > 5 && (
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  +{agruparPor[key].length - 5}
                </span>
              )}
            </div>
          </div>
        ))}
        {keysFiltradas.length === 0 && (
          <div
            className="text-xs col-span-3 text-center py-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            No hay coincidencias
          </div>
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => setMostrarTodas(!mostrarTodas)}
          className="flex items-center gap-1 mx-auto text-[11px] font-semibold hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-accent)" }}
        >
          {mostrarTodas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {mostrarTodas ? "Mostrar menos" : `Ver las ${keysFiltradas.length} ubicaciones`}
        </button>
      )}
    </div>
  );
}
