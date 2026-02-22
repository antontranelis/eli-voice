import { Insight, InsightType } from "../lib/transcript";
import { distributeOnCircle } from "../lib/circleGeometry";

interface InsightMindmapProps {
  participants: string[];
  activeIndex: number;
  insights: Insight[];
}

const VIEW_W = 900;
const VIEW_H = 600;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const PERSON_R = 32;
const ACTIVE_R = 36;

const TYPE_COLORS: Record<InsightType, string> = {
  commitment: "#e94560",
  vision: "#a8d8ea",
  offer: "#88cc88",
  question: "#f0c040",
  observation: "#c0a0e0",
};

const TYPE_LABELS: Record<InsightType, string> = {
  commitment: "Vorhaben",
  vision: "Vision",
  offer: "Angebot",
  question: "Frage",
  observation: "Erkenntnis",
};

function getCircleRadius(n: number): number {
  if (n <= 4) return 180;
  if (n <= 6) return 200;
  if (n <= 10) return 220;
  return 240;
}

/** Position insight leaves radially around a person node */
function getInsightPositions(
  cx: number,
  cy: number,
  count: number,
  baseAngle: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const LEAF_DIST = 70;
  const SPREAD = Math.min(Math.PI * 0.6, count * 0.35);
  const startAngle = baseAngle - SPREAD / 2;

  for (let i = 0; i < count; i++) {
    const angle =
      count === 1 ? baseAngle : startAngle + (SPREAD * i) / (count - 1);
    positions.push({
      x: cx + LEAF_DIST * Math.cos(angle),
      y: cy + LEAF_DIST * Math.sin(angle),
    });
  }
  return positions;
}

/** Truncate text for leaf display */
function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

export function InsightMindmap({
  participants,
  activeIndex,
  insights,
}: InsightMindmapProps) {
  const n = participants.length;
  const circleR = getCircleRadius(n);
  const positions = distributeOnCircle(n, CX, CY, circleR);

  // Group insights by speaker
  const insightsBySpeaker = new Map<string, Insight[]>();
  for (const ins of insights) {
    if (!insightsBySpeaker.has(ins.speaker)) {
      insightsBySpeaker.set(ins.speaker, []);
    }
    insightsBySpeaker.get(ins.speaker)!.push(ins);
  }

  // Build a map from insight ID to its rendered position
  const insightPositionMap = new Map<
    string,
    { x: number; y: number; speakerIdx: number }
  >();

  // Pre-compute positions for all insights
  for (let i = 0; i < n; i++) {
    const speaker = participants[i];
    const speakerInsights = insightsBySpeaker.get(speaker) || [];
    if (speakerInsights.length === 0) continue;

    // Angle pointing outward from center
    const outwardAngle = positions[i].angle;
    const leafPositions = getInsightPositions(
      positions[i].x,
      positions[i].y,
      speakerInsights.length,
      outwardAngle
    );

    for (let j = 0; j < speakerInsights.length; j++) {
      insightPositionMap.set(speakerInsights[j].id, {
        ...leafPositions[j],
        speakerIdx: i,
      });
    }
  }

  // Collect connection pairs
  const connections: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    fromType: InsightType;
    toType: InsightType;
  }> = [];

  for (const ins of insights) {
    if (!ins.relatedTo) continue;
    const fromPos = insightPositionMap.get(ins.id);
    if (!fromPos) continue;

    for (const relId of ins.relatedTo) {
      const toPos = insightPositionMap.get(relId);
      if (!toPos) continue;
      // Avoid duplicate connections
      if (ins.id > relId) continue;

      const relatedInsight = insights.find((i) => i.id === relId);
      connections.push({
        from: fromPos,
        to: toPos,
        fromType: ins.type,
        toType: relatedInsight?.type || ins.type,
      });
    }
  }

  return (
    <div className="mindmap-container">
      <svg
        className="mindmap-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="mindmap-glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines between related insights */}
        {connections.map((conn, i) => {
          const mx = (conn.from.x + conn.to.x) / 2;
          const my = (conn.from.y + conn.to.y) / 2;
          // Curve toward center for a nice arc
          const cpx = mx + (CX - mx) * 0.3;
          const cpy = my + (CY - my) * 0.3;

          return (
            <path
              key={`conn-${i}`}
              className="mindmap-connection"
              d={`M ${conn.from.x} ${conn.from.y} Q ${cpx} ${cpy} ${conn.to.x} ${conn.to.y}`}
              stroke={TYPE_COLORS[conn.fromType]}
              fill="none"
              strokeWidth={1.5}
              strokeOpacity={0.4}
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Stems from person to their insights */}
        {participants.map((speaker, i) => {
          const speakerInsights = insightsBySpeaker.get(speaker) || [];
          return speakerInsights.map((ins) => {
            const leafPos = insightPositionMap.get(ins.id);
            if (!leafPos) return null;
            return (
              <line
                key={`stem-${ins.id}`}
                className="mindmap-stem"
                x1={positions[i].x}
                y1={positions[i].y}
                x2={leafPos.x}
                y2={leafPos.y}
                stroke={TYPE_COLORS[ins.type]}
                strokeWidth={1}
                strokeOpacity={0.3}
              />
            );
          });
        })}

        {/* Person nodes */}
        {participants.map((name, i) => {
          const pos = positions[i];
          const isActive = i === activeIndex;
          const isEli = name === "Eli";
          const r = isActive ? ACTIVE_R : PERSON_R;

          return (
            <g key={name} className="mindmap-person">
              {/* Active glow */}
              {isActive && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 10}
                  fill="var(--accent)"
                  opacity={0.15}
                  filter="url(#mindmap-glow)"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                className={[
                  "mindmap-person-circle",
                  isActive && "active",
                  isEli && "eli",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              <text
                x={pos.x}
                y={pos.y}
                className={`mindmap-person-name ${isEli ? "eli" : ""}`}
              >
                {name}
              </text>
            </g>
          );
        })}

        {/* Insight leaves */}
        {insights.map((ins) => {
          const pos = insightPositionMap.get(ins.id);
          if (!pos) return null;
          const color = TYPE_COLORS[ins.type];
          const label = TYPE_LABELS[ins.type];
          const displayText = truncate(ins.text, 30);
          const boxW = Math.min(displayText.length * 6.5 + 24, 200);
          const boxH = 32;

          return (
            <g key={ins.id} className="mindmap-leaf">
              <rect
                x={pos.x - boxW / 2}
                y={pos.y - boxH / 2}
                width={boxW}
                height={boxH}
                rx={6}
                fill={color + "18"}
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              <text
                x={pos.x}
                y={pos.y - 3}
                className="mindmap-leaf-label"
                fill={color}
              >
                {label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 10}
                className="mindmap-leaf-text"
              >
                {displayText}
              </text>
            </g>
          );
        })}

        {/* Empty state hint */}
        {insights.length === 0 && (
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            dominantBaseline="central"
            className="mindmap-hint"
          >
            Kernaussagen erscheinen hier während des Kreises
          </text>
        )}
      </svg>
    </div>
  );
}
