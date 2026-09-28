import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Modal } from "../components/common/Modal";

describe("Modal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const closeWithAnim = () => {
    act(() => {
      vi.advanceTimersByTime(200);
    });
  };

  it("no renderiza nada cuando isOpen es false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>contenido</p>
      </Modal>
    );
    expect(screen.queryByText("Test")).toBeNull();
    expect(screen.queryByText("contenido")).toBeNull();
  });

  it("renderiza el contenido cuando isOpen es true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Titulo modal">
        <p>contenido del modal</p>
      </Modal>
    );
    expect(screen.getByText("Titulo modal")).toBeTruthy();
    expect(screen.getByText("contenido del modal")).toBeTruthy();
  });

  it("tiene role dialog y aria-modal", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Titulo">
        <p>x</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("cierra al hacer click en el backdrop (closeOnOverlayClick)", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Titulo" closeOnOverlayClick>
        <p>x</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    closeWithAnim();
    expect(onClose).toHaveBeenCalled();
  });

  it("NO cierra con click en el backdrop cuando closeOnOverlayClick es false", () => {
    const onClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Titulo"
        closeOnOverlayClick={false}
      >
        <p>x</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole("dialog"));
    closeWithAnim();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cierra al presionar Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Titulo">
        <p>x</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    closeWithAnim();
    expect(onClose).toHaveBeenCalled();
  });

  it("expone un boton de cerrar con aria-label", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Titulo">
        <p>x</p>
      </Modal>
    );
    expect(screen.getByLabelText("Cerrar")).toBeTruthy();
  });

  it("usa la clase de z-index pasada", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Titulo" zIndex="z-notification">
        <p>x</p>
      </Modal>
    );
    expect(screen.getByRole("dialog").className).toContain("z-notification");
  });

  it("el cierre directo desde el footer anima la salida sin dejar la caja vacía", () => {
    const Wrapper = () => {
      const [open, setOpen] = React.useState(true);
      return (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Speech Completo"
          footer={open ? <button onClick={() => setOpen(false)}>Cerrar</button> : null}
        >
          {open ? <p>contenido del speech</p> : null}
        </Modal>
      );
    };
    render(<Wrapper />);
    fireEvent.click(screen.getByText("Cerrar"));
    expect(screen.getByText("contenido del speech")).toBeTruthy();
    expect(screen.getByRole("dialog").className).toContain("animate-fade-out");
    closeWithAnim();
    expect(screen.queryByText("Speech Completo")).toBeNull();
    expect(screen.queryByText("contenido del speech")).toBeNull();
  });

  it("no re-llama a onClose cuando el padre cierra directo con isOpen=false", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={true} onClose={onClose} title="Titulo">
        <p>x</p>
      </Modal>
    );
    rerender(
      <Modal isOpen={false} onClose={onClose} title="Titulo">
        <p>x</p>
      </Modal>
    );
    closeWithAnim();
    closeWithAnim();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("el contenido sube con la animacion de entrada (rise) y baja al salir", () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Titulo">
        <p>x</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(
      dialog.querySelector('[class*="animate-modal-rise-in"]')
    ).toBeTruthy();

    rerender(
      <Modal isOpen={false} onClose={() => {}} title="Titulo">
        <p>x</p>
      </Modal>
    );
    expect(
      dialog.querySelector('[class*="animate-modal-rise-out"]')
    ).toBeTruthy();
    closeWithAnim();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
