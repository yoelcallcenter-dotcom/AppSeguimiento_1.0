import { describe, it, expect, beforeEach } from 'vitest';
import { localStorageAdapter } from './localStorageAdapter';

describe('localStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('set/get (con prefijo app_)', () => {
    it('guarda y lee con prefijo', () => {
      localStorageAdapter.set('config-art-tracker', { theme: 'dark' });
      expect(localStorageAdapter.get('config-art-tracker')).toEqual({ theme: 'dark' });
    });

    it('guarda y lee strings', () => {
      localStorageAdapter.set('test-key', 'hello');
      expect(localStorageAdapter.get('test-key')).toBe('hello');
    });

    it('guarda y lee arrays', () => {
      localStorageAdapter.set('test-arr', [1, 2, 3]);
      expect(localStorageAdapter.get('test-arr')).toEqual([1, 2, 3]);
    });

    it('devuelve default si no existe', () => {
      expect(localStorageAdapter.get('nonexistent', 'default')).toBe('default');
    });

    it('devuelve null si no existe y sin default', () => {
      expect(localStorageAdapter.get('nonexistent')).toBeNull();
    });
  });

  describe('remove', () => {
    it('elimina una clave', () => {
      localStorageAdapter.set('to-delete', 'value');
      localStorageAdapter.remove('to-delete');
      expect(localStorageAdapter.get('to-delete')).toBeNull();
    });
  });

  describe('exists', () => {
    it('devuelve true si existe', () => {
      localStorageAdapter.set('exists-key', 'val');
      expect(localStorageAdapter.exists('exists-key')).toBe(true);
    });

    it('devuelve false si no existe', () => {
      expect(localStorageAdapter.exists('no-exists')).toBe(false);
    });
  });

  describe('clear', () => {
    it('solo elimina claves con prefijo app_', () => {
      localStorageAdapter.set('key1', 'v1');
      localStorage.setItem('raw-key', 'raw');
      localStorageAdapter.clear();
      expect(localStorageAdapter.get('key1')).toBeNull();
      expect(localStorage.getItem('raw-key')).toBe('raw');
    });
  });

  describe('setRaw/getRaw', () => {
    it('guarda sin prefijo', () => {
      localStorageAdapter.setRaw('userOperatorProfile', { name: 'Juan' });
      expect(localStorage.getItem('userOperatorProfile')).toBe(JSON.stringify({ name: 'Juan' }));
    });
  });

  describe('getAll', () => {
    it('incluye claves con prefijo (sin el prefijo)', () => {
      localStorageAdapter.set('config-art-tracker', { a: 1 });
      const all = localStorageAdapter.getAll();
      expect(all['config-art-tracker']).toEqual({ a: 1 });
    });

    it('incluye claves sin prefijo en unprefixedInclude', () => {
      localStorage.setItem('userOperatorProfile', JSON.stringify({ name: 'Juan' }));
      const all = localStorageAdapter.getAll();
      expect(all['userOperatorProfile']).toEqual({ name: 'Juan' });
    });

    it('incluye claves app_* en unprefixedInclude (sin quitar prefijo)', () => {
      localStorage.setItem('app-theme', JSON.stringify('dark'));
      const all = localStorageAdapter.getAll();
      expect(all['app-theme']).toBe('dark');
    });

    it('excluye claves en backupExclude', () => {
      localStorage.setItem('app-filters', JSON.stringify({}));
      localStorageAdapter.set('config-art-tracker', { a: 1 });
      const all = localStorageAdapter.getAll();
      expect(all['app-filters']).toBeUndefined();
      expect(all['config-art-tracker']).toBeDefined();
    });

    it('excluye tour_*', () => {
      localStorage.setItem('tour_step1', JSON.stringify(true));
      const all = localStorageAdapter.getAll();
      expect(all['tour_step1']).toBeUndefined();
    });

    it('excluye userOperatorCredentials', () => {
      localStorage.setItem('userOperatorCredentials', JSON.stringify({ entries: [] }));
      const all = localStorageAdapter.getAll();
      expect(all['userOperatorCredentials']).toBeUndefined();
    });
  });

  describe('getAllKeys', () => {
    it('devuelve claves con prefijo y sin prefijo incluidas', () => {
      localStorageAdapter.set('config-art-tracker', {});
      localStorage.setItem('userOperatorProfile', '{}');
      const keys = localStorageAdapter.getAllKeys();
      expect(keys).toContain('app_config-art-tracker');
      expect(keys).toContain('userOperatorProfile');
    });
  });

  describe('unprefixedInclude', () => {
    it('incluye conversaciones_*', () => {
      expect(localStorageAdapter.unprefixedInclude('conversaciones_Laboral')).toBe(true);
    });

    it('incluye app-theme', () => {
      expect(localStorageAdapter.unprefixedInclude('app-theme')).toBe(true);
    });

    it('incluye app_ui_settings', () => {
      expect(localStorageAdapter.unprefixedInclude('app_ui_settings')).toBe(true);
    });

    it('excluye claves no conocidas', () => {
      expect(localStorageAdapter.unprefixedInclude('random-key')).toBe(false);
    });
  });

  describe('backupExclude', () => {
    it('excluye app-filters', () => {
      expect(localStorageAdapter.backupExclude('app-filters')).toBe(true);
    });

    it('excluye tour_*', () => {
      expect(localStorageAdapter.backupExclude('tour_intro')).toBe(true);
    });

    it('excluye backup-last-run', () => {
      expect(localStorageAdapter.backupExclude('backup-last-run')).toBe(true);
    });

    it('no excluye claves normales', () => {
      expect(localStorageAdapter.backupExclude('config-art-tracker')).toBe(false);
    });
  });
});
