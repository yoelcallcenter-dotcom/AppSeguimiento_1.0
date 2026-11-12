/**
 * RunnerPaneles.jsx (Release 1.11.0)
 * Componentes de apoyo del modo ejecución del Asistente Interactivo de
 * Llamadas:
 *
 * - CampoRegistro: renderizador ÚNICO de los 8 tipos de campo de registro
 *   (§3). Lo comparten el área principal del runner y el Resumen para que un
 *   campo se vea y se comporte igual esté donde esté (consistencia §6).
 * - PanelObjeciones: módulo transversal permanente (§2.4) con búsqueda,
 *   copiar y retorno al recorrido. Cada objeción copiada queda registrada
 *   como "consultada" para el resumen de la llamada.
 * - PanelResumen: resumen EDITABLE de la llamada en memoria (§3): campos por
 *   etapa, notas, objeciones consultadas y estado final. El registro de la
 *   llamada vive SOLO en memoria durante la llamada (decisión de producto de
 *   la 1.11.0: no se persiste histórico de llamadas), por eso el panel
 *   escribe directo sobre el estado del runner y todo desaparece al cerrar.
 *
 * Los paneles usan SidePanel (z-notification 110), que queda por encima del
 * Modal del runner (z-modal 50). Los ConfirmDialog del runner (z-submodal 60)
 * siempre se abren con el panel cerrado para no quedar debajo de él.
 */
import React, { useMemo, useState } from "react";
import { BookOpen, ClipboardList, ArrowLeft, Copy, Check } from "lucide-react";
import { SidePanel } from "../../common/SidePanel";
import { Btn } from "../../common/Btn";
import { BtnOutline } from "../../common/BtnOutline";
import { Field } from "../../common/Field";
import { TextInput } from "../../common/TextInput";
import { TextArea } from "../../common/TextArea";
import { Select } from "../../common/Select";
import { MultiSelect } from "../../common/MultiSelect";
import { SearchInput } from "../../common/SearchInput";
import { useClipboard } from "../../../hooks/useClipboard";
import { normalizarTexto } from "../../../utils/helpers";

/**
 * CampoRegistro — un solo componente para los 8 tipos (§3). Recibe el campo
 * definido en el guion, el valor actual del registro de la llamada y el
 * callback onChange(valor). "si-no" se almacena como "si" | "no" | "" y
 * "seleccion-multiple" como array de strings (mismas convenciones que
 * camposObligatoriosPendientes del modelo, para que el gate de
 * obligatorios coincida exactamente con lo que se pinta acá).
 */
function CampoRegistroControl({ campo, value, onChange }) {
  if (!campo) return null;
  const etiqueta = campo.nombre || "(campo sin nombre)";
  const opcionesSel = (Array.isArray(campo.opciones) ? campo.opciones : [])
    .filter(Boolean)
    .map((o) => ({ value: o, label: o }));

  // Selección única: Select de componentes comunes con placeholder para
  // distinguir "sin responder" (importa para el gate de obligatorios).
  if (campo.tipo === "seleccion-unica") {
    return (
      <Select
        label={etiqueta}
        id={`campo-${campo.id}`}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange?.(e.target.value)}
        options={opcionesSel}
        placeholder="Sin responder"
      />
    );
  }

  // Selección múltiple: MultiSelect (su botón toma el nombre accesible del
  // label vía aria-labelledby).
  if (campo.tipo === "seleccion-multiple") {
    return (
      <MultiSelect
        id={`campo-${campo.id}`}
        label={etiqueta}
        options={opcionesSel}
        value={Array.isArray(value) ? value : []}
        onChange={(v) => onChange?.(v)}
        placeholder="Sin seleccionar"
      />
    );
  }

  // Sí / No: radio buttons nativos agrupados (accesibles por nombre y
  // agrupables con role="radiogroup" en los tests).
  if (campo.tipo === "si-no") {
    const actual = value === "si" || value === "no" ? value : "";
    return (
      <div className="flex flex-col gap-1">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {etiqueta}
        </span>
        <div role="radiogroup" aria-label={etiqueta} className="flex items-center gap-4">
          {[
            { v: "si", t: "Sí" },
            { v: "no", t: "No" },
          ].map((opt) => (
            <label
              key={opt.v}
              className="flex items-center gap-1.5 text-sm cursor-pointer"
              style={{ color: "var(--color-text)" }}
            >
              <input
                type="radio"
                name={`sino-${campo.id}`}
                value={opt.v}
                checked={actual === opt.v}
                onChange={() => onChange?.(opt.v)}
              />
              {opt.t}
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Texto largo y observaciones: TextArea multilínea con auto-altura.
  if (campo.tipo === "texto-largo" || campo.tipo === "observaciones") {
    return (
      <Field label={etiqueta} className="sm:col-span-2">
        <TextArea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={
            campo.tipo === "observaciones" ? "Observaciones de la llamada..." : "Texto largo..."
          }
        />
      </Field>
    );
  }

  // Fecha y hora: inputs nativos (mismo estilo input-optimized que el resto).
  if (campo.tipo === "fecha" || campo.tipo === "hora") {
    return (
      <Field label={etiqueta}>
        <TextInput
          type={campo.tipo === "fecha" ? "date" : "time"}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </Field>
    );
  }

  // Número (1.11.3): se guarda como string para no romper el registro JSON y
  // permitir el estado "sin responder" (""), que es distinto de 0.
  if (campo.tipo === "numero") {
    return (
      <Field label={etiqueta}>
        <TextInput
          type="number"
          inputMode="decimal"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Número..."
        />
      </Field>
    );
  }

  // Casilla (1.11.3): booleano real. "Sin marcar" cuenta como vacío en el
  // gate, así que una casilla obligatoria exige marcarla.
  if (campo.tipo === "casilla") {
    return (
      <label
        className="flex items-start gap-2 text-sm cursor-pointer"
        style={{ color: "var(--color-text)" }}
      >
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange?.(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        <span>{etiqueta}</span>
      </label>
    );
  }

  // Texto corto (y cualquier tipo desconocido: se degrada a texto corto para
  // no perder lo que el operador haya escrito).
  return (
    <Field label={etiqueta}>
      <TextInput
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Respuesta del trabajador..."
      />
    </Field>
  );
}

/**
 * Envoltorio de CampoRegistro: agrega ayuda y marca de obligatorio sin
 * duplicar el render de cada tipo. Los tipos multilínea ocupan las dos
 * columnas de la grilla igual que antes.
 */
export function CampoRegistro(props) {
  const { campo } = props;
  if (!campo) return null;
  const ancho =
    campo.tipo === "texto-largo" || campo.tipo === "observaciones"
      ? "sm:col-span-2"
      : "";
  return (
    <div className={`space-y-1 ${ancho}`}>
      <CampoRegistroControl {...props} />
      {campo.obligatorio ? (
        <div
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-warning)" }}
        >
          Obligatorio
        </div>
      ) : null}
      {campo.descripcion ? (
        <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {campo.descripcion}
        </div>
      ) : null}
    </div>
  );
}

/**
 * PanelObjeciones — módulo transversal permanente (§2.4). Búsqueda por
 * título/contenido, botón de copiar por objeción y retorno al recorrido
 * (botón "Volver a la llamada" y cierre con Escape/X del SidePanel).
 * onCopiada(id) avisa al runner para sumar la objeción a "consultadas".
 */
export function PanelObjeciones({ open, onClose, objeciones = [], consultadas = [], onCopiada }) {
  const [busqueda, setBusqueda] = useState("");
  const { copiar, copiado } = useClipboard();
  const [ultima, setUltima] = useState(null);

  const lista = useMemo(() => {
    const base = Array.isArray(objeciones) ? objeciones.filter(Boolean) : [];
    const q = normalizarTexto(busqueda);
    if (!q) return base;
    return base.filter(
      (o) => normalizarTexto(o.titulo).includes(q) || normalizarTexto(o.contenido).includes(q)
    );
  }, [objeciones, busqueda]);

  const copiarObjecion = (o) => {
    const texto = [o.titulo, o.contenido].filter(Boolean).join("\n");
    setUltima(o.id);
    copiar(texto);
    onCopiada?.(o.id);
  };

  return (
    <SidePanel
      isOpen={open}
      onClose={onClose}
      title="Objeciones"
      icon={BookOpen}
      subheader={
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <SearchInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar objeción..."
            aria-label="Buscar objeción"
          />
        </div>
      }
      footer={
        <div
          className="px-4 py-3 border-t flex justify-end"
          style={{ borderColor: "var(--color-border)" }}
        >
          <BtnOutline size="sm" icon={ArrowLeft} onClick={onClose}>
            Volver a la llamada
          </BtnOutline>
        </div>
      }
    >
      <div className="p-4 space-y-3">
        {lista.length === 0 ? (
          <div className="text-sm text-center py-6" style={{ color: "var(--color-text-muted)" }}>
            No hay objeciones que coincidan con la búsqueda.
          </div>
        ) : (
          lista.map((o) => (
            <div
              key={o.id}
              className="rounded-lg p-3 space-y-2"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {o.titulo || "(sin título)"}
                </div>
                {consultadas.includes(o.id) ? (
                  <span
                    className="pill-sm font-bold flex-shrink-0"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
                      color: "var(--color-success)",
                    }}
                  >
                    CONSULTADA
                  </span>
                ) : null}
              </div>
              <div
                className="text-xs whitespace-pre-wrap"
                style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}
              >
                {o.contenido}
              </div>
              <Btn
                size="sm"
                variant="outline"
                icon={copiado && ultima === o.id ? Check : Copy}
                ariaLabel={`Copiar objeción: ${o.titulo || "(sin título)"}`}
                onClick={() => copiarObjecion(o)}
              >
                {copiado && ultima === o.id ? "Copiada" : "Copiar"}
              </Btn>
            </div>
          ))
        )}
      </div>
    </SidePanel>
  );
}

/**
 * PanelRegistro — panel lateral de la plantilla de registro (1.11.3).
 * Muestra TODOS los campos visibles (plantilla + etapas), distingue dato
 * automático de manual, calcula completitud y avisa por obligatorios
 * pendientes y por datos manuales que quedaron ocultos por una condición.
 * El speech de la etapa sigue teniendo prioridad visual: este panel se abre
 * a demanda y nunca reemplaza el área central.
 */
export function PanelRegistro({
  open,
  onClose,
  campos = [],
  visibilidad = {},
  registro = {},
  origen = {},
  incompatibles = [],
  onChangeCampo,
  validacion = { completos: 0, total: 0, porcentaje: 100, pendientes: [] },
}) {
  const visibles = (Array.isArray(campos) ? campos : []).filter(
    (c) => c && c.id && visibilidad[c.id] !== false
  );
  const ocultosManuales = (Array.isArray(campos) ? campos : []).filter(
    (c) => c && incompatibles.includes(c.id)
  );
  return (
    <SidePanel
      isOpen={open}
      onClose={onClose}
      title="Registro de la llamada"
      icon={ClipboardList}
      footer={
        <div
          className="px-4 py-3 border-t flex justify-end"
          style={{ borderColor: "var(--color-border)" }}
        >
          <BtnOutline size="sm" icon={ArrowLeft} onClick={onClose}>
            Volver a la llamada
          </BtnOutline>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--color-text-muted)" }}>Completitud</span>
            <span className="font-bold" style={{ color: "var(--color-text)" }}>
              {validacion.completos}/{validacion.total} · {validacion.porcentaje}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={validacion.porcentaje}
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${validacion.porcentaje}%`,
                backgroundColor:
                  validacion.porcentaje === 100
                    ? "var(--color-success)"
                    : "var(--color-accent)",
              }}
            />
          </div>
        </div>

        {validacion.pendientes.length ? (
          <div
            role="alert"
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-danger) 6.7%, transparent)",
              border: "1px solid var(--color-danger)",
              color: "var(--color-danger)",
            }}
          >
            Faltan obligatorios:{" "}
            {validacion.pendientes.map((c) => c.nombre || c.id).join(", ")}.
          </div>
        ) : null}

        {ocultosManuales.length ? (
          <div
            role="status"
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-warning) 6.7%, transparent)",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
            }}
          >
            Estos datos escritos a mano ya no corresponden al recorrido actual y
            se conservan hasta que los revises:{" "}
            {ocultosManuales.map((c) => c.nombre || c.id).join(", ")}.
          </div>
        ) : null}

        {visibles.length ? (
          visibles.map((c) => (
            <div
              key={c.id}
              className="rounded-lg p-3 space-y-2"
              style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <CampoRegistro
                campo={c}
                value={registro[c.id]}
                onChange={(v) => onChangeCampo?.(c.id, v)}
              />
              <div className="flex items-center justify-between gap-2">
                <span
                  className="pill-sm font-bold"
                  style={
                    origen[c.id] === "auto"
                      ? {
                          backgroundColor:
                            "color-mix(in srgb, var(--color-accent) 13.3%, transparent)",
                          color: "var(--color-accent)",
                        }
                      : {
                          backgroundColor:
                            "color-mix(in srgb, var(--color-text-muted) 13.3%, transparent)",
                          color: "var(--color-text-muted)",
                        }
                  }
                >
                  {origen[c.id] === "auto" ? "AUTOMÁTICO" : "MANUAL"}
                </span>
                {c.pasoId ? (
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    Asociado a una etapa
                  </span>
                ) : (
                  <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    Global
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            Esta llamada no tiene campos de registro.
          </div>
        )}
      </div>
    </SidePanel>
  );
}

/**
 * PanelResumen — resumen editable de la llamada (§3). Agrupa los campos de
 * registro por etapa en el ORDEN del guion, permite editarlos (mismo valor
 * que el área principal: un solo registro compartido), muestra las notas,
 * las objeciones consultadas y, si la llamada se finalizó, el estado final.
 */
export function PanelResumen({
  open,
  onClose,
  speech,
  registro = {},
  onChangeCampo,
  notas = "",
  onChangeNotas,
  consultadas = [],
  objeciones = [],
  finalizada = false,
  estadoFinalNombre = "",
}) {
  const steps = Array.isArray(speech?.steps) ? speech.steps : [];
  const hayCampos = steps.some(
    (p) => Array.isArray(p?.camposRegistro) && p.camposRegistro.length > 0
  );
  const consultadasDetalle = consultadas
    .map((id) => objeciones.find((o) => o && o.id === id))
    .filter(Boolean);

  return (
    <SidePanel
      isOpen={open}
      onClose={onClose}
      title="Resumen de la llamada"
      icon={ClipboardList}
      footer={
        <div
          className="px-4 py-3 border-t flex justify-end"
          style={{ borderColor: "var(--color-border)" }}
        >
          <BtnOutline size="sm" icon={ArrowLeft} onClick={onClose}>
            Volver a la llamada
          </BtnOutline>
        </div>
      }
    >
      <div className="p-4 space-y-5">
        {finalizada ? (
          <div
            className="rounded-lg px-3 py-2 text-sm font-semibold text-center"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-success) 13.3%, transparent)",
              color: "var(--color-success)",
            }}
          >
            Llamada finalizada
            {estadoFinalNombre ? ` · ${estadoFinalNombre}` : ""}
          </div>
        ) : null}

        {/* Campos agrupados por etapa, en orden del guion. */}
        {hayCampos ? (
          steps.map((paso, i) => {
            const campos = Array.isArray(paso?.camposRegistro) ? paso.camposRegistro : [];
            if (!campos.length) return null;
            return (
              <section key={paso.id} className="space-y-3">
                <h3
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-accent)" }}
                >
                  Etapa {i + 1}: {paso.titulo || "(sin título)"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {campos.map((c) => (
                    <CampoRegistro
                      key={c.id}
                      campo={c}
                      value={registro[c.id]}
                      onChange={(v) => onChangeCampo?.(c.id, v)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            Este guion no tiene campos de registro.
          </div>
        )}

        <section className="space-y-2">
          <h3
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Notas
          </h3>
          <TextArea
            value={notas}
            onChange={(e) => onChangeNotas?.(e.target.value)}
            placeholder="Notas de la llamada (en memoria, no se guardan)..."
            aria-label="Notas de la llamada"
          />
        </section>

        <section className="space-y-2">
          <h3
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Objeciones consultadas
          </h3>
          {consultadasDetalle.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Ninguna todavía.
            </div>
          ) : (
            <ul className="space-y-1">
              {consultadasDetalle.map((o) => (
                <li
                  key={o.id}
                  className="text-sm flex items-start gap-2"
                  style={{ color: "var(--color-text)" }}
                >
                  <Check
                    size={14}
                    className="flex-shrink-0"
                    style={{ color: "var(--color-success)", marginTop: 3 }}
                  />
                  {o.titulo || "(sin título)"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SidePanel>
  );
}

export default PanelResumen;
