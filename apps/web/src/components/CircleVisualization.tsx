import { useState } from "react";
import { distributeOnCircle } from "../lib/circleGeometry";

interface CircleVisualizationProps {
  participants: string[];
  activeIndex: number; // -1 in setup mode
  audioLevel?: number; // 0..1, drives the aura size
  mode: "setup" | "circle";
  onReorder?: (newOrder: string[]) => void;
  onAdd?: (name: string) => void;
  onRemove?: (name: string) => void;
  onEliClick?: () => void;
}

const VIEW_SIZE = 300;
const CX = VIEW_SIZE / 2;
const CY = VIEW_SIZE / 2;
const NODE_R = 24;
const ACTIVE_R = 28;
const GLOW_R = 34;

function getRadius(n: number): number {
  if (n <= 4) return 90;
  if (n <= 6) return 100;
  if (n <= 10) return 110;
  return 118;
}

function getNodeRadius(n: number): number {
  if (n <= 8) return NODE_R;
  if (n <= 12) return 20;
  return 17;
}

function getFontSize(n: number): number {
  if (n <= 8) return 11;
  if (n <= 12) return 9.5;
  return 8;
}

function truncateName(name: string, maxLen: number): string {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "\u2026" : name;
}

export function CircleVisualization({
  participants,
  activeIndex,
  audioLevel = 0,
  mode,
  onReorder,
  onAdd,
  onRemove,
  onEliClick,
}: CircleVisualizationProps) {
  const [addName, setAddName] = useState("");
  const [selectedForSwap, setSelectedForSwap] = useState<number | null>(null);

  const n = participants.length;
  const radius = getRadius(n);
  const nodeR = getNodeRadius(n);
  const fontSize = getFontSize(n);
  const maxNameLen = n > 10 ? 6 : 8;
  const positions = distributeOnCircle(n, CX, CY, radius);

  const staffPos = activeIndex >= 0 && activeIndex < n ? positions[activeIndex] : null;

  const handleNodeClick = (index: number) => {
    if (!onReorder) return;
    if (selectedForSwap === null) {
      setSelectedForSwap(index);
    } else {
      if (selectedForSwap !== index) {
        const newOrder = [...participants];
        [newOrder[selectedForSwap], newOrder[index]] = [newOrder[index], newOrder[selectedForSwap]];
        onReorder(newOrder);
      }
      setSelectedForSwap(null);
    }
  };

  const handleAdd = () => {
    const name = addName.trim();
    if (name && !participants.includes(name) && onAdd) {
      onAdd(name);
      setAddName("");
    }
  };

  return (
    <div className="circle-viz-container">
      <svg
        className="circle-viz"
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background ring */}
        <circle className="ring" cx={CX} cy={CY} r={radius} />

        {/* Staff glow — animated via CSS transition on <g> transform */}
        {staffPos && (() => {
          // Glow expands with audio level: base 34, up to +18 at full volume
          const glowR = GLOW_R + audioLevel * 18;
          const ringR = ACTIVE_R + 4 + audioLevel * 10;
          const glowOpacity = 0.15 + audioLevel * 0.35;
          return (
            <g
              className="staff-glow-group"
              transform={`translate(${staffPos.x}, ${staffPos.y})`}
            >
              <circle
                className="staff-glow"
                cx={0} cy={0}
                r={glowR}
                style={{ opacity: glowOpacity }}
                filter="url(#glow)"
              />
              <circle
                className="staff-glow-ring"
                cx={0} cy={0}
                r={ringR}
                style={{ opacity: 0.4 + audioLevel * 0.4 }}
              />
            </g>
          );
        })()}

        {/* Participant nodes */}
        {participants.map((name, i) => {
          const pos = positions[i];
          const isActive = i === activeIndex;
          const isEli = name === "Eli";
          const isSelected = selectedForSwap === i;
          const r = isActive ? ACTIVE_R : nodeR;

          return (
            <g
              key={name}
              className="node-group"
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => {
                if (isEli && onEliClick && selectedForSwap === null) {
                  onEliClick();
                } else {
                  handleNodeClick(i);
                }
              }}
              style={{ cursor: onReorder || (isEli && onEliClick) ? "pointer" : "default" }}
            >
              <circle
                className={[
                  "node-circle",
                  isActive && "active",
                  isEli && "eli",
                  isSelected && "selected",
                ].filter(Boolean).join(" ")}
                cx={0}
                cy={0}
                r={r}
              />
              <text
                className={[
                  "node-name",
                  isActive && "active",
                  isEli && "eli",
                ].filter(Boolean).join(" ")}
                x={0}
                y={0}
                style={{ fontSize: `${isActive ? fontSize + 1 : fontSize}px` }}
              >
                {truncateName(name, maxNameLen)}
              </text>

              {/* Remove button — setup: all non-Eli, circle: non-Eli non-active on hover */}
              {onRemove && !isEli && (mode === "setup" || !isActive) && (
                <text
                  className="node-action remove"
                  x={r + 6}
                  y={-r + 4}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(name);
                    if (selectedForSwap !== null) setSelectedForSwap(null);
                  }}
                >
                  ×
                </text>
              )}
            </g>
          );
        })}

        {/* Setup hint in center */}
        {mode === "setup" && (
          <text className="circle-hint" x={CX} y={CY} textAnchor="middle" dominantBaseline="central">
            {selectedForSwap !== null ? "Tauschpartner wählen" : "Zum Tauschen antippen"}
          </text>
        )}
      </svg>

      {/* Add participant input */}
      {onAdd && (
        <div className="circle-add-controls">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Name hinzufügen"
          />
          <button onClick={handleAdd} className="btn btn-small">+</button>
        </div>
      )}
    </div>
  );
}
