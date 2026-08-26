/**
 * insightsConfig.js
 * Umbrales y reglas centralizadas de la capa de Insights (Release 1.3.2).
 * Ningún componente o motor debe declarar valores mágicos propios:
 * todas las constantes de integridad analítica viven acá.
 */

export const INSIGHTS_CONFIG = {
  /** Muestras mínimas para generar cada tipo de conclusión. */
  muestra: {
    /** Firmas totales del período antes de declarar un "mejor día". */
    mejorDia: 8,
    /** Firmas mínimas en un día concreto para considerarlo patrón. */
    firmasPorDiaPatron: 2,
    /** Semanas mínimas para calcular una tendencia. */
    tendenciaSemanas: 4,
    /** Timestamps confiables mínimos para análisis horario. */
    eventosHorario: 10,
    /** Casos mínimos por aseguradora/estudio para destacar conclusiones. */
    grupo: 10,
    /** Firmas mínimas en ambos períodos para comparar variación %. */
    comparacion: 5,
  },

  /** Umbrales de cambio significativo (porcentajes). */
  umbral: {
    /** Variación menor a este % se considera estable (rango normal). */
    normal: 10,
    /** Variación a partir de este % es "cambio significativo". */
    significativo: 15,
    /** Variación a partir de este % es cambio muy fuerte. */
    fuerte: 25,
    /** Diferencia en puntos de conversión que se considera relevante. */
    conversionPuntos: 8,
  },

  /**
   * Ventana histórica (días) del promedio personal usado como base de
   * comparación. No se usa todo el historial para no distorsionar la
   * comparación con cambios de flujo de trabajo antiguos.
   */
  promedioPersonalDias: 30,

  /** Semanas analizadas por la tendencia semanal. */
  semanasTendencia: 8,

  /** Días sin actividad real para considerar un caso sin seguimiento reciente. */
  diasSinSeguimiento: 15,

  /** Franjas horarias (horas de inicio) para el análisis de actividad. */
  franjasHorarias: [6, 8, 10, 12, 14, 16, 18, 20],

  /** Tamaño de cada franja horaria, en horas. */
  tamanoFranja: 2,

  /** Máximo de insights mostrados simultáneamente. */
  maxInsights: 9,
};

/** Etiquetas de los días de la semana (getDay(): 0=domingo). */
export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/** Categorías de insights admitidas por el motor. */
export const CATEGORIAS_INSIGHT = {
  PRODUCTIVIDAD: 'productividad',
  OBJETIVOS: 'objetivos',
  TENDENCIA: 'tendencia',
  HORARIOS: 'horarios',
  ASEGURADORAS: 'aseguradoras',
  ESTUDIOS: 'estudios',
  ACTIVIDAD: 'actividad',
};

/**
 * Motivos de estado vacío diferenciados.
 *  - sin-datos: no hay casos cargados.
 *  - datos-insuficientes: hay datos pero no alcanzan para conclusiones fiables.
 */
export const ESTADO_VACIO = {
  SIN_DATOS: 'sin-datos',
  DATOS_INSUFICIENTES: 'datos-insuficientes',
};
