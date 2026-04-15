"use client";

import { useState, useEffect, useRef } from "react";

// ─── Loom SVG ────────────────────────────────────────────────────────────────

type Thread = {
  id: string;
  color: string;
  opacity: number;
  xOffset: number; // slight organic drift from center
  visible: boolean;
};

const THREAD_COLORS: Record<string, string> = {
  birth: "rgba(245,240,232,0.9)",
  calendar: "rgba(139,126,200,0.7)",
  journal: "rgba(200,169,110,0.7)",
  health: "rgba(126,200,154,0.7)",
  social: "rgba(110,139,200,0.5)",
};

// Natural, slightly uneven x positions for organic feel
const THREAD_X_OFFSETS: Record<string, number> = {
  birth: 0,
  calendar: -28,
  journal: 29,
  health: -14,
  social: 18,
};

function LoomSVG({
  height = 120,
  activeThreads,
  showWeft = false,
  showFrame = true,
}: {
  height?: number;
  activeThreads: string[];
  showWeft?: boolean;
  showFrame?: boolean;
}) {
  const width = 220;
  const cx = width / 2;
  const topY = 8;
  const bottomY = height - 8;
  const weftY = bottomY - 4;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {/* Frame — top and bottom horizontal rails */}
      {showFrame && (
        <>
          <line
            x1={cx - 70}
            y1={topY}
            x2={cx + 70}
            y2={topY}
            stroke="rgba(245,240,232,0.15)"
            strokeWidth={1}
          />
          <line
            x1={cx - 70}
            y1={bottomY}
            x2={cx + 70}
            y2={bottomY}
            stroke="rgba(245,240,232,0.15)"
            strokeWidth={1}
          />
        </>
      )}

      {/* Warp threads */}
      {["birth", "calendar", "journal", "health", "social"].map((id) => {
        const isActive = activeThreads.includes(id);
        const x = cx + THREAD_X_OFFSETS[id];
        const color = THREAD_COLORS[id];
        // slight organic path — not perfectly straight
        const midX = x + (id === "calendar" ? 0.8 : id === "health" ? -0.5 : 0.3);
        return (
          <path
            key={id}
            d={`M ${x} ${topY} C ${midX} ${topY + (bottomY - topY) * 0.35}, ${x - 0.4} ${topY + (bottomY - topY) * 0.65}, ${x} ${bottomY}`}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            opacity={isActive ? 1 : 0}
            style={{
              transition: "opacity 0.8s ease",
            }}
          />
        );
      })}

      {/* Single weft thread crossing at the bottom */}
      {showWeft && (
        <line
          x1={cx - 72}
          y1={weftY}
          x2={cx + 72}
          y2={weftY}
          stroke="rgba(245,240,232,0.25)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
    </svg>
  );
}

// ─── Shared layout constants ──────────────────────────────────────────────────

const CONTENT_WIDTH = 600;

const sectionStyle: React.CSSProperties = {
  position: "relative",
  left: "50%",
  marginLeft: "-50vw",
  marginRight: "-50vw",
  width: "100vw",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#0A0B14",
  padding: "80px 24px",
  boxSizing: "border-box",
};

const innerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: CONTENT_WIDTH,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
};

// ─── Typography primitives ───────────────────────────────────────────────────

const DisplayHeading = ({
  children,
  size = 44,
  centered = false,
  style = {},
}: {
  children: React.ReactNode;
  size?: number;
  centered?: boolean;
  style?: React.CSSProperties;
}) => (
  <h2
    style={{
      fontFamily: "var(--font-cormorant)",
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.05,
      color: "#F5F0E8",
      margin: 0,
      textAlign: centered ? "center" : "left",
      ...style,
    }}
  >
    {children}
  </h2>
);

const BodyLabel = ({
  children,
  opacity = 0.4,
  italic = false,
  size = 11,
  centered = false,
  style = {},
}: {
  children: React.ReactNode;
  opacity?: number;
  italic?: boolean;
  size?: number;
  centered?: boolean;
  style?: React.CSSProperties;
}) => (
  <p
    style={{
      fontFamily: "var(--font-geist-sans)",
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1.6,
      letterSpacing: "0.04em",
      color: `rgba(245,240,232,${opacity})`,
      margin: 0,
      fontStyle: italic ? "italic" : "normal",
      textAlign: centered ? "center" : "left",
      ...style,
    }}
  >
    {children}
  </p>
);

const GhostButton = ({
  children,
  onClick,
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) => (
  <button
    onClick={onClick}
    style={{
      fontFamily: "var(--font-geist-sans)",
      fontWeight: 400,
      fontSize: 11,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: "rgba(245,240,232,0.9)",
      background: "transparent",
      border: "1px solid rgba(245,240,232,0.35)",
      borderRadius: 0,
      padding: "12px 28px",
      cursor: "pointer",
      lineHeight: 1,
      transition: "border-color 0.2s ease, color 0.2s ease",
      ...style,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.borderColor =
        "rgba(245,240,232,0.7)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.borderColor =
        "rgba(245,240,232,0.35)";
    }}
  >
    {children}
  </button>
);

// ─── Input with bottom-border only ──────────────────────────────────────────

const ThreadInput = ({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
    <span
      style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 9,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(245,240,232,0.3)",
      }}
    >
      {label}
    </span>
    <div
      style={{
        borderBottom: "1px solid rgba(245,240,232,0.2)",
        paddingBottom: 8,
        display: "flex",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 20,
          color: value ? "rgba(245,240,232,0.9)" : "rgba(245,240,232,0.2)",
          fontStyle: value ? "normal" : "italic",
        }}
      >
        {value || placeholder || "—"}
      </span>
    </div>
  </div>
);

// ─── Source card ─────────────────────────────────────────────────────────────

function SourceCard({
  id,
  name,
  typeLabel,
  caption,
  connected,
  disabled,
  onToggle,
}: {
  id: string;
  name: string;
  typeLabel: string;
  caption: string;
  connected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const color = THREAD_COLORS[id];

  return (
    <div
      style={{
        border: "1px solid rgba(245,240,232,0.1)",
        padding: "20px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: disabled ? 0.38 : 1,
        background: "transparent",
        position: "relative",
      }}
    >
      {/* Thread swatch + label row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Vertical thread swatch */}
        <div
          style={{
            width: 4,
            height: 20,
            background: color,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.3)",
            }}
          >
            {typeLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontSize: 18,
              color: "#F5F0E8",
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
        </div>
      </div>

      {/* Caption */}
      <span
        style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 14,
          fontStyle: "italic",
          color: "rgba(245,240,232,0.45)",
          lineHeight: 1.4,
        }}
      >
        {caption}
      </span>

      {/* Connect button */}
      {!disabled && (
        <button
          onClick={onToggle}
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: connected ? "rgba(245,240,232,0.5)" : "rgba(245,240,232,0.9)",
            background: "transparent",
            border: "1px solid",
            borderColor: connected
              ? "rgba(245,240,232,0.15)"
              : "rgba(245,240,232,0.35)",
            borderRadius: 0,
            padding: "8px 14px",
            cursor: "pointer",
            alignSelf: "flex-start",
            transition: "all 0.2s ease",
          }}
        >
          {connected ? "Connected ✓" : "Connect"}
        </button>
      )}

      {disabled && (
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,240,232,0.2)",
          }}
        >
          Coming soon
        </span>
      )}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

const Divider = () => (
  <div
    style={{
      width: "100%",
      height: 1,
      background: "rgba(245,240,232,0.06)",
    }}
  />
);

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OnboardingThreadPage() {
  const [connected, setConnected] = useState<Set<string>>(
    new Set(["calendar", "journal", "health"])
  );

  const toggle = (id: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Threads active in each section
  const sectionC_threads = ["birth", ...Array.from(connected)];

  return (
    <div style={{ background: "#0A0B14" }}>
      {/* ═══════════════════════════════════════════════════════
          A. WELCOME
      ═══════════════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div
          style={{
            ...innerStyle,
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* Eyebrow */}
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.35)",
              marginBottom: 36,
            }}
          >
            Begin your tapestry
          </span>

          {/* Logotype */}
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 700,
              fontSize: 64,
              lineHeight: 1,
              color: "#F5F0E8",
              margin: 0,
              textAlign: "center",
              marginBottom: 52,
            }}
          >
            Mystic Council
          </h1>

          {/* Loom visualization — nearly empty, one thread just appearing */}
          <div style={{ marginBottom: 52, opacity: 0.7 }}>
            <LoomSVG
              height={120}
              activeThreads={["birth"]}
              showWeft={false}
              showFrame
            />
          </div>

          {/* Tagline */}
          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontSize: 18,
              fontStyle: "italic",
              color: "rgba(245,240,232,0.45)",
              textAlign: "center",
              margin: "0 0 48px",
              maxWidth: 340,
              lineHeight: 1.5,
            }}
          >
            Your life is already a pattern. We help you read it.
          </p>

          <GhostButton>Add your first thread</GhostButton>
        </div>
      </section>

      <Divider />

      {/* ═══════════════════════════════════════════════════════
          B. BIRTH DATA — THE FIRST THREAD
      ═══════════════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div style={{ ...innerStyle, gap: 0 }}>
          {/* Loom at top — full content-width, one thread */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 48,
            }}
          >
            <LoomSVG
              height={120}
              activeThreads={["birth"]}
              showWeft={false}
              showFrame
            />
          </div>

          {/* Step label */}
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.3)",
              marginBottom: 12,
            }}
          >
            Thread 01 — Birth Data
          </span>

          <DisplayHeading style={{ marginBottom: 12 }}>
            Your first thread.
          </DisplayHeading>

          <BodyLabel style={{ marginBottom: 48, maxWidth: 420 }}>
            Birth data is the warp — the permanent structure from which all else
            is woven.
          </BodyLabel>

          {/* Form fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 32,
              width: "100%",
              marginBottom: 48,
            }}
          >
            <ThreadInput label="Name" value="Elara Voss" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 32,
              }}
            >
              <ThreadInput label="Date of Birth" value="March 14, 1991" />
              <ThreadInput label="Time of Birth" value="4:22 AM" />
            </div>
            <ThreadInput label="Place of Birth" value="Portland, Oregon" />
          </div>

          {/* Completion note */}
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              fontStyle: "italic",
              letterSpacing: "0.04em",
              color: "rgba(245,240,232,0.3)",
            }}
          >
            Thread set. The loom holds your birth.
          </span>
        </div>
      </section>

      <Divider />

      {/* ═══════════════════════════════════════════════════════
          C. ADD MORE THREADS
      ═══════════════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div style={{ ...innerStyle, gap: 0 }}>
          {/* Loom — showing birth + connected */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 48,
            }}
          >
            <LoomSVG
              height={120}
              activeThreads={sectionC_threads}
              showWeft={false}
              showFrame
            />
          </div>

          {/* Step label */}
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.3)",
              marginBottom: 12,
            }}
          >
            Threads 02–05 — Additional Sources
          </span>

          <DisplayHeading style={{ marginBottom: 12 }}>
            Add more threads.
          </DisplayHeading>

          <BodyLabel style={{ marginBottom: 48, maxWidth: 420 }}>
            Each source enriches the weave. Connect what you trust.
          </BodyLabel>

          {/* Source cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              width: "100%",
              background: "rgba(245,240,232,0.06)",
            }}
          >
            {/* Wrap each card in a bg container to prevent grid gap from showing through */}
            {[
              {
                id: "calendar",
                name: "Calendar",
                typeLabel: "Time Patterns",
                caption: "Your time patterns.",
              },
              {
                id: "journal",
                name: "Journal",
                typeLabel: "Inner Voice",
                caption: "Your inner voice.",
              },
              {
                id: "health",
                name: "Health",
                typeLabel: "Body Rhythms",
                caption: "Your body's rhythms.",
              },
              {
                id: "social",
                name: "Social",
                typeLabel: "Relational Field",
                caption: "Your relational field.",
                disabled: true,
              },
            ].map((src) => (
              <div key={src.id} style={{ background: "#0A0B14" }}>
                <SourceCard
                  id={src.id}
                  name={src.name}
                  typeLabel={src.typeLabel}
                  caption={src.caption}
                  connected={connected.has(src.id)}
                  disabled={src.disabled}
                  onToggle={() => toggle(src.id)}
                />
              </div>
            ))}
          </div>

          {/* Thread count note */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 13,
                fontStyle: "italic",
                color: "rgba(245,240,232,0.3)",
              }}
            >
              {sectionC_threads.length} thread
              {sectionC_threads.length !== 1 ? "s" : ""} on your loom
            </span>
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══════════════════════════════════════════════════════
          D. READY — THE LOOM PREVIEW
      ═══════════════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div style={{ ...innerStyle, gap: 0 }}>
          {/* Large loom visualization */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 56,
            }}
          >
            <LoomSVG
              height={160}
              activeThreads={sectionC_threads}
              showWeft
              showFrame
            />
          </div>

          {/* Step label */}
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.3)",
              marginBottom: 12,
            }}
          >
            Loom Preview
          </span>

          <DisplayHeading size={38} style={{ marginBottom: 16 }}>
            Your loom is ready.
          </DisplayHeading>

          <p
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontSize: 18,
              fontStyle: "italic",
              color: "rgba(245,240,232,0.5)",
              margin: "0 0 48px",
              lineHeight: 1.55,
              maxWidth: 400,
            }}
          >
            Each reading will weave a new thread across. Your tapestry begins
            now.
          </p>

          {/* Thread legend */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 52,
            }}
          >
            {[
              { id: "birth", label: "Birth Data", note: "Foundation warp" },
              {
                id: "calendar",
                label: "Calendar",
                note: "Time patterns",
                optional: true,
              },
              {
                id: "journal",
                label: "Journal",
                note: "Inner voice",
                optional: true,
              },
              {
                id: "health",
                label: "Health",
                note: "Body rhythms",
                optional: true,
              },
            ]
              .filter(
                (t) => t.id === "birth" || connected.has(t.id)
              )
              .map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Swatch */}
                  <div
                    style={{
                      width: 4,
                      height: 18,
                      background: THREAD_COLORS[t.id],
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: 16,
                      color: "rgba(245,240,232,0.8)",
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(245,240,232,0.25)",
                    }}
                  >
                    {t.note}
                  </span>
                </div>
              ))}
          </div>

          <GhostButton>Begin your first reading</GhostButton>

          {/* Footer prophecy */}
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              fontStyle: "italic",
              letterSpacing: "0.04em",
              color: "rgba(245,240,232,0.2)",
              marginTop: 40,
            }}
          >
            Return often. The pattern takes time.
          </span>
        </div>
      </section>
    </div>
  );
}
