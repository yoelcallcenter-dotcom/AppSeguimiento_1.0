import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, Copy, Plus, Trash2, Check, ShieldCheck, Globe, Pencil, KeySquare } from "lucide-react";
import { Btn } from "../../../components/common/Btn";
import { BtnOutline } from "../../../components/common/BtnOutline";
import { Field } from "../../../components/common/Field";
import { TextInput } from "../../../components/common/TextInput";
import { TextArea } from "../../../components/common/TextArea";

export function CredentialsSection({ credentials, createCredential, editCredential, removeCredential, showToast }) {
  const [editing, setEditing] = useState(null);
  const [visibleId, setVisibleId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const entries = credentials.entries || [];

  const startNew = () => setEditing({ id: "nuevo", service: "", user: "", password: "", url: "", note: "" });
  const startEdit = (entry) => setEditing({ ...entry });

  const save = () => {
    if (!editing) return;
    const { id, service, user, password, url, note } = editing;
    if (!service.trim() && !user.trim() && !password.trim()) {
      showToast("Completá al menos un campo", "warning");
      return;
    }
    const payload = { service: service.trim(), user: user.trim(), password: password.trim(), url: url.trim(), note: note.trim() };
    if (id === "nuevo") createCredential(payload);
    else editCredential(id, payload);
    setEditing(null);
    showToast("Acceso guardado", "success");
  };

  const copy = async (entry) => {
    try {
      await navigator.clipboard.writeText(entry.password || "");
      setCopiedId(entry.id);
      showToast("Contraseña copiada", "success");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      showToast("No se pudo copiar", "error");
    }
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <KeyRound size={16} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Accesos personales</span>
        {!editing && (
          <BtnOutline size="sm" onClick={startNew} className="ml-auto">
            <Plus size={12} /> Agregar acceso
          </BtnOutline>
        )}
      </div>

      <div
        className="flex items-start gap-2 text-[11px] px-3 py-2 rounded-md mb-3"
        style={{ backgroundColor: "var(--color-warning)11", border: "1px solid var(--color-warning)44", color: "var(--color-text)" }}
      >
        <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
        <span>
          Se guardan solo en este dispositivo. No se incluyen en exportaciones ni backups,
          y nunca se registran en logs.
        </span>
      </div>

      {editing && (
        <div
          className="p-3 rounded-md space-y-2 mb-4 animate-fade-in"
          style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-accent)" }}
        >
          <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
            {editing.id === "nuevo" ? "Nuevo acceso" : "Editar acceso"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <Field label="Servicio">
              <TextInput value={editing.service} onChange={(e) => setEditing({ ...editing, service: e.target.value })} placeholder="Ej: Sistema ART" />
            </Field>
            <Field label="Usuario">
              <TextInput value={editing.user} onChange={(e) => setEditing({ ...editing, user: e.target.value })} placeholder="Ej: operador123" />
            </Field>
            <Field label="Contraseña">
              <TextInput type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} placeholder="••••••••••" />
            </Field>
            <Field label="URL (opcional)">
              <TextInput value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://..." />
            </Field>
          </div>
          <Field label="Nota (opcional)">
            <TextArea rows={2} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Btn size="sm" onClick={save}>Guardar</Btn>
            <BtnOutline size="sm" onClick={() => setEditing(null)}>Cancelar</BtnOutline>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div
          className="py-10 px-3 rounded-md text-center"
          style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)" }}
        >
          <KeySquare size={22} className="mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
          <div className="text-xs font-semibold mb-1" style={{ color: "var(--color-text)" }}>
            Todavía no guardaste ningún acceso
          </div>
          <div className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>
            Guardá usuarios y contraseñas de los sistemas que usás todos los días.
          </div>
          <BtnOutline size="sm" onClick={startNew}>
            <Plus size={12} /> Agregar tu primer acceso
          </BtnOutline>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map((entry) => {
            const isVisible = visibleId === entry.id;
            const isCopied = copiedId === entry.id;
            return (
              <div
                key={entry.id}
                className="p-2.5 rounded-md transition-colors hover:border-[var(--color-accent)]"
                style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)", borderLeft: "3px solid var(--color-accent)" }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="flex-1 min-w-0 text-xs font-bold truncate" style={{ color: "var(--color-accent)" }} title={entry.service || "Acceso sin servicio"}>
                    {entry.service || "Acceso sin servicio"}
                  </div>
                  <button
                    onClick={() => setVisibleId(isVisible ? null : entry.id)}
                    className="p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: isVisible ? "var(--color-accent)" : "var(--color-text-muted)" }}
                    aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    title={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => copy(entry)}
                    className="p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: isCopied ? "var(--color-success)" : "var(--color-text-muted)" }}
                    aria-label="Copiar contraseña"
                    title="Copiar contraseña"
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-text-muted)" }}
                    aria-label="Editar acceso"
                    title="Editar acceso"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => removeCredential(entry.id)}
                    className="p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-danger)" }}
                    aria-label="Eliminar acceso"
                    title="Eliminar acceso"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {entry.user && (
                  <div className="text-[11px] truncate" style={{ color: "var(--color-text)" }}>{entry.user}</div>
                )}
                {isVisible && (
                  <div
                    className="mt-1 text-[12px] font-mono px-2 py-1 rounded select-all"
                    style={{ color: "var(--color-text)", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    {entry.password || "—"}
                  </div>
                )}
                {(entry.url || entry.note) && (
                  <div className="mt-1 space-y-0.5 min-w-0">
                    {entry.url && (
                      <div className="text-[11px] truncate flex items-center gap-1" style={{ color: "var(--color-accent)" }} title={entry.url}>
                        <Globe size={11} className="flex-shrink-0" /> {entry.url}
                      </div>
                    )}
                    {entry.note && (
                      <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }} title={entry.note}>
                        {entry.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CredentialsSection;
