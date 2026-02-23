interface EliSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  moderationMode: boolean;
  onModerationToggle: () => void;
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  maxSentences: number;
  onMaxSentencesChange: (n: number) => void;
}

export function EliSettingsPanel({
  open,
  onClose,
  moderationMode,
  onModerationToggle,
  ttsEnabled,
  onTtsToggle,
  maxSentences,
  onMaxSentencesChange,
}: EliSettingsPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && <div className="eli-panel-backdrop" onClick={onClose} />}

      <div className={`eli-panel ${open ? "open" : ""}`}>
        <div className="eli-panel-header">
          <span>Eli</span>
          <button className="eli-panel-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="eli-panel-body">
          <label className="eli-panel-row">
            <span>Stimme</span>
            <button
              className={`moderation-toggle-mini ${ttsEnabled ? "active" : ""}`}
              onClick={onTtsToggle}
            >
              <span className="moderation-toggle-track">
                <span className="moderation-toggle-thumb" />
              </span>
            </button>
          </label>

          <label className="eli-panel-row">
            <span>Sätze</span>
            <div className="eli-panel-stepper">
              <button
                className="stepper-btn"
                onClick={() => onMaxSentencesChange(Math.max(1, maxSentences - 1))}
                disabled={maxSentences <= 1}
              >
                −
              </button>
              <span className="stepper-value">{maxSentences}</span>
              <button
                className="stepper-btn"
                onClick={() => onMaxSentencesChange(Math.min(15, maxSentences + 1))}
                disabled={maxSentences >= 15}
              >
                +
              </button>
            </div>
          </label>

          <label className="eli-panel-row">
            <span>Moderation</span>
            <button
              className={`moderation-toggle-mini ${moderationMode ? "active" : ""}`}
              onClick={onModerationToggle}
            >
              <span className="moderation-toggle-track">
                <span className="moderation-toggle-thumb" />
              </span>
            </button>
          </label>
        </div>
      </div>
    </>
  );
}
