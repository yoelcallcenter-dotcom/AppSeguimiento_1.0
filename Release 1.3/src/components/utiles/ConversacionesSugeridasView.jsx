import React, { useState, useEffect } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";
import { DEFAULT_PLANTILLAS } from "../../utils/constants";

export function ConversacionesSugeridasView({ config, setConfig, showToast }) {
  const [categoria, setCategoria] = useState("Accidente Laboral");
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const operador = config.operador || "Operador";
  const categorias = [
    "Accidente Laboral",
    "Enfermedad Profesional",
    "Accidente de Transito",
    "Referencia",
  ];

  const getMensajes = () => {
    const key = `conversaciones_${categoria.replace(/\s/g, "_")}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : DEFAULT_PLANTILLAS;
  };
  const setMensajes = (mensajes) => {
    const sanitized = mensajes.map((m) => sanitizeString(m));
    localStorage.setItem(
      `conversaciones_${categoria.replace(/\s/g, "_")}`,
      JSON.stringify(sanitized)
    );
  };
  const [mensajes, setMensajesLocal] = useState(getMensajes());

  useEffect(() => {
    setMensajesLocal(getMensajes());
  }, [categoria]);

  const guardarMensajes = (nuevos) => {
    const sanitized = nuevos.map((m) => sanitizeString(m));
    setMensajesLocal(sanitized);
    setMensajes(sanitized);
  };
  const agregarMensaje = () => {
    const sanitized = sanitizeString(nuevoMensaje.trim());
    if (!sanitized) return;
    guardarMensajes([...mensajes, sanitized]);
    setNuevoMensaje("");
    showToast("Mensaje agregado", "success");
  };
  const eliminarMensaje = (idx) => {
    guardarMensajes(mensajes.filter((_, i) => i !== idx));
    setConfirmEliminar(null);
    showToast("Mensaje eliminado", "info");
  };
  const editarMensaje = (idx, valor) => {
    const sanitized = sanitizeString(valor);
    guardarMensajes(mensajes.map((m, i) => (i === idx ? sanitized : m)));
  };
  const restaurar = () => {
    const sanitized = DEFAULT_PLANTILLAS.map((m) => sanitizeString(m));
    guardarMensajes(sanitized);
    showToast("Mensajes restaurados", "success");
  };

  return (
    <div className="space-y-6">
      <div>
        <div
          className="text-sm font-semibold mb-2"
          style={{ color: "var(--color-text)" }}
        >
          Operador
        </div>
        <TextInput
          value={config.operador || ""}
          onChange={(e) => setConfig({ ...config, operador: e.target.value })}
          placeholder="Nombre del operador"
          style={{ maxWidth: 280 }}
        />
        <div
          className="text-xs mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          La variable <code style={{ color: "var(--color-accent)" }}>{'{OPERADOR}'}</code> en los mensajes se reemplaza automáticamente con este nombre.
        </div>
      </div>
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {categorias.map((c) => (
            <button
              key={c}
              className={`category-tab ${categoria === c ? "active" : ""}`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
          <BtnOutline onClick={restaurar} color="var(--color-accent)" size="sm">
            Restaurar originales
          </BtnOutline>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <TextInput
            className="flex-1 min-w-[200px]"
            placeholder="Nuevo mensaje..."
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
          />
          <Btn onClick={agregarMensaje} icon={Plus} size="sm">
            Agregar
          </Btn>
        </div>
        <div className="space-y-2">
          {mensajes.map((m, i) => (
            <div
              key={i}
              className="rounded-md p-2.5 flex gap-2 items-start"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex-1">
                <TextArea
                  rows={2}
                  value={m}
                  onChange={(e) => editarMensaje(i, e.target.value)}
                  className="w-full"
                />
                {m.includes("{OPERADOR}") && (
                  <div
                    className="text-xs mt-1 px-2 py-1 rounded"
                    style={{
                      color: "var(--color-accent)",
                      backgroundColor: "var(--color-surface2)",
                    }}
                  >
                    Vista previa:{" "}
                    {m.split(/\{OPERADOR\}/).map((part, idx) => (
                      <span key={idx}>
                        {idx > 0 && (
                          <strong style={{ color: "var(--color-success)" }}>
                            {operador}
                          </strong>
                        )}
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    const texto = m.replace(/\{OPERADOR\}/g, operador);
                    navigator.clipboard.writeText(texto).then(() => {
                      showToast("Mensaje copiado", "success");
                    });
                  }}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                  title="Copiar mensaje"
                >
                  <Copy size={14} style={{ color: "var(--color-accent)" }} />
                </button>
                <button
                  onClick={() => setConfirmEliminar(i)}
                  className="p-1 rounded hover:opacity-70 transition-opacity"
                >
                  <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
                </button>
              </div>
            </div>
          ))}
          {mensajes.length === 0 && (
            <div
              className="text-xs py-4 text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              No hay mensajes para esta categoría.
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmEliminar !== null}
        title="Eliminar mensaje"
        message="Seguro que quieres eliminar este mensaje?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => eliminarMensaje(confirmEliminar)}
      />
    </div>
  );
}
