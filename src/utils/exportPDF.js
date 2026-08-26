/**
 * exportPDF.js
 * Genera el informe PDF/impresión construyendo el documento por DOM
 * (createTextNode / addEventListener), sin interpolación de HTML ni
 * document.write. Los datos de casos nunca se parsean como HTML.
 */

const CSS = `
  body { font-family: Arial, sans-serif; padding: 20px; }
  h1 { color: #333; font-size: 20px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .fecha { color: #666; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f2f2f2; font-weight: bold; }
  tr:nth-child(even) { background-color: #f9f9f9; }
  .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
  .estado {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    background-color: #e0e0e0;
  }
  .resumen { margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
  .resumen-item { display: inline-block; margin-right: 20px; }
  .resumen-numero { font-weight: bold; font-size: 16px; }
  @media print {
    .no-print { display: none; }
    body { padding: 0; }
  }
`;

const ESTADOS_PENDIENTES = ["Pendiente", "Cita virtual", "Cita presencial"];
const COLUMNAS = ["Fecha", "Nombre", "Teléfono", "Localidad", "ART", "Estado"];
const CAMPOS = ["fecha", "nombre", "telefono", "localidad", "aseguradora"];

function el(doc, tag, className) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  return node;
}

function text(doc, parent, value) {
  parent.appendChild(doc.createTextNode(value == null ? "" : String(value)));
}

export function exportarPDF(casos, titulo = "Informe de casos") {
  if (!casos || casos.length === 0) {
    alert("No hay casos para exportar");
    return;
  }

  const ventana = window.open(
    "",
    "_blank",
    "width=1000,height=800"
  );
  try { ventana.opener = null; } catch {}
  if (!ventana) {
    alert("Por favor, permite ventanas emergentes para exportar");
    return;
  }

  const doc = ventana.document;

  const titleEl = el(doc, "title");
  text(doc, titleEl, titulo);
  doc.head.appendChild(titleEl);

  const style = el(doc, "style");
  style.textContent = CSS;
  doc.head.appendChild(style);

  const header = el(doc, "div", "header");
  const h1 = el(doc, "h1");
  text(doc, h1, titulo);
  header.appendChild(h1);
  const fecha = el(doc, "div", "fecha");
  text(doc, fecha, "Fecha: " + new Date().toLocaleDateString());
  header.appendChild(fecha);
  doc.body.appendChild(header);

  const resumen = el(doc, "div", "resumen");
  const firmados = casos.filter((c) => c.estado === "Firmo").length - casos.filter((c) => c.estado === "Baja").length;
  const pendientes = casos.filter((c) => ESTADOS_PENDIENTES.includes(c.estado)).length;
  [
    [casos.length, "casos"],
    [firmados, "firmados"],
    [pendientes, "pendientes"],
  ].forEach(([numero, label]) => {
    const item = el(doc, "div", "resumen-item");
    const num = el(doc, "span", "resumen-numero");
    text(doc, num, numero);
    item.appendChild(num);
    text(doc, item, " " + label);
    resumen.appendChild(item);
  });
  doc.body.appendChild(resumen);

  const table = el(doc, "table");
  const thead = el(doc, "thead");
  const headRow = el(doc, "tr");
  COLUMNAS.forEach((label) => {
    const th = el(doc, "th");
    text(doc, th, label);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el(doc, "tbody");
  casos.forEach((c) => {
    const tr = el(doc, "tr");
    CAMPOS.forEach((campo) => {
      const td = el(doc, "td");
      text(doc, td, c[campo]);
      tr.appendChild(td);
    });
    const tdEstado = el(doc, "td");
    const estado = el(doc, "span", "estado");
    text(doc, estado, c.estado);
    tdEstado.appendChild(estado);
    tr.appendChild(tdEstado);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  doc.body.appendChild(table);

  const footer = el(doc, "div", "footer");
  text(
    doc,
    footer,
    "Total: " + casos.length + " casos - Generado el " + new Date().toLocaleString()
  );
  footer.appendChild(el(doc, "br"));
  text(doc, footer, new Date().toLocaleDateString() + " - AppSeguimiento");
  doc.body.appendChild(footer);

  const noPrint = el(doc, "div", "no-print");
  noPrint.style.textAlign = "center";
  noPrint.style.marginTop = "20px";
  const btn = el(doc, "button", "btn-print");
  btn.type = "button";
  btn.style.cssText =
    "padding:10px 20px; background:#D9A441; border:none; border-radius:5px; cursor:pointer; font-weight:bold;";
  text(doc, btn, "Imprimir / Guardar como PDF");
  btn.addEventListener("click", () => ventana.print());
  noPrint.appendChild(btn);
  doc.body.appendChild(noPrint);

  setTimeout(() => ventana.focus(), 500);
}
