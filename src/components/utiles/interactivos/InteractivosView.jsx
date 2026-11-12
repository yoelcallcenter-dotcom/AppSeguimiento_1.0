import React, { useMemo, useState } from "react";
import {
  Plus,
  Play,
  Pencil,
  Trash2,
  GitBranch,
  Copy,
  FileText,
  Upload,
  AlertTriangle,
  Archive,
  RotateCcw,
  Sparkles,
  // Release 1.11.2: acción principal "Modo llamada" y retomar pendiente.
  Phone,
  History,
} from "lucide-react";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { SearchInput } from "../../common/SearchInput";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { Modal } from "../../common/Modal";
import { Field } from "../../common/Field";
import { TextInput } from "../../common/TextInput";
import { TextArea } from "../../common/TextArea";
import { Select } from "../../common/Select";
import {
  crearSpeechInteractivo,
  validarSpeech,
  duplicarSpeech,
} from "./interactiveSpeechModel";
import {
  serializarSpeechs,
  descargarJson,
  nombreArchivoSpeechs,
  parsearEnvelope,
  prepararFilasImport,
  aplicarImportacion,
  // Release 1.11.0 (§7): fusión por id del seed de objeciones del ejemplo.
  fusionarObjeciones,
} from "./speechsInteractivosIO";
import {
  crearEjemploART,
  OBJECIONES_EJEMPLO_ART,
} from "./ejemploGuionART";
import { SpeechEditor } from "./SpeechEditor";
import { SpeechRunner } from "./SpeechRunner";
// Release 1.11.2 (Modo llamada): la biblioteca guarda/retoma sesiones y abre
// la pantalla nueva; los helpers puros validan la sesión contra el guion.
import { ModoLlamada } from "./llamada/ModoLlamada";
import {
  normalizarSesion,
  serializarSesion,
} from "./llamada/sesionLlamada";

const borradorVacio = { nombre: "", descripcion: "" };

const ESTRATEGIAS = [
  { value: "omitir", label: "Omitir" },
  { value: "copia", label: "Copia" },
  { value: "reemplazar", label: "Reemplazar" },
];

const chipEstado = (estado) => {
  if (estado === "invalido") {
    return { label: "Inválido", color: "var(--color-danger)" };
  }
  if (estado === "conflicto") {
    return { label: "ID duplicado", color: "var(--color-warning)" };
  }
  return { label: "Nuevo", color: "var(--color-success)" };
};

export function InteractivosView({
  speechs,
  setSpeechs,
  showToast,
  objeciones = [],
  // Release 1.11.0 (§5.3): al importar, las objeciones que viajan en el
  // archivo se fusionan en la lista global sin sobrescribir las existentes.
  setObjeciones,
  // Release 1.11.2: llamadas guardadas por speech ({ [speechId]: { sesion } }).
  // Viven en el storage de la app, NO viajan en export/backup y se limpian con
  // "borrar todo". Sin estas props la biblioteca sigue funcionando (Vista
  // rápida), solo que sin retomar pendientes.
  llamadasEnCurso = {},
  setLlamadasEnCurso,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalNuevo, setModalNuevo] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [ejecutandoId, setEjecutandoId] = useState(null);
  const [modalExport, setModalExport] = useState(null);
  const [importData, setImportData] = useState(null);
  const [confirmReemplazo, setConfirmReemplazo] = useState(false);
  // Modo llamada: { speechId, sesionInicial, avisoGuionCambiado } o null.
  const [modoLlamada, setModoLlamada] = useState(null);
  // Empezar de cero con una llamada pendiente exige confirmación explícita.
  const [confirmNuevaLlamada, setConfirmNuevaLlamada] = useState(null);

  const lista = speechs || [];

  // Release 1.11.0: filtro activo/archivado (§5). "todos" es el default para
  // no cambiar el comportamiento histórico de la lista.
  const filtrados = useMemo(() => {
    const ordenada = [...lista]
      .filter((s) => {
        if (filtroEstado === "activos") return !s.archivado;
        if (filtroEstado === "archivados") return Boolean(s.archivado);
        return true;
      })
      .sort((a, b) =>
        String(b.fechaModificacion || "").localeCompare(
          String(a.fechaModificacion || "")
        )
      );
    const q = busqueda.trim().toLowerCase();
    if (!q) return ordenada;
    return ordenada.filter(
      (s) =>
        String(s.nombre || "").toLowerCase().includes(q) ||
        String(s.descripcion || "").toLowerCase().includes(q)
    );
  }, [speechs, busqueda, filtroEstado]);

  const enEdicion = lista.find((s) => s.id === editandoId) || null;
  const enEjecucion = lista.find((s) => s.id === ejecutandoId) || null;

  // --- Release 1.11.2: Modo llamada y llamadas pendientes ------------------
  const pendienteDe = (speechId) => llamadasEnCurso?.[speechId] || null;

  const guardarSesion = (sesion) => {
    if (!modoLlamada || typeof setLlamadasEnCurso !== "function") return;
    const speech = lista.find((s) => s.id === modoLlamada.speechId);
    const id = modoLlamada.speechId;
    setLlamadasEnCurso((prev) => {
      const next = { ...(prev || {}) };
      // Una llamada finalizada ya no es pendiente: se quita del storage. El
      // resumen se mostró en pantalla antes de cerrar (nada de historiales
      // ocultos, decisión 1.11.2).
      if (sesion?.finalizada) {
        delete next[id];
        return next;
      }
      next[id] = {
        speechId: id,
        speechNombre: speech?.nombre || "",
        speechVersion: Number(speech?.version) || 0,
        actualizadaEn: sesion?.actualizadaEn || new Date().toISOString(),
        sesion: serializarSesion(sesion),
      };
      return next;
    });
  };

  const descartarSesion = (speechId) => {
    if (typeof setLlamadasEnCurso !== "function" || !speechId) return;
    setLlamadasEnCurso((prev) => {
      if (!prev || !prev[speechId]) return prev;
      const next = { ...prev };
      delete next[speechId];
      return next;
    });
  };

  /**
   * Abre el Modo llamada. Si hay una sesión guardada, la valida contra el
   * guion ACTUAL antes de reanudar: si la etapa/opción ya no existe no se
   * retoma a ciegas (se avisa y se descarta el pendiente roto). Si el guion
   * solo cambió de versión, se retoma con un aviso.
   */
  const abrirModoLlamada = (speechId) => {
    const speech = lista.find((s) => s.id === speechId);
    if (!speech) return;
    const pendiente = pendienteDe(speechId);
    if (pendiente?.sesion) {
      const norm = normalizarSesion(pendiente.sesion, speech);
      if (!norm.ok) {
        descartarSesion(speechId);
        showToast(
          "La llamada pendiente ya no coincide con el guion y no se puede retomar.",
          "error"
        );
        return;
      }
      if (norm.guionCambiado) {
        showToast("El guion cambió: revisá las etapas al retomar.", "info");
      }
      setModoLlamada({
        speechId,
        sesionInicial: norm.sesion,
        avisoGuionCambiado: norm.guionCambiado,
      });
      return;
    }
    setModoLlamada({ speechId, sesionInicial: null, avisoGuionCambiado: false });
  };

  const iniciarNuevaLlamada = (speechId) => {
    if (!speechId) return;
    descartarSesion(speechId);
    setModoLlamada({ speechId, sesionInicial: null, avisoGuionCambiado: false });
  };

  const solicitarNuevaLlamada = (speechId) => {
    if (pendienteDe(speechId)) {
      setConfirmNuevaLlamada(speechId);
      return;
    }
    iniciarNuevaLlamada(speechId);
  };

  const actualizar = (nuevo) => {
    setSpeechs(lista.map((s) => (s.id === nuevo.id ? nuevo : s)));
  };

  const crear = () => {
    const nombre = String(modalNuevo.nombre || "").trim();
    if (!nombre) return;
    const nuevo = crearSpeechInteractivo({
      nombre,
      descripcion: modalNuevo.descripcion,
    });
    setSpeechs([...lista, nuevo]);
    setModalNuevo(null);
    setEditandoId(nuevo.id);
    showToast("Speech interactivo creado", "success");
  };

  const eliminar = () => {
    const id = confirmEliminar;
    setSpeechs(lista.filter((s) => s.id !== id));
    if (editandoId === id) setEditandoId(null);
    if (ejecutandoId === id) setEjecutandoId(null);
    // Release 1.11.2: borrar el guion borra también su llamada pendiente (ya
    // no habría contra qué retomarla).
    descartarSesion(id);
    if (modoLlamada?.speechId === id) setModoLlamada(null);
    setConfirmEliminar(null);
    showToast("Speech interactivo eliminado", "info");
  };

  const duplicar = (speech) => {
    const copia = duplicarSpeech(speech);
    setSpeechs([...lista, copia]);
    showToast("Speech duplicado", "success");
  };

  /**
   * Seed del guion de ejemplo ART (§7). Se dispara SOLO desde el estado vacío
   * (nunca automático) y es idempotente por id: si el ejemplo ya existe no se
   * duplica. Las 12 objeciones se fusionan por id sin sobrescribir las que ya
   * tenga el usuario.
   */
  const crearEjemplo = () => {
    if (lista.some((s) => s.id === "art-ejemplo")) {
      showToast("El guion de ejemplo ya existe", "info");
      return;
    }
    setSpeechs([...lista, crearEjemploART()]);
    if (typeof setObjeciones === "function") {
      const existentes = Array.isArray(objeciones) ? objeciones : [];
      const fusionadas = fusionarObjeciones(existentes, OBJECIONES_EJEMPLO_ART);
      // fusionarObjeciones devuelve la MISMA referencia si no hay novedades.
      if (fusionadas !== existentes) setObjeciones(fusionadas);
    }
    showToast("Guion de ejemplo ART creado", "success");
  };

  // Release 1.11.0 (§5): archivar conserva el guion y su historial; reactivar
  // lo devuelve al flujo normal. No borra nada.
  const alternarArchivado = (speech) => {
    const archivado = !speech.archivado;
    actualizar({
      ...speech,
      archivado,
      fechaModificacion: new Date().toISOString(),
    });
    showToast(
      archivado ? "Speech archivado" : "Speech reactivado",
      "info"
    );
  };

  /** Exporta SOLO el guion abierto en el editor (con snapshot de objeciones). */
  const exportarGuion = (speech) => {
    if (!speech) return;
    descargarJson(nombreArchivoSpeechs(), serializarSpeechs([speech], objeciones));
    showToast("Exportacion completada", "success");
  };

  const abrirExport = () => {
    setModalExport({ seleccion: new Set(lista.map((s) => s.id)) });
  };

  const alternarExport = (id) => {
    setModalExport((prev) => {
      const seleccion = new Set(prev.seleccion);
      if (seleccion.has(id)) seleccion.delete(id);
      else seleccion.add(id);
      return { ...prev, seleccion };
    });
  };

  const alternarTodosExport = () => {
    setModalExport((prev) => ({
      seleccion:
        prev.seleccion.size === lista.length ? new Set() : new Set(lista.map((s) => s.id)),
    }));
  };

  const exportarSeleccion = () => {
    if (!modalExport) return;
    const elegidos = lista.filter((s) => modalExport.seleccion.has(s.id));
    if (!elegidos.length) return;
    descargarJson(nombreArchivoSpeechs(), serializarSpeechs(elegidos));
    setModalExport(null);
    showToast("Exportacion completada", "success");
  };

  const recibirArchivoImport = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parseado = parsearEnvelope(String(ev.target.result || ""));
      if (!parseado.ok) {
        showToast(parseado.error, "error");
        return;
      }
      const filas = prepararFilasImport(parseado.speechs, lista);
      const estrategias = {};
      filas.forEach((f) => {
        if (f.estado === "conflicto") estrategias[f.key] = "omitir";
      });
      setImportData({ filas, estrategias });
    };
    reader.readAsText(file);
  };

  const cambiarEstrategia = (key, valor) => {
    setImportData((prev) => ({
      ...prev,
      estrategias: { ...prev.estrategias, [key]: valor },
    }));
  };

  const importables = importData
    ? importData.filas.filter(
        (f) =>
          f.estado !== "invalido" &&
          (f.estado === "nuevo" ||
            (importData.estrategias[f.key] || "omitir") !== "omitir")
      )
    : [];
  const omitidosPreview = importData ? importData.filas.length - importables.length : 0;

  const aplicarImport = () => {
    if (!importData) return;
    // Release 1.11.0 (§5.3): además de los guiones se fusionan las objeciones
    // que viajaron en el archivo. La fusión NO pisa las existentes: solo
    // agrega las que falten por id.
    const { lista: nueva, res, objeciones: objecionesNuevas } = aplicarImportacion(
      importData.filas,
      importData.estrategias,
      lista,
      Array.isArray(objeciones) ? objeciones : undefined
    );
    setSpeechs(nueva);
    if (
      objecionesNuevas &&
      objecionesNuevas !== objeciones &&
      typeof setObjeciones === "function"
    ) {
      setObjeciones(objecionesNuevas);
    }
    setImportData(null);
    setConfirmReemplazo(false);
    const partes = [`${res.agregados} importados`];
    if (res.reemplazados > 0) partes.push(`${res.reemplazados} reemplazados`);
    partes.push(`${res.omitidos} omitidos`);
    if (res.objecionesAgregadas > 0) {
      partes.push(`${res.objecionesAgregadas} objeción(es) agregada(s)`);
    }
    showToast(partes.join(" · "), "success");
  };

  const ejecutarImport = () => {
    if (!importData) return;
    const hayReemplazo = importData.filas.some(
      (f) =>
        f.estado === "conflicto" &&
        (importData.estrategias[f.key] || "omitir") === "reemplazar"
    );
    if (hayReemplazo) {
      setConfirmReemplazo(true);
      return;
    }
    aplicarImport();
  };

  // Overlay del Modo llamada: se renderiza TANTO sobre la biblioteca como
  // sobre el editor, para que "Iniciar Speech" abra la misma pantalla.
  const speechLlamada = modoLlamada
    ? lista.find((s) => s.id === modoLlamada.speechId) || null
    : null;
  const overlayLlamada =
    modoLlamada && speechLlamada ? (
      <ModoLlamada
        // El remount limpia el estado local del motor al cambiar de llamada o
        // al reiniciar desde cero (misma clave de sesión).
        key={`${modoLlamada.speechId}:${
          modoLlamada.sesionInicial?.iniciadaEn || "nueva"
        }`}
        speech={speechLlamada}
        objeciones={objeciones}
        sesionInicial={modoLlamada.sesionInicial}
        avisoGuionCambiado={modoLlamada.avisoGuionCambiado}
        onGuardar={guardarSesion}
        onDescartar={() => descartarSesion(modoLlamada.speechId)}
        onClose={() => setModoLlamada(null)}
      />
    ) : null;

  if (enEdicion) {
    return (
      <div className="space-y-4">
        <SpeechEditor
          speech={enEdicion}
          onChange={actualizar}
          onVolver={() => setEditandoId(null)}
          // Release 1.11.2: la acción principal del editor abre el Modo
          // llamada (la Vista previa del propio editor sigue siendo el
          // recorrido de borrador).
          onEjecutar={(id) => abrirModoLlamada(id)}
          onExportar={() => exportarGuion(enEdicion)}
          showToast={showToast}
          objeciones={objeciones}
        />
        {enEjecucion && (
          <SpeechRunner
            speech={enEjecucion}
            onClose={() => setEjecutandoId(null)}
            objeciones={objeciones}
          />
        )}
        {overlayLlamada}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar speech interactivo..."
          />
        </div>
        {/* Release 1.11.0 (§5): filtro activo/archivado sin destruir datos. */}
        <Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          options={[
            { value: "todos", label: "Todos" },
            { value: "activos", label: "Activos" },
            { value: "archivados", label: "Archivados" },
          ]}
          aria-label="Filtrar por estado"
          className="flex-shrink-0"
        />
        <BtnOutline
          onClick={abrirExport}
          icon={FileText}
          size="sm"
          color="var(--color-accent)"
          disabled={lista.length === 0}
        >
          Exportar
        </BtnOutline>
        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors hover:opacity-70"
          style={{
            backgroundColor: "transparent",
            border: `1px solid ${lista.length === 0 ? "var(--color-border)" : "var(--color-accent)"}`,
            color: lista.length === 0 ? "var(--color-text-muted)" : "var(--color-accent)",
          }}
        >
          <Upload size={13} /> Importar
          <input
            type="file"
            accept=".json,application/json"
            onChange={recibirArchivoImport}
            className="hidden"
            aria-label="Archivo de speechs interactivos"
          />
        </label>
        <Btn onClick={() => setModalNuevo({ ...borradorVacio })} icon={Plus} size="sm">
          Nuevo Speech Interactivo
        </Btn>
      </div>

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {filtrados.length} speech{filtrados.length !== 1 ? "s" : ""} interactivo
        {filtrados.length !== 1 ? "s" : ""}
        {busqueda && ` (filtrados de ${lista.length})`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtrados.map((s) => {
          const errores = validarSpeech(s);
          const pasoCount = (s.steps || []).length;
          const pendiente = pendienteDe(s.id);
          const puedeLlamar = errores.length === 0 && !s.archivado;
          return (
            <div
              key={s.id}
              className="rounded-lg p-3 transition-shadow hover:shadow-lg"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch
                    size={14}
                    style={{ color: "var(--color-accent)", flexShrink: 0 }}
                  />
                  <span
                    className="text-sm font-bold truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {s.nombre || "(sin nombre)"}
                  </span>
                  {errores.length > 0 && (
                    <span
                      className="pill-sm font-bold flex-shrink-0"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--color-danger) 13.3%, transparent)",
                        color: "var(--color-danger)",
                      }}
                      title={errores.join(" · ")}
                    >
                      {errores.length} error{errores.length !== 1 ? "es" : ""}
                    </span>
                  )}
                  {/* Release 1.11.0 (§5): estado activo/archivado visible. */}
                  {s.archivado && (
                    <span
                      className="pill-sm font-bold flex-shrink-0"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--color-text-muted) 13.3%, transparent)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Archivado
                    </span>
                  )}
                  {/* Release 1.11.2: llamada guardada para retomar. */}
                  {pendiente ? (
                    <span
                      className="pill-sm font-bold flex-shrink-0"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                        color: "var(--color-success)",
                      }}
                      title="Hay una llamada en curso guardada para este guion"
                    >
                      Llamada pendiente
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Ejecutar speech interactivo"
                    disabled={!puedeLlamar}
                    title={
                      s.archivado
                        ? "Reactivá el speech para ejecutarlo"
                        : errores.length > 0
                        ? "Corregí los errores antes de ejecutar"
                        : "Vista rápida (sin guardar)"
                    }
                    onClick={() => setEjecutandoId(s.id)}
                    className={`p-1 rounded transition-colors ${
                      !puedeLlamar
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-white/5"
                    }`}
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Play size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Editar speech interactivo"
                    title="Editar"
                    onClick={() => setEditandoId(s.id)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicar speech interactivo"
                    title="Duplicar"
                    onClick={() => duplicar(s)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Copy size={14} />
                  </button>
                  {/* Release 1.11.0 (§5): archivar/reactivar sin borrar. */}
                  <button
                    type="button"
                    aria-label={
                      s.archivado
                        ? "Reactivar speech interactivo"
                        : "Archivar speech interactivo"
                    }
                    title={s.archivado ? "Reactivar" : "Archivar"}
                    onClick={() => alternarArchivado(s)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {s.archivado ? <RotateCcw size={14} /> : <Archive size={14} />}
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar speech interactivo"
                    title="Eliminar"
                    onClick={() => setConfirmEliminar(s.id)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {s.descripcion ? (
                <div
                  className="text-xs mb-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {s.descripcion}
                </div>
              ) : null}

              {/* Release 1.11.2: el Modo llamada es la acción principal de la
                  tarjeta; el play de arriba queda como Vista rápida. */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {pendiente ? (
                  <>
                    <Btn
                      size="sm"
                      icon={History}
                      disabled={!puedeLlamar}
                      onClick={() => abrirModoLlamada(s.id)}
                      ariaLabel="Retomar modo llamada"
                      title={
                        s.archivado
                          ? "Reactivá el speech para retomar la llamada"
                          : errores.length > 0
                          ? "Corregí los errores antes de retomar"
                          : "Retomar la llamada guardada"
                      }
                    >
                      Retomar
                    </Btn>
                    <BtnOutline
                      size="sm"
                      icon={Phone}
                      disabled={!puedeLlamar}
                      onClick={() => solicitarNuevaLlamada(s.id)}
                      ariaLabel="Iniciar nueva llamada"
                    >
                      Nueva llamada
                    </BtnOutline>
                    <BtnOutline
                      size="sm"
                      icon={Trash2}
                      onClick={() => descartarSesion(s.id)}
                      ariaLabel="Descartar llamada pendiente"
                      title="Descartar la llamada pendiente"
                    >
                      Descartar
                    </BtnOutline>
                  </>
                ) : (
                  <Btn
                    size="sm"
                    icon={Phone}
                    disabled={!puedeLlamar}
                    onClick={() => abrirModoLlamada(s.id)}
                    ariaLabel="Iniciar modo llamada"
                    title={
                      s.archivado
                        ? "Reactivá el speech para ejecutarlo"
                        : errores.length > 0
                        ? "Corregí los errores antes de ejecutar"
                        : "Abrir el Modo llamada"
                    }
                  >
                    Modo llamada
                  </Btn>
                )}
              </div>

              <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {pasoCount} paso{pasoCount !== 1 ? "s" : ""} · modificado{" "}
                {String(s.fechaModificacion || "").slice(0, 10)}
                {pendiente ? (
                  <>
                    {" · "}
                    pendiente desde{" "}
                    {String(pendiente.actualizadaEn || "").slice(0, 10)}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <div
          className="text-sm py-8 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          {busqueda ? (
            "No hay speechs que coincidan con la busqueda."
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-3">
              <span>
                No hay speechs interactivos. Creá uno con el botón de arriba.
              </span>
              {/* Release 1.11.0 (§7): el ejemplo ART se ofrece SOLO acá, con la
                  lista realmente vacía; nunca se siembra automáticamente. */}
              <BtnOutline
                onClick={crearEjemplo}
                icon={Sparkles}
                size="sm"
                color="var(--color-accent)"
              >
                Crear guion de ejemplo ART
              </BtnOutline>
            </div>
          ) : (
            "No hay speechs con el filtro seleccionado."
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmEliminar !== null}
        title="Eliminar speech interactivo"
        message="Seguro que quieres eliminar este speech interactivo?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={eliminar}
      />

      {/* Release 1.11.2: empezar de cero con una llamada pendiente descarta
          esa sesión; se pide confirmación para no perderla por accidente. */}
      <ConfirmDialog
        open={confirmNuevaLlamada !== null}
        title="Iniciar nueva llamada"
        message="Ya hay una llamada pendiente para este guion. Si iniciás una nueva, la llamada guardada se descarta. ¿Continuar?"
        confirmLabel="Iniciar nueva"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmNuevaLlamada(null)}
        onConfirm={() => {
          iniciarNuevaLlamada(confirmNuevaLlamada);
          setConfirmNuevaLlamada(null);
        }}
      />

      {overlayLlamada}

      <Modal
        isOpen={!!modalNuevo}
        onClose={() => setModalNuevo(null)}
        title="Nuevo Speech Interactivo"
        icon={GitBranch}
        size="md"
        footer={
          <>
            <BtnOutline
              onClick={() => setModalNuevo(null)}
              color="var(--color-text-muted)"
              size="sm"
            >
              Cancelar
            </BtnOutline>
            <Btn
              onClick={crear}
              size="sm"
              icon={Plus}
              disabled={!String(modalNuevo?.nombre || "").trim()}
            >
              Crear
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nombre *">
            <TextInput
              value={modalNuevo?.nombre || ""}
              onChange={(e) =>
                setModalNuevo({ ...modalNuevo, nombre: e.target.value })
              }
              placeholder="Ej: Accidente Laboral"
            />
          </Field>
          <Field label="Descripción">
            <TextArea
              rows={2}
              value={modalNuevo?.descripcion || ""}
              onChange={(e) =>
                setModalNuevo({ ...modalNuevo, descripcion: e.target.value })
              }
              placeholder="Para qué sirve este recorrido (opcional)"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        isOpen={!!modalExport}
        onClose={() => setModalExport(null)}
        title="Exportar speechs interactivos"
        icon={FileText}
        size="md"
        footer={
          <>
            <span
              className="mr-auto self-center text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {modalExport ? modalExport.seleccion.size : 0} seleccionados
            </span>
            <BtnOutline
              onClick={() => setModalExport(null)}
              color="var(--color-text-muted)"
              size="sm"
            >
              Cancelar
            </BtnOutline>
            <Btn
              onClick={exportarSeleccion}
              icon={FileText}
              size="sm"
              disabled={!modalExport || modalExport.seleccion.size === 0}
            >
              Exportar {modalExport ? modalExport.seleccion.size : 0}
            </Btn>
          </>
        }
      >
        {modalExport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Elegí qué exportar
              </span>
              <BtnOutline onClick={alternarTodosExport} size="sm">
                {modalExport.seleccion.size === lista.length
                  ? "Quitar todos"
                  : "Seleccionar todos"}
              </BtnOutline>
            </div>
            {lista.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-white/5"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <input
                  type="checkbox"
                  checked={modalExport.seleccion.has(s.id)}
                  onChange={() => alternarExport(s.id)}
                  aria-label={`Seleccionar ${s.nombre || "(sin nombre)"}`}
                  style={{ accentColor: "var(--color-accent)" }}
                />
                <span
                  className="text-sm truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {s.nombre || "(sin nombre)"}
                </span>
                <span
                  className="ml-auto text-[10px] flex-shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {(s.steps || []).length} paso
                  {(s.steps || []).length !== 1 ? "s" : ""}
                </span>
              </label>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!importData}
        onClose={() => setImportData(null)}
        title="Importar speechs interactivos"
        icon={Upload}
        size="lg"
        footer={
          <>
            <span
              className="mr-auto self-center text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {importables.length} para importar · {omitidosPreview} omitidos
            </span>
            <BtnOutline
              onClick={() => setImportData(null)}
              color="var(--color-text-muted)"
              size="sm"
            >
              Cancelar
            </BtnOutline>
            <Btn
              onClick={ejecutarImport}
              icon={Upload}
              size="sm"
              disabled={importables.length === 0}
            >
              Importar {importables.length}
            </Btn>
          </>
        }
      >
        {importData && (
          <div className="space-y-2">
            {importData.filas.map((f) => {
              const chip = chipEstado(f.estado);
              const nombre = String(f.speech?.nombre || "").trim() || "(sin nombre)";
              return (
                <div
                  key={f.key}
                  className="rounded-lg p-2 space-y-1.5"
                  style={{
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg)",
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="pill-sm font-bold flex-shrink-0"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${chip.color} 13.3%, transparent)`,
                        color: chip.color,
                      }}
                    >
                      {chip.label}
                    </span>
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {nombre}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {(f.speech?.steps || []).length} paso
                      {(f.speech?.steps || []).length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {f.estado === "conflicto" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Ya existe con el mismo ID:
                      </span>
                      <Select
                        value={importData.estrategias[f.key] || "omitir"}
                        onChange={(e) => cambiarEstrategia(f.key, e.target.value)}
                        options={ESTRATEGIAS}
                        aria-label={`Estrategia para ${nombre}`}
                        className="flex-shrink-0"
                      />
                    </div>
                  )}

                  {f.motivos.length > 0 && (
                    <div className="text-[11px]" style={{ color: "var(--color-danger)" }}>
                      {f.motivos.join(" · ")}
                    </div>
                  )}

                  {f.advertencias.length > 0 && (
                    <div
                      className="flex items-start gap-1 text-[11px]"
                      style={{ color: "var(--color-warning)" }}
                    >
                      <AlertTriangle
                        size={11}
                        className="flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{f.advertencias.join(" · ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmReemplazo}
        title="Reemplazar speechs existentes"
        message="Hay speechs con el mismo ID que serán reemplazados por los del archivo. Esta acción sobreescribe datos existentes. ¿Continuar?"
        confirmLabel="Reemplazar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmReemplazo(false)}
        onConfirm={aplicarImport}
      />

      {enEjecucion && (
        <SpeechRunner
          speech={enEjecucion}
          onClose={() => setEjecutandoId(null)}
          objeciones={objeciones}
        />
      )}
    </div>
  );
}
