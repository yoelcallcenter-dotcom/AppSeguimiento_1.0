import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../db/casesDB';
import { caseRepository } from './caseRepository';

const casoBase = (id) => ({
  id,
  nombre: `Caso ${id}`,
  telefono: `261 555-${id}`,
  localidad: 'MENDOZA',
  estado: 'Pendiente',
  fecha: '2026-07-01',
});

beforeEach(async () => {
  await casesDB.cases.clear();
});

describe('caseRepository', () => {
  it('bulkReplace es atómico y persiste datos', async () => {
    await caseRepository.bulkReplace([casoBase('c1'), casoBase('c2')]);
    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(2);
    expect(all.every((c) => typeof c.version === 'number')).toBe(true);
    expect(all.every((c) => !!c.updatedAt)).toBe(true);
  });

  it('bulkReplace vacío limpia la tabla sin error', async () => {
    await caseRepository.bulkReplace([casoBase('c1')]);
    await caseRepository.bulkReplace([]);
    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(0);
  });

  it('create genera id si falta y asigna version 1', async () => {
    const created = await caseRepository.create({ nombre: 'Nuevo', telefono: '261 555-0000' });
    expect(created.id).toBeTruthy();
    expect(created.version).toBe(1);
    const stored = await casesDB.cases.get(created.id);
    expect(stored.nombre).toBe('Nuevo');
  });

  it('update incrementa versión y actualiza datos', async () => {
    const created = await caseRepository.create(casoBase('c1'));
    expect(created.version).toBe(1);

    const updated = await caseRepository.update('c1', { estado: 'Firmo' });
    expect(updated.version).toBe(2);
    expect(updated.estado).toBe('Firmo');
  });

  it('update rechaza una versión obsoleta', async () => {
    const created = await caseRepository.create(casoBase('c1'));
    await caseRepository.update('c1', { estado: 'Firmo' });

    // Intento de escribir una versión anterior sobre la actual.
    await expect(
      caseRepository.update('c1', { ...created, version: 1, estado: 'Perdido' })
    ).rejects.toThrow(/Conflicto/);

    const stored = await casesDB.cases.get('c1');
    expect(stored.estado).toBe('Firmo');
  });

  it('update devuelve null si el caso no existe', async () => {
    const result = await caseRepository.update('no-existe', { estado: 'X' });
    expect(result).toBeNull();
  });

  it('bulkAppend agrega solo los nuevos y omite duplicados', async () => {
    await caseRepository.bulkReplace([casoBase('c1')]);
    const result = await caseRepository.bulkAppend([casoBase('c1'), casoBase('c2')]);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.merged).toHaveLength(2);

    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(2);
  });

  it('bulkAppend omite duplicados por clave natural dentro del lote', async () => {
    const dup = { ...casoBase('x1'), nombre: 'Juan Perez', telefono: '261 555-1234' };
    const same = { ...casoBase('x2'), nombre: 'juan perez', telefono: ' 261 555-1234 ' };
    const result = await caseRepository.bulkAppend([dup, same]);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(1);
  });

  it('bulkAppend omite casos que ya existen por nombre y teléfono', async () => {
    await caseRepository.bulkReplace([{ ...casoBase('c1'), nombre: 'Maria', telefono: '261 555-9999' }]);
    const result = await caseRepository.bulkAppend([
      { ...casoBase('nuevo'), nombre: 'maria', telefono: '261 555-9999' },
    ]);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(1);
    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('c1');
  });

  it('remove elimina un caso', async () => {
    await caseRepository.bulkReplace([casoBase('c1'), casoBase('c2')]);
    await caseRepository.remove('c1');
    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('c2');
  });

  it('getAll/getById devuelven los datos', async () => {
    await caseRepository.bulkReplace([casoBase('c1')]);
    const all = await caseRepository.getAll();
    expect(all).toHaveLength(1);
    const one = await caseRepository.getById('c1');
    expect(one.nombre).toBe('Caso c1');
    expect(await caseRepository.getById('zzz')).toBeNull();
  });
});
