"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TapestryGrid, savedReadingsToGridReadings } from "@/components/loom/TapestryGrid";
import { ShareableCard } from "@/components/shared/ShareableCard";
import { GhostButton } from "@/components/shared/GhostButton";
import { TRADITION_MAP, TRADITIONS } from "@/lib/constants/traditions";
import type { TraditionId } from "@/lib/constants/traditions";
import { useBirthData } from "@/lib/context/birth-data-context";
import { useReadings } from "@/lib/hooks/use-readings";

const BG = "#0A0B14";
const FG = "#F5F0E8";

const rule: React.CSSProperties = {
  borderTop: "1px solid rgba(245,240,232,0.08)",
  margin: "40px 0",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans)",
  fontSize: 9,
  letterSpacing: "0.2em",
  color: "rgba(245,240,232,0.30)",
  textTransform: "uppercase",
  marginBottom: 16,
};

// ── Stat helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the number of consecutive weeks (ending on the most recent reading's
 * week) that contain at least one reading.
 */
function computeStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;

  // Get the ISO week number (Mon-based) for a date
  function isoWeekKey(d: Date): string {
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Thursday in current week → determines ISO year
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
    return `${tmp.getUTCFullYear()}-W${week}`;
  }

  // Collect unique week keys
  const weekSet = new Set<string>(
    timestamps.map((ts) => isoWeekKey(new Date(ts)))
  );
  const sortedWeeks = Array.from(weekSet).sort();

  // Walk backwards from the most recent week
  const latestWeek = sortedWeeks[sortedWeeks.length - 1];

  function prevWeekKey(key: string): string {
    const [yearStr, wStr] = key.split("-W");
    let year = parseInt(yearStr, 10);
    let week = parseInt(wStr, 10) - 1;
    if (week === 0) {
      year -= 1;
      // ISO weeks in the previous year
      const dec28 = new Date(Date.UTC(year, 11, 28));
      const dec28Dow = dec28.getUTCDay() || 7;
      dec28.setUTCDate(dec28.getUTCDate() + 4 - dec28Dow);
      const yearStart = new Date(Date.UTC(dec28.getUTCFullYear(), 0, 1));
      week = Math.ceil(
        ((dec28.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
      );
    }
    return `${year}-W${week}`;
  }

  let streak = 1;
  let current = latestWeek;
  while (true) {
    const prev = prevWeekKey(current);
    if (weekSet.has(prev)) {
      streak++;
      current = prev;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Count distinct tradition IDs across all readings, capped at 5.
 */
function countThreads(allTraditions: string[][]): number {
  const ids = new Set<string>();
  for (const arr of allTraditions) for (const t of arr) ids.add(t);
  return Math.min(ids.size, 5);
}

/**
 * Return the tradition name that appears most frequently.
 */
function mostConsulted(allTraditions: string[][]): string {
  const freq: Record<string, number> = {};
  for (const arr of allTraditions) {
    for (const t of arr) {
      freq[t] = (freq[t] ?? 0) + 1;
    }
  }
  let best = "";
  let bestCount = 0;
  for (const [t, count] of Object.entries(freq)) {
    if (count > bestCount) {
      bestCount = count;
      best = t;
    }
  }
  if (!best) return "—";
  // Return short label from TRADITION_MAP if available
  const tid = best as TraditionId;
  return TRADITION_MAP[tid]?.shortLabel ?? best;
}

export default function TapestryPage() {
  const router = useRouter();
  const { birthData } = useBirthData();
  const { readings: savedReadings } = useReadings();

  const [shareHovered, setShareHovered] = useState(false);
  const [connectHovered, setConnectHovered] = useState(false);
  const [viewAllHovered, setViewAllHovered] = useState(false);
  const [cardShareHovered, setCardShareHovered] = useState(false);

  // Map saved readings → internal grid format
  const gridReadings = useMemo(
    () => savedReadingsToGridReadings(savedReadings),
    [savedReadings]
  );

  // Compute real stats
  const readingCount = savedReadings.length;

  const streakWeeks = useMemo(
    () => computeStreak(savedReadings.map((r) => r.timestamp)),
    [savedReadings]
  );

  const threadsConnected = useMemo(
    () => countThreads(savedReadings.map((r) => r.traditionsConsulted)),
    [savedReadings]
  );

  const mostConsultedLabel = useMemo(
    () => mostConsulted(savedReadings.map((r) => r.traditionsConsulted)),
    [savedReadings]
  );

  // 3 most recent readings (savedReadings is already newest-first)
  const recentReadings = useMemo(
    () =>
      savedReadings.slice(0, 3).map((sr) => ({
        id: sr.id,
        date: new Date(sr.timestamp),
        question: sr.question,
        traditions: sr.traditionsConsulted.filter(
          (t): t is TraditionId =>
            (["western", "chinese", "vedic", "tarot", "numerology", "oracle"] as string[]).includes(t)
        ),
      })),
    [savedReadings]
  );

  // Build thread inventory from real data
  const usedTraditionIds = useMemo(() => {
    const ids = new Set<TraditionId>();
    for (const r of savedReadings) {
      for (const t of r.traditionsConsulted) {
        const validIds: TraditionId[] = ["western", "chinese", "vedic", "tarot", "numerology", "oracle"];
        if (validIds.includes(t as TraditionId)) ids.add(t as TraditionId);
      }
    }
    return ids;
  }, [savedReadings]);

  // Latest reading date per tradition
  const latestByTradition = useMemo(() => {
    const latest: Partial<Record<TraditionId, Date>> = {};
    // savedReadings newest-first, so first occurrence = most recent
    for (const r of [...savedReadings].reverse()) {
      for (const t of r.traditionsConsulted) {
        const tid = t as TraditionId;
        const d = new Date(r.timestamp);
        if (!latest[tid] || d > latest[tid]!) latest[tid] = d;
      }
    }
    return latest;
  }, [savedReadings]);

  function formatLastWoven(date: Date | undefined): string {
    if (!date) return "—";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return "1 week ago";
    return `${diffWeeks} weeks ago`;
  }

  const name = birthData?.name ?? "Seeker";

  // ── Empty state ───────────────────────────────────────────────────────────
  if (readingCount === 0) {
    return (
      <div
        style={{
          background: BG,
          color: FG,
          minHeight: "100vh",
          fontFamily: "var(--font-geist-sans)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          {/* Back link */}
          <div style={{ marginBottom: 48, textAlign: "left" }}>
            <Link
              href="/chat"
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 12,
                color: "rgba(245,240,232,0.40)",
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
            >
              ← Council
            </Link>
          </div>

          <div
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: 38,
              fontWeight: 700,
              color: FG,
              letterSpacing: "0.01em",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Your tapestry has not yet begun.
          </div>

          <div
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 13,
              color: "rgba(245,240,232,0.45)",
              letterSpacing: "0.02em",
              lineHeight: 1.6,
              marginBottom: 40,
            }}
          >
            Complete your first reading to weave your first thread.
          </div>

          <Link
            href="/chat"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-geist-sans)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.55)",
              border: "1px solid rgba(245,240,232,0.18)",
              borderRadius: 0,
              padding: "10px 28px",
              textDecoration: "none",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            Begin a reading
          </Link>
        </div>
      </div>
    );
  }

  // ── Full tapestry page ────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, color: FG, minHeight: "100vh", fontFamily: "var(--font-geist-sans)" }}>
      <div
        style={{
          position: "relative",
          left: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          width: "100vw",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>

          {/* ── A. Header ─────────────────────────────────────── */}
          <div style={{ paddingTop: 40, paddingBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <Link
                href="/chat"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 12,
                  color: "rgba(245,240,232,0.40)",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                ← Council
              </Link>
              <button
                onMouseEnter={() => setShareHovered(true)}
                onMouseLeave={() => setShareHovered(false)}
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: shareHovered ? FG : "rgba(245,240,232,0.55)",
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

            <div
              style={{
                fontFamily: "var(--font-cormorant)",
                fontStyle: "italic",
                fontSize: 22,
                color: "rgba(245,240,232,0.55)",
                marginBottom: 8,
                fontWeight: 300,
              }}
            >
              {name}
            </div>

            <div
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                color: "rgba(245,240,232,0.40)",
                letterSpacing: "0.02em",
              }}
            >
              {readingCount} reading{readingCount !== 1 ? "s" : ""} woven
            </div>
          </div>

          <div style={rule} />

          {/* ── B. Tapestry Grid ──────────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <TapestryGrid readings={gridReadings} />
          </div>

          <div style={rule} />

          {/* ── C. Stats ──────────────────────────────────────── */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {[
                { number: String(readingCount),                    sub: "Readings woven"   },
                { number: String(streakWeeks),                     sub: "Week streak"       },
                { number: `${threadsConnected} / 5`,               sub: "Threads connected" },
                { number: mostConsultedLabel, sub: "Most consulted", isText: true },
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
                      fontFamily: "var(--font-cormorant)",
                      fontSize: stat.isText ? 30 : 44,
                      fontWeight: 700,
                      color: FG,
                      lineHeight: 1.05,
                      marginBottom: 6,
                    }}
                  >
                    {stat.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-geist-sans)",
                      fontSize: 10,
                      color: "rgba(245,240,232,0.30)",
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

          <div style={rule} />

          {/* ── D. Thread Inventory ───────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <div style={sectionLabel}>Your Threads</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {TRADITIONS.filter((t) => t.id !== "oracle").map((trad, i) => {
                const active = usedTraditionIds.has(trad.id);
                const lastDate = latestByTradition[trad.id];
                const arr = TRADITIONS.filter((t) => t.id !== "oracle");
                return (
                  <div
                    key={trad.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "13px 0",
                      borderBottom: i < arr.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none",
                      opacity: active ? 1 : 0.38,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 22,
                        background: trad.hex,
                        flexShrink: 0,
                        opacity: active ? 0.9 : 0.35,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-geist-sans)",
                          fontSize: 13,
                          color: active ? "rgba(245,240,232,0.82)" : "rgba(245,240,232,0.38)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {trad.label}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-geist-sans)",
                        fontSize: 10,
                        color: "rgba(245,240,232,0.28)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {active ? `Last woven ${formatLastWoven(lastDate)}` : "Not connected"}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onMouseEnter={() => setConnectHovered(true)}
              onMouseLeave={() => setConnectHovered(false)}
              style={{
                marginTop: 20,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: connectHovered ? "rgba(245,240,232,0.70)" : "rgba(245,240,232,0.35)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              + Connect a new thread
            </button>
          </div>

          <div style={rule} />

          {/* ── E. Recent Readings ────────────────────────────── */}
          <div style={{ marginBottom: 48 }}>
            <div style={sectionLabel}>Recent Readings</div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentReadings.map((reading, i) => {
                const dateStr = reading.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <Link
                    key={i}
                    href={`/reading/${reading.id}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 16,
                      padding: "16px 0",
                      borderBottom: i < recentReadings.length - 1 ? "1px solid rgba(245,240,232,0.06)" : "none",
                      textDecoration: "none",
                      cursor: "pointer",
                      opacity: 1,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-geist-sans)",
                        fontSize: 11,
                        color: "rgba(245,240,232,0.28)",
                        letterSpacing: "0.05em",
                        flexShrink: 0,
                        paddingTop: 2,
                        minWidth: 44,
                      }}
                    >
                      {dateStr}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-cormorant)",
                        fontStyle: "italic",
                        fontSize: 16,
                        color: "rgba(245,240,232,0.82)",
                        lineHeight: 1.35,
                        fontWeight: 300,
                      }}
                    >
                      {reading.question}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
                      {reading.traditions.map((tid) => (
                        <div
                          key={tid}
                          style={{
                            width: 6, height: 6,
                            borderRadius: "50%",
                            background: TRADITION_MAP[tid].hex,
                            opacity: 0.85,
                          }}
                        />
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>

            <button
              onMouseEnter={() => setViewAllHovered(true)}
              onMouseLeave={() => setViewAllHovered(false)}
              style={{
                marginTop: 18,
                fontFamily: "var(--font-geist-sans)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: viewAllHovered ? "rgba(245,240,232,0.65)" : "rgba(245,240,232,0.32)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              View all {readingCount} reading{readingCount !== 1 ? "s" : ""} →
            </button>
          </div>

          <div style={rule} />

          {/* ── F. Shareable Card ─────────────────────────────── */}
          <div style={{ marginBottom: 40 }}>
            <div style={sectionLabel}>Your Tapestry Card</div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 20 }}>
              <ShareableCard
                readings={gridReadings}
                name={name}
                readingCount={readingCount}
                streakWeeks={streakWeeks}
              />

              <button
                onMouseEnter={() => setCardShareHovered(true)}
                onMouseLeave={() => setCardShareHovered(false)}
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: cardShareHovered ? FG : "rgba(245,240,232,0.55)",
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

          <div style={rule} />

          {/* ── G. Begin a new reading CTA ────────────────────── */}
          <div style={{ paddingBottom: 80 }}>
            <GhostButton onClick={() => router.push("/chat")}>
              Begin a new reading
            </GhostButton>
          </div>

        </div>
      </div>
    </div>
  );
}
