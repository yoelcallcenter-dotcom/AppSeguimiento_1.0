import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { Btn } from "./Btn";
import { TextInput } from "./TextInput";
import { sanitizeString } from "../../utils/sanitize";
import { soundSystem } from "../../core/notifications/soundSystem";

export function TagsManager({ tags, setTags, onAddTag, onRemoveTag }) {
  const [nuevaTag, setNuevaTag] = useState("");

  const agregar = () => {
    const sanitized = sanitizeString(nuevaTag.trim());
    if (!sanitized) return;
    onAddTag(sanitized);
    soundSystem.playAction("save");
    setNuevaTag("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {tags.map((t, i) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--color-text)" }}
            >
              {i > 0 && (
                <span style={{ color: "var(--color-text-muted)" }}>,</span>
              )}
              <span style={{ color: "var(--color-accent)" }}>
                {sanitizeString(t)}
              </span>
              <button
                onClick={() => { onRemoveTag(t); soundSystem.playAction("delete"); }}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Eliminar etiqueta ${t}`}
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1 w-full">
        <TextInput
          value={nuevaTag}
          onChange={(e) => setNuevaTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
          placeholder="Nueva etiqueta..."
          className="flex-1"
          style={{ padding: "2px 8px", fontSize: 10, minWidth: 0 }}
        />
        <Btn onClick={agregar} size="sm" icon={Plus} style={{ flexShrink: 0 }}>
          Agregar
        </Btn>
      </div>
    </div>
  );
}
