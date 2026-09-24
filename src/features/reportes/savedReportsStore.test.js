import { describe, it, expect, beforeEach } from "vitest";
import appDB from "../../core/db/appDB";
import {
  createReport,
  updateReport,
  deleteReport,
  getReportById,
  getAllReports,
  duplicateReport,
} from "./savedReportsStore";

describe("savedReportsStore", () => {
  beforeEach(async () => {
    await appDB.saved_reports.clear();
  });

  const snapshot = {
    mes: 5,
    anio: 2026,
    dias: [],
    estado: "Firmo",
    localidad: "todos",
    aseguradora: "todos",
    estudio: "todos",
    tipo: "todos",
    busqueda: "",
    busquedaFiltro: "todos",
  };

  it("crea un reporte con snapshot y timestamps", async () => {
    const r = await createReport("  Activos firmas  ", snapshot);
    expect(r.id).toBeDefined();
    expect(r.nombre).toBe("Activos firmas");
    expect(r.snapshot.mes).toBe(5);
    expect(r.snapshot.estado).toBe("Firmo");
    expect(r.createdAt).toBeDefined();
    expect(typeof r.version).toBe("number");
  });

  it("normaliza un nombre vacío a 'Sin nombre'", async () => {
    const r = await createReport("   ", snapshot);
    expect(r.nombre).toBe("Sin nombre");
  });

  it("rellena el snapshot con defaults cuando faltan campos", async () => {
    const r = await createReport("Minimal", { busqueda: "test" });
    expect(r.snapshot.estado).toBe("todos");
    expect(r.snapshot.aseguradora).toBe("todos");
    expect(r.snapshot.dias).toEqual([]);
    expect(r.snapshot.busqueda).toBe("test");
  });

  it("actualiza un reporte existente incrementando versión", async () => {
    const r = await createReport("Reporte A", snapshot);
    const updated = await updateReport(r.id, { nombre: "Reporte A v2" });
    expect(updated.nombre).toBe("Reporte A v2");
    expect(updated.version).toBeGreaterThan(r.version);
    const persistido = await getReportById(r.id);
    expect(persistido.nombre).toBe("Reporte A v2");
  });

  it("lanza error al actualizar un reporte inexistente", async () => {
    await expect(updateReport(99999, { nombre: "X" })).rejects.toThrow(/not found/);
  });

  it("lista los reportes ordenados por nombre", async () => {
    await createReport("Zeta", snapshot);
    await createReport("Alfa", snapshot);
    const lista = await getAllReports();
    expect(lista.map((r) => r.nombre)).toEqual(["Alfa", "Zeta"]);
  });

  it("duplica un reporte agregando ' (copia)'", async () => {
    const r = await createReport("Activos", snapshot);
    const copia = await duplicateReport(r.id);
    expect(copia.nombre).toBe("Activos (copia)");
    expect(copia.id).not.toBe(r.id);
    expect(copia.snapshot.estado).toBe("Firmo");
  });

  it("elimina un reporte", async () => {
    const r = await createReport("Eliminar", snapshot);
    await deleteReport(r.id);
    expect(await getReportById(r.id)).toBeUndefined();
  });

  it("devuelve [] para getAllReports vacío", async () => {
    expect(await getAllReports()).toEqual([]);
  });
});