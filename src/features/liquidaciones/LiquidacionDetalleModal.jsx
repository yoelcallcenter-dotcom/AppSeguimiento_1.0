/**
 * LiquidacionDetalleModal.jsx (v1.10.4)
 * Detalle de liquidación de un operador (estudio jurídico): resumen del
 * mínimo, desglose por concepto con importes explicables, segundos conceptos
 * (marca manual "tránsito") y bajas contabilizadas.
 *
 * Sigue el patrón único de modal de la 1.10.3 (Modal.jsx): header y footer
 * fijos, UN solo scroll en el body. En liquidación CERRADA todo es solo
 * lectura (la instantánea no se toca); en preparación permite clasificar
 * categorías, marcar segundos conceptos y gestionar bajas manuales.
 */

import React from "react";
import { Banknote, AlertTriangle, CheckCircle2, XCircle, Lock, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../components/common/Modal";
import { Btn } from "../../components/common/Btn";
import { Select } from "../../components/common/Select";
import { TextInput } from "../../components/common/TextInput";
import { CATEGORIAS_LIQUIDACION, categoriaLabel } from "./liquidacionReglas";

const OPCIONES_CATEGORIA = [
  { value: "", label: "Sin clasificar" },
  ...CATEGORIAS_LIQUIDACION.map((c) => ({ value: c.key, label: c.label })),
];

function formatArs(n) {
  if (n == null) return "—";
  return `$ ${n.toLocaleString("es-AR")}`;
}

export function LiquidacionDetalleModal({
  isOpen,
  onClose,
  operador,
  reglas,
  cerrada,
  onCambiarCategoria,
  onToggleExtra,
  onAgregarBaja,
  onQuitarBaja,
}) {
  const minimo = reglas?.minimoFirmasNetas ?? 14;
  const op = operador;

  // Estado local del formulario de baja manual (solo preparación).
  const [bajaCasoId, setBajaCasoId] = React.useState("");
  const [bajaMotivo, setBajaMotivo] = React.useState("");
  React.useEffect(() => {
    if (!isOpen) {
      setBajaCasoId("");
      setBajaMotivo("");
    }
  }, [isOpen]);

  if (!op) return null;

  const idsBajados = new Set(op.bajasDetalle?.map((b) => b.casoId) || []);
  // Casos elegibles para una baja manual: conceptos base vivos (no bajados).
  const elegiblesBaja = (op.conceptos || []).filter((c) => c.tipoConcepto === "firma");
  const conceptosBaseIds = new Set(elegiblesBaja.map((c) => c.casoId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Liquidación — ${op.estudio}`}
      icon={Banknote}
      size="2xl"
      footer={
        <Btn variant="ghost" onClick={onClose}>
          Cerrar
        </Btn>
      }
    >
      {/* RESUMEN DEL OPERADOR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Firmas", value: op.firmas },
          { label: "Bajas", value: op.bajas },
          { label: "Netas", value: op.netas },
          { label: "Mínimo", value: minimo },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-2 text-center"
            style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              {s.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* RESULTADO DE LA VALIDACIÓN DEL MÍNIMO */}
      <div
        className="rounded-lg p-3 mb-4 flex items-start gap-2 text-xs"
        style={{
          backgroundColor: op.habilitado
            ? "color-mix(in srgb, var(--color-success) 10%, transparent)"
            : "color-mix(in srgb, var(--color-warning) 12%, transparent)",
          border: `1px solid color-mix(in srgb, ${op.habilitado ? "var(--color-success)" : "var(--color-warning)"} 30%, transparent)`,
          color: "var(--color-text)",
        }}
      >
        {op.habilitado ? (
          <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-success)" }} />
        ) : (
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
        )}
        <span>
          {op.habilitado
            ? `Habilitado: ${op.netas} firmas netas ≥ mínimo ${minimo}. Se pagan TODAS las netas (las primeras ${minimo} no se descuentan).`
            : `No habilitado: ${op.netas} firmas netas < mínimo ${minimo}. El mínimo es requisito de habilitación, no una deducción: importe liquidable $ 0.`}
        </span>
      </div>

      {/* DESGLOSE POR CONCEPTO */}
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
        Desglose por concepto
      </div>
      {(op.conceptos || []).length === 0 ? (
        <div className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
          Sin conceptos liquidables en el período.
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--color-border)" }}>
          <table className="w-full text-xs" style={{ color: "var(--color-text)" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--color-bg)" }}>
                <th className="text-left p-2 font-semibold">Caso</th>
                <th className="text-left p-2 font-semibold">Concepto</th>
                <th className="text-left p-2 font-semibold">Categoría</th>
                <th className="text-right p-2 font-semibold">Unitario</th>
                <th className="text-right p-2 font-semibold">Subtotal</th>
                {!cerrada && <th className="p-2" aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {op.conceptos.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td className="p-2">{c.casoNombre}</td>
                  <td className="p-2">{c.tipoConcepto === "transito" ? "2.º (tránsito)" : "Firma"}</td>
                  <td className="p-2">
                    {cerrada ? (
                      categoriaLabel(c.categoria)
                    ) : (
                      <Select
                        aria-label={`Categoría de ${c.casoNombre}`}
                        value={c.categoria || ""}
                        onChange={(e) => onCambiarCategoria(c.casoId, e.target.value || null)}
                        options={OPCIONES_CATEGORIA}
                        style={{ minWidth: "150px" }}
                      />
                    )}
                  </td>
                  <td className="p-2 text-right">{formatArs(c.tarifaUnitaria)}</td>
                  <td className="p-2 text-right font-semibold">{formatArs(c.subtotal)}</td>
                  {!cerrada && c.tipoConcepto === "firma" && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        className="btn-base btn-ghost btn-sm"
                        onClick={() => onToggleExtra(c.casoId)}
                        aria-label={`Segundo concepto (tránsito) de ${c.casoNombre}`}
                        title="Marcar si el mismo caso generó la segunda firma (accidente de tránsito). Se contabiliza por separado."
                      >
                        <Plus size={12} />
                        2.º
                      </button>
                    </td>
                  )}
                  {!cerrada && c.tipoConcepto !== "firma" && (
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        className="btn-base btn-ghost btn-sm"
                        onClick={() => onToggleExtra(c.casoId)}
                        aria-label={`Quitar segundo concepto de ${c.casoNombre}`}
                        title="Quitar el segundo concepto de este caso."
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BAJAS CONTABILIZADAS */}
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
        Bajas contabilizadas
      </div>
      {(op.bajasDetalle || []).length === 0 ? (
        <div className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
          Sin bajas en el período.
        </div>
      ) : (
        <ul className="text-xs mb-2 space-y-1">
          {op.bajasDetalle.map((b) => (
            <li key={`${b.casoId}${b.extra ? "::t" : ""}`} className="flex items-center gap-2" style={{ color: "var(--color-text)" }}>
              <XCircle size={12} style={{ color: "var(--color-danger)" }} className="flex-shrink-0" />
              <span className="flex-1">
                {b.casoNombre}
                {b.extra ? " (2.º concepto)" : ""} — {b.origen === "automatica" ? "baja automática (estado Baja)" : "baja manual"}
              </span>
              {!cerrada && b.origen === "manual" && (
                <button
                  type="button"
                  className="btn-base btn-ghost btn-sm"
                  onClick={() => onQuitarBaja(b.casoId)}
                  aria-label={`Quitar baja manual de ${b.casoNombre}`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ALTA DE BAJA MANUAL (solo preparación) */}
      {!cerrada && (
        <div
          className="rounded-lg p-3 mb-4 flex flex-wrap items-end gap-2"
          style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        >
          <Select
            label="Agregar baja manual (caso firmado del período)"
            aria-label="Caso para baja manual"
            value={bajaCasoId}
            onChange={(e) => setBajaCasoId(e.target.value)}
            placeholder="Elegir caso…"
            options={elegiblesBaja.map((c) => ({ value: c.casoId, label: c.casoNombre }))}
            style={{ flex: 1, minWidth: "200px" }}
          />
          {/* TextInput no tiene prop label: se etiqueta con un span, como en el resto de la app. */}
          <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: "160px" }}>
            <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Motivo
            </span>
            <TextInput
              aria-label="Motivo de la baja manual"
              value={bajaMotivo}
              onChange={(e) => setBajaMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
            />
          </div>
          <Btn
            size="sm"
            icon={Plus}
            disabled={!bajaCasoId || idsBajados.has(bajaCasoId)}
            onClick={() => {
              onAgregarBaja({
                id: `bm-${bajaCasoId}`,
                casoId: bajaCasoId,
                casoNombre: elegiblesBaja.find((c) => c.casoId === bajaCasoId)?.casoNombre || bajaCasoId,
                motivo: bajaMotivo.trim(),
                fecha: new Date().toISOString(),
              });
              setBajaCasoId("");
              setBajaMotivo("");
            }}
          >
            Agregar baja
          </Btn>
        </div>
      )}

      {/* NOTA DE SEGUNDOS CONCEPTOS */}
      {!cerrada && conceptosBaseIds.size > 0 && (
        <div className="text-[11px] mb-4 flex items-start gap-1.5" style={{ color: "var(--color-text-muted)" }}>
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>
            El segundo concepto (botón 2.º) solo debe marcarse si el mismo caso generó DOS firmas identificadas
            (p. ej. lesión laboral y accidente de tránsito): cada concepto se contabiliza por separado con su
            categoría y tarifa.
          </span>
        </div>
      )}

      {/* TOTAL FINAL */}
      <div
        className="rounded-lg p-3 flex items-center justify-between"
        style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {cerrada ? <Lock size={14} style={{ color: "var(--color-text-muted)" }} /> : <Banknote size={14} style={{ color: "var(--color-accent)" }} />}
          Total liquidable
          {cerrada && <span className="text-[10px] font-normal" style={{ color: "var(--color-text-muted)" }}>(instantánea cerrada)</span>}
        </div>
        <div className="text-lg font-bold" style={{ color: op.habilitado ? "var(--color-success)" : "var(--color-text-muted)" }}>
          {formatArs(op.importe)}
        </div>
      </div>
    </Modal>
  );
}

export default LiquidacionDetalleModal;
