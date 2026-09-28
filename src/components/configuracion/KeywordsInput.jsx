import React, { useEffect, useState } from "react";
import { TextInput } from "../common/TextInput";

const normalizar = (texto) =>
  texto.split(",").map((k) => k.trim()).filter(Boolean);

export function KeywordsInput({ value, onCommit, className, placeholder, ariaLabel }) {
  const lista = Array.isArray(value) ? value : [];
  const texto = lista.join(", ");
  const [draft, setDraft] = useState(texto);
  const [foco, setFoco] = useState(false);

  useEffect(() => {
    if (!foco) setDraft(texto);
  }, [texto, foco]);

  const onBlur = () => {
    const siguiente = normalizar(draft);
    setFoco(false);
    setDraft(siguiente.join(", "));
    if (JSON.stringify(siguiente) !== JSON.stringify(lista)) {
      onCommit(siguiente);
    }
  };

  return (
    <TextInput
      value={draft}
      onChange={(ev) => setDraft(ev.target.value)}
      onFocus={() => setFoco(true)}
      onBlur={onBlur}
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
}

export default KeywordsInput;
