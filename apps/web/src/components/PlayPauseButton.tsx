interface PlayPauseButtonProps {
  isPaused: boolean;
  isFlushing?: boolean;
  onClick: () => void;
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
      <polygon points="3,1 13,8 3,15" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="1" width="4" height="14" rx="1" />
      <rect x="10" y="1" width="4" height="14" rx="1" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="spinner" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}

export function PlayPauseButton({ isPaused, isFlushing, onClick }: PlayPauseButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isFlushing}
      className={`btn-play-pause ${isPaused ? "paused" : ""}`}
      title={isFlushing ? "Verarbeite..." : isPaused ? "Fortsetzen" : "Pause"}
    >
      {isFlushing ? <Spinner /> : isPaused ? <PlayIcon /> : <PauseIcon />}
    </button>
  );
}
