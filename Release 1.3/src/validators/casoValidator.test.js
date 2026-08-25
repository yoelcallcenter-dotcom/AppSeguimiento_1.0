import { describe, it, expect } from 'vitest';
import { validateCaso } from './casoValidator';

describe('validateCaso', () => {
  const casoValido = {
    nombre: 'Juan Perez',
    telefono: '261 555-1234',
    localidad: 'GUAYMALLEN',
  };

  it('acepta un caso válido', () => {
    const result = validateCaso(casoValido);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rechaza sin nombre', () => {
    const result = validateCaso({ ...casoValido, nombre: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('El nombre es requerido');
  });

  it('rechaza sin teléfono', () => {
    const result = validateCaso({ ...casoValido, telefono: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('El teléfono es requerido');
  });

  it('rechaza teléfono con caracteres inválidos', () => {
    const result = validateCaso({ ...casoValido, telefono: 'abc123' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('El teléfono contiene caracteres inválidos');
  });

  it('rechaza teléfono demasiado corto', () => {
    const result = validateCaso({ ...casoValido, telefono: '1234' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('El teléfono es demasiado corto');
  });

  it('rechaza sin localidad', () => {
    const result = validateCaso({ ...casoValido, localidad: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La localidad es requerida');
  });

  it('rechaza email inválido pero acepta email válido', () => {
    const malo = validateCaso({ ...casoValido, email: 'no-es-un-email' });
    expect(malo.errors).toContain('El email no es válido');
    const bueno = validateCaso({ ...casoValido, email: 'juan@test.com' });
    expect(bueno.errors).not.toContain('El email no es válido');
  });
});
