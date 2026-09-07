import { describe, it, expect } from 'vitest';
import { redactPII, redactObject } from './redact';

describe('redactPII', () => {
  it('redacta teléfonos argentinos', () => {
    expect(redactPII('Mi tel es +5491155551234')).toContain('[TEL]');
  });

  it('redacta teléfonos con formato', () => {
    expect(redactPII('Llamar al (011) 5555-1234')).toContain('[TEL]');
  });

  it('redacta emails', () => {
    expect(redactPII('Contacto: juan@test.com')).toContain('[EMAIL]');
  });

  it('redacta CUIL/CUIT', () => {
    expect(redactPII('CUIL: 20-12345678-9')).toContain('[CUIL]');
    expect(redactPII('CUIT 23123456789')).toContain('[CUIL]');
  });

  it('no modifica texto sin PII', () => {
    expect(redactPII('Hola mundo')).toBe('Hola mundo');
  });

  it('devuelve non-string sin modificar', () => {
    expect(redactPII(42)).toBe(42);
    expect(redactPII(null)).toBe(null);
  });

  it('redacta múltiples tipos en un solo string', () => {
    const input = 'Juan juan@test.com +5491155551234';
    const result = redactPII(input);
    expect(result).toContain('[EMAIL]');
    expect(result).toContain('[TEL]');
  });
});

describe('redactObject', () => {
  it('reemplaza valores de keys PII por [PII]', () => {
    const input = { nombre: 'Juan Pérez', edad: 30 };
    const result = redactObject(input);
    expect(result.nombre).toBe('[PII]');
    expect(result.edad).toBe(30);
  });

  it('detecta telefono como key PII', () => {
    const input = { telefono: '1234567890' };
    const result = redactObject(input);
    expect(result.telefono).toBe('[PII]');
  });

  it('detecta email como key PII', () => {
    const input = { email: 'test@test.com' };
    const result = redactObject(input);
    expect(result.email).toBe('[PII]');
  });

  it('redacta strings en values no-PII', () => {
    const input = { nota: 'Llamar al +5491155551234' };
    const result = redactObject(input);
    expect(result.nota).toContain('[TEL]');
  });

  it(' recursa en objetos anidados', () => {
    const input = { data: { nombre: 'Juan', info: 'Mail: juan@test.com' } };
    const result = redactObject(input);
    expect(result.data.nombre).toBe('[PII]');
    expect(result.data.info).toContain('[EMAIL]');
  });

  it('limita profundidad a 10', () => {
    let deep = 'value';
    for (let i = 0; i < 12; i++) {
      deep = { nested: deep };
    }
    const result = redactObject(deep);
    // A profundidad 11+, el valor se reemplaza por [REDACTED]
    let current = result;
    for (let i = 0; i < 10; i++) {
      current = current.nested;
    }
    expect(current.nested).toBe('[REDACTED]');
  });

  it('maneja arrays', () => {
    const input = [{ nombre: 'Juan' }, { telefono: '123' }];
    const result = redactObject(input);
    expect(result[0].nombre).toBe('[PII]');
    expect(result[1].telefono).toBe('[PII]');
  });

  it('devuelve non-object sin modificar', () => {
    expect(redactObject(null)).toBe(null);
    expect(redactObject(42)).toBe(42);
  });
});
