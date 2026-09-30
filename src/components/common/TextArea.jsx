import React, { useRef, useEffect, forwardRef } from "react";
import { sanitizeString } from "../../utils/sanitize";

export const TextArea = forwardRef(function TextArea(
  { onBlur, className = "", style = {}, ...props },
  ref
) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [props.value]);

  const setRefs = (el) => {
    textareaRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const handleChange = (e) => {
    const sanitized = sanitizeString(e.target.value);
    props.onChange &&
      props.onChange({ ...e, target: { ...e.target, value: sanitized } });
  };

  return (
    <textarea
      {...props}
      ref={setRefs}
      onChange={handleChange}
      className={`input-optimized resize-none overflow-hidden min-h-[3rem] ${className}`}
      style={style}
    />
  );
});

export default TextArea;
