"use client";

import { useEffect, useRef, useState } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG = "#0A0B14";
const TEXT = "#F5F0E8";

const TRADITION_COLORS: Record<string, string> = {
  western: "#8B7EC8",
  chinese: "#C8846E",
  vedic: "#C8A96E",
  tarot: "#6E8BC8",
  numerology: "#7EC89A",
  oracle: "#BFA882",
};

const TRADITION_NAMES: Record<string, string> = {
  western: "Western Astrology",
  chinese: "Chinese Astrology",
  vedic: "Vedic Jyotish",
  tarot: "Tarot",
  numerology: "Numerology",
  oracle: "Oracle",
};

const TRADITION_SYMBOLS: Record<string, string> = {
  western: "✦",
  chinese: "☯",
  vedic: "ॐ",
  tarot: "🜂",
  numerology: "∞",
  oracle: "◎",
};

const WARP_THREADS = [
  { id: "birth", label: "Birth", color: "rgba(245,240,232,0.8)" },
  { id: "calendar", label: "Calendar", color: "rgba(139,126,200,0.7)" },
  { id: "journal", label: "Journal", color: "rgba(200,169,110,0.7)" },
  { id: "health", label: "Health", color: "rgba(126,200,154,0.7)" },
];

const TRADITIONS = ["western", "chinese", "vedic", "tarot", "numerology"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeftThread {
  id: string;
  color: string;
  progress: number; // 0–1, how far across the warp threads the weft has been woven
  isOracle?: boolean;
}

// ─── LoomBar SVG Component ────────────────────────────────────────────────────
// Self-contained SVG showing warp threads (vertical) + weft threads (horizontal, animated)

function LoomBar({
  warpThreads,
  weftThreads,
  width = 600,
  height = 80,
}: {
  warpThreads: typeof WARP_THREADS;
  weftThreads: WeftThread[];
  width?: number;
  height?: number;
}) {
  const paddingX = 20;
  const paddingY = 14;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  // Distribute warp threads evenly across the inner width
  const warpCount = warpThreads.length;
  const warpSpacing = innerWidth / (warpCount - 1);

  // Weft threads are stacked vertically, leaving room for labels at bottom
  const labelAreaHeight = 18;
  const weftAreaHeight = innerHeight - labelAreaHeight;
  const maxWefts = 6; // max displayable weft rows
  const weftSpacing = weftAreaHeight / (maxWefts + 1);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loom — warp and weft threads"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Warp threads — vertical lines running full height */}
      {warpThreads.map((warp, i) => {
        const x = paddingX + i * warpSpacing;
        return (
          <g key={warp.id}>
            <line
              x1={x}
              y1={paddingY}
              x2={x}
              y2={paddingY + weftAreaHeight}
              stroke={warp.color}
              strokeWidth={1}
            />
            {/* Thread label */}
            <text
              x={x}
              y={height - 4}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "6.5px",
                fill: TEXT,
                fillOpacity: 0.28,
                letterSpacing: "0.06em",
              }}
            >
              {warp.label}
            </text>
          </g>
        );
      })}

      {/* Weft threads — horizontal lines weaving over/under warp threads */}
      {weftThreads.map((weft, weftIndex) => {
        const y = paddingY + weftSpacing * (weftIndex + 1);
        const strokeW = weft.isOracle ? 2 : 1;
        // How far the weft has traveled: progress 0–1 maps to paddingX → paddingX + innerWidth
        const weftEndX = paddingX + weft.progress * innerWidth;

        // Build the over/under weave path
        // For each warp thread the weft passes, alternate over (continuous) and under (gap)
        const segments: React.ReactNode[] = [];
        let currentX = paddingX;

        for (let i = 0; i < warpCount; i++) {
          const warpX = paddingX + i * warpSpacing;
          const isOver = (i + weftIndex) % 2 === 0;
          const gapHalf = 3; // half-width of the under-gap

          if (weftEndX < warpX) break; // weft hasn't reached this warp yet

          if (isOver) {
            // Draw continuous line from currentX to past this warp
            const segEnd = Math.min(weftEndX, warpX + gapHalf);
            segments.push(
              <line
                key={`seg-${weftIndex}-${i}-over`}
                x1={currentX}
                y1={y}
                x2={segEnd}
                y2={y}
                stroke={weft.color}
                strokeWidth={strokeW}
                strokeOpacity={0.65}
              />
            );
            currentX = segEnd;
          } else {
            // Draw to gap start, skip the crossing, continue from gap end
            const gapStart = Math.max(currentX, warpX - gapHalf);
            const gapEnd = warpX + gapHalf;

            if (gapStart > currentX) {
              segments.push(
                <line
                  key={`seg-${weftIndex}-${i}-pre`}
                  x1={currentX}
                  y1={y}
                  x2={gapStart}
                  y2={y}
                  stroke={weft.color}
                  strokeWidth={strokeW}
                  strokeOpacity={0.65}
                />
              );
            }
            // Skip the gap (warp thread passes on top here)
            currentX = Math.min(weftEndX, gapEnd);
          }
        }

        // Draw any remaining segment after the last warp
        if (currentX < weftEndX) {
          segments.push(
            <line
              key={`seg-${weftIndex}-tail`}
              x1={currentX}
              y1={y}
              x2={weftEndX}
              y2={y}
              stroke={weft.color}
              strokeWidth={strokeW}
              strokeOpacity={0.65}
            />
          );
        }

        return <g key={weft.id}>{segments}</g>;
      })}

      {/* Weft thread progress tip — a small dot at the leading edge for in-progress threads */}
      {weftThreads
        .filter((w) => w.progress > 0 && w.progress < 1)
        .map((weft, weftIndex) => {
          const y =
            paddingY +
            weftSpacing * (weftThreads.findIndex((w) => w.id === weft.id) + 1);
          const tipX = paddingX + weft.progress * innerWidth;
          return (
            <circle
              key={`tip-${weft.id}`}
              cx={tipX}
              cy={y}
              r={2}
              fill={weft.color}
              opacity={0.9}
            />
          );
        })}
    </svg>
  );
}

// ─── Background tapestry pattern ──────────────────────────────────────────────

function TapestryBackground() {
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
          <pattern
            id="tapestry"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            {/* Vertical warp */}
            <line
              x1="10"
              y1="0"
              x2="10"
              y2="20"
              stroke={TEXT}
              strokeWidth="0.8"
            />
            {/* Horizontal weft — alternating over/under */}
            <line
              x1="0"
              y1="5"
              x2="8"
              y2="5"
              stroke={TEXT}
              strokeWidth="0.8"
            />
            <line
              x1="12"
              y1="5"
              x2="20"
              y2="5"
              stroke={TEXT}
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="15"
              x2="20"
              y2="15"
              stroke={TEXT}
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tapestry)" />
      </svg>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Nav({ showTapestryLink = true }: { showTapestryLink?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 0",
        borderBottom: "1px solid rgba(245,240,232,0.06)",
        marginBottom: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: TEXT,
          opacity: 0.55,
        }}
      >
        Mystic Council
      </span>
      {showTapestryLink && (
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEXT,
            opacity: 0.3,
            cursor: "pointer",
            borderBottom: "1px solid rgba(245,240,232,0.15)",
            paddingBottom: 1,
          }}
        >
          Your Tapestry →
        </span>
      )}
    </div>
  );
}

function Rule({
  opacity = 0.12,
  style,
}: {
  opacity?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: TEXT,
        opacity,
        width: "100%",
        ...style,
      }}
    />
  );
}

function SmallLabel({
  children,
  opacity = 0.3,
  italic = false,
  centered = false,
}: {
  children: React.ReactNode;
  opacity?: number;
  italic?: boolean;
  centered?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 8,
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: TEXT,
        opacity,
        fontStyle: italic ? "italic" : "normal",
        display: "block",
        textAlign: centered ? "center" : "left",
      }}
    >
      {children}
    </span>
  );
}

function ExpertCard({
  tradition,
  text,
  pending = false,
}: {
  tradition: string;
  text?: string;
  pending?: boolean;
}) {
  const color = TRADITION_COLORS[tradition];
  const symbol = TRADITION_SYMBOLS[tradition];
  const name = TRADITION_NAMES[tradition];

  return (
    <div
      style={{
        borderTop: "1px solid rgba(245,240,232,0.08)",
        borderRight: "1px solid rgba(245,240,232,0.08)",
        borderBottom: "1px solid rgba(245,240,232,0.08)",
        borderLeft: `2px solid ${color}`,
        padding: "20px 22px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: pending ? 0 : 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color,
            opacity: 0.85,
            fontFamily: "var(--font-geist-sans)",
          }}
        >
          {symbol}
        </span>
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
            color: TEXT,
            opacity: 0.45,
          }}
        >
          {name}
        </span>

        {pending && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <BreathingDots color={color} />
          </div>
        )}
      </div>

      {!pending && text && (
        <p
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 17,
            lineHeight: 1.7,
            color: TEXT,
            opacity: 0.88,
            margin: 0,
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

function BreathingDots({ color }: { color: string }) {
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
            animation: `breathe 1.4s ease-in-out ${i * 0.22}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Content column (max-width 600, centered) ─────────────────────────────────

function ContentColumn({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "0 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Loom bar wrapper — persistent strip ─────────────────────────────────────

function LoomBarSection({
  weftThreads,
  statusLabel,
}: {
  weftThreads: WeftThread[];
  statusLabel: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(245,240,232,0.06)",
        paddingTop: 12,
        paddingBottom: 8,
      }}
    >
      <LoomBar warpThreads={WARP_THREADS} weftThreads={weftThreads} />
      <div style={{ marginTop: 6 }}>{statusLabel}</div>
    </div>
  );
}

// ─── SCREEN A: Question Entry ─────────────────────────────────────────────────

function ScreenA() {
  const questionPrompts = [
    "What is asking to be released?",
    "Where am I resisting my own pattern?",
    "What does this season want from me?",
    "What thread am I refusing to follow?",
  ];

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: BG,
        overflow: "hidden",
      }}
    >
      <TapestryBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <ContentColumn>
          <Nav />

          {/* Loom bar — no weft threads yet */}
          <LoomBarSection
            weftThreads={[]}
            statusLabel={
              <SmallLabel opacity={0.3}>
                4 threads · 13 readings woven
              </SmallLabel>
            }
          />

          {/* Question area */}
          <div style={{ paddingTop: 56, paddingBottom: 80 }}>
            <h1
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontSize: "clamp(28px, 5vw, 38px)",
                fontWeight: 300,
                color: TEXT,
                opacity: 0.45,
                margin: "0 0 32px",
                lineHeight: 1.3,
              }}
            >
              What do you seek to understand?
            </h1>

            {/* Textarea — bottom border only */}
            <div style={{ position: "relative" }}>
              <textarea
                placeholder="Ask freely. The Council listens without judgment."
                rows={4}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(245,240,232,0.18)",
                  outline: "none",
                  resize: "none",
                  fontFamily: "var(--font-cormorant)",
                  fontSize: 22,
                  lineHeight: 1.6,
                  color: TEXT,
                  padding: "4px 0 12px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Quick prompts */}
            <div style={{ marginTop: 20, marginBottom: 36 }}>
              <SmallLabel opacity={0.22}>Or begin with</SmallLabel>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {questionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(245,240,232,0.14)",
                      borderRadius: 0,
                      padding: "6px 12px",
                      fontFamily: "var(--font-cormorant)",
                      fontStyle: "italic",
                      fontSize: 14,
                      color: TEXT,
                      opacity: 0.5,
                      cursor: "pointer",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              style={{
                border: "1px solid rgba(245,240,232,0.28)",
                borderRadius: 0,
                background: "transparent",
                padding: "12px 28px",
                fontFamily: "var(--font-geist-sans)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: TEXT,
                opacity: 0.7,
                cursor: "pointer",
              }}
            >
              Weave this question into the Council
            </button>
          </div>
        </ContentColumn>
      </div>
    </div>
  );
}

// ─── SCREEN B: Reading in Progress ───────────────────────────────────────────

function ScreenB() {
  // 3 complete, 2 in progress
  const weftThreads: WeftThread[] = [
    { id: "western", color: `${TRADITION_COLORS.western}99`, progress: 1 },
    { id: "chinese", color: `${TRADITION_COLORS.chinese}99`, progress: 1 },
    { id: "vedic", color: `${TRADITION_COLORS.vedic}99`, progress: 1 },
    { id: "tarot", color: `${TRADITION_COLORS.tarot}99`, progress: 0.45 },
    { id: "numerology", color: `${TRADITION_COLORS.numerology}99`, progress: 0.2 },
  ];

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: BG,
        overflow: "hidden",
      }}
    >
      <TapestryBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <ContentColumn>
          <Nav />

          {/* Loom bar — partial weave */}
          <LoomBarSection
            weftThreads={weftThreads}
            statusLabel={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <SmallLabel opacity={0.3}>
                  The Council weaves your answer.
                </SmallLabel>
                <span
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 8,
                    color: TEXT,
                    opacity: 0.25,
                    letterSpacing: "0.06em",
                  }}
                >
                  3 / 5 traditions
                </span>
              </div>
            }
          />

          <div style={{ paddingTop: 40, paddingBottom: 80 }}>
            {/* User's question — dimmed */}
            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontSize: 18,
                lineHeight: 1.6,
                color: TEXT,
                opacity: 0.38,
                margin: "0 0 32px",
              }}
            >
              "What should I do with the tension between where I am and where I
              feel I should be?"
            </p>

            <Rule opacity={0.07} />

            {/* Completed expert cards */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                marginTop: 24,
              }}
            >
              <ExpertCard
                tradition="western"
                text="Saturn currently transits your natal Sun — a compression that is not punishment but instruction. The tension you feel is the loom tightening. This phase will not release until you name, precisely, what you are weaving toward. Vagueness is the only real obstacle."
              />
              <ExpertCard
                tradition="chinese"
                text="The year of the Wood Dragon brings upheaval to those who cling to the shape of last season. What you experience as tension is the Dragon testing the thread for weakness. There is none — only the pulling sensation of genuine growth. Continue. The pattern requires your presence, not your certainty."
              />
              <ExpertCard
                tradition="vedic"
                text="Your Rahu in the 10th house has been pulling at your dharma since your last return cycle. The dissonance is not a sign of wrong direction — it is the mark of a thread that carries unusual weight. Jyotish counsels patience with the loom's timing: your pattern requires more weft before the figure emerges."
              />

              {/* Pending traditions */}
              <ExpertCard tradition="tarot" pending />
              <ExpertCard tradition="numerology" pending />
            </div>
          </div>
        </ContentColumn>
      </div>
    </div>
  );
}

// ─── SCREEN C: Reading Complete + Oracle ─────────────────────────────────────

function ScreenC() {
  // All 5 complete + oracle
  const weftThreads: WeftThread[] = [
    { id: "western", color: `${TRADITION_COLORS.western}99`, progress: 1 },
    { id: "chinese", color: `${TRADITION_COLORS.chinese}99`, progress: 1 },
    { id: "vedic", color: `${TRADITION_COLORS.vedic}99`, progress: 1 },
    { id: "tarot", color: `${TRADITION_COLORS.tarot}99`, progress: 1 },
    { id: "numerology", color: `${TRADITION_COLORS.numerology}99`, progress: 1 },
    {
      id: "oracle",
      color: `${TRADITION_COLORS.oracle}CC`,
      progress: 1,
      isOracle: true,
    },
  ];

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: BG,
        overflow: "hidden",
      }}
    >
      <TapestryBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <ContentColumn>
          <Nav />

          {/* Loom bar — complete row */}
          <LoomBarSection
            weftThreads={weftThreads}
            statusLabel={
              <SmallLabel opacity={0.35} italic>
                Row 14 complete. Your tapestry grows.
              </SmallLabel>
            }
          />

          <div style={{ paddingTop: 40, paddingBottom: 100 }}>
            {/* User's question */}
            <p
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontSize: 18,
                lineHeight: 1.6,
                color: TEXT,
                opacity: 0.35,
                margin: "0 0 32px",
              }}
            >
              "What should I do with the tension between where I am and where I
              feel I should be?"
            </p>

            <Rule opacity={0.07} />

            {/* All expert cards */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                marginTop: 24,
                marginBottom: 48,
              }}
            >
              <ExpertCard
                tradition="western"
                text="Saturn currently transits your natal Sun — a compression that is not punishment but instruction. The tension you feel is the loom tightening. This phase will not release until you name, precisely, what you are weaving toward. Vagueness is the only real obstacle."
              />
              <ExpertCard
                tradition="chinese"
                text="The year of the Wood Dragon brings upheaval to those who cling to the shape of last season. What you experience as tension is the Dragon testing the thread for weakness. There is none — only the pulling sensation of genuine growth. Continue. The pattern requires your presence, not your certainty."
              />
              <ExpertCard
                tradition="vedic"
                text="Your Rahu in the 10th house has been pulling at your dharma since your last return cycle. The dissonance is not a sign of wrong direction — it is the mark of a thread that carries unusual weight. Jyotish counsels patience with the loom's timing: your pattern requires more weft before the figure emerges."
              />
              <ExpertCard
                tradition="tarot"
                text="The Hanged Man — a voluntary suspension. The figure does not fall; it has chosen to pause mid-weave to see the pattern from an inverted angle. The card is not stasis. It is the radical act of non-action as a form of perception. What becomes visible when you stop pulling at the thread?"
              />
              <ExpertCard
                tradition="numerology"
                text="You are in a 7 personal year — the year of withdrawal, inner knowing, and spiritual excavation. The number 7 does not produce visible harvest; it deepens the root. The discomfort you feel is the root seeking water in unfamiliar soil. This is exactly as it should be. Do not mistake depth for distance."
              />
            </div>

            {/* Oracle section */}
            <div
              style={{
                borderTop: "1px solid rgba(245,240,232,0.08)",
                paddingTop: 40,
              }}
            >
              {/* Oracle header */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 28,
                }}
              >
                <SmallLabel opacity={0.4} centered>
                  ◎&nbsp;&nbsp;The Oracle
                </SmallLabel>
              </div>

              <Rule opacity={0.1} />

              {/* Oracle text */}
              <div
                style={{
                  marginTop: 32,
                  marginBottom: 44,
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: 21,
                    lineHeight: 1.85,
                    color: TEXT,
                    opacity: 0.92,
                    margin: 0,
                  }}
                >
                  <em style={{ fontStyle: "italic", fontWeight: 700 }}>
                    You are not lost — you are in gestation.
                  </em>{" "}
                  The tension you carry between where you stand and where you
                  feel you should be is not a problem to solve. It is the precise
                  sensation of a thread under tension — the only condition under
                  which weaving is possible. Slack threads make no fabric.
                </p>

                <p
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: 21,
                    lineHeight: 1.85,
                    color: TEXT,
                    opacity: 0.82,
                    margin: 0,
                  }}
                >
                  Five traditions have read this thread independently and
                  converged on one thing: the figure is not yet visible because
                  the weave is still being made. Saturn compresses, the Dragon
                  tests, Rahu pulls, the Hanged Man suspends, the 7 deepens —
                  all five are counsel to stop measuring yourself against an
                  imagined finished cloth. The selvedge has not been reached.
                </p>

                <p
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: 21,
                    lineHeight: 1.85,
                    color: TEXT,
                    opacity: 0.72,
                    margin: 0,
                  }}
                >
                  What is asked of you now is not action but clarification:{" "}
                  <em>what are you actually weaving toward?</em> Not the life
                  that looks correct from outside, but the specific, particular
                  thing that only your thread can make. Name it without apology.
                  The loom will hold the tension. It always does.
                </p>
              </div>

              {/* Oracle symbol — thread cross */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 40,
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                >
                  {/* Vertical thread — passes over */}
                  <line
                    x1="16"
                    y1="2"
                    x2="16"
                    y2="30"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="1"
                    strokeOpacity="0.45"
                  />
                  {/* Horizontal thread — under in center */}
                  <line
                    x1="2"
                    y1="16"
                    x2="12"
                    y2="16"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="1"
                    strokeOpacity="0.45"
                  />
                  <line
                    x1="20"
                    y1="16"
                    x2="30"
                    y2="16"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="1"
                    strokeOpacity="0.45"
                  />
                  {/* Corner ticks */}
                  <line
                    x1="11"
                    y1="2"
                    x2="21"
                    y2="2"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="0.5"
                    strokeOpacity="0.2"
                  />
                  <line
                    x1="11"
                    y1="30"
                    x2="21"
                    y2="30"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="0.5"
                    strokeOpacity="0.2"
                  />
                  <line
                    x1="2"
                    y1="11"
                    x2="2"
                    y2="21"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="0.5"
                    strokeOpacity="0.2"
                  />
                  <line
                    x1="30"
                    y1="11"
                    x2="30"
                    y2="21"
                    stroke={TRADITION_COLORS.oracle}
                    strokeWidth="0.5"
                    strokeOpacity="0.2"
                  />
                </svg>
              </div>

              <Rule opacity={0.07} />

              {/* Post-oracle link */}
              <div style={{ marginTop: 20, marginBottom: 40 }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: TEXT,
                    opacity: 0.3,
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(245,240,232,0.12)",
                    paddingBottom: 1,
                  }}
                >
                  This reading has been woven into your tapestry. →
                </span>
              </div>

              {/* Follow-up input */}
              <div>
                <textarea
                  placeholder="Continue the inquiry…"
                  rows={3}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(245,240,232,0.14)",
                    outline: "none",
                    resize: "none",
                    fontFamily: "var(--font-cormorant)",
                    fontStyle: "italic",
                    fontSize: 18,
                    color: TEXT,
                    opacity: 0.45,
                    padding: "4px 0 10px",
                    lineHeight: 1.65,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </ContentColumn>
      </div>
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(245,240,232,0.03)",
        borderTop: "1px solid rgba(245,240,232,0.06)",
        borderBottom: "1px solid rgba(245,240,232,0.06)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(245,240,232,0.06)" }} />
      <span
        style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 7,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: TEXT,
          opacity: 0.18,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: "rgba(245,240,232,0.06)" }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReadingWeavePage() {
  return (
    <>
      {/* Inject keyframe for breathing dots */}
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 0.9; transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          position: "relative",
          left: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          width: "100vw",
          backgroundColor: BG,
          color: TEXT,
        }}
      >
        {/* Screen A: Question Entry */}
        <ScreenA />

        <SectionDivider label="Screen B — Reading in progress" />

        {/* Screen B: Reading in Progress */}
        <ScreenB />

        <SectionDivider label="Screen C — Reading complete + Oracle" />

        {/* Screen C: Complete + Oracle */}
        <ScreenC />
      </div>
    </>
  );
}
