import React, { useState } from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { InteractivosView } from "./InteractivosView";
import {
  crearSesion,
  elegirOpcion,
  avanzar,
  serializarSesion,
} from "./llamada/sesionLlamada";
import {
  serializarSpeechs,
  FORMATO_TIPO,
  FORMATO_VERSION,
} from "./speechsInteractivosIO";

const noop = vi.fn();

const paso = (id, titulo, contenido, opciones = [], orden = 0) => ({
  id,
  titulo,
  contenido,
  orden,
  opciones,
});

const speechValido = {
  id: "s1",
  nombre: "Accidente Laboral",
  descripcion: "General",
  fechaCreacion: "2026-01-01T00:00:00.000Z",
  fechaModificacion: "2026-01-02T00:00:00.000Z",
  version: 1,
  startStepId: "p1",
  steps: [
    paso("p1", "Apertura", "Hola, ¿cómo estás?", [
      { id: "o1", texto: "Continuar", targetStepId: "p2", orden: 0 },
    ]),
    paso("p2", "Cierre", "Perfecto, gracias."),
  ],
};

const speechSoloInicio = {
  id: "sx",
  nombre: "Nuevo recorrido",
  descripcion: "",
  fechaCreacion: "2026-01-01T00:00:00.000Z",
  fechaModificacion: "2026-01-01T00:00:00.000Z",
  version: 1,
  startStepId: "p1",
  steps: [paso("p1", "", "")],
};

function ConEstado({ inicial = [], objeciones = [], setObjeciones }) {
  const [speechs, setSpeechs] = useState(inicial);
  return (
    <InteractivosView
      speechs={speechs}
      setSpeechs={setSpeechs}
      showToast={noop}
      objeciones={objeciones}
      setObjeciones={setObjeciones}
    />
  );
}

const renderVista = (inicial = [], objeciones = []) =>
  render(<ConEstado inicial={inicial} objeciones={objeciones} />);

/**
 * Harness para verificar el seed de objeciones del ejemplo ART (§7): expone en
 * el DOM cuántas objeciones hay y con qué ids, porque InteractivosView no las
 * renderiza (viven en la vista de Objeciones).
 */
function ConObjeciones({ inicial = [], objecionesIniciales = [] }) {
  const [speechs, setSpeechs] = useState(inicial);
  const [objeciones, setObjeciones] = useState(objecionesIniciales);
  return (
    <>
      <div data-testid="n-objeciones">{objeciones.length}</div>
      <div data-testid="titulo-obj-1">
        {objeciones.find((o) => o.id === "art-obj-1")?.titulo || ""}
      </div>
      <InteractivosView
        speechs={speechs}
        setSpeechs={setSpeechs}
        showToast={noop}
        objeciones={objeciones}
        setObjeciones={setObjeciones}
      />
    </>
  );
}

describe("InteractivosView (lista)", () => {
  it("muestra estado vacío y contador en cero", () => {
    renderVista();
    expect(
      screen.getByText("No hay speechs interactivos. Creá uno con el botón de arriba.")
    ).toBeTruthy();
    expect(screen.getByText("0 speechs interactivos")).toBeTruthy();
  });

  // Release 1.11.0 (§7): el ejemplo ART se ofrece solo con la lista vacía.
  it("crea el guion de ejemplo ART desde el estado vacío y no repite el botón", () => {
    renderVista();
    const seed = screen
      .getByText("Crear guion de ejemplo ART")
      .closest("button");
    expect(seed).toBeTruthy();

    fireEvent.click(seed);

    expect(screen.getByText("Asistente de llamadas ART (ejemplo)")).toBeTruthy();
    // La lista dejó de estar vacía: el seed ya no se ofrece.
    expect(screen.queryByText("Crear guion de ejemplo ART")).toBeNull();
  });

  it("no ofrece el ejemplo ART cuando ya hay guiones", () => {
    renderVista([speechValido]);
    expect(screen.queryByText("Crear guion de ejemplo ART")).toBeNull();
  });

  it("el seed del ejemplo ART fusiona las 12 objeciones sin pisar las existentes", () => {
    render(
      <ConObjeciones
        objecionesIniciales={[
          { id: "art-obj-1", titulo: "Mi objeción", contenido: "Texto propio" },
        ]}
      />
    );
    expect(screen.getByTestId("n-objeciones").textContent).toBe("1");

    fireEvent.click(screen.getByText("Crear guion de ejemplo ART"));

    // 1 existente + 11 nuevas = 12; la existente conserva su contenido.
    expect(screen.getByTestId("n-objeciones").textContent).toBe("12");
    expect(screen.getByTestId("titulo-obj-1").textContent).toBe("Mi objeción");
  });

  it("crea un speech interactivo y abre el editor", () => {
    renderVista();
    fireEvent.click(screen.getByText("Nuevo Speech Interactivo"));
    const crearBtn = screen.getByText("Crear").closest("button");
    expect(crearBtn.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("Ej: Accidente Laboral"), {
      target: { value: "Accidente Laboral" },
    });
    fireEvent.click(screen.getByText("Crear"));

    expect(screen.getByText("Volver a la lista")).toBeTruthy();
    expect(screen.getAllByText("INICIO").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Volver a la lista"));
    expect(screen.getByText("Accidente Laboral")).toBeTruthy();
    expect(screen.getByText(/1 paso · modificado/)).toBeTruthy();
  });

  it("filtra por nombre y descripción", () => {
    renderVista([
      speechValido,
      { ...speechValido, id: "s2", nombre: "Tránsito", descripcion: "Vehículos" },
    ]);
    expect(screen.getByText(/2 speechs interactivos/)).toBeTruthy();

    const busqueda = screen.getByPlaceholderText("Buscar speech interactivo...");
    fireEvent.change(busqueda, { target: { value: "gen" } });
    expect(screen.getByText("Accidente Laboral")).toBeTruthy();
    expect(screen.queryByText("Tránsito")).toBeNull();
    expect(
      screen.getByText(/1 speech interactivo \(filtrados de 2\)/)
    ).toBeTruthy();

    fireEvent.change(busqueda, { target: { value: "trán" } });
    expect(screen.getByText("Tránsito")).toBeTruthy();
    expect(screen.queryByText("Accidente Laboral")).toBeNull();
  });

  it("elimina con confirmación", () => {
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Eliminar speech interactivo"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Eliminar"));
    expect(
      screen.getByText("No hay speechs interactivos. Creá uno con el botón de arriba.")
    ).toBeTruthy();
  });
});

describe("InteractivosView (editor y validación)", () => {
  // Release 1.11.0 (§2.2): una opción SIN destino ya no es error — el motor
  // avanza linealmente a la etapa siguiente. El error de validación en vivo
  // ahora lo produce una opción sin TEXTO (y sigue bloqueando Iniciar Speech).
  it("valida en vivo: opción sin texto bloquea y sin destino avanza lineal", () => {
    renderVista([speechSoloInicio]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    expect(screen.getByText("Listo para ejecutar")).toBeTruthy();

    fireEvent.click(screen.getByText("Nuevo paso"));
    fireEvent.click(screen.getByLabelText("Paso 1"));
    fireEvent.click(screen.getByText("Agregar opción"));

    expect(screen.getByText(/no tiene texto/)).toBeTruthy();
    expect(screen.getByText("Iniciar Speech").closest("button").disabled).toBe(
      true
    );

    fireEvent.change(screen.getByLabelText("Opción 1 texto"), {
      target: { value: "Continuar" },
    });

    // Sin destino NO es error: el paso avanza de forma lineal.
    expect(screen.queryByText(/no tiene destino/)).toBeNull();
    expect(screen.getByText("Listo para ejecutar")).toBeTruthy();
    expect(screen.getByText("Iniciar Speech").closest("button").disabled).toBe(
      false
    );

    // Asignar un destino explícito tampoco rompe la validación.
    const select = screen.getByLabelText("Opción 1 destino");
    const opciones = within(select).getAllByRole("option");
    fireEvent.change(select, { target: { value: opciones[2].value } });

    expect(screen.queryByText(/no tiene destino/)).toBeNull();
    expect(screen.getByText("Listo para ejecutar")).toBeTruthy();
    expect(screen.getByText("Iniciar Speech").closest("button").disabled).toBe(
      false
    );
  });

  it("marcar como INICIO mueve el badge al segundo paso", () => {
    renderVista([speechSoloInicio]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    fireEvent.click(screen.getByText("Nuevo paso"));
    expect(within(screen.getByLabelText("Paso 1")).getByText("INICIO")).toBeTruthy();

    fireEvent.click(screen.getByText("Marcar como INICIO"));
    expect(within(screen.getByLabelText("Paso 2")).getByText("INICIO")).toBeTruthy();
    expect(
      within(screen.getByLabelText("Paso 1")).queryByText("INICIO")
    ).toBeNull();
    expect(screen.getAllByText("INICIO").length).toBeGreaterThan(0);
  });
});

describe("InteractivosView (ejecución)", () => {
  it("ejecuta el recorrido con Atrás, Reiniciar y fin", () => {
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Ejecutar speech interactivo"));

    // Release 1.11.0: el runner muestra "ETAPA n / total" (antes "PASO") y
    // el avance es en dos pasos: elegir la opción y confirmar "Continuar".
    expect(screen.getByText(/ETAPA 1 \/ 2/)).toBeTruthy();
    expect(screen.getByText("Atrás").closest("button").disabled).toBe(true);

    fireEvent.click(screen.getByText("Continuar")); // elige la opción
    fireEvent.click(screen.getByText("Continuar")); // confirma y avanza
    expect(screen.getByText(/ETAPA 2 \/ 2/)).toBeTruthy();

    // Atrás desde la etapa 2 vuelve a la etapa 1 (historial).
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByText(/ETAPA 1 \/ 2/)).toBeTruthy();

    // La última etapa sin opciones muestra "Siguiente"; al avanzar se llega
    // a la pantalla de fin del recorrido.
    fireEvent.click(screen.getByText("Continuar"));
    fireEvent.click(screen.getByText("Continuar"));
    fireEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("Fin del recorro")).toBeTruthy();

    fireEvent.click(screen.getByText("Reiniciar"));
    expect(screen.getByText(/ETAPA 1 \/ 2/)).toBeTruthy();
    expect(screen.getByText("Atrás").closest("button").disabled).toBe(true);

    fireEvent.click(screen.getByText("Cerrar"));
    expect(screen.queryByText(/ETAPA 1 \/ 2/)).toBeNull();
  });

  it("no permite ejecutar un speech con errores desde la lista", () => {
    renderVista([
      {
        ...speechValido,
        steps: [
          paso("p1", "Apertura", "Hola", [
            { id: "o1", texto: "Roto", targetStepId: "no-existe", orden: 0 },
          ]),
        ],
        startStepId: "p1",
      },
    ]);
    const boton = screen.getByLabelText("Ejecutar speech interactivo");
    expect(boton.disabled).toBe(true);
    expect(screen.getByText("1 error")).toBeTruthy();
  });
});

let blobExportado = null;

beforeAll(() => {
  URL.createObjectURL = vi.fn((blob) => {
    blobExportado = blob;
    return "blob:mock";
  });
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

const archivoDe = (texto) =>
  new File([texto], "speechs.json", { type: "application/json" });

const importarTexto = async (texto) => {
  fireEvent.change(screen.getByLabelText("Archivo de speechs interactivos"), {
    target: { files: [archivoDe(texto)] },
  });
  expect(await screen.findByText("Importar speechs interactivos")).toBeTruthy();
};

describe("InteractivosView (1.9.1 · duplicar speech)", () => {
  it("duplica con nombre (copia) sin tocar el original", () => {
    noop.mockClear();
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Duplicar speech interactivo"));
    expect(screen.getByText("Accidente Laboral (copia)")).toBeTruthy();
    expect(screen.getByText("Accidente Laboral")).toBeTruthy();
    expect(screen.getByText(/2 speechs interactivos/)).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("Speech duplicado", "success");
  });
});

describe("InteractivosView (1.9.1 · exportar)", () => {
  it("checklist con todo seleccionado y exporta envelope versionado", async () => {
    noop.mockClear();
    renderVista([
      speechValido,
      { ...speechValido, id: "s2", nombre: "Tránsito" },
    ]);
    fireEvent.click(screen.getByText("Exportar"));
    expect(screen.getByText("Elegí qué exportar")).toBeTruthy();
    expect(screen.getByText("2 seleccionados")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Seleccionar Tránsito"));
    expect(screen.getByText("1 seleccionados")).toBeTruthy();
    expect(screen.getByText("Seleccionar todos")).toBeTruthy();
    fireEvent.click(screen.getByText("Seleccionar todos"));
    expect(screen.getByText("2 seleccionados")).toBeTruthy();
    expect(screen.getByText("Quitar todos")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Seleccionar Tránsito"));

    fireEvent.click(screen.getByText("Exportar 1"));
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));
    expect(noop).toHaveBeenCalledWith("Exportacion completada", "success");

    const data = JSON.parse(await blobExportado.text());
    expect(data.type).toBe(FORMATO_TIPO);
    expect(data.type).toBe("appseguimiento-interactive-speech");
    // Release 1.11.0: el envelope pasó a la versión 2 (preguntas/ramificaciones).
    expect(data.version).toBe(FORMATO_VERSION);
    expect(data.fechaExportacion).toBeTruthy();
    expect(data.speechs).toHaveLength(1);
    expect(data.speechs[0].id).toBe("s1");
    expect(data.speechs[0].steps).toHaveLength(2);
  });

  it("seleccionar todos alterna la selección completa", () => {
    renderVista([speechValido, { ...speechValido, id: "s2", nombre: "Tránsito" }]);
    fireEvent.click(screen.getByText("Exportar"));
    fireEvent.click(screen.getByText("Quitar todos"));
    expect(screen.getByText("0 seleccionados")).toBeTruthy();
    expect(screen.getByText("Exportar 0").closest("button").disabled).toBe(true);
    fireEvent.click(screen.getByText("Seleccionar todos"));
    expect(screen.getByText("2 seleccionados")).toBeTruthy();
  });
});

describe("InteractivosView (1.9.1 · importar)", () => {
  it("flujo QA: exportar, eliminar, importar y ejecutar sin errores", async () => {
    noop.mockClear();
    renderVista([speechValido]);

    fireEvent.click(screen.getByText("Exportar"));
    fireEvent.click(screen.getByText("Exportar 1"));
    const texto = await blobExportado.text();
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));

    fireEvent.click(screen.getByLabelText("Eliminar speech interactivo"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByText("Eliminar"));
    expect(screen.getByText(/0 speechs interactivos/)).toBeTruthy();

    await importarTexto(texto);
    expect(screen.getByText(/1 para importar · 0 omitidos/)).toBeTruthy();
    expect(screen.getByText("Nuevo")).toBeTruthy();
    fireEvent.click(screen.getByText("Importar 1"));
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));

    expect(screen.getByText("Accidente Laboral")).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("1 importados · 0 omitidos", "success");

    fireEvent.click(screen.getByLabelText("Ejecutar speech interactivo"));
    expect(screen.getByText(/ETAPA 1 \/ 2/)).toBeTruthy();
  });

  it("conflictos: selector por speech con default Omitir y confirmación al reemplazar", async () => {
    noop.mockClear();
    renderVista([speechValido]);
    const json = serializarSpeechs([
      { ...speechValido, nombre: "Reemplazado" },
    ]);
    await importarTexto(json);

    expect(screen.getByText("ID duplicado")).toBeTruthy();
    expect(screen.getByText(/0 para importar · 1 omitidos/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Estrategia para Reemplazado"), {
      target: { value: "reemplazar" },
    });
    expect(screen.getByText(/1 para importar · 0 omitidos/)).toBeTruthy();

    fireEvent.click(screen.getByText("Importar 1"));
    const confirm = screen
      .getByText("Reemplazar speechs existentes")
      .closest('[role="dialog"]');
    expect(confirm).toBeTruthy();
    fireEvent.click(within(confirm).getByText("Reemplazar"));
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));

    expect(screen.getByText("Reemplazado")).toBeTruthy();
    expect(screen.queryByText("Accidente Laboral")).toBeNull();
    expect(noop).toHaveBeenCalledWith(
      "0 importados · 1 reemplazados · 0 omitidos",
      "success"
    );
  });

  it("mezcla: existente omitido por defecto, nuevo agregado, inválido excluido y visible", async () => {
    noop.mockClear();
    const nuevo = { ...speechValido, id: "s9", nombre: "Nuevo recorrido" };
    const invalido = { ...speechValido, id: "bad", nombre: "", steps: "no-array" };
    renderVista([speechValido]);
    await importarTexto(serializarSpeechs([speechValido, nuevo, invalido]));

    expect(screen.getByText("ID duplicado")).toBeTruthy();
    expect(screen.getByText("Nuevo")).toBeTruthy();
    expect(screen.getByText("Inválido")).toBeTruthy();
    expect(screen.getByText(/Falta el nombre/)).toBeTruthy();
    expect(screen.getByText(/1 para importar · 2 omitidos/)).toBeTruthy();

    fireEvent.click(screen.getByText("Importar 1"));
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));
    expect(screen.getByText("Nuevo recorrido")).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("1 importados · 2 omitidos", "success");
  });

  it("rechaza archivos inválidos con toast de error", async () => {
    noop.mockClear();
    renderVista();
    fireEvent.change(screen.getByLabelText("Archivo de speechs interactivos"), {
      target: { files: [archivoDe("{esto no es json")] },
    });
    await waitFor(() =>
      expect(noop).toHaveBeenCalledWith("El archivo no es un JSON válido.", "error")
    );
    expect(screen.queryByText("Importar speechs interactivos")).toBeNull();
  });

  it("importa un archivo de formato antiguo (v0 sin versión)", async () => {
    noop.mockClear();
    const v0 = JSON.stringify({
      type: "appseguimiento-interactive-speech",
      speechs: [
        {
          id: "v0-1",
          nombre: "Legacy",
          startStepId: "p1",
          steps: [{ id: "p1", titulo: "Inicio", contenido: "", opciones: [] }],
        },
      ],
    });
    renderVista();
    await importarTexto(v0);
    fireEvent.click(screen.getByText("Importar 1"));
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));
    expect(screen.getByText("Legacy")).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("1 importados · 0 omitidos", "success");
  });

  it("muestra huérfanos como advertencia importable en el preview", async () => {
    noop.mockClear();
    const conHuerfano = {
      ...speechValido,
      id: "sH",
      nombre: "Con huérfano",
      // Release 1.11.0: el avance lineal hace alcanzable todo índice >= inicio,
      // así que el huérfano debe ir ANTES del paso inicial para serlo.
      steps: [paso("p9", "Sueltos", "Sobra", []), ...speechValido.steps],
    };
    renderVista();
    await importarTexto(serializarSpeechs([conHuerfano]));
    expect(screen.getByText(/no está conectado desde el inicio/)).toBeTruthy();
    expect(screen.getByText("Importar 1").closest("button").disabled).toBe(false);
    fireEvent.click(screen.getByText("Importar 1"));
    await waitFor(() => expect(screen.queryAllByRole("dialog")).toHaveLength(0));
    expect(screen.getByText("Con huérfano")).toBeTruthy();
  });
});

describe("InteractivosView (1.9.1 · editor completo)", () => {
  it("edita nombre y descripción desde el editor y se reflejan en la lista", () => {
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    fireEvent.change(screen.getByLabelText("Nombre del speech"), {
      target: { value: "Nombre editado" },
    });
    fireEvent.change(screen.getByLabelText("Descripción del speech"), {
      target: { value: "Descripción editada" },
    });
    fireEvent.click(screen.getByText("Volver a la lista"));
    expect(screen.getByText("Nombre editado")).toBeTruthy();
    expect(screen.getByText("Descripción editada")).toBeTruthy();
  });

  it("reordena pasos con las flechas del árbol", () => {
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    expect(within(screen.getByLabelText("Paso 1")).getByText("Apertura")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Bajar paso 1"));
    expect(within(screen.getByLabelText("Paso 1")).getByText("Cierre")).toBeTruthy();
    expect(within(screen.getByLabelText("Paso 2")).getByText("Apertura")).toBeTruthy();
    expect(screen.getByLabelText("Bajar paso 2").disabled).toBe(true);
  });

  it("reordena y duplica opciones con sus botones", () => {
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    fireEvent.click(screen.getByText("Agregar opción"));
    fireEvent.change(screen.getByLabelText("Opción 2 texto"), {
      target: { value: "Salir" },
    });

    expect(screen.getByLabelText("Subir opción 1").disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Subir opción 2"));
    expect(screen.getByLabelText("Opción 1 texto").value).toBe("Salir");

    fireEvent.click(screen.getByLabelText("Duplicar opción 1"));
    expect(screen.getByLabelText("Opción 2 texto").value).toBe("Salir");
    expect(screen.getByLabelText("Subir opción 2").disabled).toBe(false);
  });

  it("crear nuevo paso desde el destino conecta y selecciona el paso nuevo", () => {
    noop.mockClear();
    renderVista([speechSoloInicio]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    fireEvent.click(screen.getByText("Agregar opción"));
    fireEvent.change(screen.getByLabelText("Opción 1 texto"), {
      target: { value: "Continuar" },
    });
    const select = screen.getByLabelText("Opción 1 destino");
    const sentinel = within(select)
      .getAllByRole("option")
      .find((o) => o.textContent.includes("Crear nuevo paso"));
    fireEvent.change(select, { target: { value: sentinel.value } });

    expect(screen.getByLabelText("Paso 2")).toBeTruthy();
    expect(screen.queryByText(/no tiene destino/)).toBeNull();
    expect(screen.getByText("Listo para ejecutar")).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("Paso creado y conectado", "success");
  });

  it("obliga a resolver referencias antes de eliminar un paso con entrantes", () => {
    noop.mockClear();
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    fireEvent.click(screen.getByLabelText("Paso 2"));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar paso" }));

    expect(screen.getByText(/Es destino de 1 opción/)).toBeTruthy();
    expect(screen.getByText("Eliminar").closest("button").disabled).toBe(true);

    const sel = screen.getByLabelText("Nuevo destino de las referencias");
    fireEvent.change(sel, { target: { value: speechValido.steps[0].id } });
    expect(screen.getByText("Eliminar").closest("button").disabled).toBe(false);
    fireEvent.click(screen.getByText("Eliminar"));

    expect(screen.queryByLabelText("Paso 2")).toBeNull();
    expect(screen.getByLabelText("Paso 1")).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("Paso eliminado", "success");
  });

  it("elimina sin diálogo cuando ninguna opción apunta al paso", () => {
    noop.mockClear();
    renderVista([speechValido]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    expect(screen.getByLabelText("Paso 3")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Paso 2"));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar paso" }));
    expect(screen.queryByText(/Es destino de/)).toBeNull();
    fireEvent.click(screen.getByText("Eliminar"));
    expect(screen.queryByLabelText("Paso 3")).toBeNull();
    expect(screen.getByLabelText("Paso 2")).toBeTruthy();
    expect(noop).toHaveBeenCalledWith("Paso eliminado", "success");
  });

  it("los huérfanos se advierten sin bloquear Iniciar Speech", () => {
    const conHuerfano = {
      ...speechValido,
      // Release 1.11.0: huérfano antes del inicio (el avance lineal alcanza
      // todo índice posterior al startStepId).
      steps: [paso("p9", "Sueltos", "Sobra", []), ...speechValido.steps],
    };
    renderVista([conHuerfano]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));

    expect(screen.getByLabelText("Advertencias").textContent).toContain(
      "no está conectado desde el inicio"
    );
    expect(screen.getByText("Sin conexión (1)")).toBeTruthy();
    expect(screen.queryByText(/1 error/)).toBeNull();
    expect(screen.getByText("Iniciar Speech").closest("button").disabled).toBe(false);
  });
});

describe("InteractivosView (1.9.4 · objeciones vía llaves)", () => {
  const objeciones = [
    { id: "o1", titulo: "No le interesa", contenido: "Explicar beneficios." },
    { id: "o2", titulo: "Es muy caro", contenido: "Mencionar cuotas." },
  ];

  it("muestra los chips de objeciones en el editor y advierte llaves huérfanas", () => {
    renderVista([speechValido], objeciones);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));

    expect(screen.getByLabelText("Insertar objeción: No le interesa")).toBeTruthy();
    expect(screen.getByLabelText("Insertar objeción: Es muy caro")).toBeTruthy();
    expect(screen.queryByText(/no corresponde a ninguna objeción/)).toBeNull();
  });

  it("el chip inserta la llave en el contenido del paso", () => {
    renderVista([speechSoloInicio], objeciones);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));

    const contenido = screen.getByLabelText("Contenido del paso");
    expect(contenido.value).toBe("");
    fireEvent.click(screen.getByLabelText("Insertar objeción: No le interesa"));
    expect(contenido.value).toBe("{OBJECION:o1}");

    fireEvent.click(screen.getByLabelText("Insertar objeción: Es muy caro"));
    expect(contenido.value).toContain("{OBJECION:o1}");
    expect(contenido.value).toContain("{OBJECION:o2}");
  });

  it("sin objeciones cargadas muestra el mensaje orientativo", () => {
    renderVista([speechSoloInicio], []);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    expect(
      screen.getByText(/No hay objeciones cargadas/)
    ).toBeTruthy();
  });

  it("una llave sin objeción asociada genera advertencia pero no error", () => {
    const conLlave = {
      ...speechSoloInicio,
      steps: [
        paso("p1", "Apertura", "Va {OBJECION:falta} en el texto", []),
      ],
    };
    renderVista([conLlave], objeciones);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));

    expect(screen.getByLabelText("Advertencias").textContent).toContain(
      "{OBJECION:falta}"
    );
    expect(screen.getByText("Listo para ejecutar")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Release 1.11.2 · Modo llamada y llamadas pendientes
// ---------------------------------------------------------------------------

/** Guion v2 mínimo: 2 etapas, una opción con respuesta sugerida. */
const speechLlamada = {
  id: "sl",
  nombre: "Llamada de prueba",
  descripcion: "Guion para probar el modo llamada",
  fechaCreacion: "2026-01-01T00:00:00.000Z",
  fechaModificacion: "2026-01-01T00:00:00.000Z",
  version: 1,
  startStepId: "l1",
  estadosFinales: [{ id: "ef1", nombre: "Derivación coordinada" }],
  reglas: [],
  modulos: [],
  steps: [
    {
      id: "l1",
      titulo: "Apertura",
      contenido: "Hola, ¿puede hablar?",
      objetivo: "",
      orden: 0,
      camposRegistro: [],
      preguntas: [
        {
          id: "lq1",
          texto: "¿Sigue?",
          obligatoria: false,
          opciones: [
            {
              id: "lop1",
              texto: "Sí, sigue",
              targetStepId: "l2",
              orden: 0,
              respuestaSugerida: "Gracias.",
              accion: "",
              datosARegistrar: "",
              asignaciones: [],
              requiereAclaracion: false,
              finalizaLlamada: false,
              estadoFinalId: "",
              moduloId: null,
            },
          ],
        },
      ],
    },
    {
      id: "l2",
      titulo: "Cierre",
      contenido: "Gracias por su tiempo.",
      objetivo: "",
      orden: 1,
      camposRegistro: [],
      preguntas: [],
    },
  ],
};

/** Sesión de prueba ya avanzada a la etapa 2 (lo que quedaría "pendiente"). */
function sesionPendienteEnCierre() {
  let ses = crearSesion(speechLlamada);
  ses = elegirOpcion(ses, "lop1");
  ses = avanzar(ses, speechLlamada).sesion;
  return serializarSesion(ses);
}

const pendienteDePrueba = (extra = {}) => ({
  sl: {
    speechId: "sl",
    speechNombre: speechLlamada.nombre,
    speechVersion: speechLlamada.version,
    actualizadaEn: "2026-01-03T10:00:00.000Z",
    sesion: sesionPendienteEnCierre(),
    ...extra,
  },
});

/** Harness que expone las llamadas guardadas para poder verificarlas en el DOM. */
function ConLlamadas({ inicial = [], llamadasIniciales = {} }) {
  const [speechs, setSpeechs] = useState(inicial);
  const [llamadas, setLlamadas] = useState(llamadasIniciales);
  return (
    <>
      <div data-testid="n-llamadas">{Object.keys(llamadas || {}).length}</div>
      <div data-testid="paso-pendiente">
        {llamadas?.sl?.sesion?.pasoId || ""}
      </div>
      <InteractivosView
        speechs={speechs}
        setSpeechs={setSpeechs}
        showToast={noop}
        objeciones={[]}
        llamadasEnCurso={llamadas}
        setLlamadasEnCurso={setLlamadas}
      />
    </>
  );
}

describe("InteractivosView (1.11.2 · Modo llamada)", () => {
  it("abre el Modo llamada, guarda el avance y permite retomarlo", async () => {
    noop.mockClear();
    render(<ConLlamadas inicial={[speechLlamada]} />);

    // Acción principal de la tarjeta: pantalla enfocada, no el runner modal.
    fireEvent.click(screen.getByLabelText("Iniciar modo llamada"));
    expect(
      screen.getByRole("heading", { name: "Llamada de prueba" })
    ).toBeTruthy();
    expect(screen.getByText("Etapa 1 de 2 del guion")).toBeTruthy();
    // El runner de Vista rápida no se abrió.
    expect(screen.queryByText(/ETAPA 1 \/ 2/)).toBeNull();

    // Un toque elige y muestra la respuesta; Continuar avanza y persiste.
    fireEvent.click(screen.getByText("Sí, sigue"));
    expect(screen.getByText("Gracias.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Etapa 2 de 2 del guion")).toBeTruthy();
    expect(screen.getByTestId("n-llamadas").textContent).toBe("1");
    expect(screen.getByTestId("paso-pendiente").textContent).toBe("l2");

    // Conservar y salir deja la llamada pendiente visible en la biblioteca.
    fireEvent.click(screen.getByLabelText("Salir del modo llamada"));
    const dialogo = screen.getByRole("dialog", { name: "Salir de la llamada" });
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Conservar y salir" })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Llamada de prueba" })
      ).toBeNull()
    );
    expect(screen.getByText("Llamada pendiente")).toBeTruthy();
    expect(screen.getByLabelText("Retomar modo llamada")).toBeTruthy();

    // Retomar vuelve exactamente al punto guardado.
    fireEvent.click(screen.getByLabelText("Retomar modo llamada"));
    expect(screen.getByText("Etapa 2 de 2 del guion")).toBeTruthy();
    expect(screen.getByText("Gracias por su tiempo.")).toBeTruthy();
  });

  it("iniciar una nueva llamada con una pendiente pide confirmación y la descarta", async () => {
    render(
      <ConLlamadas
        inicial={[speechLlamada]}
        llamadasIniciales={pendienteDePrueba()}
      />
    );

    fireEvent.click(screen.getByLabelText("Iniciar nueva llamada"));
    const confirmar = screen.getByRole("dialog", { name: "Iniciar nueva llamada" });
    expect(
      within(confirmar).getByText(/la llamada guardada se descarta/i)
    ).toBeTruthy();
    fireEvent.click(within(confirmar).getByRole("button", { name: "Iniciar nueva" }));

    // La sesión vieja se descartó y la nueva arranca en la etapa 1.
    expect(screen.getByText("Etapa 1 de 2 del guion")).toBeTruthy();
    expect(screen.getByTestId("n-llamadas").textContent).toBe("0");

    // Cancelar sin tocar nada no vuelve a crear un pendiente.
    fireEvent.click(screen.getByLabelText("Salir del modo llamada"));
    const salir = screen.getByRole("dialog", { name: "Salir de la llamada" });
    fireEvent.click(within(salir).getByRole("button", { name: "Cancelar sin guardar" }));
    await waitFor(() => expect(screen.getByTestId("n-llamadas").textContent).toBe("0"));
  });

  it("descartar la llamada pendiente la quita sin tocar el guion", () => {
    render(
      <ConLlamadas
        inicial={[speechLlamada]}
        llamadasIniciales={pendienteDePrueba()}
      />
    );

    expect(screen.getByText("Llamada pendiente")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Descartar llamada pendiente"));

    expect(screen.getByTestId("n-llamadas").textContent).toBe("0");
    expect(screen.queryByText("Llamada pendiente")).toBeNull();
    expect(screen.getByLabelText("Iniciar modo llamada")).toBeTruthy();
    // El guion sigue en la biblioteca.
    expect(screen.getByText("Llamada de prueba")).toBeTruthy();
  });

  it("eliminar el speech borra en cascada su llamada pendiente", async () => {
    render(
      <ConLlamadas
        inicial={[speechLlamada]}
        llamadasIniciales={pendienteDePrueba()}
      />
    );

    fireEvent.click(screen.getByLabelText("Eliminar speech interactivo"));
    const confirmar = screen.getByRole("dialog", {
      name: "Eliminar speech interactivo",
    });
    fireEvent.click(within(confirmar).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(screen.getByTestId("n-llamadas").textContent).toBe("0"));
    expect(screen.queryByText("Llamada de prueba")).toBeNull();
  });

  it("retomar avisa cuando la versión del guion cambió y mantiene el recorrido", () => {
    noop.mockClear();
    render(
      <ConLlamadas
        inicial={[speechLlamada]}
        llamadasIniciales={pendienteDePrueba({
          sesion: { ...sesionPendienteEnCierre(), speechVersion: 0 },
        })}
      />
    );

    fireEvent.click(screen.getByLabelText("Retomar modo llamada"));
    expect(noop).toHaveBeenCalledWith(
      "El guion cambió: revisá las etapas al retomar.",
      "info"
    );
    expect(
      screen.getByText(/El guion cambió desde que empezó esta llamada/)
    ).toBeTruthy();
    expect(screen.getByText("Etapa 2 de 2 del guion")).toBeTruthy();
  });
});
