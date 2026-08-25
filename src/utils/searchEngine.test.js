import { describe, it, expect } from 'vitest';
import {
  parseBusqueda,
  casoCoincide,
  crearIndicesGlobal,
  buscarGlobal,
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
