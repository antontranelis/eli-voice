import { useCallback, useEffect, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { Insight, InsightType } from "../lib/transcript";

interface InsightMindmapProps {
  participants: string[];
  activeIndex: number;
  insights: Insight[];
  audioLevel?: number; // 0..1
  onEliClick?: () => void;
}

const VIEW_W = 1200;
const VIEW_H = 900;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

const PERSON_R = 36;
const ACTIVE_R = 40;
const GLOW_R = 46;
const INSIGHT_R = 14; // collision radius for insight nodes

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

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

function getCircleRadius(n: number): number {
  if (n <= 3) return 220;
  if (n <= 5) return 260;
  if (n <= 8) return 300;
  return 340;
}

// --- Node types for the force simulation ---

interface PersonNode extends SimulationNodeDatum {
  kind: "person";
  id: string;
  name: string;
  participantIndex: number;
}

interface InsightNode extends SimulationNodeDatum {
  kind: "insight";
  id: string;
  insight: Insight;
}

type GraphNode = PersonNode | InsightNode;

type GraphLink = SimulationLinkDatum<GraphNode>;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

export function InsightMindmap({
  participants,
  activeIndex,
  insights,
  audioLevel = 0,
  onEliClick,
}: InsightMindmapProps) {
  // Expanded insight (click to show full text)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Force simulation positions — updated on each tick
  const [nodePositions, setNodePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);

  // Build graph data from participants + insights
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);

  useEffect(() => {
    const n = participants.length;
    const circleR = getCircleRadius(n);

    // --- Build nodes ---
    const personNodes: PersonNode[] = participants.map((name, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return {
        kind: "person",
        id: `person-${name}`,
        name,
        participantIndex: i,
        // Fix person positions on the circle
        fx: CX + circleR * Math.cos(angle),
        fy: CY + circleR * Math.sin(angle),
      };
    });

    const insightNodes: InsightNode[] = insights.map((ins) => {
      // Find existing position to preserve continuity
      const existing = nodesRef.current.find(
        (n) => n.id === `insight-${ins.id}`
      );
      return {
        kind: "insight",
        id: `insight-${ins.id}`,
        insight: ins,
        // Start near the first speaker if new, otherwise keep current position
        x: existing?.x ?? personNodes.find((p) => ins.speakers.includes(p.name))?.fx ?? CX,
        y: existing?.y ?? personNodes.find((p) => ins.speakers.includes(p.name))?.fy ?? CY,
      };
    });

    const allNodes: GraphNode[] = [...personNodes, ...insightNodes];

    // --- Build links ---
    const links: GraphLink[] = [];

    // Link each insight to ALL its speakers (multi-speaker insights get pulled between them)
    for (const ins of insights) {
      for (const spk of ins.speakers) {
        links.push({
          source: `insight-${ins.id}`,
          target: `person-${spk}`,
        });
      }
    }

    nodesRef.current = allNodes;
    linksRef.current = links;

    // --- Create / update simulation ---
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = forceSimulation<GraphNode>(allNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(140)
          .strength(0.35)
      )
      .force(
        "charge",
        forceManyBody<GraphNode>()
          .strength((d) => (d.kind === "person" ? -400 : -200))
      )
      .force(
        "collide",
        forceCollide<GraphNode>()
          .radius((d) => (d.kind === "person" ? PERSON_R + 15 : 80))
          .strength(1)
          .iterations(3)
      )
      // Gentle centering pull so nothing drifts too far
      .force("x", forceX<GraphNode>(CX).strength(0.02))
      .force("y", forceY<GraphNode>(CY).strength(0.02))
      .alpha(0.6)
      .alphaDecay(0.015)
      .on("tick", () => {
        const positions = new Map<string, { x: number; y: number }>();
        for (const node of allNodes) {
          positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
        }
        setNodePositions(new Map(positions));
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [participants, insights]);

  // --- Pan & Zoom handlers ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // --- Compute viewBox ---
  const vbW = VIEW_W / zoom;
  const vbH = VIEW_H / zoom;
  const vbX = (VIEW_W - vbW) / 2 - pan.x / zoom;
  const vbY = (VIEW_H - vbH) / 2 - pan.y / zoom;

  // --- Collect connection lines for rendering ---
  const connectionLines: Array<{
    x1: number; y1: number; x2: number; y2: number;
    insightType?: InsightType;
  }> = [];

  for (const link of linksRef.current) {
    const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
    const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
    const sourcePos = nodePositions.get(sourceId);
    const targetPos = nodePositions.get(targetId);
    if (!sourcePos || !targetPos) continue;

    const sourceNode = nodesRef.current.find((n) => n.id === sourceId);
    const insightType =
      sourceNode?.kind === "insight" ? sourceNode.insight.type : undefined;

    connectionLines.push({
      x1: sourcePos.x,
      y1: sourcePos.y,
      x2: targetPos.x,
      y2: targetPos.y,
      insightType,
    });
  }

  return (
    <div className="mindmap-container">
      <svg
        className="mindmap-svg"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        xmlns="http://www.w3.org/2000/svg"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onClick={() => {
          setExpandedId(null);
        }}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
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

        {/* Connection lines */}
        {connectionLines.map((line, i) => (
            <line
              key={`link-${i}`}
              className="mindmap-stem"
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={
                line.insightType
                  ? TYPE_COLORS[line.insightType]
                  : "var(--border)"
              }
              strokeWidth={1}
              strokeOpacity={0.2}
            />
        ))}

        {/* Person nodes */}
        {participants.map((name, i) => {
          const pos = nodePositions.get(`person-${name}`);
          if (!pos) return null;
          const isActive = i === activeIndex;
          const isEli = name === "Eli";
          const r = isActive ? ACTIVE_R : PERSON_R;

          const glowR = GLOW_R + audioLevel * 20;
          const ringR = ACTIVE_R + 5 + audioLevel * 12;
          const glowOpacity = 0.15 + audioLevel * 0.35;

          return (
            <g
              key={name}
              className="mindmap-person"
              onClick={isEli && onEliClick ? (e) => { e.stopPropagation(); onEliClick(); } : undefined}
              style={isEli && onEliClick ? { cursor: "pointer" } : undefined}
            >
              {isActive && (
                <>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={glowR}
                    fill="var(--accent)"
                    opacity={glowOpacity}
                    filter="url(#mindmap-glow)"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={ringR}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    opacity={0.4 + audioLevel * 0.4}
                  />
                </>
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

        {/* Insight nodes */}
        {insights.map((ins) => {
          const pos = nodePositions.get(`insight-${ins.id}`);
          if (!pos) return null;
          const color = TYPE_COLORS[ins.type];
          const label = TYPE_LABELS[ins.type];
          const isExpanded = expandedId === ins.id;
          const displayText = isExpanded ? ins.text : truncate(ins.text, 30);

          // Wrap long expanded text into lines
          const MAX_LINE_CHARS = 35;
          const lines: string[] = [];
          if (isExpanded && displayText.length > MAX_LINE_CHARS) {
            const words = displayText.split(" ");
            let line = "";
            for (const word of words) {
              if ((line + " " + word).trim().length > MAX_LINE_CHARS) {
                lines.push(line.trim());
                line = word;
              } else {
                line = line ? line + " " + word : word;
              }
            }
            if (line.trim()) lines.push(line.trim());
          } else {
            lines.push(displayText);
          }

          const boxW = isExpanded
            ? Math.min(MAX_LINE_CHARS * 6.5 + 24, 260)
            : Math.min(displayText.length * 6.5 + 24, 200);
          const boxH = isExpanded ? 20 + lines.length * 14 + 8 : 32;

          return (
            <g
              key={ins.id}
              className={`mindmap-leaf ${isExpanded ? "expanded" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(isExpanded ? null : ins.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={pos.x - boxW / 2}
                y={pos.y - boxH / 2}
                width={boxW}
                height={boxH}
                rx={6}
                fill={isExpanded ? color + "30" : color + "18"}
                stroke={color}
                strokeWidth={isExpanded ? 1.5 : 1}
                strokeOpacity={isExpanded ? 0.8 : 0.5}
              />
              <text
                x={pos.x}
                y={pos.y - boxH / 2 + 14}
                className="mindmap-leaf-label"
                fill={color}
              >
                {label} — {ins.speakers.join(", ")}
              </text>
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={pos.x}
                  y={pos.y - boxH / 2 + 26 + li * 14}
                  className="mindmap-leaf-text"
                >
                  {line}
                </text>
              ))}
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
