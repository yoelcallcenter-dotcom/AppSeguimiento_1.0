/**
 * LiquidacionesConfig.jsx (v1.10.5)
 * Configuración → Productividad → Liquidaciones (movida de General en v1.10.9).
 *
 * Sección compuesta por 5 sub-tabs: General · Tarifas · Reglas de liquidación
 * · Premios · Historial (patrón de sub-navegación tipo pill coherente con la
 * app). Toda la validación y las fórmulas viven en liquidacionReglas.js (la
 * fuente de verdad compartida con Mi Espacio): este componente solo edita
 * `config.liquidaciones` (config central config-art-tracker, que ya viaja en
 * backup/export/import) y registra cada cambio en el historial de auditoría
 * (AppData v12).
 *
 * Reglas de oro de esta versión:
 *  - Nada se guarda inválido en silencio (§6E/§4B): las validaciones bloquean
 *    con mensajes concretos antes de tocar la config.
 *  - Las categorías NUNCA se eliminan físicamente: se desactivan (§4C).
 *  - Los toggles/selectores expuestos acá están conectados al cálculo real
 *    del motor (§13): no hay controles decorativos.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Settings, Coins, ListChecks, Trophy, History, Plus, Trash2, RotateCcw, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { Toggle } from "../common/Toggle";
import { TextInput } from "../common/TextInput";
import { Select } from "../common/Select";
import { ConfirmDialog } from "../common/ConfirmDialog";
import {
  getLiquidacionConfig,
  validarCategoria,
  generarKeyCategoria,
  validarDistribucion,
  calcularPremioPuesto,
} from "../../features/liquidaciones/liquidacionReglas";
import {
  registrarCambioConfig,
  getHistorialConfig,
} from "../../features/liquidaciones/liquidacionesStore";

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "tarifas", label: "Tarifas", icon: Coins },
  { id: "reglas", label: "Reglas de liquidación", icon: ListChecks },
  { id: "premios", label: "Premios", icon: Trophy },
  { id: "historial", label: "Historial", icon: History },
];

/** Labels visibles de los campos auditados (nunca exponer claves internas). */
const LABELS_CAMPO = {
  minimoFirmasNetas: "Mínimo de firmas",
  categorias: "Tarifas y categorías",
  premios: "Premios por top",
  reglasConceptos: "Reglas de conceptos",
  validaciones: "Validaciones de cierre",
};

const fmt = (n) => (n == null ? "—" : `$ ${Number(n).toLocaleString("es-AR")}`);

function fechaCorta(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(iso);
  }
}

/** Convierte un texto de input a número aceptando coma o punto decimal.
 *  Con coma como decimal se tratan los puntos como separadores de miles
 *  ("10.000,50" → 10000.5); sin coma, el punto es decimal ("10000.50").
 *  Vacío o ilegible → NaN (nunca un 0 silencioso). */
function aNumero(txt) {
  const bruto = String(txt ?? "").trim();
  if (!bruto) return NaN;
  const s = bruto
    .replace(/\./g, (m, _i, str) => (str.includes(",") ? "" : m))
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function LiquidacionesConfig({ config, setConfig, showToast }) {
  const [tab, setTab] = useState("general");
  const cfg = useMemo(() => getLiquidacionConfig(config), [config]);

  // Borradores locales (se guardan al salir del campo, no en cada keystroke).
  const [minimoDraft, setMinimoDraft] = useState(String(cfg.minimoFirmasNetas));
  const [fondoDraft, setFondoDraft] = useState(String(cfg.premios.fondo));
  const [altaNombre, setAltaNombre] = useState("");
  const [altaTarifa, setAltaTarifa] = useState("");
  const [nombreDrafts, setNombreDrafts] = useState({});
  const [tarifaDrafts, setTarifaDrafts] = useState({});
  const [historial, setHistorial] = useState([]);
  const [restaurar, setRestaurar] = useState(null); // fila del historial a restaurar

  // Re-sincroniza borradores cuando la config cambia por fuera (import,
  // restauración desde otro lado, recarga).
  useEffect(() => {
    setMinimoDraft(String(cfg.minimoFirmasNetas));
    setFondoDraft(String(cfg.premios.fondo));
    setNombreDrafts({});
    setTarifaDrafts({});
  }, [cfg.minimoFirmasNetas, cfg.premios.fondo, cfg.categorias]);

  // El historial se carga solo al entrar a su tab (y queda fresco).
  useEffect(() => {
    if (tab !== "historial") return;
    let vivo = true;
    getHistorialConfig()
      .then((rows) => {
        if (vivo) setHistorial(rows);
      })
      .catch(() => {
        if (vivo) showToast("No se pudo cargar el historial de configuraciones.", "error");
      });
    return () => {
      vivo = false;
    };
  }, [tab, showToast]);

  /**
   * Aplica un parche sobre `config.liquidaciones`, registra la auditoría de
   * cada campo (§7D) y recién entonces confirma con toast. Los errores de
   * persistencia se informan sin mensaje de éxito.
   */
  const aplicar = async (patch, descripcion) => {
    try {
      const cambios = Object.keys(patch).map((campo) => ({
        campo,
        valorAnterior: JSON.stringify(cfg[campo] ?? null),
        valorNuevo: JSON.stringify(patch[campo] ?? null),
      }));
      setConfig({ ...config, liquidaciones: { ...cfg, ...patch } });
      for (const c of cambios) await registrarCambioConfig(c);
      showToast(`${descripcion} guardado.`, "success");
    } catch {
      showToast(`No se pudo guardar: ${descripcion}.`, "error");
    }
  };

  // ==========================================================================
  // TAB: GENERAL
  // ==========================================================================

  const guardarMinimo = () => {
    const n = Number(minimoDraft);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 1000) {
      showToast("El mínimo de firmas debe ser un entero entre 0 y 1000.", "error");
      setMinimoDraft(String(cfg.minimoFirmasNetas));
      return;
    }
    if (n === cfg.minimoFirmasNetas) return;
    aplicar({ minimoFirmasNetas: n }, "Mínimo de firmas");
  };

  const setValidacion = (clave, valor) =>
    aplicar({ validaciones: { ...cfg.validaciones, [clave]: valor } }, "Validaciones");

  // ==========================================================================
  // TAB: TARIFAS
  // ==========================================================================

  const commitNombre = (cat, draft) => {
    const nombre = String(draft ?? "").trim();
    if (nombre === cat.nombre) {
      setNombreDrafts((d) => ({ ...d, [cat.key]: undefined }));
      return;
    }
    const res = validarCategoria(cfg, { key: cat.key, nombre, tarifa: cat.tarifa }, cat.key);
    if (!res.ok) {
      showToast(res.errores[0], "error");
      return;
    }
    const now = new Date().toISOString();
    aplicar(
      { categorias: cfg.categorias.map((c) => (c.key === cat.key ? { ...c, nombre, updatedAt: now } : c)) },
      "Nombre de categoría"
    );
    setNombreDrafts((d) => ({ ...d, [cat.key]: undefined }));
  };

  const commitTarifa = (cat, draft) => {
    const t = aNumero(draft);
    const res = validarCategoria(cfg, { key: cat.key, nombre: cat.nombre, tarifa: t }, cat.key);
    if (!res.ok) {
      showToast(res.errores[0], "error");
      return;
    }
    if (t === cat.tarifa) {
      setTarifaDrafts((d) => ({ ...d, [cat.key]: undefined }));
      return;
    }
    const now = new Date().toISOString();
    aplicar(
      { categorias: cfg.categorias.map((c) => (c.key === cat.key ? { ...c, tarifa: t, updatedAt: now } : c)) },
      "Tarifa"
    );
    setTarifaDrafts((d) => ({ ...d, [cat.key]: undefined }));
  };

  const toggleActiva = (cat) => {
    const now = new Date().toISOString();
    aplicar(
      { categorias: cfg.categorias.map((c) => (c.key === cat.key ? { ...c, activa: !c.activa, updatedAt: now } : c)) },
      `Categoría ${cat.activa ? "desactivada" : "activada"}`
    );
  };

  const agregarCategoria = () => {
    const nombre = altaNombre.trim();
    const tarifa = aNumero(altaTarifa);
    const key = generarKeyCategoria(nombre, cfg.categorias);
    const res = validarCategoria(cfg, { key, nombre, tarifa });
    if (!res.ok) {
      showToast(res.errores[0], "error");
      return;
    }
    const now = new Date().toISOString();
    aplicar(
      {
        categorias: [...cfg.categorias, { key, nombre, tarifa, activa: true, createdAt: now, updatedAt: now }],
      },
      "Categoría creada"
    );
    setAltaNombre("");
    setAltaTarifa("");
  };

  // ==========================================================================
  // TAB: REGLAS
  // ==========================================================================

  const setReglaConcepto = (clave, valor) =>
    aplicar({ reglasConceptos: { ...cfg.reglasConceptos, [clave]: valor } }, "Reglas de conceptos");

  // ==========================================================================
  // TAB: PREMIOS
  // ==========================================================================

  const guardarPremios = (patch, descripcion) => {
    const candidato = { ...cfg.premios, ...patch };
    const v = validarDistribucion(candidato);
    if (!v.ok) {
      showToast(v.errores[0], "error");
      return false;
    }
    aplicar({ premios: candidato }, descripcion);
    return true;
  };

  const guardarFondo = () => {
    const n = aNumero(fondoDraft);
    if (!Number.isFinite(n) || n < 0) {
      showToast("El fondo total debe ser un número mayor o igual a 0.", "error");
      setFondoDraft(String(cfg.premios.fondo));
      return;
    }
    if (n === cfg.premios.fondo) return;
    guardarPremios({ fondo: n }, "Fondo de premios");
  };

  /**
   * Cambio de modalidad (fija ↔ porcentual): CONVIERTE los valores existentes
   * a la nueva unidad (50% del fondo ↔ $50.000) y solo guarda si la
   * distribución resultante sigue siendo válida (nunca en silencio, §6E).
   */
  const cambiarModalidad = (modalidad) => {
    if (modalidad === cfg.premios.modalidad) return;
    const fondo = Number(cfg.premios.fondo) || 0;
    const convertidos = cfg.premios.puestos.map((p) => {
      const v = Number(p.valor) || 0;
      const valor =
        modalidad === "porcentual"
          ? fondo > 0
            ? Math.round((v / fondo) * 10000) / 100
            : 0
          : Math.round((fondo * v) / 10000) / 100;
      return { ...p, valor };
    });
    guardarPremios({ modalidad, puestos: convertidos }, "Distribución de premios");
  };

  const modificarPuestos = (op) => {
    if (op === "quitar") {
      if (cfg.premios.puestos.length <= 1) {
        showToast("Debe quedar al menos un puesto premiado.", "error");
        return;
      }
      guardarPremios({ puestos: cfg.premios.puestos.slice(0, -1) }, "Puestos premiados");
      return;
    }
    const lugar = Math.max(...cfg.premios.puestos.map((p) => Number(p.lugar) || 0), 0) + 1;
    // Valor 0 por defecto: no altera la suma de la distribución vigente.
    guardarPremios({ puestos: [...cfg.premios.puestos, { lugar, valor: 0 }] }, "Puestos premiados");
  };

  const commitValorPuesto = (puesto, draft) => {
    const t = aNumero(draft);
    if (!Number.isFinite(t) || t < 0) {
      showToast("El valor del puesto debe ser un número mayor o igual a 0.", "error");
      return;
    }
    guardarPremios(
      { puestos: cfg.premios.puestos.map((p) => (p.lugar === puesto.lugar ? { ...p, valor: t } : p)) },
      "Puestos premiados"
    );
  };

  const distPremios = useMemo(() => validarDistribucion(cfg.premios), [cfg.premios]);

  // ==========================================================================
  // TAB: HISTORIAL
  // ==========================================================================

  const confirmarRestauracion = async () => {
    const fila = restaurar;
    setRestaurar(null);
    if (!fila) return;
    try {
      const valor = JSON.parse(fila.valorAnterior);
      await aplicar({ [fila.campo]: valor }, `Restauración de "${LABELS_CAMPO[fila.campo] || fila.campo}"`);
      getHistorialConfig().then((rows) => setHistorial(rows)).catch(() => {});
    } catch {
      showToast("No se pudo restaurar el valor (dato de auditoría inválido).", "error");
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-4">
      {/* Navegación de sub-secciones (pill) */}
      <div
        className="flex flex-wrap gap-1 p-1 rounded-lg"
        style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        role="tablist"
        aria-label="Sub-secciones de Liquidaciones"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="btn-base btn-sm flex items-center gap-1.5"
            style={
              tab === id
                ? { backgroundColor: "var(--color-accent)", color: "var(--color-text-on-accent)" }
                : { color: "var(--color-text-muted)", backgroundColor: "transparent" }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ----------------------------- GENERAL ----------------------------- */}
      {tab === "general" && (
        <div className="space-y-4">
          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <Settings size={14} color="var(--color-accent)" />
              Mínimo de firmas
            </div>
            <div className="space-y-2">
              <label className="flex flex-col gap-1" style={{ maxWidth: "260px" }}>
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Mínimo de firmas para habilitar el cobro
                </span>
                <TextInput
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  aria-label="Mínimo de firmas para habilitar el cobro"
                  value={minimoDraft}
                  onChange={(e) => setMinimoDraft(e.target.value)}
                  onBlur={guardarMinimo}
                />
              </label>
              <div className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Info size={12} className="flex-shrink-0 mt-0.5" />
                <span>
                  Modalidad vigente (única implementada): si las firmas netas son <b>inferiores</b> al mínimo, el
                  operador no cobra ninguna firma; si son <b>iguales o superiores</b>, se pagan TODAS las firmas netas
                  elegibles. El mínimo es un requisito de habilitación, nunca una deducción de las primeras firmas.
                  Fórmula: firmas netas = firmas totales − bajas.
                </span>
              </div>
            </div>
          </div>

          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <ListChecks size={14} color="var(--color-accent)" />
              Período de liquidación
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              El período lo elegís en Mi Espacio → Liquidaciones (mes de las firmas). Cada liquidación declara su
              propia <b>fecha de cierre</b> de forma explícita: no existe una configuración global de períodos y no
              agrega complejidad innecesaria. Las firmas posteriores a la fecha de cierre no entran al cálculo.
            </div>
          </div>

          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <CheckCircle2 size={14} color="var(--color-accent)" />
              Validaciones
            </div>
            <div className="space-y-2">
              <Toggle
                checked={cfg.validaciones.permitirPrepararConAdvertencias !== false}
                onChange={(v) => setValidacion("permitirPrepararConAdvertencias", v)}
                label="Permitir preparar liquidaciones con advertencias"
              />
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Si se apaga, preparar una liquidación que genera advertencias (p. ej. bajas duplicadas ignoradas o
                fuera del período) queda bloqueado hasta resolverlas.
              </div>
              <Toggle
                checked={cfg.validaciones.bloquearCierreSinFirmas === true}
                onChange={(v) => setValidacion("bloquearCierreSinFirmas", v)}
                label="Bloquear el cierre de períodos sin firmas"
              />
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Por defecto es solo una advertencia al cerrar. Activado, pasa a error impeditivo.
              </div>
              <div className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                <span>
                  Las validaciones críticas de integridad (detección de conceptos y bajas duplicados, categorías y
                  tarifas faltantes) NO se pueden desactivar: siempre bloquean el cierre.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- TARIFAS ----------------------------- */}
      {tab === "tarifas" && (
        <div className="space-y-4">
          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <Coins size={14} color="var(--color-accent)" />
              Tarifas por categoría
            </div>
            <div className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
              Cada concepto liquidable se clasifica en una categoría con su propio importe. Las categorías
              desactivadas no se ofrecen en nuevas liquidaciones pero se conservan en las históricas (nunca se
              eliminan). Una categoría sin tarifa válida deja el concepto "pendiente de revisión" y bloquea el cierre.
            </div>

            <div className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid var(--color-border)" }}>
              <table className="w-full text-xs" style={{ color: "var(--color-text)" }} aria-label="Tarifas por categoría">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-bg)" }}>
                    <th className="text-left p-2 font-semibold">Nombre visible</th>
                    <th className="text-left p-2 font-semibold">Clave interna</th>
                    <th className="text-left p-2 font-semibold">Importe (ARS)</th>
                    <th className="text-center p-2 font-semibold">Activa</th>
                    <th className="p-2" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {cfg.categorias.map((cat) => {
                    const nombreDraft = nombreDrafts[cat.key];
                    const tarifaDraft = tarifaDrafts[cat.key];
                    return (
                      <tr key={cat.key} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="p-2">
                          <TextInput
                            aria-label={`Nombre de ${cat.nombre}`}
                            value={nombreDraft !== undefined ? nombreDraft : cat.nombre}
                            onChange={(e) => setNombreDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                            onBlur={() => commitNombre(cat, nombreDrafts[cat.key] ?? cat.nombre)}
                            disabled={!cat.activa}
                            style={{ minWidth: "150px" }}
                          />
                        </td>
                        <td className="p-2">
                          <code style={{ color: "var(--color-text-muted)" }}>{cat.key}</code>
                        </td>
                        <td className="p-2">
                          <TextInput
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`Tarifa de ${cat.nombre}`}
                            value={tarifaDraft !== undefined ? tarifaDraft : String(cat.tarifa)}
                            onChange={(e) => setTarifaDrafts((d) => ({ ...d, [cat.key]: e.target.value }))}
                            onBlur={() => commitTarifa(cat, tarifaDrafts[cat.key] ?? String(cat.tarifa))}
                            disabled={!cat.activa}
                            style={{ minWidth: "110px" }}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Toggle
                            checked={cat.activa}
                            onChange={() => toggleActiva(cat)}
                            aria-label={`Categoría ${cat.nombre} activa`}
                          />
                        </td>
                        <td className="p-2 text-center" title="Las categorías no se eliminan: solo se desactivan.">
                          <span style={{ color: "var(--color-text-muted)" }}>
                            <Trash2 size={13} aria-hidden="true" style={{ opacity: 0.3 }} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Nueva categoría
                </span>
                <TextInput
                  aria-label="Nombre de la nueva categoría"
                  placeholder="Nombre (ej.: Lesión leve con secuelas)"
                  value={altaNombre}
                  onChange={(e) => setAltaNombre(e.target.value)}
                  style={{ minWidth: "230px" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  Importe (ARS)
                </span>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Importe de la nueva categoría"
                  placeholder="15000"
                  value={altaTarifa}
                  onChange={(e) => setAltaTarifa(e.target.value)}
                  style={{ minWidth: "120px" }}
                />
              </label>
              <Btn size="sm" icon={Plus} onClick={agregarCategoria}>
                Agregar categoría
              </Btn>
            </div>
            <div className="text-[11px] mt-2" style={{ color: "var(--color-text-muted)" }}>
              La clave interna se genera automáticamente desde el nombre, es única y estable (no cambia al renombrar).
            </div>
          </div>
        </div>
      )}

      {/* --------------------- REGLAS DE LIQUIDACIÓN ----------------------- */}
      {tab === "reglas" && (
        <div className="space-y-4">
          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <ListChecks size={14} color="var(--color-accent)" />
              Conceptos liquidables por caso
            </div>
            <div className="space-y-3">
              <div className="text-xs" style={{ color: "var(--color-text)" }}>
                <b>Accidente laboral</b>: genera el concepto de firma correspondiente (clasificado a mano en una
                categoría de lesión desde el detalle de cada operador en Mi Espacio).<br />
                <b>Accidente de tránsito</b>: genera su propio concepto cuando corresponde.<br />
                <b>Laboral + tránsito</b>: si un caso generó DOS firmas identificadas, se marcan a mano con el botón
                "2.º" en el detalle de liquidación y cada concepto se contabiliza por separado con su categoría e
                importe.
              </div>

              <Toggle
                checked={cfg.reglasConceptos.permitirSegundoConcepto !== false}
                onChange={(v) => setReglaConcepto("permitirSegundoConcepto", v)}
                label="Permitir segundo concepto por caso (marca manual)"
              />
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Si se apaga, las marcas de segundo concepto existentes dejan de computar (se muestra un aviso en la
                liquidación). Nunca se duplican casos automáticamente.
              </div>

              <div className="text-xs flex items-start gap-1.5 p-2 rounded-lg" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                <span>
                  La app NO dispone de datos para detectar solas una segunda firma ni para inferir la gravedad de la
                  lesión desde el tipo de accidente. Dimensiones separadas: tipo de accidente · categoría de la lesión
                  · concepto liquidable · importe unitario. Si no hay información suficiente, la advertencia queda
                  visible y no se inventa un concepto.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ PREMIOS ---------------------------- */}
      {tab === "premios" && (
        <div className="space-y-4">
          <div className="config-section">
            <div className="config-section-title flex items-center gap-2">
              <Trophy size={14} color="var(--color-accent)" />
              Premios por top
            </div>
            <div className="space-y-3">
              <Toggle
                checked={cfg.premios.activo}
                onChange={(v) => guardarPremios({ activo: v }, "Sistema de premios")}
                label="Activar el sistema de premios"
              />
              <div className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                <Info size={12} className="flex-shrink-0 mt-0.5" />
                <span>
                  La identificación de quiénes integran el top sigue siendo <b>MANUAL</b> en Mi Espacio (toggle "Está
                  en el top" + asignación de puesto a mano): no hay ranking automático ni cruce automático con datos
                  de firmas. Esta configuración define el presupuesto y cómo se reparte; el fondo es el presupuesto
                  MÁXIMO disponible.
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Fondo total (ARS)
                  </span>
                  <TextInput
                    type="number"
                    min="0"
                    aria-label="Fondo total de premios"
                    value={fondoDraft}
                    onChange={(e) => setFondoDraft(e.target.value)}
                    onBlur={guardarFondo}
                    style={{ minWidth: "140px" }}
                  />
                </label>
                <Select
                  label="Modalidad de distribución"
                  aria-label="Modalidad de distribución"
                  value={cfg.premios.modalidad}
                  onChange={(e) => cambiarModalidad(e.target.value)}
                  options={[
                    { value: "fija", label: "Importes fijos por puesto" },
                    { value: "porcentual", label: "Distribución porcentual del fondo" },
                  ]}
                  style={{ minWidth: "220px" }}
                />
                <Toggle
                  checked={cfg.premios.permitirSaldoParcial}
                  onChange={(v) => guardarPremios({ permitirSaldoParcial: v }, "Distribución de premios")}
                  label="Permitir saldo sin asignar"
                />
              </div>

              {/* Puestos con sus valores */}
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                <table className="w-full text-xs" style={{ color: "var(--color-text)" }} aria-label="Distribución de premios">
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-bg)" }}>
                      <th className="text-left p-2 font-semibold">Puesto</th>
                      <th className="text-left p-2 font-semibold">
                        {cfg.premios.modalidad === "porcentual" ? "Porcentaje (%)" : "Importe (ARS)"}
                      </th>
                      <th className="text-right p-2 font-semibold">Premio resultante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfg.premios.puestos.map((p) => {
                      const draft = tarifaDrafts[`puesto-${p.lugar}`];
                      const premio = cfg.premios.activo ? calcularPremioPuesto(cfg.premios, p.lugar) : null;
                      return (
                        <tr key={p.lugar} style={{ borderTop: "1px solid var(--color-border)" }}>
                          <td className="p-2 font-medium">Puesto {p.lugar}</td>
                          <td className="p-2">
                            <TextInput
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={`Valor del puesto ${p.lugar}`}
                              value={draft !== undefined ? draft : String(p.valor)}
                              onChange={(e) => setTarifaDrafts((d) => ({ ...d, [`puesto-${p.lugar}`]: e.target.value }))}
                              onBlur={() => {
                                commitValorPuesto(p, draft ?? String(p.valor));
                                setTarifaDrafts((d) => ({ ...d, [`puesto-${p.lugar}`]: undefined }));
                              }}
                              style={{ minWidth: "120px" }}
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">{premio == null ? "—" : fmt(premio)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <BtnOutline size="sm" icon={Plus} onClick={() => modificarPuestos("agregar")}>
                  Agregar puesto
                </BtnOutline>
                <BtnOutline
                  size="sm"
                  icon={Trash2}
                  onClick={() => modificarPuestos("quitar")}
                  disabled={cfg.premios.puestos.length <= 1}
                >
                  Quitar último puesto
                </BtnOutline>
              </div>

              {/* Estado de la distribución */}
              {distPremios.ok ? (
                <div className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-success)" }}>
                  <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Distribución válida. Saldo sin asignar: <b>{fmt(distPremios.saldo)}</b>
                    {distPremios.advertencias.length > 0 ? ` — ${distPremios.advertencias[0]}` : ""}
                  </span>
                </div>
              ) : (
                <div className="text-xs flex items-start gap-1.5" role="alert" style={{ color: "var(--color-danger)" }}>
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{distPremios.errores[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------- HISTORIAL --------------------------- */}
      {tab === "historial" && (
        <div className="config-section">
          <div className="config-section-title flex items-center gap-2">
            <History size={14} color="var(--color-accent)" />
            Historial de configuraciones
          </div>
          <div className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
            Cada cambio guarda fecha, campo, valor anterior y valor nuevo. Restaurar aplica un valor anterior como
            configuración VIGENTE para los cálculos futuros: las liquidaciones cerradas nunca se modifican. La app no
            tiene usuarios autenticados, por lo que el registro no incluye autor (solo fechas reales).
          </div>

          {historial.length === 0 ? (
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Sin cambios registrados todavía.
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                <table className="w-full text-xs" style={{ color: "var(--color-text)" }} aria-label="Historial de configuraciones">
                  <thead>
                    <tr style={{ backgroundColor: "var(--color-bg)", position: "sticky", top: 0 }}>
                      <th className="text-left p-2 font-semibold">Fecha</th>
                      <th className="text-left p-2 font-semibold">Campo</th>
                      <th className="text-left p-2 font-semibold">Valor anterior</th>
                      <th className="text-left p-2 font-semibold">Valor nuevo</th>
                      <th className="p-2" aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td className="p-2 whitespace-nowrap">{fechaCorta(h.fecha)}</td>
                        <td className="p-2">{LABELS_CAMPO[h.campo] || h.campo}</td>
                        <td className="p-2" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.valorAnterior}>
                          {h.valorAnterior}
                        </td>
                        <td className="p-2" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.valorNuevo}>
                          {h.valorNuevo}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            className="btn-base btn-ghost btn-sm flex items-center gap-1 ml-auto"
                            onClick={() => setRestaurar(h)}
                            aria-label={`Restaurar ${LABELS_CAMPO[h.campo] || h.campo} del ${fechaCorta(h.fecha)}`}
                          >
                            <RotateCcw size={12} />
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={!!restaurar}
            title="Restaurar configuración"
            message={
              restaurar
                ? `Se restaurará "${LABELS_CAMPO[restaurar.campo] || restaurar.campo}" al valor anterior y quedará como configuración vigente para los cálculos FUTUROS. Las liquidaciones cerradas no se modifican. Valor anterior: ${String(restaurar.valorAnterior).slice(0, 220)}`
                : ""
            }
            confirmLabel="Sí, restaurar"
            onConfirm={confirmarRestauracion}
            onCancel={() => setRestaurar(null)}
          />
        </div>
      )}
    </div>
  );
}

export default LiquidacionesConfig;
