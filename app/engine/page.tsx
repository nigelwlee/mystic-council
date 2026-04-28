"use client";

import { useState } from "react";
import { notFound } from "next/navigation";

if (process.env.NODE_ENV !== "development") {
  // Evaluated at build time on server; redirect handled below in component
}

const TODAY = new Date().toLocaleDateString("en-CA");

const DEFAULT_BIRTH_DATA = {
  name: "Nigel Lee",
  date: "1991-06-01",
  time: "11:44",
  latitude: 14.5995,
  longitude: 120.9842,
  location: "Manila",
};

type EndpointId =
  | "council"
  | "daily"
  | "expert/western"
  | "expert/chinese"
  | "expert/vedic"
  | "expert/tarot"
  | "expert/numerology"
  | "chart";

const ENDPOINTS: { id: EndpointId; label: string; desc: string }[] = [
  { id: "council", label: "Council", desc: "Full Q&A — all 5 experts + Oracle" },
  { id: "daily", label: "Daily", desc: "Today's daily reading" },
  { id: "expert/western", label: "Western", desc: "Stella · birth chart + transits" },
  { id: "expert/chinese", label: "Chinese", desc: "Master Wei · Ba Zi + lunar" },
  { id: "expert/vedic", label: "Vedic", desc: "Priya · sidereal + dasha" },
  { id: "expert/tarot", label: "Tarot", desc: "Madame Crow · 3-card spread" },
  { id: "expert/numerology", label: "Numerology", desc: "Pythia · life path + name" },
  { id: "chart", label: "Chart", desc: "No-LLM raw tool outputs only" },
];

function defaultInput(endpoint: EndpointId): string {
  const base = { birthData: DEFAULT_BIRTH_DATA, date: TODAY };
  if (endpoint === "council") {
    return JSON.stringify({ ...base, question: "What should I focus on this week?" }, null, 2);
  }
  return JSON.stringify(base, null, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Tab = "oneLiner" | "summary" | "analysis" | "facts";
const TABS: { id: Tab; label: string }[] = [
  { id: "oneLiner", label: "One-liner" },
  { id: "summary", label: "Summary" },
  { id: "analysis", label: "Analysis" },
  { id: "facts", label: "Facts" },
];

function ExpertCard({ expert }: { expert: Record<string, unknown> }) {
  const [tab, setTab] = useState<Tab>("oneLiner");
  const content = expert.content as Record<string, string> | undefined;
  const hasError = Boolean(expert.error);

  return (
    <div
      className="rounded border border-neutral-800 overflow-hidden flex flex-col"
      style={{ borderLeftColor: (expert.color as string) ?? "#555", borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900">
        <span className="text-lg">{expert.expertEmoji as string}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-neutral-300 truncate">{expert.expertName as string}</div>
          <div className="text-[10px] text-neutral-600">{expert.traditionId as string} · {expert.durationMs != null ? `${expert.durationMs}ms` : "—"}</div>
        </div>
        {hasError && (
          <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">error</span>
        )}
      </div>

      {hasError ? (
        <div className="px-3 py-2 text-[11px] text-red-400 font-mono">{expert.error as string}</div>
      ) : (
        <>
          <div className="flex border-b border-neutral-800">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-[10px] py-1 font-mono uppercase tracking-wider transition-colors ${
                  tab === t.id
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-600 hover:text-neutral-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 text-xs text-neutral-300 leading-relaxed flex-1 overflow-y-auto max-h-48">
            {content?.[tab] || <span className="text-neutral-600 italic">empty</span>}
          </div>
        </>
      )}
    </div>
  );
}

function OracleCard({ oracle }: { oracle: Record<string, unknown> }) {
  return (
    <div className="rounded border border-neutral-700 bg-neutral-900/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-800 flex items-center gap-2">
        <span>◈</span>
        <span className="text-xs font-mono text-neutral-400">The Oracle</span>
        {oracle.durationMs != null && (
          <span className="ml-auto text-[10px] text-neutral-600">{oracle.durationMs as number}ms</span>
        )}
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs font-semibold text-amber-400/80 leading-relaxed">
          {oracle.oneLiner as string}
        </div>
        <div className="text-xs text-neutral-300 leading-relaxed">
          {oracle.summary as string}
        </div>
      </div>
    </div>
  );
}

function ChartTradition({ name, data }: { name: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-800 rounded overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-neutral-400 hover:text-neutral-200 bg-neutral-900"
      >
        <span>{name}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="px-3 py-2 text-[10px] font-mono text-neutral-400 overflow-x-auto bg-neutral-950 max-h-60 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function RawJson({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-800 rounded overflow-hidden mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-600 hover:text-neutral-400 bg-neutral-900"
      >
        <span>Raw JSON</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="px-3 py-2 text-[10px] font-mono text-neutral-500 overflow-x-auto bg-neutral-950 max-h-96 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EngineInspector() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const [endpoint, setEndpoint] = useState<EndpointId>("council");
  const [inputJson, setInputJson] = useState(() => defaultInput("council"));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientMs, setClientMs] = useState<number | null>(null);

  const selectEndpoint = (id: EndpointId) => {
    setEndpoint(id);
    setInputJson(defaultInput(id));
    setResult(null);
    setError(null);
  };

  const run = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setClientMs(null);
    const t0 = Date.now();
    try {
      let body: unknown;
      try {
        body = JSON.parse(inputJson);
      } catch {
        setError("Invalid JSON in input");
        return;
      }
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setClientMs(Date.now() - t0);
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError(JSON.stringify(data, null, 2));
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const res = result;
  const experts = Array.isArray(res?.experts) ? (res!.experts as Record<string, unknown>[]) : null;
  const oracle = res?.oracle as Record<string, unknown> | undefined;
  const traditions = res?.traditions as Record<string, unknown> | undefined;
  const singleExpert = res?.expert as Record<string, unknown> | undefined;
  const serverMs = res?.totalDurationMs as number | undefined;

  return (
    <div className="h-[100dvh] grid grid-cols-[280px_1fr] bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* ── Left: Controls ── */}
      <div className="flex flex-col border-r border-neutral-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Endpoint</div>
          <div className="space-y-1">
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.id}
                onClick={() => selectEndpoint(ep.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  endpoint === ep.id
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
                }`}
              >
                <div className="font-mono">{ep.label}</div>
                <div className="text-[10px] text-neutral-600">{ep.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-4 py-3 flex flex-col min-h-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Input JSON</div>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            className="flex-1 w-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 p-2 resize-none focus:outline-none focus:border-neutral-600 rounded min-h-[200px]"
            spellCheck={false}
          />
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={run}
            disabled={isLoading}
            className="w-full py-2 text-xs font-mono uppercase tracking-widest bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
          >
            {isLoading ? "Running…" : "▶  Run"}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="overflow-y-auto p-4">
        {/* Header bar */}
        {(result !== null || error !== null || isLoading) && (
          <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-600">
            <span className="uppercase tracking-widest">POST /api/{endpoint}</span>
            {clientMs != null && <span>{clientMs}ms client</span>}
            {serverMs != null && <span>{serverMs}ms server</span>}
            {error && <span className="text-red-500">error</span>}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-600 text-sm">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span>
            <span className="ml-2 text-xs font-mono">Waiting for council…</span>
          </div>
        )}

        {error != null && (
          <pre className="text-red-400 text-[11px] font-mono bg-red-950/20 border border-red-900/40 rounded p-3 whitespace-pre-wrap">
            {error}
          </pre>
        )}

        {result && (
          <>
            {/* Expert grid — council, daily, or single expert */}
            {experts && experts.length > 0 && (
              <section className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
                  Experts ({experts.length})
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {experts.map((e, i) => (
                    <ExpertCard key={i} expert={e} />
                  ))}
                </div>
              </section>
            )}

            {singleExpert && (
              <section className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Expert</div>
                <div className="max-w-md">
                  <ExpertCard expert={singleExpert} />
                </div>
              </section>
            )}

            {/* Oracle */}
            {oracle && (
              <section className="mb-6 max-w-2xl">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Oracle</div>
                <OracleCard oracle={oracle} />
              </section>
            )}

            {/* Chart traditions */}
            {traditions && (
              <section className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
                  Raw Chart Data
                </div>
                <div className="space-y-2 max-w-2xl">
                  {Object.entries(traditions).map(([name, data]) => (
                    <ChartTradition key={name} name={name} data={data} />
                  ))}
                </div>
              </section>
            )}

            <RawJson data={result} />
          </>
        )}

        {!result && !error && !isLoading && (
          <div className="text-neutral-700 text-sm font-mono">
            Select an endpoint, edit the input JSON, and click Run.
          </div>
        )}
      </div>
    </div>
  );
}
