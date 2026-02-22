import { useCallback, useRef, useState } from "react";
import { TranscriptEntry } from "./lib/transcript";
import { useWhisper } from "./hooks/useWhisper";
import { useEli } from "./hooks/useEli";
import { useTTS } from "./hooks/useTTS";
import { TranscriptView } from "./components/TranscriptView";
import { CircleSetup } from "./components/CircleSetup";
import { CircleControls } from "./components/CircleControls";
import "./App.css";

const DEFAULT_PARTICIPANTS = ["Anton", "Eli", "Timo", "Tillmann", "Eva"];

type Phase = "setup" | "circle";

export default function App() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [order, setOrder] = useState<string[]>(DEFAULT_PARTICIPANTS);
  const [turnIndex, setTurnIndex] = useState(0);
  const [eliText, setEliText] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  const currentSpeaker = order[turnIndex];
  const nextSpeaker = order[(turnIndex + 1) % order.length];
  const isEliTurn = currentSpeaker === "Eli";

  // Refs so callbacks always see latest values
  const speakerRef = useRef(currentSpeaker);
  speakerRef.current = currentSpeaker;
  const orderRef = useRef(order);
  orderRef.current = order;
  const turnIndexRef = useRef(turnIndex);
  turnIndexRef.current = turnIndex;

  // Whisper: Live-Transkription
  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      // Don't log whisper transcripts during Eli's turn
      if (speakerRef.current === "Eli") return;

      if (isFinal && text.trim()) {
        setEntries((prev) => [
          ...prev,
          {
            speaker: speakerRef.current,
            text: text.trim(),
            timestamp: new Date(),
          },
        ]);
      }
    },
    []
  );

  const { isRecording, isConnected, start, stop, flush } = useWhisper({
    onTranscript: handleTranscript,
  });

  // TTS
  const tts = useTTS({
    apiKey: undefined,
    voiceId: undefined,
  });

  // Auto-advance after Eli finishes
  const advancePastEli = useCallback(() => {
    const nextIndex = (turnIndexRef.current + 1) % orderRef.current.length;
    setTurnIndex(nextIndex);
  }, []);

  // Eli: Claude API
  const eli = useEli({
    onChunk: (text) => {
      setEliText((prev) => prev + text);
    },
    onRetry: () => {
      // Server is retrying after error — clear partial text
      setEliText("");
    },
    onComplete: (fullText) => {
      setEntries((prev) => [
        ...prev,
        {
          speaker: "Eli",
          text: fullText,
          timestamp: new Date(),
          isEli: true,
        },
      ]);
      setEliText("");
      tts.speak(fullText);
      // Automatically pass the talking stick to the next person
      advancePastEli();
    },
  });

  // Kreis starten
  const handleStartCircle = (circleOrder: string[]) => {
    setOrder(circleOrder);
    setTurnIndex(0);
    setPhase("circle");
    start();
  };

  // Redestab weitergeben
  const handleNext = async () => {
    // Flush current audio buffer — waits for transcription, still attributed to current speaker
    await flush();

    const nextIndex = (turnIndexRef.current + 1) % orderRef.current.length;
    setTurnIndex(nextIndex);

    if (orderRef.current[nextIndex] === "Eli") {
      setEliText("");
      eli.askEli(entries);
    }
  };

  // Pause / Fortsetzen
  const handlePause = () => {
    if (isPaused) {
      start();
      setIsPaused(false);
    } else {
      stop();
      setIsPaused(true);
    }
  };

  if (phase === "setup") {
    return (
      <div className="app">
        <header>
          <h1>Redekreis</h1>
        </header>
        <main className="setup-main">
          <CircleSetup
            participants={DEFAULT_PARTICIPANTS}
            onStart={handleStartCircle}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Redekreis</h1>
        <span className={`connection-status ${isConnected ? "connected" : isPaused ? "paused" : ""}`}>
          {isPaused ? "Pause" : isConnected ? "Aufnahme aktiv" : "Verbinde..."}
        </span>
      </header>

      <main>
        <TranscriptView entries={entries} />

        {eliText && (
          <div className="eli-live">
            <span className="speaker">Eli</span>
            <p>{eliText}</p>
          </div>
        )}
      </main>

      <footer>
        <CircleControls
          currentSpeaker={currentSpeaker}
          nextSpeaker={nextSpeaker}
          isEliTurn={isEliTurn}
          isEliThinking={eli.isThinking}
          isPaused={isPaused}
          onNext={handleNext}
          onPause={handlePause}
        />
      </footer>
    </div>
  );
}
