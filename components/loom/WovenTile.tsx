import { TRADITION_MAP, type TraditionId } from "@/lib/constants/traditions";

export function WovenTile({
  traditions,
  depth,
  isRichest,
  size = 20,
}: {
  traditions: TraditionId[];
  depth: number;
  isRichest?: boolean;
  size?: number;
}) {
  const warpCount = Math.max(3, Math.min(6, depth + 1));
  const weftCount = Math.max(3, Math.min(6, depth + 1));
  const warpW = size / warpCount;
  const weftH = size / weftCount;
  const colors = traditions.map((id) => TRADITION_MAP[id].hex);
  const warpBaseColor = traditions[0] ? TRADITION_MAP[traditions[0]].hex : "#888";
  const elements: React.ReactNode[] = [];

  // Warp stripes (background)
  for (let col = 0; col < warpCount; col++) {
    elements.push(
      <rect
        key={`warp-${col}`}
        x={col * warpW} y={0}
        width={warpW - 0.8} height={size}
        fill={warpBaseColor} opacity={0.18}
      />
    );
  }

  // Weft with interlacing
  for (let row = 0; row < weftCount; row++) {
    const y = row * weftH;
    const color = colors[row % colors.length];
    const weftOpacity = 0.75 + (row % 2) * 0.1;

    for (let col = 0; col < warpCount; col++) {
      const x = col * warpW;
      const isOver = (col + row) % 2 === 0;

      if (isOver) {
        elements.push(
          <rect
            key={`weft-${row}-${col}`}
            x={x} y={y} width={warpW} height={weftH - 0.5}
            fill={color} opacity={weftOpacity} rx={0}
          />
        );
      } else {
        elements.push(
          <rect
            key={`warp-over-${row}-${col}`}
            x={x + warpW * 0.2} y={y}
            width={warpW * 0.6} height={weftH - 0.5}
            fill={warpBaseColor} opacity={0.55}
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      <rect width={size} height={size} fill="#0D0E1A" />
      {elements}
      {isRichest && (
        <rect x={0} y={0} width={size} height={size} fill="none" stroke="#F5F0E8" strokeWidth={1.2} opacity={0.7} />
      )}
    </svg>
  );
}
