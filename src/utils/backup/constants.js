/**
 * backup/constants.js
 * Constantes centralizadas para el sistema de backups
 */

export const BACKUP_VERSION = "1.1";

export const LEGACY_BACKUP_KINDS = ["seguimiento-art-backup"];

export const STORAGE_KEYS = {
  CASES: "casos-art-tracker",
  CONFIG: "config-art-tracker",
  PASOS: "pasos-art-tracker",
  TIPS: "tips-art-tracker",
  LINKS: "links-art-tracker",
  SPEECHS: "speechs-art-tracker",
  OBJECIONES: "objeciones-art-tracker",
  ART: "art-art-tracker",
  TRANSITO: "transito-art-tracker",
  LESIONES: "lesiones-art-tracker",
  MAPEO: "mapeo-art-tracker",
  OBSERVACIONES_TRANSITO: "observaciones-transito-art-tracker",
  CONDICIONALES: "condicionales-art-tracker",
  TRANSITO_SELECCION: "transito-seleccion-art-tracker",
  RECENT_ENTITIES: "recent-entities-art-tracker",
};

export const CONFIG_KEYS = [
  STORAGE_KEYS.CONFIG,
  STORAGE_KEYS.PASOS,
  STORAGE_KEYS.TIPS,
  STORAGE_KEYS.LINKS,
  STORAGE_KEYS.SPEECHS,
  STORAGE_KEYS.OBJECIONES,
  STORAGE_KEYS.ART,
  STORAGE_KEYS.TRANSITO,
  STORAGE_KEYS.LESIONES,
  STORAGE_KEYS.MAPEO,
  STORAGE_KEYS.OBSERVACIONES_TRANSITO,
  STORAGE_KEYS.CONDICIONALES,
  STORAGE_KEYS.TRANSITO_SELECCION,
  STORAGE_KEYS.RECENT_ENTITIES,
];

export const CASE_REQUIRED_FIELDS = ["nombre", "telefono"];

export const CASE_ARRAY_FIELDS = ["tags", "reporteHistory", "comentarios", "notasVinculadas", "agendaVinculada", "caseHistory"];

export const CASE_DATE_FIELDS = [
  "fecha",
  "fechaFirma",
  "createdAt",
  "updatedAt",
];

export const CSV_HEADERS = [
  "ID",
  "Fecha",
  "Nombre",
  "Telefono",
  "Localidad",
  "Aseguradora",
  "Profesion",
  "Ingreso",
  "Lesion",
  "TipoIngreso",
  "Cita",
  "Estado",
  "EstudioJuridico",
  "Observaciones",
  "Tags",
  "Reportes",
  "Comentarios",
  "Notas Vinculadas",
  "Agenda Vinculada",
  "Historial",
];

export const CSV_FIELD_MAP = {
  ID: "id",
  Fecha: "fecha",
  Nombre: "nombre",
  Telefono: "telefono",
  Localidad: "localidad",
  Aseguradora: "aseguradora",
  Profesion: "profesion",
  Ingreso: "ingreso",
  Lesion: "lesion",
  TipoIngreso: "tipoIngreso",
  Cita: "cita",
  Estado: "estado",
  EstudioJuridico: "estudioJuridico",
  Observaciones: "observaciones",
  Tags: "tags",
  Reportes: "reporteHistory",
  Comentarios: "comentarios",
  "Notas Vinculadas": "notasVinculadas",
  "Agenda Vinculada": "agendaVinculada",
  "Historial": "caseHistory",
};

export const MESSAGES = {
  NO_CASES: "No hay casos para exportar",
  NO_CONFIG: "No hay configuración para exportar",
  INVALID_FILE: "El archivo es inválido o está corrupto",
  PARSE_ERROR: "Error al parsear el archivo",
  VALIDATION_ERROR: "Error de validación de datos",
  STORAGE_ERROR: "Error al guardar en almacenamiento",
};
