import { useHelp, HintCard } from "../../help";

export function HelpSection({ onAction }) {
  const { activeHints, dismissHint } = useHelp();

  if (activeHints.length === 0) return null;

  return (
    <div className="config-section">
      <div className="config-section-title">Sugerencias</div>
      <div className="space-y-2">
        {activeHints.map((hint) => (
          <HintCard
            key={hint.id}
            hint={hint}
            onDismiss={dismissHint}
            onAction={onAction || (() => {})}
          />
        ))}
      </div>
    </div>
  );
}
