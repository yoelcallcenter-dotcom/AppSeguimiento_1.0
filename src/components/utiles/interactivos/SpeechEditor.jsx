/**
 * SpeechEditor.jsx (Release 1.11.0 — rediseño §4: editor en 8 secciones)
 *
 * Por qué cambió: la 1.10.x tenía una vista única (árbol + panel de paso +
 * opciones planas v1). La 1.11.0 agrega preguntas con ramificaciones,
 * respuestas sugeridas, campos de registro, estados finales, módulos y reglas
 * operativas: todo eso no cabía en una sola vista. Ahora un segmented control
 * (patrón LiquidacionesConfig: role="tablist"/"tab"/"tabpanel") divide el
 * editor en 8 secciones:
 *
 *   1. General              — metadata del guion + reglas operativas (§8)
 *   2. Etapas y preguntas   — árbol + speech + preguntas/opciones (DEFAULT)
 *   3. Opciones             — acción, registro, aclaración, cierre,
 *                             asignaciones (§2.2/§2.5)
 *   4. Respuestas sugeridas — qué dice el operador por opción (§2.3)
 *   5. Módulos              — módulos transversales + catálogo de objeciones (§2.4)
 *   6. Campos               — campos de registro de la etapa (8 tipos, §3)
 *   7. Estados              — estados finales configurables por guion (§2.5)
 *   8. Vista previa/validación — recorrido renderizado + conteo del checklist
 *
 * Decisiones de diseño (y por qué):
 * - Borrador SIEMPRE guardable (§4): cada edición llama a onChange de
 *   inmediato (el padre persiste con useStorage); no hay botón "guardar"
 *   bloqueante ni pérdida de trabajo por errores de validación. Se deja aviso
 *   visible de guardado automático.
 * - Cabecera SIEMPRE visible: Volver, nombre, descripción, estado de
 *   validación e "Iniciar Speech" (contrato con la 1.10.x y con los tests).
 *   Por eso nombre y descripción NO se duplican dentro de la sección General.
 * - Checklist de errores y advertencias SIEMPRE visible bajo la cabecera
 *   (§4 "checklist de errores"); la sección 8 agrega la vista previa.
 * - La sección activa NO se resetea al cambiar de etapa en el árbol: las
 *   secciones 2/3/4/6 editan la etapa SELECCIONADA (contexto compartido).
 * - `guion = normalizarSpeech(speech)` es la fuente de LECTURA: los guiones
 *   v1 (opciones sueltas en la etapa) se muestran y editan sin migración
 *   destructiva; el primer guardado ya los deja en forma v2 (los mutadores
 *   del modelo normalizan cada etapa que tocan).
 *
 * Contrato con tests (NO romper): "Volver a la lista", "Nombre del speech",
 * "Descripción del speech", "Listo para ejecutar", "Iniciar Speech", los
 * aria-labels del árbol ("Paso N", "Subir/Bajar paso N"), "Nuevo paso",
 * "Título del paso", "Marcar como INICIO", "Contenido del paso",
 * "Insertar objeción: X", "Duplicar", "Eliminar paso", "Agregar opción",
 * "Opción N texto/destino", "Subir/Bajar/Duplicar/Eliminar opción N",
 * "Advertencias" y el modal de eliminación con "Nuevo destino de las
 * referencias".
 *
 * Riesgos conocidos: al ser secciones mutuamente excluyentes, un texto
 * repetido entre la cabecera y una sección solo coincidiría si el usuario
 * está en esa sección; los tests existentes usan la sección default.
 */
import React, { useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Play,
  AlertTriangle,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Settings,
  GitBranch,
  GitFork,
  MessageSquare,
  BookOpen,
  ClipboardList,
  Flag,
  Eye,
  FileText,
} from "lucide-react";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { TextInput } from "../../common/TextInput";
import { TextArea } from "../../common/TextArea";
import { Select } from "../../common/Select";
import { Field } from "../../common/Field";
import { Modal } from "../../common/Modal";
import { SearchInput } from "../../common/SearchInput";
import {
  agregarPaso,
  duplicarPaso,
  eliminarPaso,
  actualizarPaso,
  marcarInicio,
  agregarOpcion,
  actualizarOpcion,
  eliminarOpcion,
  moverOpcion,
  duplicarOpcion,
  crearPasoConectado,
  agregarPregunta,
  actualizarPregunta,
  eliminarPregunta,
  moverPregunta,
  agregarCampo,
  actualizarCampo,
  eliminarCampo,
  moverCampo,
  agregarEstadoFinal,
  actualizarEstadoFinal,
  eliminarEstadoFinal,
  agregarModulo,
  actualizarModulo,
  eliminarModulo,
  actualizarReglas,
  actualizarInfo,
  normalizarSpeech,
  validarSpeech,
  advertenciasSpeech,
  referenciasA,
  moverPaso,
  TIPOS_CAMPO,
} from "./interactiveSpeechModel";
import { resolverObjeciones } from "./resolveObjeciones";
import { normalizarTexto } from "../../../utils/helpers";
import { useClipboard } from "../../../hooks/useClipboard";
import { FlowTree } from "./FlowTree";

/** Secciones del editor (§4), en el orden del spec. */
const SECCIONES = [
  { id: "general", etiqueta: "General", icon: Settings },
  { id: "etapas", etiqueta: "Etapas y preguntas", icon: GitBranch },
  { id: "opciones", etiqueta: "Opciones", icon: GitFork },
  { id: "respuestas", etiqueta: "Respuestas sugeridas", icon: MessageSquare },
  { id: "modulos", etiqueta: "Módulos", icon: BookOpen },
  { id: "campos", etiqueta: "Campos", icon: ClipboardList },
  { id: "estados", etiqueta: "Estados", icon: Flag },
  { id: "vista", etiqueta: "Vista previa/validación", icon: Eye },
];

const etiquetaPaso = (speech, paso, index) => {
  const titulo = String(paso?.titulo || "").trim();
  return titulo || `Paso ${index + 1}`;
};

/**
 * Preguntas de una etapa con tolerancia a la forma v1 (solo LECTURA): un
 * guion sin normalizar trae `opciones` sueltas; se envuelven en una pregunta
 * implícita para mostrarlas sin tocar el dato original.
 */
function preguntasDe(paso) {
  if (Array.isArray(paso?.preguntas)) return paso.preguntas;
  if (Array.isArray(paso?.opciones)) {
    return [
      { id: `v1-${paso.id}`, texto: "", obligatoria: false, opciones: paso.opciones },
    ];
  }
  return [];
}

/** Fecha ISO legible "AAAA-MM-DD HH:MM" (o "—" si falta). */
const fmtFecha = (iso) => (iso ? String(iso).replace("T", " ").slice(0, 16) : "—");

export function SpeechEditor({
  speech,
  onChange,
  onVolver,
  onEjecutar,
  onExportar,
  showToast,
  objeciones = [],
}) {
  // --- Estado local -------------------------------------------------------
  // `seccion` default = "Etapas y preguntas": es la sección de trabajo
  // principal y mantiene visibles árbol + panel para los flujos existentes.
  const [seccion, setSeccion] = useState("etapas");
  const [pasoId, setPasoId] = useState(
    speech.startStepId || (speech.steps || [])[0]?.id || null
  );
  const [eliminando, setEliminando] = useState(null);
  const [destinoElim, setDestinoElim] = useState("");
  const [busquedaObj, setBusquedaObj] = useState("");
  const [ultimaLlave, setUltimaLlave] = useState(null);
  const contenidoRef = useRef(null);
  const { copiar, copiado } = useClipboard();

  // Fuente de LECTURA: normalización defensiva v1→v2 (idempotente y no
  // destructiva; el primer guardado deja el guion en forma nueva).
  const guion = useMemo(() => normalizarSpeech(speech) || {}, [speech]);
  const steps = Array.isArray(guion.steps) ? guion.steps : [];

  const errores = validarSpeech(guion);
  const advertencias = advertenciasSpeech(guion, objeciones);
  const paso = steps.find((s) => s.id === pasoId) || steps[0] || null;
  const pasoIndex = paso ? steps.findIndex((s) => s.id === paso.id) : -1;
  const refsEliminacion = eliminando ? referenciasA(guion, eliminando.id) : [];

  const preguntas = paso ? preguntasDe(paso) : [];
  // Opciones de la etapa en plano: el índice global da el número "Opción N"
  // de los aria-labels (contrato con los tests de la 1.10.x).
  const opcionesPlanas = preguntas.flatMap((pr) =>
    (Array.isArray(pr.opciones) ? pr.opciones : []).map((op) => ({ op, pr }))
  );
  const camposPaso =
    paso && Array.isArray(paso.camposRegistro) ? paso.camposRegistro : [];
  const estadosFinales = Array.isArray(guion.estadosFinales)
    ? guion.estadosFinales
    : [];
  const modulos = Array.isArray(guion.modulos) ? guion.modulos : [];
  const reglas = Array.isArray(guion.reglas) ? guion.reglas : [];

  // Todas las opciones del guion (para conteos de uso de estados/módulos).
  const opcionesDeTodos = steps.flatMap((s) =>
    preguntasDe(s).flatMap((pr) =>
      Array.isArray(pr.opciones) ? pr.opciones : []
    )
  );
  const totalPreguntas = steps.reduce((n, s) => n + preguntasDe(s).length, 0);

  const opcionesDestino = steps.map((s, i) => ({
    value: s.id,
    label: etiquetaPaso(guion, s, i),
  }));

  // Catálogo de objeciones filtrado (sección Módulos).
  const objecionesFiltradas = useMemo(() => {
    const base = Array.isArray(objeciones) ? objeciones.filter(Boolean) : [];
    const q = normalizarTexto(busquedaObj);
    if (!q) return base;
    return base.filter(
      (o) =>
        normalizarTexto(o.titulo).includes(q) ||
        normalizarTexto(o.contenido).includes(q)
    );
  }, [objeciones, busquedaObj]);

  const aplicar = (nuevo, mensaje) => {
    onChange(nuevo);
    if (mensaje && showToast) showToast(mensaje, "success");
  };

  // --- Manejadores de etapas (árbol + panel) ------------------------------
  const handleNuevoPaso = () => {
    const nuevo = agregarPaso(guion);
    setPasoId(nuevo.steps[nuevo.steps.length - 1].id);
    aplicar(nuevo, "Paso agregado");
  };

  const handleMoverPaso = (stepId, delta) =>
    onChange(moverPaso(guion, stepId, delta));

  const handleDuplicar = () => {
    if (!paso) return;
    const nuevo = duplicarPaso(guion, paso.id);
    setPasoId(nuevo.steps[pasoIndex + 1]?.id || paso.id);
    aplicar(nuevo, "Paso duplicado");
  };

  const confirmarEliminar = () => {
    if (!eliminando) return;
    if (refsEliminacion.length > 0 && !destinoElim) return;
    const nuevo = eliminarPaso(
      guion,
      eliminando.id,
      refsEliminacion.length > 0 ? destinoElim : null
    );
    setPasoId(nuevo.steps[0]?.id || null);
    setEliminando(null);
    setDestinoElim("");
    aplicar(nuevo, "Paso eliminado");
  };

  // --- Manejadores de preguntas/opciones ---------------------------------
  // Sin preguntaId agrega a la primera; si la etapa no tiene preguntas el
  // modelo crea la primera (así sigue funcionando el flujo v1 de "Agregar
  // opción" y el paso queda con una pregunta implícita).
  const handleNuevaOpcion = (preguntaId = null) => {
    if (!paso) return;
    onChange(agregarOpcion(guion, paso.id, "", preguntaId));
  };

  const cambiarDestino = (op, valor) => {
    if (valor === "__nuevo__") {
      const nuevo = crearPasoConectado(guion, paso.id, op.id);
      if (nuevo === guion) return;
      setPasoId(nuevo.steps[nuevo.steps.length - 1].id);
      aplicar(nuevo, "Paso creado y conectado");
      return;
    }
    onChange(actualizarOpcion(guion, paso.id, op.id, { targetStepId: valor }));
  };

  const cambiarAsignaciones = (op, nuevas) =>
    onChange(
      actualizarOpcion(guion, paso.id, op.id, { asignaciones: nuevas })
    );

  const agregarAsignacion = (op) => {
    if (!camposPaso.length) return;
    cambiarAsignaciones(op, [
      ...(Array.isArray(op.asignaciones) ? op.asignaciones : []),
      { campoId: camposPaso[0].id, valor: "" },
    ]);
  };

  // --- Inserción de llaves {OBJECION} ------------------------------------
  const insertarObjecion = (obj) => {
    if (!paso || !obj?.id) return;
    const llave = `{OBJECION:${obj.id}}`;
    const actual = paso.contenido || "";
    const el = contenidoRef.current;
    if (el && typeof el.selectionStart === "number") {
      const pos = el.selectionStart;
      const fin = typeof el.selectionEnd === "number" ? el.selectionEnd : pos;
      const nuevo = actual.slice(0, pos) + llave + actual.slice(fin);
      onChange(actualizarPaso(guion, paso.id, { contenido: nuevo }));
      el.focus();
      setTimeout(() => {
        try {
          el.setSelectionRange(pos + llave.length, pos + llave.length);
        } catch {}
      }, 0);
      return;
    }
    onChange(
      actualizarPaso(guion, paso.id, { contenido: `${actual}${llave}` })
    );
  };

  /** Inserta la llave al FINAL de la respuestaSugerida de una opción (§2.3). */
  const insertarLlaveEnRespuesta = (op, obj) => {
    if (!paso || !obj?.id) return;
    const actual = op.respuestaSugerida || "";
    const llave = `{OBJECION:${obj.id}}`;
    const siguiente =
      actual && !/\s$/.test(actual) ? `${actual} ${llave}` : `${actual}${llave}`;
    onChange(
      actualizarOpcion(guion, paso.id, op.id, { respuestaSugerida: siguiente })
    );
  };

  const copiarLlaveObjecion = (obj) => {
    setUltimaLlave(obj.id);
    copiar(`{OBJECION:${obj.id}}`);
  };

  // --- Reglas operativas (§8): líneas de texto, siempre guardadas --------
  const cambiarReglas = (texto) =>
    onChange(actualizarReglas(guion, texto.split("\n")));

  // --- Bloques reutilizables ---------------------------------------------
  /** Chips de objeciones para insertar llaves (§2.4). */
  const chipsObjeciones = (onInsert, contexto) =>
    objeciones.length === 0 ? (
      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        No hay objeciones cargadas — cargalas en Útiles › Objeciones.
      </div>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {objeciones.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onInsert(o)}
            title={`${o.titulo || "Sin título"} — ${o.contenido || "Sin contenido"}`}
            aria-label={`Insertar objeción${contexto}: ${o.titulo || o.id}`}
            className="pill-sm font-semibold transition-colors hover:opacity-80"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
              color: "var(--color-accent)",
            }}
          >
            {`{OBJECION:${o.id}}`}
          </button>
        ))}
      </div>
    );

  const sinPasoMsg = (
    <div
      className="text-sm py-8 text-center"
      style={{ color: "var(--color-text-muted)" }}
    >
      Seleccioná o creá un paso para editarlo.
    </div>
  );

  // --- Contenido de cada sección (una visible a la vez) -------------------
  const renderSeccion = () => {
    if (seccion === "general") {
      return (
        <div className="space-y-3">
          <div
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Información del guion
          </div>
          <div
            className="grid gap-2 sm:grid-cols-2 text-xs"
            style={{ color: "var(--color-text)" }}
          >
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>ID: </span>
              {guion.id}
            </div>
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>Estado: </span>
              {guion.archivado ? "Archivado" : "Activo"}
            </div>
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>Creado: </span>
              {fmtFecha(guion.fechaCreacion)}
            </div>
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>
                Modificado:{" "}
              </span>
              {fmtFecha(guion.fechaModificacion)}
            </div>
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>Versión: </span>
              {guion.version || 1}
            </div>
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>Etapas: </span>
              {steps.length} · {totalPreguntas} pregunta
              {totalPreguntas !== 1 ? "s" : ""} · {opcionesDeTodos.length}{" "}
              opción{opcionesDeTodos.length !== 1 ? "es" : ""}
            </div>
          </div>

          <div
            className="pt-2 space-y-2"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Reglas operativas (§8)
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Contenido editable del guion: el motor NO las codifica. Se muestran
              al operador como guía durante la llamada. Una regla por línea.
            </div>
            <TextArea
              rows={4}
              value={reglas.join("\n")}
              onChange={(e) => cambiarReglas(e.target.value)}
              placeholder={"Una regla por línea\nEj: No prometer plazos de pago"}
              aria-label="Reglas operativas"
              className="w-full"
            />
            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              {reglas.length} regla{reglas.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      );
    }
    if (seccion === "etapas") {
      if (!paso) return sinPasoMsg;
      return (
        <>
          {/* Cabecera de la etapa: título + INICIO (§2.1) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[160px]">
              <TextInput
                value={paso.titulo || ""}
                onChange={(e) =>
                  onChange(actualizarPaso(guion, paso.id, { titulo: e.target.value }))
                }
                placeholder="Título del paso (opcional)"
                aria-label="Título del paso"
              />
            </div>
            {guion.startStepId === paso.id ? (
              <span
                className="pill-sm font-bold"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                  color: "var(--color-success)",
                }}
              >
                INICIO
              </span>
            ) : (
              <BtnOutline
                onClick={() => onChange(marcarInicio(guion, paso.id))}
                size="sm"
                color="var(--color-success)"
              >
                Marcar como INICIO
              </BtnOutline>
            )}
          </div>

          {/* Objetivo de la etapa (campo nuevo v2, §2) */}
          <TextInput
            value={paso.objetivo || ""}
            onChange={(e) =>
              onChange(actualizarPaso(guion, paso.id, { objetivo: e.target.value }))
            }
            placeholder="Objetivo de la etapa (opcional)"
            aria-label="Objetivo de la etapa"
            className="w-full"
          />

          {/* Speech de la etapa con inserción de llaves {OBJECION} */}
          <TextArea
            rows={3}
            value={paso.contenido || ""}
            onChange={(e) =>
              onChange(actualizarPaso(guion, paso.id, { contenido: e.target.value }))
            }
            placeholder="Contenido del paso..."
            className="w-full"
            aria-label="Contenido del paso"
            ref={contenidoRef}
          />

          <div className="space-y-1.5">
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Objeciones — hacé clic para insertar
            </div>
            {chipsObjeciones(insertarObjecion, "")}
          </div>

          <div className="flex items-center gap-2">
            <BtnOutline onClick={handleDuplicar} icon={Copy} size="sm">
              Duplicar
            </BtnOutline>
            <BtnOutline
              onClick={() => {
                setEliminando(paso);
                setDestinoElim("");
              }}
              icon={Trash2}
              size="sm"
              color="var(--color-danger)"
            >
              Eliminar paso
            </BtnOutline>
          </div>

          {/* Preguntas con sus opciones (v2 §2: etapa → pregunta → opción) */}
          <div className="pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Preguntas
              </span>
              <Btn
                onClick={() => onChange(agregarPregunta(guion, paso.id, ""))}
                icon={Plus}
                size="sm"
              >
                Agregar pregunta
              </Btn>
            </div>

            {preguntas.length === 0 && (
              <div
                className="text-[11px] mb-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                Sin preguntas: la etapa avanza con &quot;Siguiente&quot;. Agregá una
                opción para ramificar.
              </div>
            )}

            {preguntas.map((pr, k) => {
              const opsDePr = Array.isArray(pr.opciones) ? pr.opciones : [];
              return (
                <div
                  key={pr.id}
                  className="rounded-lg p-2 space-y-2 mb-2"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {/* Fila de la pregunta */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        aria-label={`Subir pregunta ${k + 1}`}
                        disabled={k === 0}
                        onClick={() =>
                          onChange(moverPregunta(guion, paso.id, pr.id, -1))
                        }
                        className="p-1 rounded transition-colors hover:bg-white/5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar pregunta ${k + 1}`}
                        disabled={k === preguntas.length - 1}
                        onClick={() =>
                          onChange(moverPregunta(guion, paso.id, pr.id, 1))
                        }
                        className="p-1 rounded transition-colors hover:bg-white/5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <TextInput
                        value={pr.texto || ""}
                        onChange={(e) =>
                          onChange(
                            actualizarPregunta(guion, paso.id, pr.id, {
                              texto: e.target.value,
                            })
                          )
                        }
                        placeholder={`Pregunta ${k + 1}: texto para el trabajador`}
                        aria-label={`Pregunta ${k + 1} texto`}
                      />
                    </div>
                    <label
                      className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(pr.obligatoria)}
                        onChange={(e) =>
                          onChange(
                            actualizarPregunta(guion, paso.id, pr.id, {
                              obligatoria: e.target.checked,
                            })
                          )
                        }
                        aria-label={`Pregunta ${k + 1} obligatoria`}
                      />
                      Obligatoria
                    </label>
                    <button
                      type="button"
                      aria-label={`Eliminar pregunta ${k + 1}`}
                      onClick={() =>
                        onChange(eliminarPregunta(guion, paso.id, pr.id))
                      }
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Opciones de ESTA pregunta: "Opción N" es índice global
                      de la etapa (contrato con los tests de la 1.10.x). */}
                  <div className="space-y-2">
                    {opsDePr.map((op, idx) => {
                      const j = Math.max(
                        0,
                        opcionesPlanas.findIndex((x) => x.op.id === op.id)
                      );
                      return (
                        <div key={op.id} className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button
                              type="button"
                              aria-label={`Subir opción ${j + 1}`}
                              disabled={idx === 0}
                              onClick={() =>
                                onChange(moverOpcion(guion, paso.id, op.id, -1))
                              }
                              className="p-1 rounded transition-colors hover:bg-white/5"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Bajar opción ${j + 1}`}
                              disabled={idx === opsDePr.length - 1}
                              onClick={() =>
                                onChange(moverOpcion(guion, paso.id, op.id, 1))
                              }
                              className="p-1 rounded transition-colors hover:bg-white/5"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <TextInput
                              value={op.texto || ""}
                              onChange={(e) =>
                                onChange(
                                  actualizarOpcion(guion, paso.id, op.id, {
                                    texto: e.target.value,
                                  })
                                )
                              }
                              placeholder={`Opción ${j + 1}: texto para elegir`}
                              aria-label={`Opción ${j + 1} texto`}
                            />
                          </div>
                          {/* Destino: sin destino = avance lineal (§2.2);
                              solo se marca roto si apunta a etapa inexistente. */}
                          <Select
                            value={op.targetStepId || ""}
                            onChange={(e) => cambiarDestino(op, e.target.value)}
                            options={[
                              { value: "", label: "— Sin destino —" },
                              ...opcionesDestino,
                              { value: "__nuevo__", label: "+ Crear nuevo paso…" },
                            ]}
                            aria-label={`Opción ${j + 1} destino`}
                            className="flex-shrink-0"
                          />
                          <button
                            type="button"
                            aria-label={`Duplicar opción ${j + 1}`}
                            onClick={() =>
                              onChange(duplicarOpcion(guion, paso.id, op.id))
                            }
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Eliminar opción ${j + 1}`}
                            onClick={() =>
                              onChange(eliminarOpcion(guion, paso.id, op.id))
                            }
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-start">
                    <Btn
                      onClick={() => handleNuevaOpcion(pr.id)}
                      icon={Plus}
                      size="sm"
                    >
                      Agregar opción
                    </Btn>
                  </div>
                </div>
              );
            })}

            {/* Etapa sin preguntas: el botón crea la primera con la opción
                (flujo v1 "Agregar opción" preservado). */}
            {preguntas.length === 0 && (
              <Btn onClick={() => handleNuevaOpcion(null)} icon={Plus} size="sm">
                Agregar opción
              </Btn>
            )}

            {opcionesPlanas.length === 0 && (
              <div
                className="text-[11px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                Sin opciones: este paso sería el final del recorrido.
              </div>
            )}
          </div>
        </>
      );
    }
    if (seccion === "opciones") {
      if (!paso) return sinPasoMsg;
      if (!opcionesPlanas.length) {
        return (
          <div
            className="text-sm py-8 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            Esta etapa no tiene opciones. Agregá una en &quot;Etapas y
            preguntas&quot;.
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Acción, registro, aclaración y cierre de cada opción (§2.2/§2.5). El
            texto y el destino se editan en &quot;Etapas y preguntas&quot;.
          </div>
          {opcionesPlanas.map(({ op, pr }) => {
            const j = Math.max(
              0,
              opcionesPlanas.findIndex((x) => x.op.id === op.id)
            );
            return (
              <div
                key={op.id}
                className="rounded-lg p-2 space-y-2"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Opción {j + 1}: {op.texto || "(sin texto)"}
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {" "}
                    — {pr.texto || "pregunta sin texto"}
                  </span>
                </div>

                <Field label="Acción del operador">
                  <TextInput
                    value={op.accion || ""}
                    onChange={(e) =>
                      onChange(
                        actualizarOpcion(guion, paso.id, op.id, {
                          accion: e.target.value,
                        })
                      )
                    }
                    placeholder="Qué hace el operador al elegirla"
                    aria-label={`Opción ${j + 1} acción`}
                  />
                </Field>

                <Field label="Datos a registrar">
                  <TextInput
                    value={op.datosARegistrar || ""}
                    onChange={(e) =>
                      onChange(
                        actualizarOpcion(guion, paso.id, op.id, {
                          datosARegistrar: e.target.value,
                        })
                      )
                    }
                    placeholder="Qué debe anotar el operador (texto guía)"
                    aria-label={`Opción ${j + 1} datos a registrar`}
                  />
                </Field>

                <div className="flex flex-wrap gap-4">
                  <label
                    className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(op.requiereAclaracion)}
                      onChange={(e) =>
                        onChange(
                          actualizarOpcion(guion, paso.id, op.id, {
                            requiereAclaracion: e.target.checked,
                          })
                        )
                      }
                      aria-label={`Opción ${j + 1} requiere aclaración`}
                    />
                    Exige aclaración antes de continuar
                  </label>
                  <label
                    className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(op.finalizaLlamada)}
                      onChange={(e) =>
                        onChange(
                          actualizarOpcion(guion, paso.id, op.id, {
                            finalizaLlamada: e.target.checked,
                          })
                        )
                      }
                      aria-label={`Opción ${j + 1} finaliza la llamada`}
                    />
                    Finaliza la llamada
                  </label>
                </div>

                {/* Estado final precargado solo tiene sentido si la opción
                    finaliza la llamada (§2.5). */}
                {op.finalizaLlamada && (
                  <Select
                    label="Estado final precargado"
                    value={op.estadoFinalId || ""}
                    onChange={(e) =>
                      onChange(
                        actualizarOpcion(guion, paso.id, op.id, {
                          estadoFinalId: e.target.value,
                        })
                      )
                    }
                    placeholder="— Sin estado —"
                    options={estadosFinales.map((e) => ({
                      value: e.id,
                      label: e.nombre,
                    }))}
                    aria-label={`Opción ${j + 1} estado final`}
                  />
                )}

                {modulos.length > 0 && (
                  <Select
                    label="Módulo transversal a abrir"
                    value={op.moduloId || ""}
                    onChange={(e) =>
                      onChange(
                        actualizarOpcion(guion, paso.id, op.id, {
                          moduloId: e.target.value,
                        })
                      )
                    }
                    placeholder="— Ninguno —"
                    options={modulos.map((m) => ({
                      value: m.id,
                      label: m.titulo || m.tipo,
                    }))}
                    aria-label={`Opción ${j + 1} módulo`}
                  />
                )}

                {/* Auto-relleno de campos de la etapa: solo aplica si la
                    etapa tiene campos (§2.2 "asignaciones"). */}
                {camposPaso.length > 0 && (
                  <div className="space-y-1">
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Auto-relleno de campos (solo si están vacíos)
                    </div>
                    {(Array.isArray(op.asignaciones) ? op.asignaciones : []).map(
                      (a, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                          <Select
                            value={a.campoId || ""}
                            onChange={(e) =>
                              cambiarAsignaciones(
                                op,
                                (op.asignaciones || []).map((x, m) =>
                                  m === idx ? { ...x, campoId: e.target.value } : x
                                )
                              )
                            }
                            options={camposPaso.map((c) => ({
                              value: c.id,
                              label: c.nombre || "(sin nombre)",
                            }))}
                            aria-label={`Opción ${j + 1} dato ${idx + 1} campo`}
                            className="flex-1"
                          />
                          <TextInput
                            value={a.valor || ""}
                            onChange={(e) =>
                              cambiarAsignaciones(
                                op,
                                (op.asignaciones || []).map((x, m) =>
                                  m === idx ? { ...x, valor: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Valor"
                            aria-label={`Opción ${j + 1} dato ${idx + 1} valor`}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            aria-label={`Quitar dato ${idx + 1} de la opción ${j + 1}`}
                            onClick={() =>
                              cambiarAsignaciones(
                                op,
                                (op.asignaciones || []).filter((_, m) => m !== idx)
                              )
                            }
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    )}
                    <Btn size="sm" icon={Plus} onClick={() => agregarAsignacion(op)}>
                      Agregar dato
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    if (seccion === "respuestas") {
      if (!paso) return sinPasoMsg;
      if (!opcionesPlanas.length) {
        return (
          <div
            className="text-sm py-8 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            Esta etapa no tiene opciones. Agregá una en &quot;Etapas y
            preguntas&quot;.
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Qué dice el operador al elegir cada opción (§2.3). Se muestra en el
            área de respuesta del modo ejecución, con las llaves {`{OBJECION}`}
            resueltas.
          </div>
          {opcionesPlanas.map(({ op }) => {
            const j = Math.max(
              0,
              opcionesPlanas.findIndex((x) => x.op.id === op.id)
            );
            return (
              <div
                key={op.id}
                className="rounded-lg p-2 space-y-2"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-accent)" }}
                >
                  Opción {j + 1}: {op.texto || "(sin texto)"}
                </div>
                <Field label="Respuesta sugerida">
                  <TextArea
                    rows={2}
                    value={op.respuestaSugerida || ""}
                    onChange={(e) =>
                      onChange(
                        actualizarOpcion(guion, paso.id, op.id, {
                          respuestaSugerida: e.target.value,
                        })
                      )
                    }
                    placeholder="Qué le decís al trabajador..."
                    aria-label={`Opción ${j + 1} respuesta sugerida`}
                    className="w-full"
                  />
                </Field>
                <div className="space-y-1.5">
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Objeciones — insertar en la respuesta
                  </div>
                  {chipsObjeciones(
                    (obj) => insertarLlaveEnRespuesta(op, obj),
                    " en respuesta"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (seccion === "modulos") {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Módulos transversales (§2.4)
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Permanecen disponibles durante toda la llamada: el operador los
              abre sin salir del recorrido.
            </div>
          </div>

          <div className="space-y-2">
            {modulos.length === 0 ? (
              <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Sin módulos en este guion.
              </div>
            ) : (
              modulos.map((m, i) => (
                <div key={m.id} className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="pill-sm font-bold flex-shrink-0"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
                      color: "var(--color-accent)",
                    }}
                  >
                    {String(m.tipo || "").toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-[160px]">
                    <TextInput
                      value={m.titulo || ""}
                      onChange={(e) =>
                        onChange(
                          actualizarModulo(guion, m.id, { titulo: e.target.value })
                        )
                      }
                      placeholder="Título del módulo"
                      aria-label={`Módulo ${i + 1} título`}
                    />
                  </div>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {opcionesDeTodos.filter((op) => op.moduloId === m.id).length}{" "}
                    uso(s)
                  </span>
                  <button
                    type="button"
                    aria-label={`Eliminar módulo ${i + 1}`}
                    onClick={() => onChange(eliminarModulo(guion, m.id))}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
            <Btn
              size="sm"
              icon={Plus}
              onClick={() =>
                onChange(
                  agregarModulo(guion, {
                    tipo: "objeciones",
                    titulo: "Objeciones frecuentes",
                  })
                )
              }
            >
              Agregar módulo
            </Btn>
          </div>

          {/* Catálogo de objeciones: ver + copiar la llave para pegarla en
              cualquier texto del guion (§2.4). */}
          <div className="pt-2 space-y-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Catálogo de objeciones
            </div>
            <SearchInput
              value={busquedaObj}
              onChange={(e) => setBusquedaObj(e.target.value)}
              placeholder="Buscar objeción..."
              aria-label="Buscar objeción en el catálogo"
            />
            {objecionesFiltradas.length === 0 ? (
              <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                No hay objeciones cargadas — cargalas en Útiles › Objeciones.
              </div>
            ) : (
              <div className="space-y-1.5">
                {objecionesFiltradas.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                    style={{
                      backgroundColor: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: "var(--color-text)" }}
                      >
                        {o.titulo || "(sin título)"}
                      </div>
                      <div
                        className="text-[10px] truncate"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {o.contenido}
                      </div>
                    </div>
                    <code
                      className="text-[10px] flex-shrink-0"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {`{OBJECION:${o.id}}`}
                    </code>
                    <Btn
                      size="sm"
                      variant="outline"
                      icon={copiado && ultimaLlave === o.id ? Check : Copy}
                      ariaLabel={`Copiar llave de ${o.titulo || o.id}`}
                      onClick={() => copiarLlaveObjecion(o)}
                    >
                      {copiado && ultimaLlave === o.id ? "Copiada" : "Copiar llave"}
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (seccion === "campos") {
      if (!paso) return sinPasoMsg;
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Campos de registro de &quot;
              {etiquetaPaso(guion, paso, pasoIndex)}&quot;
            </span>
            <Btn
              size="sm"
              icon={Plus}
              onClick={() =>
                onChange(agregarCampo(guion, paso.id, { nombre: "Nuevo campo" }))
              }
            >
              Agregar campo
            </Btn>
          </div>
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Se cargan durante la llamada, sobreviven a navegar entre etapas y se
            ven en el Resumen (§3). 8 tipos disponibles.
          </div>
          {camposPaso.length === 0 ? (
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Esta etapa no tiene campos de registro.
            </div>
          ) : (
            camposPaso.map((c, k) => (
              <div
                key={c.id}
                className="rounded-lg p-2 space-y-2"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      aria-label={`Subir campo ${k + 1}`}
                      disabled={k === 0}
                      onClick={() => onChange(moverCampo(guion, paso.id, c.id, -1))}
                      className="p-1 rounded transition-colors hover:bg-white/5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Bajar campo ${k + 1}`}
                      disabled={k === camposPaso.length - 1}
                      onClick={() => onChange(moverCampo(guion, paso.id, c.id, 1))}
                      className="p-1 rounded transition-colors hover:bg-white/5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <TextInput
                      value={c.nombre || ""}
                      onChange={(e) =>
                        onChange(
                          actualizarCampo(guion, paso.id, c.id, {
                            nombre: e.target.value,
                          })
                        )
                      }
                      placeholder="Nombre del campo"
                      aria-label={`Campo ${k + 1} nombre`}
                    />
                  </div>
                  <Select
                    value={c.tipo || "texto-corto"}
                    onChange={(e) =>
                      onChange(
                        actualizarCampo(guion, paso.id, c.id, { tipo: e.target.value })
                      )
                    }
                    options={TIPOS_CAMPO.map((t) => ({
                      value: t.tipo,
                      label: t.etiqueta,
                    }))}
                    aria-label={`Campo ${k + 1} tipo`}
                    className="flex-shrink-0"
                  />
                  <label
                    className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(c.obligatorio)}
                      onChange={(e) =>
                        onChange(
                          actualizarCampo(guion, paso.id, c.id, {
                            obligatorio: e.target.checked,
                          })
                        )
                      }
                      aria-label={`Campo ${k + 1} obligatorio`}
                    />
                    Obligatorio
                  </label>
                  <button
                    type="button"
                    aria-label={`Eliminar campo ${k + 1}`}
                    onClick={() => onChange(eliminarCampo(guion, paso.id, c.id))}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Las selecciones necesitan su lista de valores (una por
                    línea); al cambiar de tipo se conservan por no destructivo. */}
                {(c.tipo === "seleccion-unica" || c.tipo === "seleccion-multiple") && (
                  <Field label="Opciones (una por línea)">
                    <TextArea
                      rows={2}
                      value={(Array.isArray(c.opciones) ? c.opciones : []).join("\n")}
                      onChange={(e) =>
                        onChange(
                          actualizarCampo(guion, paso.id, c.id, {
                            opciones: e.target.value.split("\n"),
                          })
                        )
                      }
                      placeholder={"Opción A\nOpción B"}
                      aria-label={`Campo ${k + 1} opciones`}
                      className="w-full"
                    />
                  </Field>
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    if (seccion === "estados") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Estados finales del guion (§2.5)
            </span>
            <Btn
              size="sm"
              icon={Plus}
              onClick={() => onChange(agregarEstadoFinal(guion, "Nuevo estado"))}
            >
              Agregar estado
            </Btn>
          </div>
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Son los estados que el operador elige al finalizar la llamada. El
            guion de ejemplo ART trae 9 como referencia (se carga con el ejemplo,
            no se duplica).
          </div>
          {estadosFinales.length === 0 ? (
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Sin estados: el operador finalizará la llamada sin estado definido.
            </div>
          ) : (
            estadosFinales.map((e, i) => (
              <div key={e.id} className="flex items-center gap-1.5 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <TextInput
                    value={e.nombre || ""}
                    onChange={(ev) =>
                      onChange(
                        actualizarEstadoFinal(guion, e.id, { nombre: ev.target.value })
                      )
                    }
                    placeholder={`Estado ${i + 1}`}
                    aria-label={`Estado ${i + 1} nombre`}
                  />
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {opcionesDeTodos.filter((op) => op.estadoFinalId === e.id).length}{" "}
                  opción(es) lo precargan
                </span>
                <button
                  type="button"
                  aria-label={`Eliminar estado ${i + 1}`}
                  onClick={() => onChange(eliminarEstadoFinal(guion, e.id))}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  style={{ color: "var(--color-danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      );
    }
    // Sección 8: vista previa del recorrido + conteo del checklist (§4.2).
    // El detalle de errores/advertencias vive en la lista SIEMPRE visible
    // de la cabecera; acá solo se agregan el conteo y el render del guion.
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[11px] font-semibold"
            style={{
              color: errores.length ? "var(--color-danger)" : "var(--color-success)",
            }}
          >
            {errores.length === 0
              ? "Sin errores de validación"
              : `Checklist: ${errores.length} punto(s) por corregir`}
          </span>
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {advertencias.length} advertencia
            {advertencias.length !== 1 ? "es" : ""} · {steps.length} etapa
            {steps.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Vista previa del recorrido
        </div>

        {steps.length === 0 ? (
          <div
            className="text-sm py-6 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            Sin etapas para previsualizar.
          </div>
        ) : (
          steps.map((s, i) => {
            const ps = preguntasDe(s);
            const campos = Array.isArray(s.camposRegistro) ? s.camposRegistro : [];
            return (
              <div
                key={s.id}
                className="rounded-lg p-2 space-y-1.5"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="flex flex-wrap items-center gap-2 text-xs font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  Etapa {i + 1}: {s.titulo || "(sin título)"}
                  {guion.startStepId === s.id && (
                    <span
                      className="pill-sm font-bold"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                        color: "var(--color-success)",
                      }}
                    >
                      INICIO
                    </span>
                  )}
                </div>
                {s.objetivo ? (
                  <div
                    className="text-[10px] italic"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Objetivo: {s.objetivo}
                  </div>
                ) : null}
                {s.contenido ? (
                  <div
                    className="text-[11px] whitespace-pre-wrap"
                    style={{ color: "var(--color-text)", lineHeight: 1.6 }}
                  >
                    {resolverObjeciones(s.contenido, objeciones)}
                  </div>
                ) : null}
                {ps.map((pr, k) => (
                  <div
                    key={pr.id}
                    className="text-[11px] pl-2 space-y-0.5"
                    style={{
                      borderLeft: "2px solid var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <div>
                      <b>P{k + 1}:</b> {pr.texto || "(pregunta sin texto)"}
                    </div>
                    {(Array.isArray(pr.opciones) ? pr.opciones : []).map((op) => {
                      const dest = op.targetStepId
                        ? steps.find((x) => x.id === op.targetStepId)
                        : null;
                      return (
                        <div key={op.id} className="pl-3">
                          • {op.texto || "(sin texto)"} →{" "}
                          {op.targetStepId
                            ? dest
                              ? `"${etiquetaPaso(guion, dest, steps.indexOf(dest))}"`
                              : "destino inexistente"
                            : "siguiente"}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {campos.length > 0 && (
                  <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    {campos.length} campo(s) de registro
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // --- Cabecera (siempre visible) ----------------------------------------
  const barraSuperior = (
    <div className="flex flex-wrap items-center gap-2">
      <BtnOutline onClick={onVolver} icon={ArrowLeft} size="sm">
        Volver a la lista
      </BtnOutline>
      {/* Release 1.11.0 (§5): exportar el guion abierto sin volver a la lista. */}
      {onExportar && (
        <BtnOutline
          onClick={onExportar}
          icon={FileText}
          size="sm"
          aria-label="Exportar este guion"
          title="Exportar este guion"
        >
          Exportar
        </BtnOutline>
      )}
      <div className="flex-1 min-w-[160px] max-w-[320px]">
        <TextInput
          value={guion.nombre || ""}
          onChange={(e) =>
            onChange(actualizarInfo(guion, { nombre: e.target.value }))
          }
          placeholder="Nombre del speech"
          aria-label="Nombre del speech"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {errores.length > 0 ? (
          <span
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "var(--color-danger)" }}
            title={errores.join(" · ")}
          >
            <AlertTriangle size={13} />
            {errores.length} error{errores.length !== 1 ? "es" : ""}
          </span>
        ) : (
          <span
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "var(--color-success)" }}
          >
            <Check size={13} /> Listo para ejecutar
          </span>
        )}
        <Btn
          onClick={() => onEjecutar(guion.id)}
          icon={Play}
          size="sm"
          disabled={errores.length > 0}
        >
          Iniciar Speech
        </Btn>
      </div>
    </div>
  );

  const checklist =
    errores.length > 0 || advertencias.length > 0 ? (
      <div className="space-y-2">
        {errores.length > 0 && (
          <ul
            className="rounded-lg p-2 space-y-0.5 text-[11px]"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
              border: "1px solid var(--color-danger)",
              color: "var(--color-danger)",
            }}
          >
            {errores.map((err) => (
              <li key={err}>• {err}</li>
            ))}
          </ul>
        )}
        {advertencias.length > 0 && (
          <ul
            className="rounded-lg p-2 space-y-0.5 text-[11px]"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-warning) 6.7%, transparent)",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
            }}
            aria-label="Advertencias"
          >
            {advertencias.map((adv) => (
              <li key={adv}>• {adv}</li>
            ))}
          </ul>
        )}
      </div>
    ) : null;

  const seccionActual = SECCIONES.find((s) => s.id === seccion) || SECCIONES[1];

  return (
    <div className="space-y-3">
      {barraSuperior}

      <TextInput
        value={guion.descripcion || ""}
        onChange={(e) =>
          onChange(actualizarInfo(guion, { descripcion: e.target.value }))
        }
        placeholder="Descripción del speech (opcional)"
        aria-label="Descripción del speech"
        className="w-full"
      />

      {checklist}

      {/* §4: el borrador siempre está guardado (guardado automático). */}
      <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        Borrador guardado automáticamente: cada cambio se persiste al instante.
      </div>

      {/* 8 secciones (patrón LiquidacionesConfig). */}
      <div
        role="tablist"
        aria-label="Secciones del editor"
        className="flex flex-wrap gap-1 p-1 rounded-lg"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {SECCIONES.map(({ id, etiqueta, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={seccion === id}
            onClick={() => setSeccion(id)}
            className="btn-base btn-sm flex items-center gap-1.5"
            style={
              seccion === id
                ? {
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-text-on-accent)",
                  }
                : { color: "var(--color-text-muted)", backgroundColor: "transparent" }
            }
          >
            <Icon size={13} />
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 items-start">
        {/* El árbol SIEMPRE visible: navegación + contexto de etapa. */}
        <FlowTree
          speech={guion}
          pasoId={paso ? paso.id : null}
          onSelectPaso={setPasoId}
          onNuevoPaso={handleNuevoPaso}
          onMoverPaso={handleMoverPaso}
        />

        <div
          role="tabpanel"
          aria-label={seccionActual.etiqueta}
          className="rounded-lg p-3 space-y-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {renderSeccion()}
        </div>
      </div>

      <Modal
        isOpen={eliminando !== null}
        onClose={() => setEliminando(null)}
        title="Eliminar paso"
        icon={AlertTriangle}
        size="md"
        footer={
          <>
            <BtnOutline
              onClick={() => setEliminando(null)}
              color="var(--color-text-muted)"
              size="sm"
            >
              Cancelar
            </BtnOutline>
            <Btn
              onClick={confirmarEliminar}
              icon={Trash2}
              size="sm"
              color="var(--color-danger)"
              disabled={refsEliminacion.length > 0 && !destinoElim}
            >
              Eliminar
            </Btn>
          </>
        }
      >
        {eliminando && (
          <div className="space-y-3 text-sm" style={{ color: "var(--color-text)" }}>
            <p>
              ¿Eliminar el paso{" "}
              <b>
                &quot;
                {etiquetaPaso(
                  guion,
                  eliminando,
                  steps.findIndex((s) => s.id === eliminando.id)
                )}
                &quot;
              </b>
              ?
            </p>
            {refsEliminacion.length > 0 ? (
              <div
                className="rounded-lg p-3 space-y-2 text-xs"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-warning) 6.7%, transparent)",
                  border: "1px solid var(--color-warning)",
                }}
              >
                <p style={{ color: "var(--color-warning)" }} className="font-semibold">
                  Es destino de {refsEliminacion.length} opción
                  {refsEliminacion.length !== 1 ? "es" : ""}. Elegí a dónde apuntar
                  antes de eliminar:
                </p>
                <Select
                  label="Nuevo destino de las referencias"
                  value={destinoElim}
                  onChange={(e) => setDestinoElim(e.target.value)}
                  placeholder="— Elegir paso —"
                  options={steps
                    .filter((s) => s.id !== eliminando.id)
                    .map((s) => ({
                      value: s.id,
                      label: etiquetaPaso(
                        guion,
                        s,
                        steps.findIndex((x) => x.id === s.id)
                      ),
                    }))}
                  aria-label="Nuevo destino de las referencias"
                />
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Ninguna opción de otro paso apunta a este paso.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SpeechEditor;
