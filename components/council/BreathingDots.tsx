"use client";

export function BreathingDots({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            backgroundColor: color,
            animation: `breathe-scale 1.4s ease-in-out ${i * 0.22}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
