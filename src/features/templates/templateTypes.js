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

export const TEMPLATE_FIELDS_BY_TYPE = {
  [TEMPLATE_TYPES.NOTA]: ['title', 'content', 'tags'],
  [TEMPLATE_TYPES.REPORTE]: ['texto', 'origen'],
  [TEMPLATE_TYPES.EVENTO]: ['title', 'description', 'priority', 'status', 'tags'],
  [TEMPLATE_TYPES.COMENTARIO]: ['texto', 'tipo'],
};
