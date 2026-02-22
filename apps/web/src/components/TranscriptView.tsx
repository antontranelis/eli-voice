import { useEffect, useRef } from "react";
import { TranscriptEntry } from "../lib/transcript";

interface TranscriptViewProps {
  entries: TranscriptEntry[];
}

export function TranscriptView({ entries }: TranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="transcript">
      {entries.length === 0 && (
        <p className="transcript-empty">
          Der Kreis ist still. Wer den Redestab nimmt, spricht.
        </p>
      )}
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`transcript-entry ${entry.isEli ? "eli" : ""}`}
        >
          <span className="speaker">{entry.speaker}</span>
          <p className="text">{entry.text}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
