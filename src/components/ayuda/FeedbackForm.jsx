import React, { useState } from "react";
import {
  Mail,
  Send,
  AlertCircle,
  Info,
  Lightbulb,
  Bug,
  ThumbsUp,
  HelpCircle,
  ClipboardCheck,
  Check,
  Copy,
  Star,
} from "lucide-react";
import { Btn } from "../common/Btn";
import { BtnOutline } from "../common/BtnOutline";
import { TextArea } from "../common/TextArea";
import { TextInput } from "../common/TextInput";
import { sanitizeString } from "../../utils/sanitize";
import { APP_VERSION } from "../../core/version";

export function FeedbackForm({ showToast }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [puntuacion, setPuntuacion] = useState(0);
  const [categoria, setCategoria] = useState("sugerencia");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errores, setErrores] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const EMAIL_DESTINO = "yoelcallcenter@gmail.com";

  const categorias = [
    { value: "sugerencia", label: "Sugerencia", icon: Lightbulb },
    { value: "bug", label: "Reportar error", icon: Bug },
    { value: "mejora", label: "Solicitar mejora", icon: ThumbsUp },
    { value: "consulta", label: "Consulta", icon: HelpCircle },
    { value: "otro", label: "Otro", icon: ClipboardCheck },
  ];

  const puntuaciones = [
    { value: 1, label: "Muy malo" },
    { value: 2, label: "Malo" },
    { value: 3, label: "Regular" },
    { value: 4, label: "Bueno" },
    { value: 5, label: "Excelente" },
  ];

  const validar = () => {
    const nuevosErrores = [];
    if (!mensaje.trim()) {
      nuevosErrores.push("El mensaje es requerido");
    } else if (mensaje.trim().length < 10) {
      nuevosErrores.push("El mensaje debe tener al menos 10 caracteres");
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nuevosErrores.push("El email no es valido");
    }
    setErrores(nuevosErrores);
    return nuevosErrores.length === 0;
  };

  const copiarAlPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);

    const sanitizedNombre = sanitizeString(nombre.trim()) || "Usuario anonimo";
    const sanitizedMensaje = sanitizeString(mensaje.trim());
    const sanitizedEmail = email.trim() || "no-responder@local.com";

    const categoriaLabel =
      categorias.find((c) => c.value === categoria)?.label || categoria;

    const puntuacionLabel =
      puntuacion > 0
        ? `${puntuacion} estrellas - ${
            puntuaciones.find((p) => p.value === puntuacion)?.label || ""
          }`
        : "No especificada";

    const asunto = `[Feedback] ${categoriaLabel} - ${sanitizedNombre}`;
    const cuerpo = `
============================================
FEEDBACK - APPSEGUIMIENTO
============================================

INFORMACION DEL USUARIO
─────────────────────────────────────────────
Nombre: ${sanitizedNombre}
Email: ${sanitizedEmail}
Categoria: ${categoriaLabel}
Puntuacion: ${puntuacionLabel}

MENSAJE
─────────────────────────────────────────────
${sanitizedMensaje}

INFORMACION TECNICA
─────────────────────────────────────────────
Fecha: ${new Date().toLocaleString("es-AR")}
Aplicacion: AppSeguimiento
Version: ${APP_VERSION}
Navegador: ${navigator.userAgent}

============================================
`;

    try {
      localStorage.setItem(
        "feedback-backup",
        JSON.stringify({
          nombre: sanitizedNombre,
          email: sanitizedEmail,
          categoria: categoriaLabel,
          puntuacion: puntuacion,
          mensaje: sanitizedMensaje,
          fecha: new Date().toISOString(),
        })
      );

      const mailtoLink = `mailto:${EMAIL_DESTINO}?subject=${encodeURIComponent(
        asunto
      )}&body=${encodeURIComponent(cuerpo)}${
        sanitizedEmail ? `&reply-to=${encodeURIComponent(sanitizedEmail)}` : ''
      }`;

      window.location.href = mailtoLink;
      showToast("Correo preparado en tu cliente de correo.", "success");

      setEnviado(true);
      setEnviando(false);
    } catch (error) {
      showToast(
        "Error al preparar el correo. Intenta de nuevo.",
        "error"
      );
      setEnviando(false);
    }
  };

  const copiarEmailDestino = () => {
    copiarAlPortapapeles(EMAIL_DESTINO);
    showToast("Email copiado al portapapeles", "success");
  };

  if (enviado) {
    return (
      <div className="text-center py-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "var(--color-success)22" }}
        >
          <Check size={36} color="var(--color-success)" />
        </div>
        <div
          className="text-lg font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Gracias por tu feedback
        </div>
        <div
          className="text-sm mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          {copiado
            ? "El mensaje se ha copiado al portapapeles."
            : "Se ha abierto tu cliente de correo."}
        </div>
        <div
          className="text-sm mt-2 flex items-center justify-center gap-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span
            className="font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            Destinatario:
          </span>
          <button
            onClick={copiarEmailDestino}
            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-accent)" }}
          >
            {EMAIL_DESTINO}
            <Copy size={12} />
          </button>
        </div>
        <div
          className="text-xs mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          {copiado
            ? "Pega el contenido en tu cliente de correo y envialo a " +
              EMAIL_DESTINO
            : "Solo falta hacer clic en Enviar desde tu cliente de correo."}
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => {
              setEnviado(false);
              setMensaje("");
              setPuntuacion(0);
              setCopiado(false);
            }}
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-accent)" }}
          >
            Enviar otro feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail size={16} color="var(--color-accent)" />
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Enviar feedback
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Tus sugerencias nos ayudan a mejorar
        </span>
      </div>

      {errores.length > 0 && (
        <div
          className="rounded-md p-3"
          style={{
            backgroundColor: "var(--color-danger)22",
            border: "1px solid var(--color-danger)55",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              size={16}
              color="var(--color-danger)"
              className="flex-shrink-0 mt-0.5"
            />
            <div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--color-danger)" }}
              >
                Por favor, corrige los siguientes errores:
              </div>
              <ul
                className="text-xs mt-1"
                style={{ color: "var(--color-danger)" }}
              >
                {errores.map((err, i) => (
                  <li key={i}>- {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label
              className="text-xs font-medium mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              Tu nombre{" "}
              <span
                className="text-[10px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                (opcional)
              </span>
            </label>
            <TextInput
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Perez"
              className="w-full"
            />
          </div>
          <div>
            <label
              className="text-xs font-medium mb-1 block"
              style={{ color: "var(--color-text-muted)" }}
            >
              Tu email{" "}
              <span
                className="text-[10px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                (opcional)
              </span>
            </label>
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: juan@email.com"
              className="w-full"
              type="email"
            />
          </div>
        </div>

        <div>
          <label
            className="text-xs font-medium mb-1 block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Categoria
          </label>
          <div className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoria(c.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.02] ${
                  categoria === c.value
                    ? "bg-[var(--color-accent)] text-[#14181F]"
                    : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <c.icon size={13} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            className="text-xs font-medium mb-1 block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Puntuacion
          </label>
          <div className="flex flex-wrap gap-2">
            {puntuaciones.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPuntuacion(p.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.02] ${
                  puntuacion === p.value
                    ? "bg-[var(--color-accent)] text-[#14181F]"
                    : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                }`}
              >
                <Star
                  size={13}
                  fill={puntuacion >= p.value ? "currentColor" : "none"}
                />
                {p.label}
              </button>
            ))}
            {puntuacion > 0 && (
              <span
                className="text-xs self-center"
                style={{ color: "var(--color-accent)" }}
              >
                {Array.from({ length: puntuacion }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill="currentColor"
                    className="inline"
                  />
                ))}
                {Array.from({ length: 5 - puntuacion }, (_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className="inline"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                ))}
              </span>
            )}
          </div>
        </div>

        <div>
          <label
            className="text-xs font-medium mb-1 block"
            style={{ color: "var(--color-text-muted)" }}
          >
            Mensaje <span className="text-[var(--color-danger)]">*</span>
          </label>
          <TextArea
            rows={4}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Contanos tu experiencia, sugerencias o reporta algun error..."
            className="w-full"
            required
          />
          <div
            className="flex justify-between text-[10px] mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span>{mensaje.length} caracteres</span>
            {mensaje.length > 0 && mensaje.length < 10 && (
              <span style={{ color: "var(--color-warning)" }}>
                Minimo 10 caracteres
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Btn
            type="submit"
            icon={Send}
            size="sm"
            disabled={enviando || !mensaje.trim()}
          >
            {enviando ? "Preparando..." : "Enviar feedback"}
          </Btn>
          <BtnOutline
            type="button"
            onClick={() => {
              setNombre("");
              setEmail("");
              setMensaje("");
              setPuntuacion(0);
              setCategoria("sugerencia");
              setErrores([]);
            }}
            color="var(--color-text-muted)"
            size="sm"
          >
            Limpiar
          </BtnOutline>
        </div>

        <div
          className="rounded-md p-2.5 flex items-start gap-2"
          style={{
            backgroundColor: "var(--color-accent)11",
            border: "1px solid var(--color-accent)33",
          }}
        >
          <Info
            size={14}
            color="var(--color-accent)"
            className="flex-shrink-0 mt-0.5"
          />
          <div className="text-[10px]" style={{ color: "var(--color-text)" }}>
            <span
              className="font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              Como funciona?
            </span>
            <br />
            Al enviar, se abrira tu cliente de correo con el mensaje preparado
            para <strong>{EMAIL_DESTINO}</strong>. Si no puedes enviar correo,
            el mensaje se copiara al portapapeles automaticamente.
          </div>
        </div>
      </form>
    </div>
  );
}
