import React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CondicionalesView } from "./CondicionalesView";

const condicionales = [
  { id: "c1", estudio: "Estudio Alfa", aseguradora: "Galeno", condicion: "no-toma", observacion: "No recibe" },
  { id: "c2", estudio: "Estudio Alfa", aseguradora: "Omint", condicion: "condicion", observacion: "Con aval" },
  { id: "c3", estudio: "Estudio Beta", aseguradora: "Galeno", condicion: "condicion", observacion: "" },
];

function renderVista(props = {}) {
  return render(
    <CondicionalesView
      condicionales={condicionales}
      setCondicionales={vi.fn()}
      mapeo={[{ id: "m1", estudio: "Estudio Alfa" }, { id: "m2", estudio: "Estudio Beta" }]}
      aseguradoras={["Galeno", "Omint"]}
      showToast={vi.fn()}
      {...props}
    />
  );
}

describe("CondicionalesView", () => {
  it("renderiza una única tabla con su título de sección", () => {
    renderVista();
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getByText("Condicionales de Estudios Jurídicos")).toBeTruthy();
    expect(screen.getByText(/Estudios que no toman todas las aseguradoras/)).toBeTruthy();
    expect(screen.getByText("3 registradas")).toBeTruthy();
  });

  it("muestra los grupos colapsados por defecto y los expande al hacer clic", () => {
    renderVista();
    expect(screen.queryAllByRole("cell", { name: "Galeno" })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Estudio Alfa/ }));
    expect(screen.getAllByRole("cell", { name: "Galeno" })).toHaveLength(1);
    expect(screen.getAllByRole("cell", { name: "Omint" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Estudio Beta/ }));
    expect(screen.getAllByRole("cell", { name: "Galeno" })).toHaveLength(2);
  });

  it("expandir todo muestra todas las filas manteniendo una sola tabla", () => {
    renderVista();
    fireEvent.click(screen.getByText("Expandir todo"));
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getAllByRole("cell", { name: "Galeno" })).toHaveLength(2);
    expect(screen.getByText("Colapsar todo")).toBeTruthy();
  });

  it("muestra el indicador de 'no toman' junto al título", () => {
    renderVista();
    expect(screen.getByText("1 no toman")).toBeTruthy();
  });

  it("la tabla tiene nombre accesible y el contador anuncia cambios", () => {
    renderVista();
    expect(
      screen.getByRole("table", { name: "Condiciones de estudios jurídicos" })
    ).toBeTruthy();
    expect(
      screen.getByText("3 registradas").closest("span").getAttribute("aria-live")
    ).toBe("polite");
  });

  it("los botones de acción identifican a qué fila afectan", () => {
    renderVista();
    fireEvent.click(screen.getByText("Expandir todo"));
    expect(
      screen.getByLabelText("Editar: Estudio Alfa — Galeno")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Eliminar: Estudio Alfa — Omint")
    ).toBeTruthy();
  });
});

describe("CondicionalesView (1.9.4 · alta y edición)", () => {
  it("alta: el texto tipeado sin Enter se registra igual (regresión P1)", () => {
    const setCondicionales = vi.fn();
    renderVista({ setCondicionales });

    fireEvent.click(screen.getByText("Nueva condición"));
    fireEvent.change(screen.getByPlaceholderText("Nombre del estudio y Enter"), {
      target: { value: "Estudio Gamma" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Nombre de la aseguradora y Enter"),
      { target: { value: "Medifé" } }
    );
    fireEvent.click(screen.getByText("Registrar condición"));

    expect(setCondicionales).toHaveBeenCalledTimes(1);
    const [[updater]] = setCondicionales.mock.calls;
    const resultado = updater(condicionales);
    expect(resultado).toHaveLength(4);
    expect(resultado[3].estudio).toBe("Estudio Gamma");
    expect(resultado[3].aseguradora).toBe("Medifé");
  });

  it("alta: combina chips ya confirmados con el texto pendiente", () => {
    const setCondicionales = vi.fn();
    renderVista({ setCondicionales });

    fireEvent.click(screen.getByText("Nueva condición"));
    const inputEstudio = screen.getByPlaceholderText("Nombre del estudio y Enter");
    fireEvent.change(inputEstudio, { target: { value: "Estudio Delta" } });
    fireEvent.keyDown(inputEstudio, { key: "Enter", code: "Enter" });
    fireEvent.change(inputEstudio, { target: { value: "Estudio Épsilon" } });
    fireEvent.change(
      screen.getByPlaceholderText("Nombre de la aseguradora y Enter"),
      { target: { value: "Omint" } }
    );
    fireEvent.click(screen.getByText("Registrar condición"));

    const [[updater]] = setCondicionales.mock.calls;
    const resultado = updater(condicionales);
    const nuevos = resultado.slice(3);
    expect(nuevos.map((n) => n.estudio)).toEqual([
      "Estudio Delta",
      "Estudio Épsilon",
    ]);
    expect(nuevos.map((n) => n.aseguradora)).toEqual(["Omint", "Omint"]);
  });

  it("alta: valida que al menos un estudio y una aseguradora tengan texto", () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    fireEvent.click(screen.getByText("Nueva condición"));
    fireEvent.click(screen.getByText("Registrar condición"));
    expect(setCondicionales).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "Indicá al menos un estudio jurídico",
      "error"
    );
  });

  it("edición: no revienta con datos incompletos y pide el estudio (P2)", () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    fireEvent.click(screen.getByText("Expandir todo"));
    fireEvent.click(screen.getByLabelText("Editar: Estudio Beta — Galeno"));
    fireEvent.change(screen.getByPlaceholderText("Nombre del estudio"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Guardar cambios"));

    expect(setCondicionales).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Indicá el estudio jurídico", "error");
  });

  it("edición: detecta duplicado estudio+aseguradora y no guarda (P3)", () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    fireEvent.click(screen.getByText("Expandir todo"));
    fireEvent.click(screen.getByLabelText("Editar: Estudio Beta — Galeno"));
    fireEvent.change(screen.getByPlaceholderText("Nombre del estudio"), {
      target: { value: "Estudio Alfa" },
    });
    fireEvent.click(screen.getByText("Guardar cambios"));

    expect(setCondicionales).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "Ya existe una condición para ese estudio y aseguradora",
      "error"
    );
  });

  it("edición: guarda cambios válidos de la fila", () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    fireEvent.click(screen.getByText("Expandir todo"));
    fireEvent.click(screen.getByLabelText("Editar: Estudio Beta — Galeno"));
    fireEvent.change(screen.getByPlaceholderText("Detalle de la condición"), {
      target: { value: "Requiere aval previo" },
    });
    fireEvent.click(screen.getByText("Guardar cambios"));

    expect(setCondicionales).toHaveBeenCalledTimes(1);
    const [[updater]] = setCondicionales.mock.calls;
    const resultado = updater(condicionales);
    const beta = resultado.find((c) => c.id === "c3");
    expect(beta.observacion).toBe("Requiere aval previo");
    expect(showToast).toHaveBeenCalledWith("Condición actualizada", "success");
  });
});

describe("CondicionalesView (1.9.4 · contadores y filtro)", () => {
  it("al filtrar muestra 'N de M registradas'", () => {
    renderVista();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por estudio/), {
      target: { value: "Beta" },
    });
    expect(screen.getByText("1 de 3 registradas")).toBeTruthy();
  });

  it("al filtrar por select también actualiza el contador", () => {
    renderVista();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "no-toma" },
    });
    expect(screen.getByText("1 de 3 registradas")).toBeTruthy();
  });
});

describe("CondicionalesView (1.9.4 · exportar/importar JSON)", () => {
  let creado;
  let revoke;
  beforeAll(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:fake");
    global.URL.revokeObjectURL = vi.fn(() => {});
    creado = vi.fn();
    revoke = global.URL.revokeObjectURL;
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      creado(this.download);
    };
  });

  it("exporta un JSON con la clave condicionales", () => {
    renderVista();
    fireEvent.click(screen.getByText("Exportar"));
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(creado).toHaveBeenCalledTimes(1);
    expect(String(creado.mock.calls[0][0])).toMatch(/^condicionales_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("importa un array y agrega solo las filas nuevas", async () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    const contenido = JSON.stringify([
      { estudio: "Estudio Gamma", aseguradora: "Galeno", condicion: "condicion", observacion: "Nueva" },
      { estudio: "Estudio Alfa", aseguradora: "Galeno", condicion: "no-toma", observacion: "Duplicada" },
      { estudio: "", aseguradora: "SinEstudio", condicion: "condicion" },
    ]);
    const file = new File([contenido], "condicionales.json", { type: "application/json" });
    const input = screen.getByLabelText("Archivo de condicionales");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(setCondicionales).toHaveBeenCalledTimes(1));
    const [[updater]] = setCondicionales.mock.calls;
    const resultado = updater(condicionales);
    expect(resultado).toHaveLength(4);
    expect(resultado[3].estudio).toBe("Estudio Gamma");
    expect(showToast).toHaveBeenCalledWith(
      "Condición importada",
      "success"
    );
  });

  it("acepta el formato envuelto {condicionales:[...]}", async () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    const contenido = JSON.stringify({
      type: "appseguimiento-condicionales",
      version: 1,
      fecha: "2026-09-30",
      condicionales: [
        { estudio: "Estudio Delta", aseguradora: "Omint", condicion: "no-toma", observacion: "" },
      ],
    });
    const file = new File([contenido], "c.json", { type: "application/json" });
    const input = screen.getByLabelText("Archivo de condicionales");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(setCondicionales).toHaveBeenCalledTimes(1));
    const [[updater]] = setCondicionales.mock.calls;
    const resultado = updater(condicionales);
    expect(resultado).toHaveLength(4);
    expect(resultado[3].estudio).toBe("Estudio Delta");
    expect(resultado[3].condicion).toBe("no-toma");
  });

  it("un archivo inválido muestra error sin modificar datos", async () => {
    const setCondicionales = vi.fn();
    const showToast = vi.fn();
    renderVista({ setCondicionales, showToast });

    const file = new File(["no soy json"], "malo.json", { type: "application/json" });
    const input = screen.getByLabelText("Archivo de condicionales");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "El archivo no es un JSON válido.",
        "error"
      )
    );
    expect(setCondicionales).not.toHaveBeenCalled();
  });
});
