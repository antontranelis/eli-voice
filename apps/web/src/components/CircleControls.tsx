interface CircleControlsProps {
  currentSpeaker: string;
  nextSpeaker: string;
  isEliTurn: boolean;
  isEliThinking: boolean;
  isFlushing?: boolean;
  onNext: () => void;
}

function Spinner() {
  return (
    <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}

export function CircleControls({
  currentSpeaker,
  nextSpeaker,
  isEliTurn,
  isEliThinking,
  isFlushing,
  onNext,
}: CircleControlsProps) {
  return (
    <div className="circle-controls">
      <div className="current-turn">
        <span className="turn-label">Redestab bei</span>
        <span className={`turn-name ${currentSpeaker === "Eli" ? "eli" : ""}`}>
          {currentSpeaker}
        </span>
      </div>

      <div className="circle-buttons">
        {isEliTurn && isEliThinking ? (
          <div className="eli-thinking">Eli denkt nach...</div>
        ) : (
          <button onClick={onNext} disabled={isEliThinking || isFlushing} className="btn btn-next">
            {isFlushing ? <><Spinner /> Verarbeite...</> : `Weiter an ${nextSpeaker}`}
          </button>
        )}
      </div>
    </div>
  );
}
