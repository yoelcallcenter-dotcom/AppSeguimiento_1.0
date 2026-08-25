import React, { useEffect, useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import useCelebrationStore from "../../core/celebrations/celebrationStore";
import { soundSystem } from "../../core/notifications/soundSystem";

const CONFETTI_COLORS = [
  "#D9A441",
  "#10B981",
  "#3B82F6",
  "#F472B6",
  "#F97316",
  "#8B5CF6",
  "#EF4444",
  "#22D3EE",
];

const EXIT_MS = 300;
const DURATION_MS = 3400;

function ConfettiPiece({ tx, ty, rot, delay, duration, color, size }) {
  return (
    <span
      className="absolute bottom-0 left-0 celebrate-piece"
      style={{
        width: size,
        height: size * 0.45,
        backgroundColor: color,
        borderRadius: 2,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        "--rot": `${rot}deg`,
      }}
    />
  );
}

export function CelebrationBanner() {
  const { active, message, pieces, dismiss } = useCelebrationStore();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    setLeaving(false);
    const t = setTimeout(() => setLeaving(true), DURATION_MS - EXIT_MS);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => dismiss(), EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving, dismiss]);

  useEffect(() => {
    if (active) {
      soundSystem.playAction("complete");
    }
  }, [active]);

  const confetti = useMemo(() => {
    return Array.from({ length: pieces || 48 }).map((_, i) => {
      const angle = (Math.random() * 150 - 75) * (Math.PI / 180);
      const dist = 140 + Math.random() * 280;
      return {
        tx: Math.sin(angle) * dist,
        ty: -Math.cos(angle) * dist,
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.3,
        duration: 1.6 + Math.random() * 1.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      };
    });
  }, [active, pieces]);

  if (!active) return null;

  return (
    <div
      className={`relative ${leaving ? "animate-toast-out" : "animate-toast-in"}`}
      aria-hidden="true"
    >
      <div
        className="relative flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl animate-celebrate-bounce"
        style={{
          backgroundColor: "rgba(20, 24, 31, 0.85)",
          border: "2px solid var(--color-accent)",
          boxShadow: "0 8px 40px rgba(217, 164, 65, 0.35)",
        }}
      >
        <div className="absolute bottom-full left-1/2 -translate-x-1/2">
          {confetti.map((p, i) => (
            <ConfettiPiece key={i} {...p} />
          ))}
        </div>
        <PartyPopper size={32} color="var(--color-accent)" />
        <div
          className="text-base font-bold text-center whitespace-nowrap"
          style={{ color: "#fff" }}
        >
          ¡Felicidades!
        </div>
        {message && (
          <div
            className="text-xs text-center max-w-xs"
            style={{ color: "var(--color-accent)" }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default CelebrationBanner;
