import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Save,
  ClipboardList,
  Search,
  User,
  Phone,
  MapPin,
  FileText,
  Edit3,
  Trash2,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { Field } from "../common/Field";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { Select } from "../common/Select";
import { PillMemo } from "../common/Pill";
import { sanitizeString } from "../../utils/sanitize";
import { capitalizarSiMayus } from "../../utils/helpers";
import { hoyDDMM } from "../../utils/dateUtils";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { getEstados } from "../../utils/catalogos";
import { soundSystem } from "../../core/notifications/soundSystem";

export function ReporteRapidoModal({ casos, onGuardar, onClose, showToast, casoInicial, config }) {
  const dialogRef = useRef(null);
  useDialogA11y(dialogRef, true);
  const [query, setQuery] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [estado, setEstado] = useState("Cita virtual");
  const [fecha, setFecha] = useState("");
  const [texto, setTexto] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editFecha, setEditFecha] = useState("");
  const [editTexto, setEditTexto] = useState("");
  const originalLenRef = useRef(0);

  // Pre-select case if casoInicial is provided
  useEffect(() => {
    if (casoInicial) {
      setSeleccionado(casoInicial);
      setEstado(casoInicial.estado || "Cita virtual");
      setQuery(casoInicial.nombre || "");
      originalLenRef.current = (casoInicial.reporteHistory || []).length;
    }
  }, [casoInicial]);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return casos.slice(0, 8);
    return casos
      .filter(
        (c) =>
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.telefono || "").includes(q) ||
          (c.localidad || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, casos]);

  const elegir = (c) => {
    setSeleccionado(c);
    setEstado(c.estado || "Cita virtual");
    setQuery(c.nombre || "");
    originalLenRef.current = (c.reporteHistory || []).length;
    setEditIndex(null);
  };

  const actualizarHistorial = (entradas) => {
    setSeleccionado((prev) => ({ ...prev, reporteHistory: entradas }));
  };

  const iniciarEdicion = (index) => {
    const r = seleccionado.reporteHistory[index];
    if (!r) return;
    setEditIndex(index);
    setEditFecha(r.fecha || "");
    setEditTexto(r.texto || "");
  };

  const guardarEdicion = () => {
    if (!editTexto.trim()) {
      showToast("El texto del reporte no puede estar vacío", "warning");
      return;
    }
    const entradas = [...seleccionado.reporteHistory];
    entradas[editIndex] = {
      fecha: editFecha.trim() || hoyDDMM(),
      texto: capitalizarSiMayus(sanitizeString(editTexto)),
    };
    actualizarHistorial(entradas);
    setEditIndex(null);
    soundSystem.playAction("save");
    showToast("Reporte actualizado", "success");
  };

  const eliminarReporte = (index) => {
    const entradas = seleccionado.reporteHistory.filter((_, i) => i !== index);
    actualizarHistorial(entradas);
    soundSystem.playAction("delete");
    showToast("Reporte eliminado", "info");
  };

  const parseReportText = (text) => {
    const parts = text.split('//').map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map(p => {
        const m = p.match(/^\((\d{2}\/\d{2})\)\s*(.*)/);
        if (m) return { fecha: m[1], texto: m[2] || p };
        return { fecha: '', texto: p };
      });
    }
    const m = text.match(/^\((\d{2}\/\d{2})\)\s*(.*)/);
    if (m) return [{ fecha: m[1], texto: m[2] || '' }];
    return null;
  };

  const guardar = () => {
    if (!seleccionado) {
      showToast("Busca y elige un caso primero", "warning");
      return;
    }
    if (estado !== "Sin reporte" && !texto.trim()) {
      showToast("Falta el texto del reporte", "warning");
      return;
    }
    let entradas = seleccionado.reporteHistory || [];
    if (texto.trim()) {
      const parsed = parseReportText(texto.trim());
      if (parsed) {
        parsed.forEach(p => {
          entradas = [
            ...entradas,
            {
              fecha: p.fecha || fecha.trim() || hoyDDMM(),
              texto: capitalizarSiMayus(sanitizeString(p.texto)),
            },
          ];
        });
      } else {
        entradas = [
          ...entradas,
          {
            fecha: fecha.trim() || hoyDDMM(),
            texto: capitalizarSiMayus(sanitizeString(texto)),
          },
        ];
      }
    }
    const count = entradas.length - originalLenRef.current;
    onGuardar({ ...seleccionado, estado, reporteHistory: entradas });
    if (count > 0) {
      showToast(`${count} reporte${count > 1 ? 's' : ''} cargado${count > 1 ? 's' : ''} correctamente`, "success");
    } else if (count < 0) {
      showToast(`${-count} reporte${count < -1 ? 's' : ''} eliminado${count < -1 ? 's' : ''}`, "success");
    } else {
      showToast("Cambios guardados correctamente", "success");
    }
    onClose();
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reporte-rapido-title"
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
          <div
            className="text-lg font-bold flex items-center gap-2"
            id="reporte-rapido-title"
            style={{ color: "var(--color-text)" }}
          >
            <ClipboardList size={18} color="var(--color-accent)" /> Cargar
            Reporte
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
            aria-label="Cerrar"
          >
            <X size={18} style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        <div className="p-5 space-y-4" style={{ minHeight: '380px', maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <TextInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSeleccionado(null);
              }}
              placeholder="Buscar por nombre, telefono o localidad..."
              className="pl-8"
              autoFocus
            />
          </div>

          {!seleccionado && resultados.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <div
                className="text-xs font-semibold px-3 py-2"
                style={{
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                }}
              >
                Resultados ({resultados.length})
              </div>
              {resultados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => elegir(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-all flex items-center justify-between border-t"
                  style={{
                    borderColor: "var(--color-border)",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {sanitizeString(c.nombre || "Sin nombre")}
                    </div>
                    <div
                      className="flex items-center gap-3 text-xs mt-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {sanitizeString(c.telefono || "—")}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />{" "}
                        {sanitizeString(c.localidad || "—")}
                      </span>
                    </div>
                  </div>
                  <PillMemo estado={c.estado} small />
                </button>
              ))}
            </div>
          )}

          {!seleccionado && query.trim() && resultados.length === 0 && (
            <div
              className="text-center py-6"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <div className="text-sm">No se encontraron casos</div>
              <div className="text-xs">
                Intenta con otro termino de busqueda
              </div>
            </div>
          )}

          {!seleccionado && !query.trim() && (
            <div
              className="text-center py-6"
              style={{ color: "var(--color-text-muted)" }}
            >
              <User size={24} className="mx-auto mb-2 opacity-50" />
              <div className="text-sm">
                Busca un caso para cargar un reporte
              </div>
              <div className="text-xs">
                Puedes buscar por nombre, telefono o localidad
              </div>
            </div>
          )}

          {seleccionado && (
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      {sanitizeString(seleccionado.nombre)}
                    </span>
                    <PillMemo estado={seleccionado.estado} small />
                  </div>
                  <div
                    className="flex items-center gap-3 text-xs mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <span className="flex items-center gap-1">
                      <Phone size={12} />{" "}
                      {sanitizeString(seleccionado.telefono || "—")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />{" "}
                      {sanitizeString(seleccionado.localidad || "—")}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={12} />{" "}
                      {sanitizeString(seleccionado.aseguradora || "Sin ART")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSeleccionado(null);
                    setQuery("");
                  }}
                  className="text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-accent)" }}
                >
                  Cambiar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nuevo Estado">
                  <Select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    options={getEstados(config).map((e) => ({ value: e.v, label: e.v }))}
                  />
                </Field>
                <Field label="Fecha del reporte">
                  <TextInput
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    placeholder={hoyDDMM()}
                  />
                </Field>
              </div>

              <Field label="Texto del reporte" className="mt-3">
                <TextArea
                  rows={3}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe la novedad del caso..."
                  className="w-full"
                />
              </Field>

              {seleccionado.reporteHistory &&
                seleccionado.reporteHistory.length > 0 && (
                  <div className="mt-3">
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Historial de reportes
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {seleccionado.reporteHistory.map((r, i) => {
                        const isEditing = editIndex === i;
                        return (
                          <div
                            key={i}
                            className="rounded p-1.5"
                            style={{
                              backgroundColor: isEditing
                                ? "var(--color-surface2)"
                                : "transparent",
                              border: isEditing
                                ? "1px solid var(--color-accent)"
                                : "1px solid transparent",
                            }}
                          >
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <div className="flex gap-2">
                                  <TextInput
                                    placeholder="DD/MM"
                                    style={{ width: 80 }}
                                    value={editFecha}
                                    onChange={(e) => setEditFecha(e.target.value)}
                                  />
                                  <TextInput
                                    className="flex-1"
                                    placeholder="Texto del reporte..."
                                    value={editTexto}
                                    onChange={(e) => setEditTexto(e.target.value)}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Btn onClick={guardarEdicion} size="sm" color="var(--color-success)">
                                    Guardar
                                  </Btn>
                                  <BtnOutline
                                    onClick={() => setEditIndex(null)}
                                    size="sm"
                                    color="var(--color-text-muted)"
                                  >
                                    Cancelar
                                  </BtnOutline>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <span
                                  className="text-[10px] font-medium whitespace-nowrap"
                                  style={{ color: "var(--color-accent)" }}
                                >
                                  [{sanitizeString(r.fecha)}]
                                </span>
                                <span className="flex-1" style={{ color: "var(--color-text)" }}>
                                  {sanitizeString(r.texto)}
                                </span>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => iniciarEdicion(i)}
                                    className="p-1 rounded hover:bg-white/5 transition-colors"
                                    style={{ color: "var(--color-text-muted)" }}
                                    aria-label="Editar reporte"
                                    title="Editar reporte"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm("¿Eliminar este reporte?")) {
                                        eliminarReporte(i);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-white/5 transition-colors"
                                    style={{ color: "var(--color-danger)" }}
                                    aria-label="Eliminar reporte"
                                    title="Eliminar reporte"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <BtnOutline
            onClick={onClose}
            color="var(--color-text-muted)"
            size="sm"
          >
            Cancelar
          </BtnOutline>
          <Btn onClick={guardar} disabled={!seleccionado} icon={Save} size="sm">
            Cargar reporte
          </Btn>
        </div>
      </div>
    </div>
  );
}
