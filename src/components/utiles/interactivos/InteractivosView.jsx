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
} from "./speechsInteractivosIO";
import { SpeechEditor } from "./SpeechEditor";
import { SpeechRunner } from "./SpeechRunner";

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

export function InteractivosView({ speechs, setSpeechs, showToast }) {
  const [busqueda, setBusqueda] = useState("");
  const [modalNuevo, setModalNuevo] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [ejecutandoId, setEjecutandoId] = useState(null);
  const [modalExport, setModalExport] = useState(null);
  const [importData, setImportData] = useState(null);
  const [confirmReemplazo, setConfirmReemplazo] = useState(false);

  const lista = speechs || [];

  const filtrados = useMemo(() => {
    const ordenada = [...lista].sort((a, b) =>
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
  }, [speechs, busqueda]);

  const enEdicion = lista.find((s) => s.id === editandoId) || null;
  const enEjecucion = lista.find((s) => s.id === ejecutandoId) || null;

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
    setConfirmEliminar(null);
    showToast("Speech interactivo eliminado", "info");
  };

  const duplicar = (speech) => {
    const copia = duplicarSpeech(speech);
    setSpeechs([...lista, copia]);
    showToast("Speech duplicado", "success");
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
    const { lista: nueva, res } = aplicarImportacion(
      importData.filas,
      importData.estrategias,
      lista
    );
    setSpeechs(nueva);
    setImportData(null);
    setConfirmReemplazo(false);
    const partes = [`${res.agregados} importados`];
    if (res.reemplazados > 0) partes.push(`${res.reemplazados} reemplazados`);
    partes.push(`${res.omitidos} omitidos`);
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

  if (enEdicion) {
    return (
      <div className="space-y-4">
        <SpeechEditor
          speech={enEdicion}
          onChange={actualizar}
          onVolver={() => setEditandoId(null)}
          onEjecutar={(id) => setEjecutandoId(id)}
          showToast={showToast}
        />
        {enEjecucion && (
          <SpeechRunner
            speech={enEjecucion}
            onClose={() => setEjecutandoId(null)}
          />
        )}
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
                        backgroundColor: "var(--color-danger)22",
                        color: "var(--color-danger)",
                      }}
                      title={errores.join(" · ")}
                    >
                      {errores.length} error{errores.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Ejecutar speech interactivo"
                    disabled={errores.length > 0}
                    title={
                      errores.length > 0
                        ? "Corregí los errores antes de ejecutar"
                        : "Ejecutar"
                    }
                    onClick={() => setEjecutandoId(s.id)}
                    className={`p-1 rounded transition-colors ${
                      errores.length > 0
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-white/5"
                    }`}
                    style={{ color: "var(--color-success)" }}
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

              <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                {pasoCount} paso{pasoCount !== 1 ? "s" : ""} · modificado{" "}
                {String(s.fechaModificacion || "").slice(0, 10)}
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
          {busqueda
            ? "No hay speechs que coincidan con la busqueda."
            : "No hay speechs interactivos. Creá uno con el botón de arriba."}
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
                        backgroundColor: `${chip.color}22`,
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
        />
      )}
    </div>
  );
}
