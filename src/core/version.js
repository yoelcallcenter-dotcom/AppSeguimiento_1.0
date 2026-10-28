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
export const APP_VERSION = "1.10.8";

/** Nombre comercial de la aplicaciÃ³n. */
export const APP_NAME = "AppSeguimiento";
