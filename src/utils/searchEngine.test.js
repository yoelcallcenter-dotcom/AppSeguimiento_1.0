import { describe, it, expect } from 'vitest';
import {
  parseBusqueda,
  casoCoincide,
  crearIndicesGlobal,
  buscarGlobal,
  buscarEntidades,
  condicionalSubtitle,
  flattenReportes,
  flattenHistorial,
} from './searchEngine';
import { parseFicha } from './helpers';

describe('parseBusqueda', () => {
  it('detecta búsqueda por etiqueta con #', () => {
    expect(parseBusqueda('#amable')).toEqual({ tipo: 'tag', termino: 'amable' });
  });

  it('detecta búsqueda por comentario con @', () => {
    expect(parseBusqueda('@Desconfiada con la virtualidad')).toEqual({
      tipo: 'comentario',
      termino: 'Desconfiada con la virtualidad',
    });
  });

  it('detecta texto libre', () => {
    expect(parseBusqueda('juan perez')).toEqual({ tipo: 'texto', termino: 'juan perez' });
  });
});

describe('casoCoincide', () => {
  const caso = {
    nombre: 'NIZ PATRICIA',
    telefono: '2615550001',
    localidad: 'MENDOZA',
    aseguradora: 'SANCOR',
    profesion: 'Docente',
    tags: ['amable', 'desconfiado'],
    comentarios: [{ texto: 'Desconfiada con la virtualidad' }],
  };

  it('filtra por #etiqueta (solo casos con esa etiqueta)', () => {
    expect(casoCoincide(caso, '#amable')).toBe(true);
    expect(casoCoincide(caso, '#desconfiado')).toBe(true);
    expect(casoCoincide(caso, '#otra')).toBe(false);
    expect(casoCoincide({ ...caso, tags: [] }, '#amable')).toBe(false);
  });

  it('filtra por @primera palabra del comentario', () => {
    expect(casoCoincide(caso, '@Desconfiada con la virtualidad')).toBe(true);
    expect(casoCoincide(caso, '@Desconfiada')).toBe(true);
    expect(casoCoincide(caso, '@Otra cosa')).toBe(false);
    expect(casoCoincide({ ...caso, comentarios: [] }, '@Desconfiada')).toBe(false);
  });

  it('busca texto libre incluyendo profesion, tags y comentarios', () => {
    expect(casoCoincide(caso, 'docente')).toBe(true);
    expect(casoCoincide(caso, 'amable')).toBe(true);
    expect(casoCoincide(caso, 'virtualidad')).toBe(true);
    expect(casoCoincide(caso, 'nada que ver')).toBe(false);
  });

  it('devuelve true con consulta vacía', () => {
    expect(casoCoincide(caso, '')).toBe(true);
    expect(casoCoincide(caso, '   ')).toBe(true);
  });
});

describe('buscarGlobal', () => {
  const cases = [
    { id: 'c1', nombre: 'NIZ PATRICIA', tags: ['amable'], comentarios: [{ texto: 'Desconfiada con la virtualidad' }] },
    { id: 'c2', nombre: 'OTRO CASO', tags: ['urgente'], comentarios: [{ texto: 'Sin novedades' }] },
    { id: 'c3', nombre: 'SIN TAGS', tags: [], comentarios: [] },
  ];
  const notes = [
    { id: 'n1', title: 'Nota amable', tags: ['amable'] },
    { id: 'n2', title: 'Nota sin tag', tags: [] },
  ];
  const events = [
    { id: 'e1', title: 'Evento amable', tags: ['amable'] },
    { id: 'e2', title: 'Evento común', tags: [] },
  ];
  const indices = crearIndicesGlobal({ cases, notes, events });

  it('#etiqueta devuelve SOLO casos/notas/eventos con esa etiqueta', () => {
    const r = buscarGlobal(indices, '#amable');
    expect(r.cases.map((c) => c.id)).toEqual(['c1']);
    expect(r.notes.map((n) => n.id)).toEqual(['n1']);
    expect(r.events.map((e) => e.id)).toEqual(['e1']);
  });

  it('@comentario devuelve SOLO casos con ese comentario', () => {
    const r = buscarGlobal(indices, '@Desconfiada con la virtualidad');
    expect(r.cases.map((c) => c.id)).toEqual(['c1']);
    expect(r.notes).toEqual([]);
    expect(r.events).toEqual([]);
  });

  it('texto libre usa Fuse en casos/notas/eventos', () => {
    const r = buscarGlobal(indices, 'amable');
    expect(r.cases.length).toBeGreaterThan(0);
    expect(r.notes.length).toBeGreaterThan(0);
    expect(r.events.length).toBeGreaterThan(0);
  });

  it('consulta vacía no devuelve resultados', () => {
    const r = buscarGlobal(indices, '');
    expect(r.cases).toEqual([]);
  });
});

describe('flattenReportes', () => {
  it('aplane el reporteHistory de cada caso en items buscables', () => {
    const casos = [
      {
        id: 'c1',
        nombre: 'ANA LOPEZ',
        reporteHistory: [
          { fecha: '07/09', texto: 'Llame al paciente', origen: 'Operador' },
          { fecha: '06/09', texto: 'Sin novedades', origen: 'Estudio Juridico' },
        ],
      },
      { id: 'c2', nombre: 'JUAN PEREZ', reporteHistory: [] },
    ];
    const items = flattenReportes(casos);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: 'rep-c1-0', type: 'reporte', caseId: 'c1', caseNombre: 'ANA LOPEZ', texto: 'Llame al paciente', fecha: '07/09', origen: 'Operador' });
    expect(items[1].id).toBe('rep-c1-1');
  });

  it('devuelve [] sin casos o sin reporteHistory', () => {
    expect(flattenReportes([])).toEqual([]);
    expect(flattenReportes([{ id: 'x', reporteHistory: undefined }])).toEqual([]);
  });
});

describe('flattenHistorial', () => {
  it('mapea filas de case_history y agrega el nombre del caso', () => {
    const casos = [{ id: 'c1', nombre: 'ANA LOPEZ' }];
    const filas = [
      { id: 1, caseId: 'c1', type: 'status_changed', title: 'Estado actualizado', description: 'Activo → Pendiente', timestamp: '2026-09-07T10:00:00Z', source: 'automatic' },
    ];
    const items = flattenHistorial(filas, casos);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'hist-1', type: 'historial', caseId: 'c1', caseNombre: 'ANA LOPEZ', title: 'Estado actualizado' });
  });

  it('usa "Sin nombre" si el caso no existe y devuelve [] sin filas', () => {
    const items = flattenHistorial([{ id: 9, caseId: 'zz', title: 'X', description: '', timestamp: '', source: '' }], []);
    expect(items[0].caseNombre).toBe('Sin nombre');
    expect(flattenHistorial([], [])).toEqual([]);
  });
});

describe('buscarGlobal con reportes e historial (1.7.2)', () => {
  const cases = [
    {
      id: 'c1',
      nombre: 'NIZ PATRICIA',
      reporteHistory: [{ fecha: '07/09', texto: 'Intervención quirúrgica confirmada', origen: 'Operador' }],
    },
    { id: 'c2', nombre: 'OTRO CASO', reporteHistory: [] },
  ];
  const historial = [
    { id: 1, caseId: 'c1', type: 'status_changed', title: 'Estado actualizado', description: 'Activo → Pendiente', timestamp: '2026-09-07T10:00:00Z', source: 'manual' },
  ];
  const indices = crearIndicesGlobal({ cases, notes: [], events: [], historial });

  it('encuentra reportes por texto', () => {
    const r = buscarGlobal(indices, 'quirúrgica');
    expect(r.reportes.length).toBeGreaterThan(0);
    expect(r.reportes[0]).toMatchObject({ type: 'reporte', caseId: 'c1', caseNombre: 'NIZ PATRICIA' });
  });

  it('encuentra historial por título o descripción', () => {
    const r = buscarGlobal(indices, 'Pendiente');
    expect(r.historial.length).toBeGreaterThan(0);
    expect(r.historial[0]).toMatchObject({ type: 'historial', caseId: 'c1' });
  });

  it('la consulta vacía no genera reportes ni historial', () => {
    const r = buscarGlobal(indices, '');
    expect(r.reportes).toEqual([]);
    expect(r.historial).toEqual([]);
  });

  it('#etiqueta no produce reportes ni historial', () => {
    const r = buscarGlobal(indices, '#algo');
    expect(r.reportes).toEqual([]);
    expect(r.historial).toEqual([]);
  });

  it('sin historial cargado, fuseHistorial devuelve [] y no rompe', () => {
    const idx = crearIndicesGlobal({ cases, notes: [], events: [] });
    const r = buscarGlobal(idx, 'cualquiera');
    expect(Array.isArray(r.reportes)).toBe(true);
    expect(Array.isArray(r.historial)).toBe(true);
  });
});

describe('parseFicha', () => {
  it('lee PROFESION, TAGS y COMENTARIOS además del resto de la ficha', () => {
    const texto = [
      'NOMBRE: Niz Patricia',
      'TELEFONO: 2615550001',
      'LOCALIDAD: Mendoza',
      'ART: Sancor Salud',
      'PROFESION: Docente',
      'INGRESO: 01/08/2026',
      'LESION: Hombro',
      'CITA: 10/08 10:00',
      'OBSERVACIONES: Llamar después de las 18',
      'TAGS: amable, desconfiado',
      'COMENTARIOS: Desconfiada con la virtualidad',
    ].join('\n');

    const f = parseFicha(texto);
    expect(f.nombre).toBe('NIZ PATRICIA');
    expect(f.telefono).toBe('2615550001');
    expect(f.profesion).toBe('Docente');
    expect(f.tags).toEqual(['amable', 'desconfiado']);
    expect(f.comentarios).toHaveLength(1);
    expect(f.comentarios[0].texto).toBe('Desconfiada con la virtualidad');
    expect(f.comentarios[0].fecha).toBeTruthy();
    expect(f.observaciones).toBe('Llamar después de las 18');
  });

  it('no rompe una ficha sin TAGS ni COMENTARIOS', () => {
    const texto = ['NOMBRE: Juan Perez', 'TELEFONO: 3814123456', 'LOCALIDAD: San Miguel'].join('\n');
    const f = parseFicha(texto);
    expect(f.nombre).toBe('JUAN PEREZ');
    expect(f.tags).toEqual([]);
    expect(f.comentarios).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// S11 / S11b (1.10.1): regressiones del grupo de entidades.
// Antes se leía m.nombre (el mapeo real usa .estudio, ver MAPEO_EJEMPLO en
// constants.js) y c.estudioJuridico en condicionales (el modelo real usa
// .estudio + .condicion, ver entityRelations/CondicionalesView): por eso los
// grupos "Estudios Jurídicos" y "Condicionales" NUNCA aparecían y el
// subtítulo de condicionales salía "condición — " vacío.
// ---------------------------------------------------------------------------
describe('buscarEntidades (S11/S11b, 1.10.1)', () => {
  // Mismo shape que MAPEO_EJEMPLO: filas por provincia del MISMO estudio.
  const mapeo = [
    { id: 'm1', estudio: 'Estudio Ejemplo & Asoc.', provincia: 'Buenos Aires' },
    { id: 'm2', estudio: 'Estudio Ejemplo & Asoc.', provincia: 'CABA' },
    { id: 'm3', estudio: 'Gurevich & Asoc.', provincia: 'CABA' },
  ];
  // Shape real de condicionales: .aseguradora + .estudio + .condicion.
  const condicionales = [
    { aseguradora: 'SANCOR', estudio: 'Estudio Ejemplo & Asoc.', condicion: 'no-toma' },
    { aseguradora: 'GALENO', estudio: 'Gurevich & Asoc.', condicion: 'condicion' },
  ];
  const cases = [
    { id: 'c1', aseguradora: 'SANCOR', estudioJuridico: 'Estudio Ejemplo & Asoc.' },
    { id: 'c2', aseguradora: 'SANCOR', estudioJuridico: 'Estudio Ejemplo & Asoc.' },
    { id: 'c3', aseguradora: 'GALENO', estudioJuridico: 'GL CABA' },
  ];
  const aseguradoras = ['SANCOR', 'GALENO', 'OSDE'];
  const indices = { aseguradoras, mapeo, condicionales, cases };

  it('encuentra estudios usando .estudio (campo real del mapeo)', () => {
    const r = buscarEntidades(indices, 'gurevich');
    expect(r.lawFirms.map((lf) => lf.nombre)).toEqual(['Gurevich & Asoc.']);
  });

  it('deduplica el mapeo por nombre: varias filas del mismo estudio = 1 resultado', () => {
    const r = buscarEntidades(indices, 'ejemplo');
    expect(r.lawFirms).toHaveLength(1);
    expect(r.lawFirms[0].nombre).toBe('Estudio Ejemplo & Asoc.');
  });

  it('encuentra condicionales por .aseguradora o .estudio (nunca .estudioJuridico)', () => {
    const porEstudio = buscarEntidades(indices, 'gurevich');
    expect(porEstudio.condicionales).toHaveLength(1);
    expect(porEstudio.condicionales[0]).toMatchObject({
      estudio: 'Gurevich & Asoc.',
      condicion: 'condicion',
    });

    const porAseguradora = buscarEntidades(indices, 'sancor');
    expect(porAseguradora.condicionales).toHaveLength(1);
    expect(porAseguradora.condicionales[0]).toMatchObject({ aseguradora: 'SANCOR' });
  });

  it('calcula casesCount real de aseguradoras y estudios (S11b)', () => {
    const r = buscarEntidades(indices, 'sancor');
    expect(r.insurers).toEqual([{ nombre: 'SANCOR', casesCount: 2 }]);

    // El estudio deduplicado debe contar una sola vez (no 2 filas x 2 casos).
    const r2 = buscarEntidades(indices, 'ejemplo');
    expect(r2.lawFirms[0].casesCount).toBe(2);

    const r3 = buscarEntidades(indices, 'galeno');
    expect(r3.insurers[0].casesCount).toBe(1);
  });

  it('sin casos en entityIndices devuelve casesCount 0 sin romper (retrocompat)', () => {
    const r = buscarEntidades({ aseguradoras, mapeo, condicionales }, 'sancor');
    expect(r.insurers[0]).toEqual({ nombre: 'SANCOR', casesCount: 0 });
    expect(r.lawFirms).toEqual([]);
  });

  it('consulta vacía devuelve los tres grupos vacíos', () => {
    expect(buscarEntidades(indices, '')).toEqual({ insurers: [], lawFirms: [], condicionales: [] });
    expect(buscarEntidades(indices, '   ')).toEqual({ insurers: [], lawFirms: [], condicionales: [] });
  });

  it('limita cada grupo a 5 resultados', () => {
    const muchos = Array.from({ length: 8 }, (_, i) => ({ estudio: `Estudio ${i}` }));
    const r = buscarEntidades({ aseguradoras, mapeo: muchos, condicionales, cases }, 'estudio');
    expect(r.lawFirms).toHaveLength(5);
  });
});

// S11b: subtítulo de condicionales con el modelo real (.estudio + .condicion).
describe('condicionalSubtitle / condicionalEtiqueta (S11b, 1.10.1)', () => {
  it('compone "<etiqueta> — <estudio>" con .estudio real', () => {
    expect(condicionalSubtitle({ aseguradora: 'SANCOR', estudio: 'GL CABA', condicion: 'no-toma' }))
      .toBe('No toma — GL CABA');
    expect(condicionalSubtitle({ aseguradora: 'SANCOR', estudio: 'GL CABA', condicion: 'condicion' }))
      .toBe('Con condiciones — GL CABA');
  });

  it('usa fallbacks razonables si faltan estudio o condición', () => {
    expect(condicionalSubtitle({})).toBe('Con condiciones — Sin estudio');
    expect(condicionalSubtitle(null)).toBe('Con condiciones — Sin estudio');
    expect(condicionalSubtitle({ estudio: 'GL MdP', condicion: 'no-toma' })).toBe('No toma — GL MdP');
  });
});
