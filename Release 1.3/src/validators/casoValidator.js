export function validateCaso(data) {
  const errors = [];

  if (!data.nombre || data.nombre.trim() === "") {
    errors.push("El nombre es requerido");
  }

  if (!data.telefono || data.telefono.trim() === "") {
    errors.push("El teléfono es requerido");
  } else if (!/^[\d\s\-+()]+$/.test(data.telefono)) {
    errors.push("El teléfono contiene caracteres inválidos");
  }

  if (!data.localidad || data.localidad.trim() === "") {
    errors.push("La localidad es requerida");
  }

  if (data.telefono && data.telefono.length < 6) {
    errors.push("El teléfono es demasiado corto");
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("El email no es válido");
  }

  return { valid: errors.length === 0, errors };
}
