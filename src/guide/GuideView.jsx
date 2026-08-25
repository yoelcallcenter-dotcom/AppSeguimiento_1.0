import React from "react";
import { Printer, Download, FileText } from "lucide-react";
import { Btn } from "../components/common/Btn";
import { BtnOutline } from "../components/common/BtnOutline";
import { GUIDE_SECTIONS, getGuideText } from "./guideData";
import { openPrintWindow } from "../utils/printWindow";
import { APP_VERSION } from "../core/version";

function makeHTML(dateStr) {
  const content = getGuideText();
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Guia de Usuario - AppSeguimiento</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.8; color: #E5E7EB; background: #0F172A; }
    h1 { color: #D4AF37; font-size: 28px; text-align: center; border-bottom: 3px solid #D4AF37; padding-bottom: 20px; }
    h2 { color: #D4AF37; font-size: 20px; margin-top: 30px; border-bottom: 1px solid #374151; padding-bottom: 8px; }
    .fecha { text-align: right; color: #9CA3AF; font-size: 12px; margin-bottom: 30px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #374151; text-align: center; font-size: 12px; color: #9CA3AF; }
    pre { white-space: pre-wrap; font-family: 'Inter', Arial, sans-serif; }
    @media print { body { padding: 20px; background: white; color: #1A1A2E; } h1, h2 { color: #D4AF37; } .footer { border-top-color: #ddd; } }
  </style>
</head>
<body>
  <h1>Guia de Usuario - AppSeguimiento</h1>
  <div class="fecha">${dateStr}</div>
  <pre>${content}</pre>
  <div class="footer">
    AppSeguimiento v${APP_VERSION} - Sistema de gestion de casos ART<br>
    ${dateStr}
  </div>
  <div class="no-print" style="text-align:center; margin-top:30px;">
    <button type="button" class="btn-print" style="padding:12px 30px; background:#D4AF37; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:14px; color:#14181F;">
      Imprimir / Guardar como PDF
    </button>
  </div>
</body>
</html>`;
}

export function GuideView({ showToast }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }) + " - " + now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const handlePrint = () => {
    const w = openPrintWindow(makeHTML(dateStr));
    if (!w) { showToast("Permite ventanas emergentes para imprimir", "warning"); return; }
  };

  const handleDownload = () => {
    const blob = new Blob([getGuideText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guia_usuario_${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Guia descargada como TXT", "success");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={20} color="var(--color-accent)" />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Guia de Usuario
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
        >
          {GUIDE_SECTIONS.length} secciones
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn onClick={handlePrint} icon={Printer} size="sm" color="var(--color-accent)">
          Imprimir / PDF
        </Btn>
        <BtnOutline onClick={handleDownload} icon={Download} size="sm" color="var(--color-accent)">
          Descargar TXT
        </BtnOutline>
      </div>

      <div
        className="rounded-lg p-4 space-y-6"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {GUIDE_SECTIONS.map((section) => (
          <div key={section.id}>
            <div className="text-sm font-bold mb-2" style={{ color: "var(--color-accent)" }}>
              {section.title}
            </div>
            <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {section.content}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        <FileText size={12} className="inline mr-1" />
        Haz clic en "Imprimir / PDF" para guardar como PDF. "Descargar TXT" para archivo de texto.
      </div>
    </div>
  );
}
