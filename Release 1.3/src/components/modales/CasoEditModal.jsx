import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Trash2,
  ClipboardPaste,
  ChevronDown,
  AlertTriangle,
  Edit3,
  FileText,
  Calendar,
  Plus,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { Field } from "../common/Field";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { Select } from "../common/Select";
import { PillMemo } from "../common/Pill";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { TagsManager } from "../common/TagsManager";
import { sanitizeString } from "../../utils/sanitize";
import {
  parseFicha,
  capitalizarSiMayus,
  sugerirTipoIngreso,
} from "../../utils/helpers";
import { hoyDDMM, hoyISO } from "../../utils/dateUtils";
import { validateCaso } from "../../validators/casoValidator";
import { matchEstudio } from "../../services/EstudioService";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { getEstados, getTiposIngreso } from "../../utils/catalogos";
import { soundSystem } from "../../core/notifications/soundSystem";

export function CasoEditModal({
  caso: casoInicial,
  casos,
  mapeo,
  config,
  onSave,
  onDelete,
  onClose,
  onNuevaNota,
  onNuevoEvento,
  showToast,
}) {
  const dialogRef = useRef(null);
  useDialogA11y(dialogRef, true);
  const [caso, setCaso] = useState(casoInicial);
  const [pegado, setPegado] = useState("");
  const [showPegar, setShowPegar] = useState(!casoInicial.nombre);
  const [estudioAuto, setEstudioAuto] = useState(!casoInicial.estudioJuridico);
  const [nuevoReporteTexto, setNuevoReporteTexto] = useState("");
  const [nuevoReporteFecha, setNuevoReporteFecha] = useState("");
  const [editandoReporteIndex, setEditandoReporteIndex] = useState(null);
  const [editandoReporteTexto, setEditandoReporteTexto] = useState("");
  const [editandoReporteFecha, setEditandoReporteFecha] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [confirmEliminarReporte, setConfirmEliminarReporte] = useState(null);

  const set = (k, v) => setCaso((c) => ({ ...c, [k]: v }));
  const duplicado =
    caso.telefono &&
    casos.some((c) => c.id !== caso.id && c.telefono === caso.telefono);

  const procesarPegado = () => {
    if (!pegado.trim()) return;
    const parsed = parseFicha(pegado);
    setCaso((c) => ({ ...c, ...parsed }));
    setShowPegar(false);
    showToast("Ficha procesada correctamente", "success");
  };

  useEffect(() => {
    if (!estudioAuto) return;
    const m = matchEstudio(caso.localidad, mapeo);
    if (m) set("estudioJuridico", m.estudio);
  }, [caso.localidad, mapeo, estudioAuto]);

  useEffect(() => {
    if (caso.estado === "Firmo" && !caso.fechaFirma) {
      set("fechaFirma", hoyISO());
      set("alertaFirmaEnviada", false);
    }
  }, [caso.estado]);

  // ============ MANEJAR REPORTES ============
  const agregarReporte = () => {
    if (!nuevoReporteTexto.trim()) {
      showToast("Escribe el texto del reporte", "warning");
      return;
    }
    let entradas = caso.reporteHistory || [];
    entradas = [
      ...entradas,
      {
        fecha: nuevoReporteFecha.trim() || hoyDDMM(),
        texto: capitalizarSiMayus(sanitizeString(nuevoReporteTexto)),
      },
    ];
    setCaso((c) => ({ ...c, reporteHistory: entradas }));
    setNuevoReporteTexto("");
    setNuevoReporteFecha("");
    soundSystem.playAction("save");
    showToast("Reporte agregado correctamente", "success");
  };

  const iniciarEdicionReporte = (index) => {
    const reporte = caso.reporteHistory[index];
    if (!reporte) return;
    setEditandoReporteIndex(index);
    setEditandoReporteTexto(reporte.texto);
    setEditandoReporteFecha(reporte.fecha || "");
  };

  const guardarEdicionReporte = () => {
    if (!editandoReporteTexto.trim()) {
      showToast("El texto del reporte no puede estar vacío", "warning");
      return;
    }
    const entradas = [...caso.reporteHistory];
    entradas[editandoReporteIndex] = {
      fecha: editandoReporteFecha.trim() || hoyDDMM(),
      texto: capitalizarSiMayus(sanitizeString(editandoReporteTexto)),
    };
    setCaso((c) => ({ ...c, reporteHistory: entradas }));
    cancelarEdicionReporte();
    soundSystem.playAction("save");
    showToast("Reporte actualizado correctamente", "success");
  };

  const cancelarEdicionReporte = () => {
    setEditandoReporteIndex(null);
    setEditandoReporteTexto("");
    setEditandoReporteFecha("");
  };

  const eliminarReporte = (index) => {
    const entradas = caso.reporteHistory.filter((_, i) => i !== index);
    setCaso((c) => ({ ...c, reporteHistory: entradas }));
    setConfirmEliminarReporte(null);
    soundSystem.playAction("delete");
    showToast("Reporte eliminado", "info");
  };

  const guardar = () => {
    const validation = validateCaso(caso);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    setValidationErrors([]);
    onSave(caso);
    showToast(
      casoInicial.nombre ? "Caso actualizado" : "Caso creado",
      "success"
    );
  };

  const handleDeleteConfirm = () => {
    onDelete(caso.id);
    onClose();
    showToast("Caso eliminado", "info");
  };

  const addTag = (tag) => {
    if (!tag) return;
    const tags = [...(caso.tags || [])];
    const sanitized = sanitizeString(tag);
    if (!tags.includes(sanitized)) {
      tags.push(sanitized);
      set("tags", tags);
      showToast("Etiqueta agregada", "success");
    }
  };

  const removeTag = (tag) => {
    set(
      "tags",
      (caso.tags || []).filter((t) => t !== tag)
    );
    showToast("Etiqueta eliminada", "info");
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="caso-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl my-6"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="modal-header">
          <div>
            <div
              className="text-lg font-bold"
              id="caso-modal-title"
              style={{ color: "var(--color-text)" }}
            >
              {casoInicial.nombre ? "Editar caso" : "Nuevo caso"}
            </div>
            {caso.estado && (
              <div className="mt-1.5">
                <PillMemo estado={caso.estado} small />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
              aria-label="Cerrar"
            >
              <X size={18} style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {validationErrors.length > 0 && (
            <div
              className="rounded-md p-3"
              style={{
                backgroundColor: "var(--color-danger)22",
                border: "1px solid var(--color-danger)55",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--color-danger)" }}
              >
                Errores de validación:
              </div>
              <ul
                className="text-xs mt-1"
                style={{ color: "var(--color-danger)" }}
              >
                {validationErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="rounded-lg"
            style={{ border: "1px dashed var(--color-border)" }}
          >
            <button
              onClick={() => setShowPegar((s) => !s)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors hover:opacity-70"
              style={{ color: "var(--color-accent)" }}
            >
              <span className="flex items-center gap-1.5">
                <ClipboardPaste size={14} /> Pegar ficha completa
              </span>
              <ChevronDown
                size={14}
                style={{ transform: showPegar ? "rotate(180deg)" : "none" }}
              />
            </button>
            {showPegar && (
              <div className="px-3 pb-3">
                <TextArea
                  rows={4}
                  placeholder={`NOMBRE:
TELEFONO:
LOCALIDAD:
ART:
PROFESION:
INGRESO:
LESION:
CITA:
OBSERVACIONES:
TAGS:
COMENTARIOS:`}
                  value={pegado}
                  onChange={(e) => setPegado(e.target.value)}
                  aria-label="Pegar ficha"
                />
                <Btn onClick={procesarPegado} className="mt-2">
                  Procesar y completar
                </Btn>
              </div>
            )}
          </div>

          {duplicado && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
              style={{
                backgroundColor: "var(--color-danger)22",
                color: "var(--color-danger)",
                border: "1px solid var(--color-danger)55",
              }}
            >
              <AlertTriangle size={14} /> Ya existe otro caso con este teléfono
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <TextInput
                type="date"
                value={caso.fecha}
                onChange={(e) => set("fecha", e.target.value)}
              />
            </Field>
            <Field label="Estado">
              <Select
                value={caso.estado}
                onChange={(e) => set("estado", e.target.value)}
                options={getEstados(config).map((e) => ({ value: e.v, label: e.v }))}
              />
            </Field>
            <Field label="Nombre" className="col-span-2">
              <TextInput
                value={caso.nombre}
                onChange={(e) => set("nombre", e.target.value.toUpperCase())}
                placeholder="Apellido y nombre"
              />
            </Field>
            <Field label="Teléfono">
              <TextInput
                value={caso.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                placeholder="Número de contacto"
              />
            </Field>
            <Field label="Localidad">
              <TextInput
                value={caso.localidad}
                onChange={(e) => set("localidad", e.target.value.toUpperCase())}
                placeholder="Ciudad"
              />
            </Field>
            <Field label="Aseguradora">
              <TextInput
                list="lista-aseguradoras"
                value={caso.aseguradora}
                onChange={(e) =>
                  set("aseguradora", e.target.value.toUpperCase())
                }
                placeholder="ART"
              />
              <datalist id="lista-aseguradoras">
                {[
                  ...new Set(casos.map((c) => c.aseguradora).filter(Boolean)),
                ].map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
            <Field label="Profesión">
              <TextInput
                value={caso.profesion}
                onChange={(e) => set("profesion", e.target.value)}
                placeholder="Ocupación"
              />
            </Field>
            <Field label="Ingreso">
              <TextInput
                value={caso.ingreso}
                onChange={(e) => set("ingreso", e.target.value)}
                placeholder="Fecha de ingreso"
              />
            </Field>
            <Field label="Lesión">
              <TextInput
                value={caso.lesion}
                onChange={(e) => set("lesion", e.target.value)}
                placeholder="Tipo de lesión"
                onBlur={() => {
                  if (!caso.tipoIngreso)
                    set("tipoIngreso", sugerirTipoIngreso(caso.lesion));
                }}
              />
            </Field>
            <Field label="Tipo de Ingreso">
              <TextInput
                list="lista-tipos"
                value={caso.tipoIngreso}
                onChange={(e) => set("tipoIngreso", e.target.value)}
                placeholder="Tipo"
              />
              <datalist id="lista-tipos">
                {getTiposIngreso(config).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field label="Cita">
              <TextInput
                value={caso.cita}
                onChange={(e) => set("cita", e.target.value)}
                placeholder="DD/MM HH:MM"
              />
            </Field>
            <Field label="Estudio Jurídico" className="col-span-2">
              <div className="flex gap-2">
                <TextInput
                  list="lista-estudios"
                  className="flex-1"
                  value={caso.estudioJuridico}
                  onChange={(e) => {
                    set("estudioJuridico", e.target.value);
                    setEstudioAuto(false);
                  }}
                  placeholder="Estudio"
                />
                <BtnOutline
                  onClick={() => setEstudioAuto(true)}
                  size="sm"
                  color="var(--color-accent)"
                  icon={Plus}
                >
                  Auto
                </BtnOutline>
              </div>
              <datalist id="lista-estudios">
                {[...new Set(mapeo.map((m) => m.estudio))].map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            </Field>
            <Field label="Etiquetas" className="col-span-2">
              <TagsManager
                tags={caso.tags || []}
                setTags={(t) => set("tags", t)}
                onAddTag={addTag}
                onRemoveTag={removeTag}
              />
            </Field>
            <Field label="Observaciones" className="col-span-2">
              <TextArea
                rows={2}
                value={caso.observaciones}
                onChange={(e) => set("observaciones", e.target.value)}
                placeholder="Notas adicionales"
              />
            </Field>
          </div>

          {/* SECCIÓN DE REPORTES CON EDICIÓN */}
          <div
            className="pt-3"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Historial de reportes
            </div>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {(!caso.reporteHistory || caso.reporteHistory.length === 0) && (
                <div
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Sin reportes cargados.
                </div>
              )}
              {caso.reporteHistory &&
                caso.reporteHistory.map((r, i) => {
                  const isEditing = editandoReporteIndex === i;
                  return (
                    <div
                      key={i}
                      className="rounded p-2"
                      style={{
                        backgroundColor: isEditing
                          ? "var(--color-surface)"
                          : "var(--color-surface2)",
                        border: isEditing
                          ? "1px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
                      }}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <TextInput
                              placeholder="DD/MM"
                              style={{ width: 80 }}
                              value={editandoReporteFecha}
                              onChange={(e) =>
                                setEditandoReporteFecha(e.target.value)
                              }
                            />
                            <TextInput
                              className="flex-1"
                              placeholder="Texto del reporte..."
                              value={editandoReporteTexto}
                              onChange={(e) =>
                                setEditandoReporteTexto(e.target.value)
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Btn
                              onClick={guardarEdicionReporte}
                              size="sm"
                              color="var(--color-success)"
                            >
                              Guardar
                            </Btn>
                            <BtnOutline
                              onClick={cancelarEdicionReporte}
                              size="sm"
                              color="var(--color-text-muted)"
                            >
                              Cancelar
                            </BtnOutline>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span style={{ color: "var(--color-accent)" }}>
                              ({sanitizeString(r.fecha)}){" "}
                            </span>
                            <span style={{ color: "var(--color-text)" }}>
                              {sanitizeString(r.texto)}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => iniciarEdicionReporte(i)}
                              className="p-1 rounded hover:bg-white/5 transition-colors"
                              style={{ color: "var(--color-text-muted)" }}
                              aria-label="Editar reporte"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmEliminarReporte(i)}
                              className="p-1 rounded hover:bg-white/5 transition-colors"
                              style={{ color: "var(--color-danger)" }}
                              aria-label="Eliminar reporte"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex gap-2">
              <TextInput
                placeholder="DD/MM"
                style={{ width: 100 }}
                value={nuevoReporteFecha}
                onChange={(e) => setNuevoReporteFecha(e.target.value)}
              />
              <TextInput
                className="flex-1"
                placeholder="Agregar novedad..."
                value={nuevoReporteTexto}
                onChange={(e) => setNuevoReporteTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarReporte();
                  }
                }}
              />
              <Btn onClick={agregarReporte} size="sm" icon={Plus}>
                Agregar
              </Btn>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-1.5">
            {onNuevaNota && (
              <BtnOutline onClick={() => onNuevaNota(caso)} icon={FileText} size="sm">Notas</BtnOutline>
            )}
            {onNuevoEvento && (
              <BtnOutline onClick={() => onNuevoEvento(caso)} icon={Calendar} size="sm">Calendario</BtnOutline>
            )}
            {casoInicial.nombre ? (
              <BtnOutline
                onClick={() => setConfirmEliminar(true)}
                color="var(--color-danger)"
                size="sm"
                icon={Trash2}
              >
                Eliminar
              </BtnOutline>
            ) : null}
          </div>
          <div className="flex gap-2">
            <BtnOutline
              onClick={onClose}
              color="var(--color-text-muted)"
              size="sm"
            >
              Cancelar
            </BtnOutline>
            <Btn onClick={guardar} icon={Save} size="sm">
              Guardar
            </Btn>
          </div>
        </div>
      </div>

      {/* ConfirmDialog para eliminar caso */}
      <ConfirmDialog
        open={confirmEliminar}
        title="Eliminar prospecto"
        message={`Seguro que quieres eliminar a "${
          caso.nombre || "este prospecto"
        }"?`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* ConfirmDialog para eliminar reporte */}
      <ConfirmDialog
        open={confirmEliminarReporte !== null}
        title="Eliminar reporte"
        message="¿Seguro que quieres eliminar este reporte?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminarReporte(null)}
        onConfirm={() => eliminarReporte(confirmEliminarReporte)}
      />
    </div>
  );
}
