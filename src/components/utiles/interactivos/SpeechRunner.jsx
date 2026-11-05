/**
 * SpeechRunner.jsx (Release 1.11.0 — reescritura del modo ejecución)
 * Motor visual de llamada del Asistente Interactivo. Cambios y por qué:
 *
 * - Recorrido por ETAPAS con PREGUNTAS y RAMIFICACIONES (§2): cada etapa
 *   muestra objetivo, speech (con copia al portapapeles), la pregunta actual
 *   y sus opciones. Elegir una opción abre el ÁREA DE RESPUESTA con la
 *   respuesta sugerida (copiable), la acción del operador, los datos a
 *   registrar y el destino visible; recién ahí "Continuar" avanza.
 * - Navegación: avanzar (motor puro resolverDestino), Atrás (historial de
 *   posiciones), Ir a etapa (salto), Marcar completada/Reabrir y Reiniciar.
 *   Ninguna navegación pierde el registro de la llamada (§2.1).
 * - Registro de llamada EN MEMORIA (decisión de producto 1.11.0): campos por
 *   etapa (8 tipos, CampoRegistro), auto-fill de asignaciones SOLO en campos
 *   vacíos, gates de obligatorios con lista visible y sin escape (§2.1/§3),
 *   resumen editable en panel lateral. Nada se persiste al cerrar.
 * - Módulos transversales accesibles sin salir (§2.4): panel de Objeciones
 *   con búsqueda/copia/retorno; cada copia queda "consultada" para el
 *   resumen. Las llaves {OBJECION:id} se resuelven en speech, preguntas y
 *   respuestas sugeridas (compatibilidad 1.9.x intacta).
 * - Estados finales configurables por guion (§2.5): "Finalizar" abre un
 *   ConfirmDialog con Select de estados; una opción con finalizaLlamada
 *   precarga su estadoFinalId y cierra desde ahí.
 * - Cierre con confirmación si hay datos en curso (el registro no se
 *   guarda): el Modal del runner recibe `onClose` enmascarado por `cerrar`.
 *
 * Riesgos conocidos: el estado vive SOLO en este componente (remontar = perder
 * la llamada, que es el comportamiento deseado); si el guion trae errores de
 * validación se muestra el listado y NO se ejecuta (igual que la 1.9.x).
 */
import React, { useMemo, useState } from "react";
import { Modal } from "../../common/Modal";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { Select } from "../../common/Select";
import { Field } from "../../common/Field";
import { TextInput } from "../../common/TextInput";
import {
  Play,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  Copy,
  Check,
  Flag,
  ClipboardList,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import {
  validarSpeech,
  normalizarSpeech,
  resolverDestino,
  camposObligatoriosPendientes,
} from "./interactiveSpeechModel";
import { resolverObjeciones } from "./resolveObjeciones";
import { useClipboard } from "../../../hooks/useClipboard";
import { PanelObjeciones, PanelResumen, CampoRegistro } from "./RunnerPaneles";

/** Clave estable de una aclaración: etapa|pregunta|opción (conservada al navegar). */
const claveAclaracion = (stepId, preguntaIdx, opcionId) =>
  `${stepId}|${preguntaIdx}|${opcionId}`;

/** ¿El registro no tiene valor útil para este campo? (espejo del modelo). */
function valorVacio(campo, v) {
  if (campo?.tipo === "seleccion-multiple") return !(Array.isArray(v) && v.length > 0);
  if (campo?.tipo === "si-no") return v !== "si" && v !== "no";
  return v === undefined || v === null || String(v).trim() === "";
}

export function SpeechRunner({ speech, onClose, objeciones = [] }) {
  // Normalización defensiva al montar: un guion guardado en la forma v1
  // (opciones sueltas en la etapa) se ejecuta igual; es idempotente y no
  // reescribe storage (el mismo criterio que App.jsx en el punto de entrada).
  const guion = useMemo(() => normalizarSpeech(speech) || {}, [speech]);
  const steps = useMemo(() => (Array.isArray(guion.steps) ? guion.steps : []), [guion]);

  // --- Estado de la llamada (todo en memoria, §3) -------------------------
  const [pos, setPos] = useState(() => ({
    stepId: guion.startStepId || steps[0]?.id || null,
    preguntaIdx: 0,
  }));
  const [historial, setHistorial] = useState([]); // posiciones anteriores (Atrás)
  const [registro, setRegistro] = useState({}); // {campoId: valor}
  const [completadas, setCompletadas] = useState(() => new Set()); // etapas marcadas
  const [pendiente, setPendiente] = useState(null); // opción elegida (área de respuesta)
  const [aclaraciones, setAclaraciones] = useState({}); // borradores por clave
  const [avisoGate, setAvisoGate] = useState(false); // ya intentó avanzar con obligatorios pendientes
  const [panel, setPanel] = useState(null); // "objeciones" | "resumen" | null
  const [consultadas, setConsultadas] = useState([]); // ids de objeciones copiadas
  const [notas, setNotas] = useState("");
  const [finalizando, setFinalizando] = useState(false); // diálogo de estado final
  const [estadoFinalSel, setEstadoFinalSel] = useState("");
  const [finalizada, setFinalizada] = useState(false);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  // El Modal anima su salida ANTES de llamar a onClose: si el cierre queda
  // pendiente de confirmación, remontamos el Modal con key para recuperar su
  // estado visible al cancelar (no hay forma de resetear isLeaving desde
  // afuera; sin este remount quedaría invisible tras Cancelar).
  const [modalKey, setModalKey] = useState(0);

  const errores = useMemo(() => validarSpeech(guion), [guion]);
  const { copiar: copiarSpeech, copiado: speechCopiado } = useClipboard();
  const { copiar: copiarRespuesta, copiado: respuestaCopiada } = useClipboard();

  // --- Derivados de la posición actual ------------------------------------
  const pasoIdx = steps.findIndex((s) => s.id === pos.stepId);
  const paso = pasoIdx >= 0 ? steps[pasoIdx] : null;
  const preguntas = paso && Array.isArray(paso.preguntas) ? paso.preguntas : [];
  const pregunta = preguntas[pos.preguntaIdx] || null;
  const opciones = pregunta && Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
  const campos = paso && Array.isArray(paso.camposRegistro) ? paso.camposRegistro : [];
  const estadosFinales = Array.isArray(guion.estadosFinales) ? guion.estadosFinales : [];

  const sinPasos = steps.length === 0;
  const finRecorrido = errores.length === 0 && !paso && !sinPasos && !finalizada;
  const clavePend = pendiente
    ? claveAclaracion(pos.stepId, pos.preguntaIdx, pendiente.id)
    : "";
  const textoAclaracion = clavePend ? aclaraciones[clavePend] || "" : "";
  const pendientes = paso ? camposObligatoriosPendientes(guion, paso.id, registro) : [];
  const bloqueoAclaracion = Boolean(pendiente?.requiereAclaracion) && !textoAclaracion.trim();
  const estadoFinalNombre =
    estadosFinales.find((e) => e.id === estadoFinalSel)?.nombre || "";
  // "Datos en curso" = algo que se perdería al cerrar (el registro no se
  // persiste): solo en ese caso pedimos confirmación de cierre.
  const hayDatosEnCurso =
    !finalizada &&
    (historial.length > 0 ||
      Object.keys(registro).length > 0 ||
      Boolean(notas) ||
      consultadas.length > 0);

  const pct = finalizada || finRecorrido
    ? 100
    : pasoIdx >= 0 && steps.length
    ? Math.round(((pasoIdx + 1) / steps.length) * 100)
    : 0;

  // --- Acciones del recorrido ---------------------------------------------

  /** Auto-fill de asignaciones de la opción: SOLO en campos vacíos (§2.2). */
  const aplicarAsignaciones = (opcion) => {
    const asignaciones = Array.isArray(opcion?.asignaciones) ? opcion.asignaciones : [];
    if (!asignaciones.length || !paso) return;
    setRegistro((prev) => {
      const siguiente = { ...prev };
      let huboCambio = false;
      asignaciones.forEach((a) => {
        const campo = campos.find((c) => c.id === a.campoId);
        if (!campo || !valorVacio(campo, prev[a.campoId])) return; // nunca pisa lo ya cargado
        if (campo.tipo === "seleccion-multiple") {
          // Un valor string se interpreta como lista separada por comas.
          siguiente[a.campoId] = String(a.valor ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          siguiente[a.campoId] = a.valor ?? "";
        }
        huboCambio = true;
      });
      return huboCambio ? siguiente : prev;
    });
  };

  /**
   * Avanzar: 1) gate de aclaración (botón deshabilitado + guarda), 2) gate
   * de campos obligatorios (lista visible, sin escape), 3) asignaciones,
   * 4) finalizaLlamada abre el diálogo de estado, 5) motor resolverDestino.
   */
  const avanzar = () => {
    if (!paso || bloqueoAclaracion) return;
    if (pendientes.length) {
      setAvisoGate(true);
      return;
    }
    aplicarAsignaciones(pendiente);
    if (pendiente?.finalizaLlamada) {
      setPanel(null); // el ConfirmDialog (z-submodal) debe quedar por encima
      setEstadoFinalSel(pendiente.estadoFinalId || "");
      setFinalizando(true);
      return;
    }
    const destino = resolverDestino(guion, paso.id, pos.preguntaIdx, pendiente);
    setAvisoGate(false);
    setHistorial((h) => [...h, pos]);
    setPendiente(null);
    setPos(
      destino.fin
        ? { stepId: null, preguntaIdx: 0 }
        : { stepId: destino.stepId, preguntaIdx: destino.preguntaIdx }
    );
  };

  const atras = () => {
    if (!historial.length) return;
    setHistorial((h) => h.slice(0, -1));
    setPos(historial[historial.length - 1]);
    setPendiente(null);
    setAvisoGate(false);
  };

  const saltar = (stepId) => {
    if (!stepId || stepId === pos.stepId) return;
    setHistorial((h) => [...h, pos]);
    setPos({ stepId, preguntaIdx: 0 });
    setPendiente(null);
    setAvisoGate(false);
  };

  const reiniciar = () => {
    setPos({ stepId: guion.startStepId || steps[0]?.id || null, preguntaIdx: 0 });
    setHistorial([]);
    setRegistro({});
    setCompletadas(new Set());
    setPendiente(null);
    setAclaraciones({});
    setAvisoGate(false);
    setConsultadas([]);
    setNotas("");
    setFinalizada(false);
    setEstadoFinalSel("");
    setFinalizando(false);
  };

  const toggleCompletada = () => {
    if (!paso) return;
    setCompletadas((prev) => {
      const s = new Set(prev);
      if (s.has(paso.id)) s.delete(paso.id);
      else s.add(paso.id);
      return s;
    });
  };

  const setCampo = (campoId, valor) => setRegistro((prev) => ({ ...prev, [campoId]: valor }));

  const registrarConsultada = (id) =>
    setConsultadas((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const abrirFinalizar = () => {
    setPanel(null); // ConfirmDialog (z-submodal 60) por debajo de SidePanel (110)
    setEstadoFinalSel("");
    setFinalizando(true);
  };

  const confirmarFinalizacion = () => {
    setFinalizando(false);
    setFinalizada(true);
    setPendiente(null);
    setAvisoGate(false);
  };

  /** Cierre gateado: solo pide confirmación si hay datos en curso. */
  const cerrar = () => {
    if (hayDatosEnCurso) {
      setConfirmarCierre(true);
      return;
    }
    onClose();
  };

  const cancelarCierre = () => {
    setConfirmarCierre(false);
    setModalKey((k) => k + 1); // recuperar el Modal visible (ver comentario)
  };

  // --- Bloques de render ---------------------------------------------------

  const barraProgreso = (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
      }}
      role="progressbar"
      aria-label="Progreso de la llamada"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: "var(--color-accent)" }}
      />
    </div>
  );

  const subheader = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Modo ejecución
          </span>
          {paso ? (
            <span
              className="pill-sm font-bold"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
                color: "var(--color-accent)",
              }}
            >
              {/* Release 1.11.0: un único nodo de texto para que el pill sea
                  localizable tal cual ("ETAPA 1 / 2") por los tests y lectores
                  de pantalla; antes se partía en varios nodos JSX. */}
              {`ETAPA ${pasoIdx + 1} / ${steps.length}`}
            </span>
          ) : null}
          {finRecorrido ? (
            <span
              className="pill-sm font-bold"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                color: "var(--color-success)",
              }}
            >
              RECORRIDO COMPLETADO
            </span>
          ) : null}
          {finalizada ? (
            <span
              className="pill-sm font-bold"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                color: "var(--color-success)",
              }}
            >
              FINALIZADA
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BtnOutline
            size="sm"
            icon={ClipboardList}
            onClick={() => setPanel("resumen")}
            ariaLabel="Abrir resumen"
          >
            Resumen
          </BtnOutline>
          <BtnOutline
            size="sm"
            icon={BookOpen}
            onClick={() => setPanel("objeciones")}
            ariaLabel="Abrir objeciones"
          >
            Objeciones
          </BtnOutline>
          <BtnOutline
            size="sm"
            icon={Flag}
            onClick={abrirFinalizar}
            disabled={finalizada}
          >
            Finalizar
          </BtnOutline>
        </div>
      </div>
      {guion.descripcion ? (
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {guion.descripcion}
        </div>
      ) : null}
      {barraProgreso}
    </div>
  );

  const footer = (
    <>
      <BtnOutline
        onClick={atras}
        icon={ArrowLeft}
        size="sm"
        disabled={!historial.length}
        title={historial.length ? "Paso anterior" : "No hay pasos anteriores"}
      >
        Atrás
      </BtnOutline>
      <Select
        id="runner-ir-a-etapa"
        aria-label="Ir a etapa"
        value=""
        onChange={(e) => saltar(e.target.value)}
        placeholder="Ir a etapa..."
        options={steps.map((s, i) => ({
          value: s.id,
          label: `${completadas.has(s.id) ? "✓ " : ""}${i + 1}. ${s.titulo || "(sin título)"}`,
        }))}
        style={{ minWidth: "170px" }}
      />
      {paso ? (
        <BtnOutline
          size="sm"
          icon={completadas.has(paso.id) ? RotateCcw : Check}
          onClick={toggleCompletada}
        >
          {completadas.has(paso.id) ? "Reabrir" : "Marcar completada"}
        </BtnOutline>
      ) : null}
      <BtnOutline onClick={reiniciar} icon={RotateCcw} size="sm">
        Reiniciar
      </BtnOutline>
      <Btn onClick={cerrar} size="sm" ariaLabel="Cerrar llamada">
        Cerrar
      </Btn>
    </>
  );

  let cuerpo;
  if (errores.length > 0) {
    cuerpo = (
      <div
        className="rounded-lg p-4 flex items-start gap-2 text-sm"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
          border: "1px solid var(--color-danger)",
          color: "var(--color-danger)",
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Este speech tiene errores y no puede ejecutarse.
          <ul className="mt-1 space-y-0.5 text-[11px]">
            {errores.map((err) => (
              <li key={err}>• {err}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  } else if (finalizada) {
    // Pantalla de llamada finalizada: el resumen sigue accesible sin salir.
    cuerpo = (
      <div className="text-center space-y-4 py-8">
        <div
          className="text-lg font-bold"
          style={{ color: "var(--color-success)" }}
        >
          Llamada finalizada
        </div>
        {estadoFinalNombre ? (
          <div
            className="inline-block pill-sm font-bold"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
              color: "var(--color-success)",
            }}
          >
            Estado: {estadoFinalNombre}
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Sin estado final seleccionado.
          </div>
        )}
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          El registro de esta llamada vive en memoria hasta cerrar.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <BtnOutline
            icon={ClipboardList}
            onClick={() => setPanel("resumen")}
            ariaLabel="Ver resumen"
          >
            Ver resumen
          </BtnOutline>
          <BtnOutline icon={RotateCcw} onClick={reiniciar}>
            Nueva llamada
          </BtnOutline>
          <Btn onClick={cerrar} ariaLabel="Cerrar llamada">
            Cerrar
          </Btn>
        </div>
      </div>
    );
  } else if (sinPasos) {
    cuerpo = (
      <div className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        Este speech no tiene pasos.
      </div>
    );
  } else if (finRecorrido) {
    // Fin del recorrido: decidir estado final o volver atrás sin perder datos.
    cuerpo = (
      <div className="text-center space-y-4 py-8">
        <div className="text-lg font-bold" style={{ color: "var(--color-success)" }}>
          Fin del recorro
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Se llegó al final del guion. Puede finalizar la llamada con un estado o volver
          atrás.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Btn icon={Flag} onClick={abrirFinalizar}>
            Finalizar llamada
          </Btn>
          <BtnOutline
            icon={ClipboardList}
            onClick={() => setPanel("resumen")}
            ariaLabel="Abrir resumen"
          >
            Resumen
          </BtnOutline>
          <BtnOutline icon={ArrowLeft} onClick={atras} disabled={!historial.length}>
            Atrás
          </BtnOutline>
        </div>
      </div>
    );
  } else {
    // --- Etapa activa -----------------------------------------------------
    const destinoLabel = pendiente
      ? pendiente.targetStepId
        ? `etapa "${steps.find((s) => s.id === pendiente.targetStepId)?.titulo || "sin título"}"`
        : "la siguiente pregunta / etapa"
      : "";
    cuerpo = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
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
          ) : null}
          {completadas.has(paso.id) ? (
            <span
              className="pill-sm font-bold"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                color: "var(--color-success)",
              }}
            >
              COMPLETADA
            </span>
          ) : null}
          {paso.objetivo ? (
            <span className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
              Objetivo: {paso.objetivo}
            </span>
          ) : null}
        </div>

        {/* Speech de la etapa, con llaves {OBJECION} resueltas y copia. */}
        <div
          className="rounded-lg p-4 space-y-2"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              {paso.titulo || `Etapa ${pasoIdx + 1}`}
            </div>
            <Btn
              size="sm"
              variant="outline"
              icon={speechCopiado ? Check : Copy}
              ariaLabel="Copiar speech"
              onClick={() => copiarSpeech(resolverObjeciones(paso.contenido || "", objeciones))}
            >
              {speechCopiado ? "Copiado" : "Copiar"}
            </Btn>
          </div>
          <div
            className="text-sm whitespace-pre-wrap"
            style={{ color: "var(--color-text)", lineHeight: 1.7 }}
          >
            {resolverObjeciones(paso.contenido || "", objeciones)}
          </div>
        </div>

        {/* Pregunta actual */}
        {pregunta && pregunta.texto ? (
          <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {resolverObjeciones(pregunta.texto, objeciones)}
          </div>
        ) : null}

        {!pendiente ? (
          opciones.length ? (
            <div className="space-y-2">
              {opciones.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setPendiente(op)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
                    border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)",
                  }}
                >
                  {op.texto || "(sin texto)"}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-end">
              <Btn onClick={avanzar} icon={ChevronRight}>
                Siguiente
              </Btn>
            </div>
          )
        ) : (
          /* --- Área de respuesta (§2.3): sugerida + acción + destino ----- */
          <div
            className="rounded-lg p-4 space-y-3"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-accent) 6%, transparent)",
              border: "1px solid var(--color-accent)",
            }}
          >
            {pendiente.respuestaSugerida ? (
              <div className="space-y-1">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-accent)" }}
                >
                  Respuesta sugerida
                </div>
                <div
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: "var(--color-text)", lineHeight: 1.7 }}
                >
                  {resolverObjeciones(pendiente.respuestaSugerida, objeciones)}
                </div>
                <Btn
                  size="sm"
                  variant="outline"
                  icon={respuestaCopiada ? Check : Copy}
                  ariaLabel="Copiar respuesta sugerida"
                  onClick={() =>
                    copiarRespuesta(
                      resolverObjeciones(pendiente.respuestaSugerida, objeciones)
                    )
                  }
                >
                  {respuestaCopiada ? "Copiada" : "Copiar"}
                </Btn>
              </div>
            ) : null}

            {pendiente.accion ? (
              <div className="space-y-1">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Acción del operador
                </div>
                <div className="text-sm" style={{ color: "var(--color-text)" }}>
                  {pendiente.accion}
                </div>
              </div>
            ) : null}

            {pendiente.datosARegistrar ? (
              <div className="space-y-1">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Datos a registrar
                </div>
                <div className="text-sm" style={{ color: "var(--color-text)" }}>
                  {pendiente.datosARegistrar}
                </div>
              </div>
            ) : null}

            {destinoLabel ? (
              <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Continúa en: {destinoLabel}
              </div>
            ) : null}

            {pendiente.requiereAclaracion ? (
              <Field label="Aclaración del trabajador (obligatoria)">
                <TextInput
                  value={textoAclaracion}
                  onChange={(e) =>
                    setAclaraciones((prev) => ({ ...prev, [clavePend]: e.target.value }))
                  }
                  placeholder="Escriba lo que el trabajador aclara..."
                />
              </Field>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Btn
                onClick={avanzar}
                disabled={bloqueoAclaracion}
                icon={pendiente.finalizaLlamada ? Flag : ChevronRight}
              >
                {pendiente.finalizaLlamada ? "Finalizar llamada" : "Continuar"}
              </Btn>
              <BtnOutline onClick={() => setPendiente(null)}>Cambiar</BtnOutline>
            </div>
          </div>
        )}

        {/* Campos de registro de la etapa (§3) */}
        {campos.length ? (
          <div className="space-y-3">
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-text-muted)" }}
            >
              Registro de la llamada
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {campos.map((c) => (
                <CampoRegistro
                  key={c.id}
                  campo={c}
                  value={registro[c.id]}
                  onChange={(v) => setCampo(c.id, v)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Gate de obligatorios: lista visible y sin escape (§2.1). */}
        {avisoGate && pendientes.length ? (
          <div
            role="alert"
            className="rounded-lg p-3 flex items-start gap-2 text-sm"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
              border: "1px solid var(--color-danger)",
              color: "var(--color-danger)",
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              Complete los campos obligatorios antes de continuar:
              <ul className="mt-1 space-y-0.5 text-[11px]">
                {pendientes.map((nombre) => (
                  <li key={nombre}>• {nombre}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Modal
        key={modalKey}
        isOpen
        onClose={cerrar}
        title={guion.nombre || "Asistente de llamadas"}
        icon={Play}
        size="2xl"
        closeOnOverlayClick={false}
        subheader={subheader}
        footer={footer}
      >
        {cuerpo}
      </Modal>

      {/* Módulos transversales y resumen: SidePanel por encima del Modal. */}
      <PanelObjeciones
        open={panel === "objeciones"}
        onClose={() => setPanel(null)}
        objeciones={objeciones}
        consultadas={consultadas}
        onCopiada={registrarConsultada}
      />
      <PanelResumen
        open={panel === "resumen"}
        onClose={() => setPanel(null)}
        speech={guion}
        registro={registro}
        onChangeCampo={setCampo}
        notas={notas}
        onChangeNotas={setNotas}
        consultadas={consultadas}
        objeciones={objeciones}
        finalizada={finalizada}
        estadoFinalNombre={estadoFinalNombre}
      />

      {/* Estado final configurable por guion (§2.5). */}
      <ConfirmDialog
        open={finalizando}
        title="Finalizar llamada"
        message={
          <div className="space-y-2">
            <p>¿Desea finalizar la llamada? El registro quedará disponible en el resumen.</p>
            {estadosFinales.length ? (
              <Select
                label="Estado final"
                id="estado-final-runner"
                value={estadoFinalSel}
                onChange={(e) => setEstadoFinalSel(e.target.value)}
                placeholder="Sin estado definido"
                options={estadosFinales.map((e) => ({ value: e.id, label: e.nombre }))}
              />
            ) : (
              <p style={{ color: "var(--color-text-muted)" }}>
                Este guion no tiene estados finales configurados.
              </p>
            )}
          </div>
        }
        confirmLabel="Confirmar"
        onConfirm={confirmarFinalizacion}
        onCancel={() => setFinalizando(false)}
      />

      {/* Cierre con datos en curso: el registro NO se guarda al cerrar. */}
      <ConfirmDialog
        open={confirmarCierre}
        title="Cerrar llamada"
        message="Hay datos de esta llamada en curso (registro y notas) que no se guardan al cerrar. ¿Continuar?"
        confirmLabel="Sí, cerrar"
        confirmColor="var(--color-danger)"
        onCancel={cancelarCierre}
        onConfirm={() => {
          setConfirmarCierre(false);
          onClose();
        }}
      />
    </>
  );
}
