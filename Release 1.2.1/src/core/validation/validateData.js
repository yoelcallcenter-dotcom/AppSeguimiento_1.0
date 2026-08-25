import { reportError } from '../error/reportError';

const VALID_STATES = [
  'Cita virtual', 'Cita presencial', 'No responde', 'Lo piensa',
  'Reprogramado', '2do Llamado', 'Tiene Abogado', 'No le interesa',
  'No viable', 'Incontactable', 'Pendiente', 'Firmo', 'Sin reporte',
];

export function validateCaseStructure(caso) {
  if (!caso || typeof caso !== 'object') {
    reportError(
      { message: 'Case data is not an object', type: 'DATA_ERROR' },
      { received: typeof caso }
    );
    return false;
  }

  const required = ['id', 'fecha', 'nombre', 'telefono', 'estado'];
  const missing = required.filter(f => !(f in caso));

  if (missing.length > 0) {
    reportError(
      { message: `Case missing required fields: ${missing.join(', ')}`, type: 'DATA_ERROR' },
      { caseId: caso.id, missing }
    );
    return false;
  }

  const { estado } = caso;
  if (!VALID_STATES.includes(estado)) {
    reportError(
      { message: `Case has invalid estado: "${estado}"`, type: 'DATA_ERROR' },
      { caseId: caso.id, estado }
    );
    return false;
  }

  return true;
}

export function validateCasesArray(casos) {
  if (!Array.isArray(casos)) {
    reportError(
      { message: 'Cases data is not an array', type: 'DATA_ERROR' },
      { received: typeof casos }
    );
    return false;
  }

  let validCount = 0;
  for (const caso of casos) {
    if (validateCaseStructure(caso)) validCount++;
  }

  if (validCount < casos.length) {
    reportError(
      { message: `${casos.length - validCount} of ${casos.length} cases have invalid structure`, type: 'DATA_ERROR' },
      { total: casos.length, invalid: casos.length - validCount }
    );
  }

  return validCount;
}
