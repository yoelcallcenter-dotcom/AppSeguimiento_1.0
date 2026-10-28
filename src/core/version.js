/**
 * version.js
 * VersiÃ³n de la aplicaciÃ³n. Ãšnica fuente de verdad para mostrarla en la UI,
 * incluirla en feedback/exportes y para la validaciÃ³n de migraciones.
 */
// v1.10.8: export resistente con salvamento de tablas dañadas (backup parcial
// consciente), reparación profunda del almacenamiento (deleteDatabase de
// AppData + CasesDB), clears por tabla del vaciado global (sin abortos
// silenciosos ni tablas de liquidaciones sobreviviendo) y snapshot de
// emergencia en localStorage restaurable aunque la base esté muerta.
// Además corrige el "Restaurar desde archivo" del banner (1.10.6/1.10.7 le
// pasaba el wrapper de parseBackupJSON y fallaba SIEMPRE en producción).
// v1.10.9: la reparación profunda borra las TRES bases (ahora incluye
// AppDiagnostics, el log de errores: su archivo dañado re-apretaba la bandera
// de pérdida con cada reportError) y, si tras un drop ok las lecturas siguen
// fallando, el banner lo diagnostica con pasos concretos (pestañas/PWA/
// "Clear site data" en el origen correcto) vía la marca app-repair-pending.
// Además el botón "Reparar base de datos" vive junto al "Historial ilegible"
// de Configuración → Datos. También corrige el acceso al detalle de pérdida
// (storageLostDetail, no el boolean storageLost).
export const APP_VERSION = "1.10.9";

/** Nombre comercial de la aplicaciÃ³n. */
export const APP_NAME = "AppSeguimiento";
