import React, { useState } from "react";
import {
  FileText,
  BookOpen,
  ScrollText,
  Download,
  Info,
} from "lucide-react";
import { BtnOutline } from "../common/BtnOutline";
import { APP_VERSION } from "../../core/version";
import { DOC_README, DOC_CHANGELOG, DOC_LICENSE } from "../../docs/docsContent";

const DOC_NAMES = {
  readme: { label: "README.md", file: "README.md" },
  changelog: { label: "CHANGELOG.md", file: "CHANGELOG.md" },
  license: { label: "LICENSE.md", file: "LICENSE.md" },
};

const CONTENIDOS = {
  readme: DOC_README,
  changelog: DOC_CHANGELOG,
  license: DOC_LICENSE,
};

export function DocumentacionView() {
  const [seccion, setSeccion] = useState("readme");

  const descargarDocumento = (seccionId) => {
    const info = DOC_NAMES[seccionId];
    const contenido = CONTENIDOS[seccionId] || "";
    const blob = new Blob([contenido], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = info?.file || "documento.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen size={18} color="var(--color-accent)" />
        <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Documentación del Sistema
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}>
          v{APP_VERSION}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(DOC_NAMES).map(([id, info]) => (
          <button
            key={id}
            onClick={() => setSeccion(id)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors hover:opacity-70 ${
              seccion === id
                ? "bg-[var(--color-surface)] text-[var(--color-accent)] border border-[var(--color-border)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {id === "readme" ? <BookOpen size={13} /> : <ScrollText size={13} />}
            {info.label}
          </button>
        ))}
      </div>

      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          maxHeight: 500,
          overflow: "auto",
        }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Info size={14} color="var(--color-text-muted)" />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {DOC_NAMES[seccion]?.label || "Documentación"}
            </span>
          </div>
          <BtnOutline onClick={() => descargarDocumento(seccion)} icon={Download} size="sm" color="var(--color-accent)">
            Descargar
          </BtnOutline>
        </div>

        {(() => {
          const contenido = CONTENIDOS[seccion] || "Selecciona un documento para ver su contenido.";
          return (
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--color-text)" }}>
              {contenido}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
