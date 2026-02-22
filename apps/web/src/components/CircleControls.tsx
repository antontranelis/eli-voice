interface CircleControlsProps {
  currentSpeaker: string;
  nextSpeaker: string;
  isEliTurn: boolean;
  isEliThinking: boolean;
  isPaused: boolean;
  onNext: () => void;
  onPause: () => void;
}

export function CircleControls({
  currentSpeaker,
  nextSpeaker,
  isEliTurn,
  isEliThinking,
  isPaused,
  onNext,
  onPause,
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
          <button onClick={onNext} disabled={isEliThinking} className="btn btn-next">
            Weiter an {nextSpeaker}
          </button>
        )}

        <button onClick={onPause} className={`btn btn-pause ${isPaused ? "paused" : ""}`}>
          {isPaused ? "Fortsetzen" : "Pause"}
        </button>
      </div>
    </div>
  );
}
