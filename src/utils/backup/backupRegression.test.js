import { describe, it, expect, beforeEach } from 'vitest';
import { localStorageAdapter } from '../../core/storage/localStorageAdapter';
import casesDB from '../../core/db/casesDB';
import appDB from '../../core/db/appDB';
import { exportBackup, importBackup } from '../../services/backupService';
import { exportConfigToJSON, importConfigFromJSON } from './backupManager';
import { CONFIG_KEYS, BACKUP_VERSION } from './constants';
import { CONFIG_DEFAULT } from '../constants';

/**
 * Tests de regresión de los bugs de backup reportados:
 *  - El backup completo debe exportar/importar los Útiles.
 *  - Importar solo la configuración (archivo configuracion_derivaciones_*.json)
 *    debe completar los campos faltantes con los valores por defecto.
 *  - La versión base de la app es 1.0.
 */

async function limpiar() {
  await casesDB.cases.clear();
  await appDB.notes.clear();
  await appDB.events.clear();
  await appDB.note_versions.clear();
}

beforeEach(async () => {
  await limpiar();
  localStorage.clear();
});

const UTILES = {
  'config-art-tracker': { operador: 'Yoel', formatoFecha: 'DD/MM/YYYY' },
  'pasos-art-tracker': [{ id: 'p1', titulo: 'SPEECH', contenido: 'Contenido paso' }],
  'tips-art-tracker': [{ id: 't1', contenido: 'No somos parte de su ART' }],
  'links-art-tracker': [{ id: 'l1', titulo: 'SRT', url: 'https://www.srt.gob.ar' }],
  'speechs-art-tracker': ['SPEECH V.1: Hola'],
  'objeciones-art-tracker': [{ id: 'o1', titulo: 'SI YA TIENE ABOGADO', contenido: '...' }],
  'art-art-tracker': [{ id: 'a1', nombre: 'ANDINA', observaciones: '' }],
  'transito-art-tracker': [{ id: 'tr1', nombre: 'AGROSALTA', observaciones: '' }],
  'lesiones-art-tracker': { 'Accidente Laboral': [{ id: 'l1', nombre: 'FRACTURAS', observacion: '' }] },
  'mapeo-art-tracker': [{ id: 'm1', estudio: 'SALABERRY', provincia: 'BUENOS AIRES', localidades: 'Tandil' }],
  'observaciones-transito-art-tracker': [],
};

function sembrarUtiles() {
  for (const [k, v] of Object.entries(UTILES)) {
    localStorageAdapter.set(k, v);
  }
}

describe('Bug 1: backup completo con Útiles', () => {
  it('exportBackup incluye todos los Útiles en data.storage', async () => {
    sembrarUtiles();
    const backup = await exportBackup();
    for (const k of Object.keys(UTILES)) {
      expect(backup.data.storage[k]).toBeTruthy();
    }
  });

  it('roundtrip completo restaura los Útiles', async () => {
    sembrarUtiles();
    const backup = await exportBackup();
    localStorage.clear();
    await importBackup(backup);

    expect(localStorageAdapter.get('pasos-art-tracker')).toMatchObject(UTILES['pasos-art-tracker']);
    expect(localStorageAdapter.get('mapeo-art-tracker')).toMatchObject(UTILES['mapeo-art-tracker']);
    expect(localStorageAdapter.get('speechs-art-tracker')).toEqual(UTILES['speechs-art-tracker']);
    expect(localStorageAdapter.get('lesiones-art-tracker')).toEqual(UTILES['lesiones-art-tracker']);
  });

  it('al restaurar elimina claves prefijadas viejas que no están en el backup', async () => {
    // Exportar un backup SIN speechs (no se siembran).
    const sinSpeechs = { ...UTILES };
    delete sinSpeechs['speechs-art-tracker'];
    for (const [k, v] of Object.entries(sinSpeechs)) {
      localStorageAdapter.set(k, v);
    }
    const backup = await exportBackup();
    expect(backup.data.storage['speechs-art-tracker']).toBeUndefined();

    localStorage.clear();
    localStorageAdapter.set('speechs-art-tracker', ['CLAVE STALE']);

    await importBackup(backup);

    expect(localStorageAdapter.get('speechs-art-tracker')).toBeNull();
  });
});

describe('Bug 2: importar solo útiles con archivo de configuración', () => {
  const ARCHIVO_USUARIO = {
    version: '3.0.5',
    fechaExportacion: '2026-07-29',
    configuracion: {
      config: {
        operador: 'Yoel',
        formatoFecha: 'DD/MM/YYYY',
        titulo: 'Seguimiento de Derivaciones',
      },
      pasos: UTILES['pasos-art-tracker'],
      tips: UTILES['tips-art-tracker'],
      links: UTILES['links-art-tracker'],
      speechs: UTILES['speechs-art-tracker'],
      objeciones: UTILES['objeciones-art-tracker'],
      art: UTILES['art-art-tracker'],
      transito: UTILES['transito-art-tracker'],
      lesiones: UTILES['lesiones-art-tracker'],
      mapeo: UTILES['mapeo-art-tracker'],
      'observaciones-transito': UTILES['observaciones-transito-art-tracker'],
    },
  };

  it('importConfigFromJSON restaura los útiles', async () => {
    const result = await importConfigFromJSON(JSON.stringify(ARCHIVO_USUARIO));
    expect(result.success).toBe(true);
    expect(localStorageAdapter.get('pasos-art-tracker')).toMatchObject(UTILES['pasos-art-tracker']);
    expect(localStorageAdapter.get('lesiones-art-tracker')).toEqual(UTILES['lesiones-art-tracker']);
  });

  it('al importar una config parcial, completa los campos faltantes con los defaults', async () => {
    await importConfigFromJSON(JSON.stringify(ARCHIVO_USUARIO));

    const config = localStorageAdapter.get('config-art-tracker');
    // Lo importado se conserva...
    expect(config.operador).toBe('Yoel');
    expect(config.formatoFecha).toBe('DD/MM/YYYY');
    // ...y los campos ausentes en el archivo se completan con CONFIG_DEFAULT.
    expect(config.columnasVisibles).toEqual(CONFIG_DEFAULT.columnasVisibles);
    expect(config.casosPorPagina).toBe(CONFIG_DEFAULT.casosPorPagina);
    expect(config.plantillas).toEqual(CONFIG_DEFAULT.plantillas);
    expect(config.busquedaHistorial).toBe(CONFIG_DEFAULT.busquedaHistorial);
    expect(Object.keys(config).length).toBeGreaterThanOrEqual(Object.keys(CONFIG_DEFAULT).length);
  });
});

describe('Versión base 1.0', () => {
  it('BACKUP_VERSION es 1.1', () => {
    expect(BACKUP_VERSION).toBe('1.1');
  });

  it('exportConfigToJSON escribe version 1.1', async () => {
    sembrarUtiles();
    const exported = JSON.parse(await exportConfigToJSON());
    expect(exported.version).toBe('1.1');
  });

  it('las claves exportadas cubren todos los CONFIG_KEYS', async () => {
    sembrarUtiles();
    const exported = JSON.parse(await exportConfigToJSON());
    const expected = CONFIG_KEYS.map((k) => k.replace('-art-tracker', ''));
    for (const key of expected) {
      expect(Object.keys(exported.configuracion)).toContain(key);
    }
  });
});

describe('v1.1.0: nuevos campos (condicionales, estados, tipos de ingreso, dirección)', () => {
  const DATOS_NUEVOS = {
    'condicionales-art-tracker': [
      { id: 'c1', estudio: 'SALABERRY', aseguradora: 'ANDINA', condicion: 'no-toma', tipoIngreso: 'Accidente Laboral', lesion: '', observacion: 'No toman accidentes in itinere' },
    ],
    'mapeo-art-tracker': [
      { id: 'm1', estudio: 'SALABERRY', provincia: 'BUENOS AIRES', localidad: 'Tandil', direccion: 'Av. España 123', prolegal: true, cargaProlegal: 'María', entrevistador: 'Juan' },
      { id: 'm2', estudio: 'SALABERRY', provincia: 'BUENOS AIRES', localidades: 'Tandil, La Plata', direcciones: ['Av. España 123', 'Calle 5 678'] },
    ],
    'config-art-tracker': {
      operador: 'Yoel',
      estados: [{ v: 'Firmo', accent: '#10B981', peso: 2 }, { v: 'Cita virtual', accent: '#60A5FA', peso: 1 }],
      tiposIngreso: ['Accidente + Cirugía', 'Enfermedad Profesional'],
    },
  };

  function sembrarNuevos() {
    for (const [k, v] of Object.entries(DATOS_NUEVOS)) {
      localStorageAdapter.set(k, v);
    }
  }

  it('exportConfigToJSON incluye condicionales, estados y tipos de ingreso', async () => {
    sembrarNuevos();
    const exported = JSON.parse(await exportConfigToJSON());
    expect(exported.configuracion.condicionales).toEqual(DATOS_NUEVOS['condicionales-art-tracker']);
    expect(exported.configuracion.config.estados).toEqual(DATOS_NUEVOS['config-art-tracker'].estados);
    expect(exported.configuracion.config.tiposIngreso).toEqual(DATOS_NUEVOS['config-art-tracker'].tiposIngreso);
    expect(exported.configuracion.mapeo[0].direccion).toBe('Av. España 123');
    expect(exported.configuracion.mapeo[0].prolegal).toBe(true);
    expect(exported.configuracion.mapeo[1].direcciones).toEqual(['Av. España 123', 'Calle 5 678']);
  });

  it('roundtrip de backup completo conserva los nuevos campos', async () => {
    sembrarNuevos();
    const backup = await exportBackup();
    localStorage.clear();
    await importBackup(backup);

    expect(localStorageAdapter.get('condicionales-art-tracker')).toEqual(DATOS_NUEVOS['condicionales-art-tracker']);
    expect(localStorageAdapter.get('mapeo-art-tracker')[0]).toMatchObject({ direccion: 'Av. España 123', prolegal: true });
    expect(localStorageAdapter.get('mapeo-art-tracker')[1].direcciones).toEqual(['Av. España 123', 'Calle 5 678']);
    const config = localStorageAdapter.get('config-art-tracker');
    expect(config.estados).toEqual(DATOS_NUEVOS['config-art-tracker'].estados);
    expect(config.tiposIngreso).toEqual(DATOS_NUEVOS['config-art-tracker'].tiposIngreso);
  });
});

// ============================================================
// Release 1.3.3 — Integridad de datos
// ============================================================
describe('1.3.3: protección contra reemplazos que vacían datos', () => {
  it('un backup con 0 casos NO vacía los casos existentes (bloqueo CRITICAL)', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Ana', telefono: '2615550001', estado: 'Pendiente', fecha: '2026-07-01' },
      { id: 'c2', nombre: 'Bruno', telefono: '2615550002', estado: 'Pendiente', fecha: '2026-07-02' },
    ]);

    // Backup legítimo pero cuya sección de casos quedó vacía.
    await appDB.notes.add({ title: 'N', content: '', tags: [], createdAt: new Date().toISOString() });
    const backup = await exportBackup();
    backup.data.db.cases = [];
    const { computeChecksum } = await import('../../services/backupService');
    backup.checksum = await computeChecksum(backup.data);

    await expect(importBackup(backup)).rejects.toThrow(/bloqueada por integridad/i);

    // Los datos siguen intactos y NO se creó salvaguarda (no se escribió nada).
    const casos = await casesDB.cases.toArray();
    expect(casos).toHaveLength(2);
  });

  it('el override explícito permitirVaciar sí permite el reemplazo por vacío', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Ana', telefono: '2615550001', estado: 'Pendiente', fecha: '2026-07-01' },
    ]);
    const backup = await exportBackup();
    await casesDB.cases.bulkPut([
      { id: 'extra', nombre: 'Extra', telefono: '2615550009', estado: 'Pendiente', fecha: '2026-07-05' },
    ]);
    // Vaciamos manualmente la sección de casos del snapshot para simular
    // "archivo con 0 casos" ya confirmado por el usuario.
    backup.data.db.cases = [];
    const { computeChecksum } = await import('../../services/backupService');

    backup.checksum = await computeChecksum(backup.data);
    const result = await importBackup(backup, { permitirVaciar: true });

    const casos = await casesDB.cases.toArray();
    expect(casos).toHaveLength(0);
    expect(result.safeguardId).toBeTruthy(); // quedó salvaguarda previa
    // La salvaguarda conserva los datos que había antes del vaciado.
    const safeguard = (await import('../../core/db/appDB')).default.auto_backups;
    const registro = await safeguard.get(result.safeguardId);
    expect(registro.backup.data.db.cases).toHaveLength(2);
  });

  it('sección de notas ausente omite el bloque y preserva las notas actuales', async () => {
    await casesDB.cases.bulkPut([
      { id: 'c1', nombre: 'Ana', telefono: '2615550001', estado: 'Pendiente', fecha: '2026-07-01' },
    ]);
    await appDB.notes.add({ id: 'n1', title: 'N1', content: '', tags: [], createdAt: new Date().toISOString() });
    const backup = await exportBackup();

    delete backup.data.db.notes;
    const { computeChecksum } = await import('../../services/backupService');
    backup.checksum = await computeChecksum(backup.data);

    const result = await importBackup(backup);

    // Casos restaurados; las notas actuales NO fueron borradas.
    expect(await casesDB.cases.count()).toBe(1);
    expect(await appDB.notes.count()).toBe(1);
    expect(await appDB.notes.get('n1')).toBeTruthy();
    expect(result.warnings.some((w) => w.includes('"notes"'))).toBe(true);
  });

  it('filas con estructura inválida dentro de una sección se omiten con advertencia', async () => {
    const backupVacio = await exportBackup();
    backupVacio.data.db.cases = [
      { id: 'ok1', nombre: 'Valido', telefono: '2615550001', estado: 'Pendiente', fecha: '2026-07-01' },
      'fila-corrupta-no-objeto',
      42,
    ];
    const { computeChecksum } = await import('../../services/backupService');
    backupVacio.checksum = await computeChecksum(backupVacio.data);

    const result = await importBackup(backupVacio);
    expect(result.counts.cases).toBe(3);
    expect(result.warnings.some((w) => w.startsWith('casos:'))).toBe(true);
    const casos = await casesDB.cases.toArray();
    expect(casos).toHaveLength(1);
    expect(casos[0].nombre).toBe('Valido');
  });
});

describe('1.3.3: round-trip sin pérdida (campos desconocidos y tránsito-selección)', () => {
  it('campos desconocidos/futuros de un caso se preservan en backup→restaurar', async () => {
    const casoFuturo = {
      id: 'futuro',
      nombre: 'CASO FUTURO',
      telefono: '2615550777',
      estado: 'Pendiente',
      fecha: '2026-08-01',
      campoDeVersionFutura: { anidado: [1, 2, { profundo: true }] },
    };
    await casesDB.cases.put(casoFuturo);

    const backup = await exportBackup();
    await casesDB.cases.clear();
    await importBackup(backup);

    const restaurado = await casesDB.cases.get('futuro');
    expect(restaurado.campoDeVersionFutura).toEqual({ anidado: [1, 2, { profundo: true }] });
    expect(restaurado.nombre).toBe('CASO FUTURO');
  });

  it('transito-seleccion-art-tracker sobrevive al roundtrip completo', async () => {
    localStorageAdapter.set('transito-seleccion-art-tracker', ['AGROSALTA', 'RIVER PLATE']);
    sembrarUtiles();

    const backup = await exportBackup();
    localStorage.clear();
    await importBackup(backup);

    expect(localStorageAdapter.get('transito-seleccion-art-tracker')).toEqual([
      'AGROSALTA',
      'RIVER PLATE',
    ]);
  });

  it('roundtrip completo casos+notas+eventos+historial sin pérdidas', async () => {
    await casesDB.cases.bulkPut([
      { id: 'rc1', nombre: 'CARLA', telefono: '2615550011', estado: 'Firmo', fecha: '2026-07-10' },
    ]);
    await casesDB.case_history.add({
      caseId: 'rc1', type: 'case_created', title: 'Caso creado', description: '',
      metadata: null, source: 'automatic', timestamp: new Date().toISOString(),
    });
    await appDB.notes.add({ id: 'rn1', title: 'Nota RT', content: '<p>hola</p>', tags: [], relatedCaseIds: ['rc1'], createdAt: new Date().toISOString() });
    await appDB.events.add({ id: 're1', title: 'Cita RT', startDate: '2026-08-30', status: 'pending', relatedNoteId: null, relatedCaseIds: ['rc1'], createdAt: new Date().toISOString() });

    const backup = await exportBackup();
    await limpiar();
    await casesDB.case_history.clear();
    await importBackup(backup);

    expect(await casesDB.cases.count()).toBe(1);
    expect(await casesDB.case_history.count()).toBe(1);
    expect(await appDB.notes.count()).toBe(1);
    expect(await appDB.events.count()).toBe(1);
    const nota = await appDB.notes.get('rn1');
    expect(nota.relatedCaseIds).toEqual(['rc1']); // referencia intacta
  });
});
