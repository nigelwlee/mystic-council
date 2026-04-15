"use client";

import { WovenTile } from "@/components/loom/WovenTile";
import { TRADITIONS } from "@/lib/constants/traditions";
import type { Reading } from "@/components/loom/TapestryGrid";

const FG = "#F5F0E8";

export function ShareableCard({
  readings,
  name = "Nigel Lee",
  readingCount = 47,
  streakWeeks = 12,
}: {
  readings: Reading[];
  name?: string;
  readingCount?: number;
  streakWeeks?: number;
}) {
  const sampleReadings = readings.slice(-20);

  return (
    <div
      style={{
        width: 280,
        height: 400,
        background: "#080910",
        border: "1px solid rgba(245,240,232,0.14)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Tapestry strip — top ~60% */}
      <div
        style={{
          flex: "0 0 240px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(245,240,232,0.06)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(14, 1fr)",
            gap: 1.5,
            padding: "10px 10px",
          }}
        >
          {Array.from({ length: 84 }, (_, i) => {
            const reading = sampleReadings[i % sampleReadings.length];
            const opacity = 0.5 + (i % 3) * 0.2;
            return (
              <div key={i} style={{ opacity }}>
                <WovenTile
                  traditions={reading?.traditions ?? ["western"]}
                  depth={reading?.depth ?? 2}
                  size={16}
                />
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: 48,
            background: "linear-gradient(transparent, #080910)",
          }}
        />
      </div>

      {/* Card text */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 16px 16px",
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 26,
            fontWeight: 700,
            color: FG,
            letterSpacing: "0.02em",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 10,
            color: "rgba(245,240,232,0.45)",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          {readingCount} readings · {streakWeeks}-week streak
        </div>
        <div style={{ marginTop: 4, display: "flex", gap: 3 }}>
          {TRADITIONS.slice(0, 5).map((t) => (
            <div
              key={t.id}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: t.hex,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: "auto",
            fontFamily: "var(--font-geist-sans)",
            fontSize: 8,
            letterSpacing: "0.18em",
            color: "rgba(245,240,232,0.20)",
            textTransform: "uppercase",
          }}
        >
          Mystic Council
        </div>
      </div>
    </div>
  );
}
