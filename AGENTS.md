# AGENTS.md

Convenciones de trabajo para AppSeguimiento (CRA + Vitest, Windows/PowerShell).

## Regla de código

- **Siempre dejar comentarios en el código explicando los cambios** (por qué cambió el comportamiento, en qué versión, riesgos). No entregar código nuevo sin comentar.

## Versionado y entrega

- Un commit por release, mensaje exacto: `Release X.Y.Z`. **No hacer commit, amend, push ni `git stash` sin orden explícita.**
- Al cerrar un release: CHANGELOG con la nueva versión en **los 3 archivos byte-idénticos** (`CHANGELOG.md`, `src/docs/CHANGELOG.md`, `public/docs/CHANGELOG.md`) → copiar bytes desde la raíz.
- Regenerar `src/docs/docsContent.js` con `node scripts/build-docs.js` (también corre en `prebuild`/`prestart`); nunca editar a mano.
- Bump de versión en `src/core/version.js` (`APP_VERSION`), `package.json` y `package-lock.json` (solo las 2 primeras líneas del lock; `@types/serve-index` es 1.9.4 por casualidad).
- README existe en 3 copias idénticas; los cambios en uno se replican en los otros dos.

## Verificación

- `npm run test:run` (suite completa; Vitest + jsdom + fake-indexeddb, setup en `src/test/setup.js`).
- `npm run build` (CRA: compila sin warnings ni errores).

## Herramientas y entorno

- Shell = PowerShell 5.1 con mojibake en stdout: usar las tools `read`/`edit`/`write`/`grep`, no `rg` ni `Select-String` para leer contenido de archivos.
- **Edits paralelos sobre el mismo archivo fallan**: hacerlos secuenciales.
- El texto con acentos en la salida de PowerShell puede venir mal decodificado; confiar en los bytes de los archivos, no en lo que se imprime.
- Sin dependencias nuevas ni servicios externos; mantener consistencia estética con lo existente (`justify-content` para alineaciones, tokens `var(--color-*)`).
