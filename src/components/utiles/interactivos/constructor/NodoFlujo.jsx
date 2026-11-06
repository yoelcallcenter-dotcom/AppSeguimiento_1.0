import React from "react";
import { Flag, GitBranch, GitFork, Link2, MessageSquare, Play, Unlink } from "lucide-react";
import { ANCHO_NODO, TIPO_NODO, etiquetaTipoNodo } from "./grafoSpeech";

/**
 * NodoFlujo.jsx (Release 1.11.1)
 *
 * Tarjeta de un nodo del constructor visual. Las OPCIONES no son nodos: se
 * dibujan como puertos de salida dentro de la pregunta/decisión, con badges
 * para respuesta sugerida, acción y finalización. Así el guion ART se lee con
 * ~30 tarjetas en lugar de ~90.
 *
 * Accesibilidad: la cabecera es un <button> (seleccionar / elegir destino) y
 * cada puerto es un <button> aparte. Nunca se anidan botones.
 */

const COLOR_TIPO = {
  [TIPO_NODO.INICIO]: "var(--color-accent)",
  [TIPO_NODO.ETAPA]: "var(--color-accent)",
  [TIPO_NODO.PREGUNTA]: "var(--color-text-muted)",
  [TIPO_NODO.DECISION]: "var(--color-warning)",
  [TIPO_NODO.FINAL]: "var(--color-success)",
  [TIPO_NODO.FIN]: "var(--color-text-muted)",
};

function IconoTipo({ tipo }) {
  const props = { size: 12, style: { flexShrink: 0 } };
  if (tipo === TIPO_NODO.INICIO) return <Play {...props} />;
  if (tipo === TIPO_NODO.ETAPA) return <GitBranch {...props} />;
  if (tipo === TIPO_NODO.DECISION) return <GitFork {...props} />;
  if (tipo === TIPO_NODO.PREGUNTA) return <MessageSquare {...props} />;
  if (tipo === TIPO_NODO.FINAL) return <Flag {...props} />;
  return <Flag {...props} />;
}

export function NodoFlujo({
  nodo,
  posicion,
  seleccionado = false,
  esDestinoConexion = false,
  esOrigenConexion = false,
  opcionConectando = null,
  diagnostico = null,
  onSeleccionar,
  onPuerto,
  onDesconectar,
  onMoverInicio,
}) {
  const errores = diagnostico?.errores?.length || 0;
  const advertencias = diagnostico?.advertencias?.length || 0;
  const color = COLOR_TIPO[nodo.tipo] || "var(--color-text-muted)";
  const borde = esDestinoConexion
    ? "var(--color-accent)"
    : seleccionado
    ? "var(--color-accent)"
    : errores
    ? "var(--color-danger)"
    : "var(--color-border)";

  const etiquetaSeleccion = esDestinoConexion
    ? `Conectar con ${nodo.titulo}`
    : `Seleccionar nodo ${etiquetaTipoNodo(nodo.tipo)}: ${nodo.titulo}`;

  return (
    <div
      className="absolute rounded-lg"
      data-nodo={nodo.key}
      style={{
        left: posicion?.x || 0,
        top: posicion?.y || 0,
        width: ANCHO_NODO,
        backgroundColor: "var(--color-surface)",
        border: `2px solid ${borde}`,
        boxShadow: seleccionado
          ? "0 6px 18px color-mix(in srgb, var(--color-accent) 22%, transparent)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        opacity: esOrigenConexion ? 0.92 : 1,
        zIndex: seleccionado ? 2 : 1,
      }}
    >
      <button
        type="button"
        aria-label={etiquetaSeleccion}
        onClick={(e) => {
          e.stopPropagation();
          onSeleccionar && onSeleccionar(nodo);
        }}
        onPointerDown={(e) => onMoverInicio && onMoverInicio(nodo, e)}
        className="w-full text-left rounded-t-lg"
        style={{
          cursor: onMoverInicio ? "grab" : "pointer",
          backgroundColor: "transparent",
          border: "none",
          padding: "8px 10px 6px",
        }}
      >
        <div className="flex items-center gap-1.5" style={{ color }}>
          <IconoTipo tipo={nodo.tipo} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {etiquetaTipoNodo(nodo.tipo)}
          </span>
          {errores > 0 ? (
            <span
              className="ml-auto pill-sm font-bold"
              title={`${errores} error(es) de validación`}
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-danger) 13.3%, transparent)",
                color: "var(--color-danger)",
              }}
            >
              {errores}!
            </span>
          ) : null}
          {advertencias > 0 ? (
            <span
              className={`${errores > 0 ? "" : "ml-auto"} pill-sm font-bold`}
              title={`${advertencias} advertencia(s)`}
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--color-warning) 13.3%, transparent)",
                color: "var(--color-warning)",
              }}
            >
              {advertencias}⚠
            </span>
          ) : null}
          {nodo.tipo === TIPO_NODO.ETAPA && nodo.entradas === 0 && !errores ? (
            <span
              className="ml-auto pill-sm"
              style={{ color: "var(--color-text-muted)" }}
              title="Sin conexiones de entrada"
            >
              huérfano
            </span>
          ) : null}
        </div>
        <div
          className="text-xs font-semibold mt-0.5"
          style={{
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {nodo.titulo}
        </div>
        <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {nodo.subtitulo}
        </div>
      </button>

      {nodo.resumen ? (
        <div
          className="text-[10px] px-2.5 pb-1.5"
          style={{
            color: "var(--color-text-muted)",
            lineHeight: 1.45,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {nodo.resumen}
        </div>
      ) : null}

      {Array.isArray(nodo.salidas) && nodo.salidas.length ? (
        <div
          className="px-1.5 pb-1.5 space-y-1"
          style={{ borderTop: "1px solid var(--color-border)", paddingTop: 4 }}
        >
          {nodo.salidas.map((salida, i) => {
            const activa = Boolean(
              esOrigenConexion &&
                opcionConectando &&
                salida.opcionId === opcionConectando
            );
            return (
              <div key={salida.opcionId || i} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Conectar respuesta ${i + 1}: ${salida.texto}`}
                  title={`${salida.texto} → ${
                    salida.destinoLabel || "Siguiente"
                  }${salida.respuestaSugerida ? " · con respuesta sugerida" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPuerto && onPuerto(nodo, salida);
                  }}
                  className="flex-1 min-w-0 text-left rounded"
                  style={{
                    border: `1px solid ${
                      activa ? "var(--color-accent)" : "var(--color-border)"
                    }`,
                    backgroundColor: activa
                      ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                      : "var(--color-bg)",
                    padding: "3px 5px",
                    cursor: "pointer",
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Link2
                      size={10}
                      style={{ flexShrink: 0, color: "var(--color-accent)" }}
                    />
                    <span
                      className="text-[10px] font-medium truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {salida.texto}
                    </span>
                  </div>
                  <div
                    className="text-[9px] truncate pl-3.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    → {salida.destinoLabel || "Siguiente"}
                    {salida.finalizaLlamada ? " · finaliza" : ""}
                    {salida.respuestaSugerida ? " · respuesta" : ""}
                    {salida.accion ? " · acción" : ""}
                  </div>
                </button>
                {onDesconectar &&
                (salida.targetStepId ||
                  salida.finalizaLlamada ||
                  salida.estadoFinalId) ? (
                  <button
                    type="button"
                    aria-label={`Desconectar respuesta ${i + 1}`}
                    title="Quitar la conexión de esta respuesta"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDesconectar(nodo, salida);
                    }}
                    className="btn-base btn-sm"
                    style={{
                      padding: "2px 3px",
                      color: "var(--color-text-muted)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Unlink size={10} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : nodo.tipo === TIPO_NODO.PREGUNTA || nodo.tipo === TIPO_NODO.DECISION ? (
        <div
          className="text-[9px] px-2.5 py-1"
          style={{
            borderTop: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          Sin respuestas: el recorrido muestra &quot;Siguiente&quot;.
        </div>
      ) : null}
    </div>
  );
}
