import { useEffect, useRef } from "react";
import { TranscriptEntry } from "../lib/transcript";

interface TranscriptViewProps {
  entries: TranscriptEntry[];
  onEliClick?: () => void;
}

/** Group consecutive entries from the same speaker into one message */
function groupEntries(entries: TranscriptEntry[]) {
  const groups: { speaker: string; texts: string[]; isEli: boolean; startIndex: number }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const last = groups[groups.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.texts.push(entry.text);
    } else {
      groups.push({
        speaker: entry.speaker,
        texts: [entry.text],
        isEli: !!entry.isEli,
        startIndex: i,
      });
    }
  }
  return groups;
}

export function TranscriptView({ entries, onEliClick }: TranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const groups = groupEntries(entries);

  return (
    <div className="transcript">
      {entries.length === 0 && (
        <p className="transcript-empty">
          Der Kreis ist still. Wer den Redestab nimmt, spricht.
        </p>
      )}
      {groups.map((group) => (
        <div
          key={group.startIndex}
          className={`transcript-entry ${group.isEli ? "eli" : ""}`}
        >
          <span
            className={`speaker ${group.isEli && onEliClick ? "clickable" : ""}`}
            onClick={group.isEli && onEliClick ? onEliClick : undefined}
          >
            {group.speaker}
          </span>
          <p className="text">{group.texts.join(" ")}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
