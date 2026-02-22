interface ModerationToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function ModerationToggle({ enabled, onToggle }: ModerationToggleProps) {
  return (
    <button
      className={`moderation-toggle ${enabled ? "active" : ""}`}
      onClick={onToggle}
      title={enabled ? "Moderation aktiv" : "Moderation aus"}
    >
      <span className="moderation-toggle-track">
        <span className="moderation-toggle-thumb" />
      </span>
      <span className="moderation-toggle-label">Moderation</span>
    </button>
  );
}
