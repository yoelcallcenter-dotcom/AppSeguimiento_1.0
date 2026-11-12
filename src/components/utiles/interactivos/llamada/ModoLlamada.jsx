/**
 * ModoLlamada.jsx (Release 1.11.2)
 *
 * Pantalla de ejecución enfocada en la conversación real. Reutiliza el MISMO
 * motor que la Vista rápida (`useSesionLlamada` → `sesionLlamada.js`): no hay
 * una segunda implementación de navegación, gates, asignaciones ni
 * finalización. Lo propio de esta pantalla es la presentación:
 *
 * - overlay de pantalla completa (portal al body) con lectura grande;
 * - breadcrumb del recorrido REAL (etapas visitadas), sin porcentajes que
 *   engañan cuando el guion ramifica;
 * - un toque elige una opción y muestra la respuesta sugerida; "Continuar"
 *   confirma el avance (permite leer antes de hablar);
 * - cambio de respuestas anteriores con análisis de impacto y confirmación
 *   conservadora (los datos escritos a mano nunca se borran);
 * - salida explícita: finalizar, cancelar sin guardar o conservar pendiente.
 *
 * Integración limitada a propósito: al finalizar solo se registra el estado
 * final y el resumen de la sesión. No crea casos ni derivaciones.
 */

import React, { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  Flag,
  LogOut,
  MessageCircle,
  Save,
  X,
} from "lucide-react";
import { Btn } from "../../../common/Btn";
import { BtnOutline } from "../../../common/BtnOutline";
import { Field } from "../../../common/Field";
import { Modal } from "../../../common/Modal";
import { Select } from "../../../common/Select";
import { TextInput } from "../../../common/TextInput";
import { useModal } from "../../../../hooks/useModal";
import { useClipboard } from "../../../../hooks/useClipboard";
import { resolverDestino } from "../interactiveSpeechModel";
import { resolverObjeciones } from "../resolveObjeciones";
import { PanelObjeciones, PanelResumen, CampoRegistro } from "../RunnerPaneles";
import {
  clavePosicion,
  respuestaDe,
} from "./sesionLlamada";
import { useSesionLlamada } from "./useSesionLlamada";
import { PanelInstrucciones } from "./PanelInstrucciones";

const estiloTarjeta = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
};

const estiloPill = (color) => ({
  backgroundColor: `color-mix(in srgb, ${color} 13.3%, transparent)`,
  color,
});

/**
 * Diálogo de salida de 3 caminos. Se arma con Modal (z-submodal 60) para que
 * quede por encima del overlay (z-modal 50) y por debajo de los SidePanel
 * (z-notification 110), y para heredar trampa de foco/Escape.
 */
function DialogoSalida({
  open,
  hayDatos,
  onSeguir,
  onConservar,
  onDescartar,
  onFinalizar,
}) {
  return (
    <Modal
      isOpen={open}
      onClose={onSeguir}
      title="Salir de la llamada"
      icon={LogOut}
      size="md"
      zIndex="z-submodal"
      footer={
        <>
          <BtnOutline onClick={onSeguir}>Seguir en la llamada</BtnOutline>
          <BtnOutline
            onClick={onDescartar}
            style={{ color: "var(--color-danger)" }}
          >
            Cancelar sin guardar
          </BtnOutline>
          <Btn onClick={onConservar} icon={Save}>
            Conservar y salir
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm" style={{ color: "var(--color-text)" }}>
        <p>
          {hayDatos
            ? "La llamada tiene datos cargados. Elegí cómo querés salir:"
            : "Todavía no hay datos en esta llamada. Podés cerrarla o seguir."}
        </p>
        {hayDatos ? (
          <ul className="space-y-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <li>
              • <strong>Conservar y salir</strong>: queda como llamada pendiente para
              retomarla desde la biblioteca.
            </li>
            <li>
              • <strong>Cancelar sin guardar</strong>: se descarta la llamada y sus
              datos.
            </li>
            <li>
              • <strong>Finalizar llamada</strong>: elegís el estado final y se cierra
              la llamada.
            </li>
          </ul>
        ) : null}
        <div className="pt-1">
          <BtnOutline icon={Flag} size="sm" onClick={onFinalizar}>
            Finalizar llamada
          </BtnOutline>
        </div>
      </div>
    </Modal>
  );
}

export function ModoLlamada({
  speech,
  objeciones = [],
  sesionInicial = null,
  avisoGuionCambiado = false,
  onGuardar,
  onDescartar,
  onClose,
}) {
  const {
    guion,
    steps,
    errores,
    paso,
    pasoIdx,
    pregunta,
    opciones,
    campos,
    estadosFinales,
    pendiente,
    pendientes,
    clavePend,
    textoAclaracion,
    bloqueoAclaracion,
    camino,
    indice,
    puedeAtras,
    tocada,
    pos,
    enFin,
    respuestas,
    registro,
    consultadas,
    notas,
    finalizada,
    estadoFinalNombre,
    avanzar: avanzarSesion,
    atras: atrasSesion,
    elegir,
    cambiar,
    setCampo,
    setAclaracion,
    setNotas,
    registrarConsultada,
    finalizar,
    analizarCambio,
    aplicarCambio,
  } = useSesionLlamada({ speech, sesionInicial, onCambio: onGuardar });

  const titleId = useId();
  const { dialogRef } = useModal({
    isOpen: true,
    // El overlay no se cierra con clic afuera (evita pérdidas accidentales):
    // toda salida pasa por el diálogo de 3 opciones.
    closeOnOverlayClick: false,
    onEscape: () => pedirSalida(),
  });

  const { copiar: copiarSpeech, copiado: speechCopiado } = useClipboard();
  const { copiar: copiarRespuesta, copiado: respuestaCopiada } = useClipboard();

  // --- Estado SOLO de presentación -----------------------------------------
  const [panel, setPanel] = useState(null); // instrucciones | objeciones | resumen
  const [avisoGate, setAvisoGate] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [estadoFinalSel, setEstadoFinalSel] = useState("");
  const [cambioPendiente, setCambioPendiente] = useState(null);
  const [avisoCambioVisible, setAvisoCambioVisible] = useState(
    Boolean(avisoGuionCambiado)
  );

  // "Datos en curso" = algo que se perdería al cancelar sin guardar. No se
  // incluye la mera posición del recorrido: abrir y salir sin tocar nada no
  // debe asustar al operador.
  const hayDatos =
    Boolean(tocada) ||
    Object.keys(registro || {}).length > 0 ||
    Boolean(notas) ||
    (consultadas || []).length > 0;

  // --- Derivados ------------------------------------------------------------
  const sinPasos = steps.length === 0;
  const bloquedaPorErrores = errores.length > 0;

  // Breadcrumb: etapas realmente visitadas, sin repetir (los bucles no inflan
  // el recorrido) y en el orden en que se visitaron.
  const recorrido = useMemo(() => {
    const visitadas = [];
    const hasta = Math.max(0, (indice ?? 0) + 1);
    (Array.isArray(camino) ? camino : []).slice(0, hasta).forEach((p) => {
      if (!p?.pasoId || visitadas.some((v) => v.id === p.pasoId)) return;
      const idx = steps.findIndex((s) => s && s.id === p.pasoId);
      if (idx === -1) return;
      visitadas.push({ id: p.pasoId, titulo: steps[idx].titulo || "(sin título)", orden: idx });
    });
    return visitadas;
  }, [camino, indice, steps]);

  const nombreCampo = useMemo(() => {
    const mapa = {};
    steps.forEach((s) => {
      (Array.isArray(s?.camposRegistro) ? s.camposRegistro : []).forEach((c) => {
        if (c?.id) mapa[c.id] = c.nombre || c.id;
      });
    });
    return mapa;
  }, [steps]);

  const destinoLabel = useMemo(() => {
    if (!paso || !pendiente) return "";
    const destino = resolverDestino(guion, paso.id, pos.preguntaIdx, pendiente);
    if (destino.fin) return "Fin del recorrido";
    const idx = steps.findIndex((s) => s && s.id === destino.stepId);
    if (idx === -1) return "Fin del recorrido";
    const titulo = steps[idx].titulo || "sin título";
    return destino.preguntaIdx > 0
      ? `Etapa ${idx + 1} · ${titulo} (pregunta ${destino.preguntaIdx + 1})`
      : `Etapa ${idx + 1} · ${titulo}`;
  }, [guion, paso, pendiente, pos.preguntaIdx, steps]);

  // --- Navegación -----------------------------------------------------------

  const manejarEvento = (evento) => {
    if (!evento) return;
    if (evento.tipo === "gate") {
      setAvisoGate(true);
      return;
    }
    if (evento.tipo === "finaliza") {
      setPanel(null);
      setEstadoFinalSel(evento.estadoFinalId || "");
      setFinalizando(true);
      return;
    }
    setAvisoGate(false);
  };

  /**
   * Continuar: si se está cambiando una respuesta YA confirmada, primero se
   * muestra el impacto (respuestas posteriores, datos automáticos/manuales) y
   * se aplica solo con confirmación. Si no, avanza normal.
   */
  const continuar = () => {
    if (!paso || bloqueoAclaracion) return;
    const anterior = respuestaDe({ respuestas }, paso.id, pos.preguntaIdx);
    if (pendiente && anterior && anterior.opcionId !== pendiente.id) {
      const clave = clavePosicion(paso.id, pos.preguntaIdx);
      const analisis = analizarCambio(clave, pendiente.id);
      if (analisis.valido) {
        setCambioPendiente({ clave, opcionId: pendiente.id, analisis });
        return;
      }
    }
    manejarEvento(avanzarSesion());
  };

  const confirmarCambio = () => {
    if (!cambioPendiente) return;
    const { clave, opcionId } = cambioPendiente;
    setCambioPendiente(null);
    manejarEvento(aplicarCambio(clave, opcionId));
  };

  const pedirSalida = () => {
    // Una llamada ya finalizada no tiene nada que perder: se cierra directo.
    if (finalizada) {
      onClose?.();
      return;
    }
    setSaliendo(true);
  };

  const abrirFinalizar = () => {
    setPanel(null);
    setEstadoFinalSel("");
    setFinalizando(true);
  };

  const confirmarFinalizar = () => {
    finalizar(estadoFinalSel);
    setFinalizando(false);
    setAvisoGate(false);
  };

  // --- Render ---------------------------------------------------------------

  // Acción principal del pie. Los estados "finalizada" y "fin del recorrido"
  // ya tienen sus acciones en el centro (y duplicarlas dejaría dos botones con
  // el mismo nombre accesible en pantalla), así que acá solo va el paso vivo.
  const botonAccion = (() => {
    if (finalizada || enFin || !paso) return null;
    if (pendiente) {
      return (
        <Btn
          onClick={continuar}
          disabled={bloqueoAclaracion}
          icon={pendiente.finalizaLlamada ? Flag : ChevronRight}
        >
          {pendiente.finalizaLlamada ? "Finalizar llamada" : "Continuar"}
        </Btn>
      );
    }
    if (opciones.length) {
      return (
        <Btn disabled icon={ChevronRight}>
          Elegí una opción
        </Btn>
      );
    }
    return (
      <Btn onClick={() => manejarEvento(avanzarSesion())} icon={ChevronRight}>
        Siguiente
      </Btn>
    );
  })();

  let cuerpo;

  if (bloquedaPorErrores) {
    cuerpo = (
      <div
        className="rounded-lg p-4 flex items-start gap-2 text-sm"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
          border: "1px solid var(--color-danger)",
          color: "var(--color-danger)",
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Este speech tiene errores y no puede ejecutarse en Modo llamada.
          <ul className="mt-1 space-y-0.5 text-[11px]">
            {errores.map((err) => (
              <li key={err}>• {err}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  } else if (finalizada) {
    cuerpo = (
      <div className="text-center space-y-4 py-10">
        <div
          className="text-xl font-bold"
          style={{ color: "var(--color-success)" }}
        >
          Llamada finalizada
        </div>
        {estadoFinalNombre ? (
          <div
            className="inline-block pill-sm font-bold"
            style={estiloPill("var(--color-success)")}
          >
            Estado: {estadoFinalNombre}
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Sin estado final seleccionado.
          </div>
        )}
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          El resumen de la llamada queda disponible hasta cerrar esta pantalla.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <BtnOutline
            icon={ClipboardList}
            onClick={() => setPanel("resumen")}
            ariaLabel="Ver resumen"
          >
            Ver resumen
          </BtnOutline>
          <Btn icon={Check} onClick={() => onClose?.()}>
            Cerrar llamada
          </Btn>
        </div>
      </div>
    );
  } else if (sinPasos) {
    cuerpo = (
      <div
        className="text-sm py-10 text-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        Este speech no tiene etapas.
      </div>
    );
  } else if (enFin || !paso) {
    cuerpo = (
      <div className="text-center space-y-4 py-10">
        <div className="text-xl font-bold" style={{ color: "var(--color-success)" }}>
          Fin del recorrido
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Se llegó al final del guion. Revisá el resumen y finalizá la llamada con
          el estado que corresponda.
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
        </div>
      </div>
    );
  } else {
    cuerpo = (
      <div className="space-y-4">
        {avisoCambioVisible ? (
          <div
            className="rounded-lg p-3 flex items-start justify-between gap-2 text-xs"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-warning) 6.7%, transparent)",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
            }}
          >
            <div>
              El guion cambió desde que empezó esta llamada. Revisá las etapas antes
              de continuar.
            </div>
            <button
              type="button"
              aria-label="Ocultar aviso de guion cambiado"
              onClick={() => setAvisoCambioVisible(false)}
              className="p-1 rounded hover:bg-white/5"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {/* Speech de la etapa: el centro de lectura de la pantalla. */}
        <section className="rounded-xl p-4 sm:p-5 space-y-3" style={estiloTarjeta}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-accent)" }}
              >
                Etapa {pasoIdx + 1} de {steps.length}
                {paso.titulo ? ` · ${paso.titulo}` : ""}
              </div>
              {paso.objetivo ? (
                <div
                  className="mt-1 text-xs italic"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Objetivo: {paso.objetivo}
                </div>
              ) : null}
            </div>
            <Btn
              size="sm"
              variant="outline"
              icon={speechCopiado ? Check : Copy}
              ariaLabel="Copiar speech de la etapa"
              onClick={() =>
                copiarSpeech(resolverObjeciones(paso.contenido || "", objeciones))
              }
            >
              {speechCopiado ? "Copiado" : "Copiar"}
            </Btn>
          </div>
          <div
            className="text-[15px] sm:text-base whitespace-pre-wrap"
            style={{ color: "var(--color-text)", lineHeight: 1.8 }}
          >
            {resolverObjeciones(paso.contenido || "", objeciones)}
          </div>
        </section>

        {pregunta?.texto ? (
          <div
            className="rounded-lg px-4 py-3 text-sm font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-accent) 6%, transparent)",
              borderLeft: "3px solid var(--color-accent)",
              color: "var(--color-text)",
            }}
          >
            {resolverObjeciones(pregunta.texto, objeciones)}
          </div>
        ) : null}

        {!pendiente ? (
          opciones.length ? (
            <div className="space-y-2">
              {opciones.map((op, i) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => elegir(op.id)}
                  className="w-full text-left px-3 py-3 rounded-lg text-sm font-semibold transition-colors hover:opacity-80 flex items-center gap-3"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
                    border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)",
                  }}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                    style={{
                      backgroundColor: "var(--color-accent)",
                      color: "var(--color-text-on-accent)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1">{op.texto || "(sin texto)"}</span>
                  <ChevronRight size={16} style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          ) : null
        ) : (
          <div
            className="rounded-xl p-4 space-y-3"
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
                  className="text-[15px] whitespace-pre-wrap"
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
                  onChange={(e) => setAclaracion(clavePend, e.target.value)}
                  placeholder="Escriba lo que el trabajador aclara..."
                />
              </Field>
            ) : null}

            {/* La acción Continuar/Finalizar vive en el pie fijo para que esté
                siempre visible sin duplicar el mismo nombre accesible. */}
            <div className="flex flex-wrap gap-2">
              <BtnOutline onClick={cambiar} icon={ArrowLeft}>
                Cambiar
              </BtnOutline>
            </div>
          </div>
        )}

        {campos.length ? (
          <section className="space-y-3">
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
          </section>
        ) : null}

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
              Complete los datos obligatorios antes de continuar:
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

  // `puedeAtras` viene del hook (misma regla que la Vista rápida): hay pasos
  // anteriores o se está en la pantalla virtual de fin.

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-modal flex flex-col"
      style={{ backgroundColor: "var(--color-bg)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Cabecera fija: identidad del speech, posición y accesos. */}
      <header
        className="flex-shrink-0 border-b"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="px-3 sm:px-5 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={pedirSalida}
            aria-label="Salir del modo llamada"
            title="Salir"
            className="p-1.5 rounded hover:bg-white/5 transition-colors flex-shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-accent)" }}
            >
              Modo llamada
            </div>
            <h1
              id={titleId}
              className="text-base font-bold truncate"
              style={{ color: "var(--color-text)" }}
            >
              {guion.nombre || "Asistente de llamadas"}
            </h1>
          </div>
          {paso ? (
            <span
              className="pill-sm font-bold hidden sm:inline-flex"
              style={estiloPill("var(--color-accent)")}
            >
              {`Etapa ${pasoIdx + 1} de ${steps.length} del guion`}
            </span>
          ) : null}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <BtnOutline
              size="sm"
              icon={BookOpen}
              onClick={() => setPanel("instrucciones")}
              ariaLabel="Abrir instrucciones"
            >
              <span className="hidden md:inline">Instrucciones</span>
            </BtnOutline>
            <BtnOutline
              size="sm"
              icon={MessageCircle}
              onClick={() => setPanel("objeciones")}
              ariaLabel="Abrir objeciones"
            >
              <span className="hidden md:inline">Objeciones</span>
            </BtnOutline>
            <BtnOutline
              size="sm"
              icon={ClipboardList}
              onClick={() => setPanel("resumen")}
              ariaLabel="Abrir resumen"
            >
              <span className="hidden md:inline">Resumen</span>
            </BtnOutline>
          </div>
        </div>

        {/* Breadcrumb del recorrido real (etapas visitadas). */}
        {recorrido.length ? (
          <div className="px-3 sm:px-5 pb-2 flex items-center gap-1.5 overflow-x-auto">
            {recorrido.map((v, i) => {
              const activa = !enFin && !finalizada && paso?.id === v.id;
              return (
                <React.Fragment key={v.id}>
                  {i > 0 ? (
                    <ChevronRight
                      size={12}
                      style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
                    />
                  ) : null}
                  <span
                    className="pill-sm whitespace-nowrap font-semibold"
                    style={
                      activa
                        ? { backgroundColor: "var(--color-accent)", color: "var(--color-text-on-accent)" }
                        : {
                            backgroundColor:
                              "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                            color: "var(--color-text-muted)",
                          }
                    }
                  >
                    {v.orden + 1}. {v.titulo}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-3 sm:p-6">{cuerpo}</div>
      </main>

      {/* Pie fijo: navegación del recorrido y acción principal. */}
      <footer
        className="flex-shrink-0 border-t"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-2.5 flex items-center gap-2">
          <BtnOutline
            onClick={() => {
              atrasSesion();
              setAvisoGate(false);
            }}
            icon={ArrowLeft}
            size="sm"
            disabled={!puedeAtras || finalizada}
          >
            Atrás
          </BtnOutline>
          <div
            className="flex-1 text-center text-[11px] hidden sm:block"
            style={{ color: "var(--color-text-muted)" }}
          >
            {finalizada
              ? "Llamada finalizada"
              : enFin
              ? "Fin del recorrido"
              : `${recorrido.length} etapa(s) visitada(s)`}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {!finalizada && !enFin && paso ? (
              <BtnOutline icon={Flag} size="sm" onClick={abrirFinalizar}>
                Finalizar
              </BtnOutline>
            ) : null}
            {botonAccion}
          </div>
        </div>
      </footer>

      {/* Paneles de apoyo (SidePanel, por encima del overlay). */}
      <PanelInstrucciones
        open={panel === "instrucciones"}
        onClose={() => setPanel(null)}
        speech={guion}
        paso={paso}
        opciones={opciones}
      />
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

      {/* Salida de 3 caminos: nunca se pierde una llamada sin decisión. */}
      <DialogoSalida
        open={saliendo}
        hayDatos={hayDatos}
        onSeguir={() => setSaliendo(false)}
        onConservar={() => {
          setSaliendo(false);
          onClose?.();
        }}
        onDescartar={() => {
          setSaliendo(false);
          onDescartar?.();
          onClose?.();
        }}
        onFinalizar={() => {
          setSaliendo(false);
          abrirFinalizar();
        }}
      />

      {/* Revisión y confirmación del estado final (no se auto-confirma). */}
      <Modal
        isOpen={finalizando}
        onClose={() => setFinalizando(false)}
        title="Finalizar llamada"
        icon={Flag}
        size="md"
        zIndex="z-submodal"
        footer={
          <>
            <BtnOutline onClick={() => setFinalizando(false)}>Cancelar</BtnOutline>
            <Btn
              onClick={confirmarFinalizar}
              icon={Flag}
              disabled={estadosFinales.length > 0 && !estadoFinalSel}
            >
              Finalizar llamada
            </Btn>
          </>
        }
      >
        <div className="space-y-3 text-sm" style={{ color: "var(--color-text)" }}>
          <p>Revisá el resumen antes de confirmar. La llamada quedará finalizada.</p>
          {estadosFinales.length ? (
            <Select
              label="Estado final"
              id="estado-final-modo-llamada"
              value={estadoFinalSel}
              onChange={(e) => setEstadoFinalSel(e.target.value)}
              placeholder="Seleccione el estado final"
              options={estadosFinales.map((e) => ({ value: e.id, label: e.nombre }))}
            />
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>
              Este guion no tiene estados finales configurados.
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Confirmá que el trabajador aceptó el estado registrado. No se marca una
            derivación como confirmada sin su aceptación.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <BtnOutline
              size="sm"
              icon={ClipboardList}
              onClick={() => {
                setFinalizando(false);
                setPanel("resumen");
              }}
            >
              Revisar resumen
            </BtnOutline>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {registro && Object.keys(registro).length} dato(s) ·{" "}
              {(consultadas || []).length} objeción(es) consultada(s)
            </span>
          </div>
        </div>
      </Modal>

      {/* Cambio de una respuesta anterior: impacto visible antes de aplicar. */}
      <Modal
        isOpen={Boolean(cambioPendiente)}
        onClose={() => setCambioPendiente(null)}
        title="Cambiar respuesta"
        icon={AlertTriangle}
        size="md"
        zIndex="z-submodal"
        footer={
          <>
            <BtnOutline onClick={() => setCambioPendiente(null)}>Cancelar</BtnOutline>
            <Btn onClick={confirmarCambio}>Cambiar respuesta</Btn>
          </>
        }
      >
        {cambioPendiente ? (
          <div className="space-y-3 text-sm" style={{ color: "var(--color-text)" }}>
            <p>
              Ya respondiste esta pregunta. Al cambiar la respuesta se recalcula el
              recorrido posterior:
            </p>
            <ul className="space-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {cambioPendiente.analisis.respuestasDescartadas > 0 ? (
                <li>
                  • Se descartarán{" "}
                  <strong>{cambioPendiente.analisis.respuestasDescartadas}</strong>{" "}
                  respuesta(s) posterior(es).
                </li>
              ) : null}
              {cambioPendiente.analisis.camposAuto.length > 0 ? (
                <li>
                  • Se limpiarán{" "}
                  <strong>{cambioPendiente.analisis.camposAuto.length}</strong> dato(s)
                  completados automáticamente:{" "}
                  {cambioPendiente.analisis.camposAuto
                    .map((id) => nombreCampo[id] || id)
                    .join(", ")}
                  .
                </li>
              ) : null}
              {cambioPendiente.analisis.camposManual.length > 0 ? (
                <li>
                  • Se conservarán{" "}
                  <strong>{cambioPendiente.analisis.camposManual.length}</strong> dato(s)
                  escritos a mano:{" "}
                  {cambioPendiente.analisis.camposManual
                    .map((id) => nombreCampo[id] || id)
                    .join(", ")}
                  .
                </li>
              ) : null}
              {cambioPendiente.analisis.respuestasDescartadas === 0 &&
              cambioPendiente.analisis.camposAuto.length === 0 ? (
                <li>
                  • No hay respuestas ni datos posteriores que descartar; solo cambia
                  el camino a seguir.
                </li>
              ) : null}
            </ul>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Los datos que escribiste a mano nunca se borran automáticamente.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>,
    document.body
  );
}

export default ModoLlamada;
