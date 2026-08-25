import React, { useRef, useEffect } from "react";
import { sanitizeString } from "../../utils/sanitize";

export function TextArea({ onBlur, className = "", style = {}, ...props }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [props.value]);

  const handleChange = (e) => {
    const sanitized = sanitizeString(e.target.value);
    props.onChange &&
      props.onChange({ ...e, target: { ...e.target, value: sanitized } });
  };

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onChange={handleChange}
      className={`input-optimized resize-none overflow-hidden min-h-[3rem] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] ${className}`}
      style={style}
    />
  );
}

export default TextArea;
