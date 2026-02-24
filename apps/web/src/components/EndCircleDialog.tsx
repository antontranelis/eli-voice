import { useState } from "react";
import { TranscriptEntry, Insight } from "../lib/transcript";

interface EndCircleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedInsightIds: string[]) => void;
  entries: TranscriptEntry[];
  insights: Insight[];
  participants: string[];
  isSaving: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  commitment: "Vorhaben",
  vision: "Vision",
  offer: "Angebot",
  question: "Frage",
  observation: "Erkenntnis",
};

export function EndCircleDialog({
  open,
  onClose,
  onConfirm,
  entries,
  insights,
  participants,
  isSaving,
}: EndCircleDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(insights.map((i) => i.id))
  );

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(insights.map((i) => i.id)));
  const selectNone = () => setSelected(new Set());

  return (
    <>
      <div className="end-circle-backdrop" onClick={onClose} />
      <div className="end-circle-dialog">
        <h2>Kreis beenden</h2>

        <p className="end-circle-subtitle">
          {entries.length} Beiträge von {participants.length} Teilnehmern
        </p>

        {insights.length > 0 && (
          <>
            <div className="end-circle-section-header">
              <span>Was soll Eli sich merken?</span>
              <div className="end-circle-select-btns">
                <button className="btn btn-tiny" onClick={selectAll}>
                  Alle
                </button>
                <button className="btn btn-tiny" onClick={selectNone}>
                  Keine
                </button>
              </div>
            </div>

            <div className="end-circle-insights">
              {insights.map((insight) => (
                <label key={insight.id} className="end-circle-insight-row">
                  <input
                    type="checkbox"
                    checked={selected.has(insight.id)}
                    onChange={() => toggle(insight.id)}
                  />
                  <div className="end-circle-insight-content">
                    <div className="end-circle-insight-header">
                      <span className={`insight-badge ${insight.type}`}>
                        {TYPE_LABELS[insight.type] || insight.type}
                      </span>
                      <span className="end-circle-insight-speakers">
                        {insight.speakers.join(", ")}
                      </span>
                    </div>
                    <span className="end-circle-insight-text">{insight.text}</span>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="end-circle-actions">
          <button className="btn" onClick={onClose} disabled={isSaving}>
            Abbrechen
          </button>
          <button
            className="btn btn-end-circle"
            onClick={() => onConfirm(Array.from(selected))}
            disabled={isSaving}
          >
            {isSaving
              ? "Speichert..."
              : `Beenden${selected.size > 0 ? ` (${selected.size} merken)` : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
