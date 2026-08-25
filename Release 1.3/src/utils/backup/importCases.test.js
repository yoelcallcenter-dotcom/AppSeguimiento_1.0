import { describe, it, expect, beforeEach } from 'vitest';
import casesDB from '../../core/db/casesDB';
import { importCasesFromCSV } from './importCases';

beforeEach(async () => {
  await casesDB.cases.clear();
});

const CSV = [
  'Nombre,Telefono,Localidad,Observaciones,Estado',
  'Juan Perez,2615550001,Guaymallen,=SUM(A1),Pendiente',
  'Maria Gomez,2615550002,Godoy Cruz,<script>alert(1)</script>,Pendiente',
].join('\n');

describe('importCasesFromCSV', () => {
  it('importa casos válidos y reemplaza los existentes', async () => {
    const result = await importCasesFromCSV(CSV);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    const all = await casesDB.cases.toArray();
    expect(all).toHaveLength(2);
  });

  it('neutraliza fórmulas CSV (=, +, -, @)', async () => {
    await importCasesFromCSV(CSV);
    const juan = (await casesDB.cases.toArray()).find((c) => c.nombre === 'Juan Perez');
    expect(juan.observaciones).toBe("'=SUM(A1)");
  });

  it('sanea scripts e HTML en los valores', async () => {
    await importCasesFromCSV(CSV);
    const maria = (await casesDB.cases.toArray()).find((c) => c.nombre === 'Maria Gomez');
    expect(maria.observaciones).not.toContain('<script');
    expect(maria.observaciones).not.toContain('alert(');
  });

  it('ignora filas sin nombre ni teléfono y reporta warnings', async () => {
    const csv = [
      'Nombre,Telefono,Localidad',
      'Solo Nombre,,Capital',
      ',,Sin datos',
      'Otra,2615550003,Las Heras',
    ].join('\n');
    const result = await importCasesFromCSV(csv);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(result.warnings).toBeTruthy();
  });

  it('rechaza CSV vacío o sin filas válidas', async () => {
    const vacio = await importCasesFromCSV('Nombre,Telefono\n');
    expect(vacio.success).toBe(false);
  });

  it('persiste datos versionados', async () => {
    await importCasesFromCSV(CSV);
    const all = await casesDB.cases.toArray();
    for (const c of all) {
      expect(typeof c.version).toBe('number');
      expect(!!c.updatedAt).toBe(true);
    }
  });

  it('conserva comas peladas dentro de textos (reparación de columnas)', async () => {
    const csv = [
      'Nombre,Telefono,Observaciones',
      'Ana Perez,2615550020,Pendiente, prioridad alta',
    ].join('\n');
    const result = await importCasesFromCSV(csv);
    expect(result.success).toBe(true);
    const ana = (await casesDB.cases.toArray()).find((c) => c.nombre === 'Ana Perez');
    expect(ana.observaciones).toBe('Pendiente, prioridad alta');
  });

  it('normaliza fechas DD/MM/YYYY y DD/MM a ISO (evita fechas 2001)', async () => {
    const csv = [
      'Nombre,Telefono,Fecha',
      'Ana Lopez,2615550010,15/07/2026',
      'Luis Perez,2615550011,07/08',
      'Leo Diaz,2615550012,2026-08-20',
    ].join('\n');
    await importCasesFromCSV(csv);
    const all = await casesDB.cases.toArray();
    const ana = all.find((c) => c.nombre === 'Ana Lopez');
    const luis = all.find((c) => c.nombre === 'Luis Perez');
    const leo = all.find((c) => c.nombre === 'Leo Diaz');

    expect(ana.fecha).toBe('2026-07-15');
    expect(leo.fecha).toBe('2026-08-20');
    expect(luis.fecha).toMatch(/^\d{4}-08-07$/);
    expect(luis.fecha.startsWith('2001-')).toBe(false);
  });
});
