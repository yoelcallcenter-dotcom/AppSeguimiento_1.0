import React, { useState } from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { InteractivosView } from "./InteractivosView";
import { serializarSpeechs, FORMATO_TIPO } from "./speechsInteractivosIO";

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

function ConEstado({ inicial = [] }) {
  const [speechs, setSpeechs] = useState(inicial);
  return (
    <InteractivosView
      speechs={speechs}
      setSpeechs={setSpeechs}
      showToast={noop}
    />
  );
}

const renderVista = (inicial = []) => render(<ConEstado inicial={inicial} />);

describe("InteractivosView (lista)", () => {
  it("muestra estado vacío y contador en cero", () => {
    renderVista();
    expect(
      screen.getByText("No hay speechs interactivos. Creá uno con el botón de arriba.")
    ).toBeTruthy();
    expect(screen.getByText("0 speechs interactivos")).toBeTruthy();
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
  it("valida en vivo: opción sin destino bloquea Iniciar Speech", () => {
    renderVista([speechSoloInicio]);
    fireEvent.click(screen.getByLabelText("Editar speech interactivo"));
    expect(screen.getByText("Listo para ejecutar")).toBeTruthy();

    fireEvent.click(screen.getByText("Nuevo paso"));
    fireEvent.click(screen.getByLabelText("Paso 1"));
    fireEvent.click(screen.getByText("Agregar opción"));

    fireEvent.change(screen.getByLabelText("Opción 1 texto"), {
      target: { value: "Continuar" },
    });
    expect(screen.getByText(/no tiene destino/)).toBeTruthy();
    expect(screen.getByText("Iniciar Speech").closest("button").disabled).toBe(
      true
    );

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

    expect(screen.getByText(/PASO 1 \/ 2/)).toBeTruthy();
    expect(screen.getByText("Atrás").closest("button").disabled).toBe(true);

    fireEvent.click(screen.getByText("Continuar"));
    expect(screen.getByText(/PASO 2 \/ 2/)).toBeTruthy();
    expect(screen.getByText("Fin del recorro")).toBeTruthy();

    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByText(/PASO 1 \/ 2/)).toBeTruthy();

    fireEvent.click(screen.getByText("Continuar"));
    fireEvent.click(screen.getByText("Reiniciar"));
    expect(screen.getByText(/PASO 1 \/ 2/)).toBeTruthy();
    expect(screen.getByText("Atrás").closest("button").disabled).toBe(true);

    fireEvent.click(screen.getByText("Cerrar"));
    expect(screen.queryByText(/PASO 1 \/ 2/)).toBeNull();
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
    expect(data.version).toBe(1);
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
    expect(screen.getByText(/PASO 1 \/ 2/)).toBeTruthy();
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
      steps: [...speechValido.steps, paso("p9", "Sueltos", "Sobra", [])],
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
      steps: [...speechValido.steps, paso("p9", "Sueltos", "Sobra", [])],
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
