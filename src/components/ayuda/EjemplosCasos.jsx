import React, { useState } from "react";
import { FileText, Copy, Check, Users, Calendar, MapPin } from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { PillMemo } from "../common/Pill";
import { useCases } from "../../hooks/useCases";
import { casoVacio, hoyISO, uid } from "../../utils/helpers";
import { copyToClipboard } from "../../utils/copyToClipboard";

const hoyDDMM = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
};

const EJEMPLOS = [
  {
    nombre: "RAMIREZ EVELIN DAIANA",
    telefono: "3416699834",
    localidad: "ZAVALLA",
    aseguradora: "PREVENCION (88)",
    profesion: "Laboral",
    ingreso: "Accidente laboral",
    lesion: "CONTUSION CADERA",
    tipoIngreso: "Accidente + Tratamiento",
    cita: `${hoyDDMM()} - (10:00-10:30)`,
    estado: "Cita virtual",
    observaciones: "Primera consulta con doctor asignado",
    tags: ["Primera consulta", "Zavalla"],
    operador: "Yoel Libay",
  },
  {
    nombre: "BASSANO FRANCO GABRIEL",
    telefono: "3518089513",
    localidad: "CORDOBA CAPITAL",
    aseguradora: "LA SEGUNDA (88)",
    profesion: "Operario de deposito",
    ingreso: "Accidente laboral",
    lesion: "CONTUSION HOMBRO",
    tipoIngreso: "Accidente + Tratamiento",
    cita: `${hoyDDMM()} - (10:00-10:30)`,
    estado: "Cita virtual",
    observaciones: "Accidente en horario laboral",
    tags: ["Primera consulta", "Capital"],
    operador: "Yoel Libay",
  },
  {
    nombre: "CONTRERAS SAAVEDRA CARLOS EDUARDO",
    telefono: "1123310439",
    localidad: "BANFIELD",
    aseguradora: "SWISS MEDICAL (88)",
    profesion: "Albañil",
    ingreso: "Accidente laboral",
    lesion: "CONTUSION MANO",
    tipoIngreso: "Accidente + Tratamiento",
    cita: `${hoyDDMM()} - (10:30-11:00)`,
    estado: "Cita virtual",
    observaciones: "Estudios complementarios pendientes",
    tags: ["Primera consulta", "Banfield"],
    operador: "Yoel Libay",
  },
  {
    nombre: "LOPEZ CARLA CELESTE",
    telefono: "1136044767",
    localidad: "SAN MARTIN",
    aseguradora: "LA SEGUNDA (88)",
    profesion: "Administrativa",
    ingreso: "Enfermedad profesional",
    lesion: "LUMBALGIA CRONICA",
    tipoIngreso: "Enfermedad Profesional",
    cita: `${hoyDDMM()} - (16:45-17:00)`,
    estado: "Cita virtual",
    observaciones: "Derivada a kinesiologia",
    tags: ["Primera consulta", "San Martin"],
    operador: "Yoel Libay",
  },
];

export function EjemplosCasos({ showToast }) {
  const [copiado, setCopiado] = useState(null);
  const [casos, setCasos] = useCases();

  const cargarEjemplo = (ejemplo) => {
    const nuevoCaso = {
      ...casoVacio(),
      ...ejemplo,
      id: uid(),
      fecha: hoyISO(),
      reporteHistory: [
        { fecha: hoyDDMM(), texto: "Caso cargado desde ejemplo" },
      ],
      leido: true,
    };
    setCasos([...casos, nuevoCaso]);
    showToast(
      `Caso de ejemplo "${ejemplo.nombre}" cargado correctamente`,
      "success"
    );
  };

  const cargarTodosEjemplos = () => {
    const nuevosCasos = EJEMPLOS.map((e) => ({
      ...casoVacio(),
      ...e,
      id: uid(),
      fecha: hoyISO(),
      reporteHistory: [
        { fecha: hoyDDMM(), texto: "Caso cargado desde ejemplo" },
      ],
      leido: true,
    }));
    setCasos([...casos, ...nuevosCasos]);
    showToast(`${nuevosCasos.length} casos de ejemplo cargados`, "success");
  };

  const copiarFormato = async (ejemplo) => {
    const cita = ejemplo.cita;
    const texto = `NOMBRE: ${ejemplo.nombre}
TELEFONO: ${ejemplo.telefono}
LOCALIDAD: ${ejemplo.localidad}
ART: ${ejemplo.aseguradora}
INGRESO: ${ejemplo.ingreso}
LESION: ${ejemplo.lesion}
CITA: ${cita}
OBSERVACIONES: ${ejemplo.observaciones}`;

    const ok = await copyToClipboard(texto);
    setCopiado(ejemplo.nombre);
    setTimeout(() => setCopiado(null), 2000);
    showToast(ok ? "Formato copiado al portapapeles" : "No se pudo copiar", ok ? "success" : "error");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Ejemplos de casos
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Carga casos de ejemplo para familiarizarte con la aplicacion
          </div>
        </div>
        <Btn onClick={cargarTodosEjemplos} icon={FileText} size="sm">
          Cargar todos
        </Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EJEMPLOS.map((ejemplo, index) => (
          <div
            key={index}
            className="rounded-lg p-3 transition-shadow hover:shadow-lg"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div
                  className="font-semibold text-sm"
                  style={{ color: "var(--color-text)" }}
                >
                  {ejemplo.nombre}
                </div>
                <div
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <span>{ejemplo.telefono}</span>
                  <span>•</span>
                  <span>{ejemplo.localidad}</span>
                </div>
              </div>
              <PillMemo estado={ejemplo.estado} small />
            </div>

            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>ART:</span>{" "}
                <span style={{ color: "var(--color-text)" }}>
                  {ejemplo.aseguradora}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>
                  Lesion:
                </span>{" "}
                <span
                  style={{ color: "var(--color-text)" }}
                  className="truncate"
                >
                  {ejemplo.lesion}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Cita:</span>{" "}
                <span style={{ color: "var(--color-text)" }}>
                  {ejemplo.cita}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>
                  Ingreso:
                </span>{" "}
                <span style={{ color: "var(--color-text)" }}>
                  {ejemplo.ingreso}
                </span>
              </div>
            </div>

            {ejemplo.tags && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {ejemplo.tags.map((t) => (
                  <span
                    key={t}
                    className="text-ds-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: "var(--color-accent)22",
                      color: "var(--color-accent)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div
              className="flex gap-2 mt-2 pt-2"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <Btn
                onClick={() => cargarEjemplo(ejemplo)}
                size="sm"
                color="var(--color-success)"
                icon={Check}
              >
                Cargar
              </Btn>
              <BtnOutline
                onClick={() => copiarFormato(ejemplo)}
                size="sm"
                color="var(--color-accent)"
                icon={copiado === ejemplo.nombre ? Check : Copy}
              >
                {copiado === ejemplo.nombre ? "Copiado" : "Copiar formato"}
              </BtnOutline>
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: "var(--color-accent)11",
          border: "1px solid var(--color-accent)33",
        }}
      >
        <div className="flex items-center gap-2">
          <Users size={14} color="var(--color-accent)" />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            Consejo:
          </span>
          <span className="text-xs" style={{ color: "var(--color-text)" }}>
            Usa estos ejemplos para practicar. Puedes copiar el formato y
            pegarlo en "Nuevo caso" usando la funcion "Pegar ficha completa".
          </span>
        </div>
      </div>
    </div>
  );
}
