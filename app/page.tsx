"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useGeocode } from "@/lib/hooks/use-geocode";
import { useProtoStore, type ProtoBirthData } from "@/lib/hooks/use-proto-store";

const BG = "#0A0B14";
const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const BORDER = "rgba(245,240,232,0.12)";
const ACCENT = "rgba(191,168,130,1)";
const INPUT_BG = "rgba(245,240,232,0.04)";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontSize: 17,
  padding: "13px 14px",
  outline: "none",
  borderRadius: 0,
  WebkitAppearance: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
};

interface FormState {
  name: string;
  date: string;
  time: string;
  location: string;
  lat: number | null;
  lon: number | null;
}

const EMPTY_FORM: FormState = { name: "", date: "", time: "", location: "", lat: null, lon: null };

export default function InputsPage() {
  const router = useRouter();
  const posthog = usePostHog();
  const { store, ready, saveBirthData } = useProtoStore();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { geocoding, coords } = useGeocode(form.location);

  // Redirect to /auth when a password-recovery link lands on this page
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      router.replace("/auth");
    }
  }, [router]);

  // Prefill from persisted store on mount — legitimate initialization from localStorage
  useEffect(() => {
    if (!ready) return;
    const bd = store.birthData;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bd) setForm({ name: bd.name, date: bd.date, time: bd.time, location: bd.location, lat: bd.latitude, lon: bd.longitude });
  }, [ready, store.birthData]);

  // Apply geocoded coords from external API — legitimate external sync
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (coords) setForm((f) => ({ ...f, lat: coords.lat, lon: coords.lon }));
  }, [coords]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "location" ? { lat: null, lon: null } : {}) }));

  const valid =
    form.name.trim().length > 0 &&
    form.date.length > 0 &&
    form.time.length > 0 &&
    form.location.trim().length > 0 &&
    form.lat !== null &&
    form.lon !== null &&
    !geocoding;

  const handleSubmit = () => {
    if (!valid) return;
    const bd: ProtoBirthData = {
      name: form.name.trim(),
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      latitude: form.lat!,
      longitude: form.lon!,
    };
    saveBirthData(bd);
    posthog?.capture("birth_data_submitted", { location: bd.location, hasName: !!bd.name });
    router.push("/daily");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        padding: "0 20px",
        backgroundColor: BG,
      }}
    >
      {/* Header */}
      <div
        style={{
          paddingTop: 56,
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: MUTED,
            fontFamily: "var(--font-geist-mono), monospace",
            marginBottom: 12,
          }}
        >
          Mystic Council
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.2,
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontStyle: "italic",
            color: TEXT,
          }}
        >
          Your birth details
        </h1>
        <p
          style={{
            fontSize: 15,
            color: MUTED,
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          Used to calculate your chart and daily reading. Stored locally on this device only.
        </p>
      </div>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <Field label="Name">
          <input
            style={inputStyle}
            value={form.name}
            onChange={set("name")}
            placeholder="Your name"
            autoComplete="name"
          />
        </Field>

        <Field label="Date of birth">
          <input
            style={inputStyle}
            type="date"
            value={form.date}
            onChange={set("date")}
          />
        </Field>

        <Field label="Time of birth">
          <input
            style={inputStyle}
            type="time"
            value={form.time}
            onChange={set("time")}
          />
        </Field>

        <Field label="Place of birth">
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              value={form.location}
              onChange={set("location")}
              placeholder="City, country"
              autoComplete="off"
            />
            {geocoding && (
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: ACCENT,
                  fontFamily: "var(--font-geist-mono), monospace",
                  letterSpacing: "0.08em",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                locating…
              </span>
            )}
          </div>
          {form.lat !== null && form.lon !== null && !geocoding && (
            <span
              style={{
                fontSize: 12,
                color: MUTED,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {form.lat.toFixed(4)}, {form.lon.toFixed(4)}
            </span>
          )}
        </Field>
      </div>

      {/* Sticky CTA */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          paddingTop: 24,
          paddingBottom: 40,
          backgroundColor: BG,
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={!valid}
          style={{
            width: "100%",
            padding: "16px 20px",
            background: valid ? ACCENT : "rgba(191,168,130,0.2)",
            color: valid ? "#0A0B14" : "rgba(10,11,20,0.5)",
            fontSize: 14,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "var(--font-geist-mono), monospace",
            border: "none",
            cursor: valid ? "pointer" : "not-allowed",
            fontWeight: 600,
            transition: "background 0.15s",
          }}
        >
          {geocoding ? "Locating…" : "Read my day →"}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.4);
        }
        input::placeholder { color: rgba(245,240,232,0.2); }
      `}</style>
    </div>
  );
}
