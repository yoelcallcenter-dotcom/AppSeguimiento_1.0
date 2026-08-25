import React, { useState, useMemo, useRef } from "react";
import { Search, FileText, Upload, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { Select } from "../common/Select";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString, sanitizeObject } from "../../utils/sanitize";
import { normalizarTexto } from "../../utils/helpers";
import { hoyISO, uid } from "../../utils/dateUtils";

function DireccionCell({ direcciones, onChange }) {
  // Muestra por defecto la primera dirección cargada (orden real de los datos).
  const [sel, setSel] = useState(
    () => (Array.isArray(direcciones) && direcciones[0]) || ""
  );
  const [editando, setEditando] = useState(null);
  const [valor, setValor] = useState("");

  const lista = Array.isArray(direcciones) ? direcciones : [];

  const confirmar = () => {
    const v = valor.trim();
    if (!v) return;
    if (editando?.modo === "editar") {
      const idx = lista.indexOf(editando.texto);
      if (idx >= 0) {
        const next = [...lista];
        next[idx] = v;
        onChange(next);
        setSel(v);
      }
    } else {
      onChange([...lista, v]);
    }
    setEditando(null);
    setValor("");
  };

  const eliminar = () => {
    const idx = lista.indexOf(sel);
    if (idx < 0) return;
    const next = [...lista];
    next.splice(idx, 1);
    onChange(next);
    setSel("");
  };

  const cancelar = () => {
    setEditando(null);
    setValor("");
  };

  return (
    <div className="space-y-1" style={{ minWidth: 220 }}>
      <div className="flex items-center gap-1">
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="input-optimized focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] flex-1"
          style={{
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7385' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.75rem center",
            paddingRight: "2rem",
          }}
          aria-label="Direcciones del estudio"
        >
          {!(sel && lista.includes(sel)) && (
            <option value="" disabled>
              {lista.length ? "Seleccionar dirección" : "Sin dirección"}
            </option>
          )}
          {lista.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="button"
          title="Agregar dirección"
          onClick={() => {
            setEditando({ modo: "nuevo" });
            setValor("");
          }}
          className="p-1 rounded hover:bg-[var(--color-surface)] transition-colors shrink-0"
          style={{ color: "var(--color-accent)" }}
        >
          <Plus size={14} />
        </button>
        {sel !== "" && lista.includes(sel) && (
          <>
            <button
              type="button"
              title="Editar dirección"
              onClick={() => {
                setEditando({ modo: "editar", texto: sel });
                setValor(sel);
              }}
              className="p-1 rounded hover:bg-[var(--color-surface)] transition-colors shrink-0"
              style={{ color: "var(--color-text)" }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              title="Eliminar dirección"
              onClick={eliminar}
              className="p-1 rounded hover:bg-[var(--color-surface)] transition-colors shrink-0"
              style={{ color: "var(--color-danger)" }}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      {editando && (
        <div className="flex items-center gap-1">
          <TextInput
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmar();
              if (e.key === "Escape") cancelar();
            }}
            placeholder={editando.modo === "nuevo" ? "Nueva dirección" : "Editar dirección"}
            className="flex-1"
          />
          <button
            type="button"
            title="Guardar"
            onClick={confirmar}
            className="p-1 rounded hover:bg-[var(--color-surface)] transition-colors shrink-0"
            style={{ color: "var(--color-accent)" }}
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            title="Cancelar"
            onClick={cancelar}
            className="p-1 rounded hover:bg-[var(--color-surface)] transition-colors shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function MapeoView({ mapeo, setMapeo, showToast }) {
  const [pegado, setPegado] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState("estudio");
  const [busqueda, setBusqueda] = useState("");
  const [filaAEliminar, setFilaAEliminar] = useState(null);
  const fileInputRef = useRef(null);

  const filtrados = useMemo(() => {
    let result = mapeo;
    const q = normalizarTexto(busqueda);
    if (q) {
      result = result.filter(
        (m) =>
          normalizarTexto(m.localidades).includes(q) ||
          normalizarTexto(m.provincia).includes(q) ||
          normalizarTexto(m.estudio).includes(q) ||
          normalizarTexto((m.direcciones || []).join(" ")).includes(q)
      );
    }
    return result;
  }, [mapeo, busqueda]);

  const update = (id, k, v) => {
    const sanitized = sanitizeString(v);
    setMapeo((list) =>
      list.map((m) => (m.id === id ? { ...m, [k]: sanitized } : m))
    );
  };

  const updateDirecciones = (id, next) => {
    const sanitized = (next || [])
      .map((d) => sanitizeString(d))
      .filter(Boolean);
    setMapeo((list) =>
      list.map((m) => (m.id === id ? { ...m, direcciones: sanitized } : m))
    );
  };

  const addRow = () => {
    setMapeo((list) => [
      ...list,
      {
        id: uid(),
        estudio: "",
        provincia: "",
        localidades: "",
        direcciones: [],
      },
    ]);
    showToast("Nueva fila agregada", "success");
  };

  const delRow = (id) => {
    setMapeo((list) => list.filter((m) => m.id !== id));
    setFilaAEliminar(null);
    showToast("Estudio eliminado", "info");
  };

  const agregarFilas = (nuevas) => {
    if (!nuevas.length) return;
    const sanitized = nuevas.map((item) => sanitizeObject(item));
    setMapeo((list) => [...list, ...sanitized]);
    setPegado("");
    setShowImport(false);
    showToast(`${sanitized.length} estudios importados`, "success");
  };

  const normalizarDirecciones = (o) =>
    Array.isArray(o.direcciones)
      ? o.direcciones.map((d) => sanitizeString(d)).filter(Boolean)
      : o.direccion
      ? [sanitizeString(o.direccion)]
      : [];

  const normalizarFilas = (o) => ({
    id: uid(),
    estudio: o.estudio || "",
    provincia: o.provincia || "",
    localidades: o.localidades || "",
    direcciones: normalizarDirecciones(o),
    direccion: o.direccion || "",
    prolegal: !!o.prolegal,
    cargaProlegal: o.cargaProlegal || "",
    entrevistador: o.entrevistador || "",
    sucursales: Array.isArray(o.sucursales) ? o.sucursales : undefined,
  });

  const importar = () => {
    const texto = pegado.trim();
    if (!texto) return;
    if (texto.startsWith("[") || texto.startsWith("{")) {
      try {
        const parsed = JSON.parse(texto);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        agregarFilas(arr.map(normalizarFilas));
      } catch {
        alert("El JSON pegado no es válido.");
      }
      return;
    }
    const filas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const nuevas = filas.map((l) => {
      const partes = l.split(/\t|;/).map((p) => p.trim());
      return {
        id: uid(),
        estudio: sanitizeString(partes[0] || ""),
        provincia: sanitizeString(partes[1] || ""),
        localidades: sanitizeString(partes[2] || ""),
        direcciones: (partes[3] || "")
          .split("|")
          .map((d) => sanitizeString(d))
          .filter(Boolean),
      };
    });
    agregarFilas(nuevas);
  };

  const importarArchivo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        agregarFilas(arr.map(normalizarFilas));
      } catch {
        alert("No se pudo leer el archivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportar = () => {
    const data = JSON.stringify(
      mapeo.map(({ id, ...resto }) => resto),
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estudios_juridicos_${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exportación completada", "success");
  };

  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) =>
      (a[ordenarPor] || "")
        .toString()
        .toLowerCase()
        .localeCompare((b[ordenarPor] || "").toString().toLowerCase())
    );
  }, [filtrados, ordenarPor]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Estudios Jurídicos
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <TextInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="pl-8"
              style={{ width: 220 }}
            />
          </div>
          <Select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            options={[
              { value: "estudio", label: "Por Estudio" },
              { value: "provincia", label: "Por Provincia" },
              { value: "localidades", label: "Por Localidades" },
              { value: "direcciones", label: "Por Dirección" },
            ]}
            style={{ width: 150 }}
          />
          <BtnOutline
            onClick={exportar}
            icon={FileText}
            size="sm"
            color="var(--color-accent)"
          >
            Exportar
          </BtnOutline>
          <BtnOutline
            onClick={() => setShowImport((s) => !s)}
            icon={Upload}
            size="sm"
            color="var(--color-accent)"
          >
            Importar
          </BtnOutline>
          <Btn onClick={addRow} icon={Plus} size="sm">
            Fila
          </Btn>
        </div>
      </div>

      {showImport && (
        <div
          className="mb-4 rounded-lg p-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
          }}
        >
          <div
            className="text-xs mb-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            Pegá filas (Estudio; Provincia; Localidades; Direcciones separadas
            por |) o JSON:
          </div>
          <TextArea
            rows={4}
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            placeholder="Estudio Pérez; Buenos Aires; La Plata, Berisso; Av. España 123 | Calle 5 678"
          />
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Btn onClick={importar} size="sm">
              Importar filas
            </Btn>
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              — o —
            </span>
            <button
              onClick={() =>
                fileInputRef.current && fileInputRef.current.click()
              }
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors hover:opacity-70"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent)",
              }}
            >
              <Upload size={13} /> Elegir archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={importarArchivo}
              className="hidden"
            />
          </div>
        </div>
      )}

      <div
        className="rounded-lg overflow-x-auto"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--color-surface)" }}>
              {[
                { h: "Estudio Jurídico", min: 200 },
                { h: "Provincia", min: 140 },
                { h: "Localidades", min: 160 },
                { h: "Dirección", min: 260 },
                { h: "", min: 0, acciones: true },
              ].map(({ h, min, acciones }) => (
                <th
                  key={h || "acciones"}
                  className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider ${
                    acciones ? "text-center" : "text-left"
                  }`}
                  style={{
                    color: "var(--color-text-muted)",
                    ...(min ? { minWidth: min } : {}),
                    ...(acciones ? { width: 48 } : {}),
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((m, i) => (
              <tr
                key={m.id}
                style={{
                  backgroundColor:
                    i % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <td className="px-2 py-1.5">
                  <TextInput
                    value={m.estudio}
                    onChange={(e) => update(m.id, "estudio", e.target.value)}
                    placeholder="Nombre"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    value={m.provincia}
                    onChange={(e) => update(m.id, "provincia", e.target.value)}
                    placeholder="Provincia"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    value={m.localidades}
                    onChange={(e) =>
                      update(m.id, "localidades", e.target.value)
                    }
                    placeholder="Localidades"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <DireccionCell
                    direcciones={m.direcciones}
                    onChange={(next) => updateDirecciones(m.id, next)}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => setFilaAEliminar(m)}
                    className="p-1 rounded hover:opacity-70 transition-opacity"
                  >
                    <Trash2
                      size={14}
                      style={{ color: "var(--color-danger)" }}
                    />
                  </button>
                </td>
              </tr>
            ))}
            {ordenados.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  No hay estudios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!filaAEliminar}
        title="Eliminar estudio"
        message={`Seguro que quieres eliminar "${
          filaAEliminar?.estudio || "este estudio"
        }"?`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setFilaAEliminar(null)}
        onConfirm={() => delRow(filaAEliminar.id)}
      />
    </div>
  );
}
