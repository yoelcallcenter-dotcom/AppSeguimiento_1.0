import React, { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Btn } from "../common/Btn";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeObject, sanitizeString } from "../../utils/sanitize";

export function PasosView({
  pasos,
  setPasos,
  tips,
  setTips,
  links,
  setLinks,
  showToast,
}) {
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [confirmEliminarTip, setConfirmEliminarTip] = useState(null);
  const [confirmEliminarLink, setConfirmEliminarLink] = useState(null);

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const agregar = (list, setList, item) => {
    const sanitized = sanitizeObject(item);
    setList([...list, { id: uid(), ...sanitized }]);
    showToast("Elemento agregado", "success");
  };

  const eliminar = (list, setList, id) => {
    setList(list.filter((l) => l.id !== id));
    setConfirmEliminar(null);
    showToast("Elemento eliminado", "info");
  };

  const editar = (list, setList, id, campo, valor) => {
    const sanitized = sanitizeString(valor);
    setList(list.map((l) => (l.id === id ? { ...l, [campo]: sanitized } : l)));
  };

  const abrirLink = (url) => {
    if (url && url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (url) {
      window.open("https://" + url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Pasos a Seguir
          </div>
          <Btn
            onClick={() =>
              agregar(pasos, setPasos, {
                titulo: `Paso ${pasos.length + 1}`,
                contenido: "",
              })
            }
            icon={Plus}
            size="sm"
          >
            Agregar paso
          </Btn>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pasos.map((p) => (
            <div
              key={p.id}
              className="rounded-lg p-3"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <TextInput
                value={p.titulo}
                onChange={(e) =>
                  editar(pasos, setPasos, p.id, "titulo", e.target.value)
                }
                placeholder="Titulo"
                className="mb-2"
              />
              <TextArea
                rows={2}
                value={p.contenido}
                onChange={(e) =>
                  editar(pasos, setPasos, p.id, "contenido", e.target.value)
                }
                placeholder="Contenido..."
              />
              <button
                onClick={() => setConfirmEliminar(p.id)}
                className="mt-2 text-[11px] font-semibold hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-danger)" }}
              >
                <Trash2 size={12} className="inline mr-1" /> Eliminar
              </button>
            </div>
          ))}
        </div>
        <ConfirmDialog
          open={!!confirmEliminar}
          title="Eliminar paso"
          message="Seguro que quieres eliminar este paso?"
          confirmLabel="Eliminar"
          confirmColor="var(--color-danger)"
          onCancel={() => setConfirmEliminar(null)}
          onConfirm={() => eliminar(pasos, setPasos, confirmEliminar)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Tips del Llamado
          </div>
          <Btn
            onClick={() => agregar(tips, setTips, { contenido: "" })}
            icon={Plus}
            size="sm"
          >
            Agregar tip
          </Btn>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tips.map((t) => (
            <div
              key={t.id}
              className="rounded-lg p-3 flex gap-2 items-start"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex-1">
                <TextInput
                  value={t.contenido}
                  onChange={(e) =>
                    editar(tips, setTips, t.id, "contenido", e.target.value)
                  }
                  placeholder="Tip..."
                  className="w-full"
                />
              </div>
              <button
                onClick={() => setConfirmEliminarTip(t.id)}
                className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label="Eliminar tip"
              >
                <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
              </button>
            </div>
          ))}
        </div>
        <ConfirmDialog
          open={!!confirmEliminarTip}
          title="Eliminar tip"
          message="Seguro que quieres eliminar este tip?"
          confirmLabel="Eliminar"
          confirmColor="var(--color-danger)"
          onCancel={() => setConfirmEliminarTip(null)}
          onConfirm={() => {
            eliminar(tips, setTips, confirmEliminarTip);
            setConfirmEliminarTip(null);
          }}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Links Utiles
          </div>
          <Btn
            onClick={() =>
              agregar(links, setLinks, {
                titulo: `Link ${links.length + 1}`,
                url: "",
              })
            }
            icon={Plus}
            size="sm"
          >
            Agregar link
          </Btn>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {links.map((l) => (
            <div
              key={l.id}
              className="rounded-lg p-3 flex gap-2 items-center flex-wrap md:flex-nowrap"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <TextInput
                value={l.titulo}
                onChange={(e) =>
                  editar(links, setLinks, l.id, "titulo", e.target.value)
                }
                placeholder="Titulo"
                className="flex-1 min-w-[100px]"
                style={{ minWidth: "100px" }}
              />

              <div className="flex-1 flex items-center gap-1 min-w-[120px]">
                <TextInput
                  value={l.url}
                  onChange={(e) =>
                    editar(links, setLinks, l.id, "url", e.target.value)
                  }
                  placeholder="URL"
                  className="flex-1"
                  style={{ minWidth: "80px" }}
                />
                {l.url && (
                  <button
                    onClick={() => abrirLink(l.url)}
                    className="p-1.5 rounded hover:opacity-70 transition-opacity flex-shrink-0"
                    title="Abrir en nueva ventana"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setConfirmEliminarLink(l.id)}
                className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
                aria-label="Eliminar link"
              >
                <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
              </button>
            </div>
          ))}
        </div>
        <ConfirmDialog
          open={!!confirmEliminarLink}
          title="Eliminar link"
          message="Seguro que quieres eliminar este link?"
          confirmLabel="Eliminar"
          confirmColor="var(--color-danger)"
          onCancel={() => setConfirmEliminarLink(null)}
          onConfirm={() => {
            eliminar(links, setLinks, confirmEliminarLink);
            setConfirmEliminarLink(null);
          }}
        />
      </div>
    </div>
  );
}
