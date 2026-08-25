/**
 * build-docs.js
 * Genera src/docs/docsContent.js a partir de los archivos Markdown en src/docs/.
 * Se ejecuta automáticamente antes de `npm start` y `npm run build` (prebuild/prestart),
 * de modo que las vistas de documentación SIEMPRE muestran el contenido real de src/docs.
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "src", "docs");
const OUT_FILE = path.join(DOCS_DIR, "docsContent.js");
const FILES = ["README.md", "CHANGELOG.md", "LICENSE.md"];

function toConstName(file) {
  return "DOC_" + file.replace(/\.md$/i, "").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

function escapeTemplateLiteral(content) {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

const header =
  "/**\n" +
  " * docsContent.js\n" +
  " * ARCHIVO GENERADO AUTOMÁTICAMENTE por scripts/build-docs.js.\n" +
  " * No editar a mano: se regenera en cada `npm start` / `npm run build`.\n" +
  " * Las vistas de documentación importan estos contenidos desde src/docs,\n" +
  " * por lo que siempre muestran los archivos correspondientes de src/docs/.\n" +
  " */\n\n";

const sections = FILES.map((file) => {
  const filePath = path.join(DOCS_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[build-docs] Aviso: no existe ${filePath}`);
    return `${toConstName(file)} = "# No disponible";`;
  }
  const content = fs.readFileSync(filePath, "utf8");
  return `export const ${toConstName(file)} = \`${escapeTemplateLiteral(content)}\`;`;
});

fs.writeFileSync(OUT_FILE, header + sections.join("\n\n") + "\n", "utf8");
console.log(`[build-docs] docsContent.js generado desde src/docs/ (${FILES.join(", ")})`);
