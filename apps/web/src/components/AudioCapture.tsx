interface AudioCaptureProps {
  isRecording: boolean;
  isConnected: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function AudioCapture({
  isRecording,
  isConnected,
  onStart,
  onStop,
}: AudioCaptureProps) {
  return (
    <div className="audio-capture">
      {!isRecording ? (
        <button onClick={onStart} className="btn btn-record">
          Kreis starten
        </button>
      ) : (
        <button onClick={onStop} className="btn btn-stop">
          Kreis beenden
        </button>
      )}
      <span className={`status ${isConnected ? "connected" : ""}`}>
        {isConnected ? "Whisper verbunden" : isRecording ? "Verbinde..." : ""}
      </span>
    </div>
  );
}
