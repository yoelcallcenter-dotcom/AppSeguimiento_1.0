/**
 * OperatorLiquidaciones.jsx (v1.10.4)
 * Sub-sección "Liquidaciones" de Mi Espacio: liquidación por firmas y
 * premios por top.
 *
 * Flujo: elegir período (mes) y fecha de cierre → Preparar (recalculable
 * mientras esté en preparación) → revisar/detalle/clasificar → Cerrar
 * (instantánea congelada, §8 del prompt 1.10.4). El top es una declaración
 * MANUAL por (período, estudio): la app no verifica ranking ni asigna
 * puestos automáticamente en esta versión.
 *
 * El cálculo NO vive acá: todo sale de liquidacionEngine (puro) y se
 * persiste vía liquidacionesStore (AppData v11).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Banknote,
  Lock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Trophy,
  Search,
  CalendarDays,
} from "lucide-react";
import { Modal } from "../../components/common/Modal";
import { Btn } from "../../components/common/Btn";
import { Toggle } from "../../components/common/Toggle";
import { Select } from "../../components/common/Select";
import { Spinner } from "../../components/common/Spinner";
import { EmptyState } from "../../components/common/EmptyState";
import { TextInput } from "../../components/common/TextInput";
import { MESES } from "../../utils/constants";
import { calcularLiquidacion, ajustesVacios, validarCierre } from "./liquidacionEngine";
import {
  periodoKeyDe,
  getLiquidacion,
  guardarLiquidacion,
  getTopDelPeriodo,
  setTopDelPeriodo,
} from "./liquidacionesStore";
import { getReglas, calcularPremioPuesto, validarDistribucion } from "./liquidacionReglas";
import { LiquidacionDetalleModal } from "./LiquidacionDetalleModal";

function formatArs(n) {
  if (n == null) return "—";
  return `$ ${n.toLocaleString("es-AR")}`;
}

function finDeMesISO(year, month) {
  const d = new Date(year, month + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ddmm(iso) {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function OperatorLiquidaciones({ casos, showToast, config }) {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth());
  const [fechaCierre, setFechaCierre] = useState(() => finDeMesISO(hoy.getFullYear(), hoy.getMonth()));
  const [liq, setLiq] = useState(null);
  const [top, setTop] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [detalleEstudio, setDetalleEstudio] = useState(null);
  const [cerrando, setCerrando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [orden, setOrden] = useState({ campo: "importe", dir: "desc" });

  // showToast puede cambiar de identidad entre renders: se congela en un ref.
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const toast = useCallback((msg, tipo) => toastRef.current?.(msg, tipo), []);

  const periodoKey = useMemo(() => periodoKeyDe(year, month), [year, month]);
  const periodoLabel = `${MESES[month]} ${year}`;
  const reglas = useMemo(() => getReglas(config), [config]);
  const cerrada = liq?.estado === "cerrada";

  // Carga del documento del período + top manual (persisten al navegar/recargar).
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    Promise.all([getLiquidacion(periodoKey), getTopDelPeriodo(periodoKey)])
      .then(([doc, topRows]) => {
        if (!vivo) return;
        setLiq(doc);
        setTop(topRows);
        setFechaCierre(doc?.fechaCierre || finDeMesISO(year, month));
      })
      .catch(() => {
        if (vivo) toast("No se pudo cargar la liquidación del período.", "error");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [periodoKey, year, month, toast]);

  /**
   * Recalcula desde los casos + ajustes actuales y persiste el documento.
   * v1.10.5: respeta la validación configurable "permitir preparar con
   * advertencias" (§3D). Si está apagada, las advertencias del cálculo
   * bloquean el guardado con un error identificable (bloqueoValidacion).
   */
  const recalcularYGuardar = useCallback(
    async (ajustes) => {
      const calc = calcularLiquidacion(casos, {
        year,
        month,
        fechaCierre,
        ajustes,
        reglas,
      });
      if (
        reglas.validaciones?.permitirPrepararConAdvertencias === false &&
        (calc.advertencias || []).length > 0
      ) {
        const err = new Error(`Preparación bloqueada por advertencias: ${calc.advertencias[0]}`);
        err.bloqueoValidacion = true;
        throw err;
      }
      const saved = await guardarLiquidacion({ periodoKey, estado: "preparacion", ...calc });
      setLiq(saved);
      return saved;
    },
    [casos, year, month, fechaCierre, reglas, periodoKey]
  );

  // Ref de "montaje de verdad" (v1.10.5): los cleanups de los effects se
  // ejecutan también al cambiar dependencias, no solo al desmontar; este ref
  // solo baja en el desmontaje real (con re-set en re-mount de StrictMode).
  const montadoRef = useRef(true);
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  /**
   * v1.10.5 (§8): una liquidación EN PREPARACIÓN cuyo snapshot de reglas
   * difiere de la configuración vigente se recalcula sola (conservando los
   * ajustes manuales), para que cambiar el mínimo o una tarifa actualice los
   * cálculos abiertos sin recargar la app. Las CERRADAS nunca se tocan:
   * conservan su instantánea histórica (§7A).
   *
   * El guardia de "montaje real" es un ref: el cleanup de este effect corre
   * también cuando cambian sus propias dependencias (p. ej. el setLiq del
   * recálculo exitoso), y con un closure `vivo` el toast informativo nunca
   * se emitía a pesar de haber recalculado bien.
   */
  useEffect(() => {
    if (!liq || liq.estado !== "preparacion" || cargando) return;
    if (JSON.stringify(liq.reglasSnapshot) === JSON.stringify(reglas)) return;
    (async () => {
      try {
        const saved = await recalcularYGuardar(liq.ajustes || ajustesVacios());
        if (montadoRef.current && saved) toast("Liquidación recalculada con la configuración vigente.", "info");
      } catch (err) {
        // El bloqueo por validaciones configuradas no es un error técnico:
        // se informa tal cual y sin reintentar en cada render.
        if (montadoRef.current) {
          toast(
            err?.bloqueoValidacion ? String(err.message) : "No se pudo recalcular con las reglas vigentes.",
            "error"
          );
        }
      }
    })();
  }, [liq, cargando, reglas, recalcularYGuardar, toast]);

  const preparar = async () => {
    if (cerrada) {
      toast("La liquidación está cerrada: no se recalcula (instantánea histórica).", "info");
      return;
    }
    setProcesando(true);
    try {
      await recalcularYGuardar(liq?.ajustes || ajustesVacios());
      toast("Liquidación preparada. Podés revisarla y recalcularla antes de cerrar.", "success");
    } catch (err) {
      // v1.10.5: si la configuración bloquea preparar con advertencias, el
      // motivo real se muestra tal cual (no un genérico "error").
      toast(
        err?.bloqueoValidacion ? String(err.message) : "No se pudo preparar la liquidación.",
        "error"
      );
    } finally {
      setProcesando(false);
    }
  };

  /** Ajuste manual (categorías, segundos conceptos, bajas): recalcula + guarda. */
  const aplicarAjuste = async (mutar) => {
    if (!liq || cerrada) return;
    try {
      await recalcularYGuardar(mutar(liq.ajustes || ajustesVacios()));
    } catch (err) {
      toast(
        err?.bloqueoValidacion ? String(err.message) : "No se pudo guardar el ajuste.",
        "error"
      );
    }
  };

  const cambiarCategoria = (casoId, cat) =>
    aplicarAjuste((a) => ({ ...a, categoriaPorCaso: { ...a.categoriaPorCaso, [casoId]: cat } }));

  const toggleExtra = (casoId) =>
    aplicarAjuste((a) => {
      const activo = !!a.conceptosExtra?.[casoId]?.habilitado;
      return { ...a, conceptosExtra: { ...a.conceptosExtra, [casoId]: { habilitado: !activo } } };
    });

  const agregarBaja = (b) => aplicarAjuste((a) => ({ ...a, bajasManuales: [...(a.bajasManuales || []), b] }));

  const quitarBaja = (casoId) =>
    aplicarAjuste((a) => ({
      ...a,
      bajasManuales: (a.bajasManuales || []).filter((b) => b.casoId !== casoId),
    }));

  const validacion = useMemo(() => (liq ? validarCierre(liq) : null), [liq]);

  const confirmarCierre = async () => {
    if (!validacion?.ok) return;
    setProcesando(true);
    try {
      const saved = await guardarLiquidacion({
        ...liq,
        estado: "cerrada",
        cerradaEn: new Date().toISOString(),
      });
      setLiq(saved);
      setCerrando(false);
      toast("Liquidación cerrada: importes y tarifas quedan congelados.", "success");
    } catch {
      toast("No se pudo cerrar la liquidación.", "error");
    } finally {
      setProcesando(false);
    }
  };

  // ---- Premios por top: declaración manual por (período, estudio).
  const topSet = useMemo(() => new Set(top.map((t) => t.estudio)), [top]);
  const toggleTop = async (estudio, on) => {
    try {
      // Al re-mantener un operador ya marcado se conserva su puesto manual.
      const actual = top.find((t) => t.estudio === estudio);
      await setTopDelPeriodo(periodoKey, estudio, on, on ? actual?.puesto ?? null : null);
      setTop(await getTopDelPeriodo(periodoKey));
      toast(
        on ? `${estudio} quedó marcado en el top de ${periodoLabel}.` : `${estudio} se quitó del top de ${periodoLabel}.`,
        "success"
      );
    } catch {
      toast("No se pudo actualizar el top.", "error");
    }
  };

  /**
   * v1.10.5 (§6F): asignación MANUAL de puesto dentro del top del período.
   * Sin ranking automático: el lugar se elige a mano. Regla anti-duplicado:
   * si el puesto ya lo ocupaba otro operador del mismo período, ese queda
   * "pendiente de asignación" (nunca dos con el mismo lugar).
   */
  const cambiarPuesto = async (estudio, puesto) => {
    try {
      const lugar = Number.isInteger(Number(puesto)) && Number(puesto) >= 1 ? Math.floor(Number(puesto)) : null;
      const ocupado = top.find((t) => t.estudio !== estudio && lugar != null && Number(t.puesto) === lugar);
      await setTopDelPeriodo(periodoKey, estudio, true, lugar);
      if (ocupado) await setTopDelPeriodo(periodoKey, ocupado.estudio, true, null);
      setTop(await getTopDelPeriodo(periodoKey));
      toast(
        lugar == null
          ? `${estudio} quedó sin puesto asignado (pendiente).`
          : ocupado
          ? `Puesto ${lugar} asignado a ${estudio}: ${ocupado.estudio} queda pendiente de reasignación.`
          : `Puesto ${lugar} asignado a ${estudio}.`,
        "success"
      );
    } catch {
      toast("No se pudo asignar el puesto.", "error");
    }
  };

  // ---- Estado del fondo de premios vigente (v1.10.5, §6G: el fondo es el
  // presupuesto máximo; el saldo sin asignar siempre se muestra).
  const premios = reglas.premios;
  const premiosValidacion = useMemo(() => validarDistribucion(premios), [premios]);
  const premioAsignado = top.reduce((s, t) => {
    if (t.puesto == null) return s;
    return s + (calcularPremioPuesto(premios, t.puesto) || 0);
  }, 0);
  const saldoPremios = Math.max(0, (Number(premios.fondo) || 0) - premioAsignado);

  // ---- Tabla: filtro por búsqueda + orden por columna.
  const filas = useMemo(() => {
    let rows = liq?.operadores || [];
    const q = filtro.trim().toLowerCase();
    if (q) rows = rows.filter((o) => o.estudio.toLowerCase().includes(q));
    const { campo, dir } = orden;
    return [...rows].sort((a, b) => {
      const va = a[campo];
      const vb = b[campo];
      const cmp = typeof va === "string" ? va.localeCompare(vb || "") : (va ?? 0) - (vb ?? 0);
      return dir === "asc" ? cmp : -cmp;
    });
  }, [liq, filtro, orden]);

  const ordenarPor = (campo) =>
    setOrden((o) => ({ campo, dir: o.campo === campo && o.dir === "desc" ? "asc" : "desc" }));

  const operadorDetalle = useMemo(
    () => liq?.operadores?.find((o) => o.estudio === detalleEstudio) || null,
    [liq, detalleEstudio]
  );

  if (cargando) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <Spinner size={16} />
        Cargando liquidación…
      </div>
    );
  }

  const totales = liq?.totales;

  return (
    <div className="space-y-4">
      {/* BARRA DE PERÍODO Y ACCIONES */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              backgroundColor: "var(--color-accent)",
              width: "36px",
              height: "36px",
              color: "var(--color-text-on-accent)",
            }}
          >
            <Banknote size={20} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Liquidación por firmas
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Período {periodoLabel} · cierre {ddmm(fechaCierre)}
            </div>
          </div>

          <span
            className="inline-flex items-center gap-1.5 pill-lg"
            style={
              cerrada
                ? {
                    backgroundColor: "color-mix(in srgb, var(--color-success) 13%, transparent)",
                    color: "var(--color-success)",
                    border: "1px solid color-mix(in srgb, var(--color-success) 27%, transparent)",
                  }
                : {
                    backgroundColor: "color-mix(in srgb, var(--color-warning) 13%, transparent)",
                    color: "var(--color-warning)",
                    border: "1px solid color-mix(in srgb, var(--color-warning) 27%, transparent)",
                  }
            }
          >
            {cerrada ? <Lock size={12} /> : <CalendarDays size={12} />}
            {cerrada ? "Cerrada" : liq ? "En preparación" : "Sin preparar"}
          </span>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Período
            </span>
            <input
              type="month"
              aria-label="Período de liquidación"
              className="input-optimized"
              value={`${year}-${String(month + 1).padStart(2, "0")}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                if (y && m) {
                  setYear(y);
                  setMonth(m - 1);
                }
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Fecha de cierre
            </span>
            <input
              type="date"
              aria-label="Fecha de cierre"
              className="input-optimized"
              value={fechaCierre}
              disabled={cerrada}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
          </label>

          <div className="flex items-center gap-2 self-end">
            <Btn
              size="sm"
              icon={cerrada ? Lock : RefreshCw}
              disabled={procesando || cerrada}
              onClick={preparar}
              ariaLabel={liq ? "Recalcular liquidación" : "Preparar liquidación"}
            >
              {liq ? "Recalcular" : "Preparar"}
            </Btn>
            {!cerrada && (
              <Btn
                size="sm"
                variant="outline"
                icon={Lock}
                color="var(--color-accent)"
                disabled={!liq || procesando}
                onClick={() => setCerrando(true)}
              >
                Cerrar liquidación
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* SIN LIQUIDACIÓN PREPARADA */}
      {!liq && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <EmptyState
            icon={Banknote}
            message={`Sin liquidación preparada para ${periodoLabel}`}
            submessage="Prepará la liquidación para ver el resumen del período, la tabla por estudio y el detalle de conceptos. Podés recalcularla todo el tiempo antes de cerrarla."
            ctaLabel="Preparar liquidación"
            onCta={preparar}
          />
        </div>
      )}

      {liq && (
        <>
          {/* ADVERTENCIAS DE INTEGRIDAD */}
          {(liq.advertencias || []).length > 0 && (
            <div
              className="rounded-xl p-3 text-xs flex items-start gap-2"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
                color: "var(--color-text)",
              }}
              role="alert"
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }} />
              <div>
                <b>Avisos de integridad:</b>
                <ul className="mt-1 space-y-0.5">
                  {liq.advertencias.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* RESUMEN DEL PERÍODO (§5A) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Firmas registradas", value: totales.firmas },
              { label: "Bajas", value: totales.bajas },
              { label: "Firmas netas", value: totales.netas },
              { label: "Habilitados", value: totales.habilitados, color: "var(--color-success)" },
              { label: "No habilitados", value: totales.noHabilitados, color: "var(--color-warning)" },
              {
                label: "Importe total liquidable",
                value: formatArs(totales.importeTotal),
                wide: true,
                color: totales.importeTotal == null ? "var(--color-warning)" : "var(--color-text)",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-lg p-3 ${s.wide ? "col-span-2" : ""}`}
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  {s.label}
                </div>
                <div className="text-lg font-bold" style={{ color: s.color || "var(--color-text)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {liq.incompleto && (
            <div
              className="rounded-xl p-3 text-xs flex items-start gap-2"
              style={{
                backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 27%, transparent)",
                color: "var(--color-text)",
              }}
              role="alert"
            >
              <XCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-danger)" }} />
              <span>
                Hay conceptos sin clasificar: el importe total no es confiable todavía. Clasificá cada concepto
                (leve / grave / enfermedad profesional) desde el detalle de cada estudio antes de cerrar.
              </span>
            </div>
          )}

          {/* TABLA DE OPERADORES (§5B) */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="p-3 flex items-center gap-2 flex-wrap">
              <div className="text-xs font-semibold uppercase tracking-wider flex-1" style={{ color: "var(--color-text-muted)" }}>
                Liquidación por estudio
              </div>
              <div className="flex items-center gap-1.5">
                <Search size={13} style={{ color: "var(--color-text-muted)" }} />
                <TextInput
                  aria-label="Buscar estudio"
                  placeholder="Buscar estudio…"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  style={{ width: "180px" }}
                />
              </div>
            </div>
            {filas.length === 0 ? (
              <div className="p-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Sin firmas en el período para mostrar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ color: "var(--color-text)" }} aria-label="Liquidación por estudio">
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-bg)" }}>
                      {[
                        { key: "estudio", label: "Estudio" },
                        { key: "firmas", label: "Firmas" },
                        { key: "bajas", label: "Bajas" },
                        { key: "netas", label: "Netas" },
                        { key: "habilitado", label: "Estado" },
                        { key: "firmasLiquidables", label: "Liquidables" },
                        { key: "importe", label: "Importe" },
                      ].map((col) => (
                        <th key={col.key} className="p-2 text-left font-semibold" style={col.key !== "estudio" ? { textAlign: col.key === "importe" ? "right" : "center" } : undefined}>
                          <button
                            type="button"
                            onClick={() => ordenarPor(col.key)}
                            className="font-semibold hover:underline"
                            aria-label={`Ordenar por ${col.label}`}
                          >
                            {col.label}
                            {orden.campo === col.key ? (orden.dir === "asc" ? " ▲" : " ▼") : ""}
                          </button>
                        </th>
                      ))}
                      <th className="p-2 text-left font-semibold">Top</th>
                      <th className="p-2 text-left font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((o) => (
                      <tr key={o.estudio} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="p-2 font-medium">{o.estudio}</td>
                        <td className="p-2 text-center">{o.firmas}</td>
                        <td className="p-2 text-center">{o.bajas}</td>
                        <td className="p-2 text-center font-semibold">{o.netas}</td>
                        <td className="p-2 text-center">
                          <span
                            className="inline-flex items-center gap-1 pill-sm"
                            style={
                              o.habilitado
                                ? {
                                    backgroundColor: "color-mix(in srgb, var(--color-success) 13%, transparent)",
                                    color: "var(--color-success)",
                                    border: "1px solid color-mix(in srgb, var(--color-success) 27%, transparent)",
                                  }
                                : {
                                    backgroundColor: "color-mix(in srgb, var(--color-warning) 13%, transparent)",
                                    color: "var(--color-warning)",
                                    border: "1px solid color-mix(in srgb, var(--color-warning) 27%, transparent)",
                                  }
                            }
                          >
                            {o.habilitado ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {o.habilitado ? "Habilitado" : "No habilitado"}
                          </span>
                        </td>
                        <td className="p-2 text-center">{o.firmasLiquidables}</td>
                        <td className="p-2 text-right font-semibold">{formatArs(o.importe)}</td>
                        <td className="p-2">
                          <Toggle
                            checked={topSet.has(o.estudio)}
                            onChange={(on) => toggleTop(o.estudio, on)}
                            aria-label={`Está en el top: ${o.estudio}`}
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="btn-base btn-ghost btn-sm"
                            onClick={() => setDetalleEstudio(o.estudio)}
                            aria-label={`Ver detalle de ${o.estudio}`}
                          >
                            Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PREMIOS POR TOP (§6 — v1.10.5: fondo/puestos configurables y
              asignación manual de puestos con importes calculados) */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Trophy size={15} style={{ color: "var(--color-warning)" }} />
              <div className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                Premios por top
              </div>
              <span
                className="pill-sm"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                  color: "var(--color-accent)",
                  border: "1px solid color-mix(in srgb, var(--color-accent) 27%, transparent)",
                }}
              >
                Fondo {formatArs(premios.fondo)} · {premios.puestos.length} puestos ·{" "}
                {premios.modalidad === "porcentual" ? "distribución porcentual" : "importes fijos"}
              </span>
              {!premios.activo && (
                <span
                  className="pill-sm"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-text-muted) 13%, transparent)",
                    color: "var(--color-text-muted)",
                    border: "1px solid color-mix(in srgb, var(--color-text-muted) 27%, transparent)",
                  }}
                >
                  Premios desactivados
                </span>
              )}
            </div>
            <div className="text-xs mb-3 flex items-start gap-1.5" style={{ color: "var(--color-text-muted)" }}>
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                El top se registra a mano (toggle "Está en el top" en la tabla): la app NO verifica el ranking real
                ni asigna puestos automáticamente. Los puestos se eligen a mano y los importes se calculan con la
                distribución vigente en Configuración. El estado es exclusivo de {periodoLabel}.
              </span>
            </div>

            {/* Distribución inválida en configuración → avisar sin calcular de más */}
            {!premiosValidacion.ok && (
              <div
                className="rounded-lg p-2 mb-3 text-xs flex items-start gap-2"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-danger) 27%, transparent)",
                  color: "var(--color-text)",
                }}
                role="alert"
              >
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-danger)" }} />
                <span>
                  La distribución de premios tiene errores (revisar en Configuración → General → Liquidaciones →
                  Premios): {premiosValidacion.errores[0]}
                </span>
              </div>
            )}

            {!premios.activo ? (
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Los premios están desactivados en Configuración. El registro manual del top (toggle y puestos) sigue
                disponible y se conserva por período.
              </div>
            ) : topSet.size === 0 ? (
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Nadie está marcado en el top de {periodoLabel} todavía.
              </div>
            ) : (
              <>
                <div className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid var(--color-border)" }}>
                  <table className="w-full text-xs" style={{ color: "var(--color-text)" }} aria-label="Premios del top">
                    <thead>
                      <tr style={{ backgroundColor: "var(--color-bg)" }}>
                        <th className="text-left p-2 font-semibold">Operador marcado</th>
                        <th className="text-left p-2 font-semibold">Puesto (manual)</th>
                        <th className="text-right p-2 font-semibold">Premio calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((t) => {
                        const premio = t.puesto != null ? calcularPremioPuesto(premios, t.puesto) : null;
                        return (
                          <tr key={t.estudio} style={{ borderTop: "1px solid var(--color-border)" }}>
                            <td className="p-2 font-medium">{t.estudio}</td>
                            <td className="p-2">
                              <Select
                                aria-label={`Puesto de ${t.estudio}`}
                                value={t.puesto ?? ""}
                                onChange={(e) => cambiarPuesto(t.estudio, e.target.value)}
                                options={[
                                  { value: "", label: "Pendiente de asignar" },
                                  ...premios.puestos.map((p) => {
                                    const tomado = top.some(
                                      (x) => x.estudio !== t.estudio && Number(x.puesto) === p.lugar
                                    );
                                    return { value: p.lugar, label: tomado ? `Puesto ${p.lugar} (ocupado)` : `Puesto ${p.lugar}` };
                                  }),
                                ]}
                                style={{ minWidth: "170px" }}
                              />
                            </td>
                            <td className="p-2 text-right font-semibold">
                              {t.puesto == null ? (
                                <span style={{ color: "var(--color-warning)" }}>Pendiente</span>
                              ) : premio == null ? (
                                <span style={{ color: "var(--color-danger)" }}>Sin importe válido</span>
                              ) : (
                                formatArs(premio)
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* §6G: el fondo es el presupuesto MÁXIMO; el saldo sin
                    asignar siempre queda a la vista. */}
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <span>
                    Asignado: <b style={{ color: "var(--color-text)" }}>{formatArs(premioAsignado)}</b>
                  </span>
                  <span>
                    Fondo total: <b style={{ color: "var(--color-text)" }}>{formatArs(premios.fondo)}</b>
                  </span>
                  <span>
                    Saldo sin asignar:{" "}
                    <b style={{ color: saldoPremios > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                      {formatArs(saldoPremios)}
                    </b>
                  </span>
                  {premiosValidacion.advertencias.length > 0 && (
                    <span style={{ color: "var(--color-warning)" }}>{premiosValidacion.advertencias[0]}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* MODAL DE DETALLE POR OPERADOR */}
      <LiquidacionDetalleModal
        isOpen={!!operadorDetalle}
        onClose={() => setDetalleEstudio(null)}
        operador={operadorDetalle}
        reglas={liq?.reglasSnapshot || reglas}
        cerrada={cerrada}
        onCambiarCategoria={cambiarCategoria}
        onToggleExtra={toggleExtra}
        onAgregarBaja={agregarBaja}
        onQuitarBaja={quitarBaja}
      />

      {/* CONFIRMACIÓN DE CIERRE (§8): resumen + inconsistencias + confirmación */}
      <Modal
        isOpen={cerrando}
        onClose={() => setCerrando(false)}
        title="Cerrar liquidación"
        icon={Lock}
        size="lg"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCerrando(false)}>
              Cancelar
            </Btn>
            <Btn
              icon={Lock}
              disabled={!validacion?.ok || procesando}
              onClick={confirmarCierre}
              ariaLabel="Confirmar cierre de la liquidación"
            >
              Confirmar cierre
            </Btn>
          </>
        }
      >
        {liq && (
          <div className="text-xs space-y-3" style={{ color: "var(--color-text)" }}>
            <div>
              Vas a cerrar la liquidación de <b>{periodoLabel}</b> con fecha de cierre <b>{ddmm(fechaCierre)}</b>.
              Al cerrar, los importes, tarifas y cantidades quedan congelados como instantánea histórica: los
              cambios posteriores de datos o tarifas NO la modifican.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Firmas", value: totales.firmas },
                { label: "Bajas", value: totales.bajas },
                { label: "Netas", value: totales.netas },
                { label: "Importe", value: formatArs(totales.importeTotal) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg p-2 text-center"
                  style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                >
                  <div className="text-sm font-bold">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            {validacion?.errores?.length > 0 && (
              <div
                className="rounded-lg p-2"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-danger) 27%, transparent)",
                }}
                role="alert"
              >
                <b style={{ color: "var(--color-danger)" }}>No se puede cerrar:</b>
                <ul className="mt-1 space-y-0.5">
                  {validacion.errores.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {validacion?.advertencias?.length > 0 && (
              <div
                className="rounded-lg p-2"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
                }}
              >
                <b style={{ color: "var(--color-warning)" }}>Avisos (no bloquean):</b>
                <ul className="mt-1 space-y-0.5">
                  {validacion.advertencias.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default OperatorLiquidaciones;
