import { describe, it, expect } from 'vitest';
import { parseCSV, normalizeRow } from './csvParse';

describe('parseCSV', () => {
  it('parsea CSV simple con comas como separadores', () => {
    const { headers, rows } = parseCSV('Nombre,Telefono\nJuan,2615\nMaria,2616');
    expect(headers).toEqual(['Nombre', 'Telefono']);
    expect(rows).toEqual([
      ['Juan', '2615'],
      ['Maria', '2616'],
    ]);
  });

  it('mantiene comas dentro de campos entre comillas', () => {
    const { headers, rows } = parseCSV(
      'Nombre,Observaciones\nJuan,"Pendiente, prioridad alta"'
    );
    expect(rows).toEqual([['Juan', 'Pendiente, prioridad alta']]);
  });

  it('maneja comillas escapadas ("") dentro de campos', () => {
    const { rows } = parseCSV('Nombre,Nota\nJuan,"dijo ""hola"""');
    expect(rows[0][1]).toBe('dijo "hola"');
  });

  it('mantiene saltos de línea dentro de campos entre comillas', () => {
    const { rows } = parseCSV('Nombre,Nota\nJuan,"linea 1\nlinea 2"');
    expect(rows[0][1]).toBe('linea 1\nlinea 2');
    expect(rows).toHaveLength(1);
  });

  it('normaliza finales de línea CRLF y BOM', () => {
    const { headers, rows } = parseCSV('\uFEFFNombre,Telefono\r\nJuan,2615\r\nMaria,2616');
    expect(headers).toEqual(['Nombre', 'Telefono']);
    expect(rows).toEqual([
      ['Juan', '2615'],
      ['Maria', '2616'],
    ]);
  });

  it('fusiona celdas excedentes en la última columna (comas peladas)', () => {
    const { headers, rows } = parseCSV(
      'Nombre,Telefono,Observaciones\nJuan,2615,Pendiente, prioridad alta'
    );
    expect(headers).toHaveLength(3);
    expect(rows[0]).toEqual(['Juan', '2615', 'Pendiente, prioridad alta']);
  });

  it('completa con vacío las filas con menos celdas que encabezados', () => {
    const { rows } = parseCSV('Nombre,Telefono,Localidad\nJuan,2615\nMaria,2616,Godoy Cruz');
    expect(rows[0]).toEqual(['Juan', '2615', '']);
    expect(rows[1]).toEqual(['Maria', '2616', 'Godoy Cruz']);
  });

  it('respeta comillas en CSV generado por la propia app', () => {
    const appCsv = [
      'Nombre,Observaciones',
      '"Perez, Juan","Dijo, ""gracias"", y se fue"',
    ].join('\n');
    const { rows } = parseCSV(appCsv);
    expect(rows[0]).toEqual(['Perez, Juan', 'Dijo, "gracias", y se fue']);
  });

  it('devuelve vacío para texto sin datos o de una sola línea', () => {
    expect(parseCSV('')).toEqual({ headers: [], rows: [] });
    expect(parseCSV('Nombre,Telefono')).toEqual({ headers: [], rows: [] });
  });

  it('puede desactivar la reparación de columnas', () => {
    const { rows } = parseCSV(
      'Nombre,Telefono\nJuan,2615,extra',
      { repairColumns: false }
    );
    expect(rows[0]).toEqual(['Juan', '2615', 'extra']);
  });
});

describe('normalizeRow', () => {
  it('fusiona excedente en la última columna', () => {
    expect(normalizeRow(['a', 'b', 'c', 'd'], 3)).toEqual(['a', 'b', 'c,d']);
  });

  it('completa celdas faltantes con vacío', () => {
    expect(normalizeRow(['a'], 3)).toEqual(['a', '', '']);
  });

  it('deja intacta la fila con el tamaño correcto', () => {
    expect(normalizeRow(['a', 'b'], 2)).toEqual(['a', 'b']);
  });
});
