import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import NotesView from "./NotesView";
import {
  getAllNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getVersions,
  restoreVersion,
} from "./notesStore";

// T4b/C03 (1.10.1): la vista de Notas no tenía ningún test. Se cubren los
// cambios de 1.10.1: EmptyState en el editor vacío, el Select común de
// orden, y sobre todo que restaurar una versión ahora pide CONFIRMACIÓN
// (antes el clic en el historial llamaba restoreVersion directo y pisaba
// título/contenido sin aviso). Se mockea notesStore y el editor Tiptap para
// mantener el test liviano y determinista.
vi.mock("./notesStore", () => ({
  getAllNotes: vi.fn(),
  getNote: vi.fn(),
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  getVersions: vi.fn(),
  restoreVersion: vi.fn(),
}));

vi.mock("./NotesEditor", () => ({
  __esModule: true,
  default: ({ content, onChange }) => (
    <div data-testid="editor-stub">
      <button type="button" onClick={() => onChange && onChange("<p>editado</p>")}>
        editar contenido
      </button>
      <span>{content}</span>
    </div>
  ),
}));

vi.mock("./notesService", () => ({
  useNotesService: () => ({ createEventFromNote: vi.fn() }),
}));

const NOTA = {
  id: "n1",
  title: "Nota de prueba",
  content: "<p>Hola</p>",
  tags: [],
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T10:00:00.000Z",
};

const VERSION = {
  id: "v1",
  noteId: "n1",
  title: "Versión anterior",
  content: "<p>Viejo</p>",
  createdAt: "2026-09-30T10:00:00.000Z",
};

function renderVista() {
  const showToast = vi.fn();
  render(
    <NotesView
      showToast={showToast}
      onCreateEvent={vi.fn()}
      casos={[]}
      config={{}}
    />
  );
  return { showToast };
}

describe("NotesView · T4b/C03 (1.10.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getAllNotes.mockResolvedValue([NOTA]);
    getNote.mockResolvedValue(NOTA);
    getVersions.mockResolvedValue([VERSION]);
    restoreVersion.mockResolvedValue({ ...NOTA, content: "<p>Restaurado</p>" });
    updateNote.mockResolvedValue(NOTA);
    createNote.mockResolvedValue(NOTA);
    deleteNote.mockResolvedValue(undefined);
  });

  it("sin nota seleccionada muestra el EmptyState del set común con CTA", async () => {
    getAllNotes.mockResolvedValue([]);
    renderVista();

    const vacio = await screen.findByText("Selecciona o crea una nota");
    // EmptyState lleva animate-fade-in (antes era un div textual suelto).
    expect(vacio.closest(".animate-fade-in")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear primera nota" })).toBeTruthy();
    // La lista también usa EmptyState ("Sin notas").
    expect(screen.getByText("Sin notas")).toBeTruthy();
  });

  it("el orden de notas usa el Select común identificable por aria-label", async () => {
    renderVista();
    // Mientras loadNotes resuelve, la vista pinta skeletons (findBy).
    const sel = await screen.findByLabelText("Ordenar notas");
    expect(sel.tagName).toBe("SELECT");
    expect(sel.value).toBe("updated-desc");

    fireEvent.change(sel, { target: { value: "title-asc" } });
    expect(localStorage.getItem("notas-sort-order")).toBe("title-asc");
  });

  it("restaurar versión pide confirmación y recién ahí llama restoreVersion", async () => {
    const { showToast } = renderVista();

    fireEvent.click(
      await screen.findByRole("button", { name: "Abrir nota Nota de prueba" })
    );
    // Espera a que la nota esté cargada (editor + toolbar).
    await waitFor(() => expect(screen.getByTitle("Guardar cambios")).toBeTruthy());

    fireEvent.click(screen.getByTitle("Historial de versiones"));
    const versionBtn = await screen.findByRole("button", {
      name: /^Versión anterior/,
    });

    // Clic en la versión: abre el diálogo y NO restaura todavía.
    fireEvent.click(versionBtn);
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/Se reemplazarán el título y el contenido actuales/)
    ).toBeTruthy();
    expect(restoreVersion).not.toHaveBeenCalled();

    // Confirmar → recién ahí se restaura.
    fireEvent.click(within(dialog).getByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(restoreVersion).toHaveBeenCalledWith("v1"));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Version restaurada", "success")
    );
    // ConfirmDialog cierra con animación diferida (useDelayedClose).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("cancelar la restauración no llama restoreVersion", async () => {
    renderVista();
    fireEvent.click(
      await screen.findByRole("button", { name: "Abrir nota Nota de prueba" })
    );
    await waitFor(() => expect(screen.getByTitle("Guardar cambios")).toBeTruthy());
    fireEvent.click(screen.getByTitle("Historial de versiones"));

    fireEvent.click(await screen.findByRole("button", { name: /^Versión anterior/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Cancelar"));

    expect(restoreVersion).not.toHaveBeenCalled();
    // Cierre animado del diálogo (useDelayedClose).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("el botón Guardar pasa a variante accent cuando hay cambios sin guardar", async () => {
    renderVista();
    fireEvent.click(
      await screen.findByRole("button", { name: "Abrir nota Nota de prueba" })
    );
    await waitFor(() => expect(screen.getByTitle("Guardar cambios")).toBeTruthy());

    // Sin cambios: outline (antes era un <button> con styles inline).
    expect(screen.getByTitle("Guardar cambios").className).toContain("btn-outline");

    // Editar el contenido → dirty → variante accent.
    fireEvent.click(screen.getByRole("button", { name: "editar contenido" }));
    await waitFor(() =>
      expect(screen.getByTitle("Guardar cambios").className).toContain("btn-accent")
    );
  });
});
