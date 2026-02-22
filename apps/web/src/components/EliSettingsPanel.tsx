interface EliSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  moderationMode: boolean;
  onModerationToggle: () => void;
}

export function EliSettingsPanel({
  open,
  onClose,
  moderationMode,
  onModerationToggle,
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
