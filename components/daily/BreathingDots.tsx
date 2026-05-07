"use client";

export function BreathingDots() {
  return (
    <span
      aria-label="Loading"
      style={{ display: "inline-flex", gap: 5, alignItems: "center" }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: "rgba(191,168,130,0.8)",
            animation: "breathe 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes breathe {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}
