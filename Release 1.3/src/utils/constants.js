export const ESTADOS = [
  { v: "Cita virtual", accent: "#60A5FA", peso: 1 },
  { v: "Cita presencial", accent: "#818CF8", peso: 1 },
  { v: "No responde", accent: "#FBBF24", peso: 1 },
  { v: "Lo piensa", accent: "#FCD34D", peso: 1 },
  { v: "Reprogramado", accent: "#FB923C", peso: 1 },
  { v: "2do Llamado", accent: "#F97316", peso: 1 },
  { v: "Tiene Abogado", accent: "#F87171", peso: 1 },
  { v: "No le interesa", accent: "#EF4444", peso: 1 },
  { v: "No viable", accent: "#DC2626", peso: 1 },
  { v: "Incontactable", accent: "#E11D48", peso: 1 },
  { v: "Pendiente", accent: "#34D399", peso: 1 },
  { v: "Firmo", accent: "#10B981", peso: 1 },
  { v: "Sin reporte", accent: "#94A3B8", peso: 1 },
];

export const TIPOS_INGRESO_SUGERIDOS = [
  "Accidente + Cirugía",
  "Accidente + Tratamiento",
  "Accidente sin tratamiento",
  "Enfermedad Profesional",
  "Accidente in itinere",
];

/**
 * Observaciones de condicionales por Estudio Jurídico: registra estudios que
 * no toman todas las aseguradoras o que las toman con condiciones específicas
 * de ingreso/lesión. Cada entrada relaciona un estudio con una aseguradora.
 */
export const DEFAULT_CONDICIONALES = [];

export const OPCIONES_TRANSITO = [
  "DAÑO MATERIAL",
  "LESIÓN FISICA",
  "LESIÓN GRAVE",
  "CON AUTORIZACION",
  "NO SE TOMA",
];

export const MAPEO_EJEMPLO = [
  {
    id: "m1",
    estudio: "Estudio Ejemplo & Asoc.",
    provincia: "Buenos Aires",
    localidades: "La Plata, Berisso, Ensenada",
    direccion: "",
    cargaProlegal: "",
    entrevistador: "",
  },
  {
    id: "m2",
    estudio: "Estudio Ejemplo & Asoc.",
    provincia: "CABA",
    localidades: "",
    direccion: "",
    cargaProlegal: "",
    entrevistador: "",
  },
];

export const DEFAULT_PLANTILLAS = [
  "Hola *{NOMBRE}*, soy {OPERADOR} de la línea informativa,\nRecién estuvimos hablando sobre tu ingreso por ART",
  "Te dejo la recomendación del estudio especializado en tu localidad\nSe van a comunicar *{HORARIO}*",
  "Cualquier duda o consulta no dudes en escribirme!",
];

export const CONFIG_DEFAULT = {
  operador: "",
  idioma: "es",
  plantillas: DEFAULT_PLANTILLAS,
  estadoDefault: "Cita virtual",
  formatoFecha: "DD/MM/YYYY",
  telefonoFormato: "argentina",
  casosPorPagina: 50,
  // Catálogos configurables (Estados de Caso y Tipos de Ingreso)
  estados: ESTADOS,
  tiposIngreso: TIPOS_INGRESO_SUGERIDOS,
  columnasVisibles: {
    fecha: true,
    nombre: true,
    telefono: true,
    localidad: true,
    aseguradora: true,
    tipoIngreso: false,
    cita: true,
    estudioJuridico: false,
    estado: true,
    reporte: true,
  },
  sonidoNotificaciones: false,
  modoNoMolestar: false,
  animaciones: true,
  microinteracciones: true,
  emptyStates: true,
  skeletonLoader: true,
  tooltipsMejorados: true,
  atajosTeclado: true,
  confirmaciones: false,
  busquedaFiltro: "todos",
  busquedaHistorial: true,
  busquedaMaxHistorial: 50,
  idxNombre: true,
  idxTelefono: true,
  idxLocalidad: true,
  idxAseguradora: true,
  idxObservaciones: true,
  notifInApp: true,
  notifSonido: false,
  notifCambioEstado: true,
  notifReporte: true,
  notifEvento: true,
  notifBackup: true,
  notifError: true,
  notifFrecuencia: "tiempo-real",
  widgetActividad: true,
  widgetEventos: true,
  widgetSinReporte: true,
  widgetNotas: true,
  widgetResumen: true,
  importAutoMapeo: "auto",
  importValidarDuplicados: true,
  importValidarTelefono: true,
  importMostrarPreview: true,
};

export const DEFAULT_PASOS = [
  { id: "p1", titulo: "Paso 1", contenido: "Ingresar los datos del prospecto" },
  {
    id: "p2",
    titulo: "Paso 2",
    contenido: "Realizar la llamada de seguimiento",
  },
  {
    id: "p3",
    titulo: "Paso 3",
    contenido: "Cargar el reporte correspondiente",
  },
];

export const DEFAULT_TIPS = [
  { id: "t1", contenido: "Hablar con claridad y empatía" },
  { id: "t2", contenido: "Anotar toda la información relevante" },
  { id: "t3", contenido: "Seguir el protocolo establecido" },
  { id: "t4", contenido: "Cerrar la llamada con un resumen" },
];

export const DEFAULT_LINKS = [
  { id: "l1", titulo: "Link 1", url: "https://ejemplo.com" },
  { id: "l2", titulo: "Link 2", url: "https://ejemplo.com" },
  { id: "l3", titulo: "Link 3", url: "https://ejemplo.com" },
  { id: "l4", titulo: "Link 4", url: "https://ejemplo.com" },
];

export const DEFAULT_OBJECIONES = [
  {
    id: "o1",
    titulo: "No le interesa",
    contenido: "Explicar los beneficios del servicio",
  },
  {
    id: "o2",
    titulo: "Ya tiene abogado",
    contenido: "Consultar si desea una segunda opinión",
  },
  {
    id: "o3",
    titulo: "No tiene tiempo",
    contenido: "Ofrecer un horario flexible",
  },
];

export const DEFAULT_SPEECHS = [
  "Hola, soy {OPERADOR} de la línea informativa, ¿cómo está?",
  "Quería comunicarle que su caso está siendo evaluado por el estudio jurídico",
  "En las próximas horas se estarán comunicando con usted",
];

export const DEFAULT_LESIONES = {
  "Accidente Laboral": [
    { id: "al1", nombre: "Fractura de miembro inferior", observacion: "" },
    { id: "al2", nombre: "Lesión de columna vertebral", observacion: "" },
    { id: "al3", nombre: "Traumatismo craneal", observacion: "" },
  ],
  "Enfermedad Profesional": [
    { id: "ep1", nombre: "Trastorno musculoesquelético", observacion: "" },
    { id: "ep2", nombre: "Enfermedad respiratoria", observacion: "" },
    { id: "ep3", nombre: "Pérdida auditiva", observacion: "" },
  ],
  "No Viable": [
    { id: "nv1", nombre: "No cumple con los requisitos", observacion: "" },
    { id: "nv2", nombre: "Fuera de plazo legal", observacion: "" },
  ],
};

export const DEFAULT_ASEGURADORAS_ART = [
  { id: "a1", nombre: "Sancor Salud", observaciones: "Buena atención" },
  { id: "a2", nombre: "Galeno ART", observaciones: "Reintegros rápidos" },
  { id: "a3", nombre: "OMINT ART", observaciones: "Red amplia" },
];

export const DEFAULT_ASEGURADORAS_TRANSITO = [
  { id: "t1", nombre: "Sancor Seguros", observaciones: "Excelente cobertura" },
  { id: "t2", nombre: "La Caja Seguros", observaciones: "Respuesta rápida" },
];

export const DEFAULT_TRANSITO_OBSERVACIONES = [
  { id: "to1", contenido: "Solicitar documentación completa" },
  { id: "to2", contenido: "Verificar póliza vigente" },
];

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const ESTUDIOS_GL = [
  "gl mar del plata",
  "gl san nicolas",
  "gl pergamino",
  "gl laferrere",
  "gl moron",
  "gl ezeiza",
  "gl caba",
  "bc & asoc",
];

export const CONTEXTOS_PRIORIDAD_INVERTIDA = ["caba", "misiones"];

export const FORMATOS_FECHA = [
  { value: "DD/MM", label: "Día/Mes (DD/MM)" },
  { value: "DD/MM/YYYY", label: "Día/Mes/Año (DD/MM/YYYY)" },
  { value: "YYYY-MM-DD", label: "Año-Mes-Día (YYYY-MM-DD)" },
  { value: "MM/DD", label: "Mes/Día (MM/DD)" },
];

export const FORMATOS_TELEFONO = [
  { value: "argentina", label: "Argentina (11 1234-5678)" },
  { value: "internacional", label: "Internacional (+54 11 1234-5678)" },
  { value: "libre", label: "Sin formato" },
];

export const OPCIONES_CASOS_POR_PAGINA = [
  { value: 25, label: "25 casos" },
  { value: 50, label: "50 casos" },
  { value: 100, label: "100 casos" },
  { value: 250, label: "250 casos" },
];

export const OPCIONES_BACKUP = [
  { value: "off", label: "Desactivado" },
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
];

export const OPCIONES_SONIDO = [
  { value: false, label: "Desactivado" },
  { value: true, label: "Activado" },
];

export const COLUMNAS_DISPONIBLES = [
  { key: "fecha", label: "Fecha" },
  { key: "nombre", label: "Nombre" },
  { key: "telefono", label: "Teléfono" },
  { key: "localidad", label: "Localidad" },
  { key: "aseguradora", label: "Aseguradora" },
  { key: "tipoIngreso", label: "Tipo Ingreso" },
  { key: "cita", label: "Cita" },
  { key: "estudioJuridico", label: "Estudio Jurídico" },
  { key: "estado", label: "Estado" },
  { key: "reporte", label: "Reporte" },
];
