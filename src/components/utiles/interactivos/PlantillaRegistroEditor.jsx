/**
 * PlantillaRegistroEditor.jsx (Release 1.11.3)
 *
 * Sección "Plantilla de registro" del editor de speeches. Es una vista del
 * MISMO guion (recibe `speech` y llama `onChange`), no un editor paralelo:
 * - crea/edita/elimina campos de la plantilla a nivel speech;
 * - permite ordenarlos, marcarlos obligatorios, definir valores por defecto,
 *   opciones de selección y el mapeo EXPLÍCITO a un campo del caso;
 * - configura condiciones de visibilidad genéricas (campo + operador + valor);
 * - avisa antes de eliminar un campo que tiene asociaciones/condiciones, porque
 *   el modelo purga esas referencias para no dejar datos huérfanos.
 *
 * Los campos de etapa de 1.11.0 se siguen editando en la sección "Campos";
 * acá se listan en sólo lectura para poder vincularlos desde el constructor.
 */

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { Field } from "../../common/Field";
import { TextInput } from "../../common/TextInput";
import { TextArea } from "../../common/TextArea";
import { Select } from "../../common/Select";
import {
  actualizarCampoPlantilla,
  actualizarPlantillaRegistro,
  agregarCampoPlantilla,
  camposRegistroDeSpeech,
  eliminarCampoPlantilla,
  moverCampoPlantilla,
  plantillaRegistroDeSpeech,
} from "./interactiveSpeechModel";
import {
  CAMPOS_DESTINO_CASO,
  OPERADORES_CONDICION,
  TIPOS_CAMPO,
  usaOpciones,
} from "./plantillaRegistro";

export function PlantillaRegistroEditor({ speech, onChange, showToast }) {
  const guion = speech || {};
  const plantilla = useMemo(
    () => plantillaRegistroDeSpeech(guion),
    [guion]
  );
  // Todos los campos (plantilla + etapa): sirven para condiciones y para
  // vincular respuestas desde el constructor.
  const todos = useMemo(() => camposRegistroDeSpeech(guion), [guion]);
  const [eliminando, setEliminando] = useState(null);

  const campos = [...plantilla.campos].sort(
    (a, b) => (Number(a?.orden) || 0) - (Number(b?.orden) || 0)
  );

  // Referencias que se perderían al eliminar: condiciones de otros campos y
  // asociaciones de opciones. La advertencia es explícita, no automática.
  const referenciasDe = (campoId) => {
    const condiciones = todos.filter(
      (c) =>
        c.id !== campoId &&
        (Array.isArray(c.visibleSi) ? c.visibleSi : []).some(
          (cond) => cond?.campoId === campoId
        )
    ).length;
    let asignaciones = 0;
    (guion.steps || []).forEach((paso) => {
      (paso.preguntas || []).forEach((pr) => {
        (pr.opciones || []).forEach((op) => {
          if (
            (Array.isArray(op.asignaciones) ? op.asignaciones : []).some(
              (a) => a?.campoId === campoId
            )
          ) {
            asignaciones += 1;
          }
        });
      });
    });
    return { condiciones, asignaciones };
  };

  const agregar = () => {
    onChange(
      agregarCampoPlantilla(guion, {
        nombre: "Nuevo campo",
        orden: campos.length,
      })
    );
    if (showToast) showToast("Campo de plantilla agregado", "success");
  };

  const opcionesCampo = (campoId) =>
    todos
      .filter((c) => c && c.id !== campoId)
      .map((c) => ({
        value: c.id,
        label: c.nombre || c.id,
      }));

  const agregarCondicion = (campo) => {
    const visibleSi = [
      ...(Array.isArray(campo.visibleSi) ? campo.visibleSi : []),
      { campoId: todos.find((c) => c.id !== campo.id)?.id || "", operador: "igual", valor: "" },
    ];
    onChange(actualizarCampoPlantilla(guion, campo.id, { visibleSi }));
  };

  const actualizarCondicion = (campo, indice, cambios) => {
    const visibleSi = (Array.isArray(campo.visibleSi) ? campo.visibleSi : []).map(
      (cond, i) => (i === indice ? { ...cond, ...cambios } : cond)
    );
    onChange(actualizarCampoPlantilla(guion, campo.id, { visibleSi }));
  };

  const quitarCondicion = (campo, indice) => {
    const visibleSi = (Array.isArray(campo.visibleSi) ? campo.visibleSi : []).filter(
      (_, i) => i !== indice
    );
    onChange(actualizarCampoPlantilla(guion, campo.id, { visibleSi }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Plantilla de registro del speech
          </div>
          <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Los datos se cargan durante la llamada y se guardan en el caso
            asociado. El id interno no cambia al renombrar el campo.
          </div>
        </div>
        <Btn size="sm" icon={Plus} onClick={agregar}>
          Agregar campo
        </Btn>
      </div>

      <Field label="Nombre de la plantilla">
        <TextInput
          value={plantilla.nombre || ""}
          onChange={(e) =>
            onChange(actualizarPlantillaRegistro(guion, { nombre: e.target.value }))
          }
          placeholder="Registro de la llamada"
          aria-label="Nombre de la plantilla"
        />
      </Field>

      {campos.length === 0 ? (
        <div
          className="rounded-lg p-4 text-center text-[11px]"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px dashed var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          Todavía no hay campos en la plantilla. Podés crear los que necesites o
          seguir usando los campos por etapa de la sección “Campos”.
        </div>
      ) : (
        <div className="space-y-3">
          {campos.map((campo, k) => {
            const refs = referenciasDe(campo.id);
            const condiciones = Array.isArray(campo.visibleSi)
              ? campo.visibleSi
              : [];
            return (
              <div
                key={campo.id}
                className="rounded-lg p-3 space-y-3"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      aria-label={`Subir campo de plantilla ${k + 1}`}
                      disabled={k === 0}
                      onClick={() => onChange(moverCampoPlantilla(guion, campo.id, -1))}
                      className="p-1 rounded transition-colors hover:bg-white/5 disabled:opacity-30"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Bajar campo de plantilla ${k + 1}`}
                      disabled={k === campos.length - 1}
                      onClick={() => onChange(moverCampoPlantilla(guion, campo.id, 1))}
                      className="p-1 rounded transition-colors hover:bg-white/5 disabled:opacity-30"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <TextInput
                      value={campo.nombre || ""}
                      onChange={(e) =>
                        onChange(
                          actualizarCampoPlantilla(guion, campo.id, {
                            nombre: e.target.value,
                          })
                        )
                      }
                      placeholder="Nombre visible del campo"
                      aria-label={`Campo de plantilla ${k + 1} nombre`}
                    />
                  </div>
                  <Select
                    value={campo.tipo || "texto-corto"}
                    onChange={(e) =>
                      onChange(
                        actualizarCampoPlantilla(guion, campo.id, {
                          tipo: e.target.value,
                        })
                      )
                    }
                    options={TIPOS_CAMPO.map((t) => ({
                      value: t.tipo,
                      label: t.etiqueta,
                    }))}
                    aria-label={`Campo de plantilla ${k + 1} tipo`}
                  />
                  <label
                    className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(campo.obligatorio)}
                      onChange={(e) =>
                        onChange(
                          actualizarCampoPlantilla(guion, campo.id, {
                            obligatorio: e.target.checked,
                          })
                        )
                      }
                      aria-label={`Campo de plantilla ${k + 1} obligatorio`}
                    />
                    Obligatorio
                  </label>
                  <button
                    type="button"
                    aria-label={`Eliminar campo de plantilla ${k + 1}`}
                    onClick={() => setEliminando(campo)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {eliminando?.id === campo.id ? (
                  <div
                    role="alert"
                    className="rounded-lg p-2 text-[11px] space-y-2"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
                      border: "1px solid var(--color-danger)",
                      color: "var(--color-danger)",
                    }}
                  >
                    <div>
                      ¿Eliminar “{campo.nombre || "campo sin nombre"}”? Se quitarán{" "}
                      {refs.condiciones} condición(es) y {refs.asignaciones}{" "}
                      asociación(es) que lo referencian. Los datos ya guardados en
                      llamadas anteriores no se modifican.
                    </div>
                    <div className="flex gap-2">
                      <Btn
                        size="sm"
                        onClick={() => {
                          onChange(eliminarCampoPlantilla(guion, campo.id));
                          setEliminando(null);
                          if (showToast) {
                            showToast("Campo de plantilla eliminado", "info");
                          }
                        }}
                      >
                        Eliminar
                      </Btn>
                      <BtnOutline size="sm" onClick={() => setEliminando(null)}>
                        Cancelar
                      </BtnOutline>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Descripción / ayuda">
                      <TextInput
                        value={campo.descripcion || ""}
                        onChange={(e) =>
                          onChange(
                            actualizarCampoPlantilla(guion, campo.id, {
                              descripcion: e.target.value,
                            })
                          )
                        }
                        placeholder="Se muestra debajo del campo"
                        aria-label={`Campo de plantilla ${k + 1} descripción`}
                      />
                    </Field>
                    <Field label="Se muestra en la etapa">
                      <Select
                        value={campo.pasoId || ""}
                        onChange={(e) =>
                          onChange(
                            actualizarCampoPlantilla(guion, campo.id, {
                              pasoId: e.target.value,
                            })
                          )
                        }
                        placeholder="Global (panel Registro)"
                        options={(guion.steps || []).map((s, i) => ({
                          value: s.id,
                          label: s.titulo || `Paso ${i + 1}`,
                        }))}
                        aria-label={`Campo de plantilla ${k + 1} etapa`}
                      />
                    </Field>
                    <Field label="Valor predeterminado">
                      <TextInput
                        value={
                          campo.porDefecto === undefined || campo.porDefecto === null
                            ? ""
                            : String(campo.porDefecto)
                        }
                        onChange={(e) =>
                          onChange(
                            actualizarCampoPlantilla(guion, campo.id, {
                              porDefecto: e.target.value,
                            })
                          )
                        }
                        placeholder={
                          campo.tipo === "si-no" ? "si / no" : "Opcional"
                        }
                        aria-label={`Campo de plantilla ${k + 1} valor predeterminado`}
                      />
                    </Field>
                    <Field label="Mapear al campo del caso">
                      <Select
                        value={campo.campoDestino || ""}
                        onChange={(e) =>
                          onChange(
                            actualizarCampoPlantilla(guion, campo.id, {
                              campoDestino: e.target.value,
                            })
                          )
                        }
                        placeholder="No escribir en el caso"
                        options={CAMPOS_DESTINO_CASO.map((c) => ({
                          value: c.clave,
                          label: c.etiqueta,
                        }))}
                        aria-label={`Campo de plantilla ${k + 1} mapeo al caso`}
                      />
                    </Field>
                  </div>
                )}

                {usaOpciones(campo.tipo) ? (
                  <Field label="Opciones (una por línea)">
                    <TextArea
                      rows={2}
                      value={(Array.isArray(campo.opciones) ? campo.opciones : []).join(
                        "\n"
                      )}
                      onChange={(e) =>
                        onChange(
                          actualizarCampoPlantilla(guion, campo.id, {
                            opciones: e.target.value.split("\n"),
                          })
                        )
                      }
                      placeholder={"Opción A\nOpción B"}
                      aria-label={`Campo de plantilla ${k + 1} opciones`}
                    />
                  </Field>
                ) : null}

                {/* Condiciones genéricas: cualquier campo del registro puede
                    gobernar la visibilidad de este. Sin valores hardcodeados. */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Visible sólo si…
                    </span>
                    <BtnOutline
                      size="sm"
                      icon={Plus}
                      onClick={() => agregarCondicion(campo)}
                      disabled={opcionesCampo(campo.id).length === 0}
                      ariaLabel={`Agregar condición al campo ${k + 1}`}
                    >
                      Condición
                    </BtnOutline>
                  </div>
                  {condiciones.length === 0 ? (
                    <div
                      className="text-[10px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Sin condiciones: el campo siempre está visible (si la etapa
                      está activa).
                    </div>
                  ) : (
                    condiciones.map((cond, ci) => {
                      const operador = OPERADORES_CONDICION.find(
                        (o) => o.operador === cond.operador
                      );
                      return (
                        <div
                          key={`${campo.id}-cond-${ci}`}
                          className="flex items-center gap-1.5 flex-wrap"
                        >
                          <Select
                            value={cond.campoId || ""}
                            onChange={(e) =>
                              actualizarCondicion(campo, ci, {
                                campoId: e.target.value,
                              })
                            }
                            placeholder="Elegir campo"
                            options={opcionesCampo(campo.id)}
                            aria-label={`Campo de plantilla ${k + 1} condición ${ci + 1} campo`}
                          />
                          <Select
                            value={cond.operador || "igual"}
                            onChange={(e) =>
                              actualizarCondicion(campo, ci, {
                                operador: e.target.value,
                              })
                            }
                            options={OPERADORES_CONDICION.map((o) => ({
                              value: o.operador,
                              label: o.etiqueta,
                            }))}
                            aria-label={`Campo de plantilla ${k + 1} condición ${ci + 1} operador`}
                          />
                          {operador?.usaValor !== false ? (
                            <TextInput
                              value={cond.valor || ""}
                              onChange={(e) =>
                                actualizarCondicion(campo, ci, {
                                  valor: e.target.value,
                                })
                              }
                              placeholder="Valor"
                              aria-label={`Campo de plantilla ${k + 1} condición ${ci + 1} valor`}
                            />
                          ) : null}
                          <button
                            type="button"
                            aria-label={`Quitar condición ${ci + 1} del campo ${k + 1}`}
                            onClick={() => quitarCondicion(campo, ci)}
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {refs.condiciones || refs.asignaciones ? (
                  <div
                    className="text-[10px]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Este campo está referenciado por {refs.condiciones}{" "}
                    condición(es) y {refs.asignaciones} asociación(es).
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlantillaRegistroEditor;
