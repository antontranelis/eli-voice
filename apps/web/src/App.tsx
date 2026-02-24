import { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptEntry, Insight, InsightType } from "./lib/transcript";
import { useWhisper } from "./hooks/useWhisper";
import { useEli } from "./hooks/useEli";
import { useInsights } from "./hooks/useInsights";
import { useTTS } from "./hooks/useTTS";
import { TranscriptView } from "./components/TranscriptView";
import { CircleVisualization } from "./components/CircleVisualization";
import { CircleControls } from "./components/CircleControls";
import { PlayPauseButton } from "./components/PlayPauseButton";
import { InsightMindmap } from "./components/InsightMindmap";
import { TabNav, Tab } from "./components/TabNav";
import { EliSettingsPanel } from "./components/EliSettingsPanel";
import { EndCircleDialog } from "./components/EndCircleDialog";
import "./App.css";

const DEFAULT_PARTICIPANTS = ["Anton", "Eli", "Timo", "Tillmann", "Eva"];
const SESSION_KEY = "redekreis-session";

type Phase = "setup" | "circle";

interface SessionInsight {
  id: string;
  speakers: string[];
  type: string;
  text: string;
  entryIndex: number;
  timestamp: string;
}

interface SessionState {
  phase: Phase;
  entries: Array<{ speaker: string; text: string; timestamp: string; isEli?: boolean }>;
  insights: SessionInsight[];
  order: string[];
  turnIndex: number;
  moderationMode: boolean;
  ttsEnabled: boolean;
  maxSentences: number;
}

function loadSession(): Partial<SessionState> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const saved = useRef(loadSession());

  const [phase, setPhase] = useState<Phase>(saved.current?.phase ?? "setup");
  const [entries, setEntries] = useState<TranscriptEntry[]>(() =>
    (saved.current?.entries ?? []).map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
  );
  const [order, setOrder] = useState<string[]>(saved.current?.order ?? DEFAULT_PARTICIPANTS);
  const [turnIndex, setTurnIndex] = useState(saved.current?.turnIndex ?? 0);
  const [eliText, setEliText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [moderationMode, setModerationMode] = useState(saved.current?.moderationMode ?? false);
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [showEliSettings, setShowEliSettings] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(saved.current?.ttsEnabled ?? false);
  const [maxSentences, setMaxSentences] = useState(saved.current?.maxSentences ?? 5);
  const [showEndCircle, setShowEndCircle] = useState(false);
  const [isEndingSaving, setIsEndingSaving] = useState(false);

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
  const maxSentencesRef = useRef(maxSentences);
  maxSentencesRef.current = maxSentences;

  // Insights
  const { insights, extractInsights, distillInsights, resetInsights } = useInsights(
    (saved.current?.insights ?? []).map((i) => ({
      ...i,
      type: i.type as InsightType,
      timestamp: new Date(i.timestamp),
    }))
  );
  const insightsRef = useRef(insights);
  insightsRef.current = insights;

  // Persist circle state to sessionStorage
  useEffect(() => {
    const state: SessionState = {
      phase,
      entries: entries.map((e) => ({ ...e, timestamp: e.timestamp.toISOString() })),
      insights: insights.map((i) => ({ ...i, timestamp: i.timestamp.toISOString() })),
      order,
      turnIndex,
      moderationMode,
      ttsEnabled,
      maxSentences,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [phase, entries, insights, order, turnIndex, moderationMode, ttsEnabled, maxSentences]);

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

  // Auto-start recording if we restored into circle phase
  useEffect(() => {
    if (phase === "circle" && !isRecording) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TTS
  const tts = useTTS({
    enabled: ttsEnabled,
  });

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
      // Extract insights OUTSIDE the setEntries updater
      // (React Strict Mode calls updaters twice, which caused double extraction)
      const entryIndex = entriesRef.current.length; // will be the index of the just-added entry
      extractInsights("Eli", fullText, entryIndex, orderRef.current);
      setEliText("");
      tts.speak(fullText);
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

    // Small delay to let React process the flushed transcript entry
    await new Promise((r) => setTimeout(r, 50));

    // Extract insights from the just-finished speaker (fire-and-forget)
    const justFinished = orderRef.current[turnIndexRef.current];
    if (justFinished !== "Eli") {
      // Eli's insights are extracted in onComplete — here only for humans
      const fullText = collectSpeakerText(justFinished);
      if (fullText) {
        extractInsights(justFinished, fullText, entriesRef.current.length - 1, orderRef.current);
      }
    }

    const nextIndex = (turnIndexRef.current + 1) % orderRef.current.length;
    setTurnIndex(nextIndex);

    // Distill insights when a full round completes
    if (nextIndex === 0) {
      distillInsights(orderRef.current);
    }

    if (orderRef.current[nextIndex] === "Eli") {
      setEliText("");
      eli.askEli(entriesRef.current, {
        moderationMode: moderationRef.current,
        insights: insightsRef.current,
        maxSentences: maxSentencesRef.current,
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

  // Kreis beenden
  const generateMarkdown = (): string => {
    const date = new Date().toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const TYPE_LABELS: Record<string, string> = {
      commitment: "Vorhaben",
      vision: "Vision",
      offer: "Angebot",
      question: "Frage",
      observation: "Erkenntnis",
    };

    let md = `# Redekreis — ${date}\n\n`;
    md += `**Teilnehmer:** ${order.join(", ")}\n\n`;
    md += `---\n\n## Transkript\n\n`;

    // Group consecutive entries by same speaker into turns
    let i = 0;
    while (i < entries.length) {
      const speaker = entries[i].speaker;
      const time = entries[i].timestamp.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const texts: string[] = [entries[i].text];
      while (i + 1 < entries.length && entries[i + 1].speaker === speaker) {
        i++;
        texts.push(entries[i].text);
      }
      md += `**${speaker}** (${time}):\n${texts.join(" ")}\n\n`;
      i++;
    }

    if (insights.length > 0) {
      md += `---\n\n## Insights\n\n`;
      for (const i of insights) {
        md += `- **${TYPE_LABELS[i.type] || i.type}** (${i.speakers.join(", ")}): ${i.text}\n`;
      }
    }

    return md;
  };

  const handleEndCircle = async (selectedInsightIds: string[]) => {
    setIsEndingSaving(true);

    // 1. Save selected insights as Eli memories
    const selectedInsights = insights.filter((i) =>
      selectedInsightIds.includes(i.id)
    );

    if (selectedInsights.length > 0) {
      try {
        await fetch("/api/circle/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            insights: selectedInsights.map((i) => ({
              speakers: i.speakers,
              type: i.type,
              text: i.text,
            })),
            participants: order,
            date: new Date().toISOString().slice(0, 10),
          }),
        });
      } catch (err) {
        console.error("Failed to save memories:", err);
      }
    }

    // 2. Generate and download markdown
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `redekreis-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);

    // 3. Clean up
    stop();
    sessionStorage.removeItem(SESSION_KEY);
    setShowEndCircle(false);
    setIsEndingSaving(false);
    setPhase("setup");
    setEntries([]);
    resetInsights();
    setTurnIndex(0);
    setEliText("");
    setIsPaused(false);
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
            onEliClick={() => setShowEliSettings(true)}
          />
          <button
            onClick={handleStartCircle}
            disabled={order.length < 2}
            className="btn btn-start-circle"
          >
            Kreis starten
          </button>
        </main>

        <EliSettingsPanel
          open={showEliSettings}
          onClose={() => setShowEliSettings(false)}
          moderationMode={moderationMode}
          onModerationToggle={() => setModerationMode((m) => !m)}
          ttsEnabled={ttsEnabled}
          onTtsToggle={() => setTtsEnabled((t) => !t)}
          maxSentences={maxSentences}
          onMaxSentencesChange={setMaxSentences}
        />
      </div>
    );
  }

  // Circle phase
  return (
    <div className="app">
      <header>
        <h1>Redekreis</h1>
        <div className="header-actions">
          <PlayPauseButton isPaused={isPaused} isFlushing={isFlushing} onClick={handlePause} />
          <button
            className="btn-stop"
            onClick={() => setShowEndCircle(true)}
            title="Kreis beenden"
          >
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
              <rect x="2" y="2" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      </header>

      <div className="circle-phase-body">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "log" ? (
          <div className="circle-body">
            <main>
              <TranscriptView entries={entries} onEliClick={() => setShowEliSettings(true)} />

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
                onEliClick={() => setShowEliSettings(true)}
              />
            </aside>
          </div>
        ) : (
          <div className="mindmap-body">
            <InsightMindmap
              participants={order}
              activeIndex={turnIndex}
              insights={insights}
              audioLevel={audioLevel}
              onEliClick={() => setShowEliSettings(true)}
            />
          </div>
        )}
      </div>

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

      <EndCircleDialog
        open={showEndCircle}
        onClose={() => setShowEndCircle(false)}
        onConfirm={handleEndCircle}
        entries={entries}
        insights={insights}
        participants={order}
        isSaving={isEndingSaving}
      />

      <EliSettingsPanel
        open={showEliSettings}
        onClose={() => setShowEliSettings(false)}
        moderationMode={moderationMode}
        onModerationToggle={() => setModerationMode((m) => !m)}
        ttsEnabled={ttsEnabled}
        onTtsToggle={() => setTtsEnabled((t) => !t)}
        maxSentences={maxSentences}
        onMaxSentencesChange={setMaxSentences}
      />
    </div>
  );
}
