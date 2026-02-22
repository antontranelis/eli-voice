import { useCallback, useState } from "react";
import { Insight, InsightType } from "../lib/transcript";

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const extractInsights = useCallback(
    async (speaker: string, text: string, entryIndex: number) => {
      if (speaker === "Eli") return;
      if (!text.trim()) return;

      setIsExtracting(true);
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ speaker, text }),
        });
        const data = await res.json();
        if (data.insights?.length) {
          const newInsights: Insight[] = data.insights.map(
            (i: { type: InsightType; text: string }) => ({
              ...i,
              speaker,
              entryIndex,
              timestamp: new Date(),
            })
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
