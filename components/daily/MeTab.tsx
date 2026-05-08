"use client";

import { useState, useEffect } from "react";
import { useProtoStore, type ProtoBirthData } from "@/lib/hooks/use-proto-store";
import { useGeocode } from "@/lib/hooks/use-geocode";

const TEXT = "#F5F0E8";
const MUTED = "rgba(245,240,232,0.35)";
const BORDER = "rgba(245,240,232,0.10)";
const ACCENT = "rgba(191,168,130,1)";
const ACCENT_DIM = "rgba(191,168,130,0.75)";
const INPUT_BG = "rgba(245,240,232,0.04)";

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: MUTED,
  fontFamily: "var(--font-geist-mono), monospace",
  marginBottom: 16,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: MUTED,
  fontFamily: "var(--font-geist-mono), monospace",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontSize: 16,
  padding: "11px 12px",
  outline: "none",
  borderRadius: 0,
  WebkitAppearance: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
};

const profileValueStyle: React.CSSProperties = {
  fontSize: 16,
  color: TEXT,
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  lineHeight: 1.5,
};

function formatDisplayDate(d: string): string {
  if (!d) return "—";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function formatDisplayTime(t: string): string {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h ?? "0", 10);
    const min = m ?? "00";
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  } catch {
    return t;
  }
}

interface ProfileField {
  label: string;
  value: string;
}

function ProfileRow({ label, value }: ProfileField) {
  return (
    <div
      style={{
        borderTop: `1px solid ${BORDER}`,
        paddingTop: 14,
        paddingBottom: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: MUTED,
          fontFamily: "var(--font-geist-mono), monospace",
          flexShrink: 0,
          minWidth: 72,
        }}
      >
        {label}
      </span>
      <span style={{ ...profileValueStyle, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

interface FormState {
  name: string;
  date: string;
  time: string;
  location: string;
  lat: number | null;
  lon: number | null;
}

function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ProtoBirthData;
  onSave: (bd: ProtoBirthData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: initial.name,
    date: initial.date,
    time: initial.time,
    location: initial.location,
    lat: initial.latitude,
    lon: initial.longitude,
  });
  const [saving, setSaving] = useState(false);

  const { geocoding, coords } = useGeocode(form.location, initial.location);

  // Sync geocoded coords from external API into form state — legitimate external state sync
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (coords) setForm((f) => ({ ...f, lat: coords.lat, lon: coords.lon }));
  }, [coords]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
      ...(k === "location" ? { lat: null, lon: null } : {}),
    }));

  const valid =
    form.name.trim().length > 0 &&
    form.date.length > 0 &&
    (form.lat !== null || form.location.trim().length > 0);

  const handleSave = () => {
    if (!valid || saving) return;
    setSaving(true);
    onSave({
      name: form.name.trim(),
      date: form.date,
      time: form.time,
      location: form.location,
      latitude: form.lat ?? initial.latitude,
      longitude: form.lon ?? initial.longitude,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Name */}
      <div>
        <div style={fieldLabel}>Name</div>
        <input
          style={inputStyle}
          type="text"
          value={form.name}
          onChange={set("name")}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      {/* Birth date */}
      <div>
        <div style={fieldLabel}>Birth Date</div>
        <input
          style={inputStyle}
          type="date"
          value={form.date}
          onChange={set("date")}
        />
      </div>

      {/* Birth time */}
      <div>
        <div style={fieldLabel}>Birth Time</div>
        <input
          style={inputStyle}
          type="time"
          value={form.time}
          onChange={set("time")}
          placeholder="HH:MM"
        />
      </div>

      {/* City */}
      <div>
        <div style={fieldLabel}>
          City
          {geocoding && (
            <span style={{ marginLeft: 8, color: ACCENT_DIM, fontSize: 10, letterSpacing: "0.08em" }}>
              locating…
            </span>
          )}
          {form.lat !== null && !geocoding && form.location !== initial.location && (
            <span style={{ marginLeft: 8, color: ACCENT_DIM, fontSize: 10, letterSpacing: "0.08em" }}>
              ✓ found
            </span>
          )}
        </div>
        <input
          style={inputStyle}
          type="text"
          value={form.location}
          onChange={set("location")}
          placeholder="e.g. Manila, Philippines"
          autoComplete="off"
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
        <button
          onClick={handleSave}
          disabled={!valid || saving || geocoding}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: valid && !saving && !geocoding ? ACCENT : "rgba(191,168,130,0.3)",
            color: "#0A0B14",
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "var(--font-geist-mono), monospace",
            border: "none",
            cursor: valid && !saving && !geocoding ? "pointer" : "not-allowed",
            fontWeight: 600,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "12px 20px",
            background: "none",
            color: MUTED,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "var(--font-geist-mono), monospace",
            border: `1px solid ${BORDER}`,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function computeStreaks(cache: Record<string, unknown>): {
  current: number;
  longest: number;
  total: number;
} {
  const dates = Object.keys(cache).sort();
  const total = dates.length;

  if (total === 0) return { current: 0, longest: 0, total: 0 };

  const todayStr = new Date().toLocaleDateString("en-CA");

  // Build a set for O(1) lookup
  const dateSet = new Set(dates);

  // Compute current streak: count backwards from today
  let current = 0;
  const cursor = new Date();
  for (let i = 0; i < 366; i++) {
    const d = cursor.toLocaleDateString("en-CA");
    if (dateSet.has(d)) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d === todayStr) {
      // Today has no reading yet — streak is 0 unless yesterday has one
      break;
    } else {
      break;
    }
  }

  // Compute longest streak
  let longest = 0;
  let runLen = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T12:00:00");
    const curr = new Date(dates[i] + "T12:00:00");
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      runLen++;
    } else {
      longest = Math.max(longest, runLen);
      runLen = 1;
    }
  }
  longest = Math.max(longest, runLen);

  return { current, longest, total };
}

export function MeTab() {
  const { store, ready, saveBirthData } = useProtoStore();
  const [editing, setEditing] = useState(false);

  const bd = store.birthData;
  const streaks = computeStreaks(store.cache);

  // Use server-computed streak for current/longest if available, fall back to local
  const currentStreak = store.streak?.current ?? streaks.current;
  const longestStreak = store.streak?.longest ?? streaks.longest;
  const totalReadings = streaks.total;

  const handleSave = (newBd: ProtoBirthData) => {
    saveBirthData(newBd);
    setEditing(false);
  };

  if (!ready) {
    return (
      <div style={{ paddingTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
        {[80, 60, 70, 55].map((w, i) => (
          <div
            key={i}
            style={{
              height: 14,
              background: "rgba(245,240,232,0.06)",
              width: `${w}%`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: 32,
        paddingBottom: 60,
        display: "flex",
        flexDirection: "column",
        gap: 48,
      }}
    >
      {/* Streak section */}
      <div>
        <div style={sectionLabel}>Reading Streak</div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 8,
            paddingBottom: 24,
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 72,
                fontWeight: 300,
                color: currentStreak > 0 ? ACCENT : MUTED,
                lineHeight: 1,
              }}
            >
              {currentStreak}
            </span>
            <span
              style={{
                fontFamily: "var(--font-cormorant), Georgia, serif",
                fontSize: 24,
                fontWeight: 300,
                color: currentStreak > 0 ? ACCENT_DIM : MUTED,
                lineHeight: 1,
              }}
            >
              {currentStreak === 1 ? "day streak" : "day streak"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 12,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              color: MUTED,
              letterSpacing: "0.04em",
            }}
          >
            <span>Longest: {longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
            <span style={{ color: BORDER }}>·</span>
            <span>Total readings: {totalReadings}</span>
          </div>
        </div>
      </div>

      {/* Profile section */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ ...sectionLabel, marginBottom: 0 }}>Profile</div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                background: "none",
                border: `1px solid ${BORDER}`,
                color: MUTED,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontFamily: "var(--font-geist-mono), monospace",
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}
        </div>

        {editing && bd ? (
          <EditForm
            initial={bd}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div>
            <ProfileRow label="Name" value={bd?.name ?? ""} />
            <ProfileRow label="Born" value={formatDisplayDate(bd?.date ?? "")} />
            <ProfileRow label="Time" value={formatDisplayTime(bd?.time ?? "")} />
            <ProfileRow label="Place" value={bd?.location ?? ""} />
            <div style={{ borderTop: `1px solid ${BORDER}` }} />
          </div>
        )}
      </div>
    </div>
  );
}
