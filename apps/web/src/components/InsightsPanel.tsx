import { Insight, InsightType } from "../lib/transcript";

interface InsightsPanelProps {
  insights: Insight[];
}

const TYPE_LABELS: Record<InsightType, string> = {
  commitment: "Vorhaben",
  vision: "Vision",
  offer: "Angebot",
  question: "Frage",
  observation: "Erkenntnis",
};

const TYPE_COLORS: Record<InsightType, string> = {
  commitment: "#e94560",
  vision: "#a8d8ea",
  offer: "#88cc88",
  question: "#f0c040",
  observation: "#c0a0e0",
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="insights-panel">
      <h3 className="insights-title">Kernaussagen</h3>
      <div className="insights-list">
        {insights.map((insight, i) => (
          <div key={i} className="insight-item">
            <span
              className="insight-badge"
              style={{
                backgroundColor: TYPE_COLORS[insight.type] + "22",
                color: TYPE_COLORS[insight.type],
              }}
            >
              {TYPE_LABELS[insight.type]}
            </span>
            <span className="insight-speaker">{insight.speaker}</span>
            <span className="insight-text">{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
