import React, { useState, useMemo } from "react";
import { Plus, FileText, Upload, Trash2 } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";
import { hoyISO } from "../../utils/dateUtils";

export function AseguradorasView({
  art,
  setArt,
  transito,
  setTransito,
  showToast,
}) {
  const [tipo, setTipo] = useState("ART");
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [nuevaObs, setNuevaObs] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const lista = tipo === "ART" ? art : transito;
  const setLista = tipo === "ART" ? setArt : setTransito;

  // Orden alfabético solo para visualización: los datos conservan su orden original.
  const listaOrdenada = useMemo(
    () =>
      [...lista].sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es")
      ),
    [lista]
  );

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const agregar = () => {
    const nombre = sanitizeString(nuevaNombre.trim());
    const obs = sanitizeString(nuevaObs.trim());
    if (!nombre) return;
    setLista([...lista, { id: uid(), nombre, observaciones: obs }]);
    setNuevaNombre("");
    setNuevaObs("");
    showToast("Aseguradora agregada", "success");
  };
  const eliminar = (id) => {
    setLista(lista.filter((a) => a.id !== id));
    setConfirmEliminar(null);
    showToast("Aseguradora eliminada", "info");
  };
  const editar = (id, campo, valor) => {
    const sanitized = sanitizeString(valor);
    setLista(
      lista.map((a) => (a.id === id ? { ...a, [campo]: sanitized } : a))
    );
  };

  const exportar = () => {
    const data = JSON.stringify(lista, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo.toLowerCase()}_${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exportación completada", "success");
  };

  const importar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const sanitized = arr.map((a) => ({
          id: uid(),
          nombre: sanitizeString(a.nombre || ""),
          observaciones: sanitizeString(a.observaciones || ""),
        }));
        setLista([...lista, ...sanitized]);
        showToast(`${sanitized.length} aseguradoras importadas`, "success");
      } catch {
        alert("El archivo no es un JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div
          className="flex gap-1"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "8px",
            padding: "3px",
          }}
        >
          <button
            onClick={() => setTipo("ART")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tipo === "ART"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            ART
          </button>
          <button
            onClick={() => setTipo("Tránsito")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tipo === "Tránsito"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Tránsito
          </button>
        </div>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {lista.length} aseguradora{lista.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TextInput
          placeholder="Nombre"
          value={nuevaNombre}
          onChange={(e) => setNuevaNombre(e.target.value)}
          style={{ width: 220 }}
        />
        <TextInput
          placeholder="Observaciones"
          value={nuevaObs}
          onChange={(e) => setNuevaObs(e.target.value)}
          style={{ width: 280 }}
        />
        <Btn onClick={agregar} icon={Plus} size="sm">
          Agregar
        </Btn>
        <BtnOutline
          onClick={exportar}
          icon={FileText}
          size="sm"
          color="var(--color-accent)"
        >
          Exportar
        </BtnOutline>
        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors hover:opacity-70"
          style={{
            backgroundColor: "transparent",
            border: "1px solid var(--color-accent)",
            color: "var(--color-accent)",
          }}
        >
          <Upload size={13} /> Importar
          <input
            type="file"
            accept=".json,application/json"
            onChange={importar}
            className="hidden"
          />
        </label>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--color-surface)" }}>
              <th
                className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Nombre
              </th>
              <th
                className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Observaciones
              </th>
              <th className="px-3 py-2.5" style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {listaOrdenada.map((a, i) => (
              <tr
                key={a.id}
                style={{
                  backgroundColor:
                    i % 2 ? "var(--color-surface2)" : "var(--color-surface3)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <td className="px-2 py-1.5">
                  <TextInput
                    value={a.nombre}
                    onChange={(e) => editar(a.id, "nombre", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    value={a.observaciones || ""}
                    onChange={(e) =>
                      editar(a.id, "observaciones", e.target.value)
                    }
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => setConfirmEliminar(a.id)}
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
            {listaOrdenada.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  No hay aseguradoras cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmEliminar}
        title="Eliminar aseguradora"
        message="Seguro que quieres eliminar esta aseguradora?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => eliminar(confirmEliminar)}
      />
    </div>
  );
}
