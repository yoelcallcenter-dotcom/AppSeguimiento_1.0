import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DEFAULT_PLANTILLAS } from "./constants";
import {
  CATEGORIAS_CONVERSACION_DEFAULT,
  VARIABLE_OPERADOR,
  getConversacionesCategorias,
  esCategoriaDefault,
  claveCategoria,
  normalizarNombreVariable,
  getConversacionesVariables,
  mapaVariables,
  resolverConversacion,
  parsearVariables,
  llavesUsadas,
  leerMensajes,
  guardarMensajes,
  contarMensajes,
  contarMensajesConversacion,
  renombrarCategoria,
  eliminarMensajes,
  errorNombreCategoria,
  errorNombreVariable,
  // 1.9.7 (fix B7): limpieza de claves huérfanas (nota conocida de 1.9.6).
  limpiarConversacionesHuerfanas,
} from "./conversaciones";

// 1.9.6: modelo de Conversación Sugerida (categorías configurables + variables
// con llaves de valor fijo).
describe("conversaciones · categorías", () => {
  it("config sin la clave usa las 4 categorías originales", () => {
    expect(getConversacionesCategorias(undefined)).toEqual(
      CATEGORIAS_CONVERSACION_DEFAULT
    );
    expect(getConversacionesCategorias({})).toEqual(
      CATEGORIAS_CONVERSACION_DEFAULT
    );
  });

  it("una lista propia se respeta y una lista vacía NO resucita los defaults", () => {
    expect(getConversacionesCategorias({ conversacionesCategorias: ["A", "B"] })).toEqual([
      "A",
      "B",
    ]);
    expect(getConversacionesCategorias({ conversacionesCategorias: [] })).toEqual([]);
  });

  it("esCategoriaDefault distingue las 4 originales de las nuevas", () => {
    expect(esCategoriaDefault("Referencia")).toBe(true);
    expect(esCategoriaDefault("Custom")).toBe(false);
  });

  it("claveCategoria conserva el formato histórico espacios → _", () => {
    expect(claveCategoria("Accidente Laboral")).toBe("conversaciones_Accidente_Laboral");
    expect(claveCategoria("  Mi  Categoría ")).toBe("conversaciones_Mi_Categoría");
  });

  it("errorNombreCategoria: vacío, duplicado por nombre normalizado y clave colisionada", () => {
    expect(errorNombreCategoria("", [])).toBeTruthy();
    expect(errorNombreCategoria("ACCIDENTE LABORAL", ["Accidente Laboral"])).toBeTruthy();
    expect(errorNombreCategoria("Mi Cat", ["Mi   Cat"])).toBeTruthy();
    expect(errorNombreCategoria("Nueva", ["Accidente Laboral"])).toBeNull();
  });
});

describe("conversaciones · variables", () => {
  it("normalizarNombreVariable: mayúsculas, espacios a _ y sin caracteres inválidos", () => {
    expect(normalizarNombreVariable(" horario atencion ")).toBe("HORARIO_ATENCION");
    expect(normalizarNombreVariable("HORARIO-1")).toBe("HORARIO1");
    expect(normalizarNombreVariable("¡!")).toBe("");
  });

  it("getConversacionesVariables rehidrata strings, descarta OPERADOR y duplicados", () => {
    const vars = getConversacionesVariables({
      conversacionesVariables: [
        "horario",
        { nombre: "HORARIO", valor: "duplicada" },
        { nombre: "OPERADOR", valor: "no debería estar" },
        { nombre: "EMPRESA", valor: "Prolegal" },
        { nombre: "¡!" },
      ],
    });
    expect(vars).toEqual([
      { nombre: "HORARIO", valor: "" },
      { nombre: "EMPRESA", valor: "Prolegal" },
    ]);
    expect(getConversacionesVariables(undefined)).toEqual([]);
  });

  it("mapaVariables: OPERADOR sale de config y las vacías no entran", () => {
    const mapa = mapaVariables({
      operador: "Ana",
      conversacionesVariables: [
        { nombre: "HORARIO", valor: "de 9 a 18" },
        { nombre: "VACIA", valor: "" },
      ],
    });
    expect(mapa.get(VARIABLE_OPERADOR)).toBe("Ana");
    expect(mapa.get("HORARIO")).toBe("de 9 a 18");
    expect(mapa.has("VACIA")).toBe(false);
  });

  it("resolverConversacion reemplaza macros y deja literales las sin valor", () => {
    const config = {
      operador: "Ana",
      conversacionesVariables: [{ nombre: "HORARIO", valor: "de 9 a 18" }],
    };
    expect(resolverConversacion("Hola {OPERADOR} ({HORARIO}) {NOMBRE}", config)).toBe(
      "Hola Ana (de 9 a 18) {NOMBRE}"
    );
    expect(resolverConversacion("Sin llaves", config)).toBe("Sin llaves");
  });

  it("resolverConversacion usa 'Operador' cuando no hay operador configurado", () => {
    expect(resolverConversacion("Soy {OPERADOR}", {})).toBe("Soy Operador");
  });

  it("parsearVariables separa texto, variables resueltas y faltantes", () => {
    const partes = parsearVariables("A {OPERADOR} B {NOMBRE}", { operador: "Ana" });
    expect(partes).toEqual([
      { tipo: "texto", valor: "A " },
      { tipo: "variable", nombre: "OPERADOR", valor: "Ana", resuelta: true },
      { tipo: "texto", valor: " B " },
      { tipo: "variable", nombre: "NOMBRE", valor: null, resuelta: false },
    ]);
  });

  it("llavesUsadas devuelve los nombres distintos usados", () => {
    expect(llavesUsadas("{A} y {B} y otra vez {A}")).toEqual(["A", "B"]);
    expect(llavesUsadas("sin llaves")).toEqual([]);
  });
});

describe("conversaciones · storage", () => {
  const KEY_DEFAULT = claveCategoria("Accidente Laboral");
  const KEY_CUSTOM = claveCategoria("Custom");

  beforeEach(() => {
    localStorage.removeItem(KEY_DEFAULT);
    localStorage.removeItem(KEY_CUSTOM);
  });
  afterEach(() => {
    localStorage.removeItem(KEY_DEFAULT);
    localStorage.removeItem(KEY_CUSTOM);
  });

  it("leerMensajes: categoría original sin clave cae en DEFAULT_PLANTILLAS sin escribir", () => {
    expect(leerMensajes("Accidente Laboral")).toEqual(DEFAULT_PLANTILLAS);
    expect(localStorage.getItem(KEY_DEFAULT)).toBeNull();
  });

  it("leerMensajes: categoría nueva sin clave arranca vacía (no hereda plantillas)", () => {
    expect(leerMensajes("Custom")).toEqual([]);
  });

  it("guardarMensajes persiste y leerMensajes lo devuelve", () => {
    guardarMensajes("Custom", ["Hola {OPERADOR}", "Chau"]);
    expect(JSON.parse(localStorage.getItem(KEY_CUSTOM))).toEqual([
      "Hola {OPERADOR}",
      "Chau",
    ]);
    expect(leerMensajes("Custom")).toEqual(["Hola {OPERADOR}", "Chau"]);
  });

  it("contarMensajes y contarMensajesConversacion suman por categoría configurada", () => {
    guardarMensajes("Custom", ["a", "b"]);
    expect(contarMensajes("Custom")).toBe(2);
    expect(
      contarMensajesConversacion({ conversacionesCategorias: ["Custom"] })
    ).toBe(2);
    // Sin configuración: 4 categorías originales con sus 3 plantillas default.
    expect(contarMensajesConversacion(undefined)).toBe(
      CATEGORIAS_CONVERSACION_DEFAULT.length * DEFAULT_PLANTILLAS.length
    );
  });

  it("renombrarCategoria migra la clave de los mensajes", () => {
    guardarMensajes("Custom", ["m1"]);
    expect(renombrarCategoria("Custom", "Personalizada")).toBe(true);
    expect(localStorage.getItem(KEY_CUSTOM)).toBeNull();
    expect(JSON.parse(localStorage.getItem(claveCategoria("Personalizada")))).toEqual([
      "m1",
    ]);
    localStorage.removeItem(claveCategoria("Personalizada"));
  });

  it("renombrarCategoria nunca pisa una clave destino existente", () => {
    guardarMensajes("Custom", ["nuevos"]);
    guardarMensajes("Accidente Laboral", ["viejos"]);
    expect(renombrarCategoria("Custom", "Accidente Laboral")).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY_DEFAULT))).toEqual(["viejos"]);
    expect(JSON.parse(localStorage.getItem(KEY_CUSTOM))).toEqual(["nuevos"]);
  });

  it("eliminarMensajes borra la clave de la categoría", () => {
    guardarMensajes("Custom", ["x"]);
    eliminarMensajes("Custom");
    expect(localStorage.getItem(KEY_CUSTOM)).toBeNull();
  });
});

describe("conversaciones · errorNombreVariable", () => {
  it("valida formato, reservada y duplicados excluyendo la fila en edición", () => {
    expect(errorNombreVariable("", [])).toBeTruthy();
    expect(errorNombreVariable("¡!", [])).toBeTruthy();
    expect(errorNombreVariable("OPERADOR", [])).toBeTruthy();
    expect(errorNombreVariable("HORARIO", ["HORARIO", "EMPRESA"])).toBeTruthy();
    // Renombrar FECHA → HORARIO chocando con otra HORARIO:
    expect(errorNombreVariable("HORARIO", ["HORARIO", "FECHA"], "FECHA")).toBeTruthy();
    expect(errorNombreVariable("NUEVA", ["HORARIO"])).toBeNull();
  });
});

// 1.9.7 (fix B7): claves conversaciones_* huérfanas (nota conocida 1.9.6).
describe("conversaciones · limpiarConversacionesHuerfanas", () => {
  it("borra solo las claves de categorías que ya no existen", () => {
    localStorage.setItem("conversaciones_Accidente_Laboral", JSON.stringify(["a"]));
    localStorage.setItem("conversaciones_Custom", JSON.stringify(["b"]));
    localStorage.setItem("conversaciones_Categoria_Borrada", JSON.stringify(["c"]));
    localStorage.setItem("otra_clave", "no-tocar");
    try {
      const eliminadas = limpiarConversacionesHuerfanas({
        conversacionesCategorias: ["Accidente Laboral", "Custom"],
      });
      expect(eliminadas).toBe(1);
      expect(localStorage.getItem("conversaciones_Accidente_Laboral")).not.toBeNull();
      expect(localStorage.getItem("conversaciones_Custom")).not.toBeNull();
      expect(localStorage.getItem("conversaciones_Categoria_Borrada")).toBeNull();
      expect(localStorage.getItem("otra_clave")).toBe("no-tocar");
    } finally {
      localStorage.removeItem("conversaciones_Accidente_Laboral");
      localStorage.removeItem("conversaciones_Custom");
      localStorage.removeItem("conversaciones_Categoria_Borrada");
      localStorage.removeItem("otra_clave");
    }
  });

  it("sin config en config usa las categorías default como válidas", () => {
    localStorage.setItem("conversaciones_Accidente_Laboral", JSON.stringify(["a"]));
    localStorage.setItem("conversaciones_Mia", JSON.stringify(["b"]));
    try {
      limpiarConversacionesHuerfanas(undefined);
      expect(localStorage.getItem("conversaciones_Accidente_Laboral")).not.toBeNull();
      // "Mia" no está en los defaults → huérfana.
      expect(localStorage.getItem("conversaciones_Mia")).toBeNull();
    } finally {
      localStorage.removeItem("conversaciones_Accidente_Laboral");
      localStorage.removeItem("conversaciones_Mia");
    }
  });

  it("es idempotente: la segunda corrida elimina 0", () => {
    localStorage.setItem("conversaciones_Borrada", JSON.stringify(["x"]));
    try {
      expect(limpiarConversacionesHuerfanas({ conversacionesCategorias: [] })).toBe(1);
      expect(limpiarConversacionesHuerfanas({ conversacionesCategorias: [] })).toBe(0);
    } finally {
      localStorage.removeItem("conversaciones_Borrada");
    }
  });
});
