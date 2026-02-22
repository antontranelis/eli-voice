import { useCallback, useRef, useState } from "react";
import { Insight, InsightType } from "../lib/transcript";

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const counterRef = useRef(0);
  const insightsRef = useRef(insights);
  insightsRef.current = insights;

  const extractInsights = useCallback(
    async (speaker: string, text: string, entryIndex: number) => {
      if (speaker === "Eli") return;
      if (!text.trim()) return;

      setIsExtracting(true);
      try {
        // Read current insights from ref (always fresh)
        const existingForServer = insightsRef.current.map((i) => ({
          id: i.id,
          speaker: i.speaker,
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
          }),
        });
        const data = await res.json();
        if (data.insights?.length) {
          const newInsights: Insight[] = data.insights.map(
            (i: { type: InsightType; text: string; relatedTo?: string[] }) => {
              counterRef.current += 1;
              return {
                id: `${speaker.toLowerCase()}-${counterRef.current}`,
                speaker,
                type: i.type,
                text: i.text,
                entryIndex,
                timestamp: new Date(),
                relatedTo: i.relatedTo,
              };
            }
          );
          setInsights((prev) => [...prev, ...newInsights]);
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
