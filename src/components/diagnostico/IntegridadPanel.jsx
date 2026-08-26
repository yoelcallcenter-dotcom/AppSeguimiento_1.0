import React, { useState, useCallback } from "react";
import { ShieldCheck, Play, RefreshCw, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import {
  runIntegrityCheck,
  restablecerPreferenciasOrden,
  leerLogIntegridad,
  ultimaVerificacion,
} from "../../core/integrity/integrityService";

const NIVEL_META = {
  critical: { color: "var(--color-danger)", label: "Crítico", Icon: AlertTriangle },
  error: { color: "var(--color-danger)", label: "Error", Icon: AlertTriangle },
  warning: { color: "var(--color-warning)", label: "Atención", Icon: AlertTriangle },
  info: { color: "var(--color-accent)", label: "Info", Icon: Info },
};

/**
 * IntegridadPanel (Release 1.3.3)
 * Panel de integridad de datos para Configuración > Sistema > Diagnóstico.
 * Traduce los hallazgos técnicos a información accionable y ofrece una única
 * reparación segura y explicada (restablecer órdenes de secciones).
 */
export function IntegridadPanel() {
  const [informe, setInforme] = useState(null);
  const [log, setLog] = useState(() => leerLogIntegridad().slice(0, 8));
  const [verificando, setVerificando] = useState(false);
  const [confirmarReparacion, setConfirmarReparacion] = useState(false);

  const ejecutar = useCallback(async () => {
    setVerificando(true);
    try {
      const resultado = await runIntegrityCheck({ completo: true });
      setInforme(resultado);
      setLog(leerLogIntegridad().slice(0, 8));
    } finally {
      setVerificando(false);
    }
  }, []);

  const repararOrdenes = useCallback(() => {
    if (restablecerPreferenciasOrden()) {
      setInforme((prev) =>
        prev
          ? {
              ...prev,
              preferencias: { ok: true, reparaciones: [] },
            }
          : prev
      );
      setConfirmarReparacion(false);
      window.location.reload();
    }
  }, []);

  const ultima = ultimaVerificacion();

  return (
    <div className="space-y-4">
      {/* Encabezado + acción */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: "var(--color-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            Integridad de datos
          </span>
        </div>
        <BtnOutline
          onClick={ejecutar}
          size="sm"
          icon={Play}
          color="var(--color-accent)"
          disabled={verificando}
        >
          {verificando ? "Verificando..." : "Ejecutar verificación completa"}
        </BtnOutline>
      </div>

      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Revisa configuración, preferencias de orden, referencias entre notas/eventos y casos,
        duplicados e historial de backups. Ningún dato se modifica automáticamente:
        los problemas se informan para que decidas qué hacer.
        {ultima && (
          <>
            {" "}Última comprobación: {new Date(ultima).toLocaleString("es-AR")}.
          </>
        )}
      </p>

      {/* Resultado */}
      {!informe ? (
        <div
          className="rounded-lg p-4 text-center text-xs"
          style={{ backgroundColor: "var(--color-surface2)", border: "1px dashed var(--color-border)", color: "var(--color-text-muted)" }}
        >
          Ejecutá la verificación completa para revisar la integridad de tus datos.
        </div>
      ) : (
        <div className="space-y-3">
          {informe.problemas.length === 0 ? (
            <div
              className="rounded-lg p-3 flex items-center gap-2"
              style={{ backgroundColor: "var(--color-success)22", border: "1px solid var(--color-success)44" }}
            >
              <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--color-success)" }}>
                Todo en orden: no se detectaron problemas de integridad.
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {informe.problemas.map((p, i) => {
                const meta = NIVEL_META[p.nivel] || NIVEL_META.info;
                const Icon = meta.Icon;
                return (
                  <div
                    key={i}
                    className="rounded-lg p-2.5 flex items-start gap-2"
                    style={{ backgroundColor: "var(--color-surface2)", borderLeft: `3px solid ${meta.color}` }}
                  >
                    <Icon size={13} style={{ color: meta.color, marginTop: 1, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider mr-2"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text)" }}>
                        {p.mensaje}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumen numérico cuando hubo verificación completa */}
          {(informe.huerfanos || informe.duplicados || informe.historial) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                ["Notas huérfanas", informe.huerfanos?.notasHuerfanas?.length ?? 0],
                ["Eventos huérfanos", informe.huerfanos?.eventosHuerfanos?.length ?? 0],
                ["Duplicados posibles", informe.duplicados?.posibles?.length ?? 0],
                ["Eventos historial inválidos", informe.historial?.invalidos ?? 0],
              ].map(([label, valor]) => (
                <div
                  key={label}
                  className="rounded-lg p-2"
                  style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}
                >
                  <div className="text-base font-bold" style={{ color: valor > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                    {valor}
                  </div>
                  <div className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {informe.ultimoBackup && (
            <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Último backup del historial:{" "}
              <b style={{ color: "var(--color-text)" }}>
                {new Date(informe.ultimoBackup.timestamp).toLocaleString("es-AR")}
              </b>{" "}
              ({informe.ultimoBackup.kind === "safeguard" ? "Seguridad" : informe.ultimoBackup.kind === "jornada" ? "Jornada" : "Automático"})
            </div>
          )}

          {/* Única reparación segura y explicada */}
          {informe.preferencias && informe.preferencias.ok === false && (
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: "var(--color-surface2)", border: "1px solid var(--color-border)" }}
            >
              {confirmarReparacion ? (
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--color-text)" }}>
                    ¿Restablecer el orden de las secciones?
                  </div>
                  <div className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
                    Esto solo restablece el orden de pestañas/secciones de Dashboard, Tablero, Tabla,
                    Reportes y Útiles a su estado inicial. Tus casos, notas, eventos y configuración
                    no se modifican. La página se recargará al confirmar.
                  </div>
                  <div className="flex gap-2">
                    <Btn onClick={repararOrdenes} size="sm" color="var(--color-accent)" icon={RefreshCw}>
                      Sí, restablecer
                    </Btn>
                    <BtnOutline onClick={() => setConfirmarReparacion(false)} size="sm" color="var(--color-text-muted)">
                      Cancelar
                    </BtnOutline>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs" style={{ color: "var(--color-text)" }}>
                    Las preferencias de orden tienen valores obsoletos o desactualizados.
                  </span>
                  <BtnOutline onClick={() => setConfirmarReparacion(true)} size="sm" color="var(--color-accent)" icon={RefreshCw}>
                    Restablecer orden de secciones
                  </BtnOutline>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log de integridad */}
      {log.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
            Registro de integridad (últimas {log.length})
          </div>
          <div
            className="rounded-lg divide-y max-h-40 overflow-y-auto"
            style={{ backgroundColor: "var(--color-surface2)", borderColor: "var(--color-border)" }}
          >
            {log.map((e, i) => (
              <div key={i} className="px-3 py-1.5 text-[10px] flex gap-2" style={{ borderColor: "var(--color-border)" }}>
                <span className="tabular-nums whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(e.ts).toLocaleString("es-AR")}
                </span>
                <span className="font-semibold whitespace-nowrap" style={{ color: "var(--color-accent)" }}>
                  {e.tipo}
                </span>
                <span className="truncate" style={{ color: "var(--color-text)" }}>{e.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegridadPanel;
