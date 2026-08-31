import { describe, it, expect, beforeEach } from 'vitest';
import {
  TYPOGRAPHY_PRESETS,
  DEFAULT_TYPOGRAPHY_PRESET,
  isValidPreset,
  getPresetById,
  buildGoogleFontsURL,
} from './presets';
import { typographyManager } from './typographyManager';

describe('presets tipográficos', () => {
  it('define los 7 estilos esperados', () => {
    const ids = TYPOGRAPHY_PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      'moderno',
      'editorial',
      'geometrico',
      'corporativo',
      'suave',
      'compacto',
      'expresivo',
    ]);
    const names = TYPOGRAPHY_PRESETS.map((p) => p.name);
    expect(names).toEqual([
      'Clásico',
      'Editorial',
      'Retro / Humanista',
      'Futurista',
      'Monoespaciado / Terminal',
      'Experimental',
      'Minimal / Moderno',
    ]);
  });

  it('cada preset define los roles ui/heading/metric y familas', () => {
    for (const p of TYPOGRAPHY_PRESETS) {
      expect(typeof p.ui).toBe('string');
      expect(typeof p.heading).toBe('string');
      expect(typeof p.metric).toBe('string');
      expect(Array.isArray(p.families)).toBe(true);
      expect(p.families.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it('el preset por defecto es "moderno"', () => {
    expect(DEFAULT_TYPOGRAPHY_PRESET).toBe('moderno');
    expect(isValidPreset(DEFAULT_TYPOGRAPHY_PRESET)).toBe(true);
  });

  it('isValidPreset rechaza ids inválidos', () => {
    expect(isValidPreset('no-existe')).toBe(false);
    expect(isValidPreset('moderno')).toBe(true);
  });

  it('getPresetById devuelve fallback seguro para ids desconocidos', () => {
    const p = getPresetById('no-existe');
    expect(p.id).toBe(DEFAULT_TYPOGRAPHY_PRESET);
  });

  it('buildGoogleFontsURL genera una URL válida con las familias', () => {
    const url = buildGoogleFontsURL('editorial');
    expect(url).toContain('fonts.googleapis.com');
    expect(url).toContain('Playfair+Display');
    expect(url).toContain('Source+Serif+4');
    expect(url).toContain('display=swap');
  });

  it('los roles de cada preset coinciden con el spec', () => {
    const byId = Object.fromEntries(TYPOGRAPHY_PRESETS.map((p) => [p.id, p]));
    expect(byId.moderno.ui).toContain('Montserrat');
    expect(byId.editorial.heading).toContain('Playfair Display');
    expect(byId.editorial.ui).toContain('Source Serif 4');
    expect(byId.geometrico.heading).toContain('Bitter');
    expect(byId.geometrico.ui).toContain('Nunito');
    expect(byId.corporativo.heading).toContain('Exo 2');
    expect(byId.corporativo.ui).toContain('Rajdhani');
    expect(byId.suave.ui).toContain('JetBrains Mono');
    expect(byId.suave.heading).toContain('Fira Code');
    expect(byId.compacto.heading).toContain('Fraunces');
    expect(byId.compacto.metric).toContain('Space Mono');
    expect(byId.expresivo.ui).toContain('Inter');
    expect(byId.expresivo.heading).toContain('DM Serif Display');
    expect(byId.expresivo.metric).toContain('IBM Plex Mono');
  });
});

describe('typographyManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicializa con el preset por defecto y tamaño medio', () => {
    typographyManager.init();
    expect(typographyManager.getCurrentPreset()).toBe('moderno');
    expect(typographyManager.getFontSize()).toBe('medium');
  });

  it('aplica las variables CSS del preset activo', () => {
    typographyManager.init();
    typographyManager.setPreset('editorial');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-ui')).toContain('Source Serif 4');
    expect(root.style.getPropertyValue('--font-heading')).toContain('Playfair Display');
  });

  it('persiste el preset y lo restaura al reiniciar', () => {
    typographyManager.init();
    typographyManager.setPreset('corporativo');
    expect(localStorage.getItem('app-typography-preset')).toBe('corporativo');

    // simular recarga: nueva instancia re-lee de localStorage
    typographyManager.init();
    expect(typographyManager.getCurrentPreset()).toBe('corporativo');
  });

  it('rechaza presets inválidos sin modificar el estado', () => {
    typographyManager.init();
    const ok = typographyManager.setPreset('no-existe');
    expect(ok).toBe(false);
    expect(typographyManager.getCurrentPreset()).toBe('moderno');
  });

  it('mapea el tamaño de fuente correctamente', () => {
    typographyManager.init();
    typographyManager.setFontSize('small');
    expect(typographyManager.getFontSize()).toBe('small');
    expect(typographyManager.getFontSizeInPx()).toBe('14px');
    expect(localStorage.getItem('app-font-size')).toBe('small');
    expect(document.documentElement.style.fontSize).toBe('14px');

    typographyManager.setFontSize('large');
    expect(typographyManager.getFontSize()).toBe('large');
    expect(typographyManager.getFontSizeInPx()).toBe('18px');
  });

  it('preset y tamaño son independientes', () => {
    typographyManager.init();
    typographyManager.setPreset('suave');
    typographyManager.setFontSize('large');
    expect(typographyManager.getCurrentPreset()).toBe('suave');
    expect(typographyManager.getFontSize()).toBe('large');

    // cambiar el preset no altera el tamaño
    typographyManager.setPreset('moderno');
    expect(typographyManager.getFontSize()).toBe('large');

    // cambiar el tamaño no altera el preset
    typographyManager.setFontSize('small');
    expect(typographyManager.getCurrentPreset()).toBe('moderno');
  });

  it('resetToDefaults restaura preset y tamaño por defecto', () => {
    typographyManager.init();
    typographyManager.setPreset('expresivo');
    typographyManager.setFontSize('large');
    typographyManager.resetToDefaults();
    expect(typographyManager.getCurrentPreset()).toBe('moderno');
    expect(typographyManager.getFontSize()).toBe('medium');
  });
});
