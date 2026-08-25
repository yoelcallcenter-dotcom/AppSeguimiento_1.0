import DOMPurify from "dompurify";

const HTML_ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
  "a", "blockquote", "code", "pre", "hr", "span",
];

const HTML_ALLOWED_ATTR = ["href", "target", "rel", "class"];

export function sanitizeHTML(value) {
  if (typeof value !== "string") return value;
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: HTML_ALLOWED_TAGS,
    ALLOWED_ATTR: HTML_ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeString(value) {
  if (typeof value !== "string") return value;
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
