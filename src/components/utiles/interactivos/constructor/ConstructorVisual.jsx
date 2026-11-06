import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Plus,
  Redo2,
  Undo2,
  Play,
} from "lucide-react";
import { Btn } from "../../../common/Btn";
import { BtnOutline } from "../../../common/BtnOutline";
import { Select } from "../../../common/Select";
import { ConfirmDialog } from "../../../common/ConfirmDialog";
import {
  normalizarSpeech,
  diagnosticosSpeech,
  referenciasA,
  eliminarPaso,
  eliminarPregunta,
  eliminarOpcion,
  eliminarEstadoFinal,
  agregarPaso,
  actualizarOpcion,
} from "../interactiveSpeechModel";
import {
  construirGrafo,
  posicionesConLayout,
  layoutAutomatico,
  conPosicionNodo,
  conLayoutCompleto,
  nodoPorClave,
  esNodoDestino,
  calcularVistaAjustada,
  centrarVistaEnNodo,
  CLAVE_FIN,
  claveEtapa,
} from "./grafoSpeech";
import { useHistorialSpeech } from "./historialSpeech";
import { LienzoFlujo } from "./LienzoFlujo";
import { PanelPropiedades } from "./PanelPropiedades";
import { PanelValidacion } from "./PanelValidacion";
import { SpeechRunner } from "../SpeechRunner";

/**
 * ConstructorVisual.jsx (Release 1.11.1)
 *
 * Novena sección del editor: un lienzo del MISMO guion (etapas/preguntas/
 * opciones). No hay un segundo modelo ni un editor paralelo:
 * - Toda edición llama a los mutadores de `interactiveSpeechModel` y sube por
 *   `onChange`, igual que el editor tradicional (guardado automático).
 * - `speech.layout` guarda solo posiciones (cosmético, opcional).
 * - Los borradores no se bloquean: los errores se muestran y se navegan.
 * - Deshacer/rehacer es local a esta sesión (ver historialSpeech.js).
 *
 * Vista previa: reutiliza `SpeechRunner` con `modo="preview"` sobre el borrador
 * vivo; no persiste nada ni toca el registro de llamadas real.
 */

const MENSAJE_CONFIRMAR = {
  etapa: "Eliminar etapa",
  pregunta: "Eliminar pregunta",
  opcion: "Eliminar respuesta",
  estado: "Eliminar finalización",
};

export function ConstructorVisual({
  speech,
  onChange,
  objeciones = [],
  showToast,
  onVolverAlEditor,
}) {
  const guion = useMemo(() => normalizarSpeech(speech) || {}, [speech]);
  const grafo = useMemo(() => construirGrafo(guion), [guion]);
  const posicionesBase = useMemo(
    () => posicionesConLayout(grafo, guion.layout),
    [grafo, guion.layout]
  );
  const diagnosticos = useMemo(
    () => diagnosticosSpeech(guion, objeciones),
    [guion, objeciones]
  );

  const { aplicar, deshacer, rehacer, puedeDeshacer, puedeRehacer } =
    useHistorialSpeech(guion, onChange);

  const [seleccionKey, setSeleccionKey] = useState(null);
  const [conectando, setConectando] = useState(null);
  const [vista, setVista] = useState({ x: 40, y: 40, zoom: 0.8 });
  const [confirmacion, setConfirmacion] = useState(null);
  const [destinoReemplazo, setDestinoReemplazo] = useState("__quitar__");
  const [preview, setPreview] = useState(false);
  const lienzoRef = useRef(null);
  const ajustadoRef = useRef(false);

  const medidas = useCallback(() => {
    const rect = lienzoRef.current?.getBoundingClientRect?.();
    return {
      ancho: rect?.width > 0 ? rect.width : 1200,
      alto: rect?.height > 0 ? rect.height : 700,
    };
  }, []);

  // Primer encuadre: solo la primera vez que se monta la sección. No se repite
  // al editar porque el usuario puede haber hecho pan/zoom a propósito.
  useEffect(() => {
    if (ajustadoRef.current) return;
    ajustadoRef.current = true;
    const { ancho, alto } = medidas();
    setVista(calcularVistaAjustada(posicionesBase, grafo, ancho, alto));
  }, [grafo, posicionesBase, medidas]);

  // Al cambiar de guion (o desmontar), se limpia la selección de otro guion.
  useEffect(() => {
    setSeleccionKey(null);
    setConectando(null);
    setPreview(false);
  }, [guion.id]);

  const diagnosticosPorNodo = useMemo(() => {
    const mapa = {};
    diagnosticos.forEach((d) => {
      const key = d.nodoKey || (d.stepId ? claveEtapa(d.stepId) : null);
      if (!key) return;
      if (!mapa[key]) mapa[key] = { errores: [], advertencias: [] };
      const lista =
        d.severidad === "error" ? mapa[key].errores : mapa[key].advertencias;
      lista.push(d.mensaje);
    });
    return mapa;
  }, [diagnosticos]);

  const nodo = nodoPorClave(grafo, seleccionKey);

  const avisar = (mensaje) => {
    if (mensaje && showToast) showToast(mensaje, "success");
  };

  const enfocarNodo = (key) => {
    setSeleccionKey(key);
    const objetivo = nodoPorClave(grafo, key);
    if (!objetivo) return;
    const { ancho, alto } = medidas();
    setVista((v) => centrarVistaEnNodo(posicionesBase, objetivo, v, ancho, alto));
  };

  const irADiagnostico = (diagnostico) => {
    const key =
      diagnostico.nodoKey || (diagnostico.stepId ? claveEtapa(diagnostico.stepId) : null);
    if (key) enfocarNodo(key);
  };

  const handleVista = (nueva) => {
    if (nueva?.ajustar) {
      const { ancho, alto } = medidas();
      setVista(calcularVistaAjustada(posicionesBase, grafo, ancho, alto));
      return;
    }
    setVista(nueva);
  };

  const seleccionarNodo = (nodoDestino) => {
    if (conectando && esNodoDestino(nodoDestino)) {
      conectarA(nodoDestino);
      return;
    }
    setSeleccionKey(nodoDestino.key);
    if (conectando) setConectando(null);
  };

  const iniciarConexion = (nodoOrigen, salida) => {
    if (!salida?.opcionId) return;
    setSeleccionKey(nodoOrigen.key);
    setConectando((actual) =>
      actual?.opcionId === salida.opcionId
        ? null
        : {
            desdeKey: nodoOrigen.key,
            stepId: nodoOrigen.stepId,
            preguntaId: nodoOrigen.preguntaId,
            opcionId: salida.opcionId,
          }
    );
  };

  const conectarA = (nodoDestino) => {
    if (!conectando?.opcionId) return;
    let cambios;
    if (nodoDestino.tipo === "final") {
      cambios = {
        finalizaLlamada: true,
        estadoFinalId: nodoDestino.estadoFinalId || null,
        targetStepId: null,
      };
    } else if (nodoDestino.tipo === "fin") {
      cambios = { finalizaLlamada: false, targetStepId: null };
    } else {
      cambios = {
        finalizaLlamada: false,
        targetStepId: nodoDestino.stepId || null,
      };
    }
    aplicar(
      actualizarOpcion(guion, conectando.stepId, conectando.opcionId, cambios),
      null
    );
    setConectando(null);
    avisar("Conexión actualizada");
  };

  const desconectar = (nodoOrigen, salida) => {
    if (!salida?.opcionId) return;
    aplicar(
      actualizarOpcion(guion, nodoOrigen.stepId, salida.opcionId, {
        targetStepId: null,
        finalizaLlamada: false,
        estadoFinalId: null,
      }),
      null
    );
    if (conectando?.opcionId === salida.opcionId) setConectando(null);
    avisar("Conexión eliminada");
  };

  const moverNodo = (key, posicion) => {
    aplicar(conPosicionNodo(guion, key, posicion), null);
  };

  const autoOrganizar = () => {
    aplicar(conLayoutCompleto(guion, layoutAutomatico(grafo)), "layout");
    avisar("Diagrama reorganizado");
  };

  const nuevaEtapa = () => {
    const nuevo = agregarPaso(guion);
    const etapa = nuevo.steps[nuevo.steps.length - 1];
    aplicar(nuevo, null);
    if (etapa) setSeleccionKey(claveEtapa(etapa.id));
    avisar("Etapa agregada");
  };

  const pedirEliminar = (solicitud) => {
    if (solicitud.tipo === "etapa") {
      const refs = referenciasA(guion, solicitud.paso.id);
      setDestinoReemplazo("__quitar__");
      setConfirmacion({ ...solicitud, refs });
      return;
    }
    setConfirmacion(solicitud);
  };

  const confirmarEliminacion = () => {
    if (!confirmacion) return;
    let nuevo = guion;
    let mensaje = "";
    if (confirmacion.tipo === "etapa") {
      nuevo = eliminarPaso(
        guion,
        confirmacion.paso.id,
        destinoReemplazo === "__quitar__" ? null : destinoReemplazo
      );
      mensaje = "Etapa eliminada";
      setSeleccionKey("inicio");
    } else if (confirmacion.tipo === "pregunta") {
      nuevo = eliminarPregunta(
        guion,
        confirmacion.paso.id,
        confirmacion.pregunta.id
      );
      mensaje = "Pregunta eliminada";
      setSeleccionKey(claveEtapa(confirmacion.paso.id));
    } else if (confirmacion.tipo === "opcion") {
      nuevo = eliminarOpcion(
        guion,
        confirmacion.paso.id,
        confirmacion.opcion.id
      );
      mensaje = "Respuesta eliminada";
    } else if (confirmacion.tipo === "estado") {
      nuevo = eliminarEstadoFinal(guion, confirmacion.estado.id);
      mensaje = "Finalización eliminada";
      setSeleccionKey(CLAVE_FIN);
    }
    setConfirmacion(null);
    aplicar(nuevo, null);
    avisar(mensaje);
  };

  const opcionesReemplazo = useMemo(
    () => [
      { value: "__quitar__", label: "Quitar la conexión (avance automático)" },
      ...(guion.steps || [])
        .filter((s) => s.id !== confirmacion?.paso?.id)
        .map((s, i) => ({ value: s.id, label: s.titulo || `Etapa ${i + 1}` })),
    ],
    [guion.steps, confirmacion]
  );

  const mensajeConfirmacion = () => {
    if (!confirmacion) return "";
    if (confirmacion.tipo === "etapa") {
      const refs = confirmacion.refs?.length || 0;
      return (
        <div className="space-y-2">
          <p>
            ¿Eliminar la etapa{" "}
            <b>&quot;{confirmacion.paso.titulo || "(sin título)"}&quot;</b>
            {refs > 0
              ? ` y sus ${confirmacion.paso.preguntas?.length || 0} pregunta(s)?`
              : "?"}
          </p>
          {refs > 0 ? (
            <>
              <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {refs} respuesta(s) de otras etapas apuntan a esta. Elegí qué
                hacer con esas conexiones:
              </p>
              <Select
                label="Nuevo destino de las referencias"
                value={destinoReemplazo}
                onChange={(e) => setDestinoReemplazo(e.target.value)}
                options={opcionesReemplazo}
                aria-label="Nuevo destino de las referencias"
              />
            </>
          ) : null}
        </div>
      );
    }
    if (confirmacion.tipo === "pregunta") {
      return (
        <p>
          ¿Eliminar la pregunta{" "}
          <b>&quot;{confirmacion.pregunta.texto || "(sin texto)"}&quot;</b> y sus{" "}
          {confirmacion.pregunta.opciones?.length || 0} respuesta(s)?
        </p>
      );
    }
    if (confirmacion.tipo === "opcion") {
      return (
        <p>
          ¿Eliminar la respuesta{" "}
          <b>&quot;{confirmacion.opcion.texto || "(sin texto)"}&quot;</b>?
        </p>
      );
    }
    return (
      <p>
        ¿Eliminar la finalización{" "}
        <b>&quot;{confirmacion.estado.nombre || "(sin nombre)"}&quot;</b>?{" "}
        {confirmacion.refs
          ? `${confirmacion.refs} respuesta(s) dejarán de finalizar con este estado.`
          : ""}
      </p>
    );
  };

  const barra = (
    <div className="flex flex-wrap items-center gap-1.5">
      <BtnOutline
        size="sm"
        icon={LayoutDashboard}
        onClick={autoOrganizar}
        ariaLabel="Auto-organizar"
      >
        Auto-organizar
      </BtnOutline>
      <BtnOutline size="sm" icon={Plus} onClick={nuevaEtapa}>
        Nueva etapa
      </BtnOutline>
      <BtnOutline
        size="sm"
        icon={Undo2}
        onClick={deshacer}
        disabled={!puedeDeshacer}
        ariaLabel="Deshacer"
        title="Deshacer el último cambio del constructor"
      >
        Deshacer
      </BtnOutline>
      <BtnOutline
        size="sm"
        icon={Redo2}
        onClick={rehacer}
        disabled={!puedeRehacer}
        ariaLabel="Rehacer"
        title="Rehacer el cambio deshecho"
      >
        Rehacer
      </BtnOutline>
      <Btn
        size="sm"
        icon={Play}
        onClick={() => setPreview(true)}
        ariaLabel="Probar recorrido"
      >
        Probar recorrido
      </Btn>
      <span
        className="ml-auto text-[10px]"
        style={{ color: "var(--color-text-muted)" }}
      >
        {grafo.nodos.length} nodos · {diagnosticos.filter((d) => d.severidad === "error").length}{" "}
        error(es)
      </span>
      {onVolverAlEditor ? (
        <BtnOutline size="sm" onClick={onVolverAlEditor}>
          Editor tradicional
        </BtnOutline>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-2">
      {barra}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 items-start">
        <div ref={lienzoRef}>
          <LienzoFlujo
            grafo={grafo}
            posiciones={posicionesBase}
            vista={vista}
            seleccion={nodo}
            conectando={conectando}
            diagnosticosPorNodo={diagnosticosPorNodo}
            onSeleccionarNodo={seleccionarNodo}
            onFondo={() => {
              setSeleccionKey(null);
              setConectando(null);
            }}
            onMoverNodo={moverNodo}
            onVista={handleVista}
            onPuerto={iniciarConexion}
            onDesconectar={desconectar}
            onCancelarConexion={() => setConectando(null)}
          />
        </div>

        <div className="space-y-2">
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <PanelPropiedades
              speech={guion}
              nodo={nodo}
              diagnostico={
                nodo ? diagnosticosPorNodo[nodo.key] || null : null
              }
              onAplicar={aplicar}
              onSeleccionarKey={enfocarNodo}
              onPedirEliminar={pedirEliminar}
              onEjecutarPreview={() => setPreview(true)}
            />
          </div>

          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <PanelValidacion
              diagnosticos={diagnosticos}
              onIrANodo={irADiagnostico}
              onEjecutarPreview={() => setPreview(true)}
              puedeEjecutar={
                diagnosticos.filter((d) => d.severidad === "error").length === 0
              }
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmacion !== null}
        title={confirmacion ? MENSAJE_CONFIRMAR[confirmacion.tipo] : "Eliminar"}
        message={mensajeConfirmacion()}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onConfirm={confirmarEliminacion}
        onCancel={() => setConfirmacion(null)}
      />

      {preview ? (
        <SpeechRunner
          speech={guion}
          objeciones={objeciones}
          modo="preview"
          onClose={() => setPreview(false)}
        />
      ) : null}
    </div>
  );
}
