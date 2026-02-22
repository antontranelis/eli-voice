import { useCallback, useRef, useState } from "react";
import { Insight, InsightType } from "../lib/transcript";

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const counterRef = useRef(0);
  const insightsRef = useRef(insights);
  insightsRef.current = insights;

  const extractInsights = useCallback(
    async (speaker: string, text: string, entryIndex: number, participants?: string[]) => {
      if (!text.trim()) return;

      setIsExtracting(true);
      try {
        // Read current insights from ref (always fresh)
        const existingForServer = insightsRef.current.map((i) => ({
          id: i.id,
          speakers: i.speakers,
          type: i.type,
          text: i.text,
        }));

        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speaker,
            text,
            existingInsights: existingForServer,
            participants,
          }),
        });
        const data = await res.json();
        if (data.insights?.length) {
          setInsights((prev) => {
            let updated = [...prev];
            for (const i of data.insights as Array<{
              type: InsightType;
              text: string;
              mergeWith?: string;
            }>) {
              if (i.mergeWith) {
                // Merge into existing insight
                const targetIdx = updated.findIndex((e) => e.id === i.mergeWith);
                if (targetIdx !== -1) {
                  const target = updated[targetIdx];
                  const newSpeakers = target.speakers.includes(speaker)
                    ? target.speakers
                    : [...target.speakers, speaker];
                  updated[targetIdx] = {
                    ...target,
                    speakers: newSpeakers,
                    // Use new text if provided (reworded for multi-speaker), else keep original
                    text: i.text || target.text,
                  };
                  continue;
                }
                // Target not found — fall through to create new
              }
              // Create new insight
              counterRef.current += 1;
              updated.push({
                id: `insight-${counterRef.current}`,
                speakers: [speaker],
                type: i.type,
                text: i.text,
                entryIndex,
                timestamp: new Date(),
              });
            }
            return updated;
          });
        }
      } catch (err) {
        console.error("Insight extraction failed:", err);
      } finally {
        setIsExtracting(false);
      }
    },
    []
  );

  return { insights, isExtracting, extractInsights };
}
