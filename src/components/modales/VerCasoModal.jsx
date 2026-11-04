import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, lazy, Suspense } from "react";
// N01 (1.10.1): portal a document.body — el modal vivía en el subárbol de
// Dashboard y cualquier transform/filter del ancestro (p. ej. hover zoom)
// rompía position:fixed y su scroll-lock.
import { createPortal } from "react-dom";
// v1.10.11: se quitaron ChevronDown/ChevronRight (ya no hay acordeones: las
// secciones son tabs) y Plus (bajó el alta de reportes). Se agregaron los
// iconos de los 13 labels del grid de información.
import { X, Edit3, MessageSquare, Trash2, FileText, Calendar, ClipboardList, Link, Activity, Clock, AlertTriangle, Copy, Check, ChevronLeft, Building2, Scale, CalendarClock, User, Phone, MapPin, Briefcase, CalendarDays, LogIn, HeartPulse, Tag, Info } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { PillMemo } from "../common/Pill";
import { OrigenBadge, OrigenSelector, getOrigenConfig } from "../common/OrigenBadge";
import { TextInput } from "../common/TextInput";
// v1.10.11: transformación de texto (MAYÚSCULAS/minúsculas/oración/título/
// alternado/quitar espacios) para el reporte en edición. Se quitó
// TemplateSelector (vivía solo en el bloque de alta de reportes, que salió).
import { TextCaseToolbar } from "../common/TextCaseToolbar";
import { ComentariosUI } from "./ComentariosUI";
// Optimización 1.6.6: CaseTimeline se carga bajo demanda (solo al abrir el modal).
const CaseTimeline = lazy(() =>
  import("./CaseTimeline").then((m) => ({ default: m.CaseTimeline }))
);
import { sanitizeString } from "../../utils/sanitize";
import { formatDateWithConfig } from "../../utils/configFormatters";
// v1.10.11: se quitó capitalizarSiMayus de los reportes — el guardado ya no
// reescribe el formato: si el operador eligió MAYÚSCULAS (u otro modo) con la
// toolbar, se respeta tal cual al guardar.
// v1.9.7 (fix B3): hoyISO (día en hora local) para "próximo seguimiento".
import { hoyDDMM, hoyISO } from "../../utils/dateUtils";
import { PhoneLink } from "../common/PhoneLink";
import useAppStore from "../../core/store/useAppStore";
import { getEstadoAccent } from "../../utils/catalogos";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { lockBodyScroll, unlockBodyScroll } from "../../utils/bodyScrollLock";
import { useClipboard } from "../../hooks/useClipboard";
import { soundSystem } from "../../core/notifications/soundSystem";
import { onKeyActivate } from "../../utils/a11y";
import { useDelayedClose } from "../../hooks/useAnimatedPresence";
import { ConfirmDialog } from "../common/ConfirmDialog";
import {
  getCaseHistory,
  resolveLastActivity,
  getInactivityInfo,
  INACTIVIDAD_DEFAULT_DIAS,
  TIPOS_INTERACCION,
} from "../../core/cases/caseHistory";
// v1.10.11: se quitaron getCasesByInsurer/getCasesByLawFirm (alimentaban
// las pills "+N" de casos con misma ART/estudio, eliminadas del grid) y
// getRelatedTools (alimentaba Objeciones, que salió del modal).
import {
  getRelatedNotes,
  getRelatedEvents,
} from "../../core/cases/caseRelations";
import InlineNoteForm from "./InlineNoteForm";
import InlineEventForm from "./InlineEventForm";

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
  onActualizarCaso,
  onDelete,
  onNuevaNota,
  onNuevoEvento,
  onReporteRapido,
  onNavigateToNote,
  onNavigateToEvent,
  navigationStack = [],
  onBackNavigation,
  covered = false,
  showToast,
  // v1.10.11: se quitaron de la firma casos / onNavigateInsurer /
  // onNavigateLawFirm (alimentaban las pills "+N", eliminadas) y
  // condicionales / speechs / objeciones (sección Objeciones eliminada del
  // modal). App.jsx ya no los pasa.
}) {
  const dialogRef = useRef(null);
  const { isClosing, startClose } = useDelayedClose(onClose);
  const a11yEnabled = !!caso && !covered;
  useDialogA11y(dialogRef, a11yEnabled, { onEscape: startClose });

  const casoId = caso?.id;
  useLayoutEffect(() => {
    if (!casoId) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [casoId]);
  const notas = useAppStore((s) => s.notes);
  const eventos = useAppStore((s) => s.events);
  const estadoColor = getEstadoAccent(config, caso?.estado) || "#6B7280";
  // v1.10.11: las 4 secciones del modal (Herramientas / Comentarios /
  // Historial / Reportes) pasan de acordeones independientes a un segmented
  // control con UN solo estado visible a la vez (default Herramientas).
  // Reemplaza: mostrarComentarios / mostrarNotas / mostrarEventos /
  // mostrarTimeline / mostrarHerramientas / mostrarReportes.
  const [seccionActiva, setSeccionActiva] = useState("herramientas");
  const [comentariosLocales, setComentariosLocales] = useState([]);
  const [historial, setHistorial] = useState([]);
  const { copiar: copiarNombre, copiado: nombreCopiado } = useClipboard();
  const { copiar: copiarTelefono, copiado: telefonoCopiado } = useClipboard();
  const [mostrarFormNota, setMostrarFormNota] = useState(false);
  const [mostrarFormEvento, setMostrarFormEvento] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // v1.10.11: se quitaron nuevoReporteTexto/Fecha/Origen — el alta de
  // reportes salió del modal (se crea solo desde "Reporte rápido");
  // edición y borrado se conservan.
  const [editandoReporteIndex, setEditandoReporteIndex] = useState(null);
  const [editandoReporteTexto, setEditandoReporteTexto] = useState("");
  const [editandoReporteFecha, setEditandoReporteFecha] = useState("");
  const [editandoReporteOrigen, setEditandoReporteOrigen] = useState("Operador");
  const [confirmEliminarReporte, setConfirmEliminarReporte] = useState(null);

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
    // v1.9.7 (fix B3): día en hora local (antes: fecha en UTC).
    const hoy = hoyISO();
    return (
      eventos
        .filter((e) => (e.relatedCaseIds || []).includes(caso.id))
        .filter((e) => (e.startDate || "") >= hoy)
        .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))[0] ||
      null
    );
  }, [eventos, caso]);

  const notasFiltradas = useMemo(() => {
    if (!caso) return [];
    return getRelatedNotes(caso.id, notas);
  }, [notas, caso]);

  const eventosFiltrados = useMemo(() => {
    if (!caso) return [];
    return getRelatedEvents(caso.id, eventos);
  }, [eventos, caso]);

  // v1.10.11: se eliminaron los memos casosByInsurer / casosByLawFirm (pills
  // "+N" de casos con misma ART/estudio) y toolsData (Objeciones). También
  // hasInsurer/hasLawFirm: los labels del grid ahora llevan el icono y el
  // valor es texto puro igual que el resto de los campos.
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
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteCaso = () => {
    setConfirmDeleteOpen(false);
    onDelete(caso.id);
    startClose();
    if (showToast) showToast("Caso eliminado", "info");
  };

  // ============ EDITAR / BORRAR REPORTES INLINE (1.8.1) ============
  // v1.10.11: se eliminó agregarReporte — el alta de reportes vive solo en
  // "Reporte rápido" (coherencia: desde el modal del caso solo se edita/borra).
  const persistirReportes = (entradas) => {
    if (onActualizarCaso) {
      onActualizarCaso({ ...caso, reporteHistory: entradas });
    }
  };

  const iniciarEdicionReporte = (index) => {
    const reporte = caso.reporteHistory?.[index];
    if (!reporte) return;
    setEditandoReporteIndex(index);
    setEditandoReporteTexto(reporte.texto);
    setEditandoReporteFecha(reporte.fecha || "");
    setEditandoReporteOrigen(reporte.origen || "Operador");
  };

  const guardarEdicionReporte = () => {
    if (!editandoReporteTexto.trim()) {
      if (showToast) showToast("El texto del reporte no puede estar vacío", "warning");
      return;
    }
    const entradas = [...caso.reporteHistory];
    entradas[editandoReporteIndex] = {
      fecha: editandoReporteFecha.trim() || hoyDDMM(),
      texto: sanitizeString(editandoReporteTexto),
      origen: editandoReporteOrigen || "Operador",
    };
    persistirReportes(entradas);
    cancelarEdicionReporte();
    soundSystem.playAction("save");
    if (showToast) showToast("Reporte actualizado correctamente", "success");
  };

  const cancelarEdicionReporte = () => {
    setEditandoReporteIndex(null);
    setEditandoReporteTexto("");
    setEditandoReporteFecha("");
    setEditandoReporteOrigen("Operador");
  };

  const eliminarReporte = (index) => {
    const entradas = caso.reporteHistory.filter((_, i) => i !== index);
    persistirReportes(entradas);
    setConfirmEliminarReporte(null);
    soundSystem.playAction("delete");
    if (showToast) showToast("Reporte eliminado", "info");
  };

  const handleBuscarProlegal = () => {
    const nombre = (caso.nombre || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!nombre) {
      if (showToast) showToast("No se puede buscar: el caso no tiene un nombre válido", "warning");
      return;
    }
    const url = `https://prolegal.com.ar/search?q=${encodeURIComponent(nombre)}`;
    window.open(url, "prolegal-busqueda", "noopener,noreferrer");
  };

  // N01 (1.10.1): el diálogo se monta en document.body vía portal.
  return createPortal(
    <div
      ref={dialogRef}
      className={`fixed inset-0 z-modal flex items-start justify-center overflow-y-auto p-4 ${
        isClosing ? "animate-fade-out" : "animate-fade-in"
      }`}
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ver-caso-title"
      {...(covered ? { inert: "" } : {})}
    >
      {/* 1.10.3 (anti-doble-scrollbar): la card se limita al viewport
          (max-h = 100vh − overlay p-4 16px + my-6 24px por lado = 5rem) y
          pasa a flex-col para que SOLO el body tenga scroll (mismo patrón
          que Modal.jsx / EventModal). Antes la card no tenía tope y el body
          además tenía max-h-[60vh]: podían convivir la barra del overlay y
          la del cuerpo → dos barras en el mismo modal, y el contenido quedaba
          cortado a 60vh con el resto de la card vacío. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl rounded-xl my-6 max-h-[calc(100vh-5rem)] flex flex-col ${
          isClosing ? "animate-modal-rise-out" : "animate-modal-rise-in"
        }`}
        style={{
          backgroundColor: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          borderTop: `3px solid ${estadoColor}`,
          boxShadow: "0 8px 32px var(--color-shadow)",
        }}
      >
        {/* BREADCRUMB DE NAVEGACIÓN CONTEXTUAL */}
        {navigationStack.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-5 py-2 text-[11px] font-medium flex-shrink-0"
            style={{
              borderBottom: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            <button
              onClick={onBackNavigation}
              className="flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-accent)" }}
            >
              <ChevronLeft size={12} />
              Volver
            </button>
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            {navigationStack.map((item, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span style={{ color: "var(--color-text-muted)" }}>/</span>}
                <span style={{ color: "var(--color-text-muted)" }}>{item.label}</span>
              </span>
            ))}
            <span style={{ color: "var(--color-text-muted)" }}>/</span>
            <span style={{ color: "var(--color-text)" }}>{sanitizeString(caso.nombre) || "Caso"}</span>
          </div>
        )}

        {/* 1.10.3: flex-shrink-0 para que el header no se comprima cuando el
            body flex-1 reclama espacio dentro de la card con max-h. */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{
            borderBottom: "1px solid var(--color-border)",
            borderLeft: `3px solid ${estadoColor}`,
          }}
        >
          <div>
            <div
              role="button"
              tabIndex={0}
              aria-label={`Buscar ${caso.nombre || "el caso"} en Prolegal`}
              className="text-lg font-semibold cursor-pointer hover:opacity-80 transition-opacity"
              id="ver-caso-title"
              style={{ color: "var(--color-text)", textDecoration: "underline", textDecorationStyle: "solid", textUnderlineOffset: "3px", textDecorationColor: "var(--color-text-muted)" }}
              onClick={handleBuscarProlegal}
              onKeyDown={onKeyActivate(handleBuscarProlegal)}
              title="Buscar en Prolegal"
            >
              {navigationStack.length > 0
                ? sanitizeString(caso.nombre) || "Caso"
                : sanitizeString(caso.nombre) || "Sin nombre"
              }
            </div>
            <div className="mt-2 flex items-center gap-3">
              <PillMemo estado={caso.estado} />
              {caso.leido === false && (
                <span
                  className="pill-sm"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
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
              onClick={startClose}
              className="p-1.5 rounded-md hover:opacity-70 transition-opacity"
              aria-label="Cerrar"
            >
              <X size={18} style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>
        </div>

        {/* 1.10.3 (anti-doble-scrollbar): el body es el ÚNICO área de scroll
            del modal (flex-1 + min-h-0 dentro de la card con max-h, patrón
            Modal.jsx). Antes tenía max-h-[60vh]: el contenido quedaba cortado
            a 60vh con la card sin aprovechar, y en pantallas bajas cabía
            además la barra del overlay → doble barra. */}
        <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
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
                  className="text-ds-xs font-bold uppercase tracking-wider flex items-center gap-1"
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
                  className="text-ds-xs font-bold uppercase tracking-wider flex items-center gap-1"
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
                  className="text-ds-xs font-bold uppercase tracking-wider flex items-center gap-1"
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
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><User size={9} /> Nombre</span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Phone size={9} /> Teléfono</span>
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
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><MapPin size={9} /> Localidad</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.localidad) || "—"}</div>
            </div>
            <div>
              {/* v1.10.11: el icono pasa al label y el valor es texto puro
                  como el resto de los campos; se quitó la pill "+N" de casos
                  con misma ART (y su rama condicional con Building2). */}
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Building2 size={9} /> Aseguradora</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.aseguradora) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Briefcase size={9} /> Profesión</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.profesion) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><CalendarDays size={9} /> Fecha</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{formatDateWithConfig(caso.fecha) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><LogIn size={9} /> Ingreso</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.ingreso) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><HeartPulse size={9} /> Lesión</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.lesion) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><ClipboardList size={9} /> Tipo de Ingreso</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.tipoIngreso) || "—"}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><CalendarClock size={9} /> Cita</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.cita) || "—"}</div>
            </div>
            <div className="col-span-2">
              {/* v1.10.11: igual que Aseguradora — icono en el label, valor
                  en texto puro y sin la pill "+N" de casos del mismo estudio. */}
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Scale size={9} /> Estudio Jurídico</span>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.estudioJuridico) || "—"}</div>
            </div>
            {caso.tags && caso.tags.length > 0 && (
              <div className="col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Tag size={9} /> Etiquetas</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {caso.tags.map((t) => (
                    <span key={t} className="pill-sm" style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)", color: "var(--color-accent)", border: "1px solid color-mix(in srgb, var(--color-accent) 26.7%, transparent)" }}>
                      {sanitizeString(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}><Info size={9} /> Observaciones</span>
              <div className="text-sm" style={{ color: "var(--color-text)" }}>{sanitizeString(caso.observaciones) || "—"}</div>
            </div>
          </div>

          {/* ============ v1.10.11: SECCIONES COMO SEGMENTED CONTROL ============
              Patrón de LiquidacionesConfig: role="tablist" con tabs
              icono + etiqueta + conteo, y un solo role="tabpanel" visible a
              la vez (default Herramientas). Reemplaza los 6 acordeones
              independientes (mostrarHerramientas / mostrarNotas /
              mostrarEventos / mostrarComentarios / mostrarTimeline /
              mostrarReportes → un único seccionActiva). El conteo vive en la
              etiqueta del tab (consistencia: Comentarios/Historial/Reportes
              ya lo mostraban). data-tour="herramientas" resucita el ancla del
              paso 15 del tour (su selector estaba muerto: no existía en el
              modal). */}
          <div
            role="tablist"
            aria-label="Secciones del caso"
            className="flex flex-wrap gap-1 p-1 rounded-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {[
              { id: "herramientas", label: "Herramientas", icon: ClipboardList, conteo: notasFiltradas.length + eventosFiltrados.length, tour: true },
              { id: "comentarios", label: "Comentarios", icon: MessageSquare, conteo: comentariosLocales.length || 0 },
              { id: "historial", label: "Historial", icon: Activity, conteo: historial.length },
              { id: "reportes", label: "Reportes", icon: FileText, conteo: caso.reporteHistory?.length || 0 },
            ].map((tab) => {
              const activa = seccionActiva === tab.id;
              const Icono = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activa}
                  aria-controls={`panel-${tab.id}`}
                  {...(tab.tour ? { "data-tour": "herramientas" } : {})}
                  onClick={() => setSeccionActiva(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activa ? "" : "hover:opacity-70"
                  }`}
                  style={
                    activa
                      ? {
                          backgroundColor: "var(--color-accent)",
                          color: "#fff",
                          boxShadow: "0 1px 3px var(--color-shadow)",
                        }
                      : { backgroundColor: "transparent", color: "var(--color-text-muted)" }
                  }
                >
                  <Icono size={13} />
                  {tab.label} ({tab.conteo})
                </button>
              );
            })}
          </div>

          {/* v1.10.11 (altura estable): TODOS los paneles comparten
              min-h-[22rem] como línea base. Al cambiar de pestaña el modal
              mantiene su tamaño —antes cada panel tenía su altura natural y
              el cuerpo del modal "brincaba" (Herramientas con notas vs
              Comentarios vs Reportes vacío)— y solo crece cuando la pestaña
              activa tiene más contenido que esa base, hasta el max-h del
              body con su único scroll (patrón anti-doble-scrollbar). */}
          {/* PANEL: HERRAMIENTAS — acciones rápidas + formularios inline +
              Notas y Eventos vinculadas (absorbidos de sus acordeones). */}
          {seccionActiva === "herramientas" && (
            <div
              role="tabpanel"
              id="panel-herramientas"
              aria-labelledby="tab-herramientas"
              tabIndex={0}
              className="space-y-3 pt-1 min-h-[22rem]"
            >
              {(onNuevaNota || onNuevoEvento) && (
                <div className="flex flex-wrap gap-1.5">
                  {onNuevaNota && (
                    <BtnOutline
                      onClick={() => {
                        setMostrarFormNota((v) => !v);
                        setMostrarFormEvento(false);
                      }}
                      icon={FileText}
                      size="sm"
                    >Notas</BtnOutline>
                  )}
                  {onNuevoEvento && (
                    <BtnOutline
                      onClick={() => {
                        setMostrarFormEvento((v) => !v);
                        setMostrarFormNota(false);
                      }}
                      icon={Calendar}
                      size="sm"
                    >Calendario</BtnOutline>
                  )}
                </div>
              )}

          {/* FORMAS INLINE: Nota / Evento vinculados al caso (1.5.0) */}
          {mostrarFormNota && (
            <div className="pt-3">
              <InlineNoteForm
                caso={caso}
                onCancel={() => setMostrarFormNota(false)}
                onCreated={() => {
                  setMostrarFormNota(false);
                  showToast && showToast("Nota vinculada al caso creada", "success");
                }}
                onOpenFull={() => {
                  setMostrarFormNota(false);
                  onNuevaNota && onNuevaNota(caso);
                }}
              />
            </div>
          )}
          {mostrarFormEvento && (
            <div className="pt-3">
              <InlineEventForm
                caso={caso}
                onCancel={() => setMostrarFormEvento(false)}
                onCreated={() => {
                  setMostrarFormEvento(false);
                  showToast && showToast("Evento vinculado al caso creado", "success");
                }}
                onOpenFull={() => {
                  setMostrarFormEvento(false);
                  onNuevoEvento && onNuevoEvento(caso);
                }}
              />
            </div>
          )}

          {/* NOTAS VINCULADAS (v1.10.11: absorbidas por el panel
              Herramientas — sin acordeón, solo se renderiza si la pestaña
              está activa) */}
          {notasFiltradas.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                <FileText size={9} /> Notas vinculadas ({notasFiltradas.length})
              </div>
              <div className="mt-1.5 space-y-1">
                {notasFiltradas.map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir nota ${n.title || "Sin título"}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    onClick={() => onNavigateToNote && onNavigateToNote(n.id)}
                    onKeyDown={onKeyActivate(() => onNavigateToNote && onNavigateToNote(n.id))}
                  >
                    <Link size={10} style={{ color: "var(--color-text-muted)" }} />
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>{n.title || "Sin título"}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{formatDateWithConfig(n.updatedAt || n.createdAt || "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EVENTOS VINCULADOS (v1.10.11: dentro del panel Herramientas) */}
          {eventosFiltrados.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                <Calendar size={9} /> Eventos vinculados ({eventosFiltrados.length})
              </div>
              <div className="mt-1.5 space-y-1">
                {eventosFiltrados.map((e) => (
                  <div
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir evento ${e.title || "Sin título"}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    onClick={() => onNavigateToEvent && onNavigateToEvent(e.id)}
                    onKeyDown={onKeyActivate(() => onNavigateToEvent && onNavigateToEvent(e.id))}
                  >
                    <Calendar size={10} style={{ color: "var(--color-text-muted)" }} />
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>{e.title || "Sin título"}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{formatDateWithConfig(e.startDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
          )}

          {/* PANEL: COMENTARIOS */}
          {seccionActiva === "comentarios" && (
            <div
              role="tabpanel"
              id="panel-comentarios"
              aria-labelledby="tab-comentarios"
              tabIndex={0}
              className="space-y-3 pt-1 min-h-[22rem]"
            >
              <ComentariosUI
                comentarios={comentariosLocales}
                onAdd={handleAddComentario}
                onDelete={handleDeleteComentario}
                showToast={showToast}
                usuario="Usuario"
                tiposInteraccion={TIPOS_INTERACCION}
                caso={caso}
                config={config}
              />
            </div>
          )}

          {/* PANEL: HISTORIAL (v1.10.11: el Suspense/lazy se monta solo
              cuando la pestaña está activa — antes vivía siempre montado). */}
          {seccionActiva === "historial" && (
            <div
              role="tabpanel"
              id="panel-historial"
              aria-labelledby="tab-historial"
              tabIndex={0}
              className="space-y-3 pt-1 min-h-[22rem]"
            >
              <Suspense
                fallback={<div style={{ color: "var(--color-text-muted)" }}>Cargando historial...</div>}
              >
                <CaseTimeline eventos={historial} config={config} />
              </Suspense>
            </div>
          )}

          {/* PANEL: REPORTES DEL CASO — edición y borrado (1.8.1).
              v1.10.11: se quitó el alta (input "Agregar novedad...",
              OrigenSelector y TemplateSelector de alta): los reportes se
              crean solo desde "Reporte rápido". */}
          {seccionActiva === "reportes" && (
            <div
              role="tabpanel"
              id="panel-reportes"
              aria-labelledby="tab-reportes"
              tabIndex={0}
              className="space-y-3 pt-1 min-h-[22rem]"
            >
                {/* Cabecera del historial (1.10.11): título + conteo, mismo
                    lenguaje de label que "Notas vinculadas"/"Eventos
                    vinculados" y los 13 labels de la ficha. */}
                <div
                  className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <FileText size={9} /> Historial de reportes ({caso.reporteHistory?.length || 0})
                </div>
                {/* 1.10.3 (anti-doble-scrollbar): sin max-h-40 propio — la
                    lista se extiende y la baja el único scroll del body. */}
                <div className="space-y-2">
                  {(!caso.reporteHistory || caso.reporteHistory.length === 0) && (
                    <div
                      className="rounded-lg border border-dashed px-3 py-4 text-sm text-center"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
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
                          className="rounded-lg p-3"
                          style={{
                            backgroundColor: isEditing
                              ? "var(--color-surface)"
                              : "var(--color-surface2)",
                            border: isEditing
                              ? "1.5px solid var(--color-accent)"
                              : "1px solid var(--color-border)",
                            // Rail del origen (1.10.11): pinta el borde
                            // izquierdo con el color del badge OP/PA/EJ
                            // (getOrigenConfig) para escanear la lista de un
                            // vistazo; en edición manda el borde accent.
                            boxShadow: isEditing
                              ? "none"
                              : `inset 3px 0 0 ${getOrigenConfig(r.origen).color}`,
                          }}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <TextInput
                                  placeholder="DD/MM"
                                  style={{ width: 80 }}
                                  value={editandoReporteFecha}
                                  onChange={(e) => setEditandoReporteFecha(e.target.value)}
                                />
                                <TextInput
                                  className="flex-1"
                                  placeholder="Texto del reporte..."
                                  value={editandoReporteTexto}
                                  onChange={(e) => setEditandoReporteTexto(e.target.value)}
                                />
                              </div>
                              {/* v1.10.11: conversión de texto (MAYÚSCULAS/
                                  minúsculas/…) al editar un reporte. */}
                              <TextCaseToolbar
                                value={editandoReporteTexto}
                                onChange={setEditandoReporteTexto}
                                ariaLabel="Formato del reporte en edición"
                              />
                              <OrigenSelector value={editandoReporteOrigen} onChange={setEditandoReporteOrigen} />
                              <div className="flex gap-2">
                                <Btn onClick={guardarEdicionReporte} size="sm" color="var(--color-success)">
                                  Guardar
                                </Btn>
                                <BtnOutline onClick={cancelarEdicionReporte} size="sm" color="var(--color-text-muted)">
                                  Cancelar
                                </BtnOutline>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Cabecera (1.10.11): origen en badge md +
                                    fecha en chip destacado. Antes iban todo
                                    en una línea con el texto y quedaba
                                    apretado. */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <OrigenBadge origen={r.origen} size="md" />
                                  <span
                                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                                    style={{
                                      backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                                      color: "var(--color-accent)",
                                      border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
                                    }}
                                  >
                                    {sanitizeString(r.fecha)}
                                  </span>
                                </div>
                                {/* Texto en bloque propio, más grande y con
                                    interlineado (1.10.11). */}
                                <div className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
                                  {sanitizeString(r.texto)}
                                </div>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => iniciarEdicionReporte(i)}
                                  className="p-1.5 rounded-md hover:opacity-75 transition-opacity"
                                  style={{
                                    color: "var(--color-text-muted)",
                                    backgroundColor: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                  }}
                                  aria-label="Editar reporte"
                                  title="Editar reporte"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setConfirmEliminarReporte(i)}
                                  className="p-1.5 rounded-md hover:opacity-75 transition-opacity"
                                  style={{
                                    color: "var(--color-danger)",
                                    backgroundColor: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                  }}
                                  aria-label="Eliminar reporte"
                                  title="Eliminar reporte"
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
                {/* v1.10.11: acá vivía el formulario de alta de reportes
                    (DD/MM + "Agregar novedad..." + botón Agregar +
                    OrigenSelector + TemplateSelector). El alta se movió a
                    "Reporte rápido"; la lista de arriba conserva editar y
                    borrar. */}
            </div>
          )}
        </div>

        {/* Acciones: gestión a la izquierda, Cerrar a la derecha.
            1.10.3: flex-shrink-0 — con la card en flex-col + max-h, el footer
            queda fijo mientras scrollea solo el body. */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Btn onClick={() => { onEdit(caso); }} icon={Edit3} size="sm">Editar</Btn>
            {onReporteRapido && (
              <Btn onClick={() => { onReporteRapido(caso); }} icon={ClipboardList} size="sm">Reporte</Btn>
            )}
            {/* 1.8.6: se quita el botón "Reprogramar". La reprogramación se
                sigue gestionando desde ReporteRapidoModal con estado
                "Reprogramado" (requiere nueva fecha/hora de cita). */}
            <BtnOutline onClick={handleDeleteCaso} color="var(--color-danger)" size="sm" icon={Trash2}>Eliminar</BtnOutline>
          </div>
          <BtnOutline onClick={startClose} size="sm" icon={X}>Cerrar</BtnOutline>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eliminar caso"
        message={`¿Eliminar el caso "${caso?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onConfirm={confirmDeleteCaso}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <ConfirmDialog
        open={confirmEliminarReporte !== null}
        title="Eliminar reporte"
        message={`¿Eliminar este reporte? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onConfirm={() => eliminarReporte(confirmEliminarReporte)}
        onCancel={() => setConfirmEliminarReporte(null)}
      />
    </div>,
    document.body
  );
}
