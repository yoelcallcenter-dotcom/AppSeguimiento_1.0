import { reportError } from '../../core/error/reportError';

let rules = [];
let listeners = [];

function registerRule(rule) {
  if (!rule || !rule.name || !rule.condition || !rule.action) {
    reportError({ type: 'validation', message: 'Invalid rule definition', context: rule });
    return false;
  }
  if (rules.find((r) => r.name === rule.name)) {
    reportError({ type: 'validation', message: `Rule "${rule.name}" already registered` });
    return false;
  }
  rules = [...rules, { ...rule, enabled: rule.enabled !== false }];
  return true;
}

function unregisterRule(name) {
  rules = rules.filter((r) => r.name !== name);
  return true;
}

function enableRule(name, enabled = true) {
  rules = rules.map((r) => (r.name === name ? { ...r, enabled } : r));
}

function getRules() {
  return [...rules];
}

function clearRules() {
  rules = [];
}

function evaluateCondition(entity, condition) {
  if (typeof condition === 'function') {
    try {
      return condition(entity);
    } catch (err) {
      reportError({ type: 'rule', message: `Condition error: ${condition.name || 'anonymous'}`, context: err });
      return false;
    }
  }

  if (typeof condition === 'object' && condition.field && condition.operator) {
    const value = condition.field.split('.').reduce((o, k) => (o ? o[k] : undefined), entity);
    switch (condition.operator) {
      case 'equals': return value === condition.value;
      case 'notEquals': return value !== condition.value;
      case 'contains': return String(value || '').includes(condition.value);
      case 'startsWith': return String(value || '').startsWith(condition.value);
      case 'endsWith': return String(value || '').endsWith(condition.value);
      case 'gt': return Number(value) > Number(condition.value);
      case 'gte': return Number(value) >= Number(condition.value);
      case 'lt': return Number(value) < Number(condition.value);
      case 'lte': return Number(value) <= Number(condition.value);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'notIn': return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'exists': return value !== undefined && value !== null;
      case 'notExists': return value === undefined || value === null;
      case 'isEmpty': return value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0);
      case 'notEmpty': return !(value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0));
      default: return false;
    }
  }

  return false;
}

async function runRules(entity, context = {}) {
  const results = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    try {
      const matched = evaluateCondition(entity, rule.condition);
      if (matched) {
        const result = await rule.action(entity, context);
        results.push({ rule: rule.name, matched: true, result });
      }
    } catch (err) {
      reportError({ type: 'rule', message: `Rule "${rule.name}" failed`, context: err });
      results.push({ rule: rule.name, matched: false, error: err.message });
    }
  }
  return results;
}

function subscribe(listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners(event) {
  listeners.forEach((l) => {
    try { l(event); } catch {}
  });
}

const defaultRules = [
  {
    name: 'case-estado-nuevo-create-event',
    description: 'Crear evento automatico cuando un caso entra en estado "Cita virtual" o "Cita presencial"',
    enabled: true,
    condition: (entity) =>
      entity.estado &&
      ['Cita virtual', 'Cita presencial'].includes(entity.estado) &&
      entity._prevEstado !== entity.estado,
    action: async (entity) => {
      const { createEvent } = await import('../calendar/calendarStore');
      const today = new Date().toISOString().slice(0, 10);
      await createEvent({
        title: `Cita: ${entity.nombre || 'Sin nombre'}`,
        startDate: `${today}T09:00:00`,
        description: `Cita agendada para ${entity.nombre}`,
        status: 'pending',
        priority: 'high',
        relatedCaseIds: [entity.id],
      });
      return { action: 'createEvent', entityId: entity.id };
    },
  },
  {
    name: 'case-sin-telefono-alert',
    description: 'Alertar si un caso no tiene telefono',
    enabled: true,
    condition: (entity) => !entity.telefono || entity.telefono.trim() === '',
    action: async (entity) => {
      return { action: 'alert', message: `Caso "${entity.nombre}" sin telefono`, severity: 'warning' };
    },
  },
];

defaultRules.forEach(registerRule);

export {
  registerRule,
  unregisterRule,
  enableRule,
  getRules,
  clearRules,
  runRules,
  subscribe,
};
