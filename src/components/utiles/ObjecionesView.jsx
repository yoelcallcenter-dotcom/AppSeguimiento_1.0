import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Search,
  Grid,
  List,
  ChevronUp,
  ChevronDown,
  Type,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";

export function ObjecionesView({ objeciones, setObjeciones, showToast }) {
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState("grid");
  const [orden, setOrden] = useState("asc");
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [tamanoLetra, setTamanoLetra] = useState(
    () => localStorage.getItem("objeciones-font-size") || "medium"
  );

  useEffect(
    () => localStorage.setItem("objeciones-font-size", tamanoLetra),
    [tamanoLetra]
  );

  const tamaños = [
    { value: "small", label: "Pequeno", class: "text-xs" },
    { value: "medium", label: "Mediano", class: "text-sm" },
    { value: "large", label: "Grande", class: "text-base" },
  ];

  const getFontSizeClass = () => {
    switch (tamanoLetra) {
      case "small":
        return "text-xs";
      case "large":
        return "text-base";
      default:
        return "text-sm";
    }
  };

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const objecionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return objeciones;
    const q = busqueda.trim().toLowerCase();
    return objeciones.filter(
      (o) =>
        (o.titulo || "").toLowerCase().includes(q) ||
        (o.contenido || "").toLowerCase().includes(q)
    );
  }, [objeciones, busqueda]);

  const objecionesOrdenadas = useMemo(() => {
    const sorted = [...objecionesFiltradas];
    return orden === "asc"
      ? sorted.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "", "es"))
      : sorted.sort((a, b) => (b.titulo || "").localeCompare(a.titulo || "", "es"));
  }, [objecionesFiltradas, orden]);

  const agregar = () => {
    const titulo = sanitizeString(`Objeción ${objeciones.length + 1}`);
    setObjeciones([...objeciones, { id: uid(), titulo, contenido: "" }]);
    showToast("Objeción agregada", "success");
  };
  const eliminar = (id) => {
    setObjeciones(objeciones.filter((o) => o.id !== id));
    setConfirmEliminar(null);
    showToast("Objeción eliminada", "info");
  };
  const editar = (id, campo, valor) => {
    const sanitized = sanitizeString(valor);
    setObjeciones(
      objeciones.map((o) => (o.id === id ? { ...o, [campo]: sanitized } : o))
    );
  };

  const fontSizeClass = getFontSizeClass();

  const renderControles = (o) => (
    <div className="flex flex-col flex-1 min-w-0 gap-1">
      <TextInput
        value={o.titulo}
        onChange={(e) => editar(o.id, "titulo", e.target.value)}
        placeholder="Título"
        className={fontSizeClass}
      />
      <TextArea
        rows={vista === "grid" ? 3 : 2}
        value={o.contenido}
        onChange={(e) => editar(o.id, "contenido", e.target.value)}
        placeholder="Cómo responder..."
        className={fontSizeClass}
      />
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Objeciones Comunes
        </div>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {objecionesOrdenadas.length} objeción
          {objecionesOrdenadas.length !== 1 ? "es" : ""}
          {busqueda && ` (filtradas de ${objeciones.length})`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar objeción..."
            className="pl-8"
          />
        </div>

        <div
          className="flex items-center gap-1"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "6px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setVista("grid")}
            className={`p-1.5 rounded transition-colors ${
              vista === "grid"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            title="Vista tarjetas"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setVista("list")}
            className={`p-1.5 rounded transition-colors ${
              vista === "list"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
            title="Vista lista"
          >
            <List size={16} />
          </button>
        </div>

        <button
          onClick={() => setOrden(orden === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors hover:bg-white/5"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {orden === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          {orden === "asc" ? "A-Z" : "Z-A"}
        </button>

        <div
          className="flex items-center gap-1"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "6px",
            padding: "2px",
            border: "1px solid var(--color-border)",
          }}
        >
          <Type
            size={14}
            style={{ color: "var(--color-text-muted)", marginLeft: "4px" }}
          />
          {tamaños.map((t) => (
            <button
              key={t.value}
              onClick={() => setTamanoLetra(t.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                tamanoLetra === t.value
                  ? "bg-[var(--color-accent)] text-[#14181F]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Btn onClick={agregar} icon={Plus} size="sm">
          Agregar objeción
        </Btn>
      </div>

      {vista === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {objecionesOrdenadas.map((o) => (
            <div
              key={o.id}
              className="rounded-lg p-3 flex gap-2"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              {renderControles(o)}
              <button
                onClick={() => setConfirmEliminar(o.id)}
                className="self-start p-1 rounded hover:bg-white/5 transition-colors shrink-0"
                title="Eliminar objeción"
              >
                <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {objecionesOrdenadas.map((o, i) => (
            <div
              key={o.id}
              className="rounded-lg p-2.5 flex gap-2 items-start"
              style={{
                backgroundColor: i % 2 ? "var(--color-surface2)" : "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                style={{
                  backgroundColor: "var(--color-accent)22",
                  color: "var(--color-accent)",
                }}
              >
                #{i + 1}
              </span>
              {renderControles(o)}
              <button
                onClick={() => setConfirmEliminar(o.id)}
                className="p-1 rounded hover:bg-white/5 transition-colors shrink-0 mt-0.5"
                title="Eliminar objeción"
              >
                <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {objecionesOrdenadas.length === 0 && (
        <div
          className="text-sm py-8 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          {busqueda
            ? "No hay objeciones que coincidan con la búsqueda."
            : "No hay objeciones cargadas."}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmEliminar}
        title="Eliminar objeción"
        message="Seguro que quieres eliminar esta objeción?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => eliminar(confirmEliminar)}
      />
    </div>
  );
}

export default ObjecionesView;
