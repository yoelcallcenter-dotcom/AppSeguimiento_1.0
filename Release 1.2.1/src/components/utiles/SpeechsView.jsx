import React, { useState, useMemo, useEffect } from "react";
import { soundSystem } from "../../core/notifications/soundSystem";
import {
  Plus,
  FileText,
  Upload,
  Trash2,
  Search,
  Grid,
  List,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Maximize2,
  X,
  Type,
  Pencil,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextInput } from "../common/TextInput";
import { TextArea } from "../common/TextArea";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { sanitizeString } from "../../utils/sanitize";
import { hoyISO } from "../../utils/dateUtils";

export function SpeechsView({ speechs, setSpeechs, showToast }) {
  const [nuevo, setNuevo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState("grid");
  const [orden, setOrden] = useState("asc");
  const [copiadoIdx, setCopiadoIdx] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [speechSeleccionado, setSpeechSeleccionado] = useState(null);
  const [modalBorrador, setModalBorrador] = useState(null);
  const [tamanoLetra, setTamanoLetra] = useState(
    () => localStorage.getItem("speech-font-size") || "medium"
  );

  useEffect(
    () => localStorage.setItem("speech-font-size", tamanoLetra),
    [tamanoLetra]
  );

  const tamaños = [
    { value: "small", label: "Pequeno", class: "text-xs" },
    { value: "medium", label: "Mediano", class: "text-sm" },
    { value: "large", label: "Grande", class: "text-base" },
  ];

  const speechsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return speechs;
    const q = busqueda.trim().toLowerCase();
    return speechs.filter((s) => s.toLowerCase().includes(q));
  }, [speechs, busqueda]);

  const speechsOrdenados = useMemo(() => {
    const sorted = [...speechsFiltrados];
    return orden === "asc"
      ? sorted.sort((a, b) => a.localeCompare(b))
      : sorted.sort((a, b) => b.localeCompare(a));
  }, [speechsFiltrados, orden]);

  const agregar = () => {
    const sanitized = sanitizeString(nuevo.trim());
    if (!sanitized) return;
    setSpeechs([...speechs, `SPEECH V.${speechs.length + 1}: ${sanitized}`]);
    setNuevo("");
    showToast("Speech agregado", "success");
  };

  const eliminar = (idx) => {
    setSpeechs(speechs.filter((_, i) => i !== idx));
    setConfirmEliminar(null);
    showToast("Speech eliminado", "info");
  };

  const editar = (idx, valor) => {
    const sanitized = sanitizeString(valor);
    setSpeechs(speechs.map((s, i) => (i === idx ? sanitized : s)));
    setSpeechSeleccionado(null);
    showToast("Speech editado", "success");
  };

  const copiar = async (texto, idx) => {
    try {
      const contenido = texto.replace(/^SPEECH V\.\d+: /, "");
      await navigator.clipboard.writeText(contenido);
      setCopiadoIdx(idx);
      setTimeout(() => setCopiadoIdx(null), 1600);
      soundSystem.playAction("copy");
      showToast("Copiado al portapapeles", "success");
    } catch {
      alert("No se pudo copiar.");
    }
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(speechs, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speechs_${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exportacion completada", "success");
  };

  const importar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const sanitized = arr.map((s) => sanitizeString(s));
        setSpeechs([...speechs, ...sanitized]);
        showToast(`${sanitized.length} speechs importados`, "success");
      } catch {
        alert("El archivo no es un JSON valido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const extraerSpeechInfo = (texto) => {
    const match = texto.match(/^SPEECH V\.(\d+):\s*(.*)/);
    return match
      ? { numero: parseInt(match[1]), contenido: match[2] }
      : { numero: null, contenido: texto };
  };

  const getFontSizeClass = () => {
    switch (tamanoLetra) {
      case "small":
        return "text-xs";
      case "large":
        return "text-base";
      default:
        return "text-sm";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar speech..."
            className="pl-8"
          />
        </div>

        <div
          className="flex items-center gap-1"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "6px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setVista("grid")}
            className={`p-1.5 rounded transition-colors ${
              vista === "grid"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setVista("list")}
            className={`p-1.5 rounded transition-colors ${
              vista === "list"
                ? "bg-[var(--color-accent)] text-[#14181F]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <List size={16} />
          </button>
        </div>

        <button
          onClick={() => setOrden(orden === "asc" ? "desc" : "asc")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors hover:bg-white/5"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {orden === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
          {orden === "asc" ? "A-Z" : "Z-A"}
        </button>

        <div
          className="flex items-center gap-1"
          style={{
            backgroundColor: "var(--color-surface)",
            borderRadius: "6px",
            padding: "2px",
            border: "1px solid var(--color-border)",
          }}
        >
          <Type
            size={14}
            style={{ color: "var(--color-text-muted)", marginLeft: "4px" }}
          />
          {tamaños.map((t) => (
            <button
              key={t.value}
              onClick={() => setTamanoLetra(t.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                tamanoLetra === t.value
                  ? "bg-[var(--color-accent)] text-[#14181F]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <BtnOutline
          onClick={exportar}
          icon={FileText}
          size="sm"
          color="var(--color-accent)"
        >
          Exportar
        </BtnOutline>
        <label
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors hover:opacity-70"
          style={{
            backgroundColor: "transparent",
            border: "1px solid var(--color-accent)",
            color: "var(--color-accent)",
          }}
        >
          <Upload size={13} /> Importar
          <input
            type="file"
            accept=".json,application/json"
            onChange={importar}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TextArea
          rows={2}
          className="flex-1 min-w-[200px]"
          placeholder="Escribe un nuevo speech..."
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <Btn onClick={agregar} icon={Plus} size="sm">
          Agregar
        </Btn>
      </div>

      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {speechsOrdenados.length} speech
        {speechsOrdenados.length !== 1 ? "s" : ""}
        {busqueda && ` (filtrados de ${speechs.length})`}
      </div>

      {vista === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {speechsOrdenados.map((s, i) => {
            const info = extraerSpeechInfo(s);
            const idx = speechs.indexOf(s);
            const isCopied = copiadoIdx === idx;
            const fontSizeClass = getFontSizeClass();

            return (
              <div
                key={idx}
                className="rounded-lg p-3 transition-all hover:shadow-lg cursor-pointer group"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--color-accent)22",
                        color: "var(--color-accent)",
                      }}
                    >
                      V.{info.numero || idx + 1}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copiar(s, idx);
                      }}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{
                        color: isCopied
                          ? "var(--color-success)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmEliminar(idx);
                      }}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpeechSeleccionado({ speech: s, index: idx });
                      }}
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>

                <div
                  className={`whitespace-pre-wrap ${fontSizeClass}`}
                  style={{ color: "var(--color-text)" }}
                  onClick={() =>
                    setSpeechSeleccionado({ speech: s, index: idx })
                  }
                >
                  {info.contenido || s}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--color-surface)" }}>
                <th
                  className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)", width: 80 }}
                >
                  #
                </th>
                <th
                  className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Contenido
                </th>
                <th
                  className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)", width: 140 }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {speechsOrdenados.map((s, i) => {
                const info = extraerSpeechInfo(s);
                const idx = speechs.indexOf(s);
                const fontSizeClass = getFontSizeClass();
                return (
                  <tr
                    key={idx}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor:
                        i % 2
                          ? "var(--color-surface2)"
                          : "var(--color-surface3)",
                      borderTop: "1px solid var(--color-border)",
                    }}
                    onClick={() =>
                      setSpeechSeleccionado({ speech: s, index: idx })
                    }
                  >
                    <td
                      className="px-3 py-2 text-xs font-bold"
                      style={{ color: "var(--color-accent)" }}
                    >
                      V.{info.numero || idx + 1}
                    </td>
                    <td
                      className={`px-3 py-2 truncate max-w-[300px] ${fontSizeClass}`}
                      style={{ color: "var(--color-text)" }}
                    >
                      {info.contenido || s}
                    </td>
                    <td className="px-3 py-2">
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => copiar(s, idx)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          style={{
                            color:
                              copiadoIdx === idx
                                ? "var(--color-success)"
                                : "var(--color-text-muted)",
                          }}
                        >
                          {copiadoIdx === idx ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmEliminar(idx)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-danger)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setSpeechSeleccionado({ speech: s, index: idx })
                          }
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {speechsOrdenados.length === 0 && (
        <div
          className="text-sm py-8 text-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          {busqueda
            ? "No hay speechs que coincidan con la busqueda."
            : "No hay speechs cargados. Agrega uno arriba."}
        </div>
      )}

      <ConfirmDialog
        open={confirmEliminar !== null}
        title="Eliminar speech"
        message="Seguro que quieres eliminar este speech?"
        confirmLabel="Eliminar"
        confirmColor="var(--color-danger)"
        onCancel={() => setConfirmEliminar(null)}
        onConfirm={() => eliminar(confirmEliminar)}
      />

      {speechSeleccionado && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: "rgba(0,0,0,0.85)",
            margin: 0,
            padding: '1rem',
          }}
          onClick={() => setSpeechSeleccionado(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl rounded-xl p-6 max-h-[80vh] flex flex-col"
            style={{
              backgroundColor: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between mb-4 pb-3"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="text-lg font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Speech Completo
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-accent)22",
                    color: "var(--color-accent)",
                  }}
                >
                  {extraerSpeechInfo(speechSeleccionado.speech).numero
                    ? `V.${extraerSpeechInfo(speechSeleccionado.speech).numero}`
                    : `#${speechSeleccionado.index + 1}`}
                </span>
              </div>
              <button
                onClick={() => setSpeechSeleccionado(null)}
                className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Type size={14} style={{ color: "var(--color-text-muted)" }} />
              <span
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                Tamano:
              </span>
              {tamaños.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTamanoLetra(t.value)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    tamanoLetra === t.value
                      ? "bg-[var(--color-accent)] text-[#14181F]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() =>
                  setModalBorrador(modalBorrador === null ? speechSeleccionado.speech : null)
                }
                className={`ml-auto p-1.5 rounded-md transition-colors ${
                  modalBorrador !== null
                    ? "bg-[var(--color-accent)22]"
                    : "hover:bg-white/5"
                }`}
                style={{
                  color:
                    modalBorrador !== null
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                }}
                title="Editar speech"
                aria-label="Editar speech"
              >
                <Pencil size={16} />
              </button>
            </div>

            {modalBorrador !== null ? (
              <TextArea
                rows={8}
                value={modalBorrador}
                onChange={(e) => setModalBorrador(e.target.value)}
                className="w-full"
              />
            ) : (
              <div
                className={`flex-1 overflow-y-auto p-4 rounded-lg whitespace-pre-wrap ${
                  tamaños.find((t) => t.value === tamanoLetra)?.class
                }`}
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  lineHeight: "1.8",
                  maxHeight: "50vh",
                }}
              >
                {speechSeleccionado.speech}
              </div>
            )}

            <div
              className="flex items-center justify-end gap-2 mt-4 pt-3"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              {modalBorrador !== null ? (
                <>
                  <button
                    onClick={() => {
                      editar(speechSeleccionado.index, modalBorrador);
                      soundSystem.playAction('save');
                      setModalBorrador(null);
                      setSpeechSeleccionado(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--color-success)",
                      color: "#fff",
                    }}
                  >
                    <Check size={14} /> Guardar cambios
                  </button>
                  <BtnOutline
                    onClick={() => setModalBorrador(null)}
                    color="var(--color-text-muted)"
                    size="sm"
                  >
                    Cancelar
                  </BtnOutline>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      copiar(speechSeleccionado.speech, speechSeleccionado.index)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--color-success)",
                      color: "#fff",
                    }}
                  >
                    <Copy size={14} /> Copiar
                  </button>
                  <BtnOutline
                    onClick={() => setSpeechSeleccionado(null)}
                    color="var(--color-text-muted)"
                    size="sm"
                  >
                    Cerrar
                  </BtnOutline>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
