import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Field from "../components/common/Field";
import { Modal } from "../components/common/Modal";
import EventModal from "../features/calendar/EventModal";
import { SmartTable } from "../features/dashboard/SmartTable";
import { onKeyActivate, accessibleClickProps } from "../utils/a11y";

describe("Accesibilidad: Field (label -> input)", () => {
  it("asocia el <label htmlFor> con el id inyectado en el control", () => {
    render(
      <Field label="Nombre del caso">
        <input type="text" />
      </Field>
    );
    const input = screen.getByLabelText("Nombre del caso");
    expect(input).toBeTruthy();
    const label = screen.getByText("Nombre del caso").closest("label");
    expect(label).toBeTruthy();
    expect(input.id).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
  });

  it("asocia label y control cuando el hijo es un textarea", () => {
    render(
      <Field label="Detalle">
        <textarea />
      </Field>
    );
    expect(screen.getByLabelText("Detalle")).toBeTruthy();
  });

  it("respeta el id explícito cuando se pasa", () => {
    render(
      <Field label="Fecha" id="campo-fecha">
        <input type="text" />
      </Field>
    );
    const input = screen.getByLabelText("Fecha");
    expect(input.id).toBe("campo-fecha");
  });

  it("no emite <label> cuando no hay etiqueta", () => {
    const { container } = render(
      <Field>
        <input type="text" />
      </Field>
    );
    expect(container.querySelector("label")).toBeNull();
  });
});

describe("Accesibilidad: Modal (Escape + ARIA dialog)", () => {
  it("cierra con Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen title="Diálogo de prueba" onClose={onClose}>
        <p>contenido</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("expone role dialog, aria-modal y aria-labelledby hacia el título", () => {
    render(
      <Modal isOpen title="Diálogo de prueba" onClose={() => {}}>
        <p>contenido</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog", { name: "Diálogo de prueba" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const heading = screen.getByRole("heading", { name: "Diálogo de prueba" });
    expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
  });

  it("cierra al hacer click en el backdrop", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} closeOnOverlayClick>
        <p>contenido</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe("Accesibilidad: onKeyActivate / accessibleClickProps", () => {
  it("Enter activa el handler y previene el default", () => {
    const handler = vi.fn();
    const preventDefault = vi.fn();
    onKeyActivate(handler)({ key: "Enter", preventDefault });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();
  });

  it("la barra espaciadora activa el handler", () => {
    const handler = vi.fn();
    onKeyActivate(handler)({ key: " ", preventDefault: () => {} });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("otras teclas no activan el handler", () => {
    const handler = vi.fn();
    onKeyActivate(handler)({ key: "a", preventDefault: () => {} });
    expect(handler).not.toHaveBeenCalled();
  });

  it("accessibleClickProps devuelve rol, tabIndex y aria-label", () => {
    const props = accessibleClickProps(() => {}, { label: "Editar caso" });
    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("Editar caso");
    expect(typeof props.onKeyDown).toBe("function");
  });
});

describe("Accesibilidad: EventModal (aria-live y aria-pressed)", () => {
  it("anuncia errores de validación con role=alert y aria-live", () => {
    render(
      <EventModal isOpen onClose={() => {}} onSave={() => {}} event={null} />
    );
    fireEvent.click(screen.getByText("Crear evento"));
    const titleAlert = screen.getAllByRole("alert").find(
      (a) => a.parentElement && a.parentElement.textContent.includes("El titulo es requerido")
    );
    expect(titleAlert).toBeTruthy();
    expect(titleAlert.getAttribute("aria-live")).toBe("polite");
  });

  it("marca la prioridad activa con aria-pressed", () => {
    render(
      <EventModal isOpen onClose={() => {}} onSave={() => {}} event={null} />
    );
    const grupo = screen.getByRole("group", { name: "Prioridad" });
    const baja = within(grupo).getByRole("button", { name: "Baja" });
    const media = within(grupo).getByRole("button", { name: "Media" });
    const alta = within(grupo).getByRole("button", { name: "Alta" });
    expect(media.getAttribute("aria-pressed")).toBe("true");
    expect(baja.getAttribute("aria-pressed")).toBe("false");
    expect(alta.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("Accesibilidad: SmartTable (empty state y tabla)", () => {
  const COLUMNS = [{ key: "a", label: "Aseguradora" }];

  it("muestra EmptyState cuando no hay datos", () => {
    render(<SmartTable title="Top aseguradoras" columns={COLUMNS} data={[]} />);
    expect(screen.getByText("Sin datos aún")).toBeTruthy();
  });

  it("con datos renderiza la tabla con aria-label", () => {
    render(
      <SmartTable
        title="Top aseguradoras"
        columns={COLUMNS}
        data={[{ a: "Mapfre" }]}
      />
    );
    expect(
      screen.getByRole("table", { name: "Top aseguradoras" })
    ).toBeTruthy();
  });
});