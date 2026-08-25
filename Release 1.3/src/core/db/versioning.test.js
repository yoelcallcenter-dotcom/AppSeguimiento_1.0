import { describe, it, expect } from 'vitest';
import {
  ensureVersion,
  touchVersion,
  assertNoConflict,
  latestOf,
} from './versioning';

describe('versioning', () => {
  it('ensureVersion completa version/updatedAt sin incrementar', () => {
    const out = ensureVersion({ id: 'c1', nombre: 'A' }, { now: () => '2026-01-01T00:00:00.000Z' });
    expect(out.version).toBe(1);
    expect(out.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(out.nombre).toBe('A');

    const keep = ensureVersion({ id: 'c1', version: 5, updatedAt: '2026-01-02T00:00:00.000Z' });
    expect(keep.version).toBe(5);
    expect(keep.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('touchVersion incrementa la versión y actualiza updatedAt', () => {
    const out = touchVersion({ id: 'c1', version: 3 }, { now: () => '2026-01-01T00:00:00.000Z' });
    expect(out.version).toBe(4);
    expect(out.updatedAt).toBe('2026-01-01T00:00:00.000Z');

    const fresh = touchVersion({ id: 'c2' }, { now: () => '2026-01-01T00:00:00.000Z' });
    expect(fresh.version).toBe(1);
  });

  it('assertNoConflict lanza cuando incoming es más viejo', () => {
    expect(() => assertNoConflict({ version: 2 }, { version: 3 })).toThrow(/Conflicto/);
    expect(() => assertNoConflict({ version: 3 }, { version: 3 })).not.toThrow();
    expect(() => assertNoConflict({ version: 4 }, { version: 3 })).not.toThrow();
    // Sin versiones: last-write-wins (sin conflicto).
    expect(() => assertNoConflict({}, {})).not.toThrow();
  });

  it('latestOf devuelve el más reciente', () => {
    const old = { id: 'x', version: 1, updatedAt: '2026-01-01T00:00:00.000Z' };
    const mid = { id: 'x', version: 2, updatedAt: '2026-01-02T00:00:00.000Z' };
    const sameVersionNewer = { id: 'x', version: 2, updatedAt: '2026-01-03T00:00:00.000Z' };
    expect(latestOf(old, mid)).toBe(mid);
    expect(latestOf(mid, old)).toBe(mid);
    expect(latestOf(mid, sameVersionNewer)).toBe(sameVersionNewer);
    expect(latestOf(null, mid)).toBe(mid);
    expect(latestOf(mid, null)).toBe(mid);
  });
});
