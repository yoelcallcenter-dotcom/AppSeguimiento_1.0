/**
 * presets.js
 * Sistema de presets tipográficos de AppSeguimiento.
 *
 * Fuente de verdad única para los 7 estilos tipográficos predefinidos.
 * Cada preset define tres roles tipográficos:
 *   - ui:      fuente de interfaz (navegación, botones, inputs, tablas, formularios...)
 *   - heading: fuente de títulos (h1-h4, títulos de vistas/secciones/cards/modales)
 *   - metric:  fuente de métricas (KPIs, valores numéricos destacados del Dashboard)
 *
 * No todos los presets usan 3 familias distintas: algunos combinan 1, 2 o 3
 * familias. Los stacks incluyen fallbacks reales y compatibles (sans-serif,
 * serif, monospace) para que nunca haya pantallas vacías mientras carga la
 * fuente real.
 */

const SANS_FALLBACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";

const MONO_FALLBACK =
  "'Courier New', Courier, Consolas, 'Liberation Mono', Menlo, monospace";

export const TYPOGRAPHY_PRESETS = [
  {
    id: "moderno",
    name: "Clásico",
    description:
      "Tradicional y sobrio. Preserva la identidad clásica de AppSeguimiento con una combinación seria, legible e institucional.",
    families: ["Montserrat"],
    ui: `'Montserrat', ${SANS_FALLBACK}`,
    heading: `'Montserrat', ${SANS_FALLBACK}`,
    metric: `'Montserrat', ${SANS_FALLBACK}`,
  },
  {
    id: "editorial",
    name: "Editorial",
    description:
      "Elegante y sofisticado. Inspirado en revistas y publicaciones; serif de alto contraste en todos los niveles.",
    families: ["Playfair Display", "Source Serif 4"],
    ui: `'Source Serif 4', ${SERIF_FALLBACK}`,
    heading: `'Playfair Display', ${SERIF_FALLBACK}`,
    metric: `'Source Serif 4', ${SERIF_FALLBACK}`,
  },
  {
    id: "geometrico",
    name: "Retro / Humanista",
    description:
      "Cálido y humano. Slab-serif orgánica y redondeada con un toque nostálgico, informal pero profesional.",
    families: ["Bitter", "Nunito"],
    ui: `'Nunito', ${SANS_FALLBACK}`,
    heading: `'Bitter', ${SERIF_FALLBACK}`,
    metric: `'Bitter', ${SERIF_FALLBACK}`,
  },
  {
    id: "corporativo",
    name: "Futurista",
    description:
      "Tecnológico y geométrico. Trazos futuristas y condensados que hacen sentir la app como software digital de vanguardia.",
    families: ["Exo 2", "Rajdhani"],
    ui: `'Rajdhani', ${SANS_FALLBACK}`,
    heading: `'Exo 2', ${SANS_FALLBACK}`,
    metric: `'Exo 2', ${SANS_FALLBACK}`,
  },
  {
    id: "suave",
    name: "Monoespaciado / Terminal",
    description:
      "Técnica y precisa. Toda la interfaz en fuente monoespaciada con identidad de terminal: números, fechas e IDs destacan al instante.",
    families: ["JetBrains Mono", "Fira Code"],
    ui: `'JetBrains Mono', ${MONO_FALLBACK}`,
    heading: `'Fira Code', ${MONO_FALLBACK}`,
    metric: `'JetBrains Mono', ${MONO_FALLBACK}`,
  },
  {
    id: "compacto",
    name: "Experimental",
    description:
      "Creativa y contemporánea. Títulos con display variable de fuerte personalidad y métricas técnicas, sin sacrificar legibilidad del contenido.",
    families: ["Fraunces", "DM Sans", "Space Mono"],
    ui: `'DM Sans', ${SANS_FALLBACK}`,
    heading: `'Fraunces', ${SERIF_FALLBACK}`,
    metric: `'Space Mono', ${MONO_FALLBACK}`,
  },
  {
    id: "expresivo",
    name: "Minimal / Moderno",
    description:
      "Limpio y premium. Sans-serif de interfaz ultra legible con títulos serif refinados y métricas precisas.",
    families: ["Inter", "DM Serif Display", "IBM Plex Mono"],
    ui: `'Inter', ${SANS_FALLBACK}`,
    heading: `'DM Serif Display', ${SERIF_FALLBACK}`,
    metric: `'IBM Plex Mono', ${MONO_FALLBACK}`,
  },
];

export const DEFAULT_TYPOGRAPHY_PRESET = "moderno";

/** Valida que un id corresponda a un preset conocido. */
export function isValidPreset(id) {
  return TYPOGRAPHY_PRESETS.some((p) => p.id === id);
}

/** Devuelve un preset por id, o el preset por defecto si no existe. */
export function getPresetById(id) {
  return (
    TYPOGRAPHY_PRESETS.find((p) => p.id === id) ||
    TYPOGRAPHY_PRESETS.find((p) => p.id === DEFAULT_TYPOGRAPHY_PRESET)
  );
}

/**
 * Construye la URL de Google Fonts para las familias de un preset.
 * @param {string|object} presetOrId id del preset o objeto preset.
 * @returns {string}
 */
export function buildGoogleFontsURL(presetOrId) {
  const preset =
    typeof presetOrId === "string" ? getPresetById(presetOrId) : presetOrId;
  if (!preset) return "";
  const fam = preset.families
    .map((f) => f.replace(/ /g, "+"))
    .map((f) => `${f}:wght@400;500;600;700;800`)
    .join("&family=");
  return `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
}
