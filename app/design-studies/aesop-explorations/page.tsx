"use client";

// ─── Mystic Council · Aesop + Hermetic Explorations ─────────────────────────
// Six design studies exploring sacred geometry, Hermetic philosophy,
// and the principle of "As above, so below" within the Aesop visual language.
//
// Explorations:
//   A · The Axiom        — Landing: Vesica Piscis + foundational statement
//   B · The Pattern      — Landing: Flower of Life as revealed ground
//   C · The Summoning    — Transition: Pentagonal expert arrangement
//   D · The Chamber      — Reading: Geometric brackets + constellation links
//   E · The Mirror       — Oracle reveal: Double triangle / as above so below
//   F · The Natal Chart  — Form: Birth data within the chart wheel concept
// ────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

// ─── Palette ─────────────────────────────────────────────────────────────────
const BG = "#0A0B14";
const TEXT = "#F5F0E8";
const TEXT_DIM = "rgba(245,240,232,0.55)";
const TEXT_GHOST = "rgba(245,240,232,0.2)";
const GEO = "rgba(191,168,130,0.06)";       // geometry fill — near invisible
const GEO_LINE = "rgba(191,168,130,0.09)";  // geometry stroke — barely visible
const GEO_ACCENT = "rgba(191,168,130,0.22)";// accent geometry — present but not loud
const RULE = "rgba(245,240,232,0.1)";       // horizontal rules
const EXPERT_COLORS = {
  western:    "#8B7EC8",
  chinese:    "#C8846E",
  vedic:      "#C8A96E",
  tarot:      "#6E8BC8",
  numerology: "#7EC89A",
  oracle:     "#BFA882",
};

// ─── Typography helpers ───────────────────────────────────────────────────────
const CORMORANT = "var(--font-cormorant)";
const GEIST = "var(--font-geist-sans)";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Rule({ opacity = 0.1, my = 0 }: { opacity?: number; my?: number }) {
  return (
    <div style={{
      height: 1,
      background: `rgba(245,240,232,${opacity})`,
      margin: `${my}px 0`,
    }} />
  );
}

function Label({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: GEIST,
      fontSize: 9,
      fontWeight: 500,
      letterSpacing: "0.2em",
      textTransform: "uppercase" as const,
      color: TEXT_DIM,
      ...style,
    }}>
      {children}
    </div>
  );
}

function ExplorationMeta({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div style={{
      padding: "16px 40px",
      background: "#07080F",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      alignItems: "center",
      gap: 20,
    }}>
      <span style={{
        fontFamily: CORMORANT,
        fontSize: 11,
        fontWeight: 700,
        color: GEO_ACCENT,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
      }}>{id}</span>
      <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
      <span style={{
        fontFamily: CORMORANT,
        fontSize: 14,
        fontWeight: 700,
        color: "rgba(245,240,232,0.8)",
        letterSpacing: "0.1em",
      }}>{title}</span>
      <span style={{
        fontFamily: GEIST,
        fontSize: 11,
        color: "rgba(245,240,232,0.3)",
        letterSpacing: "0.06em",
      }}>— {description}</span>
    </div>
  );
}

// ─── Sticky nav ───────────────────────────────────────────────────────────────
const EXPLORATIONS = [
  { id: "axiom",    short: "A · Axiom" },
  { id: "pattern",  short: "B · Pattern" },
  { id: "summoning",short: "C · Summoning" },
  { id: "chamber",  short: "D · Chamber" },
  { id: "mirror",   short: "E · Mirror" },
  { id: "natal",    short: "F · Natal" },
];

function Nav({ active }: { active: string }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 300,
      background: "rgba(7,8,15,0.9)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      height: 44,
      gap: 4,
    }}>
      <span style={{
        fontFamily: CORMORANT,
        fontSize: 12,
        letterSpacing: "0.2em",
        color: "rgba(191,168,130,0.4)",
        textTransform: "uppercase",
        marginRight: 16,
        whiteSpace: "nowrap",
      }}>
        Aesop · Hermetic
      </span>
      {EXPLORATIONS.map(e => (
        <a key={e.id} href={`#${e.id}`} style={{
          fontFamily: GEIST,
          fontSize: 11,
          color: active === e.id ? TEXT : "rgba(245,240,232,0.35)",
          textDecoration: "none",
          padding: "4px 12px",
          borderBottom: active === e.id ? `1px solid ${GEO_ACCENT}` : "1px solid transparent",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
          transition: "color 0.2s",
        }}>{e.short}</a>
      ))}
      <div style={{ flex: 1 }} />
      <a href="/design-studies" style={{
        fontFamily: GEIST,
        fontSize: 10,
        color: "rgba(245,240,232,0.25)",
        textDecoration: "none",
        letterSpacing: "0.1em",
      }}>← All Directions</a>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPLORATION A · THE AXIOM
// Vesica Piscis anchors the landing. The wordmark emerges from the intersection.
// The tagline IS the hermetic axiom: "As above, so below."
// Geometry: ~6% opacity, barely there, felt not seen.
// ════════════════════════════════════════════════════════════════════════════════

function VesicaPiscis({ size = 400, opacity = 0.07 }: { size?: number; opacity?: number }) {
  const r = size * 0.35;
  const cx1 = size * 0.38;
  const cx2 = size * 0.62;
  const cy = size * 0.5;
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity }}
      aria-hidden
    >
      <circle cx={cx1} cy={cy} r={r} fill="none" stroke="#BFA882" strokeWidth={0.8} />
      <circle cx={cx2} cy={cy} r={r} fill="none" stroke="#BFA882" strokeWidth={0.8} />
      {/* Outer encompassing circle */}
      <circle cx={size * 0.5} cy={cy} r={size * 0.46} fill="none" stroke="#BFA882" strokeWidth={0.4} strokeDasharray="2 6" />
    </svg>
  );
}

function ExplorationAxiom() {
  return (
    <div id="axiom" style={{ scrollMarginTop: 44 }}>
      <ExplorationMeta
        id="A"
        title="The Axiom"
        description="Landing · Vesica Piscis · foundational hermetic statement"
      />
      <div style={{
        background: BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "80px 40px",
      }}>
        {/* Vesica Piscis — the geometry of intersection, unity of opposites */}
        <VesicaPiscis size={520} opacity={0.065} />

        {/* Alchemical motto — very top */}
        <div style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: GEIST,
            fontSize: 9,
            letterSpacing: "0.3em",
            color: "rgba(191,168,130,0.3)",
            textTransform: "uppercase",
          }}>
            ✦ &nbsp; As above, so below &nbsp; ✦
          </span>
        </div>

        {/* Core wordmark */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontFamily: CORMORANT,
            fontSize: "clamp(60px, 12vw, 96px)",
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "0.14em",
            lineHeight: 0.95,
            margin: 0,
          }}>
            MYSTIC<br />COUNCIL
          </h1>

          <div style={{
            width: 160,
            height: 1,
            background: `rgba(245,240,232,0.15)`,
            margin: "32px auto",
          }} />

          <p style={{
            fontFamily: GEIST,
            fontSize: 12,
            fontWeight: 300,
            color: TEXT_DIM,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 52px",
          }}>
            Five traditions. One question.
          </p>

          <button style={{
            fontFamily: GEIST,
            fontSize: 11,
            fontWeight: 400,
            color: TEXT,
            background: "transparent",
            border: "1px solid rgba(245,240,232,0.3)",
            padding: "11px 40px",
            cursor: "pointer",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}>
            Enter
          </button>
        </div>

        {/* As above / so below — bottom */}
        <div style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          {/* Triangle pointing up (above) */}
          <svg width={12} height={11} viewBox="0 0 12 11" aria-hidden>
            <polygon points="6,0 12,11 0,11" fill="none" stroke="rgba(191,168,130,0.3)" strokeWidth={0.8} />
          </svg>
          <div style={{ width: 1, height: 16, background: "rgba(191,168,130,0.2)" }} />
          {/* Triangle pointing down (below) */}
          <svg width={12} height={11} viewBox="0 0 12 11" aria-hidden>
            <polygon points="6,11 12,0 0,0" fill="none" stroke="rgba(191,168,130,0.3)" strokeWidth={0.8} />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPLORATION B · THE PATTERN
// A Flower of Life grid at 4% opacity fills the background like discovered wallpaper.
// The wordmark is large and centered. Geometry is ground, not figure.
// Second screen: the question input, where the pattern intensifies subtly at center.
// ════════════════════════════════════════════════════════════════════════════════

function FlowerOfLifeSVG() {
  // Generate a Flower of Life pattern: center circle + 6 petal circles, repeated in a grid
  const circles: { cx: number; cy: number; r: number }[] = [];
  const r = 36;
  const rows = 8;
  const cols = 8;
  const dx = r * 1.5;
  const dy = r * Math.sqrt(3);

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * dx * 2 + (row % 2 === 0 ? 0 : dx);
      const cy = row * dy;
      circles.push({ cx: cx + 30, cy: cy + 30, r });
      // 6 petals
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        circles.push({
          cx: cx + 30 + r * Math.cos(angle),
          cy: cy + 30 + r * Math.sin(angle),
          r,
        });
      }
    }
  }

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.042,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <defs>
        <pattern id="fol" x="0" y="0" width={dx * 2} height={dy} patternUnits="userSpaceOnUse">
          {/* One unit cell of Flower of Life */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (i * Math.PI) / 3;
            return (
              <circle
                key={i}
                cx={dx + Math.cos(angle) * r}
                cy={dy / 2 + Math.sin(angle) * r}
                r={r}
                fill="none"
                stroke="#BFA882"
                strokeWidth={0.6}
              />
            );
          })}
          <circle cx={dx} cy={dy / 2} r={r} fill="none" stroke="#BFA882" strokeWidth={0.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fol)" />
    </svg>
  );
}

function ExplorationPattern() {
  return (
    <div id="pattern" style={{ scrollMarginTop: 44 }}>
      <ExplorationMeta
        id="B"
        title="The Pattern"
        description="Landing + Form · Flower of Life ground · revealed sacred geometry"
      />

      {/* B1: Landing */}
      <div style={{
        background: BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "80px 40px",
      }}>
        <FlowerOfLifeSVG />

        {/* Vignette — geometry fades to dark at edges */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, transparent 30%, ${BG} 75%)`,
          pointerEvents: "none",
        }} />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Small label above */}
          <div style={{
            fontFamily: GEIST,
            fontSize: 9,
            letterSpacing: "0.28em",
            color: "rgba(191,168,130,0.35)",
            textTransform: "uppercase",
            marginBottom: 28,
          }}>
            The Council of Traditions
          </div>

          <h1 style={{
            fontFamily: CORMORANT,
            fontSize: "clamp(64px, 13vw, 104px)",
            fontWeight: 700,
            color: TEXT,
            letterSpacing: "0.1em",
            lineHeight: 0.92,
            margin: 0,
          }}>
            MYSTIC<br />COUNCIL
          </h1>

          <div style={{ margin: "36px auto", display: "flex", alignItems: "center", gap: 16, maxWidth: 300 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.1)" }} />
            <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
              <rect x={2} y={2} width={12} height={12} fill="none" stroke="rgba(191,168,130,0.4)" strokeWidth={0.7} transform="rotate(45 8 8)" />
            </svg>
            <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.1)" }} />
          </div>

          <p style={{
            fontFamily: GEIST,
            fontSize: 12,
            fontWeight: 300,
            color: TEXT_DIM,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            margin: "0 0 48px",
          }}>
            Western · Chinese · Vedic · Tarot · Numerology
          </p>

          <button style={{
            fontFamily: GEIST,
            fontSize: 11,
            color: TEXT,
            background: "transparent",
            border: "1px solid rgba(245,240,232,0.28)",
            padding: "11px 40px",
            cursor: "pointer",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}>
            Begin
          </button>
        </div>
      </div>

      {/* B2: Question input — pattern intensifies at center */}
      <div style={{
        background: BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        padding: "40px",
      }}>
        <FlowerOfLifeSVG />

        {/* Vignette — stronger, center spot light */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 45%, transparent 0%, ${BG} 80%)`,
          pointerEvents: "none",
          zIndex: 0,
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 64, position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: CORMORANT, fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(245,240,232,0.5)" }}>
            MYSTIC COUNCIL
          </span>
          <span style={{ fontFamily: GEIST, fontSize: 10, color: TEXT_GHOST, letterSpacing: "0.1em" }}>II — II</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 520, position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontFamily: CORMORANT,
            fontSize: "clamp(32px, 6vw, 48px)",
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.1,
            margin: "0 0 12px",
          }}>
            What do you seek<br />to <em>understand?</em>
          </h2>

          <p style={{
            fontFamily: GEIST,
            fontSize: 11,
            color: "rgba(191,168,130,0.4)",
            letterSpacing: "0.1em",
            margin: "0 0 36px",
            fontStyle: "italic",
          }}>
            The pattern knows. Ask plainly.
          </p>

          <div style={{
            border: "1px solid rgba(245,240,232,0.12)",
            padding: "20px 22px",
            position: "relative",
          }}>
            {/* Corner marks — sacred geometry brackets */}
            {[
              { top: -1, left: -1, borderTop: "1px solid rgba(191,168,130,0.35)", borderLeft: "1px solid rgba(191,168,130,0.35)", width: 10, height: 10 },
              { top: -1, right: -1, borderTop: "1px solid rgba(191,168,130,0.35)", borderRight: "1px solid rgba(191,168,130,0.35)", width: 10, height: 10 },
              { bottom: -1, left: -1, borderBottom: "1px solid rgba(191,168,130,0.35)", borderLeft: "1px solid rgba(191,168,130,0.35)", width: 10, height: 10 },
              { bottom: -1, right: -1, borderBottom: "1px solid rgba(191,168,130,0.35)", borderRight: "1px solid rgba(191,168,130,0.35)", width: 10, height: 10 },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", ...s, background: "none" }} />
            ))}
            <textarea
              rows={4}
              placeholder="Will I find clarity in my career this year?"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: CORMORANT,
                fontSize: 20,
                color: TEXT,
                lineHeight: 1.6,
                resize: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button style={{
              fontFamily: GEIST,
              fontSize: 11,
              color: TEXT,
              background: "transparent",
              border: "1px solid rgba(245,240,232,0.28)",
              padding: "11px 32px",
              cursor: "pointer",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}>
              Consult the Council
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPLORATION C · THE SUMMONING
// The moment between submission and response.
// Five expert sigils at pentagonal vertices, connected by thin lines.
// The Oracle diamond at center. Connection lines animate in one by one.
// This is the "sacred activation" moment — the council is called.
// ════════════════════════════════════════════════════════════════════════════════

function PentagramConstel() {
  const cx = 160;
  const cy = 160;
  const r = 100;
  const innerR = 38;

  const experts = [
    { symbol: "✦", name: "Western",    color: EXPERT_COLORS.western    },
    { symbol: "☯", name: "Chinese",    color: EXPERT_COLORS.chinese    },
    { symbol: "ॐ", name: "Vedic",      color: EXPERT_COLORS.vedic      },
    { symbol: "🜂", name: "Tarot",      color: EXPERT_COLORS.tarot      },
    { symbol: "∞", name: "Numerology", color: EXPERT_COLORS.numerology },
  ];

  const points = experts.map((_, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  return (
    <svg width={320} height={320} viewBox="0 0 320 320" aria-label="The Council constellation">
      {/* Outer circle — the boundary of the reading */}
      <circle cx={cx} cy={cy} r={r + 24} fill="none" stroke="rgba(191,168,130,0.07)" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="rgba(191,168,130,0.05)" strokeWidth={0.5} strokeDasharray="3 9" />

      {/* Pentagram lines (star connections) */}
      {[0, 2, 4, 1, 3, 0].map((pointIdx, i, arr) => {
        if (i === arr.length - 1) return null;
        const next = arr[i + 1];
        return (
          <line
            key={i}
            x1={points[pointIdx].x} y1={points[pointIdx].y}
            x2={points[next].x} y2={points[next].y}
            stroke="rgba(191,168,130,0.1)"
            strokeWidth={0.6}
          />
        );
      })}

      {/* Inner pentagon */}
      {points.map((p, i) => {
        const next = points[(i + 1) % 5];
        return (
          <line
            key={`pent-${i}`}
            x1={p.x} y1={p.y}
            x2={next.x} y2={next.y}
            stroke="rgba(191,168,130,0.07)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Radial spokes to center */}
      {points.map((p, i) => (
        <line
          key={`spoke-${i}`}
          x1={p.x} y1={p.y}
          x2={cx} y2={cy}
          stroke={experts[i].color}
          strokeWidth={0.5}
          opacity={0.2}
        />
      ))}

      {/* Expert nodes */}
      {points.map((p, i) => (
        <g key={`node-${i}`}>
          <circle cx={p.x} cy={p.y} r={20} fill={BG} stroke={experts[i].color} strokeWidth={0.8} strokeOpacity={0.5} />
          <circle cx={p.x} cy={p.y} r={24} fill="none" stroke={experts[i].color} strokeWidth={0.4} strokeOpacity={0.15} />
          <text
            x={p.x} y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={experts[i].color}
            fontSize={13}
            fontFamily={GEIST}
            opacity={0.8}
          >
            {experts[i].symbol}
          </text>
        </g>
      ))}

      {/* Oracle at center */}
      <circle cx={cx} cy={cy} r={innerR} fill={BG} stroke="rgba(191,168,130,0.3)" strokeWidth={0.8} />
      <circle cx={cx} cy={cy} r={innerR - 6} fill="none" stroke="rgba(191,168,130,0.12)" strokeWidth={0.5} strokeDasharray="2 4" />
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgba(191,168,130,0.7)"
        fontSize={18}
        fontFamily={GEIST}
      >
        ◈
      </text>
      <text
        x={cx} y={cy + 13}
        textAnchor="middle"
        fill="rgba(191,168,130,0.4)"
        fontSize={7}
        fontFamily={GEIST}
        letterSpacing="2"
      >
        ORACLE
      </text>

      {/* Expert name labels */}
      {points.map((p, i) => {
        const labelOffset = 34;
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const lx = cx + (r + labelOffset) * Math.cos(angle);
        const ly = cy + (r + labelOffset) * Math.sin(angle);
        return (
          <text
            key={`label-${i}`}
            x={lx} y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(245,240,232,0.3)"
            fontSize={7}
            fontFamily={GEIST}
            letterSpacing="1.5"
          >
            {experts[i].name.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

function ExplorationSummoning() {
  return (
    <div id="summoning" style={{ scrollMarginTop: 44 }}>
      <ExplorationMeta
        id="C"
        title="The Summoning"
        description="Transition screen · Pentagonal council · sacred activation moment"
      />
      <div style={{
        background: BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Faint background geometry: hexagram watermark */}
        <svg
          width={600} height={600}
          style={{ position: "absolute", opacity: 0.025, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          aria-hidden
        >
          <polygon points="300,60 540,420 60,420" fill="none" stroke="#BFA882" strokeWidth={0.8} />
          <polygon points="300,540 540,180 60,180" fill="none" stroke="#BFA882" strokeWidth={0.8} />
          <circle cx={300} cy={300} r={240} fill="none" stroke="#BFA882" strokeWidth={0.5} />
          <circle cx={300} cy={300} r={180} fill="none" stroke="#BFA882" strokeWidth={0.4} />
        </svg>

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <p style={{
            fontFamily: GEIST,
            fontSize: 9,
            letterSpacing: "0.28em",
            color: "rgba(191,168,130,0.35)",
            textTransform: "uppercase",
            marginBottom: 48,
          }}>
            The Council convenes
          </p>

          <PentagramConstel />

          <div style={{ marginTop: 40 }}>
            <p style={{
              fontFamily: CORMORANT,
              fontSize: 16,
              fontStyle: "italic",
              color: TEXT_DIM,
              margin: "0 0 8px",
              letterSpacing: "0.04em",
            }}>
              "Will I find clarity in my career this year?"
            </p>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginTop: 16,
            }}>
              {/* Breathing dots — consulting indicator */}
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: [
                    EXPERT_COLORS.western,
                    EXPERT_COLORS.chinese,
                    EXPERT_COLORS.vedic,
                    EXPERT_COLORS.tarot,
                    EXPERT_COLORS.numerology,
                  ][i],
                  opacity: 0.4,
                }} />
              ))}
            </div>
            <p style={{
              fontFamily: GEIST,
              fontSize: 10,
              letterSpacing: "0.14em",
              color: TEXT_GHOST,
              textTransform: "uppercase",
              margin: "16px 0 0",
            }}>
              Consulting the traditions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPLORATION D · THE CHAMBER
// The reading experience. Each expert card has geometric corner brackets.
// A thin constellation thread connects cards — showing entanglement.
// The reading feels like a unified field, not a list.
// ════════════════════════════════════════════════════════════════════════════════

function GeoBracket({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <svg width={size * 2} height={size * 2} viewBox={`0 0 ${size * 2} ${size * 2}`} style={{ display: "block" }} aria-hidden>
      <polyline
        points={`${size * 2},0 0,0 0,${size * 2}`}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
        strokeOpacity={0.5}
      />
    </svg>
  );
}

function ExpertCard({
  symbol, label, color, text, showThread = false,
}: {
  symbol: string; label: string; color: string; text: string; showThread?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "relative",
        border: "1px solid rgba(245,240,232,0.07)",
        padding: "20px 22px",
        marginBottom: 2,
        overflow: "hidden",
      }}>
        {/* Left rule */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: color }} />

        {/* Corner brackets (sacred geometry corners) */}
        <div style={{ position: "absolute", top: 6, left: 6 }}>
          <GeoBracket color={color} size={6} />
        </div>
        <div style={{ position: "absolute", top: 6, right: 6, transform: "scaleX(-1)" }}>
          <GeoBracket color={color} size={6} />
        </div>
        <div style={{ position: "absolute", bottom: 6, left: 6, transform: "scaleY(-1)" }}>
          <GeoBracket color={color} size={6} />
        </div>
        <div style={{ position: "absolute", bottom: 6, right: 6, transform: "scale(-1)" }}>
          <GeoBracket color={color} size={6} />
        </div>

        <div style={{
          fontFamily: GEIST,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(245,240,232,0.45)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color, opacity: 0.8 }}>{symbol}</span>
          {label}
        </div>

        <p style={{
          fontFamily: CORMORANT,
          fontSize: 17,
          color: "rgba(245,240,232,0.82)",
          lineHeight: 1.65,
          margin: 0,
        }}>
          {text}
        </p>
      </div>

      {/* Thread connector — shows entanglement between readings */}
      {showThread && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 14,
          gap: 4,
          position: "relative",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(191,168,130,0.06)" }} />
          <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(191,168,130,0.2)" }} />
          <div style={{ flex: 1, height: 1, background: "rgba(191,168,130,0.06)" }} />
        </div>
      )}
    </div>
  );
}

function ExplorationChamber() {
  const cards = [
    {
      symbol: "✦", label: "Western Astrology", color: EXPERT_COLORS.western,
      text: "With Saturn transiting your 10th house through autumn, this is a year of consolidation rather than breakthrough. Jupiter's trine to your natal Venus in late October opens a genuine window.",
    },
    {
      symbol: "☯", label: "Chinese Astrology", color: EXPERT_COLORS.chinese,
      text: "The Year of the Wood Snake brings transformation to those born in the Year of the Rabbit. Metal governs your career palace. Patience through Q2; the Snake's wisdom rewards those who do not force the knot.",
    },
    {
      symbol: "ॐ", label: "Vedic Jyotish", color: EXPERT_COLORS.vedic,
      text: "Shani's drishti on your 10th lord creates dasha-related friction until Rahu shifts in November. Your Atmakaraka Venus is strong — inner knowing is your guide when outer conditions obscure the path.",
    },
  ];

  return (
    <div id="chamber" style={{ scrollMarginTop: 44 }}>
      <ExplorationMeta
        id="D"
        title="The Chamber"
        description="Reading screen · geometric brackets · entanglement thread"
      />
      <div style={{
        background: BG,
        padding: "40px 40px 80px",
        minHeight: "100vh",
        position: "relative",
      }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <span style={{ fontFamily: CORMORANT, fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(245,240,232,0.45)" }}>
            MYSTIC COUNCIL
          </span>
          <span style={{ fontFamily: GEIST, fontSize: 9, color: TEXT_GHOST, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            New Reading
          </span>
        </div>

        <Rule opacity={0.06} my={0} />

        <p style={{
          fontFamily: CORMORANT,
          fontSize: 20,
          fontStyle: "italic",
          color: "rgba(245,240,232,0.6)",
          margin: "24px 0 28px",
          lineHeight: 1.4,
        }}>
          "Will I find clarity in my career path this year?"
        </p>

        <Rule opacity={0.06} my={0} />

        {/* Synchronicity label */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          margin: "20px 0",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(191,168,130,0.08)" }} />
          <span style={{ fontFamily: GEIST, fontSize: 8, letterSpacing: "0.22em", color: "rgba(191,168,130,0.3)", textTransform: "uppercase" }}>
            Synchronous readings
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(191,168,130,0.08)" }} />
        </div>

        {cards.map((card, i) => (
          <ExpertCard key={i} {...card} showThread={i < cards.length - 1} />
        ))}

        {/* Entanglement note */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "8px 0 32px",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(191,168,130,0.1)" }} />
          <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
            <circle cx={5} cy={5} r={4} fill="none" stroke="rgba(191,168,130,0.35)" strokeWidth={0.7} />
            <circle cx={5} cy={5} r={1.5} fill="rgba(191,168,130,0.3)" />
          </svg>
          <div style={{ flex: 1, height: 1, background: "rgba(191,168,130,0.1)" }} />
        </div>

        <p style={{
          fontFamily: GEIST,
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "rgba(191,168,130,0.3)",
          textAlign: "center",
          margin: "0 0 32px",
          fontStyle: "italic",
        }}>
          All traditions point to the same pattern.
        </p>

        {/* Oracle placeholder */}
        <div style={{
          border: "1px solid rgba(191,168,130,0.12)",
          padding: "20px 22px",
          position: "relative",
        }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "rgba(191,168,130,0.3)" }} />
          {[
            { top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }
          ].map((pos, i) => (
            <div key={i} style={{
              position: "absolute",
              ...pos,
              width: 8, height: 8,
              borderTop: (pos as any).top !== undefined ? "1px solid rgba(191,168,130,0.4)" : undefined,
              borderBottom: (pos as any).bottom !== undefined ? "1px solid rgba(191,168,130,0.4)" : undefined,
              borderLeft: (pos as any).left !== undefined ? "1px solid rgba(191,168,130,0.4)" : undefined,
              borderRight: (pos as any).right !== undefined ? "1px solid rgba(191,168,130,0.4)" : undefined,
            }} />
          ))}
          <div style={{ fontFamily: GEIST, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(191,168,130,0.5)", marginBottom: 12 }}>
            ◈ &nbsp; The Oracle
          </div>
          <p style={{ fontFamily: GEIST, fontSize: 11, color: TEXT_GHOST, letterSpacing: "0.08em", margin: 0 }}>
            Synthesizing…
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPLORATION E · THE MIRROR
// The Oracle reveal — the climax of the reading.
// "As above, so below" rendered literally: the double triangle (Hexagram).
// Expert readings above the axis. Oracle synthesis below.
// The axis is the threshold. Crossing it is the moment of synthesis.
// ════════════════════════════════════════════════════════════════════════════════

function HexagramDivider() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      margin: "48px 0",
      gap: 12,
      position: "relative",
    }}>
      <div style={{ width: "100%", height: 1, background: RULE }} />

      <div style={{ position: "relative", width: 120, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={120} height={40} viewBox="0 0 120 40" aria-hidden>
          {/* As above — triangle up */}
          <polygon points="60,2 100,22 20,22" fill="none" stroke="rgba(191,168,130,0.35)" strokeWidth={0.8} />
          {/* So below — triangle down */}
          <polygon points="60,38 100,18 20,18" fill="none" stroke="rgba(191,168,130,0.35)" strokeWidth={0.8} />
        </svg>
        <div style={{
          position: "absolute",
          fontFamily: GEIST,
          fontSize: 7,
          letterSpacing: "0.2em",
          color: "rgba(191,168,130,0.4)",
          textTransform: "uppercase",
          background: BG,
          padding: "0 8px",
        }}>
          The Oracle
        </div>
      </div>

      <div style={{ width: "100%", height: 1, background: RULE }} />
    </div>
  );
}

function ExplorationMirror() {
  return (
    <div id="mirror" style={{ scrollMarginTop: 44 }}>
      <ExplorationMeta
        id="E"
        title="The Mirror"
        description="Oracle reveal · double triangle · As above so below · synthesis moment"
      />
      <div style={{
        background: BG,
        padding: "40px 40px 80px",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Very faint hexagram watermark — full bleed */}
        <svg
          width={500} height={500}
          style={{ position: "absolute", opacity: 0.025, bottom: 0, right: -80, pointerEvents: "none" }}
          aria-hidden
        >
          <polygon points="250,30 470,370 30,370" fill="none" stroke="#BFA882" strokeWidth={0.8} />
          <polygon points="250,470 470,130 30,130" fill="none" stroke="#BFA882" strokeWidth={0.8} />
          <circle cx={250} cy={250} r={220} fill="none" stroke="#BFA882" strokeWidth={0.5} />
        </svg>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
          <span style={{ fontFamily: CORMORANT, fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(245,240,232,0.45)" }}>
            MYSTIC COUNCIL
          </span>
        </div>

        <Rule opacity={0.06} />

        <p style={{
          fontFamily: CORMORANT,
          fontSize: 20,
          fontStyle: "italic",
          color: "rgba(245,240,232,0.6)",
          margin: "20px 0 28px",
        }}>
          "Will I find clarity in my career path this year?"
        </p>

        {/* ABOVE THE AXIS: Expert readings (collapsed/summarized) */}
        <div style={{ marginBottom: 0 }}>
          {/* Section label */}
          <div style={{
            fontFamily: GEIST,
            fontSize: 8,
            letterSpacing: "0.24em",
            color: TEXT_GHOST,
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            The traditions have spoken
          </div>

          {[
            { symbol: "✦", label: "Western Astrology", color: EXPERT_COLORS.western, summary: "Saturn consolidates · Jupiter opens in October" },
            { symbol: "☯", label: "Chinese Astrology", color: EXPERT_COLORS.chinese, summary: "Wood Snake · Metal governs career · Patience through Q2" },
            { symbol: "ॐ", label: "Vedic Jyotish", color: EXPERT_COLORS.vedic, summary: "Shani drishti · Atmakaraka Venus strong · November shift" },
            { symbol: "🜂", label: "Tarot", color: EXPERT_COLORS.tarot, summary: "Seven of Pentacles · The Hermit in crossing · Interior season" },
            { symbol: "∞", label: "Numerology", color: EXPERT_COLORS.numerology, summary: "Personal Year 7 · The inner seeker · World waits for you" },
          ].map((e, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              padding: "8px 0 8px 14px",
              borderLeft: `1px solid ${e.color}40`,
              marginBottom: 4,
            }}>
              <span style={{ fontFamily: GEIST, fontSize: 10, color: e.color, opacity: 0.7 }}>{e.symbol}</span>
              <span style={{ fontFamily: GEIST, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_GHOST, minWidth: 80 }}>{e.label.split(" ")[0]}</span>
              <span style={{ fontFamily: CORMORANT, fontSize: 14, color: "rgba(245,240,232,0.45)", fontStyle: "italic" }}>{e.summary}</span>
            </div>
          ))}
        </div>

        {/* THE AXIS: As above, so below */}
        <HexagramDivider />

        {/* BELOW THE AXIS: Oracle synthesis */}
        <div>
          <div style={{ position: "relative" }}>
            {/* Faint glow behind Oracle text */}
            <div style={{
              position: "absolute",
              top: -20,
              left: -40,
              right: -40,
              height: 200,
              background: "radial-gradient(ellipse at 50% 0%, rgba(191,168,130,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            <p style={{
              fontFamily: CORMORANT,
              fontSize: 22,
              color: TEXT,
              lineHeight: 1.75,
              margin: "0 0 24px",
              position: "relative",
              zIndex: 1,
            }}>
              You are not lost —{" "}
              <em style={{ fontStyle: "italic", fontWeight: 700 }}>you are in gestation.</em>
            </p>

            <p style={{
              fontFamily: CORMORANT,
              fontSize: 20,
              color: "rgba(245,240,232,0.8)",
              lineHeight: 1.8,
              margin: "0 0 24px",
            }}>
              Every tradition sees the same season: late winter, not the end of growth but its most interior phase. Do not mistake stillness for stagnation.
            </p>

            <p style={{
              fontFamily: CORMORANT,
              fontSize: 20,
              color: "rgba(245,240,232,0.8)",
              lineHeight: 1.8,
              margin: "0 0 40px",
            }}>
              The clarity you seek is assembling itself in the dark, the way roots thicken before the shoot breaks ground. By autumn, the world will confirm what you already know.
            </p>

            {/* Closing sigil */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg width={48} height={40} viewBox="0 0 48 40" aria-hidden>
                <polygon points="24,2 44,22 4,22" fill="none" stroke="rgba(191,168,130,0.3)" strokeWidth={0.8} />
                <polygon points="24,38 44,18 4,18" fill="none" stroke="rgba(191,168,130,0.3)" strokeWidth={0.8} />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPLORATION F · THE NATAL CHART
// Birth data entry transformed into something sacred.
// The form fields are oriented around the concept of a chart wheel.
// A faint zodiac/divisional wheel sits behind the form.
// "Your birth is a map. We are learning to read it."
// ════════════════════════════════════════════════════════════════════════════════

function ChartWheel({ size = 280 }: { size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.36;
  const coreR = size * 0.12;
  const divisions = 12;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: "block" }}>
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#BFA882" strokeWidth={0.6} strokeOpacity={0.18} />
      {/* Middle circle */}
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#BFA882" strokeWidth={0.5} strokeOpacity={0.1} />
      {/* Core circle */}
      <circle cx={cx} cy={cy} r={coreR} fill="none" stroke="#BFA882" strokeWidth={0.6} strokeOpacity={0.2} />

      {/* 12 house divisions */}
      {Array.from({ length: divisions }).map((_, i) => {
        const angle = (i * Math.PI * 2) / divisions;
        const x1 = cx + innerR * Math.cos(angle);
        const y1 = cy + innerR * Math.sin(angle);
        const x2 = cx + outerR * Math.cos(angle);
        const y2 = cy + outerR * Math.sin(angle);
        const xi = cx + coreR * Math.cos(angle);
        const yi = cy + coreR * Math.sin(angle);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#BFA882" strokeWidth={0.5} strokeOpacity={0.15} />
            <line x1={xi} y1={yi} x2={x1} y2={y1} stroke="#BFA882" strokeWidth={0.3} strokeOpacity={0.07} />
          </g>
        );
      })}

      {/* Cross lines (horizon + meridian) */}
      <line x1={cx - outerR} y1={cy} x2={cx + outerR} y2={cy} stroke="#BFA882" strokeWidth={0.5} strokeOpacity={0.15} />
      <line x1={cx} y1={cy - outerR} x2={cx} y2={cy + outerR} stroke="#BFA882" strokeWidth={0.5} strokeOpacity={0.15} />

      {/* Compass rose marks */}
      {[
        { angle: 0,    label: "E" },
        { angle: 90,   label: "S" },
        { angle: 180,  label: "W" },
        { angle: 270,  label: "N" },
      ].map(({ angle, label }) => {
        const a = (angle * Math.PI) / 180;
        const tx = cx + (outerR + 10) * Math.cos(a);
        const ty = cy + (outerR + 10) * Math.sin(a);
        return (
          <text
            key={label}
            x={tx} y={ty}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#BFA882"
            fontSize={6}
            fontFamily={GEIST}
            opacity={0.3}
            letterSpacing={1}
          >{label}</text>
        );
      })}

      {/* Placeholder planet points */}
      {[22, 110, 195, 280, 340].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const r = innerR * 0.6 + (i % 2) * 20;
        return (
          <circle
            key={i}
            cx={cx + r * Math.cos(a)}
            cy={cy + r * Math.sin(a)}
            r={2}
            fill="#BFA882"
            opacity={0.25}
          />
        );
      })}

      {/* Center point */}
      <circle cx={cx} cy={cy} r={3} fill="#BFA882" opacity={0.4} />
    </svg>
  );
}

function ExplorationNatal() {
  return (
    <div id="natal" style={{ scrollMarginTop: 44 }}>
      <ExplorationMeta
        id="F"
        title="The Natal Chart"
        description="Birth data form · chart wheel · the map of your arrival"
      />
      <div style={{
        background: BG,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "40px",
        position: "relative",
        overflow: "hidden",
      }}>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 56 }}>
          <span style={{ fontFamily: CORMORANT, fontSize: 15, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(245,240,232,0.45)" }}>
            MYSTIC COUNCIL
          </span>
          <span style={{ fontFamily: GEIST, fontSize: 9, color: TEXT_GHOST, letterSpacing: "0.12em" }}>I — II</span>
        </div>

        <div style={{ display: "flex", gap: 48, flex: 1, alignItems: "flex-start" }}>
          {/* Left: Chart wheel */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <ChartWheel size={260} />
            <p style={{
              fontFamily: GEIST,
              fontSize: 8,
              letterSpacing: "0.18em",
              color: "rgba(191,168,130,0.25)",
              textTransform: "uppercase",
              textAlign: "center",
              marginTop: 12,
            }}>
              Your natal map
            </p>
          </div>

          {/* Right: Form fields */}
          <div style={{ flex: 1, paddingTop: 16 }}>
            <h2 style={{
              fontFamily: CORMORANT,
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.1,
              margin: "0 0 8px",
            }}>
              Your birth<br />is a <em>map.</em>
            </h2>

            <p style={{
              fontFamily: GEIST,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "rgba(191,168,130,0.4)",
              fontStyle: "italic",
              margin: "0 0 36px",
            }}>
              We are learning to read it.
            </p>

            {[
              { label: "Name", placeholder: "Nigel Lee", hint: "The self" },
              { label: "Date of Birth", placeholder: "June 1, 1991", hint: "The position of the Sun" },
              { label: "Time of Birth", placeholder: "11:44 AM", hint: "The Ascendant — your mask" },
              { label: "Place of Birth", placeholder: "Manila, Philippines", hint: "The geographic axis" },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <label style={{
                    fontFamily: GEIST,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(245,240,232,0.4)",
                  }}>
                    {field.label}
                  </label>
                  <span style={{
                    fontFamily: GEIST,
                    fontSize: 8,
                    letterSpacing: "0.08em",
                    fontStyle: "italic",
                    color: "rgba(191,168,130,0.3)",
                  }}>
                    {field.hint}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(245,240,232,0.14)",
                    padding: "8px 0",
                    fontFamily: CORMORANT,
                    fontSize: 20,
                    color: TEXT,
                    outline: "none",
                    boxSizing: "border-box",
                    letterSpacing: "0.02em",
                  }}
                />
              </div>
            ))}

            <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
              <button style={{
                fontFamily: GEIST,
                fontSize: 10,
                fontWeight: 400,
                color: TEXT,
                background: "transparent",
                border: "1px solid rgba(245,240,232,0.28)",
                padding: "11px 32px",
                cursor: "pointer",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════

export default function AesopExplorations() {
  const [active] = useState("axiom");

  const breakout: React.CSSProperties = {
    position: "relative",
    left: "50%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",
    width: "100vw",
  };

  return (
    <div style={breakout}>
      <Nav active={active} />
      <div style={{ paddingTop: 44 }}>
        <ExplorationAxiom />
        <ExplorationPattern />
        <ExplorationSummoning />
        <ExplorationChamber />
        <ExplorationMirror />
        <ExplorationNatal />
      </div>
    </div>
  );
}
