"use client";

import { useMemo, useState, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const BG = "#0A0B14";
const FG = "#F5F0E8";

const TRADITIONS = [
  { id: "western",     label: "Western Astrology",  hex: "#8B7EC8", shortLabel: "Western" },
  { id: "chinese",     label: "Chinese Astrology",  hex: "#C8846E", shortLabel: "Chinese" },
  { id: "vedic",       label: "Vedic Astrology",    hex: "#C8A96E", shortLabel: "Vedic" },
  { id: "tarot",       label: "Tarot",              hex: "#6E8BC8", shortLabel: "Tarot" },
  { id: "numerology",  label: "Numerology",         hex: "#7EC89A", shortLabel: "Numerology" },
  { id: "oracle",      label: "Oracle",             hex: "#BFA882", shortLabel: "Oracle" },
] as const;

type TraditionId = (typeof TRADITIONS)[number]["id"];

const TRADITION_MAP = Object.fromEntries(
  TRADITIONS.map((t) => [t.id, t])
) as Record<TraditionId, (typeof TRADITIONS)[number]>;

// Seeded PRNG — deterministic so it doesn't flicker on render
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Data generation ──────────────────────────────────────────────────────────

interface Reading {
  week: number;          // 0-51
  date: Date;
  question: string;
  traditions: TraditionId[];
  depth: number;         // 1-6 (num traditions)
  isRichest?: boolean;
}

const QUESTIONS = [
  "What energy surrounds my career path?",
  "How can I strengthen my closest relationship?",
  "What does this transition mean for my future?",
  "Where should I direct my creative energy?",
  "What is blocking my sense of peace?",
  "How do I navigate this crossroads?",
  "What does the coming season hold?",
  "What am I not seeing clearly?",
  "How can I honor my deeper purpose?",
  "What does this loss want to teach me?",
  "Where is my energy best placed right now?",
  "What pattern am I repeating?",
  "How can I open to new beginnings?",
  "What should I release before moving forward?",
  "What is the nature of this connection?",
];

function generateReadings(): Reading[] {
  const rng = seededRng(0xdeadbeef);
  const readings: Reading[] = [];
  const startDate = new Date("2025-03-02");
  let totalReadings = 0;

  for (let w = 0; w < 52; w++) {
    // Probability of having a reading in a given week, weighted toward recent weeks
    const recencyBoost = w / 52;
    const hasSomeActivity = rng() < 0.6 + recencyBoost * 0.3;
    if (!hasSomeActivity && w < 48) continue;

    // How many readings this week (1-3)
    const countRoll = rng();
    const count = countRoll < 0.55 ? 1 : countRoll < 0.85 ? 2 : 3;

    for (let r = 0; r < count; r++) {
      // Pick 1-5 traditions, weighted toward 2-3
      const depthRoll = rng();
      const depth =
        depthRoll < 0.15 ? 1 :
        depthRoll < 0.40 ? 2 :
        depthRoll < 0.70 ? 3 :
        depthRoll < 0.88 ? 4 :
        depthRoll < 0.96 ? 5 : 6;

      // Shuffle and pick 'depth' traditions; western always included for high depth
      const shuffled = [...TRADITIONS].sort(() => rng() - 0.5);
      const picked = shuffled.slice(0, depth).map((t) => t.id) as TraditionId[];

      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + w * 7 + Math.floor(rng() * 7));

      readings.push({
        week: w,
        date: weekDate,
        question: QUESTIONS[Math.floor(rng() * QUESTIONS.length)],
        traditions: picked,
        depth,
      });

      totalReadings++;
    }
  }

  // Mark the richest reading
  let richest = readings[0];
  for (const r of readings) {
    if (r.depth > richest.depth) richest = r;
  }
  richest.isRichest = true;

  return readings;
}

// ─── Woven tile SVG generation ────────────────────────────────────────────────

// Renders a small woven textile tile as an SVG path group.
// Warp threads run vertical, weft threads horizontal.
// The over/under interlacing is what makes it look woven.

function WovenTile({
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
  // We'll draw a grid of warp (vertical) and weft (horizontal) segments
  // Warp threads: rendered as thin vertical stripes (~2px wide)
  // Weft threads: rendered as horizontal stripes that go over/under warps
  // The interlacing creates the woven appearance

  const warpCount = Math.max(3, Math.min(6, depth + 1));
  const weftCount = Math.max(3, Math.min(6, depth + 1));

  const warpW = size / warpCount;
  const weftH = size / weftCount;

  // Tradition colors for weft threads
  const colors = traditions.map((id) => TRADITION_MAP[id].hex);

  // Warp color: very dark base with a hint of the primary tradition
  const warpBaseColor = traditions[0] ? TRADITION_MAP[traditions[0]].hex : "#888";

  const elements: React.ReactNode[] = [];

  // Draw warp threads (background vertical stripes)
  for (let col = 0; col < warpCount; col++) {
    const x = col * warpW;
    elements.push(
      <rect
        key={`warp-${col}`}
        x={x}
        y={0}
        width={warpW - 0.8}
        height={size}
        fill={warpBaseColor}
        opacity={0.18}
      />
    );
  }

  // Draw weft threads with interlacing (over/under pattern)
  for (let row = 0; row < weftCount; row++) {
    const y = row * weftH;
    const color = colors[row % colors.length];
    const weftOpacity = 0.75 + (row % 2) * 0.1;

    // Each weft row is broken into segments: one per warp column
    // Alternating columns are "over" (drawn) vs "under" (warp shows through)
    for (let col = 0; col < warpCount; col++) {
      const x = col * warpW;
      // Interlace: checkerboard offset by row parity
      const isOver = (col + row) % 2 === 0;

      if (isOver) {
        // Weft is over the warp — draw the weft color
        elements.push(
          <rect
            key={`weft-${row}-${col}`}
            x={x}
            y={y}
            width={warpW}
            height={weftH - 0.5}
            fill={color}
            opacity={weftOpacity}
            rx={0}
          />
        );
      } else {
        // Warp is over the weft — draw a narrow warp segment on top
        elements.push(
          <rect
            key={`warp-over-${row}-${col}`}
            x={x + warpW * 0.2}
            y={y}
            width={warpW * 0.6}
            height={weftH - 0.5}
            fill={warpBaseColor}
            opacity={0.55}
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width={size} height={size} fill="#0D0E1A" />
      {elements}
      {isRichest && (
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          fill="none"
          stroke="#F5F0E8"
          strokeWidth={1.2}
          opacity={0.7}
        />
      )}
    </svg>
  );
}

// ─── Tapestry Grid ────────────────────────────────────────────────────────────

// Displays the full year grid. Each column = one week. Multiple readings/week
// stack vertically. Empty weeks show a placeholder.

const CELL = 22;     // px per cell
const GAP  = 2;      // px gap between cells
const STEP = CELL + GAP;

function TapestryGrid({ readings }: { readings: Reading[] }) {
  const NUM_WEEKS = 52;
  const MAX_ROWS = 3; // max stacked readings in one week cell

  // Group readings by week
  const byWeek = useMemo(() => {
    const map: Record<number, Reading[]> = {};
    for (const r of readings) {
      if (!map[r.week]) map[r.week] = [];
      map[r.week].push(r);
    }
    return map;
  }, [readings]);

  // Month label positions
  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    const start = new Date("2025-03-02");
    let lastMonth = -1;
    for (let w = 0; w < NUM_WEEKS; w++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7);
      const m = d.getMonth();
      if (m !== lastMonth) {
        labels.push({
          week: w,
          label: d.toLocaleString("en-US", { month: "short" }),
        });
        lastMonth = m;
      }
    }
    return labels;
  }, []);

  const svgW = NUM_WEEKS * STEP - GAP;
  const svgH = MAX_ROWS * STEP - GAP;

  return (
    <div style={{ width: "100%", overflowX: "auto", overflowY: "visible" }}>
      {/* Label */}
      <div
        style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 9,
          letterSpacing: "0.2em",
          color: `rgba(245,240,232,0.30)`,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        One Year of Readings
      </div>

      {/* Grid */}
      <div style={{ position: "relative", minWidth: svgW }}>
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          {Array.from({ length: NUM_WEEKS }, (_, w) => {
            const weekReadings = byWeek[w] ?? [];
            const isEmpty = weekReadings.length === 0;
            const x = w * STEP;

            if (isEmpty) {
              // Empty week: very faint placeholder column
              return (
                <g key={w}>
                  {Array.from({ length: MAX_ROWS }, (_, row) => {
                    const y = row * STEP;
                    return (
                      <rect
                        key={row}
                        x={x}
                        y={y}
                        width={CELL}
                        height={CELL}
                        fill="none"
                        stroke={`rgba(245,240,232,0.05)`}
                        strokeWidth={0.5}
                      />
                    );
                  })}
                </g>
              );
            }

            return (
              <g key={w}>
                {weekReadings.slice(0, MAX_ROWS).map((reading, row) => {
                  const y = row * STEP;
                  // Render as a foreignObject with our React SVG tile
                  return (
                    <foreignObject key={row} x={x} y={y} width={CELL} height={CELL}>
                      <WovenTile
                        traditions={reading.traditions}
                        depth={reading.depth}
                        isRichest={reading.isRichest}
                        size={CELL}
                      />
                    </foreignObject>
                  );
                })}
                {/* Faint placeholders for unfilled rows */}
                {weekReadings.length < MAX_ROWS &&
                  Array.from(
                    { length: MAX_ROWS - weekReadings.length },
                    (_, i) => {
                      const row = weekReadings.length + i;
                      const y = row * STEP;
                      return (
                        <rect
                          key={`empty-${row}`}
                          x={x}
                          y={y}
                          width={CELL}
                          height={CELL}
                          fill="none"
                          stroke={`rgba(245,240,232,0.05)`}
                          strokeWidth={0.5}
                        />
                      );
                    }
                  )}
              </g>
            );
          })}
        </svg>

        {/* Month labels below */}
        <div style={{ position: "relative", height: 20, marginTop: 6, minWidth: svgW }}>
          {monthLabels.map(({ week, label }) => (
            <span
              key={label}
              style={{
                position: "absolute",
                left: week * STEP,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 9,
                color: `rgba(245,240,232,0.22)`,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shareable Card Preview ───────────────────────────────────────────────────

function ShareableCard({ readings }: { readings: Reading[] }) {
  // Sample ~20 random readings for the card's mini-tapestry
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
      {/* Tapestry strip — takes up top ~60% */}
      <div
        style={{
          flex: "0 0 240px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(245,240,232,0.06)",
        }}
      >
        {/* Mini woven grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(14, 1fr)`,
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

        {/* Fade overlay at the bottom of the tapestry section */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            background: `linear-gradient(transparent, #080910)`,
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
          Nigel Lee
        </div>
        <div
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 10,
            color: `rgba(245,240,232,0.45)`,
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          47 readings · 12-week streak
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
            color: `rgba(245,240,232,0.20)`,
            textTransform: "uppercase",
          }}
        >
          Mystic Council
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TapestryPage() {
  const readings = useMemo(() => generateReadings(), []);
  const [shareHovered, setShareHovered] = useState(false);
  const [connectHovered, setConnectHovered] = useState(false);
  const [viewAllHovered, setViewAllHovered] = useState(false);
  const [cardShareHovered, setCardShareHovered] = useState(false);

  const recentReadings = useMemo(() => {
    return [...readings]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);
  }, [readings]);

  const THREADS = [
    { id: "western" as TraditionId,    label: "Western Astrology",  lastWoven: "4 days ago",  active: true },
    { id: "vedic" as TraditionId,      label: "Vedic Astrology",    lastWoven: "12 days ago", active: true },
    { id: "tarot" as TraditionId,      label: "Tarot",              lastWoven: "1 day ago",   active: true },
    { id: "numerology" as TraditionId, label: "Numerology",         lastWoven: "3 weeks ago", active: true },
    { id: "chinese" as TraditionId,    label: "Chinese Astrology",  lastWoven: "–",           active: false },
  ];

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const s = {
    label: {
      fontFamily: "var(--font-geist-sans)" as const,
      fontSize: 9,
      letterSpacing: "0.2em",
      color: `rgba(245,240,232,0.30)`,
      textTransform: "uppercase" as const,
      marginBottom: 16,
    },
    rule: {
      borderTop: `1px solid rgba(245,240,232,0.08)`,
      margin: "40px 0",
    },
    section: {
      marginBottom: 48,
    },
  };

  return (
    <div
      style={{
        background: BG,
        color: FG,
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      {/* Full-bleed container */}
      <div
        style={{
          position: "relative",
          left: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          width: "100vw",
        }}
      >
        {/* Centered content column — 680px max */}
        <div
          style={{
            maxWidth: 680,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >

          {/* ── A. Header ─────────────────────────────────────── */}
          <div
            style={{
              paddingTop: 40,
              paddingBottom: 36,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {/* Nav row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <a
                href="/chat"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 12,
                  color: `rgba(245,240,232,0.40)`,
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                ← Council
              </a>
              <button
                onMouseEnter={() => setShareHovered(true)}
                onMouseLeave={() => setShareHovered(false)}
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: shareHovered ? FG : `rgba(245,240,232,0.55)`,
                  background: "none",
                  border: `1px solid ${shareHovered ? "rgba(245,240,232,0.35)" : "rgba(245,240,232,0.18)"}`,
                  borderRadius: 0,
                  padding: "7px 16px",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Share
              </button>
            </div>

            {/* Title */}
            <div
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 52,
                fontWeight: 700,
                letterSpacing: "0.01em",
                lineHeight: 1,
                color: FG,
                marginBottom: 6,
              }}
            >
              Your Tapestry
            </div>

            {/* Username */}
            <div
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontSize: 22,
                color: `rgba(245,240,232,0.55)`,
                marginBottom: 8,
                fontWeight: 300,
              }}
            >
              Nigel Lee
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                color: `rgba(245,240,232,0.40)`,
                letterSpacing: "0.02em",
              }}
            >
              Member since March 2, 2025 · 47 readings woven
            </div>
          </div>

          {/* ── Rule ──────────────────────────────────────────── */}
          <div style={s.rule} />

          {/* ── B. Tapestry Visualization ─────────────────────── */}
          <div style={s.section}>
            <TapestryGrid readings={readings} />
          </div>

          {/* ── Rule ──────────────────────────────────────────── */}
          <div style={s.rule} />

          {/* ── C. Key Stats ──────────────────────────────────── */}
          <div style={{ ...s.section, marginBottom: 40 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 0,
              }}
            >
              {[
                { number: "47",      sub: "Readings woven" },
                { number: "12",      sub: "Week streak" },
                { number: "4 / 5",   sub: "Threads connected" },
                { number: "Western", sub: "Most consulted", isText: true },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0 20px 0 0",
                    borderRight: i < 3 ? "1px solid rgba(245,240,232,0.07)" : "none",
                    paddingRight: i < 3 ? 20 : 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: stat.isText ? "var(--font-cormorant)" : "var(--font-cormorant)",
                      fontSize: stat.isText ? 30 : 44,
                      fontWeight: 700,
                      color: FG,
                      lineHeight: 1.05,
                      letterSpacing: stat.isText ? "0.01em" : "0",
                      marginBottom: 6,
                    }}
                  >
                    {stat.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 10,
                      color: `rgba(245,240,232,0.30)`,
                      letterSpacing: "0.04em",
                      lineHeight: 1.3,
                    }}
                  >
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rule ──────────────────────────────────────────── */}
          <div style={s.rule} />

          {/* ── D. Thread Inventory ───────────────────────────── */}
          <div style={s.section}>
            <div style={s.label}>Your Threads</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {THREADS.map((thread, i) => {
                const trad = TRADITION_MAP[thread.id];
                return (
                  <div
                    key={thread.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "13px 0",
                      borderBottom: i < THREADS.length - 1
                        ? "1px solid rgba(245,240,232,0.05)"
                        : "none",
                      opacity: thread.active ? 1 : 0.38,
                    }}
                  >
                    {/* Color swatch */}
                    <div
                      style={{
                        width: 4,
                        height: 22,
                        background: trad.hex,
                        flexShrink: 0,
                        opacity: thread.active ? 0.9 : 0.35,
                      }}
                    />

                    {/* Label */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-geist-sans)",
                          fontSize: 13,
                          color: thread.active ? `rgba(245,240,232,0.82)` : `rgba(245,240,232,0.38)`,
                          letterSpacing: "0.01em",
                        }}
                      >
                        {thread.label}
                      </div>
                    </div>

                    {/* Last woven */}
                    <div
                      style={{
                        fontFamily: "var(--font-geist-sans)",
                        fontSize: 10,
                        color: `rgba(245,240,232,0.28)`,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {thread.active ? `Last woven ${thread.lastWoven}` : "Not connected"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <button
              onMouseEnter={() => setConnectHovered(true)}
              onMouseLeave={() => setConnectHovered(false)}
              style={{
                marginTop: 20,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: connectHovered ? `rgba(245,240,232,0.70)` : `rgba(245,240,232,0.35)`,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.15s",
                textAlign: "left" as const,
              }}
            >
              + Connect a new thread
            </button>
          </div>

          {/* ── Rule ──────────────────────────────────────────── */}
          <div style={s.rule} />

          {/* ── E. Recent Readings ────────────────────────────── */}
          <div style={s.section}>
            <div style={s.label}>Recent Readings</div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentReadings.map((reading, i) => {
                const dateStr = reading.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      padding: "16px 0",
                      borderBottom:
                        i < recentReadings.length - 1
                          ? "1px solid rgba(245,240,232,0.06)"
                          : "none",
                    }}
                  >
                    {/* Date */}
                    <div
                      style={{
                        fontFamily: "var(--font-geist-sans)",
                        fontSize: 11,
                        color: `rgba(245,240,232,0.28)`,
                        letterSpacing: "0.05em",
                        flexShrink: 0,
                        paddingTop: 2,
                        minWidth: 44,
                      }}
                    >
                      {dateStr}
                    </div>

                    {/* Question */}
                    <div
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-cormorant)",
                        fontStyle: "italic",
                        fontSize: 16,
                        color: `rgba(245,240,232,0.82)`,
                        lineHeight: 1.35,
                        fontWeight: 300,
                      }}
                    >
                      {reading.question}
                    </div>

                    {/* Tradition dots */}
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        alignItems: "center",
                        paddingTop: 4,
                        flexShrink: 0,
                      }}
                    >
                      {reading.traditions.map((tid) => (
                        <div
                          key={tid}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: TRADITION_MAP[tid].hex,
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View all */}
            <button
              onMouseEnter={() => setViewAllHovered(true)}
              onMouseLeave={() => setViewAllHovered(false)}
              style={{
                marginTop: 18,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: viewAllHovered ? `rgba(245,240,232,0.65)` : `rgba(245,240,232,0.32)`,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              View all 47 readings →
            </button>
          </div>

          {/* ── Rule ──────────────────────────────────────────── */}
          <div style={s.rule} />

          {/* ── F. Shareable Card Preview ─────────────────────── */}
          <div style={{ ...s.section, paddingBottom: 80 }}>
            <div style={s.label}>Your Tapestry Card</div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              <ShareableCard readings={readings} />

              <button
                onMouseEnter={() => setCardShareHovered(true)}
                onMouseLeave={() => setCardShareHovered(false)}
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: cardShareHovered ? FG : `rgba(245,240,232,0.55)`,
                  background: "none",
                  border: `1px solid ${cardShareHovered ? "rgba(245,240,232,0.35)" : "rgba(245,240,232,0.18)"}`,
                  borderRadius: 0,
                  padding: "9px 24px",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                Share your tapestry
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
