"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoomSVG } from "@/components/loom/LoomSVG";
import { GhostButton } from "@/components/shared/GhostButton";
import { ThreadInput } from "@/components/shared/ThreadInput";
import { SourceCard } from "@/components/shared/SourceCard";
import { useBirthData } from "@/lib/context/birth-data-context";
import type { BirthData } from "@/lib/experts/types";
import type { ThreadId } from "@/lib/constants/threads";

// ─── Layout constants ─────────────────────────────────────────────────────────

const BG = "#0A0B14";
const TEXT = "#F5F0E8";
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
  backgroundColor: BG,
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

const Divider = () => (
  <div
    style={{
      position: "relative",
      left: "50%",
      marginLeft: "-50vw",
      marginRight: "-50vw",
      width: "100vw",
      height: 1,
      background: "rgba(245,240,232,0.06)",
    }}
  />
);

// ─── Source card data ─────────────────────────────────────────────────────────

const SOURCES = [
  { id: "calendar" as ThreadId, name: "Calendar", typeLabel: "Time Patterns",   caption: "Your time patterns." },
  { id: "journal"  as ThreadId, name: "Journal",  typeLabel: "Inner Voice",     caption: "Your inner voice." },
  { id: "health"   as ThreadId, name: "Health",   typeLabel: "Body Rhythms",    caption: "Your body's rhythms." },
  { id: "social"   as ThreadId, name: "Social",   typeLabel: "Relational Field", caption: "Your relational field.", disabled: true },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { birthData, setBirthData } = useBirthData();

  const [form, setForm] = useState<BirthData>({
    name: birthData?.name ?? "Nigel Lee",
    date: birthData?.date ?? "1991-06-01",
    time: birthData?.time ?? "11:44",
    location: birthData?.location ?? "Manila",
  });

  const [connected, setConnected] = useState<Set<string>>(new Set(["calendar", "journal", "health"]));

  const toggle = (id: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeThreads = ["birth", ...Array.from(connected)];

  const handleBeginReading = () => {
    const data: BirthData = {};
    if (form.name?.trim()) data.name = form.name.trim();
    if (form.date) data.date = form.date;
    if (form.time) data.time = form.time;
    if (form.location?.trim()) data.location = form.location.trim();
    setBirthData(data);
    router.push("/daily");
  };

  return (
    <div style={{ background: BG }}>

      {/* ═══ A. WELCOME ══════════════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div style={{ ...innerStyle, alignItems: "center", gap: 0 }}>

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

          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 700,
              fontSize: 64,
              lineHeight: 1,
              color: TEXT,
              margin: 0,
              textAlign: "center",
              marginBottom: 52,
            }}
          >
            Mystic Council
          </h1>

          <div style={{ marginBottom: 52, opacity: 0.7 }}>
            <LoomSVG height={120} activeThreads={["birth"]} showWeft={false} showFrame />
          </div>

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

          <GhostButton onClick={() => {
            document.getElementById("section-birth")?.scrollIntoView({ behavior: "smooth" });
          }}>
            Add your first thread
          </GhostButton>
        </div>
      </section>

      <Divider />

      {/* ═══ B. BIRTH DATA ═══════════════════════════════════════════════════ */}
      <section id="section-birth" style={sectionStyle}>
        <div style={{ ...innerStyle, gap: 0 }}>

          <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 48 }}>
            <LoomSVG height={120} activeThreads={["birth"]} showWeft={false} showFrame />
          </div>

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

          <h2
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 700,
              fontSize: 44,
              lineHeight: 1.05,
              color: TEXT,
              margin: "0 0 12px",
            }}
          >
            Your first thread.
          </h2>

          <p
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontWeight: 400,
              fontSize: 11,
              lineHeight: 1.6,
              color: "rgba(245,240,232,0.4)",
              margin: "0 0 48px",
              maxWidth: 420,
            }}
          >
            Birth data is the warp — the permanent structure from which all else is woven.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 32, width: "100%", marginBottom: 48 }}>
            <ThreadInput
              label="Name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Your full name"
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <ThreadInput
                label="Date of Birth"
                type="date"
                value={form.date}
                onChange={(v) => setForm((f) => ({ ...f, date: v }))}
              />
              <ThreadInput
                label="Time of Birth"
                type="time"
                value={form.time}
                onChange={(v) => setForm((f) => ({ ...f, time: v }))}
              />
            </div>
            <ThreadInput
              label="Place of Birth"
              value={form.location}
              onChange={(v) => setForm((f) => ({ ...f, location: v }))}
              placeholder="e.g. Manila, Philippines"
            />
          </div>

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

      {/* ═══ C. ADDITIONAL SOURCES ═══════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div style={{ ...innerStyle, gap: 0 }}>

          <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 48 }}>
            <LoomSVG height={120} activeThreads={activeThreads} showWeft={false} showFrame />
          </div>

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

          <h2
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 700,
              fontSize: 44,
              lineHeight: 1.05,
              color: TEXT,
              margin: "0 0 12px",
            }}
          >
            Add more threads.
          </h2>

          <p
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: 11,
              lineHeight: 1.6,
              color: "rgba(245,240,232,0.4)",
              margin: "0 0 48px",
              maxWidth: 420,
            }}
          >
            Each source enriches the weave. Connect what you trust.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              width: "100%",
              background: "rgba(245,240,232,0.06)",
            }}
          >
            {SOURCES.map((src) => (
              <div key={src.id} style={{ background: BG }}>
                <SourceCard
                  id={src.id}
                  name={src.name}
                  typeLabel={src.typeLabel}
                  caption={src.caption}
                  connected={connected.has(src.id)}
                  disabled={"disabled" in src ? src.disabled : false}
                  onToggle={() => toggle(src.id)}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32 }}>
            <span
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: 13,
                fontStyle: "italic",
                color: "rgba(245,240,232,0.3)",
              }}
            >
              {activeThreads.length} thread{activeThreads.length !== 1 ? "s" : ""} on your loom
            </span>
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ D. LOOM READY ═══════════════════════════════════════════════════ */}
      <section style={sectionStyle}>
        <div style={{ ...innerStyle, gap: 0 }}>

          <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 56 }}>
            <LoomSVG height={160} activeThreads={activeThreads} showWeft showFrame />
          </div>

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

          <h2
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 700,
              fontSize: 38,
              lineHeight: 1.05,
              color: TEXT,
              margin: "0 0 16px",
            }}
          >
            Your loom is ready.
          </h2>

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
            Each reading will weave a new thread across. Your tapestry begins now.
          </p>

          {/* Thread legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 52 }}>
            {[
              { id: "birth", label: "Birth Data", note: "Foundation warp", color: "rgba(245,240,232,0.9)" },
              ...(connected.has("calendar") ? [{ id: "calendar", label: "Calendar",  note: "Time patterns",  color: "rgba(139,126,200,0.7)" }] : []),
              ...(connected.has("journal")  ? [{ id: "journal",  label: "Journal",   note: "Inner voice",    color: "rgba(200,169,110,0.7)" }] : []),
              ...(connected.has("health")   ? [{ id: "health",   label: "Health",    note: "Body rhythms",   color: "rgba(126,200,154,0.7)" }] : []),
            ].map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 4, height: 18, background: t.color, flexShrink: 0 }} />
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

          <GhostButton onClick={handleBeginReading}>
            Begin your first reading
          </GhostButton>

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
