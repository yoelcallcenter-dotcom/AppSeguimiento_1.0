import React, { useState } from "react";
import { Calendar, Link, X, ExternalLink } from "lucide-react";
import { Btn } from "../../components/common/Btn";
import { BtnOutline } from "../../components/common/BtnOutline";
import { TextInput } from "../../components/common/TextInput";

/**
 * InlineEventForm (Sistema de Citas, 1.5.0)
 * Forma compacta dentro del modal del caso para crear un evento de calendario
 * vinculado directamente al caso actual, sin salir del contexto.
 */
export default function InlineEventForm({ caso, onCancel, onCreated, onOpenFull }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [horaIni, setHoraIni] = useState("09:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

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
      console.warn("[InlineEventForm] No se pudo crear el evento:", e);
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
          onClick={onCancel}
          className="hover:opacity-70 transition-opacity"
          aria-label="Cerrar"
        >
          <X size={16} style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        <Link size={12} color="var(--color-accent)" />
        <span>
          Caso vinculado: <span className="font-semibold" style={{ color: "var(--color-text)" }}>{caso?.nombre || "—"}</span>
        </span>
      </div>

      <TextInput
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={`Cita - ${caso?.nombre || "Sin nombre"}`}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--color-text-muted)" }}>Fecha</div>
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <div className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--color-text-muted)" }}>Inicio</div>
            <TextInput type="time" value={horaIni} onChange={(e) => setHoraIni(e.target.value)} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--color-text-muted)" }}>Fin</div>
            <TextInput type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
          </div>
        </div>
      </div>

      <TextInput
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Información adicional (opcional)"
      />

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onOpenFull}
          className="text-[11px] flex items-center gap-1 hover:opacity-70 transition-opacity"
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
