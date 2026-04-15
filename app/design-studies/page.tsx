"use client";

import { useState, useEffect, useRef } from "react";

// ─── Star field data (static to avoid hydration mismatch) ───────────────────
const STARS = [
  { x: 8, y: 12 }, { x: 23, y: 5 }, { x: 41, y: 18 }, { x: 67, y: 9 },
  { x: 85, y: 22 }, { x: 14, y: 34 }, { x: 58, y: 28 }, { x: 78, y: 41 },
  { x: 32, y: 47 }, { x: 91, y: 15 }, { x: 4, y: 61 }, { x: 47, y: 55 },
  { x: 71, y: 67 }, { x: 19, y: 73 }, { x: 55, y: 82 }, { x: 88, y: 78 },
  { x: 36, y: 89 }, { x: 62, y: 94 }, { x: 11, y: 88 }, { x: 79, y: 56 },
  { x: 25, y: 62 }, { x: 94, y: 44 }, { x: 44, y: 38 }, { x: 17, y: 49 },
  { x: 83, y: 31 }, { x: 50, y: 71 }, { x: 7, y: 24 }, { x: 73, y: 83 },
  { x: 38, y: 14 }, { x: 96, y: 67 }, { x: 29, y: 91 }, { x: 61, y: 44 },
  { x: 52, y: 8 }, { x: 15, y: 77 }, { x: 87, y: 93 }, { x: 43, y: 63 },
  { x: 69, y: 19 }, { x: 3, y: 42 }, { x: 57, y: 35 }, { x: 92, y: 58 },
];

// ─── Expert data ─────────────────────────────────────────────────────────────
const EXPERTS = [
  {
    name: "Western Astrology",
    label: "WESTERN ASTROLOGY",
    symbol: "✦",
    aesopColor: "#8B7EC8",
    calmColor: "#7B8FD4",
    ritualColor: "#4A6FD4",
    text: "With Saturn transiting your 10th house through autumn, this is a year of consolidation rather than breakthrough. The pressure you feel is structural. Jupiter's trine to your natal Venus in late October opens a genuine window of opportunity — but its shape is reception, not pursuit.",
  },
  {
    name: "Chinese Astrology",
    label: "CHINESE ASTROLOGY",
    symbol: "☯",
    aesopColor: "#C8846E",
    calmColor: "#D47B6E",
    ritualColor: "#C4383A",
    text: "The Year of the Wood Snake brings transformation to those born in the Year of the Rabbit. Metal governs your career palace. Patience through Q2; the Snake's wisdom rewards those who do not force the knot.",
  },
  {
    name: "The Oracle",
    symbol: "◈",
    isOracle: true,
    text: "You are not lost — you are in gestation.\n\nEvery tradition sees the same season: late winter, not the end of growth but its most interior phase. Do not mistake stillness for stagnation. The clarity you seek is assembling itself in the dark, the way roots thicken before the shoot breaks ground.\n\nBy autumn, the world will confirm what you already know.",
  },
];

const QUESTION = "Will I find clarity in my career path this year?";

// ─── Shared star field component ─────────────────────────────────────────────
function StarField({ opacity = 0.15 }: { opacity?: number }) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: i % 5 === 0 ? 2 : 1,
            height: i % 5 === 0 ? 2 : 1,
            borderRadius: "50%",
            background: "#E8E4F0",
            opacity: opacity * (0.5 + (i % 3) * 0.25),
          }}
        />
      ))}
    </div>
  );
}

// ─── Sticky design nav ───────────────────────────────────────────────────────
function DesignNav({ active }: { active: string }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      background: "rgba(6, 8, 16, 0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
    }}>
      <span style={{
        fontFamily: "var(--font-cormorant)",
        fontSize: 14,
        letterSpacing: "0.2em",
        color: "rgba(232,220,200,0.5)",
        textTransform: "uppercase",
      }}>
        Design Studies
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {[
          { id: "aesop", label: "Aesop" },
          { id: "calm", label: "Calm" },
          { id: "ritual", label: "Ritual" },
        ].map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 12,
              letterSpacing: "0.1em",
              color: active === id ? "#F5F0E8" : "rgba(245,240,232,0.4)",
              textDecoration: "none",
              padding: "6px 14px",
              border: active === id ? "1px solid rgba(245,240,232,0.3)" : "1px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AESOP DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

function AesopLanding() {
  return (
    <div style={{
      background: "#0A0B14",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 40px",
      position: "relative",
    }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "clamp(64px, 10vw, 96px)",
          fontWeight: 700,
          color: "#F5F0E8",
          letterSpacing: "0.12em",
          lineHeight: 1,
          margin: 0,
        }}>
          MYSTIC<br />COUNCIL
        </h1>

        <div style={{
          width: 180,
          height: 1,
          background: "#F5F0E8",
          opacity: 0.2,
          margin: "36px auto",
        }} />

        <p style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 13,
          fontWeight: 300,
          color: "#F5F0E8",
          opacity: 0.55,
          letterSpacing: "0.14em",
          margin: "0 0 48px",
          textTransform: "uppercase",
        }}>
          Five traditions. One question.
        </p>

        <button style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 12,
          fontWeight: 400,
          color: "#F5F0E8",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          background: "transparent",
          border: "1px solid rgba(245,240,232,0.4)",
          padding: "12px 36px",
          cursor: "pointer",
          transition: "border-color 0.2s, opacity 0.2s",
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,240,232,1)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(245,240,232,0.4)")}
        >
          Begin
        </button>
      </div>
    </div>
  );
}

function AesopForm() {
  return (
    <div style={{
      background: "#0A0B14",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      padding: "40px",
      position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 64 }}>
        <span style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 16,
          fontWeight: 600,
          color: "rgba(245,240,232,0.5)",
          letterSpacing: "0.12em",
        }}>
          MYSTIC COUNCIL
        </span>
        <span style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 11,
          color: "rgba(245,240,232,0.3)",
          letterSpacing: "0.1em",
        }}>
          1 — 2
        </span>
      </div>

      <div style={{ flex: 1, maxWidth: 520 }}>
        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "clamp(32px, 5vw, 44px)",
          fontWeight: 700,
          color: "#F5F0E8",
          lineHeight: 1.1,
          margin: "0 0 48px",
        }}>
          Before the Council speaks,<br />
          it must know when you{" "}
          <em style={{ fontStyle: "italic" }}>arrived.</em>
        </h2>

        <AesopFieldGroup label="Date of Birth">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 12 }}>
            {["Month", "Day", "Year"].map(p => (
              <div key={p}>
                <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 10, color: "rgba(245,240,232,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{p}</div>
                <input
                  type="text"
                  placeholder={p === "Year" ? "1991" : p === "Month" ? "06" : "01"}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "1px solid rgba(245,240,232,0.2)",
                    padding: "10px 12px",
                    fontFamily: "var(--font-cormorant)",
                    fontSize: 24,
                    fontWeight: 400,
                    color: "#F5F0E8",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
        </AesopFieldGroup>

        <AesopFieldGroup label="Time of Birth">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 10, color: "rgba(245,240,232,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Hour : Minute</div>
              <input
                type="text"
                placeholder="11 : 44"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(245,240,232,0.2)",
                  padding: "10px 12px",
                  fontFamily: "var(--font-cormorant)",
                  fontSize: 24,
                  color: "#F5F0E8",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 10, color: "rgba(245,240,232,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Period</div>
              <div style={{ display: "flex", border: "1px solid rgba(245,240,232,0.2)" }}>
                {["AM", "PM"].map((p, i) => (
                  <button key={p} style={{
                    fontFamily: "var(--font-geist-sans)",
                    fontSize: 12,
                    color: i === 0 ? "#F5F0E8" : "rgba(245,240,232,0.35)",
                    background: "transparent",
                    border: "none",
                    borderBottom: i === 0 ? "2px solid #F5F0E8" : "2px solid transparent",
                    padding: "10px 16px",
                    cursor: "pointer",
                    letterSpacing: "0.08em",
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </AesopFieldGroup>

        <AesopFieldGroup label="Place of Birth">
          <input
            type="text"
            placeholder="Manila, Philippines"
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(245,240,232,0.2)",
              padding: "10px 12px",
              fontFamily: "var(--font-cormorant)",
              fontSize: 22,
              color: "#F5F0E8",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </AesopFieldGroup>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 48 }}>
        <button style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 12,
          color: "#F5F0E8",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          background: "transparent",
          border: "1px solid rgba(245,240,232,0.4)",
          padding: "12px 36px",
          cursor: "pointer",
        }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function AesopFieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}>
        <span style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 10,
          fontWeight: 500,
          color: "rgba(245,240,232,0.4)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.12)" }} />
      </div>
      {children}
    </div>
  );
}

function AesopReading() {
  return (
    <div style={{
      background: "#0A0B14",
      padding: "40px 40px 80px",
      minHeight: "100vh",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <span style={{ fontFamily: "var(--font-cormorant)", fontSize: 16, fontWeight: 600, color: "rgba(245,240,232,0.5)", letterSpacing: "0.12em" }}>
          MYSTIC COUNCIL
        </span>
        <button style={{ fontFamily: "var(--font-geist-sans)", fontSize: 11, color: "rgba(245,240,232,0.35)", background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.08em" }}>
          New Reading
        </button>
      </div>

      <div style={{ height: 1, background: "rgba(245,240,232,0.06)", marginBottom: 32 }} />

      <p style={{
        fontFamily: "var(--font-cormorant)",
        fontSize: 22,
        fontStyle: "italic",
        color: "rgba(245,240,232,0.7)",
        margin: "0 0 32px",
        lineHeight: 1.4,
      }}>
        {QUESTION}
      </p>

      <div style={{ height: 1, background: "rgba(245,240,232,0.06)", marginBottom: 32 }} />

      {/* Expert cards */}
      {EXPERTS.filter(e => !e.isOracle).map((expert, i) => (
        <div key={i} style={{
          position: "relative",
          border: "1px solid rgba(245,240,232,0.08)",
          paddingLeft: 28,
          padding: "22px 24px 22px 28px",
          marginBottom: 16,
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: expert.aesopColor,
          }} />
          <div style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(245,240,232,0.5)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ color: expert.aesopColor }}>{expert.symbol}</span>
            {expert.label}
          </div>
          <p style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 18,
            color: "rgba(245,240,232,0.85)",
            lineHeight: 1.65,
            margin: 0,
          }}>
            {expert.text}
          </p>
        </div>
      ))}

      {/* Oracle divider */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        margin: "40px 0",
      }}>
        <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.15)" }} />
        <span style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 11,
          letterSpacing: "0.25em",
          color: "rgba(245,240,232,0.4)",
          textTransform: "uppercase",
        }}>
          ✦ The Oracle
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(245,240,232,0.15)" }} />
      </div>

      {/* Oracle text */}
      {EXPERTS[2].text.split("\n\n").map((para, i) => (
        <p key={i} style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 20,
          color: "#F5F0E8",
          lineHeight: 1.8,
          margin: "0 0 24px",
        }}>
          {i === 0 ? (
            <>
              You are not lost —{" "}
              <strong style={{ fontStyle: "italic" }}>you are in gestation.</strong>
            </>
          ) : para}
        </p>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALM DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

const CALM_BG = "radial-gradient(ellipse at 50% 30%, #1A1040 0%, #0D1B3E 100%)";
const CALM_TEXT = "#E8E4F0";

function CalmLanding() {
  return (
    <div style={{
      background: CALM_BG,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 40px",
      position: "relative",
      textAlign: "center",
    }}>
      <StarField opacity={0.2} />

      {/* Icon medallion */}
      <div style={{
        width: 96,
        height: 96,
        borderRadius: "50%",
        background: "rgba(123, 111, 160, 0.15)",
        border: "1px solid rgba(196, 184, 232, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        marginBottom: 32,
        boxShadow: "0 0 60px rgba(123, 111, 160, 0.3)",
        backdropFilter: "blur(8px)",
        position: "relative",
        zIndex: 1,
      }}>
        ☽
      </div>

      <h1 style={{
        fontFamily: "var(--font-serif)",
        fontSize: "clamp(36px, 6vw, 52px)",
        fontWeight: 400,
        color: CALM_TEXT,
        letterSpacing: "0.04em",
        margin: "0 0 16px",
        position: "relative",
        zIndex: 1,
      }}>
        Mystic Council
      </h1>

      <p style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 15,
        color: "rgba(232, 228, 240, 0.6)",
        margin: "0 0 48px",
        letterSpacing: "0.04em",
        position: "relative",
        zIndex: 1,
      }}>
        Five traditions. One illuminated answer.
      </p>

      <button style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 14,
        fontWeight: 500,
        color: CALM_TEXT,
        background: "linear-gradient(135deg, rgba(123,111,160,0.4) 0%, rgba(77,60,140,0.4) 100%)",
        border: "1px solid rgba(196,184,232,0.3)",
        borderRadius: 100,
        padding: "14px 40px",
        cursor: "pointer",
        letterSpacing: "0.06em",
        backdropFilter: "blur(8px)",
        position: "relative",
        zIndex: 1,
        boxShadow: "0 4px 32px rgba(77,60,140,0.3)",
      }}>
        Enter the Council
      </button>
    </div>
  );
}

function CalmForm() {
  return (
    <div style={{
      background: CALM_BG,
      minHeight: "100vh",
      padding: "40px",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      <StarField opacity={0.15} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 56, position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "rgba(232,228,240,0.6)" }}>Mystic Council</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2].map(n => (
            <div key={n} style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: `1px solid ${n === 1 ? "rgba(196,184,232,0.6)" : "rgba(196,184,232,0.2)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-geist-sans)",
              fontSize: 11,
              color: n === 1 ? CALM_TEXT : "rgba(232,228,240,0.3)",
            }}>{n}</div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", zIndex: 1, maxWidth: 480 }}>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(28px, 4vw, 38px)",
          fontWeight: 400,
          color: CALM_TEXT,
          lineHeight: 1.25,
          margin: "0 0 40px",
        }}>
          Tell the Council<br />who you are
        </h2>

        {[
          { label: "Name", placeholder: "Nigel Lee", type: "text" },
          { label: "Date of Birth", placeholder: "June 1, 1991", type: "text" },
          { label: "Time of Birth", placeholder: "11:44 AM (optional)", type: "text" },
          { label: "Place of Birth", placeholder: "Manila, Philippines", type: "text" },
        ].map(field => (
          <div key={field.label} style={{ marginBottom: 24 }}>
            <label style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 12,
              color: "rgba(232,228,240,0.5)",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: 8,
            }}>
              {field.label}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(196,184,232,0.2)",
                borderRadius: 16,
                padding: "14px 18px",
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                color: CALM_TEXT,
                outline: "none",
                boxSizing: "border-box",
                backdropFilter: "blur(8px)",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32, position: "relative", zIndex: 1 }}>
        <button style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 14,
          color: CALM_TEXT,
          background: "linear-gradient(135deg, rgba(123,111,160,0.4) 0%, rgba(77,60,140,0.4) 100%)",
          border: "1px solid rgba(196,184,232,0.3)",
          borderRadius: 100,
          padding: "12px 32px",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

function CalmReading() {
  return (
    <div style={{
      background: CALM_BG,
      padding: "40px 40px 80px",
      minHeight: "100vh",
      position: "relative",
    }}>
      <StarField opacity={0.12} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, position: "relative", zIndex: 1 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "rgba(232,228,240,0.6)" }}>Mystic Council</span>
      </div>

      <p style={{
        fontFamily: "var(--font-serif)",
        fontSize: 20,
        color: "rgba(232,228,240,0.75)",
        margin: "0 0 40px",
        lineHeight: 1.5,
        position: "relative",
        zIndex: 1,
      }}>
        {QUESTION}
      </p>

      {/* Expert cards */}
      {EXPERTS.filter(e => !e.isOracle).map((expert, i) => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(196,184,232,0.12)",
          borderRadius: 20,
          padding: "24px",
          marginBottom: 16,
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          boxShadow: `0 0 40px ${expert.calmColor}18`,
        }}>
          {/* colored top accent */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${expert.calmColor}60 0%, transparent 100%)`,
          }} />

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: `${expert.calmColor}20`,
              border: `1px solid ${expert.calmColor}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}>
              {expert.symbol}
            </div>
            <span style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(232,228,240,0.5)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>
              {expert.label}
            </span>
          </div>

          <p style={{
            fontFamily: "var(--font-serif)",
            fontSize: 17,
            color: "rgba(232,228,240,0.85)",
            lineHeight: 1.7,
            margin: 0,
          }}>
            {expert.text}
          </p>
        </div>
      ))}

      {/* Oracle card */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: 24,
        padding: "32px",
        position: "relative",
        zIndex: 1,
        marginTop: 32,
        overflow: "hidden",
      }}>
        {/* Gold gradient border */}
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          padding: 1,
          background: "linear-gradient(135deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0.1) 50%, rgba(201,168,76,0.4) 100%)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
        }} />
        {/* Gold glow */}
        <div style={{
          position: "absolute",
          inset: -20,
          background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(201,168,76,0.15)",
            border: "1px solid rgba(201,168,76,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#C9A84C",
          }}>
            ◈
          </div>
          <span style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 11,
            fontWeight: 500,
            color: "rgba(201,168,76,0.7)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}>
            The Oracle
          </span>
        </div>

        {EXPERTS[2].text.split("\n\n").map((para, i) => (
          <p key={i} style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            color: "rgba(232,228,240,0.9)",
            lineHeight: 1.75,
            margin: "0 0 20px",
          }}>
            {i === 0 ? (
              <>You are not lost — <em><strong>you are in gestation.</strong></em></>
            ) : para}
          </p>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RITUAL DIRECTION
// ═══════════════════════════════════════════════════════════════════════════════

const RITUAL_BG = "#060810";
const RITUAL_GOLD = "#C9A84C";
const RITUAL_TEXT = "#E8DCC8";

const RITUAL_EXPERT_COLORS: Record<string, string> = {
  "Western Astrology": "#4A6FD4",
  "Chinese Astrology": "#C4383A",
};

function RitualLanding() {
  return (
    <div style={{
      background: RITUAL_BG,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 40px",
      position: "relative",
      textAlign: "center",
    }}>
      <StarField opacity={0.12} />

      {/* Diamond sigil */}
      <div style={{
        fontSize: 28,
        color: RITUAL_GOLD,
        marginBottom: 40,
        opacity: 0.8,
        position: "relative",
        zIndex: 1,
      }}>
        ◈
      </div>

      <h1 style={{
        fontFamily: "var(--font-cormorant)",
        fontSize: "clamp(52px, 8vw, 80px)",
        fontWeight: 700,
        color: RITUAL_GOLD,
        letterSpacing: "0.14em",
        lineHeight: 1,
        margin: 0,
        position: "relative",
        zIndex: 1,
      }}>
        MYSTIC<br />COUNCIL
      </h1>

      {/* Gold rule */}
      <div style={{
        width: 200,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${RITUAL_GOLD} 50%, transparent 100%)`,
        margin: "32px auto",
        position: "relative",
        zIndex: 1,
      }} />

      <p style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 11,
        fontWeight: 400,
        color: "rgba(232,220,200,0.5)",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        margin: "0 0 56px",
        position: "relative",
        zIndex: 1,
      }}>
        Five traditions. One truth.
      </p>

      <button style={{
        fontFamily: "var(--font-geist-sans)",
        fontSize: 10,
        fontWeight: 500,
        color: RITUAL_GOLD,
        background: "transparent",
        border: `1px solid ${RITUAL_GOLD}60`,
        padding: "13px 40px",
        cursor: "pointer",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        position: "relative",
        zIndex: 1,
        transition: "border-color 0.2s",
      }}>
        Begin the Ritual
      </button>
    </div>
  );
}

function RitualForm() {
  return (
    <div style={{
      background: RITUAL_BG,
      minHeight: "100vh",
      padding: "40px",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      <StarField opacity={0.1} />

      {/* Gold progress line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${RITUAL_GOLD} 0%, ${RITUAL_GOLD}60 50%, transparent 100%)`,
        zIndex: 10,
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 60, position: "relative", zIndex: 1 }}>
        <span style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 14,
          fontWeight: 600,
          color: `${RITUAL_GOLD}80`,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          Mystic Council
        </span>
        <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 10, color: `rgba(201,168,76,0.4)`, letterSpacing: "0.12em" }}>
          I — II
        </span>
      </div>

      <div style={{ flex: 1, position: "relative", zIndex: 1, maxWidth: 480 }}>
        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "clamp(30px, 5vw, 44px)",
          fontWeight: 700,
          color: RITUAL_TEXT,
          lineHeight: 1.1,
          margin: "0 0 48px",
          letterSpacing: "0.02em",
        }}>
          The Council must know<br />
          <em>when you entered the world.</em>
        </h2>

        {[
          { label: "Date of Birth", placeholder: "June 1, 1991" },
          { label: "Time of Birth", placeholder: "11:44 AM (optional)" },
          { label: "Place of Birth", placeholder: "Manila, Philippines" },
        ].map(field => (
          <div key={field.label} style={{ marginBottom: 28 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}>
              <span style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 9,
                fontWeight: 500,
                color: `${RITUAL_GOLD}60`,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                {field.label}
              </span>
              <div style={{ flex: 1, height: 1, background: `${RITUAL_GOLD}20` }} />
            </div>
            <input
              type="text"
              placeholder={field.placeholder}
              style={{
                width: "100%",
                background: "rgba(201,168,76,0.03)",
                border: `1px solid ${RITUAL_GOLD}25`,
                padding: "12px 16px",
                fontFamily: "var(--font-cormorant)",
                fontSize: 22,
                color: RITUAL_TEXT,
                outline: "none",
                boxSizing: "border-box",
                letterSpacing: "0.02em",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 40, position: "relative", zIndex: 1 }}>
        <button style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 10,
          fontWeight: 500,
          color: RITUAL_GOLD,
          background: "transparent",
          border: `1px solid ${RITUAL_GOLD}50`,
          padding: "12px 36px",
          cursor: "pointer",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function RitualReading() {
  return (
    <div style={{
      background: RITUAL_BG,
      padding: "0 0 80px",
      minHeight: "100vh",
      position: "relative",
    }}>
      <StarField opacity={0.1} />

      {/* Gold progress bar */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${RITUAL_GOLD} 0%, ${RITUAL_GOLD}40 80%, transparent 100%)`,
        marginBottom: 40,
        position: "relative",
        zIndex: 1,
      }} />

      <div style={{ padding: "0 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, position: "relative", zIndex: 1 }}>
          <span style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 13,
            fontWeight: 600,
            color: `${RITUAL_GOLD}70`,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}>
            Mystic Council
          </span>
        </div>

        <p style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: 20,
          fontStyle: "italic",
          color: `${RITUAL_TEXT}90`,
          margin: "0 0 40px",
          lineHeight: 1.5,
          position: "relative",
          zIndex: 1,
        }}>
          {QUESTION}
        </p>

        {/* Gold rule */}
        <div style={{
          width: "100%",
          height: 1,
          background: `linear-gradient(90deg, ${RITUAL_GOLD}50 0%, transparent 100%)`,
          marginBottom: 32,
          position: "relative",
          zIndex: 1,
        }} />

        {/* Expert cards */}
        {EXPERTS.filter(e => !e.isOracle).map((expert, i) => {
          const accentColor = RITUAL_EXPERT_COLORS[expert.name] || "#4A6FD4";
          return (
            <div key={i} style={{
              position: "relative",
              marginBottom: 20,
              zIndex: 1,
            }}>
              {/* Outer border */}
              <div style={{
                border: `1px solid ${accentColor}30`,
                padding: "20px 22px",
                position: "relative",
              }}>
                {/* Inner border (sacred geometry double-border effect) */}
                <div style={{
                  position: "absolute",
                  inset: 4,
                  border: `1px solid ${accentColor}15`,
                  pointerEvents: "none",
                }} />

                {/* Left color rule */}
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: accentColor,
                }} />

                <div style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 9,
                  fontWeight: 500,
                  color: `${accentColor}90`,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <span>{expert.symbol}</span>
                  {expert.label}
                </div>

                <p style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: 18,
                  color: `${RITUAL_TEXT}85`,
                  lineHeight: 1.65,
                  margin: 0,
                }}>
                  {expert.text}
                </p>
              </div>
            </div>
          );
        })}

        {/* Oracle reveal section */}
        <div style={{
          margin: "48px 0 32px",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
        }}>
          {/* Gold rule spanning full width */}
          <div style={{
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${RITUAL_GOLD}80 50%, transparent 100%)`,
            marginBottom: 24,
          }} />

          <div style={{
            fontSize: 22,
            color: RITUAL_GOLD,
            marginBottom: 8,
          }}>
            ◈
          </div>

          <div style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            fontWeight: 500,
            color: `${RITUAL_GOLD}60`,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}>
            The Oracle
          </div>

          <div style={{ textAlign: "left" }}>
            {EXPERTS[2].text.split("\n\n").map((para, i) => (
              <p key={i} style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 20,
                color: RITUAL_TEXT,
                lineHeight: 1.8,
                margin: "0 0 24px",
                letterSpacing: "0.01em",
              }}>
                {i === 0 ? (
                  <>
                    You are not lost —{" "}
                    <em style={{ color: RITUAL_GOLD }}>you are in gestation.</em>
                  </>
                ) : para}
              </p>
            ))}
          </div>

          {/* Closing gold rule */}
          <div style={{
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${RITUAL_GOLD}50 50%, transparent 100%)`,
          }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: "aesop", label: "Aesop", description: "Typography-first · Austere · Literary" },
  { id: "calm", label: "Calm", description: "Serene · Luminous · Soothing" },
  { id: "ritual", label: "Ritual", description: "Cinematic · Atmospheric · Sacred" },
];

export default function DesignStudies() {
  const [activeSection, setActiveSection] = useState("aesop");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Breakout from max-w-3xl constraint
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
      <DesignNav active={activeSection} />

      {/* Section labels */}
      {SECTIONS.map((section, sIdx) => {
        const sectionComponents: Record<string, React.ReactNode[]> = {
          aesop: [<AesopLanding key="l" />, <AesopForm key="f" />, <AesopReading key="r" />],
          calm: [<CalmLanding key="l" />, <CalmForm key="f" />, <CalmReading key="r" />],
          ritual: [<RitualLanding key="l" />, <RitualForm key="f" />, <RitualReading key="r" />],
        };

        return (
          <section key={section.id} id={section.id} style={{ scrollMarginTop: 48 }}>
            {/* Section divider */}
            <div style={{
              background: "#060810",
              padding: "20px 40px",
              borderTop: sIdx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}>
              <span style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(232,220,200,0.9)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}>
                {section.label}
              </span>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
              <span style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                color: "rgba(232,220,200,0.4)",
                letterSpacing: "0.1em",
              }}>
                {section.description}
              </span>
            </div>

            {sectionComponents[section.id]}
          </section>
        );
      })}
    </div>
  );
}
