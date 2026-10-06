import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Copy, ArrowUp, ArrowDown, Files } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { SearchInput } from "../common/SearchInput";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { copyToClipboard } from "../../utils/copyToClipboard";
import { useJustifyPestanas } from "../common/UINav";
import { normalizarTexto } from "../../utils/helpers";
import { DEFAULT_PLANTILLAS } from "../../utils/constants";
import {
  CATEGORIAS_CONVERSACION_DEFAULT,
  VARIABLE_OPERADOR,
  getConversacionesCategorias,
  getConversacionesVariables,
  esCategoriaDefault,
  leerMensajes,
  guardarMensajes,
  resolverConversacion,
  parsearVariables,
} from "../../utils/conversaciones";

// Compat (1.9.5 y anteriores): las 4 categorías originales. Las activas ahora
// salen de config.conversacionesCategorias (Útiles y UtilesView las leen de ahí).
export const CATEGORIAS_CONVERSACION = CATEGORIAS_CONVERSACION_DEFAULT;

export function ConversacionesSugeridasView({ config, setConfig, showToast }) {
  const justifyPestanas = useJustifyPestanas();
  // 1.9.6: categorías configurables en Configuración → General → Conversación
  // Sugerida (antes hardcodeadas). Si la categoría activa dejó de existir
  // (renombrada/borrada desde Configuración) se cae a la primera válida.
  const categorias = getConversacionesCategorias(config);
  const [categoria, setCategoria] = useState(categorias[0] ?? null);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const refNuevoMensaje = useRef(null);
  const operador = config.operador || "Operador";
  const categoriaActiva = categorias.includes(categoria)
    ? categoria
    : categorias[0] ?? null;

  // 1.9.6: los defaults solo aplican a las categorías originales; una categoría
  // nueva arranca vacía (antes heredaba las 3 plantillas genéricas ajenas).
  const [mensajes, setMensajesLocal] = useState(() =>
    leerMensajes(categoriaActiva, config)
  );

  // `config` entra en las deps para satisfacer exhaustive-deps (se lee
  // dentro): recargar al cambiar la config no pierde datos porque cada
  // edición de mensaje ya quedó persistida en storage.
  useEffect(() => {
    setMensajesLocal(leerMensajes(categoriaActiva, config));
    setBusqueda("");
  }, [categoriaActiva, config]);

  const guardar = (nuevos) => {
    setMensajesLocal(guardarMensajes(categoriaActiva, nuevos));
  };
  const agregarMensaje = () => {
    const texto = nuevoMensaje.trim();
    if (!texto) return;
    guardar([...mensajes, texto]);
    setNuevoMensaje("");
    showToast("Mensaje agregado", "success");
  };
  const eliminarMensaje = (idx) => {
    guardar(mensajes.filter((_, i) => i !== idx));
    setConfirmEliminar(null);
    showToast("Mensaje eliminado", "info");
  };
  const editarMensaje = (idx, valor) => {
    guardar(mensajes.map((m, i) => (i === idx ? valor : m)));
  };
  // 1.9.6: reordenar sin cambiar el formato persistido (sigue string[]).
  const moverMensaje = (idx, delta) => {
    const destino = idx + delta;
    if (destino < 0 || destino >= mensajes.length) return;
    const copia = [...mensajes];
    [copia[idx], copia[destino]] = [copia[destino], copia[idx]];
    guardar(copia);
    showToast("Orden actualizado", "info");
  };
  // 1.9.6: duplicar mensaje (antes había que copiarlo a mano).
  const duplicarMensaje = (idx) => {
    const copia = [...mensajes];
    copia.splice(idx + 1, 0, mensajes[idx]);
    guardar(copia);
    showToast("Mensaje duplicado", "success");
  };
  const restaurar = () => {
    guardar([...DEFAULT_PLANTILLAS]);
    showToast("Mensajes restaurados", "success");
  };
  // 1.9.6: el copiado ahora resuelve TODAS las variables configuradas
  // (antes solo {OPERADOR}; {NOMBRE}/{HORARIO} se copiaban literales sin aviso).
  const copiar = async (texto) => {
    const ok = await copyToClipboard(resolverConversacion(texto, config));
    showToast(
      ok ? "Mensaje copiado" : "No se pudo copiar",
      ok ? "success" : "error"
    );
  };
  // 1.9.6: copiar la secuencia completa de la categoría (apertura + desarrollo
  // + cierre) de una sola vez, con las variables ya resueltas.
  const copiarSecuencia = async () => {
    if (mensajes.length === 0) return;
    const secuencia = mensajes
      .map((m) => resolverConversacion(m, config))
      .join("\n\n");
    const ok = await copyToClipboard(secuencia);
    showToast(
      ok
        ? `Secuencia copiada (${mensajes.length} mensajes)`
        : "No se pudo copiar",
      ok ? "success" : "error"
    );
  };
  // 1.9.6: inserta la llave de la variable en el cursor del textarea de alta.
  const insertarVariable = (nombre) => {
    const llave = `{${nombre}}`;
    const el = refNuevoMensaje.current;
    const inicio = el?.selectionStart ?? nuevoMensaje.length;
    const fin = el?.selectionEnd ?? inicio;
    setNuevoMensaje(
      nuevoMensaje.slice(0, inicio) + llave + nuevoMensaje.slice(fin)
    );
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = inicio + llave.length;
    });
  };

  const variables = [
    { nombre: VARIABLE_OPERADOR, valor: operador, reservada: true },
    ...getConversacionesVariables(config),
  ];
  // Búsqueda (1.9.6): filtra lo que se muestra, no toca el storage.
  const visibles = mensajes
    .map((texto, idx) => ({ texto, idx }))
    .filter(
      ({ texto }) =>
        !busqueda || normalizarTexto(texto).includes(normalizarTexto(busqueda))
    );
  const tieneVariablesSinValor = mensajes.some((m) =>
    parsearVariables(m, config).some((p) => p.tipo === "variable" && !p.resuelta)
  );

  return (
    <div className="space-y-6">
      <div>
        <div
          className="text-sm font-semibold mb-2"
          style={{ color: "var(--color-text)" }}
        >
          Operador
        </div>
        <TextInput
          value={config.operador || ""}
          onChange={(e) => setConfig({ ...config, operador: e.target.value })}
          placeholder="Nombre del operador"
          style={{ maxWidth: 280 }}
        />
        <div
          className="text-xs mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          La variable <code style={{ color: "var(--color-accent)" }}>{'{OPERADOR}'}</code>{" "}
          se reemplaza con este nombre. El resto de las variables se configuran
          en Configuración → General → Conversación Sugerida.
        </div>
      </div>

      <div>
        <div
          className="flex flex-wrap gap-2 mb-3"
          style={{ justifyContent: justifyPestanas }}
        >
          {categorias.map((c) => (
            <button
              key={c}
              className={`category-tab ${categoriaActiva === c ? "active" : ""}`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
          {esCategoriaDefault(categoriaActiva) && (
            <BtnOutline onClick={restaurar} color="var(--color-accent)" size="sm">
              Restaurar originales
            </BtnOutline>
          )}
        </div>

        {categorias.length === 0 && (
          <div
            className="text-xs py-4 text-center rounded-md"
            style={{
              color: "var(--color-text-muted)",
              border: "1px dashed var(--color-border)",
            }}
          >
            No hay categorías configuradas. Agregalas en Configuración →
            General → Conversación Sugerida.
          </div>
        )}

        {categoriaActiva && (
          <>
            {/* 1.9.6: chips que insertan la llave en el cursor del textarea. */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className="text-[10px] uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Insertar:
              </span>
              {variables.map((v) => (
                <BtnOutline
                  key={v.nombre}
                  size="sm"
                  onClick={() => insertarVariable(v.nombre)}
                  title={
                    v.reservada
                      ? "Valor: nombre del operador"
                      : `Valor: ${v.valor || "(sin valor, queda literal al copiar)"}`
                  }
                >
                  {`{${v.nombre}}`}
                </BtnOutline>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2 mb-3">
              <TextArea
                className="flex-1 min-w-[200px]"
                rows={2}
                placeholder="Nuevo mensaje... (Enter agrega un salto de línea)"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                ref={refNuevoMensaje}
              />
              <div className="flex flex-col gap-2">
                <Btn onClick={agregarMensaje} icon={Plus} size="sm">
                  Agregar
                </Btn>
                <span
                  className="text-[10px] text-center"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {nuevoMensaje.length} caracteres
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <SearchInput
                className="flex-1 min-w-[180px]"
                placeholder="Buscar en esta categoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <BtnOutline
                onClick={copiarSecuencia}
                icon={Copy}
                size="sm"
                disabled={mensajes.length === 0}
              >
                {`Copiar secuencia (${mensajes.length})`}
              </BtnOutline>
            </div>

            {tieneVariablesSinValor && (
              <div
                className="text-xs mb-2 px-2 py-1 rounded"
                style={{
                  color: "var(--color-danger)",
                  backgroundColor: "var(--color-surface2)",
                }}
              >
                Hay variables sin valor configurado: se resaltan en rojo y se
                copian tal cual.
              </div>
            )}

            <div className="space-y-2">
              {visibles.map(({ texto: m, idx }) => (
                <div
                  key={idx}
                  className="rounded-md p-2.5 flex gap-2 items-start"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex-1">
                    <TextArea
                      rows={2}
                      value={m}
                      onChange={(e) => editarMensaje(idx, e.target.value)}
                      className="w-full"
                    />
                    {/* 1.9.6: preview de TODAS las variables (antes solo OPERADOR). */}
                    <div
                      className="text-xs mt-1 px-2 py-1 rounded"
                      style={{
                        backgroundColor: "var(--color-surface2)",
                      }}
                    >
                      Vista previa:{" "}
                      {parsearVariables(m, config).map((p, i) =>
                        p.tipo === "texto" ? (
                          <span key={i} style={{ color: "var(--color-text)" }}>
                            {p.valor}
                          </span>
                        ) : p.resuelta ? (
                          <strong
                            key={i}
                            style={{ color: "var(--color-success)" }}
                          >
                            {p.valor}
                          </strong>
                        ) : (
                          <span
                            key={i}
                            title="Sin valor configurado: se copia literal"
                            style={{
                              color: "var(--color-danger)",
                              textDecoration: "underline wavy",
                            }}
                          >
                            {`{${p.nombre}}`}
                          </span>
                        )
                      )}
                    </div>
                    <div
                      className="text-[10px] mt-1 text-right"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {m.length} caracteres
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => copiar(m)}
                      className="p-1 rounded hover:opacity-70 transition-opacity"
                      title="Copiar mensaje"
                    >
                      <Copy size={14} style={{ color: "var(--color-accent)" }} />
                    </button>
                    <button
                      onClick={() => moverMensaje(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:opacity-70 transition-opacity disabled:opacity-30"
                      title="Subir"
                    >
                      <ArrowUp size={14} style={{ color: "var(--color-text-muted)" }} />
                    </button>
                    <button
                      onClick={() => moverMensaje(idx, 1)}
                      disabled={idx === mensajes.length - 1}
                      className="p-1 rounded hover:opacity-70 transition-opacity disabled:opacity-30"
                      title="Bajar"
                    >
                      <ArrowDown size={14} style={{ color: "var(--color-text-muted)" }} />
                    </button>
                    <button
                      onClick={() => duplicarMensaje(idx)}
                      className="p-1 rounded hover:opacity-70 transition-opacity"
                      title="Duplicar"
                    >
                      <Files size={14} style={{ color: "var(--color-text-muted)" }} />
                    </button>
                    <button
                      onClick={() => setConfirmEliminar(idx)}
                      className="p-1 rounded hover:opacity-70 transition-opacity"
                      title="Eliminar"
                    >
                      <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
                    </button>
                  </div>
                </div>
              ))}
              {mensajes.length === 0 && (
                <div
                  className="text-xs py-4 text-center"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  No hay mensajes para esta categoría.
                </div>
              )}
              {mensajes.length > 0 && visibles.length === 0 && (
                <div
                  className="text-xs py-4 text-center"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Ningún mensaje coincide con "{busqueda}".
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmEliminar !== null}
        title="Eliminar mensaje"
        message="Seguro que quieres eliminar este mensaje?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => eliminarMensaje(confirmEliminar)}
      />
    </div>
  );
}
