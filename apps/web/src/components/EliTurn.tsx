interface EliTurnProps {
  isThinking: boolean;
  isSpeaking: boolean;
  eliText: string;
  onEliTurn: () => void;
  disabled: boolean;
}

export function EliTurn({
  isThinking,
  isSpeaking,
  eliText,
  onEliTurn,
  disabled,
}: EliTurnProps) {
  return (
    <div className="eli-turn">
      <button
        onClick={onEliTurn}
        disabled={disabled || isThinking || isSpeaking}
        className="btn btn-eli"
      >
        {isThinking
          ? "Eli denkt nach..."
          : isSpeaking
            ? "Eli spricht..."
            : "Eli ist dran"}
      </button>
      {eliText && (
        <div className="eli-response">
          <p>{eliText}</p>
        </div>
      )}
    </div>
  );
}
