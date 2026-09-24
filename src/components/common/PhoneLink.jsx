import React from "react";
import { Phone } from "lucide-react";
import { formatPhoneWithConfig } from "../../utils/configFormatters";
import { soundSystem } from "../../core/notifications/soundSystem";
import { copyToClipboard } from "../../utils/copyToClipboard";

function cleanDigits(phone) {
  return (phone || "").replace(/\D/g, "");
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

  const href = `tel:${cleaned}`;
  const display = formatPhoneWithConfig(telefono, config) || telefono;
  const Icon = Phone;
  const iconSize = size === "sm" ? 10 : 12;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  const handleCopy = async (e) => {
    e.stopPropagation();
    const ok = await copyToClipboard(telefono);
    if (ok) soundSystem.playAction("copy");
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 font-medium rounded transition-colors hover:opacity-80 ${textSize} ${className}`}
      style={{ color: "var(--color-text)" }}
      title="Llamar"
      onClick={(e) => e.stopPropagation()}
    >
      {showIcon && (
        <Icon
          size={iconSize}
          className="flex-shrink-0"
          style={{ color: "var(--color-text-muted)" }}
        />
      )}
      <span className={cleaned.length >= 8 ? "underline" : "hover:underline"}>{display}</span>
    </a>
  );
}

export const PhoneLinkMemo = React.memo(PhoneLink);
