import { describe, it, expect, beforeEach } from 'vitest';
import {
  esAlmacenamientoPerdido,
  registrarPerdidaAlmacenamiento,
  hayPerdidaAlmacenamientoPendiente,
  leerHuellaDatos,
  actualizarHuellaDatos,
  evaluarHuellaDatos,
  verificarDatosPostCarga,
  aceptarPerdidaDatos,
  confirmarRecuperacionDatos,
  __resetStorageHealthParaTest,
} from './storageHealth';
import useSystemStatus from './systemStatusStore';

/**
 * v1.10.6 — pérdida del archivo de IndexedDB.
 * Fija: (1) el clasificador (sin falsos positivos con aborts de fetch),
 * (2) el registro idempotente + bandera en localStorage, (3) la huella de
 * conteos como evidencia anti-recreación-vacía (con su guarda), (4) los
 * cuatro casos de verificarDatosPostCarga y (5) aceptar/confirmar
 * recuperación.
 */
describe('storageHealth · v1.10.6', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetStorageHealthParaTest();
  });

  // ---------- Clasificador ----------
  describe('esAlmacenamientoPerdido', () => {
    it('detecta el shape real observado en producción (AbortError + "Data lost…")', () => {
      const err = {
        name: 'AbortError',
        message:
          'AbortError NotReadableError Data lost due to missing file. Affected record should be considered irrecoverable',
      };
      expect(esAlmacenamientoPerdido(err)).toBe(true);
    });

    it('detecta NotReadableError con contexto de base de datos', () => {
      expect(
        esAlmacenamientoPerdido({
          name: 'NotReadableError',
          message: 'Failed to read the "AppData" database from disk',
        })
      ).toBe(true);
    });

    it('desciende en err.inner (Dexie envuelve el error interno)', () => {
      const envuelto = {
        name: 'DexieError',
        message: 'Transacción abortada',
        inner: {
          name: 'AbortError',
          message: 'Data lost due to missing file',
        },
      };
      expect(esAlmacenamientoPerdido(envuelto)).toBe(true);
    });

    it('NO trata un abort de fetch como pérdida (evita alarma falsa)', () => {
      expect(
        esAlmacenamientoPerdido({
          name: 'AbortError',
          message: 'The user aborted a request.',
        })
      ).toBe(false);
    });

    it('NO trata errores comunes como pérdida', () => {
      expect(esAlmacenamientoPerdido(new Error('Network request failed'))).toBe(false);
      expect(esAlmacenamientoPerdido({ name: 'QuotaExceededError', message: 'storage quota' })).toBe(
        false
      );
      expect(esAlmacenamientoPerdido(null)).toBe(false);
      expect(esAlmacenamientoPerdido(undefined)).toBe(false);
      expect(esAlmacenamientoPerdido('texto suelto')).toBe(false);
    });
  });

  // ---------- Registro + bandera ----------
  describe('registrarPerdidaAlmacenamiento', () => {
    it('marca el store global y deja la bandera en localStorage', () => {
      registrarPerdidaAlmacenamiento(
        { message: 'Data lost due to missing file' },
        'loadNotes'
      );
      const s = useSystemStatus.getState();
      expect(s.storageLost).toBe(true);
      expect(s.storageLostDetail).toMatchObject({
        mensaje: 'Data lost due to missing file',
        contexto: 'loadNotes',
      });
      expect(hayPerdidaAlmacenamientoPendiente()).toBe(true);
    });

    it('es idempotente: un segundo registro no pisa el primero', () => {
      registrarPerdidaAlmacenamiento({ message: 'primero' }, 'ctx-a');
      registrarPerdidaAlmacenamiento({ message: 'segundo' }, 'ctx-b');
      expect(useSystemStatus.getState().storageLostDetail.contexto).toBe('ctx-a');
    });
  });

  // ---------- Huella de conteos ----------
  describe('huella de conteos (evidencia)', () => {
    it('escribe y lee los conteos', () => {
      actualizarHuellaDatos({ cases: 3, notes: 5, events: 2 });
      expect(leerHuellaDatos()).toMatchObject({ cases: 3, notes: 5, events: 2 });
    });

    it('NO pisa la huella mientras hay bandera de pérdida (preserva evidencia)', () => {
      actualizarHuellaDatos({ notes: 42 });
      registrarPerdidaAlmacenamiento({ message: 'Data lost due to missing file' });
      actualizarHuellaDatos({ notes: 0 }); // load del arranque con DB recreada
      expect(leerHuellaDatos().notes).toBe(42);
    });

    it('no escribe cuando nada cambió (evita escrituras en cada sync)', () => {
      actualizarHuellaDatos({ notes: 5 });
      const antes = leerHuellaDatos().ts;
      actualizarHuellaDatos({ notes: 5 });
      expect(leerHuellaDatos().ts).toBe(antes);
    });

    it('evaluarHuellaDatos: alarma SOLO ante descenso (nunca ante igualdad/crecimiento)', () => {
      actualizarHuellaDatos({ cases: 3, notes: 5, events: 2 });
      expect(evaluarHuellaDatos({ cases: 3, notes: 5, events: 2 }).alarma).toBe(false);
      expect(evaluarHuellaDatos({ cases: 9, notes: 9, events: 9 }).alarma).toBe(false);
      const res = evaluarHuellaDatos({ cases: 3, notes: 0, events: 2 });
      expect(res.alarma).toBe(true);
      expect(res.perdidas).toEqual([{ tabla: 'notes', antes: 5, ahora: 0 }]);
    });

    it('evaluarHuellaDatos sin huella previa: nunca alarma (primer arranque)', () => {
      expect(evaluarHuellaDatos({ notes: 0 }).alarma).toBe(false);
    });
  });

  // ---------- Verificación post-carga ----------
  describe('verificarDatosPostCarga', () => {
    it("'perdido': la DB no se pudo leer → no evalúa huella (el banner ya está activo)", () => {
      registrarPerdidaAlmacenamiento({ message: 'Data lost due to missing file' });
      const res = verificarDatosPostCarga({ cases: 0, notes: 0, events: 0 });
      expect(res.caso).toBe('perdido');
      expect(useSystemStatus.getState().dataAlarm).toBeNull();
    });

    it("'alarma': bandera previa + menos datos que la huella → pérdida silenciosa", () => {
      localStorage.setItem(
        'app-data-fingerprint',
        JSON.stringify({ cases: 3, notes: 5, events: 2, ts: 1 })
      );
      localStorage.setItem('app-storage-lost', '1');
      const res = verificarDatosPostCarga({ cases: 0, notes: 0, events: 0 });
      expect(res.caso).toBe('alarma');
      const alarm = useSystemStatus.getState().dataAlarm;
      expect(alarm.perdidas).toHaveLength(3);
      expect(hayPerdidaAlmacenamientoPendiente()).toBe(true); // evidencia intacta
    });

    it("'recuperado': bandera previa pero conteos completos → libera y avisa", () => {
      localStorage.setItem(
        'app-data-fingerprint',
        JSON.stringify({ cases: 0, notes: 0, events: 0, ts: 1 })
      );
      localStorage.setItem('app-storage-lost', '1');
      const res = verificarDatosPostCarga({ cases: 0, notes: 0, events: 0 });
      expect(res.caso).toBe('recuperado');
      expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
      expect(useSystemStatus.getState().storageLost).toBe(false);
    });

    // v1.10.7: bandera SIN huella previa (p. ej. primer arranque en 1.10.6 ya
    // con la base rota) → no hay evidencia con qué comparar: no se puede
    // verificar que los datos estén completos. Se libera la bandera (ya no
    // hay storage perdido) pero init() emite un aviso honesto en vez del
    // toast de "todo recuperado".
    it("'sin-huellas': bandera sin huella previa → no se puede verificar", () => {
      localStorage.setItem('app-storage-lost', '1');
      const res = verificarDatosPostCarga({ cases: 0, notes: 0, events: 0 });
      expect(res.caso).toBe('sin-huellas');
      expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
      expect(useSystemStatus.getState().storageLost).toBe(false);
      expect(useSystemStatus.getState().dataAlarm).toBeNull();
    });

    it("'ok': sin bandera y sin descensos → sin novedad", () => {
      actualizarHuellaDatos({ notes: 5 });
      const res = verificarDatosPostCarga({ cases: 0, notes: 5, events: 0 });
      expect(res.caso).toBe('ok');
      expect(useSystemStatus.getState().dataAlarm).toBeNull();
    });
  });

  // ---------- Aceptación / recuperación ----------
  describe('aceptarPerdidaDatos / confirmarRecuperacionDatos', () => {
    it('aceptar cierra la alarma, libera la bandera y graba la huella actual', () => {
      localStorage.setItem(
        'app-data-fingerprint',
        JSON.stringify({ cases: 3, notes: 5, events: 2, ts: 1 })
      );
      localStorage.setItem('app-storage-lost', '1');
      verificarDatosPostCarga({ cases: 0, notes: 0, events: 0 });
      expect(useSystemStatus.getState().dataAlarm).toBeTruthy();

      aceptarPerdidaDatos();
      expect(useSystemStatus.getState().dataAlarm).toBeNull();
      expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
      // la huella refleja lo aceptado → el próximo arranque NO re-alarmará
      expect(leerHuellaDatos()).toMatchObject({ cases: 0, notes: 0, events: 0 });
    });

    it('confirmar tras un restore limpia TODO y sincroniza la huella', () => {
      // estado de pérdida previo
      registrarPerdidaAlmacenamiento({ message: 'Data lost due to missing file' });
      localStorage.setItem(
        'app-data-fingerprint',
        JSON.stringify({ cases: 3, notes: 5, events: 2, ts: 1 })
      );

      confirmarRecuperacionDatos({ cases: 2, notes: 4, events: 1 });

      const s = useSystemStatus.getState();
      expect(s.storageLost).toBe(false);
      expect(s.dataAlarm).toBeNull();
      expect(hayPerdidaAlmacenamientoPendiente()).toBe(false);
      // huella = conteos restaurados (backup más viejo NO dispara alarma falsa)
      expect(leerHuellaDatos()).toMatchObject({ cases: 2, notes: 4, events: 1 });
    });
  });

  // ---------- v1.10.9 — marca de reparación profunda (diagnóstico honesto) ----------
  describe('marca de reparación (app-repair-pending)', () => {
    const CLAVE = 'app-repair-pending';

    it('registrar tras una reparación reciente → detalle.trasReparacion (one-shot)', () => {
      localStorage.setItem(CLAVE, String(Date.now()));

      registrarPerdidaAlmacenamiento({ message: 'Data lost due to missing file' }, 'App:loadNotes');

      expect(useSystemStatus.getState().storageLost).toBe(true);
      // El detalle vive en storageLostDetail (campo aparte del boolean).
      expect(useSystemStatus.getState().storageLostDetail).toMatchObject({
        trasReparacion: true,
      });
      // One-shot: un segundo registro (u otro origen de error) ya no la repite.
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });

    it('marca VENCIDA (reparación vieja) no etiqueta errores actuales', () => {
      localStorage.setItem(CLAVE, String(Date.now() - 16 * 60 * 1000));

      registrarPerdidaAlmacenamiento({ message: 'Data lost due to missing file' });

      expect(useSystemStatus.getState().storageLost).toBe(true);
      expect(
        useSystemStatus.getState().storageLostDetail.trasReparacion
      ).toBeUndefined();
      expect(localStorage.getItem(CLAVE)).toBeNull(); // consumida (vencida)
    });

    it('sin reparación previa el detalle NO lleva trasReparacion (regresión)', () => {
      registrarPerdidaAlmacenamiento({ message: 'Data lost due to missing file' });
      expect(
        useSystemStatus.getState().storageLostDetail.trasReparacion
      ).toBeUndefined();
    });

    it('verificarDatosPostCarga con lecturas OK limpia la marca huérfana', () => {
      localStorage.setItem(CLAVE, String(Date.now()));
      // Sin bandera ni error: lecturas sanas → la marca ya no diagnóstica nada.
      const resumen = verificarDatosPostCarga({ cases: 1, notes: 2, events: 0 });
      expect(resumen.caso).toBe('ok');
      expect(localStorage.getItem(CLAVE)).toBeNull();
    });
  });
});
