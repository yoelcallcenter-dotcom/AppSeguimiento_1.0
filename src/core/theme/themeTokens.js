/**
 * themeTokens.js
 * Definición central de todos los tokens de tema
 * No contiene lógica, solo datos
 */

export const PALETTES = [
  {
    id: "default",
    label: "Default",
    description: "Azul profesional con acento celeste",
    colors: {
      primary: "#3B82F6",
      primaryHover: "#2563EB",
      accent: "#60A5FA",
      ring: "rgba(59,130,246,0.35)",
    },
  },
  {
    id: "violet",
    label: "Violeta",
    description: "Púrpura vibrante con acento lavanda",
    colors: {
      primary: "#7C3AED",
      primaryHover: "#6D28D9",
      accent: "#A78BFA",
      ring: "rgba(124,58,237,0.35)",
    },
  },
  {
    id: "emerald",
    label: "Esmeralda",
    description: "Verde natural con acento brillante",
    colors: {
      primary: "#10B981",
      primaryHover: "#059669",
      accent: "#34D399",
      ring: "rgba(16,185,129,0.35)",
    },
  },
  {
    id: "sunset",
    label: "Atardecer",
    description: "Naranja cálido con acento ámbar",
    colors: {
      primary: "#F59E0B",
      primaryHover: "#D97706",
      accent: "#FBBF24",
      ring: "rgba(245,158,11,0.35)",
    },
  },
  {
    id: "mono",
    label: "Monocromo",
    description: "Gris neutro, estética minimalista",
    colors: {
      primary: "#6B7280",
      primaryHover: "#4B5563",
      accent: "#9CA3AF",
      ring: "rgba(107,114,128,0.35)",
    },
  },
  {
    id: "rose",
    label: "Rosa",
    description: "Rojo intenso con acento rosado",
    colors: {
      primary: "#E11D48",
      primaryHover: "#BE123C",
      accent: "#FB7185",
      ring: "rgba(225,29,72,0.35)",
    },
  },
  {
    id: "cyan",
    label: "Cian",
    description: "Azul cielo con acento turquesa",
    colors: {
      primary: "#06B6D4",
      primaryHover: "#0891B2",
      accent: "#22D3EE",
      ring: "rgba(6,182,212,0.35)",
    },
  },
];

export const defaultEstadoColors = {
  "Cita virtual": "#60A5FA",
  "Cita presencial": "#818CF8",
  "No responde": "#FBBF24",
  "Lo piensa": "#FCD34D",
  Reprogramado: "#FB923C",
  "2do Llamado": "#F97316",
  "Tiene Abogado": "#F87171",
  "No le interesa": "#EF4444",
  "No viable": "#DC2626",
  Incontactable: "#E11D48",
  Baja: "#991B1B",
  Pendiente: "#34D399",
  Firmo: "#10B981",
  "Sin reporte": "#94A3B8",
};

export const cssVarMap = {
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  text: "--text",
  textMuted: "--text-muted",
  accent: "--accent",
  border: "--border",
  success: "--success",
  warning: "--warning",
  danger: "--danger",
  primary: "--primary",
  ring: "--ring",
  shadow: "--color-shadow",
  scrollbar: "--color-scrollbar",
  scrollbarHover: "--color-scrollbar-hover",
};

export const ESTADO_COLOR_SWATCHES = [
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#8B8B8B", "#6B7280", "#4B5563",
];
