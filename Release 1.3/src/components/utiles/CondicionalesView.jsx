import React, { useState, useMemo } from "react";
import {
  Search, Plus, Trash2, ShieldAlert, ShieldCheck, Scale,
  ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { Select } from "../common/Select";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString, sanitizeObject } from "../../utils/sanitize";
import { normalizarTexto } from "../../utils/helpers";
import { uid } from "../../utils/dateUtils";
import { soundSystem } from "../../core/notifications/soundSystem";

/**
 * Condicionales de Estudios Jurídicos.
 * Registra observaciones sobre estudios que no toman todas las aseguradoras o
 * que las toman con condiciones específicas de ingreso y lesión.
 */
export function CondicionalesView({
  condicionales,
  setCondicionales,
  mapeo = [],
  aseguradoras = [],
  showToast,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [editando, setEditando] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [filaAEliminar, setFilaAEliminar] = useState(null);
  // Grupos colapsados por defecto: solo se expanden los que el usuario abre.
  const [expandidos, setExpandidos] = useState(() => new Set());
  // Carga masiva (solo al crear): múltiples estudios × múltiples aseguradoras.
  const [multiEstudios, setMultiEstudios] = useState([]);
  const [multiAsegs, setMultiAsegs] = useState([]);
  const [inputEstudio, setInputEstudio] = useState("");
  const [inputAseg, setInputAseg] = useState("");

  const estudiosUnicos = useMemo(() => {
    const set = new Set((mapeo || []).map((m) => (m.estudio || "").trim()).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [mapeo]);

  const aseguradorasUnicas = useMemo(() => {
    const set = new Set((aseguradoras || []).filter(Boolean));
    (condicionales || []).forEach((c) => c.aseguradora && set.add(c.aseguradora));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [aseguradoras, condicionales]);

  const filtrados = useMemo(() => {
    let result = condicionales || [];
    const q = normalizarTexto(busqueda);
    if (q) {
      result = result.filter(
        (c) =>
          normalizarTexto(c.estudio).includes(q) ||
          normalizarTexto(c.aseguradora).includes(q) ||
          normalizarTexto(c.observacion).includes(q)
      );
    }
    if (filtro !== "todas") {
      result = result.filter((c) => c.condicion === filtro);
    }
    return result;
  }, [condicionales, busqueda, filtro]);

  const crearBorrador = () => ({
    id: uid(),
    estudio: "",
    aseguradora: "",
    condicion: "condicion",
    observacion: "",
  });

  const abrirNuevo = () => {
    setBorrador(crearBorrador());
    setEditando(null);
    setMultiEstudios([]);
    setMultiAsegs([]);
    setInputEstudio("");
    setInputAseg("");
  };

  const abrirEdicion = (item) => {
    setEditando(item.id);
    setBorrador({ ...item });
  };

  // Dedup case/acento-insistente preservando el primer formato ingresado.
  const uniqPorClave = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const k = normalizarTexto(v);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
    return out;
  };

  const guardar = () => {
    if (!borrador) return;
    if (editando) {
      const limpio = sanitizeObject(borrador);
      if (!limpio.estudio.trim()) {
        showToast("Indicá el estudio jurídico", "error");
        return;
      }
      if (!limpio.aseguradora.trim()) {
        showToast("Indicá la aseguradora", "error");
        return;
      }
      setCondicionales((list) =>
        (list || []).map((c) => (c.id === editando ? limpio : c))
      );
      soundSystem.playAction("save");
      showToast("Condición actualizada", "success");
      setBorrador(null);
      setEditando(null);
      return;
    }

    // Alta (simple o masiva): una condición por cada combinación estudio × aseguradora.
    const estudios = uniqPorClave(
      (multiEstudios.length ? multiEstudios : [borrador.estudio]).map((v) =>
        sanitizeString(v || "").trim()
      )
    );
    const asegs = uniqPorClave(
      (multiAsegs.length ? multiAsegs : [borrador.aseguradora]).map((v) =>
        sanitizeString(v || "").trim()
      )
    );
    if (!estudios.length) {
      showToast("Indicá al menos un estudio jurídico", "error");
      return;
    }
    if (!asegs.length) {
      showToast("Indicá al menos una aseguradora", "error");
      return;
    }
    const obsLimpia = sanitizeString(borrador.observacion || "");
    const existentes = new Set(
      (condicionales || []).map(
        (c) => `${normalizarTexto(c.estudio)}|${normalizarTexto(c.aseguradora)}`
      )
    );
    let omitidas = 0;
    const nuevas = [];
    for (const e of estudios) {
      for (const a of asegs) {
        const clave = `${normalizarTexto(e)}|${normalizarTexto(a)}`;
        if (existentes.has(clave)) {
          omitidas++;
          continue;
        }
        existentes.add(clave);
        nuevas.push({
          id: uid(),
          estudio: e,
          aseguradora: a,
          condicion: borrador.condicion,
          observacion: obsLimpia,
        });
      }
    }
    if (!nuevas.length) {
      showToast("Ya existen condiciones para esas combinaciones", "warning");
      return;
    }
    setCondicionales((list) => [...(list || []), ...nuevas]);
    soundSystem.playAction("create");
    showToast(
      nuevas.length === 1 && !omitidas
        ? "Condición registrada"
        : `${nuevas.length} condiciones registradas${
            omitidas ? ` · ${omitidas} omitida${omitidas !== 1 ? "s" : ""} por duplicado` : ""
          }`,
      "success"
    );
    setBorrador(null);
    setMultiEstudios([]);
    setMultiAsegs([]);
    setInputEstudio("");
    setInputAseg("");
  };

  const eliminar = (id) => {
    setCondicionales((list) => (list || []).filter((c) => c.id !== id));
    setFilaAEliminar(null);
    showToast("Condición eliminada", "info");
  };

  const agregarChip = (valor, lista, setLista) => {
    const v = (valor || "").trim();
    if (!v) return;
    const dup = lista.some((x) => normalizarTexto(x) === normalizarTexto(v));
    if (dup) {
      showToast("Ese valor ya fue agregado", "info");
      return;
    }
    setLista([...lista, v]);
  };

  const CONDICION_OPTS = [
    { value: "no-toma", label: "No toma la aseguradora", icon: ShieldAlert, color: "#EF4444" },
    { value: "condicion", label: "Toma con condiciones", icon: Scale, color: "#F59E0B" },
  ];

  const condMeta = (condicion) =>
    CONDICION_OPTS.find((o) => o.value === condicion) || CONDICION_OPTS[1];

  // Agrupación por estudio; dentro de cada grupo las filas se ordenan por
  // Aseguradora (con fallback seguro si falta el dato).
  const grupos = useMemo(() => {
    const map = new Map();
    for (const c of filtrados) {
      const clave = (c.estudio || "Sin estudio").trim();
      if (!map.has(clave)) map.set(clave, []);
      map.get(clave).push(c);
    }
    return [...map.entries()]
      .map(([estudio, items]) => ({
        estudio,
        items: [...items].sort((a, b) =>
          (a.aseguradora || "").localeCompare(b.aseguradora || "", "es")
        ),
      }))
      .sort((a, b) => a.estudio.localeCompare(b.estudio, "es"));
  }, [filtrados]);

  const toggleGrupo = (estudio) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(estudio)) next.delete(estudio);
      else next.add(estudio);
      return next;
    });

  const todosExpandidos =
    grupos.length > 0 && grupos.every((g) => expandidos.has(g.estudio));

  const toggleTodos = () =>
    setExpandidos(todosExpandidos ? new Set() : new Set(grupos.map((g) => g.estudio)));

  const total = (condicionales || []).length;
  const noToma = (condicionales || []).filter((c) => c.condicion === "no-toma").length;

  const renderChips = (lista, setLista) => (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {lista.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)" }}
        >
          {v}
          <button
            type="button"
            onClick={() => setLista(lista.filter((x) => x !== v))}
            className="hover:opacity-70 transition-opacity"
            title="Quitar"
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Condicionales de Estudios Jurídicos
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
          {total} registradas
        </span>
        {noToma > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EF4444" + "22", color: "#EF4444" }}>
            {noToma} no toman
          </span>
        )}
      </div>
      <div className="text-[10px] mb-4" style={{ color: "var(--color-text-muted)" }}>
        Estudios que no toman todas las aseguradoras o que las aceptan con condiciones de ingreso y lesión.
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por estudio, aseguradora, lesión..."
            className="pl-8"
          />
        </div>
        <Select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ width: 190 }}
          options={[
            { value: "todas", label: "Todas las condiciones" },
            { value: "no-toma", label: "No toman aseguradoras" },
            { value: "condicion", label: "Con condiciones" },
          ]}
        />
        <Btn onClick={abrirNuevo} icon={Plus} size="sm">
          Nueva condición
        </Btn>
      </div>

      {/* Formulario agregar/editar */}
      {(borrador || editando) && (
        <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-accent)44" }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} color="var(--color-accent)" />
            <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
              {editando ? "Editar condición" : "Nueva condición"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {editando ? (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--color-text-muted)" }}>Estudio Jurídico</label>
                <TextInput
                  value={borrador.estudio}
                  onChange={(e) => setBorrador((b) => ({ ...b, estudio: e.target.value }))}
                  list="cond-estudios"
                  placeholder="Nombre del estudio"
                />
                <datalist id="cond-estudios">
                  {estudiosUnicos.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            ) : (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--color-text-muted)" }}>Estudio(s) Jurídico(s)</label>
                <div className="flex items-center gap-1">
                  <TextInput
                    value={inputEstudio}
                    onChange={(e) => setInputEstudio(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarChip(inputEstudio, multiEstudios, setMultiEstudios);
                        setInputEstudio("");
                      }
                    }}
                    list="cond-estudios"
                    placeholder="Nombre del estudio y Enter"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    title="Agregar estudio"
                    onClick={() => {
                      agregarChip(inputEstudio, multiEstudios, setMultiEstudios);
                      setInputEstudio("");
                    }}
                    className="p-1.5 rounded hover:bg-white/5 transition-colors shrink-0"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <datalist id="cond-estudios">
                  {estudiosUnicos.map((s) => <option key={s} value={s} />)}
                </datalist>
                {renderChips(multiEstudios, setMultiEstudios)}
              </div>
            )}
            {editando ? (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--color-text-muted)" }}>Aseguradora</label>
                <TextInput
                  value={borrador.aseguradora}
                  onChange={(e) => setBorrador((b) => ({ ...b, aseguradora: e.target.value }))}
                  list="cond-aseguradoras"
                  placeholder="Nombre de la aseguradora"
                />
                <datalist id="cond-aseguradoras">
                  {aseguradorasUnicas.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>
            ) : (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--color-text-muted)" }}>Aseguradora(s)</label>
                <div className="flex items-center gap-1">
                  <TextInput
                    value={inputAseg}
                    onChange={(e) => setInputAseg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarChip(inputAseg, multiAsegs, setMultiAsegs);
                        setInputAseg("");
                      }
                    }}
                    list="cond-aseguradoras"
                    placeholder="Nombre de la aseguradora y Enter"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    title="Agregar aseguradora"
                    onClick={() => {
                      agregarChip(inputAseg, multiAsegs, setMultiAsegs);
                      setInputAseg("");
                    }}
                    className="p-1.5 rounded hover:bg-white/5 transition-colors shrink-0"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <datalist id="cond-aseguradoras">
                  {aseguradorasUnicas.map((a) => <option key={a} value={a} />)}
                </datalist>
                {renderChips(multiAsegs, setMultiAsegs)}
              </div>
            )}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--color-text-muted)" }}>Condición</label>
              <Select
                value={borrador.condicion}
                onChange={(e) => setBorrador((b) => ({ ...b, condicion: e.target.value }))}
                options={CONDICION_OPTS.map(({ value, label }) => ({ value, label }))}
              />
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--color-text-muted)" }}>Observación</label>
              <TextInput
                value={borrador.observacion}
                onChange={(e) => setBorrador((b) => ({ ...b, observacion: e.target.value }))}
                placeholder="Detalle de la condición"
              />
            </div>
          </div>
          {!editando && (multiEstudios.length > 1 || multiAsegs.length > 1) && (
            <div className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
              Se generará una condición por cada combinación estudio × aseguradora
              ({multiEstudios.length || 1} × {multiAsegs.length || 1}).
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <Btn onClick={guardar} size="sm">
              {editando
                ? "Guardar cambios"
                : (multiEstudios.length > 1 || multiAsegs.length > 1)
                ? "Registrar condiciones"
                : "Registrar condición"}
            </Btn>
            <BtnOutline
              size="sm"
              color="var(--color-text-muted)"
              onClick={() => { setBorrador(null); setEditando(null); }}
            >
              Cancelar
            </BtnOutline>
          </div>
        </div>
      )}

      {/* Grupos por estudio */}
      {grupos.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)" }}>
          <ShieldAlert size={28} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
          <div className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            {busqueda || filtro !== "todas"
              ? "No hay condiciones que coincidan con el filtro."
              : "Aún no hay condicionales registradas."}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)", opacity: 0.8 }}>
            Cargá las condiciones de cada estudio con sus aseguradoras.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.length > 1 && (
            <div className="flex justify-end">
              <button
                onClick={toggleTodos}
                className="text-[11px] font-semibold px-2 py-1 rounded transition-colors hover:opacity-70"
                style={{ color: "var(--color-accent)" }}
              >
                {todosExpandidos ? "Colapsar todo" : "Expandir todo"}
              </button>
            </div>
          )}
          {grupos.map((g) => {
            const expandido = expandidos.has(g.estudio);
            return (
              <div
                key={g.estudio}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <button
                  type="button"
                  onClick={() => toggleGrupo(g.estudio)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors hover:opacity-90"
                  style={{ backgroundColor: "var(--color-surface2)", borderBottom: expandido ? "1px solid var(--color-border)" : "none" }}
                  aria-expanded={expandido}
                >
                  {expandido ? (
                    <ChevronUp size={14} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                  ) : (
                    <ChevronDown size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  )}
                  <Scale size={14} style={{ color: "var(--color-accent)" }} />
                  <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{sanitizeString(g.estudio)}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                    {g.items.length} condición{g.items.length !== 1 ? "es" : ""}
                  </span>
                </button>
                {expandido && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ color: "var(--color-text-muted)" }}>
                          <th className="text-left px-4 py-2 font-semibold">Condición</th>
                          <th className="text-left px-4 py-2 font-semibold">Aseguradora</th>
                          <th className="text-left px-4 py-2 font-semibold">Observaciones</th>
                          <th className="text-right px-4 py-2 font-semibold whitespace-nowrap" style={{ minWidth: 150 }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((c) => {
                          const meta = condMeta(c.condicion);
                          const Icon = meta.icon;
                          return (
                            <tr key={c.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                              <td className="px-4 py-2 align-middle">
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap"
                                  style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                                >
                                  <Icon size={10} /> {meta.value === "no-toma" ? "No toma" : "Con condiciones"}
                                </span>
                              </td>
                              <td className="px-4 py-2 align-middle" style={{ color: "var(--color-text)" }}>{sanitizeString(c.aseguradora || "—")}</td>
                              <td className="px-4 py-2 align-middle" style={{ color: "var(--color-text-muted)" }}>{sanitizeString(c.observacion || "—")}</td>
                              <td className="px-4 py-2 text-right align-middle whitespace-nowrap">
                                <button onClick={() => abrirEdicion(c)} className="text-[11px] font-semibold px-2 py-1 rounded transition-colors hover:opacity-70" style={{ color: "var(--color-accent)" }}>
                                  Editar
                                </button>
                                <button
                                  onClick={() => setFilaAEliminar(c)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-colors hover:opacity-70 ml-1"
                                  style={{ color: "var(--color-danger)" }}
                                >
                                  <Trash2 size={12} /> Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!filaAEliminar}
        title="Eliminar condición"
        message={`¿Seguro que querés eliminar la condición de "${filaAEliminar?.estudio || "este estudio"}"?`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setFilaAEliminar(null)}
        onConfirm={() => eliminar(filaAEliminar.id)}
      />
    </div>
  );
}

export default CondicionalesView;
