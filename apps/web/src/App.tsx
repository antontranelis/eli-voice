import { useCallback, useRef, useState } from "react";
import { TranscriptEntry } from "./lib/transcript";
import { useWhisper } from "./hooks/useWhisper";
import { useEli } from "./hooks/useEli";
import { useInsights } from "./hooks/useInsights";
import { useTTS } from "./hooks/useTTS";
import { TranscriptView } from "./components/TranscriptView";
import { CircleVisualization } from "./components/CircleVisualization";
import { CircleControls } from "./components/CircleControls";
import { PlayPauseButton } from "./components/PlayPauseButton";
import { ModerationToggle } from "./components/ModerationToggle";
import { InsightsPanel } from "./components/InsightsPanel";
import { InsightMindmap } from "./components/InsightMindmap";
import { TabNav, Tab } from "./components/TabNav";
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
  const [isFlushing, setIsFlushing] = useState(false);
  const [moderationMode, setModerationMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("kreis");

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
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const moderationRef = useRef(moderationMode);
  moderationRef.current = moderationMode;

  // Insights
  const { insights, extractInsights } = useInsights();
  const insightsRef = useRef(insights);
  insightsRef.current = insights;

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

  const { isRecording, isConnected, audioLevel, start, stop, flush } = useWhisper({
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

  // Collect all text from the current speaker's turn (Whisper produces multiple entries)
  const collectSpeakerText = (speaker: string): string => {
    const currentEntries = entriesRef.current;
    const texts: string[] = [];
    // Walk backwards from the end collecting entries from this speaker
    for (let i = currentEntries.length - 1; i >= 0; i--) {
      if (currentEntries[i].speaker === speaker) {
        texts.unshift(currentEntries[i].text);
      } else {
        break; // Stop at the first entry from a different speaker
      }
    }
    return texts.join(" ");
  };

  // Kreis starten
  const handleStartCircle = () => {
    setTurnIndex(0);
    setPhase("circle");
    start();
  };

  // Redestab weitergeben
  const handleNext = async () => {
    setIsFlushing(true);
    await flush();
    setIsFlushing(false);

    // Extract insights from the just-finished speaker (fire-and-forget)
    const justFinished = orderRef.current[turnIndexRef.current];
    if (justFinished !== "Eli") {
      const fullText = collectSpeakerText(justFinished);
      if (fullText) {
        extractInsights(justFinished, fullText, entriesRef.current.length - 1);
      }
    }

    const nextIndex = (turnIndexRef.current + 1) % orderRef.current.length;
    setTurnIndex(nextIndex);

    if (orderRef.current[nextIndex] === "Eli") {
      setEliText("");
      eli.askEli(entriesRef.current, {
        moderationMode: moderationRef.current,
        insights: insightsRef.current,
      });
    }
  };

  // Pause / Fortsetzen
  const handlePause = async () => {
    if (isPaused) {
      start();
      setIsPaused(false);
    } else {
      setIsFlushing(true);
      await flush();
      setIsFlushing(false);
      stop();
      setIsPaused(true);
    }
  };

  // Reorder during circle — turnIndex follows the current speaker
  const handleReorder = (newOrder: string[]) => {
    const currentName = orderRef.current[turnIndexRef.current];
    const newIndex = newOrder.indexOf(currentName);
    setOrder(newOrder);
    if (newIndex !== -1) {
      setTurnIndex(newIndex);
    }
  };

  // Dynamic add/remove during circle
  const handleAddParticipant = (name: string) => {
    if (order.includes(name)) return;
    setOrder((prev) => {
      const newOrder = [...prev];
      // Insert after current speaker
      const insertAt = turnIndexRef.current + 1;
      newOrder.splice(insertAt, 0, name);
      return newOrder;
    });
  };

  const handleRemoveParticipant = (name: string) => {
    if (name === "Eli") return;
    const idx = orderRef.current.indexOf(name);
    if (idx === -1) return;
    // Don't remove the current speaker
    if (idx === turnIndexRef.current) return;

    setOrder((prev) => prev.filter((n) => n !== name));
    // Adjust turnIndex if removed person was before current speaker
    if (idx < turnIndexRef.current) {
      setTurnIndex((i) => i - 1);
    }
  };

  // Setup phase
  if (phase === "setup") {
    return (
      <div className="app">
        <header>
          <h1>Redekreis</h1>
        </header>
        <main className="setup-main">
          <h2 className="setup-title">Sitzordnung im Kreis</h2>
          <CircleVisualization
            participants={order}
            activeIndex={-1}
            mode="setup"
            onReorder={setOrder}
            onAdd={(name) => setOrder((prev) => [...prev, name])}
            onRemove={(name) => setOrder((prev) => prev.filter((n) => n !== name))}
          />
          <button
            onClick={handleStartCircle}
            disabled={order.length < 2}
            className="btn btn-start-circle"
          >
            Kreis starten
          </button>
        </main>
      </div>
    );
  }

  // Circle phase
  return (
    <div className="app">
      <header>
        <h1>Redekreis</h1>
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        <ModerationToggle
          enabled={moderationMode}
          onToggle={() => setModerationMode((m) => !m)}
        />
        <PlayPauseButton isPaused={isPaused} isFlushing={isFlushing} onClick={handlePause} />
      </header>

      {activeTab === "kreis" ? (
        <div className="circle-body">
          <main>
            <TranscriptView entries={entries} />

            {eliText && (
              <div className="eli-live">
                <span className="speaker">Eli</span>
                <p>{eliText}</p>
              </div>
            )}
          </main>

          <aside className="circle-area">
            <CircleVisualization
              participants={order}
              activeIndex={turnIndex}
              audioLevel={audioLevel}
              mode="circle"
              onReorder={handleReorder}
              onAdd={handleAddParticipant}
              onRemove={handleRemoveParticipant}
            />
            <InsightsPanel insights={insights} />
          </aside>
        </div>
      ) : (
        <div className="mindmap-body">
          <InsightMindmap
            participants={order}
            activeIndex={turnIndex}
            insights={insights}
          />
        </div>
      )}

      <footer>
        <CircleControls
          currentSpeaker={currentSpeaker}
          nextSpeaker={nextSpeaker}
          isEliTurn={isEliTurn}
          isEliThinking={eli.isThinking}
          isFlushing={isFlushing}
          onNext={handleNext}
        />
      </footer>
    </div>
  );
}
