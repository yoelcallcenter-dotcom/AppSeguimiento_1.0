import React, { useState, useRef } from "react";
import { Calendar, Link, X, ExternalLink, Clock } from "lucide-react";
import { Btn } from "../../components/common/Btn";
import { BtnOutline } from "../../components/common/BtnOutline";
import { TextInput } from "../../components/common/TextInput";
import { TextArea } from "../../components/common/TextArea";
import { reportError } from "../../core/error/reportError";
// v1.9.7 (fix B3): fecha por defecto en hora local (antes: UTC).
// 1.10.3: fechaCortaLabel alimenta el resumen en vivo de la nueva cita.
import { hoyISO, fechaCortaLabel } from "../../utils/dateUtils";

// 1.10.3-rev2: los inputs internos usan el mismo patrón de la app (TextInput
// con height por defecto); la primera versión mezclaba tamaños de celda.
function hhmmToMin(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutos (positivos) a "HH:MM" con wrap de 24 h. */
function minToHHMM(total) {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/**
 * InlineEventForm (Sistema de Citas, 1.5.0)
 * Forma compacta dentro del modal del caso para crear un evento de calendario
 * vinculado directamente al caso actual, sin salir del contexto.
 *
 * 1.10.3 (rediseño modales de evento):
 *  - El nombre del caso aparece UNA sola vez (chip del header); antes se
 *    repetía también en el placeholder del título ("Cita - {nombre}").
 *  - La hora fin se auto-calcula al mover la inicio (duración conservada),
 *    igual que en el EventModal.
 *  - Resumen en vivo de la cita (fecha · inicio–fin) y descripción como
 *    textarea.
 *  - rev2: se simplificó el grid de "Cuándo" — fecha en su propia fila y
 *    horas en 2 columnas iguales (la primera versión usaba celdas asimétricas
 *    col-span que se leían como saltos de tamaño injustificados).
 */
export default function InlineEventForm({ caso, onCancel, onCreated, onOpenFull }) {
  const [titulo, setTitulo] = useState("");
  // v1.9.7 (fix B3): fecha por defecto en hora local (antes: UTC).
  const [fecha, setFecha] = useState(hoyISO());
  const [horaIni, setHoraIni] = useState("09:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  // 1.10.3: duración persistida + marca de edición manual de la hora fin
  // (si el usuario la editó a mano, mover la inicio ya no la pisa).
  const durRef = useRef(60);
  const endTouchedRef = useRef(false);

  const changeHoraIni = (v) => {
    if (!endTouchedRef.current) {
      const sm = hhmmToMin(v);
      if (sm !== null) setHoraFin(minToHHMM(sm + durRef.current));
    }
    setHoraIni(v);
  };

  const changeHoraFin = (v) => {
    endTouchedRef.current = true;
    const sm = hhmmToMin(horaIni);
    const em = hhmmToMin(v);
    if (sm !== null && em !== null && em > sm) durRef.current = em - sm;
    setHoraFin(v);
  };

  const guardar = async () => {
    if (!caso || !caso.id) return;
    if (!titulo.trim()) setTitulo(`Cita - ${caso.nombre || ""}`);
    if (!fecha) return;
    setSaving(true);
    try {
      const { createEvent } = await import("../../features/calendar/calendarStore");
      const evt = await createEvent({
        title: titulo.trim() || `Cita - ${caso.nombre || ""}`,
        description: descripcion,
        startDate: `${fecha}T${horaIni}:00`,
        endDate: `${fecha}T${horaFin}:00`,
        status: 'pending',
        priority: 'medium',
        relatedCaseIds: [caso.id],
        eventType: 'manual',
        caseContext: {
          nombre: caso.nombre || '',
          estado: caso.estado || '',
          aseguradora: caso.aseguradora || '',
          estudioJuridico: caso.estudioJuridico || '',
          localidad: caso.localidad || '',
        },
      });
      onCreated && onCreated(evt);
    } catch (e) {
      reportError(e, { context: 'InlineEventForm:createEvent' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--color-text)" }}>
          <Calendar size={14} color="var(--color-accent)" /> Nuevo evento
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="hover:opacity-70 transition-opacity"
          aria-label="Cerrar"
        >
          <X size={16} style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>

      {/* 1.10.3: el nombre del caso vive SOLO en este chip (fuente única). */}
      <div
        className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full w-fit max-w-full"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
          color: "var(--color-accent)",
          border: "1px solid color-mix(in srgb, var(--color-accent) 26.7%, transparent)",
        }}
      >
        <Link size={11} className="flex-shrink-0" />
        <span className="truncate">Caso vinculado: <span className="font-semibold">{caso?.nombre || "—"}</span></span>
      </div>

      {/* 1.10.3: placeholder genérico — antes repetía el nombre del caso. */}
      <TextInput
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Titulo del evento (opcional)"
        aria-label="Titulo del evento"
      />

      <div
        className="rounded-md p-2.5 space-y-2"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            <Clock size={12} /> Cuándo
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
            {fechaCortaLabel(fecha)} · {horaIni}–{horaFin}
          </span>
        </div>
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Fecha</div>
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Hora inicio</div>
            <TextInput type="time" value={horaIni} onChange={(e) => changeHoraIni(e.target.value)} />
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Hora fin</div>
            <TextInput type="time" value={horaFin} onChange={(e) => changeHoraFin(e.target.value)} />
          </div>
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Al cambiar la hora de inicio, la de fin se ajusta sola.
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>Descripción</div>
        <TextArea
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Información adicional (opcional)"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onOpenFull}
          className="text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-accent)" }}
        >
          <ExternalLink size={12} /> Abrir calendario completo
        </button>
        <div className="flex items-center gap-2">
          <BtnOutline size="sm" onClick={onCancel}>Cancelar</BtnOutline>
          <Btn size="sm" icon={Calendar} onClick={guardar} loading={saving}>
            Crear evento
          </Btn>
        </div>
      </div>
    </div>
  );
}
