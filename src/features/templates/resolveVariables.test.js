import { describe, it, expect } from 'vitest';
import { resolveVariables, AVAILABLE_VARIABLES } from './resolveVariables';

describe('resolveVariables', () => {
  const caso = {
    nombre: 'ANA LOPEZ',
    telefono: '1234567890',
    aseguradora: 'Galeno ART',
    estudioJuridico: 'GL CABA',
    estado: 'Pendiente',
    localidad: 'Buenos Aires',
    profesion: 'Enfermera',
  };
  const config = { operador: 'Juan Perez' };
  const context = { caso, config };

  it('reemplaza variables en un string', () => {
    const result = resolveVariables('Hola {NOMBRE}, su estado es {ESTADO}', context);
    expect(result).toBe('Hola ANA LOPEZ, su estado es Pendiente');
  });

  it('reemplaza FECHA y HORA con valores por defecto', () => {
    const result = resolveVariables('Fecha: {FECHA} Hora: {HORA}', {});
    expect(result).toMatch(/Fecha: \d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/Hora: \d{2}:\d{2}/);
  });

  it('usa fecha y hora personalizadas del context', () => {
    const result = resolveVariables('{FECHA} {HORA}', { fecha: '15/09/2026', hora: '14:30' });
    expect(result).toBe('15/09/2026 14:30');
  });

  it('reemplaza variables en un objeto', () => {
    const input = { title: 'Reporte {NOMBRE}', texto: 'Estado: {ESTADO}' };
    const result = resolveVariables(input, context);
    expect(result.title).toBe('Reporte ANA LOPEZ');
    expect(result.texto).toBe('Estado: Pendiente');
  });

  it('preserva valores no-string en objetos', () => {
    const input = { title: '{NOMBRE}', tags: ['tag1'], count: 5 };
    const result = resolveVariables(input, context);
    expect(result.title).toBe('ANA LOPEZ');
    expect(result.tags).toEqual(['tag1']);
    expect(result.count).toBe(5);
  });

  it('variables no reconocidas se mantienen intactas', () => {
    const result = resolveVariables('{VARIABLE_FALSA} {NOMBRE}', context);
    expect(result).toBe('{VARIABLE_FALSA} ANA LOPEZ');
  });

  it('retorna input original si no es string ni objeto', () => {
    expect(resolveVariables(null, context)).toBeNull();
    expect(resolveVariables(42, context)).toBe(42);
    expect(resolveVariables(undefined, context)).toBeUndefined();
  });

  it('maneja caso sin context', () => {
    const result = resolveVariables('{NOMBRE} {ASEGURADORA}', {});
    expect(result).toBe(' ');
  });

  it('reemplaza todas las variables disponibles', () => {
    const input = AVAILABLE_VARIABLES.map((v) => v.label).join(' ');
    const result = resolveVariables(input, context);
    expect(result).not.toContain('{');
  });
});
