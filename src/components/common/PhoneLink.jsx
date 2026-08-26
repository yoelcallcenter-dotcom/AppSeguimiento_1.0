import React from "react";
import { Phone, MessageCircle } from "lucide-react";
import { formatPhoneWithConfig } from "../../utils/configFormatters";

function cleanDigits(phone) {
  return (phone || "").replace(/\D/g, "");
}

function isMobileAR(cleaned) {
  if (cleaned.length === 10) return cleaned.slice(3, 5) === "15";
  if (cleaned.length === 11 && cleaned[0] === "0") return cleaned.slice(4, 6) === "15";
  if (cleaned.length === 12 && cleaned.startsWith("54")) return cleaned.slice(5, 7) === "15";
  if (cleaned.length === 13 && cleaned.startsWith("549")) return cleaned.slice(6, 8) === "15";
  return false;
}

function toDigitsAR(phone) {
  const c = cleanDigits(phone);
  if (c.length === 13 && c.startsWith("549")) return c;
  if (c.length === 12 && c.startsWith("54")) return "9" + c.slice(2);
  if (c.length === 11 && c.startsWith("0")) return "549" + c.slice(1);
  if (c.length === 10) return "549" + c;
  return "549" + c;
}

export function PhoneLink({ telefono, config, size = "sm", showIcon = true, className = "" }) {
  if (!telefono) return <span className={className}>—</span>;

  const cleaned = cleanDigits(telefono);
  if (cleaned.length < 8) {
    return (
      <span className={className} style={{ color: "var(--color-text)" }}>
        {formatPhoneWithConfig(telefono, config) || telefono}
      </span>
    );
  }

  const mobile = isMobileAR(cleaned);
  const digitsAR = toDigitsAR(telefono);
  const href = mobile ? `https://wa.me/${digitsAR}` : `tel:+${digitsAR}`;
  const display = formatPhoneWithConfig(telefono, config) || telefono;
  const Icon = mobile ? MessageCircle : Phone;
  const iconSize = size === "sm" ? 10 : 12;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 font-medium rounded transition-colors hover:opacity-80 ${textSize} ${className}`}
      style={{ color: "var(--color-text)" }}
      title={mobile ? "Abrir WhatsApp" : "Llamar"}
      onClick={(e) => e.stopPropagation()}
    >
      {showIcon && (
        <Icon
          size={iconSize}
          className="flex-shrink-0"
          style={{ color: mobile ? "#25D366" : "var(--color-text-muted)" }}
        />
      )}
      <span className={cleaned.length >= 8 ? "underline" : "hover:underline"}>{display}</span>
    </a>
  );
}

export const PhoneLinkMemo = React.memo(PhoneLink);
