import React from "react";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Flag,
  Play,
  Plus,
  Trash2,
  GitBranch,
} from "lucide-react";
import { Btn } from "../../../common/Btn";
import { BtnOutline } from "../../../common/BtnOutline";
import { TextInput } from "../../../common/TextInput";
import { TextArea } from "../../../common/TextArea";
import { Select } from "../../../common/Select";
import { Toggle } from "../../../common/Toggle";
import {
  actualizarPaso,
  actualizarPregunta,
  actualizarOpcion,
  actualizarEstadoFinal,
  agregarPregunta,
  moverPregunta,
  duplicarPregunta,
  agregarOpcion,
  moverOpcion,
  duplicarOpcion,
  duplicarPaso,
  marcarInicio,
  agregarEstadoFinal,
} from "../interactiveSpeechModel";
import { TIPO_NODO, claveFinal } from "./grafoSpeech";

/**
 * PanelPropiedades.jsx (Release 1.11.1)
 *
 * Inspector adaptado por tipo de nodo. Regla de producto: el panel muestra
 * SOLO lo que se edita en ese nodo; las opciones (puertos) se despliegan
 * dentro de su pregunta y los datos de registro quedan en la sección
 * tradicional para no duplicar formularios gigantes.
 *
 * Todo cambio vuelve al modelo con los mutadores de 1.11.0 (nada de estado
 * paralelo) y pasa por `onAplicar`, que registra el paso de deshacer.
 */

const ETIQUETAS_TIPO = {
  [TIPO_NODO.INICIO]: "Inicio",
  [TIPO_NODO.ETAPA]: "Etapa",
  [TIPO_NODO.PREGUNTA]: "Pregunta",
  [TIPO_NODO.DECISION]: "Decisión",
  [TIPO_NODO.FINAL]: "Finalización",
  [TIPO_NODO.FIN]: "Fin del guion",
};

function Banda({ children, color = "var(--color-border)" }) {
  return (
    <div
      className="text-[11px] rounded p-2"
      style={{
        border: `1px solid ${color}`,
        backgroundColor: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
        color: "var(--color-text)",
      }}
    >
      {children}
    </div>
  );
}

function Acciones({ children }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function PanelPropiedades({
  speech,
  nodo,
  diagnostico = null,
  onAplicar,
  onSeleccionarKey,
  onPedirEliminar,
  onEjecutarPreview,
}) {
  const steps = Array.isArray(speech?.steps) ? speech.steps : [];
  const estados = Array.isArray(speech?.estadosFinales)
    ? speech.estadosFinales
    : [];
  const modulos = Array.isArray(speech?.modulos) ? speech.modulos : [];

  if (!nodo) {
    return (
      <div className="space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Propiedades
        </div>
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Seleccioná un nodo del lienzo para editarlo. Arrastrá su cabecera para
          moverlo y el fondo para desplazar la vista.
        </p>
        <Banda>
          <div className="font-semibold mb-1">Cómo leer el diagrama</div>
          <ul className="space-y-0.5 text-[10px]">
            <li>• Inicio → etapa inicial del guion.</li>
            <li>• Etapa → contenido del speech; entra a su primera pregunta.</li>
            <li>• Pregunta/Decisión → cada respuesta es un puerto de salida.</li>
            <li>• Finalización → estado final; Fin → cierre sin estado.</li>
            <li>• Línea punteada → avance automático (sin destino).</li>
          </ul>
        </Banda>
        <Banda color="var(--color-accent)">
          <div className="font-semibold">
            {steps.length} etapa(s) · {estados.length} finalización(es)
          </div>
          <div className="text-[10px] mt-0.5">
            El constructor edita el mismo guion que el editor tradicional.
          </div>
        </Banda>
        {onEjecutarPreview ? (
          <BtnOutline
            size="sm"
            icon={Play}
            onClick={onEjecutarPreview}
            className="w-full justify-center"
          >
            Probar recorrido
          </BtnOutline>
        ) : null}
      </div>
    );
  }

  const paso = nodo.stepId ? steps.find((s) => s.id === nodo.stepId) : null;
  const preguntas = paso && Array.isArray(paso.preguntas) ? paso.preguntas : [];
  const pregunta = nodo.preguntaId
    ? preguntas.find((pr) => pr.id === nodo.preguntaId)
    : null;
  const clave = (sufijo) => `campo:${nodo.key}:${sufijo}`;

  const encabezado = (
    <div className="flex items-center gap-2">
      <span
        className="pill-sm font-bold"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
          color: "var(--color-accent)",
        }}
      >
        {ETIQUETAS_TIPO[nodo.tipo] || "Nodo"}
      </span>
      {nodo.entradas === 0 && nodo.tipo !== TIPO_NODO.INICIO ? (
        <span className="text-[10px]" style={{ color: "var(--color-warning)" }}>
          sin entradas
        </span>
      ) : null}
    </div>
  );

  const diagnosticosDelNodo = (
    <>
      {diagnostico?.errores?.length ? (
        <div
          className="rounded p-2 text-[10px] space-y-0.5"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
            border: "1px solid var(--color-danger)",
            color: "var(--color-danger)",
          }}
        >
          {diagnostico.errores.map((m, i) => (
            <div key={`e${i}`}>• {m}</div>
          ))}
        </div>
      ) : null}
      {diagnostico?.advertencias?.length ? (
        <div
          className="rounded p-2 text-[10px] space-y-0.5"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-warning) 6.7%, transparent)",
            border: "1px solid var(--color-warning)",
            color: "var(--color-warning)",
          }}
        >
          {diagnostico.advertencias.map((m, i) => (
            <div key={`a${i}`}>• {m}</div>
          ))}
        </div>
      ) : null}
    </>
  );

  // --- Inicio -------------------------------------------------------------
  if (nodo.tipo === TIPO_NODO.INICIO) {
    const opcionesSteps = steps.map((s, i) => ({
      value: s.id,
      label: s.titulo || `Etapa ${i + 1}`,
    }));
    return (
      <div className="space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Inicio
        </div>
        {encabezado}
        {diagnosticosDelNodo}
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          El recorrido siempre empieza en la etapa marcada como INICIO.
        </p>
        {steps.length ? (
          <Select
            label="Etapa inicial"
            value={speech.startStepId || ""}
            onChange={(e) =>
              onAplicar(marcarInicio(speech, e.target.value), "inicio")
            }
            options={opcionesSteps}
            placeholder="Elegir etapa inicial"
          />
        ) : (
          <Banda color="var(--color-danger)">
            El guion no tiene etapas. Creá una desde la barra del constructor.
          </Banda>
        )}
        {nodo.stepId ? (
          <BtnOutline
            size="sm"
            icon={GitBranch}
            onClick={() => onSeleccionarKey(`etapa:${nodo.stepId}`)}
            className="w-full justify-center"
          >
            Ir a la etapa inicial
          </BtnOutline>
        ) : null}
      </div>
    );
  }

  // --- Etapa --------------------------------------------------------------
  if (nodo.tipo === TIPO_NODO.ETAPA && paso) {
    const esInicio = speech.startStepId === paso.id;
    return (
      <div className="space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Etapa
        </div>
        {encabezado}
        {diagnosticosDelNodo}
        <TextInput
          value={paso.titulo || ""}
          onChange={(e) =>
            onAplicar(
              actualizarPaso(speech, paso.id, { titulo: e.target.value }),
              clave("titulo")
            )
          }
          placeholder="Título del paso"
          aria-label="Título del paso"
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="constructor-contenido-etapa"
            className="text-xs font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            Speech de la etapa
          </label>
          <TextArea
            id="constructor-contenido-etapa"
            value={paso.contenido || ""}
            onChange={(e) =>
              onAplicar(
                actualizarPaso(speech, paso.id, { contenido: e.target.value }),
                clave("contenido")
              )
            }
            placeholder="Contenido del paso"
            aria-label="Contenido del paso"
            rows={5}
          />
        </div>
        <TextInput
          value={paso.objetivo || ""}
          onChange={(e) =>
            onAplicar(
              actualizarPaso(speech, paso.id, { objetivo: e.target.value }),
              clave("objetivo")
            )
          }
          placeholder="Objetivo de la etapa (opcional)"
          aria-label="Objetivo de la etapa"
        />
        <Banda>
          <div>
            {preguntas.length} pregunta(s) ·{" "}
            {(Array.isArray(paso.camposRegistro) ? paso.camposRegistro : []).length}{" "}
            campo(s) de registro
          </div>
          {esInicio ? (
            <div className="text-[10px] mt-0.5" style={{ color: "var(--color-success)" }}>
              Esta etapa es el INICIO del guion.
            </div>
          ) : null}
        </Banda>
        <Acciones>
          <Btn
            size="sm"
            icon={Plus}
            onClick={() => {
              const nuevo = agregarPregunta(speech, paso.id, "");
              const pasoNuevo = nuevo.steps.find((s) => s.id === paso.id);
              const nueva = pasoNuevo?.preguntas?.[pasoNuevo.preguntas.length - 1];
              onAplicar(nuevo, null);
              if (nueva) onSeleccionarKey(`pregunta:${nueva.id}`);
            }}
          >
            Agregar pregunta
          </Btn>
          <BtnOutline
            size="sm"
            icon={Flag}
            disabled={esInicio}
            onClick={() => onAplicar(marcarInicio(speech, paso.id), "inicio")}
          >
            Marcar como INICIO
          </BtnOutline>
          <BtnOutline
            size="sm"
            icon={Copy}
            onClick={() => {
              const nuevo = duplicarPaso(speech, paso.id);
              const indice = speech.steps.findIndex((s) => s.id === paso.id);
              const copia = nuevo.steps[indice + 1];
              onAplicar(nuevo, null);
              if (copia) onSeleccionarKey(`etapa:${copia.id}`);
            }}
          >
            Duplicar etapa
          </BtnOutline>
          <BtnOutline
            size="sm"
            icon={Trash2}
            onClick={() => onPedirEliminar({ tipo: "etapa", paso })}
          >
            Eliminar etapa
          </BtnOutline>
        </Acciones>
      </div>
    );
  }

  // --- Pregunta / Decisión ------------------------------------------------
  if (
    (nodo.tipo === TIPO_NODO.PREGUNTA || nodo.tipo === TIPO_NODO.DECISION) &&
    paso &&
    pregunta
  ) {
    const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
    const indicePregunta = preguntas.findIndex((pr) => pr.id === pregunta.id);
    return (
      <div className="space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          {nodo.tipo === TIPO_NODO.DECISION ? "Decisión" : "Pregunta"}
        </div>
        {encabezado}
        {diagnosticosDelNodo}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="constructor-texto-pregunta"
            className="text-xs font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            Texto de la pregunta
          </label>
          <TextArea
            id="constructor-texto-pregunta"
            value={pregunta.texto || ""}
            onChange={(e) =>
              onAplicar(
                actualizarPregunta(speech, paso.id, pregunta.id, {
                  texto: e.target.value,
                }),
                clave("texto")
              )
            }
            placeholder="¿Qué le preguntás al trabajador?"
            aria-label="Texto de la pregunta"
            rows={2}
          />
        </div>
        <Toggle
          checked={Boolean(pregunta.obligatoria)}
          onChange={(v) =>
            onAplicar(
              actualizarPregunta(speech, paso.id, pregunta.id, {
                obligatoria: v,
              }),
              "obligatoria"
            )
          }
          label="Pregunta obligatoria"
          aria-label="Pregunta obligatoria"
        />
        <Banda>
          Destino si no hay respuestas:{" "}
          <b>{nodo.siguienteKey === "fin" ? "Fin del guion" : "siguiente pregunta / etapa"}</b>
        </Banda>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Respuestas ({opciones.length})
            </span>
            <Btn
              size="sm"
              icon={Plus}
              onClick={() =>
                onAplicar(agregarOpcion(speech, paso.id, "", pregunta.id), null)
              }
            >
              Agregar respuesta
            </Btn>
          </div>

          {opciones.map((op, i) => {
            const destinoEtapa = steps.find((s) => s.id === op.targetStepId);
            const estado = estados.find((e) => e.id === op.estadoFinalId);
            return (
              <div
                key={op.id}
                className="rounded-lg p-2 space-y-1.5"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-1">
                  <span
                    className="pill-sm font-bold"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
                      color: "var(--color-accent)",
                    }}
                  >
                    R{i + 1}
                  </span>
                  <span
                    className="text-[10px] truncate"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {op.finalizaLlamada
                      ? `finaliza${estado ? `: ${estado.nombre}` : ""}`
                      : destinoEtapa
                      ? `→ ${destinoEtapa.titulo || "(sin título)"}`
                      : "→ siguiente"}
                  </span>
                </div>
                <TextInput
                  value={op.texto || ""}
                  onChange={(e) =>
                    onAplicar(
                      actualizarOpcion(speech, paso.id, op.id, {
                        texto: e.target.value,
                      }),
                      `campo:${op.id}:texto`
                    )
                  }
                  placeholder="Texto de la respuesta"
                  aria-label={`Respuesta ${i + 1}`}
                />
                <Select
                  label="Destino"
                  value={op.finalizaLlamada ? "" : op.targetStepId || ""}
                  onChange={(e) =>
                    onAplicar(
                      actualizarOpcion(speech, paso.id, op.id, {
                        targetStepId: e.target.value,
                      }),
                      null
                    )
                  }
                  placeholder="Siguiente (automático)"
                  options={steps.map((s, k) => ({
                    value: s.id,
                    label: s.titulo || `Etapa ${k + 1}`,
                  }))}
                  disabled={op.finalizaLlamada}
                  aria-label={`Destino de la respuesta ${i + 1}`}
                />
                <Toggle
                  checked={Boolean(op.finalizaLlamada)}
                  onChange={(v) =>
                    onAplicar(
                      actualizarOpcion(speech, paso.id, op.id, {
                        finalizaLlamada: v,
                      }),
                      null
                    )
                  }
                  label="Finaliza la llamada"
                  aria-label={`Finaliza la respuesta ${i + 1}`}
                />
                {op.finalizaLlamada ? (
                  <Select
                    label="Estado final"
                    value={op.estadoFinalId || ""}
                    onChange={(e) =>
                      onAplicar(
                        actualizarOpcion(speech, paso.id, op.id, {
                          estadoFinalId: e.target.value,
                        }),
                        null
                      )
                    }
                    placeholder="Sin estado definido"
                    options={estados.map((e) => ({ value: e.id, label: e.nombre }))}
                    aria-label={`Estado final de la respuesta ${i + 1}`}
                  />
                ) : null}
                <TextArea
                  value={op.respuestaSugerida || ""}
                  onChange={(e) =>
                    onAplicar(
                      actualizarOpcion(speech, paso.id, op.id, {
                        respuestaSugerida: e.target.value,
                      }),
                      `campo:${op.id}:respuesta`
                    )
                  }
                  placeholder="Respuesta sugerida (opcional)"
                  aria-label={`Respuesta sugerida ${i + 1}`}
                  rows={2}
                />
                <TextInput
                  value={op.accion || ""}
                  onChange={(e) =>
                    onAplicar(
                      actualizarOpcion(speech, paso.id, op.id, {
                        accion: e.target.value,
                      }),
                      `campo:${op.id}:accion`
                    )
                  }
                  placeholder="Acción del operador (opcional)"
                  aria-label={`Acción de la respuesta ${i + 1}`}
                />
                {modulos.length ? (
                  <Select
                    label="Módulo asociado"
                    value={op.moduloId || ""}
                    onChange={(e) =>
                      onAplicar(
                        actualizarOpcion(speech, paso.id, op.id, {
                          moduloId: e.target.value,
                        }),
                        null
                      )
                    }
                    placeholder="Ninguno"
                    options={modulos.map((m) => ({ value: m.id, label: m.titulo }))}
                    aria-label={`Módulo de la respuesta ${i + 1}`}
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-1">
                  <BtnOutline
                    size="sm"
                    icon={ArrowUp}
                    disabled={i === 0}
                    onClick={() =>
                      onAplicar(moverOpcion(speech, paso.id, op.id, -1), null)
                    }
                    ariaLabel={`Subir respuesta ${i + 1}`}
                  />
                  <BtnOutline
                    size="sm"
                    icon={ArrowDown}
                    disabled={i === opciones.length - 1}
                    onClick={() =>
                      onAplicar(moverOpcion(speech, paso.id, op.id, 1), null)
                    }
                    ariaLabel={`Bajar respuesta ${i + 1}`}
                  />
                  <BtnOutline
                    size="sm"
                    icon={Copy}
                    onClick={() =>
                      onAplicar(duplicarOpcion(speech, paso.id, op.id), null)
                    }
                    ariaLabel={`Duplicar respuesta ${i + 1}`}
                  />
                  <BtnOutline
                    size="sm"
                    icon={Trash2}
                    onClick={() =>
                      onPedirEliminar({
                        tipo: "opcion",
                        paso,
                        opcion: op,
                        indice: i,
                      })
                    }
                    ariaLabel={`Eliminar respuesta ${i + 1}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Banda>
          Los datos a registrar por respuesta se editan en{" "}
          <b>Opciones</b> del editor tradicional.
        </Banda>

        <Acciones>
          <BtnOutline
            size="sm"
            icon={ArrowUp}
            disabled={indicePregunta <= 0}
            onClick={() =>
              onAplicar(
                moverPregunta(speech, paso.id, pregunta.id, -1),
                null
              )
            }
            ariaLabel="Subir pregunta"
          />
          <BtnOutline
            size="sm"
            icon={ArrowDown}
            disabled={indicePregunta >= preguntas.length - 1}
            onClick={() =>
              onAplicar(moverPregunta(speech, paso.id, pregunta.id, 1), null)
            }
            ariaLabel="Bajar pregunta"
          />
          <BtnOutline
            size="sm"
            icon={Copy}
            onClick={() => {
              const nuevo = duplicarPregunta(speech, paso.id, pregunta.id);
              const pasoNuevo = nuevo.steps.find((s) => s.id === paso.id);
              const copia = pasoNuevo?.preguntas?.[indicePregunta + 1];
              onAplicar(nuevo, null);
              if (copia) onSeleccionarKey(`pregunta:${copia.id}`);
            }}
          >
            Duplicar pregunta
          </BtnOutline>
          <BtnOutline
            size="sm"
            icon={Trash2}
            onClick={() =>
              onPedirEliminar({ tipo: "pregunta", paso, pregunta })
            }
          >
            Eliminar pregunta
          </BtnOutline>
        </Acciones>
      </div>
    );
  }

  // --- Finalización -------------------------------------------------------
  if (nodo.tipo === TIPO_NODO.FINAL) {
    const estado = estados.find((e) => e.id === nodo.estadoFinalId);
    const usos = steps.reduce(
      (n, s) =>
        n +
        (Array.isArray(s.preguntas) ? s.preguntas : []).reduce(
          (m, pr) =>
            m +
            (Array.isArray(pr.opciones) ? pr.opciones : []).filter(
              (op) =>
                op.finalizaLlamada && op.estadoFinalId === nodo.estadoFinalId
            ).length,
          0
        ),
      0
    );
    return (
      <div className="space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Finalización
        </div>
        {encabezado}
        {diagnosticosDelNodo}
        {estado ? (
          <TextInput
            value={estado.nombre || ""}
            onChange={(e) =>
              onAplicar(
                actualizarEstadoFinal(speech, estado.id, {
                  nombre: e.target.value,
                }),
                clave("nombre")
              )
            }
            placeholder="Nombre del estado final"
            aria-label="Nombre del estado final"
          />
        ) : null}
        <Banda>
          {usos} respuesta(s) terminan la llamada con este estado.
          {usos === 0 ? " Todavía no está conectado a ninguna respuesta." : ""}
        </Banda>
        <BtnOutline
          size="sm"
          icon={Trash2}
          onClick={() => {
            const refs = steps.reduce(
              (n, s) =>
                n +
                (Array.isArray(s.preguntas) ? s.preguntas : []).reduce(
                  (m, pr) =>
                    m +
                    (Array.isArray(pr.opciones) ? pr.opciones : []).filter(
                      (op) =>
                        op.finalizaLlamada &&
                        op.estadoFinalId === nodo.estadoFinalId
                    ).length,
                  0
                ),
              0
            );
            onPedirEliminar({ tipo: "estado", estado, refs });
          }}
        >
          Eliminar finalización
        </BtnOutline>
      </div>
    );
  }

  // --- Fin del guion ------------------------------------------------------
  if (nodo.tipo === TIPO_NODO.FIN) {
    return (
      <div className="space-y-3">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Fin del guion
        </div>
        {encabezado}
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          Es el cierre natural cuando una respuesta no define destino ni
          finalización. No se conecta a mano: quitale el destino a una respuesta
          o dejá que la última etapa avance sola.
        </p>
        <Banda>
          Para un cierre explícito, creá una finalización y conectá una respuesta
          a ella.
        </Banda>
        <Btn
          size="sm"
          icon={Flag}
          onClick={() => {
            const nuevo = agregarEstadoFinal(speech, "Nuevo estado");
            const estado = nuevo.estadosFinales[nuevo.estadosFinales.length - 1];
            onAplicar(nuevo, null);
            if (estado) onSeleccionarKey(claveFinal(estado.id));
          }}
        >
          Agregar finalización
        </Btn>
      </div>
    );
  }

  // Fallback (nodo de un tipo desconocido o dato corrupto).
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
        Propiedades
      </div>
      <Banda color="var(--color-warning)">
        Este nodo no tiene propiedades editables en el constructor.
      </Banda>
    </div>
  );
}
