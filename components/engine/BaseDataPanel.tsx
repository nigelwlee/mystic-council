"use client";

import { useBirthData } from "@/lib/context/birth-data-context";
import { useEffect } from "react";

const DEFAULTS = {
  name: "Nigel Lee",
  date: "1991-06-01",
  time: "11:44",
  location: "Manila",
};

const FUTURE_SOURCES = [
  "Journal entries",
  "Health data",
  "Calendar context",
  "Social graph",
];

export function BaseDataPanel() {
  const { birthData, setBirthData } = useBirthData();

  // Set defaults on mount if empty
  useEffect(() => {
    if (!birthData?.name && !birthData?.date) {
      setBirthData(DEFAULTS);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const data = birthData ?? DEFAULTS;

  const update = (field: string, value: string) => {
    setBirthData({ ...data, [field]: value });
  };

  return (
    <div className="h-full border-r border-neutral-800 p-3 space-y-4 overflow-y-auto">
      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">
        Base Data
      </div>

      <div className="space-y-2">
        <Field label="Name" value={data.name ?? ""} onChange={(v) => update("name", v)} />
        <Field label="Birth date" value={data.date ?? ""} onChange={(v) => update("date", v)} type="date" />
        <Field label="Birth time" value={data.time ?? ""} onChange={(v) => update("time", v)} type="time" />
        <Field label="Location" value={data.location ?? ""} onChange={(v) => update("location", v)} />
      </div>

      <div className="border-t border-neutral-800 pt-3 space-y-1.5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700">
          Future Sources
        </div>
        {FUTURE_SOURCES.map((source) => (
          <div
            key={source}
            className="flex items-center justify-between text-xs font-mono text-neutral-700 bg-neutral-900/50 rounded px-2 py-1.5"
          >
            <span>{source}</span>
            <span className="text-[9px] text-neutral-800 bg-neutral-800/60 rounded px-1.5 py-0.5">
              soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono text-neutral-300 focus:outline-none focus:border-neutral-700 [color-scheme:dark]"
      />
    </div>
  );
}
