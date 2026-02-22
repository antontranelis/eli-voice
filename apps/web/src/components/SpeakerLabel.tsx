import { useState } from "react";

interface SpeakerLabelProps {
  currentSpeaker: string;
  onSpeakerChange: (name: string) => void;
  participants: string[];
}

export function SpeakerLabel({
  currentSpeaker,
  onSpeakerChange,
  participants,
}: SpeakerLabelProps) {
  const [customName, setCustomName] = useState("");

  const handleAdd = () => {
    if (customName.trim()) {
      onSpeakerChange(customName.trim());
      setCustomName("");
    }
  };

  return (
    <div className="speaker-label">
      <span className="label">Spricht:</span>
      <div className="speaker-buttons">
        {participants.map((name) => (
          <button
            key={name}
            className={`btn btn-speaker ${name === currentSpeaker ? "active" : ""}`}
            onClick={() => onSpeakerChange(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="speaker-add">
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Name hinzufügen"
        />
        <button onClick={handleAdd} className="btn btn-small">
          +
        </button>
      </div>
    </div>
  );
}
