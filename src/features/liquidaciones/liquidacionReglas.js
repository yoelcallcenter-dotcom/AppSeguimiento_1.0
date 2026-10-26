/**
 * liquidacionReglas.js
 * Reglas económicas centralizadas del módulo de Liquidaciones (v1.10.4).
 *
 * Todos los importes, tarifas y umbrales viven ACÁ y no en los componentes:
 * la Release 1.10.5 podrá conectarlos a Configuración → General →
 * Liquidaciones sin tocar el motor ni la UI (ver getReglas()).
 *
 * IMPORTANTE (1.10.4): los valores de abajo son PROVISIONALES, definidos en
 * el prompt de la release. No presentarlos como tarifas definitivas.
 */

/** Categorías liquidables de una firma (por concepto). */
export const CATEGORIAS_LIQUIDACION = [
  { key: "leve", label: "Lesión leve", tarifaKey: "leve" },
  { key: "grave", label: "Lesión grave", tarifaKey: "grave" },
  { key: "profesional", label: "Enfermedad profesional", tarifaKey: "profesional" },
];

const CATEGORIA_KEYS = CATEGORIAS_LIQUIDACION.map((c) => c.key);

/**
 * Reglas en vigor por defecto (provisionales — 1.10.4).
 * - minimoFirmasNetas: requisito de HABILITACIÓN. Las primeras 14 netas NO se
 *   descuentan del importe: si netas >= mínimo, se pagan TODAS las netas.
 * - tarifas: pesos por firma según categoría del concepto.
 * - fondoTop/puestosTop: fondo del premio por top (sin asignación automática
 *   de puestos en 1.10.4: la declaración de quiénes están en el top es
 *   manual; el orden/puestos se asignan fuera de la app en esta versión).
 */
export const REGLAS_LIQUIDACION_DEFECTO = {
  minimoFirmasNetas: 14,
  tarifas: { leve: 10000, grave: 20000, profesional: 20000 },
  fondoTop: 100000,
  puestosTop: 3,
};

/**
 * Obtiene las reglas vigentes. Por defecto usa las provisionales.
 * (1.10.5: al llegar la sección Liquidaciones en Configuración → General,
 * mergear desde config.liquidaciones sin perder los defaults — por eso la
 * lectura está encapsulada en esta función y NO desparramada por la UI.)
 */
export function getReglas(config) {
  const cfg = config?.liquidaciones;
  if (!cfg || typeof cfg !== "object") return { ...REGLAS_LIQUIDACION_DEFECTO };
  return {
    ...REGLAS_LIQUIDACION_DEFECTO,
    ...cfg,
    tarifas: { ...REGLAS_LIQUIDACION_DEFECTO.tarifas, ...(cfg.tarifas || {}) },
  };
}

/** ¿La key es una categoría liquidable válida? */
export function esCategoriaLiquidacion(key) {
  return CATEGORIA_KEYS.includes(key);
}

/** Tarifa unitaria para una categoría; null si no hay tarifa aplicable. */
export function tarifaPara(reglas, categoriaKey) {
  if (!categoriaKey) return null;
  const cat = CATEGORIAS_LIQUIDACION.find((c) => c.key === categoriaKey);
  if (!cat) return null;
  const t = reglas?.tarifas?.[cat.tarifaKey];
  return typeof t === "number" && t >= 0 ? t : null;
}

/** Label legible de una categoría (para UI y snapshots). */
export function categoriaLabel(key) {
  const cat = CATEGORIAS_LIQUIDACION.find((c) => c.key === key);
  return cat ? cat.label : "Sin clasificar";
}
