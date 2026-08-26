/**
 * referentialChecks.js
 * Verificaciones de integridad referencial y de duplicados (Release 1.3.3).
 *
 * Política: detectar → clasificar → informar. NADA se elimina o repara
 * automáticamente desde acá; las reparaciones son funciones puras que la UI
 * aplica con confirmación del usuario.
 */

const LIMITE_DETALLES = 200;

/**
 * Valor comparativo del teléfono: solo dígitos (formato visible intacto en
 * el caso original). Permite detectar duplicados entre "261-555-0000" y
 * "2615550000" sin modificar el dato almacenado.
 */
function telefonoComparativo(telefono) {
  return String(telefono ?? '').replace(/\D/g, '');
}

function claveNatural(caso) {
  const n = (caso?.nombre || '').trim().toLowerCase();
  const t = telefonoComparativo(caso?.telefono);
  return n || t ? `${n}|||${t}` : null;
}

/**
 * Detecta referencias huérfanas entre notas/eventos y casos.
 * Devuelve listas acotadas con los IDs rotos para poder reparar luego.
 */
export function detectarHuerfanos({ casos = [], notas = [], eventos = [] } = {}) {
  const caseIds = new Set(casos.map((c) => String(c.id)).filter(Boolean));

  const revisar = (items, campo) => {
    const huerfanos = [];
    for (const item of items || []) {
      const refs = item[campo];
      if (!Array.isArray(refs) || refs.length === 0) continue;
      const rotas = refs.map(String).filter((id) => !caseIds.has(id));
      if (rotas.length > 0) {
        huerfanos.push({
          id: item.id,
          titulo: item.title || item.titulo || item.nombre || '(sin título)',
          refsRotas: rotas,
        });
        if (huerfanos.length >= LIMITE_DETALLES) break;
      }
    }
    return huerfanos;
  };

  const notasHuerfanas = revisar(notas, 'relatedCaseIds');
  const eventosHuerfanos = revisar(eventos, 'relatedCaseIds');

  return {
    notasHuerfanas,
    eventosHuerfanos,
    total: notasHuerfanas.length + eventosHuerfanos.length,
  };
}

/**
 * Detecta duplicados entre casos sin eliminar nada.
 * - tecnicos: mismo ID (conflicto real de clave).
 * - posibles: misma clave natural nombre+teléfono con IDs distintos
 *   (coincidencia a revisar por el usuario; puede ser gente distinta).
 * - parciales: mismo teléfono con nombres distintos (señal débil).
 */
export function detectarDuplicadosCasos(casos = []) {
  const porId = new Map();
  for (const c of casos) {
    if (!c || !c.id) continue;
    const key = String(c.id);
    if (!porId.has(key)) porId.set(key, []);
    porId.get(key).push(c);
  }
  const tecnicos = [...porId.entries()]
    .filter(([, lista]) => lista.length > 1)
    .map(([id, lista]) => ({ id, cantidad: lista.length }));

  const porClave = new Map();
  const porTelefono = new Map();
  for (const c of casos) {
    if (!c || typeof c !== 'object') continue;
    const kn = claveNatural(c);
    if (kn) {
      if (!porClave.has(kn)) porClave.set(kn, []);
      porClave.get(kn).push(c);
    }
    const t = telefonoComparativo(c.telefono);
    if (t) {
      if (!porTelefono.has(t)) porTelefono.set(t, []);
      porTelefono.get(t).push(c);
    }
  }

  const posibles = [];
  for (const [key, lista] of porClave.entries()) {
    const idsUnicos = [...new Set(lista.map((c) => String(c.id)))];
    if (idsUnicos.length > 1) {
      posibles.push({ clave: key, ids: idsUnicos, cantidad: idsUnicos.length });
      if (posibles.length >= LIMITE_DETALLES) break;
    }
  }

  const parciales = [];
  for (const [tel, lista] of porTelefono.entries()) {
    const nombres = [...new Set(lista.map((c) => (c.nombre || '').trim().toUpperCase()))];
    const idsUnicos = [...new Set(lista.map((c) => String(c.id)))];
    if (nombres.length > 1 && idsUnicos.length > 1) {
      parciales.push({ telefono: tel, ids: idsUnicos, nombres });
      if (parciales.length >= LIMITE_DETALLES) break;
    }
  }

  return { tecnicos, posibles, parciales };
}

/**
 * Repara una preferencia de orden según la política del Release 1.3.3:
 *   Orden guardado: A B X C — Secciones válidas: A B C D → A B C D
 *  - Conserva el orden válido existente.
 *  - Descarta valores desconocidos (X).
 *  - Agrega secciones nuevas al final (D), respetando su orden canónico.
 * Función pura e idempotente.
 */
export function repararOrdenSecciones(ordenGuardado, ordenValido) {
  const validos = Array.isArray(ordenValido) ? ordenValido : [];
  if (validos.length === 0) return [];
  if (!Array.isArray(ordenGuardado)) return [...validos];

  const vistos = new Set();
  const conservados = [];
  for (const item of ordenGuardado) {
    const k = String(item);
    if (validos.includes(k) && !vistos.has(k)) {
      vistos.add(k);
      conservados.push(k);
    }
  }
  // Secciones nuevas (u omitidas): se agregan en su orden canónico.
  const faltantes = validos.filter((v) => !vistos.has(v));
  return [...conservados, ...faltantes];
}

function repararLista(guardada, valida) {
  return repararOrdenSecciones(guardada, valida);
}

/**
 * Aplica la política de reparación sobre TODAS las preferencias de orden
 * persistidas (estado hidratado del store). Devuelve un patch a fusionar y
 * la lista de cambios para el log de integridad.
 * Función pura: no toca almacenamiento ni estado.
 *
 * @param {object} persisted estado persistido (parcial).
 * @param {object} ordenesDefault listas canónicas (ORDENES_DEFAULT del store).
 * @returns {{ patch: object, cambios: Array<{clave, antes, despues}> }}
 */
export function repararPreferenciasPersistidas(persisted, ordenesDefault = {}) {
  const cambios = [];
  const patch = {};
  const clavesLista = [
    'dashTabOrder',
    'kanbanSections',
    'tablaSections',
    'reportesSections',
    'utilesTabOrder',
  ];

  for (const clave of clavesLista) {
    const valido = ordenesDefault[clave];
    if (!Array.isArray(valido) || valido.length === 0) continue;
    if (!(clave in (persisted || {}))) continue;
    const reparado = repararOrdenSecciones(persisted[clave], valido);
    if (JSON.stringify(reparado) !== JSON.stringify(persisted[clave])) {
      cambios.push({ clave, antes: persisted[clave], despues: reparado });
      patch[clave] = reparado;
    }
  }

  // dashWidgetOrder: mapa pestaña → lista de widgets.
  const dwPersisted = persisted?.dashWidgetOrder;
  const dwValido = ordenesDefault.dashWidgetOrder || {};
  if (dwPersisted && typeof dwPersisted === 'object' && !Array.isArray(dwPersisted)) {
    const patchMapa = {};
    for (const [tab, orden] of Object.entries(dwPersisted)) {
      const validosTab = Array.isArray(dwValido[tab]) ? dwValido[tab] : null;
      if (!validosTab || validosTab.length === 0) continue; // pestaña desconocida: preservar
      const reparado = repararOrdenSecciones(orden, validosTab);
      if (JSON.stringify(reparado) !== JSON.stringify(orden)) {
        cambios.push({ clave: `dashWidgetOrder.${tab}`, antes: orden, despues: reparado });
        patchMapa[tab] = reparado;
      }
    }
    if (Object.keys(patchMapa).length > 0) {
      patch.dashWidgetOrder = { ...dwPersisted, ...patchMapa };
    }
  }

  return { patch, cambios };
}
