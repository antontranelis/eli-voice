import { useCallback, useRef, useState } from "react";
import {
  TranscriptEntry,
  Insight,
  formatTranscriptForEli,
} from "../lib/transcript";

interface UseEliOptions {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onRetry?: () => void;
}

interface AskEliOptions {
  moderationMode?: boolean;
  insights?: Insight[];
  maxSentences?: number;
}

export function useEli({ onChunk, onComplete, onRetry }: UseEliOptions) {
  const [isThinking, setIsThinking] = useState(false);
  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const onRetryRef = useRef(onRetry || (() => {}));
  onChunkRef.current = onChunk;
  onCompleteRef.current = onComplete;
  onRetryRef.current = onRetry || (() => {});

  // Keep the active request in a ref so it survives rerenders
  const activeRequestRef = useRef<AbortController | null>(null);

  const askEli = useCallback(
    (transcript: TranscriptEntry[], options?: AskEliOptions) => {
      // Cancel any previous request
      activeRequestRef.current?.abort();

      const controller = new AbortController();
      activeRequestRef.current = controller;

      setIsThinking(true);

      // Run the streaming fetch without awaiting in the callback
      // This ensures React state updates don't interfere
      (async () => {
        let fullText = "";

        try {
          const response = await fetch("/api/eli", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript: formatTranscriptForEli(transcript),
              moderationMode: options?.moderationMode ?? false,
              maxSentences: options?.maxSentences ?? 5,
              insights: options?.insights?.map((i) => ({
                speakers: i.speakers,
                type: i.type,
                text: i.text,
              })) ?? [],
            }),
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            throw new Error(`Server error: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.retry) {
                    // Server is retrying — clear partial text
                    fullText = "";
                    onRetryRef.current();
                  }
                  if (data.text) {
                    fullText += data.text;
                    onChunkRef.current(data.text);
                  }
                  if (data.error) {
                    console.error("Server:", data.error);
                  }
                } catch {
                  // Not JSON, skip
                }
              }
            }
          }

          onCompleteRef.current(fullText);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return; // Intentional abort, ignore
          }
          console.error("Eli-Fehler:", err);
          onCompleteRef.current(fullText || "(Eli konnte nicht antworten)");
        } finally {
          if (activeRequestRef.current === controller) {
            activeRequestRef.current = null;
          }
          setIsThinking(false);
        }
      })();
    },
    []
  );

  return { isThinking, askEli };
}
