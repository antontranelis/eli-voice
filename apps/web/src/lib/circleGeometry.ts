export interface NodePosition {
  x: number;
  y: number;
  angle: number;
}

/**
 * Distribute `count` nodes evenly on a circle.
 * First node at 12 o'clock, proceeding clockwise.
 */
export function distributeOnCircle(
  count: number,
  cx: number,
  cy: number,
  radius: number
): NodePosition[] {
  const positions: NodePosition[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      angle,
    });
  }
  return positions;
}
