const TEXT = "#F5F0E8";

export function TapestryBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0.03,
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern id="tapestry-bg" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="10" y1="0"  x2="10" y2="20" stroke={TEXT} strokeWidth="0.8" />
            <line x1="0"  y1="5"  x2="8"  y2="5"  stroke={TEXT} strokeWidth="0.8" />
            <line x1="12" y1="5"  x2="20" y2="5"  stroke={TEXT} strokeWidth="0.8" />
            <line x1="0"  y1="15" x2="20" y2="15" stroke={TEXT} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tapestry-bg)" />
      </svg>
    </div>
  );
}
