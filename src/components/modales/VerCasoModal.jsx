import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Edit3, MessageSquare, Trash2, FileText, Calendar, ClipboardList, ChevronDown, ChevronRight, Link, Activity, Clock, AlertTriangle, Copy, Check } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { PillMemo } from "../common/Pill";
import { OrigenBadge } from "../common/OrigenBadge";
import { ComentariosUI } from "./ComentariosUI";
import { CaseTimeline } from "./CaseTimeline";
import { sanitizeString } from "../../utils/sanitize";
import { formatDateWithConfig } from "../../utils/configFormatters";
import { PhoneLink } from "../common/PhoneLink";
import useAppStore from "../../core/store/useAppStore";
import { getEstadoAccent } from "../../utils/catalogos";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useClipboard } from "../../hooks/useClipboard";
import { soundSystem } from "../../core/notifications/soundSystem";
import {
  getCaseHistory,
  resolveLastActivity,
  getInactivityInfo,
  INACTIVIDAD_DEFAULT_DIAS,
  TIPOS_INTERACCION,
} from "../../core/cases/caseHistory";

function soloDia(x) {
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
}

function formatearActividad(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const hoy = new Date();
  const dias = Math.round((soloDia(hoy) - soloDia(d)) / 86400000);
  const hora = d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dias === 0) return `Hoy, ${hora}`;
  if (dias === 1) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  })}, ${hora}`;
}

export function VerCasoModal({
  caso,
  config,
  onClose,
  onEdit,
  onComentarios,
  onDelete,
  onNuevaNota,
  onNuevoEvento,
  onReporteRapido,
  onNavigateToNote,
  showToast,
}) {
  const dialogRef = useRef(null);
  useDialogA11y(dialogRef, !!caso);
  const notas = useAppStore((s) => s.notes);
  const eventos = useAppStore((s) => s.events);
  const estadoColor = getEstadoAccent(config, caso?.estado) || "#6B7280";
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [mostrarNotas, setMostrarNotas] = useState(true);
  const [mostrarEventos, setMostrarEventos] = useState(true);
  const [mostrarTimeline, setMostrarTimeline] = useState(true);
  const [comentariosLocales, setComentariosLocales] = useState([]);
  const [historial, setHistorial] = useState([]);
  const { copiar: copiarNombre, copiado: nombreCopiado } = useClipboard();
  const { copiar: copiarTelefono, copiado: telefonoCopiado } = useClipboard();

  useEffect(() => {
    if (caso && caso.comentarios) {
      setComentariosLocales(caso.comentarios);
    } else {
      setComentariosLocales([]);
    }
  }, [caso]);

  // Historial: se carga solo al abrir el detalle (no al iniciar la app).
  useEffect(() => {
    let activo = true;
    if (!caso?.id) {
      setHistorial([]);
      return undefined;
    }
    getCaseHistory(caso.id).then((rows) => {
      if (activo) setHistorial(rows);
    });
    return () => {
      activo = false;
    };
  }, [caso?.id, caso?.updatedAt]);

  const inactividad = useMemo(
    () =>
      getInactivityInfo(caso, {
        thresholdDays: config?.seguimiento?.diasInactividad || INACTIVIDAD_DEFAULT_DIAS,
      }),
    [caso, config]
  );

  const proximoSeguimiento = useMemo(() => {
    if (!caso?.id) return null;
    const hoyISO = new Date().toISOString().slice(0, 10);
    return (
      eventos
        .filter((e) => (e.relatedCaseIds || []).includes(caso.id))
        .filter((e) => (e.startDate || "") >= hoyISO)
        .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))[0] ||
      null
    );
  }, [eventos, caso]);

  const notasFiltradas = useMemo(() => {
    if (!caso) return [];
    return notas.filter((n) => (n.relatedCaseIds || []).includes(caso.id));
  }, [notas, caso]);

  const eventosFiltrados = useMemo(() => {
    if (!caso) return [];
    return eventos.filter((e) => (e.relatedCaseIds || []).includes(caso.id));
  }, [eventos, caso]);

  if (!caso) return null;

  const handleAddComentario = (texto, tipo = "") => {
    const nuevoComentario = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fecha: new Date().toISOString(),
      texto: texto.trim(),
      usuario: "Usuario",
      ...(tipo ? { tipo } : {}),
    };
    const nuevosComentarios = [...comentariosLocales, nuevoComentario];
    setComentariosLocales(nuevosComentarios);
    // actualizarCaso detecta el comentario nuevo y registra la interacción
    // en el historial (la fuente de datos sigue siendo caso.comentarios).
    onComentarios({ ...caso, comentarios: nuevosComentarios });
    soundSystem.playAction("save");
    if (showToast) showToast("Interacción registrada", "success");
  };

  const handleDeleteComentario = (id) => {
    const nuevosComentarios = comentariosLocales.filter((c) => c.id !== id);
    setComentariosLocales(nuevosComentarios);
    onComentarios({ ...caso, comentarios: nuevosComentarios });
    soundSystem.playAction("delete");
    if (showToast) showToast("Comentario eliminado", "info");
  };

  const handleDeleteCaso = () => {
    if (confirm("¿Eliminar este caso?")) {
      onDelete(caso.id);
      onClose();
      if (showToast) showToast("Caso eliminado", "info");
    }
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ver-caso-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl my-6 animate-scale-in"
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          borderTop: `3px solid ${estadoColor}`,
          boxShadow: "0 8px 32px var(--color-shadow)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: "1px solid var(--color-border)",
            borderLeft: `3px solid ${estadoColor}`,
          }}
        >
          <div>
            <div
              className="text-lg font-semibold"
              id="ver-caso-title"
              style={{ color: "var(--color-text)" }}
            >
              Detalle del caso
            </div>
            <div className="mt-2 flex items-center gap-3">
              <PillMemo estado={caso.estado} />
              {caso.leido === false && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-accent)22",
                    color: "var(--color-accent)",
                  }}
                >
                  Nuevo
                </span>
              )}
            </div>
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

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* RESUMEN RÁPIDO DE SEGUIMIENTO */}
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Activity size={9} /> Última actividad
                </span>
                <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                  {formatearActividad(resolveLastActivity(caso))}
                </div>
              </div>
              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Clock size={9} /> Último cambio
                </span>
                <div
                  className="text-xs font-semibold truncate"
                  title={historial[0]?.description || ""}
                  style={{ color: "var(--color-text)" }}
                >
                  {historial[0]?.title || "—"}
                </div>
              </div>
              <div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Calendar size={9} /> Próximo seguimiento
                </span>
                <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                  {proximoSeguimiento
                    ? formatDateWithConfig(proximoSeguimiento.startDate)
                    : "Sin agenda"}
                </div>
              </div>
            </div>
            {inactividad.inactive && (
              <div
                className="flex items-center gap-1.5 mt-2 pt-2 text-[11px] font-semibold"
                style={{
                  borderTop: "1px solid var(--color-border)",
                  color: "var(--color-warning)",
                }}
              >
                <AlertTriangle size={12} />
                Sin actividad hace {inactividad.days} día{inactividad.days === 1 ? "" : "s"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Nombre</span>
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-medium flex-1" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.nombre) || "—"}</div>
                <button
                  onClick={() => copiarNombre(sanitizeString(caso.nombre) || "")}
                  className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-200"
                  style={{
                    backgroundColor: nombreCopiado ? "var(--color-success)" : "transparent",
                    color: nombreCopiado ? "#fff" : "var(--color-text-muted)",
                  }}
                  title="Copiar nombre"
                  aria-label="Copiar nombre"
                >
                  {nombreCopiado ? <><Check size={11} /> Copiado</> : <Copy size={11} />}
                </button>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Teléfono</span>
              <div className="flex items-center gap-1.5">
                <div className="text-sm flex-1"><PhoneLink telefono={caso.telefono} size="md" showIcon={false} /></div>
                <button
                  onClick={() => copiarTelefono(caso.telefono || "")}
                  className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-200"
                  style={{
                    backgroundColor: telefonoCopiado ? "var(--color-success)" : "transparent",
                    color: telefonoCopiado ? "#fff" : "var(--color-text-muted)",
                  }}
                  title="Copiar teléfono"
                  aria-label="Copiar teléfono"
                >
                  {telefonoCopiado ? <><Check size={11} /> Copiado</> : <Copy size={11} />}
                </button>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Localidad</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.localidad) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Aseguradora</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.aseguradora) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Profesión</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.profesion) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Fecha</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{formatDateWithConfig(caso.fecha) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Ingreso</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.ingreso) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Lesión</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.lesion) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Tipo de Ingreso</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.tipoIngreso) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Cita</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.cita) || "—"}</div>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Estudio Jurídico</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.estudioJuridico) || "—"}</div>
            </div>
            {caso.tags && caso.tags.length > 0 && (
              <div className="col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Etiquetas</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {caso.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-accent)22", color: "var(--color-accent)", border: "1px solid var(--color-accent)44" }}>
                      {sanitizeString(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Observaciones</span>
              <div className="text-sm" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.observaciones) || "—"}</div>
            </div>
          </div>

          {/* NOTAS VINCULADAS */}
          {notasFiltradas.length > 0 && (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <button onClick={() => setMostrarNotas(!mostrarNotas)} className="flex items-center gap-2 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--color-accent)" }}>
                {mostrarNotas ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FileText size={14} /> Notas vinculadas ({notasFiltradas.length})
              </button>
              {mostrarNotas && (
                <div className="mt-2 space-y-1">
                  {notasFiltradas.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:opacity-70 transition-opacity"
                      style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                      onClick={() => onNavigateToNote && onNavigateToNote(n.id)}
                    >
                      <Link size={10} style={{ color: "var(--color-text-muted)" }} />
                      <span className="font-medium" style={{ color: "var(--color-text)" }}>{n.title || "Sin título"}</span>
                      <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{formatDateWithConfig(n.updatedAt || n.createdAt || "")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EVENTOS VINCULADOS */}
          {eventosFiltrados.length > 0 && (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <button onClick={() => setMostrarEventos(!mostrarEventos)} className="flex items-center gap-2 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--color-accent)" }}>
                {mostrarEventos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Calendar size={14} /> Eventos vinculados ({eventosFiltrados.length})
              </button>
              {mostrarEventos && (
                <div className="mt-2 space-y-1">
                  {eventosFiltrados.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      <Calendar size={10} style={{ color: "var(--color-text-muted)" }} />
                      <span className="font-medium" style={{ color: "var(--color-text)" }}>{e.title || "Sin título"}</span>
                      <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{formatDateWithConfig(e.startDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMENTARIOS */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <button onClick={() => setMostrarComentarios(!mostrarComentarios)} className="flex items-center gap-2 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--color-accent)" }}>
              {mostrarComentarios ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <MessageSquare size={14} />
              Comentarios ({comentariosLocales.length || 0})
            </button>
            {mostrarComentarios && (
              <div className="mt-3 animate-slide-up">
                <ComentariosUI
                  comentarios={comentariosLocales}
                  onAdd={handleAddComentario}
                  onDelete={handleDeleteComentario}
                  showToast={showToast}
                  usuario="Usuario"
                  tiposInteraccion={TIPOS_INTERACCION}
                />
              </div>
            )}
          </div>

          {/* TIMELINE / HISTORIAL DEL CASO */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <button
              onClick={() => setMostrarTimeline(!mostrarTimeline)}
              className="flex items-center gap-2 text-xs font-semibold hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-accent)" }}
              aria-expanded={mostrarTimeline}
            >
              {mostrarTimeline ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Activity size={14} /> Historial ({historial.length})
            </button>
            {mostrarTimeline && (
              <div className="mt-2">
                <CaseTimeline eventos={historial} config={config} />
              </div>
            )}
          </div>

          {/* Historial de reportes */}
          <div className="pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Historial de reportes
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto mt-1">
              {(!caso.reporteHistory || caso.reporteHistory.length === 0) && (
                <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sin reportes cargados.</div>
              )}
              {caso.reporteHistory && caso.reporteHistory.map((r, i) => (
                <div key={i} className="text-xs flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                  <OrigenBadge origen={r.origen} />
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "var(--color-accent)" }}>
                    [{sanitizeString(r.fecha)}]
                  </span>
                  <span className="flex-1">{sanitizeString(r.texto)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={() => { onEdit(caso); onClose(); }} icon={Edit3} size="sm">Editar</Btn>
            {onReporteRapido && (
              <Btn onClick={() => { onReporteRapido(caso); onClose(); }} icon={ClipboardList} size="sm" color="var(--color-accent)">Reporte</Btn>
            )}
            {onNuevaNota && (
              <BtnOutline onClick={() => onNuevaNota(caso)} icon={FileText} size="sm">Notas</BtnOutline>
            )}
            {onNuevoEvento && (
              <BtnOutline onClick={() => onNuevoEvento(caso)} icon={Calendar} size="sm">Calendario</BtnOutline>
            )}
          </div>
          <div className="flex gap-1.5">
            <BtnOutline onClick={handleDeleteCaso} color="var(--color-danger)" size="sm" icon={Trash2}>Eliminar</BtnOutline>
            <BtnOutline onClick={onClose} color="var(--color-text-muted)" size="sm">Cerrar</BtnOutline>
          </div>
        </div>
      </div>
    </div>
  );
}
