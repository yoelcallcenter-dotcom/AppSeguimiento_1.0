import React, { useState, useCallback } from "react";
import { FileText, X, Check, User, ClipboardList, BarChart3, Target, TrendingUp } from "lucide-react";
import { useOperatorState } from "./useOperatorState";
import {
  getDayState,
  getDailyGoalProgress,
  getMonthlyGoalProgress,
  getRequiredDailyPace,
  getEffectiveWorkDays,
  getPerEffectiveDayMetrics,
} from "./operatorMetrics";
import { getDailyGreeting } from "./operatorMessages";
import { Btn, OutlineButton } from "../../components/common/Btn";

const SECCIONES = [
  { key: "perfil", label: "Perfil del operador", Icon: User },
  { key: "jornada", label: "Jornada y objetivos diarios", Icon: ClipboardList },
  { key: "metricas", label: "Métricas y ritmo", Icon: BarChart3 },
  { key: "semanales", label: "Objetivos semanales", Icon: Target },
  { key: "resumen", label: "Resumen del período", Icon: TrendingUp },
];

function el(doc, tag, className) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  return node;
}

function text(doc, parent, value) {
  parent.appendChild(doc.createTextNode(value == null ? "" : String(value)));
}

export function PdfExportModal({ open, onClose, config, casos, showToast }) {
  const [selected, setSelected] = useState(() => SECCIONES.map((s) => s.key));
  const [exportando, setExportando] = useState(false);
  const { profile, availability, goals } = useOperatorState();

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const allCases = casos || [];
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayState = getDayState(profile, availability, todayISO, goals, allCases);
  const daily = getDailyGoalProgress(goals, allCases, todayISO);
  const monthly = getMonthlyGoalProgress(goals, allCases, year, month);
  const pace = getRequiredDailyPace(goals, allCases, year, month, availability, profile.workingDays, todayISO);
  const effective = getEffectiveWorkDays(availability, year, month, profile.workingDays);
  const perDay = getPerEffectiveDayMetrics(allCases, availability, year, month, profile.workingDays);

  const toggle = useCallback((key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.length === SECCIONES.length ? [] : SECCIONES.map((s) => s.key)
    );
  }, []);

  const handleExport = useCallback(() => {
    if (selected.length === 0) return;
    setExportando(true);

    try {
      const ventana = window.open("", "_blank", "width=900,height=700");
      try { ventana.opener = null; } catch {}
      if (!ventana) {
        showToast("Permite ventanas emergentes para exportar", "error");
        setExportando(false);
        return;
      }

      const doc = ventana.document;
      const title = el(doc, "title");
      text(doc, title, "Mi Espacio - AppSeguimiento ART");
      doc.head.appendChild(title);

      const style = el(doc, "style");
      style.textContent = `
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 22px; margin-bottom: 5px; }
        h2 { font-size: 16px; margin: 16px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        .card { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
        .stat { display: inline-block; margin-right: 24px; }
        .stat-num { font-size: 20px; font-weight: bold; }
        .stat-label { font-size: 11px; color: #666; }
        .progress-bar { height: 6px; background: #e0e0e0; border-radius: 3px; margin-top: 4px; }
        .progress-fill { height: 100%; background: #D9A441; border-radius: 3px; }
        .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; }
        .no-print { text-align: center; margin-top: 20px; }
        .btn-print { padding: 10px 20px; background: #D9A441; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; }
        @media print { .no-print { display: none; } body { padding: 0; } }
      `;
      doc.head.appendChild(style);

      const greetingObj = getDailyGreeting({ profile, date: now });
      const greetingText = greetingObj?.text || "Hola";
      const header = el(doc, "div");
      const h1 = el(doc, "h1");
      text(doc, h1, "Mi Espacio");
      header.appendChild(h1);
      const subtitle = el(doc, "div", "subtitle");
      text(doc, subtitle, `${greetingText}, ${now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`);
      header.appendChild(subtitle);
      doc.body.appendChild(header);

      if (selected.includes("perfil")) {
        const h2 = el(doc, "h2");
        text(doc, h2, "Perfil del operador");
        doc.body.appendChild(h2);
        const card = el(doc, "div", "card");
        const rows = [
          ["Operador", profile?.displayName || profile?.fullName || "No especificado"],
          ["ART / Empresa", profile?.company || "—"],
          ["Zona", profile?.zone || "—"],
        ];
        rows.forEach(([label, value]) => {
          const p = el(doc, "p");
          const strong = el(doc, "strong");
          text(doc, strong, label + ": ");
          p.appendChild(strong);
          text(doc, p, value);
          card.appendChild(p);
        });
        doc.body.appendChild(card);
      }

      if (selected.includes("jornada")) {
        const h2 = el(doc, "h2");
        text(doc, h2, "Jornada y objetivos diarios");
        doc.body.appendChild(h2);
        const card = el(doc, "div", "card");
        const meta = el(doc, "div");
        const items = [
          [daily.cases.current, daily.cases.target, "Casos"],
          [daily.reports.current, daily.reports.target, "Reportes"],
          [daily.firmas?.current || 0, daily.firmas?.target || 0, "Firmas"],
        ];
        items.forEach(([cur, tgt, label]) => {
          const stat = el(doc, "div", "stat");
          const num = el(doc, "div", "stat-num");
          text(doc, num, `${cur}/${tgt}`);
          stat.appendChild(num);
          const lbl = el(doc, "div", "stat-label");
          text(doc, lbl, label);
          stat.appendChild(lbl);
          const bar = el(doc, "div", "progress-bar");
          const fill = el(doc, "div", "progress-fill");
          fill.style.width = Math.min(100, tgt > 0 ? (cur / tgt) * 100 : 0) + "%";
          bar.appendChild(fill);
          stat.appendChild(bar);
          meta.appendChild(stat);
        });
        card.appendChild(meta);
        doc.body.appendChild(card);
      }

      if (selected.includes("metricas")) {
        const h2 = el(doc, "h2");
        text(doc, h2, "Métricas y ritmo");
        doc.body.appendChild(h2);
        const card = el(doc, "div", "card");
        const paceText = pace.cases != null
          ? `${pace.cases} casos/día, ${pace.reports != null ? pace.reports + " reportes/día" : "—"}`
          : "Meta alcanzada o sin datos";
        const rows = [
          ["Días efectivos", `${effective.effective}/${effective.scheduled}`],
          ["Ritmo necesario/día", paceText],
          ["Promedio casos/día", String(perDay.casesPerDay || "—")],
          ["Promedio reportes/día", String(perDay.reportsPerDay || "—")],
        ];
        rows.forEach(([label, value]) => {
          const p = el(doc, "p");
          const strong = el(doc, "strong");
          text(doc, strong, label + ": ");
          p.appendChild(strong);
          text(doc, p, value);
          card.appendChild(p);
        });
        doc.body.appendChild(card);
      }

      if (selected.includes("semanales")) {
        const h2 = el(doc, "h2");
        text(doc, h2, "Objetivos semanales");
        doc.body.appendChild(h2);
        const card = el(doc, "div", "card");
        const p = el(doc, "p");
        text(doc, p, `Casos esta semana: ${monthly.cases?.current || 0}`);
        card.appendChild(p);
        const p2 = el(doc, "p");
        text(doc, p2, `Reportes esta semana: ${monthly.reports?.current || 0}`);
        card.appendChild(p2);
        doc.body.appendChild(card);
      }

      if (selected.includes("resumen")) {
        const h2 = el(doc, "h2");
        text(doc, h2, "Resumen del mes");
        doc.body.appendChild(h2);
        const card = el(doc, "div", "card");
        const rows = [
          ["Casos del mes", String(monthly.cases?.current || 0)],
          ["Reportes del mes", String(monthly.reports?.current || 0)],
          ["Firmas del mes", String(monthly.signed?.current || 0)],
          ["Días efectivos", `${effective.effective}/${effective.scheduled}`],
        ];
        rows.forEach(([label, value]) => {
          const p = el(doc, "p");
          const strong = el(doc, "strong");
          text(doc, strong, label + ": ");
          p.appendChild(strong);
          text(doc, p, value);
          card.appendChild(p);
        });
        doc.body.appendChild(card);
      }

      const footer = el(doc, "div", "footer");
      text(doc, footer, `Generado el ${now.toLocaleString("es-AR")} — AppSeguimiento ART`);
      doc.body.appendChild(footer);

      const noPrint = el(doc, "div", "no-print");
      const btn = el(doc, "button", "btn-print");
      btn.type = "button";
      text(doc, btn, "Imprimir / Guardar como PDF");
      btn.addEventListener("click", () => ventana.print());
      noPrint.appendChild(btn);
      doc.body.appendChild(noPrint);

      setTimeout(() => ventana.focus(), 500);
      showToast("PDF generado", "success");
      onClose();
    } catch {
      showToast("Error al generar PDF", "error");
    } finally {
      setExportando(false);
    }
  }, [selected, daily, monthly, pace, effective, perDay, profile, now, showToast, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-export-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl my-6 animate-scale-in"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="modal-header flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2" id="pdf-export-title">
            <FileText size={18} style={{ color: "var(--color-accent)" }} />
            <span className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              Exportar Mi Espacio a PDF
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" aria-label="Cerrar">
            <X size={18} style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-2 mb-4">
            <button
              onClick={toggleAll}
              className="w-full flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
              style={{
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Check size={12} style={{ opacity: selected.length === SECCIONES.length ? 1 : 0.3 }} />
              {selected.length === SECCIONES.length ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>

            {SECCIONES.map((s) => {
              const active = selected.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggle(s.key)}
                  className="w-full flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
                  style={{
                    backgroundColor: active ? "var(--color-accent)" : "var(--color-surface)",
                    color: active ? "#14181F" : "var(--color-text-muted)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                  }}
                >
                  <Check size={12} style={{ opacity: active ? 1 : 0.3 }} />
                  <s.Icon size={14} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <OutlineButton onClick={onClose} size="sm">
            Cancelar
          </OutlineButton>
          <Btn
            onClick={handleExport}
            disabled={selected.length === 0}
            loading={exportando}
            icon={FileText}
            size="sm"
            color="var(--color-success)"
            textColor="#ffffff"
          >
            Generar PDF
          </Btn>
        </div>
      </div>
    </div>
  );
}
