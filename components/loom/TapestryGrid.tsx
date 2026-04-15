"use client";

import { useMemo } from "react";
import { WovenTile } from "./WovenTile";
import type { TraditionId } from "@/lib/constants/traditions";

export interface Reading {
  week: number;
  date: Date;
  question: string;
  traditions: TraditionId[];
  depth: number;
  isRichest?: boolean;
}

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Data generation ──────────────────────────────────────────────────────────

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

const ALL_TRADITIONS: TraditionId[] = ["western", "chinese", "vedic", "tarot", "numerology", "oracle"];

export function generateReadings(startDate = new Date("2025-03-02")): Reading[] {
  const rng = seededRng(0xdeadbeef);
  const readings: Reading[] = [];

  for (let w = 0; w < 52; w++) {
    const recencyBoost = w / 52;
    // Daily incentive: higher chance of activity in recent weeks
    const hasSomeActivity = rng() < 0.55 + recencyBoost * 0.35;
    if (!hasSomeActivity && w < 46) continue;

    const countRoll = rng();
    const count = countRoll < 0.6 ? 1 : countRoll < 0.88 ? 2 : 3;

    for (let r = 0; r < count; r++) {
      const depthRoll = rng();
      const depth =
        depthRoll < 0.15 ? 1 :
        depthRoll < 0.40 ? 2 :
        depthRoll < 0.70 ? 3 :
        depthRoll < 0.88 ? 4 :
        depthRoll < 0.96 ? 5 : 6;

      const shuffled = [...ALL_TRADITIONS].sort(() => rng() - 0.5);
      const picked = shuffled.slice(0, depth);

      // Assign a specific day of the week within this week
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + w * 7 + Math.floor(rng() * 7));

      readings.push({
        week: w,
        date: weekDate,
        question: QUESTIONS[Math.floor(rng() * QUESTIONS.length)],
        traditions: picked,
        depth,
      });
    }
  }

  let richest = readings[0];
  for (const r of readings) if (r.depth > richest.depth) richest = r;
  if (richest) richest.isRichest = true;

  return readings;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const CELL = 20;    // px per cell
const GAP  = 3;     // px gap between cells
const STEP = CELL + GAP;

// Day labels: Monday first
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// ─── TapestryGrid ─────────────────────────────────────────────────────────────
//
// Layout: 7 columns (days of week, Mon–Sun) × 52 rows (weeks)
// No horizontal scroll — all 7 cols fit in ~163px.
// Vertical scroll is intentional — the year grows downward.

export function TapestryGrid({ readings }: { readings: Reading[] }) {
  const NUM_WEEKS = 52;

  // ── Build 7×52 date grid starting from the Monday on/before startDate ──────
  const gridStart = useMemo(() => {
    const start = new Date("2025-03-02");
    // Find the Monday on or before the start date
    const dow = start.getDay(); // 0=Sun, 1=Mon, …
    const daysBack = dow === 0 ? 6 : dow - 1;
    const monday = new Date(start);
    monday.setDate(start.getDate() - daysBack);
    return monday;
  }, []);

  const grid: Date[][] = useMemo(() => {
    return Array.from({ length: NUM_WEEKS }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + week * 7 + day);
        return d;
      })
    );
  }, [gridStart]);

  // ── Group readings by calendar day ─────────────────────────────────────────
  const byDay = useMemo(() => {
    const map: Record<string, Reading[]> = {};
    for (const r of readings) {
      const key = r.date.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [readings]);

  // ── Month label positions (first week of each month) ───────────────────────
  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < NUM_WEEKS; w++) {
      const m = grid[w][0].getMonth();
      if (m !== lastMonth) {
        labels.push({ week: w, label: grid[w][0].toLocaleString("en-US", { month: "short" }) });
        lastMonth = m;
      }
    }
    return labels;
  }, [grid]);

  // Today's date string for highlighting
  const todayStr = new Date().toDateString();

  const gridWidth = 7 * STEP - GAP;     // ~163px — no horizontal scroll
  const labelColW = 32;                  // month label column

  return (
    <div style={{ width: "100%" }}>
      {/* Section label */}
      <div
        style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 9,
          letterSpacing: "0.2em",
          color: "rgba(245,240,232,0.30)",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        Daily Readings
      </div>

      {/* Day-of-week header */}
      <div
        style={{
          display: "flex",
          gap: GAP,
          marginLeft: labelColW,
          marginBottom: 8,
        }}
      >
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            style={{
              width: CELL,
              textAlign: "center",
              fontFamily: "var(--font-geist-sans)",
              fontSize: 8,
              color: "rgba(245,240,232,0.22)",
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div style={{ position: "relative" }}>
        {grid.map((week, w) => {
          // Find if a month label starts on this row
          const monthLabel = monthLabels.find((ml) => ml.week === w);

          return (
            <div
              key={w}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                marginBottom: GAP,
              }}
            >
              {/* Month label column */}
              <div
                style={{
                  width: labelColW,
                  flexShrink: 0,
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: 8,
                  color: "rgba(245,240,232,0.22)",
                  letterSpacing: "0.04em",
                  paddingRight: 8,
                  textAlign: "right",
                  lineHeight: `${CELL}px`,
                }}
              >
                {monthLabel?.label ?? ""}
              </div>

              {/* 7 day cells */}
              <div style={{ display: "flex", gap: GAP }}>
                {week.map((date, d) => {
                  const key = date.toDateString();
                  const dayReadings = byDay[key] ?? [];
                  const hasReading = dayReadings.length > 0;
                  const isToday = key === todayStr;

                  // Pick the richest reading for this day's tile
                  const primary = dayReadings.reduce(
                    (best, r) => (r.depth > best.depth ? r : best),
                    dayReadings[0]
                  );

                  return (
                    <div
                      key={d}
                      style={{
                        width: CELL,
                        height: CELL,
                        flexShrink: 0,
                        position: "relative",
                        // Today highlight: faint border even when empty
                        outline: isToday ? "1px solid rgba(245,240,232,0.35)" : "none",
                        outlineOffset: 1,
                      }}
                      title={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${hasReading ? ` · ${dayReadings.length} reading${dayReadings.length > 1 ? "s" : ""}` : " · no reading"}`}
                    >
                      {hasReading ? (
                        <WovenTile
                          traditions={primary.traditions}
                          depth={primary.depth}
                          isRichest={primary.isRichest}
                          size={CELL}
                        />
                      ) : (
                        <div
                          style={{
                            width: CELL,
                            height: CELL,
                            border: "0.5px solid rgba(245,240,232,0.07)",
                            backgroundColor: isToday ? "rgba(245,240,232,0.03)" : "transparent",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Streak nudge — today if empty */}
      <div style={{ marginTop: 16 }}>
        {!byDay[todayStr] ? (
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "rgba(245,240,232,0.28)",
              fontStyle: "italic",
            }}
          >
            No reading woven today.
          </span>
        ) : (
          <span
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "rgba(245,240,232,0.28)",
          }}
          >
            {byDay[todayStr].length} reading{byDay[todayStr].length > 1 ? "s" : ""} woven today.
          </span>
        )}
      </div>
    </div>
  );
}
