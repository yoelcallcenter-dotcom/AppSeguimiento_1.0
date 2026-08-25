export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function mixColor(hex1, hex2, weight = 0.5) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * weight,
    c1.g + (c2.g - c1.g) * weight,
    c1.b + (c2.b - c1.b) * weight,
  );
}

export function lighten(hex, amount = 0.2) {
  const c = hexToRgb(hex);
  return rgbToHex(
    c.r + (255 - c.r) * amount,
    c.g + (255 - c.g) * amount,
    c.b + (255 - c.b) * amount,
  );
}

export function darken(hex, amount = 0.2) {
  const c = hexToRgb(hex);
  return rgbToHex(
    c.r * (1 - amount),
    c.g * (1 - amount),
    c.b * (1 - amount),
  );
}

export function saturate(hex, amount = 0.2) {
  const c = hexToRgb(hex);
  const gray = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  return rgbToHex(
    c.r + (c.r - gray) * amount,
    c.g + (c.g - gray) * amount,
    c.b + (c.b - gray) * amount,
  );
}

export function hueShift(hex, degrees) {
  const c = hexToRgb(hex);
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }

  h = (h * 360 + degrees) / 360;
  if (h < 0) h += 1;
  if (h > 1) h -= 1;

  return rgbToHex(...hslToRgb(h, s, l).map(v => v * 255));
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r, g, b];
}

export function generatePalette(primary, secondary, tertiary, isDark = true) {
  const N = (hex) => (hex || '').toUpperCase();

  if (isDark) {
    return {
      bg: N(darken(secondary, 0.6)),
      surface: N(mixColor(secondary, '#111827', 0.5)),
      surface2: N(lighten(darken(secondary, 0.6), 0.15)),
      text: N('#E5E7EB'),
      textMuted: N(mixColor('#94A3B8', secondary, 0.3)),
      accent: N(primary),
      border: N(mixColor(secondary, '#334155', 0.5)),
      borderLight: N(mixColor(secondary, '#475569', 0.3)),
      primary: N(primary),
      secondary: N(secondary),
      success: N(mixColor(tertiary, '#10B981', 0.6)),
      danger: N(mixColor(tertiary, '#EF4444', 0.6)),
      warning: N(mixColor(tertiary, '#F59E0B', 0.6)),
    };
  }

  return {
    bg: N(lighten(secondary, 0.8)),
    surface: N(mixColor(secondary, '#FFFFFF', 0.7)),
    surface2: N(lighten(secondary, 0.5)),
    text: N('#111827'),
    textMuted: N(mixColor('#6B7280', secondary, 0.3)),
    accent: N(primary),
    border: N(mixColor(secondary, '#D1D5DB', 0.5)),
    borderLight: N(mixColor(secondary, '#E5E7EB', 0.3)),
    primary: N(primary),
    secondary: N(secondary),
    success: N(mixColor(tertiary, '#059669', 0.6)),
    danger: N(mixColor(tertiary, '#DC2626', 0.6)),
    warning: N(mixColor(tertiary, '#D97706', 0.6)),
  };
}
