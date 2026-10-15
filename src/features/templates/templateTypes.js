import { FileText, ClipboardList, Calendar, MessageSquare } from 'lucide-react';

export const TEMPLATE_TYPES = {
  NOTA: 'nota',
  REPORTE: 'reporte',
  EVENTO: 'evento',
  COMENTARIO: 'comentario',
};

export const TEMPLATE_TYPE_LABELS = {
  [TEMPLATE_TYPES.NOTA]: 'Nota',
  [TEMPLATE_TYPES.REPORTE]: 'Reporte',
  [TEMPLATE_TYPES.EVENTO]: 'Evento',
  [TEMPLATE_TYPES.COMENTARIO]: 'Comentario',
};

export const TEMPLATE_TYPE_ICONS = {
  [TEMPLATE_TYPES.NOTA]: FileText,
  [TEMPLATE_TYPES.REPORTE]: ClipboardList,
  [TEMPLATE_TYPES.EVENTO]: Calendar,
  [TEMPLATE_TYPES.COMENTARIO]: MessageSquare,
};

// 1.10.1: color propio por tipo — con el acento único no se distinguía
// Nota/Reporte/Evento/Comentario. Vive acá (no en PlantillasView) para que
// la lista, el modal de vista previa y el form compartan la misma paleta.
export const TYPE_COLORS = {
  [TEMPLATE_TYPES.NOTA]: '#3B82F6',
  [TEMPLATE_TYPES.REPORTE]: '#8B5CF6',
  [TEMPLATE_TYPES.EVENTO]: '#F59E0B',
  [TEMPLATE_TYPES.COMENTARIO]: '#10B981',
};

// 1.10.1: una línea por tipo para que el usuario entienda qué crea cada uno
// antes de elegirlo en el form (antes un <select> sin contexto).
export const TEMPLATE_TYPE_DESCRIPTIONS = {
  [TEMPLATE_TYPES.NOTA]: 'Texto de nota guardado en el caso (título + contenido).',
  [TEMPLATE_TYPES.REPORTE]: 'Cuerpo del reporte que se carga desde Reporte rápido o Ver caso.',
  [TEMPLATE_TYPES.EVENTO]: 'Evento de calendario (título, descripción, prioridad y estado).',
  [TEMPLATE_TYPES.COMENTARIO]: 'Comentario rápido que se agrega al caso.',
};

export const TEMPLATE_FIELDS_BY_TYPE = {
  [TEMPLATE_TYPES.NOTA]: ['title', 'content', 'tags'],
  // 1.10.1: 'estado' es opcional (vacío = sin cambio). Al aplicar la plantilla
  // en Reporte rápido se preselecciona ese estado del caso (VerCasoModal no
  // tiene control de estado, así que ahí se ignora). Retrocompatible:
  // plantillas viejas sin content.estado siguen sin tocar el estado.
  [TEMPLATE_TYPES.REPORTE]: ['texto', 'origen', 'estado'],
  [TEMPLATE_TYPES.EVENTO]: ['title', 'description', 'priority', 'status', 'tags'],
  [TEMPLATE_TYPES.COMENTARIO]: ['texto', 'tipo'],
};
