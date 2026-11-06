import React, { useMemo, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { NodoFlujo } from "./NodoFlujo";
import {
  ALTO_CABECERA_NODO,
  ALTO_NODO,
  ALTO_PUERTO,
  ANCHO_NODO,
  altoNodo,
  esNodoDestino,
} from "./grafoSpeech";

/**
 * LienzoFlujo.jsx (Release 1.11.1)
 *
 * Lienzo propio con SVG + divs, sin librerías de diagramas. Por qué:
 * - El proyecto no tiene dependencias de grafos y sumar una (react-flow/dagre)
 *   sería desproporcionado para ~30 nodos estáticos.
 * - Las aristas se calculan a partir de las MISMAS posiciones que los nodos,
 *   así que mover una tarjeta reacomoda las líneas sin medición del DOM
 *   (importante para jsdom y para el zoom).
 *
 * Interacciones: arrastrar el fondo = pan; arrastrar la cabecera de un nodo =
 * mover; rueda no (evita secuestrar el scroll del editor), zoom con botones.
 * El puerto de cada respuesta inicia una conexión; el panel de propiedades
 * permite el mismo cambio con un select accesible.
 */

const clampZoom = (z) => Math.min(2, Math.max(0.25, Math.round(z * 100) / 100));
const truncarEtiqueta = (texto, max = 22) => {
  const limpio = String(texto || "").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
};

/**
 * Punto de salida/entrada de una arista. Exportado para poder testear la
 * geometría sin montar el SVG (jsdom no mide).
 */
export function puntosDeArista(arista, nodosPorClave, posiciones) {
  const desde = nodosPorClave.get(arista.desde);
  const hasta = nodosPorClave.get(arista.hasta);
  const pd = posiciones[arista.desde];
  const ph = posiciones[arista.hasta];
  if (!desde || !hasta || !pd || !ph) return null;

  const indicePuerto = arista.puertoId
    ? (desde.salidas || []).findIndex((s) => s.opcionId === arista.puertoId)
    : -1;
  const yPuerto =
    indicePuerto >= 0
      ? pd.y + ALTO_NODO + indicePuerto * ALTO_PUERTO + ALTO_PUERTO / 2
      : pd.y + ALTO_CABECERA_NODO / 2;

  return {
    x1: pd.x + ANCHO_NODO,
    y1: yPuerto,
    x2: ph.x,
    y2: ph.y + ALTO_CABECERA_NODO / 2,
    conPuerto: indicePuerto >= 0,
  };
}

export function caminoDeArista(puntos) {
  if (!puntos) return "";
  const { x1, y1, x2, y2 } = puntos;
  const curvatura = Math.max(36, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + curvatura} ${y1}, ${x2 - curvatura} ${y2}, ${x2} ${y2}`;
}

export function LienzoFlujo({
  grafo,
  posiciones,
  vista,
  seleccion = null,
  conectando = null,
  diagnosticosPorNodo = {},
  onSeleccionarNodo,
  onFondo,
  onMoverNodo,
  onVista,
  onPuerto,
  onDesconectar,
  onCancelarConexion,
}) {
  const nodos = Array.isArray(grafo?.nodos) ? grafo.nodos : [];
  const aristas = Array.isArray(grafo?.aristas) ? grafo.aristas : [];
  const [arrastre, setArrastre] = useState(null);
  const [pan, setPan] = useState(null);

  const nodosPorClave = useMemo(
    () => new Map(nodos.map((n) => [n.key, n])),
    [nodos]
  );

  const posicionesEfectivas = useMemo(
    () =>
      arrastre
        ? { ...posiciones, [arrastre.clave]: arrastre.pos }
        : posiciones || {},
    [posiciones, arrastre]
  );

  const tamanoMundo = useMemo(() => {
    let ancho = 1600;
    let alto = 1000;
    Object.values(posicionesEfectivas).forEach((p) => {
      ancho = Math.max(ancho, (p?.x || 0) + ANCHO_NODO + 320);
      alto = Math.max(alto, (p?.y || 0) + ALTO_NODO + 240);
    });
    return { ancho, alto };
  }, [posicionesEfectivas]);

  const iniciarPan = (e) => {
    if (e.button === 1 || e.button === 2) return;
    setPan({ x0: e.clientX, y0: e.clientY, vista0: vista });
    e.currentTarget?.setPointerCapture?.(e.pointerId);
  };

  const iniciarMover = (nodo, e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const pos = posicionesEfectivas[nodo.key];
    if (!pos) return;
    e.preventDefault?.();
    e.currentTarget?.setPointerCapture?.(e.pointerId);
    setArrastre({
      clave: nodo.key,
      x0: e.clientX,
      y0: e.clientY,
      pos0: { ...pos },
      pos: { ...pos },
      movido: false,
    });
  };

  const alMover = (e) => {
    if (arrastre) {
      const zoom = vista?.zoom || 1;
      const dx = (e.clientX - arrastre.x0) / zoom;
      const dy = (e.clientY - arrastre.y0) / zoom;
      const pos = {
        x: Math.round(arrastre.pos0.x + dx),
        y: Math.round(arrastre.pos0.y + dy),
      };
      setArrastre({
        ...arrastre,
        pos,
        movido:
          arrastre.movido || Math.abs(pos.x - arrastre.pos0.x) > 2 || Math.abs(pos.y - arrastre.pos0.y) > 2,
      });
      return;
    }
    if (pan) {
      onVista &&
        onVista({
          ...pan.vista0,
          x: pan.vista0.x + (e.clientX - pan.x0),
          y: pan.vista0.y + (e.clientY - pan.y0),
        });
    }
  };

  const alSoltar = () => {
    // Un clic sin movimiento no ensucia el layout con un paso de historial.
    if (arrastre?.movido && onMoverNodo) onMoverNodo(arrastre.clave, arrastre.pos);
    setArrastre(null);
    setPan(null);
  };

  const cambiarZoom = (delta) => {
    if (!onVista) return;
    const zoom = clampZoom((vista?.zoom || 1) + delta);
    onVista({ ...(vista || { x: 0, y: 0 }), zoom });
  };

  const seleccionKey = seleccion?.key || null;
  const opcionConectando = conectando?.opcionId || null;

  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        height: "clamp(420px, 62vh, 720px)",
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        touchAction: "none",
      }}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerLeave={arrastre || pan ? alSoltar : undefined}
      aria-label="Lienzo del constructor visual"
      role="application"
    >
      {/* Fondo: pan y deselección. Va debajo del mundo (pointer-events none). */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--color-border) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          cursor: pan ? "grabbing" : "grab",
        }}
        onPointerDown={iniciarPan}
        onClick={() => onFondo && onFondo()}
      />

      <div
        className="absolute top-0 left-0"
        style={{
          width: tamanoMundo.ancho,
          height: tamanoMundo.alto,
          transform: `translate(${vista?.x || 0}px, ${vista?.y || 0}px) scale(${
            vista?.zoom || 1
          })`,
          transformOrigin: "0 0",
          pointerEvents: "none",
        }}
      >
        <svg
          width={tamanoMundo.ancho}
          height={tamanoMundo.alto}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="flecha-flujo"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-text-muted)" />
            </marker>
            <marker
              id="flecha-flujo-activa"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-accent)" />
            </marker>
          </defs>
          {aristas.map((arista) => {
            const puntos = puntosDeArista(arista, nodosPorClave, posicionesEfectivas);
            if (!puntos) return null;
            const activa =
              seleccionKey &&
              (arista.desde === seleccionKey || arista.hasta === seleccionKey);
            const color = activa
              ? "var(--color-accent)"
              : arista.tipo === "final"
              ? "var(--color-success)"
              : "var(--color-text-muted)";
            return (
              <g key={arista.id} data-arista={arista.id}>
                <path
                  d={caminoDeArista(puntos)}
                  fill="none"
                  stroke={color}
                  strokeWidth={activa ? 2.4 : 1.4}
                  strokeDasharray={arista.tipo === "lineal" ? "4 3" : undefined}
                  markerEnd={`url(#${
                    activa ? "flecha-flujo-activa" : "flecha-flujo"
                  })`}
                  opacity={activa ? 1 : 0.72}
                >
                  <title>{`${arista.etiqueta || "Conexión"} → ${
                    nodosPorClave.get(arista.hasta)?.titulo || arista.hasta
                  }`}</title>
                </path>
                {puntos.conPuerto ? (
                  <text
                    x={(puntos.x1 + puntos.x2) / 2}
                    y={(puntos.y1 + puntos.y2) / 2 - 5}
                    textAnchor="middle"
                    fontSize="9"
                    fill={color}
                    style={{ pointerEvents: "none" }}
                  >
                    {truncarEtiqueta(arista.etiqueta)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {nodos.map((nodo) => (
          <div
            key={nodo.key}
            style={{ position: "absolute", pointerEvents: "auto", left: 0, top: 0 }}
          >
            <NodoFlujo
              nodo={nodo}
              posicion={posicionesEfectivas[nodo.key]}
              seleccionado={seleccionKey === nodo.key}
              esOrigenConexion={
                Boolean(conectando) && conectando.desdeKey === nodo.key
              }
              esDestinoConexion={
                Boolean(conectando) &&
                conectando.desdeKey !== nodo.key &&
                esNodoDestino(nodo)
              }
              opcionConectando={opcionConectando}
              diagnostico={diagnosticosPorNodo[nodo.key] || null}
              onSeleccionar={onSeleccionarNodo}
              onPuerto={onPuerto}
              onDesconectar={onDesconectar}
              onMoverInicio={iniciarMover}
            />
          </div>
        ))}
      </div>

      {nodos.length === 0 ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          El guion todavía no tiene nodos.
        </div>
      ) : null}

      {conectando ? (
        <div
          role="status"
          className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px]"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-accent)",
            color: "var(--color-text)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            maxWidth: "90%",
          }}
        >
          <span>
            Elegí una etapa, finalización o el Fin del guion como destino…
          </span>
          <button
            type="button"
            className="btn-base btn-sm"
            onClick={onCancelarConexion}
            style={{ color: "var(--color-text-muted)" }}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {/* Controles de zoom: no dependen de la rueda ni de medidas del DOM. */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        <button
          type="button"
          aria-label="Alejar"
          title="Alejar"
          className="btn-base btn-sm"
          onClick={() => cambiarZoom(-0.15)}
        >
          <Minus size={12} />
        </button>
        <span
          className="text-[10px] tabular-nums px-1"
          style={{ color: "var(--color-text-muted)", minWidth: 38, textAlign: "center" }}
        >
          {Math.round((vista?.zoom || 1) * 100)}%
        </span>
        <button
          type="button"
          aria-label="Acercar"
          title="Acercar"
          className="btn-base btn-sm"
          onClick={() => cambiarZoom(0.15)}
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          aria-label="Ajustar vista"
          title="Ajustar todo el diagrama"
          className="btn-base btn-sm"
          onClick={() => onVista && onVista({ ajustar: true })}
        >
          <Maximize size={12} />
        </button>
      </div>
    </div>
  );
}
