/**
 * liquidacionReglas.js (v1.10.5)
 * Fuente ÚNICA de verdad de las reglas económicas del módulo de Liquidaciones.
 *
 * v1.10.4: tarifas y mínimos fijos en REGLAS_LIQUIDACION_DEFECTO, con
 * getReglas(config) preparado para enchufar la configuración central.
 * v1.10.5: se habilita esa configuración desde
 * Configuración → General → Liquidaciones:
 *  - Categorías de tarifas editables (alta sin tocar código, clave estable,
 *    importe, activar/desactivar — NUNCA eliminación física §4C).
 *  - Mínimo de firmas editable (default 14).
 *  - Premios por top configurables (activo, fondo, puestos, distribución
 *    fija o porcentual con validación estricta del fondo, saldo explícito).
 *  - Reglas de conceptos (segundo concepto manual, on/off real).
 *  - Validaciones configurables (los críticos de integridad NO se apagan).
 *
 * Tanto la configuración como Mi Espacio consumen estas funciones: ningún
 * componente define tarifas ni fórmulas por su cuenta (§8 del prompt 1.10.5).
 *
 * IMPORTANTE: los valores por defecto de abajo son PROVISIONALES (definidos en
 * los prompts de 1.10.4/1.10.5). No presentarlos como tarifas definitivas.
 */

/** Clon profundo de valores por defecto (evita referencias compartidas). */
const clonar = (v) => JSON.parse(JSON.stringify(v));

/** Categorías iniciales (provisionales): clave estable + nombre + importe. */
export const CATEGORIAS_DEFECTO = [
  { key: "leve", nombre: "Lesión leve", tarifa: 10000, activa: true },
  { key: "grave", nombre: "Lesión grave", tarifa: 20000, activa: true },
  // La tarifa de enfermedad profesional es INDEPENDIENTE de la de lesión
  // leve: no se deriva de ella (pueden cambiar por separado en el futuro).
  { key: "profesional", nombre: "Enfermedad profesional", tarifa: 20000, activa: true },
];

/** Premios por top iniciales (provisionales): fija 50/30/20 sobre $100.000. */
export const PREMIOS_DEFECTO = {
  activo: true,
  fondo: 100000,
  modalidad: "fija", // 'fija' (importes ARS por puesto) | 'porcentual' (% del fondo)
  permitirSaldoParcial: false, // si está off, la suma debe cubrir el fondo exacto
  puestos: [
    { lugar: 1, valor: 50000 },
    { lugar: 2, valor: 30000 },
    { lugar: 3, valor: 20000 },
  ],
};

/** Reglas de clasificación de conceptos por caso. */
export const REGLAS_CONCEPTOS_DEFECTO = {
  // Si está apagado, el motor IGNORA los segundos conceptos marcados a mano
  // (los existentes quedan fuera del cálculo, con advertencia visible).
  permitirSegundoConcepto: true,
};

/** Validaciones configurables (los críticos de integridad no están acá). */
export const VALIDACIONES_DEFECTO = {
  // Si está OFF, preparar una liquidación con advertencias queda bloqueado.
  permitirPrepararConAdvertencias: true,
  // Si está ON, cerrar un período sin firmas pasa de advertencia a error.
  bloquearCierreSinFirmas: false,
};

/** Configuración completa por defecto (merge de compatibilidad 1.10.5). */
export const CONFIG_LIQUIDACION_DEFECTO = {
  minimoFirmasNetas: 14,
  categorias: CATEGORIAS_DEFECTO,
  premios: PREMIOS_DEFECTO,
  reglasConceptos: REGLAS_CONCEPTOS_DEFECTO,
  validaciones: VALIDACIONES_DEFECTO,
};

/**
 * Reglas "legacy" en el formato plano de la 1.10.4 (mapa de tarifas).
 * Se conserva exportado por compatibilidad con los consumidores y tests
 * existentes; getReglas() ahora arma el snapshot COMPLETO más abajo.
 */
export const REGLAS_LIQUIDACION_DEFECTO = {
  minimoFirmasNetas: 14,
  tarifas: { leve: 10000, grave: 20000, profesional: 20000 },
  fondoTop: 100000,
  puestosTop: 3,
};

/** Lista legacy de categorías (labels de la 1.10.4) — ver getReglas(). */
export const CATEGORIAS_LIQUIDACION = CATEGORIAS_DEFECTO.map((c) => ({
  key: c.key,
  label: c.nombre,
  tarifaKey: c.key,
}));

const CATEGORIA_KEYS = CATEGORIAS_LIQUIDACION.map((c) => c.key);

/** ¿La key es una categoría por defecto válida? (compat 1.10.4) */
export function esCategoriaLiquidacion(key) {
  return CATEGORIA_KEYS.includes(key);
}

// ---------------------------------------------------------------------------
// Normalización de la configuración (compat con configs antiguas)
// ---------------------------------------------------------------------------

/** Normaliza la lista de categorías; ante basura o vacío, usa los defaults. */
function normalizarCategorias(list) {
  if (!Array.isArray(list) || list.length === 0) return clonar(CATEGORIAS_DEFECTO);
  const out = [];
  for (const c of list) {
    if (!c || typeof c.key !== "string" || !c.key.trim()) continue;
    out.push({
      key: c.key.trim(),
      nombre: typeof c.nombre === "string" && c.nombre.trim() ? c.nombre.trim() : c.key.trim(),
      tarifa: typeof c.tarifa === "number" && Number.isFinite(c.tarifa) && c.tarifa >= 0 ? c.tarifa : 0,
      activa: c.activa !== false,
      createdAt: c.createdAt || null,
      updatedAt: c.updatedAt || null,
    });
  }
  return out.length > 0 ? out : clonar(CATEGORIAS_DEFECTO);
}

/** Normaliza la configuración de premios; ante basura, defaults seguros. */
function normalizarPremios(p) {
  if (!p || typeof p !== "object") return clonar(PREMIOS_DEFECTO);
  const puestos = Array.isArray(p.puestos)
    ? p.puestos
        .filter((x) => x && Number.isFinite(Number(x.lugar)) && Number(x.lugar) >= 1)
        .map((x) => ({
          lugar: Math.floor(Number(x.lugar)),
          valor: typeof x.valor === "number" && Number.isFinite(x.valor) && x.valor >= 0 ? x.valor : 0,
        }))
        .sort((a, b) => a.lugar - b.lugar)
    : [];
  return {
    activo: p.activo !== false,
    fondo: typeof p.fondo === "number" && Number.isFinite(p.fondo) && p.fondo >= 0 ? p.fondo : PREMIOS_DEFECTO.fondo,
    modalidad: p.modalidad === "porcentual" ? "porcentual" : "fija",
    permitirSaldoParcial: !!p.permitirSaldoParcial,
    puestos: puestos.length > 0 ? puestos : clonar(PREMIOS_DEFECTO.puestos),
  };
}

/**
 * Lee la configuración de liquidaciones de la config central con defaults
 * seguros. Funciona igual con configs anteriores a la 1.10.5 (sin la clave
 * `liquidaciones`): devuelve los valores por defecto completos.
 */
export function getLiquidacionConfig(config) {
  const cfg = config?.liquidaciones;
  if (!cfg || typeof cfg !== "object") return clonar(CONFIG_LIQUIDACION_DEFECTO);
  const minimo = Number(cfg.minimoFirmasNetas);
  // v1.10.5: un mínimo corrupto (negativo o no entero, p. ej. 7.5) NUNCA se
  // redondea: cae al default. Redondear cambiaría el umbral de cobro en
  // silencio (efecto económico real sobre las firmas netas).
  const minimoValido =
    Number.isFinite(minimo) && minimo >= 0 && Math.floor(minimo) === minimo;
  return {
    minimoFirmasNetas: minimoValido ? minimo : CONFIG_LIQUIDACION_DEFECTO.minimoFirmasNetas,
    categorias: normalizarCategorias(cfg.categorias),
    premios: normalizarPremios(cfg.premios),
    reglasConceptos: { ...REGLAS_CONCEPTOS_DEFECTO, ...(cfg.reglasConceptos || {}) },
    validaciones: { ...VALIDACIONES_DEFECTO, ...(cfg.validaciones || {}) },
  };
}

/**
 * Reglas vigentes para el motor y para los snapshots de cierre.
 * Devuelve el formato COMPLETO de la 1.10.5 (categorías, premios, reglas,
 * validaciones) más los campos planos de la 1.10.4 (`tarifas` como mapa,
 * `fondoTop`, `puestosTop`) para compat con consumidores existentes.
 */
export function getReglas(config) {
  const cfg = getLiquidacionConfig(config);
  const tarifas = {};
  for (const c of cfg.categorias) tarifas[c.key] = c.tarifa;
  return {
    ...cfg,
    tarifas,
    fondoTop: cfg.premios.fondo,
    puestosTop: cfg.premios.puestos.length,
  };
}

// ---------------------------------------------------------------------------
// Resolución de tarifas y labels
// ---------------------------------------------------------------------------

/**
 * Tarifa unitaria de una categoría.
 * - Si las reglas traen la lista de categorías (1.10.5), resuelve ahí —
 *   activas Y desactivadas: las desactivadas siguen valiendo para lo ya
 *   liquidado (§4C), pero no aparecen en los selectores de nuevas clases.
 * - Categoría inexistente en la lista → null (pendiente de revisión §4D:
 *   nunca se le asigna un importe arbitrario).
 * - Sin lista (formato legacy 1.10.4) → mapa `tarifas`.
 */
export function tarifaPara(reglas, categoriaKey) {
  if (!categoriaKey) return null;
  if (Array.isArray(reglas?.categorias)) {
    const c = reglas.categorias.find((x) => x.key === categoriaKey);
    if (!c) return null;
    return typeof c.tarifa === "number" && Number.isFinite(c.tarifa) && c.tarifa >= 0 ? c.tarifa : null;
  }
  const t = reglas?.tarifas?.[categoriaKey];
  return typeof t === "number" && Number.isFinite(t) && t >= 0 ? t : null;
}

/** Label legible de una categoría (preferiendo las reglas vigentes). */
export function categoriaLabel(key, reglas = null) {
  if (!key) return "Sin clasificar";
  const cat = (reglas?.categorias || CATEGORIAS_DEFECTO).find((c) => c.key === key);
  return cat ? cat.nombre : "Sin clasificar";
}

/** Categorías vigentes para elegir en nueva clasificación (solo activas). */
export function getCategoriasActivas(reglas) {
  const lista = Array.isArray(reglas?.categorias) ? reglas.categorias : CATEGORIAS_DEFECTO;
  return lista.filter((c) => c.activa !== false);
}

// ---------------------------------------------------------------------------
// Validaciones puras (usadas por Configuración, el motor y los tests)
// ---------------------------------------------------------------------------

/**
 * Valida el alta/edición de una categoría de tarifa (§4B):
 * nombre obligatorio, clave estable única y con formato, importe numérico
 * no negativo con hasta 2 decimales, sin duplicados de clave ni de nombre.
 * Devuelve { ok, errores: [] }.
 */
export function validarCategoria(cfg, { key, nombre, tarifa }, keyOriginal = null) {
  const errores = [];
  const lista = cfg?.categorias || [];
  const nombreLimpio = String(nombre ?? "").trim();
  const keyLimpia = String(key ?? "").trim();

  if (!nombreLimpio) errores.push("El nombre de la categoría es obligatorio.");
  if (!keyLimpia) {
    errores.push("La clave interna es obligatoria.");
  } else if (!/^[a-z0-9-]+$/.test(keyLimpia)) {
    errores.push("La clave interna solo puede tener minúsculas, números y guiones.");
  }

  const t = Number(tarifa);
  if (!Number.isFinite(t)) errores.push("El importe debe ser un número.");
  else if (t < 0) errores.push("El importe no puede ser negativo.");
  else if (Math.round(t * 100) !== t * 100) errores.push("El importe admite hasta 2 decimales.");

  // Duplicados: la clave de la fila en edición no se compara consigo misma.
  if (keyLimpia && lista.some((c) => c.key === keyLimpia && c.key !== keyOriginal)) {
    errores.push(`Ya existe una categoría con la clave "${keyLimpia}".`);
  }
  const dupNombre = lista.find(
    (c) => c.key !== keyOriginal && c.nombre.toLowerCase() === nombreLimpio.toLowerCase()
  );
  if (nombreLimpio && dupNombre) {
    errores.push(`Ya existe una categoría llamada "${dupNombre.nombre}".`);
  }

  return { ok: errores.length === 0, errores };
}

/**
 * Genera una clave estable slug a partir del nombre (si no se provee una).
 * Única dentro de la lista dada.
 */
export function generarKeyCategoria(nombre, lista) {
  const base = String(nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "categoria";
  let key = base;
  let n = 2;
  const usadas = new Set((lista || []).map((c) => c.key));
  while (usadas.has(key)) {
    key = `${base}-${n}`;
    n += 1;
  }
  return key;
}

/**
 * Validación de la distribución de premios (§6E):
 * - fija: valores numéricos ≥ 0; la suma debe cubrir el fondo EXACTO, salvo
 *   que `permitirSaldoParcial` esté activo (entonces suma ≤ fondo y se informa
 *   el saldo — §6G, que exige mostrarlo claramente).
 * - porcentual: la suma debe ser exactamente 100 (±0.01), o ≤ 100 con saldo
 *   parcial explícito.
 * Devuelve { ok, errores: [], advertencias: [], saldo } (saldo en pesos).
 */
export function validarDistribucion(premios) {
  const errores = [];
  const advertencias = [];
  const p = premios || PREMIOS_DEFECTO;
  const fondo = typeof p.fondo === "number" && p.fondo >= 0 ? p.fondo : 0;
  const puestos = Array.isArray(p.puestos) ? p.puestos : [];

  if (puestos.length === 0) errores.push("Debe haber al menos un puesto premiado.");
  for (const puesto of puestos) {
    const v = Number(puesto?.valor);
    if (!Number.isFinite(v)) errores.push(`El valor del puesto ${puesto?.lugar ?? "?"} debe ser un número.`);
    else if (v < 0) errores.push(`El valor del puesto ${puesto?.lugar ?? "?"} no puede ser negativo.`);
    else if (Math.round(v * 100) !== v * 100) errores.push(`El valor del puesto ${puesto?.lugar ?? "?"} admite hasta 2 decimales.`);
  }

  const lugares = puestos.map((x) => Number(x?.lugar));
  if (new Set(lugares).size !== lugares.length) errores.push("No puede haber dos puestos con el mismo lugar.");
  if (errores.length > 0) return { ok: false, errores, advertencias, saldo: 0 };

  const suma = puestos.reduce((s, x) => s + Number(x.valor || 0), 0);
  const EPS = 0.01;

  if (p.modalidad === "porcentual") {
    if (Math.abs(suma - 100) > EPS) {
      if (p.permitirSaldoParcial && suma < 100) {
        advertencias.push(`Los porcentajes suman ${suma.toFixed(2)} %: queda ${(100 - suma).toFixed(2)} % del fondo sin asignar.`);
      } else if (suma > 100) {
        errores.push(`Los porcentajes suman ${suma.toFixed(2)} %: deben sumar exactamente 100 %.`);
      } else {
        errores.push(`Los porcentajes suman ${suma.toFixed(2)} %: deben sumar exactamente 100 %.`);
      }
    }
    const saldoPct = Math.max(0, 100 - suma);
    return { ok: errores.length === 0, errores, advertencias, saldo: (fondo * saldoPct) / 100 };
  }

  // Modalidad fija.
  if (Math.abs(suma - fondo) > EPS) {
    if (suma > fondo) {
      errores.push(`La suma de los puestos ($ ${suma.toLocaleString("es-AR")}) supera el fondo total ($ ${fondo.toLocaleString("es-AR")}).`);
    } else if (p.permitirSaldoParcial) {
      advertencias.push(`Queda un saldo sin asignar de $ ${(fondo - suma).toLocaleString("es-AR")} del fondo total.`);
    } else {
      errores.push(`La suma de los puestos ($ ${suma.toLocaleString("es-AR")}) debe coincidir con el fondo total ($ ${fondo.toLocaleString("es-AR")}).`);
    }
  }
  return { ok: errores.length === 0, errores, advertencias, saldo: Math.max(0, fondo - suma) };
}

/**
 * Importe del premio para un puesto de la distribución vigente.
 * Devuelve null si el puesto no existe o la configuración no es válida.
 */
export function calcularPremioPuesto(premios, lugar) {
  const p = premios || PREMIOS_DEFECTO;
  const puesto = (p.puestos || []).find((x) => Number(x.lugar) === Number(lugar));
  if (!puesto) return null;
  const v = Number(puesto.valor);
  if (!Number.isFinite(v) || v < 0) return null;
  if (p.modalidad === "porcentual") {
    const fondo = Number(p.fondo);
    if (!Number.isFinite(fondo) || fondo < 0) return null;
    return Math.round((fondo * v) / 100);
  }
  return v;
}

/** Saldo del fondo todavía no asignado (pesos) según la distribución. */
export function saldoSinAsignar(premios) {
  const p = premios || PREMIOS_DEFECTO;
  const v = validarDistribucion(p);
  return v.saldo || 0;
}

/**
 * Validador de la config de liquidaciones que llega en un IMPORT de backup
 * (§10): rechaza estructuras corruptas con mensajes claros antes de tocar la
 * config local. Devuelve { ok, errores: [], advertencias: [] }.
 */
export function validarConfigLiquidaciones(cfgCruda) {
  const errores = [];
  const advertencias = [];

  if (cfgCruda == null) return { ok: true, errores, advertencias }; // clave ausente → defaults
  if (typeof cfgCruda !== "object" || Array.isArray(cfgCruda)) {
    return { ok: false, errores: ["La configuración de liquidaciones debe ser un objeto."], advertencias };
  }

  const minimo = Number(cfgCruda.minimoFirmasNetas);
  if (cfgCruda.minimoFirmasNetas !== undefined) {
    if (!Number.isFinite(minimo) || minimo < 0) errores.push("El mínimo de firmas debe ser un número mayor o igual a 0.");
    else if (Math.floor(minimo) !== minimo) errores.push("El mínimo de firmas debe ser un entero.");
  }

  if (cfgCruda.categorias !== undefined) {
    if (!Array.isArray(cfgCruda.categorias) || cfgCruda.categorias.length === 0) {
      errores.push("La lista de categorías está vacía o es inválida.");
    } else {
      const claves = cfgCruda.categorias.map((c) => String(c?.key || "").trim());
      if (claves.some((k) => !k)) errores.push("Hay categorías sin clave.");
      if (new Set(claves).size !== claves.length) errores.push("Hay categorías con claves duplicadas.");
      for (const c of cfgCruda.categorias) {
        const t = Number(c?.tarifa);
        if (!Number.isFinite(t) || t < 0) errores.push(`Tarifa inválida en la categoría "${c?.key ?? "?"}".`);
      }
      const inactivas = cfgCruda.categorias.filter((c) => c?.activa === false).length;
      if (inactivas > 0) advertencias.push(`${inactivas} categoría(s) desactivadas se importarán tal cual.`);
    }
  }

  if (cfgCruda.premios !== undefined) {
    if (typeof cfgCruda.premios !== "object" || cfgCruda.premios === null) {
      errores.push("La configuración de premios es inválida.");
    } else {
      const v = validarDistribucion(normalizarPremios(cfgCruda.premios));
      if (!v.ok) errores.push(...v.errores);
      advertencias.push(...v.advertencias);
    }
  }

  return { ok: errores.length === 0, errores, advertencias };
}
