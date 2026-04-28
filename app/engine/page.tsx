"use client";

import { useState, useEffect, Fragment } from "react";
import { notFound } from "next/navigation";
import { estimateCost, formatCost } from "@/lib/api/pricing";
import { appendRun, listRuns, clearRuns, type RunLog } from "@/lib/engine/run-log";

if (process.env.NODE_ENV !== "development") {
  // Evaluated at build time on server; redirect handled below in component
}

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
  const base = { birthData: DEFAULT_BIRTH_DATA, date: new Date().toLocaleDateString("en-CA") };
  if (endpoint === "council") {
    return JSON.stringify({ ...base, question: "What should I focus on this week?" }, null, 2);
  }
  return JSON.stringify(base, null, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Tab = "oneLiner" | "summary" | "analysis" | "facts" | "raw" | "prompt";
const TABS: { id: Tab; label: string }[] = [
  { id: "oneLiner", label: "1-liner" },
  { id: "summary", label: "Summary" },
  { id: "analysis", label: "Analysis" },
  { id: "facts", label: "Facts" },
  { id: "raw", label: "Raw" },
  { id: "prompt", label: "Prompt" },
];

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-neutral-200 px-2 py-1 border border-neutral-800 hover:border-neutral-600 rounded transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function ExpertCard({ expert }: { expert: Record<string, unknown> }) {
  const [tab, setTab] = useState<Tab>("oneLiner");
  const content = expert.content as Record<string, string> | undefined;
  const rawText = expert.rawText as string | undefined;
  const systemPrompt = expert.systemPrompt as string | undefined;
  const userMessage = expert.userMessage as string | undefined;
  const model = expert.model as string | undefined;
  const usage = expert.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  const cost = model && usage ? estimateCost(model, usage) : 0;
  const hasError = Boolean(expert.error);
  const tabValue = tab === "raw" || tab === "prompt" ? undefined : content?.[tab];

  return (
    <div
      className="rounded border border-neutral-800 overflow-hidden flex flex-col"
      style={{ borderLeftColor: (expert.color as string) ?? "#555", borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900">
        <span className="text-lg">{expert.expertEmoji as string}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-neutral-300 truncate">{expert.expertName as string}</div>
          <div className="text-[10px] text-neutral-600">
            {expert.traditionId as string}
            {expert.durationMs != null && ` · ${expert.durationMs}ms`}
            {usage && ` · ${formatTokens(usage.totalTokens)}tok`}
            {cost > 0 && ` · ${formatCost(cost)}`}
          </div>
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
                className={`flex-1 text-[9px] py-1 font-mono uppercase tracking-wider transition-colors ${
                  tab === t.id
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-600 hover:text-neutral-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 text-xs text-neutral-300 leading-relaxed flex-1 overflow-y-auto max-h-64">
            {tab === "raw" ? (
              rawText ? (
                <pre className="text-[10px] font-mono text-neutral-400 whitespace-pre-wrap break-all">{rawText}</pre>
              ) : (
                <span className="text-neutral-600 italic">no raw text captured</span>
              )
            ) : tab === "prompt" ? (
              systemPrompt || userMessage ? (
                <div className="space-y-2 text-[10px] font-mono">
                  {model && (
                    <div className="text-neutral-500">model: <span className="text-neutral-300">{model}</span></div>
                  )}
                  {userMessage && (
                    <div>
                      <div className="text-neutral-500 uppercase tracking-widest mb-1">User</div>
                      <pre className="text-neutral-300 whitespace-pre-wrap break-all">{userMessage}</pre>
                    </div>
                  )}
                  {systemPrompt && (
                    <div>
                      <div className="text-neutral-500 uppercase tracking-widest mb-1">System</div>
                      <pre className="text-neutral-400 whitespace-pre-wrap break-all">{systemPrompt}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-neutral-600 italic">no prompt captured</span>
              )
            ) : (
              tabValue || <span className="text-neutral-600 italic">empty</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OracleCard({ oracle }: { oracle: Record<string, unknown> }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const systemPrompt = oracle.systemPrompt as string | undefined;
  const userMessage = oracle.userMessage as string | undefined;
  const model = oracle.model as string | undefined;
  const usage = oracle.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  const cost = model && usage ? estimateCost(model, usage) : 0;
  return (
    <div className="rounded border border-neutral-700 bg-neutral-900/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-800 flex items-center gap-2">
        <span>◈</span>
        <span className="text-xs font-mono text-neutral-400">The Oracle</span>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-neutral-600">
          {oracle.durationMs != null && <span>{oracle.durationMs as number}ms</span>}
          {usage && <span>{formatTokens(usage.totalTokens)}tok</span>}
          {cost > 0 && <span>{formatCost(cost)}</span>}
        </div>
        {(systemPrompt || userMessage) && (
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 hover:text-neutral-300"
          >
            {showPrompt ? "hide prompt" : "prompt"}
          </button>
        )}
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs font-semibold text-amber-400/80 leading-relaxed">
          {oracle.oneLiner as string}
        </div>
        <div className="text-xs text-neutral-300 leading-relaxed">
          {oracle.summary as string}
        </div>
        {showPrompt && (
          <div className="space-y-2 text-[10px] font-mono pt-2 border-t border-neutral-800">
            {model && <div className="text-neutral-500">model: <span className="text-neutral-300">{model}</span></div>}
            {userMessage && (
              <div>
                <div className="text-neutral-500 uppercase tracking-widest mb-1">User</div>
                <pre className="text-neutral-300 whitespace-pre-wrap break-all">{userMessage}</pre>
              </div>
            )}
            {systemPrompt && (
              <div>
                <div className="text-neutral-500 uppercase tracking-widest mb-1">System</div>
                <pre className="text-neutral-400 whitespace-pre-wrap break-all">{systemPrompt}</pre>
              </div>
            )}
          </div>
        )}
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

function SkelLine({ w = "100%" }: { w?: string }) {
  return <div className="h-2 bg-neutral-900 rounded" style={{ width: w }} />;
}

function SkelExpertCard() {
  return (
    <div className="rounded border border-neutral-800 overflow-hidden flex flex-col" style={{ borderLeftColor: "#333", borderLeftWidth: 3 }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900">
        <div className="w-5 h-5 bg-neutral-800 rounded" />
        <div className="flex-1 space-y-1.5">
          <SkelLine w="60%" />
          <SkelLine w="40%" />
        </div>
      </div>
      <div className="flex border-b border-neutral-800">
        {TABS.map((t) => (
          <div key={t.id} className="flex-1 text-[9px] py-1 font-mono uppercase tracking-wider text-neutral-700 text-center">
            {t.label}
          </div>
        ))}
      </div>
      <div className="px-3 py-3 space-y-2">
        <SkelLine />
        <SkelLine w="85%" />
        <SkelLine w="65%" />
      </div>
    </div>
  );
}

function Skeleton({ endpoint }: { endpoint: EndpointId }) {
  const showExperts = endpoint === "council" || endpoint === "daily";
  const showSingleExpert = endpoint.startsWith("expert/");
  const showOracle = endpoint === "council" || endpoint === "daily";
  const showChart = endpoint === "chart";
  const expertCount = endpoint === "council" || endpoint === "daily" ? 5 : 1;

  return (
    <div className="opacity-40">
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-700">
        <span className="uppercase tracking-widest">POST /api/{endpoint}</span>
        <span className="ml-auto italic">— select inputs and click Run —</span>
      </div>

      <section className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">Engine Inputs</div>
        <div className="rounded border border-neutral-800 bg-neutral-900/30 p-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[11px] font-mono">
          {["birthData.name", "birthData.date", "birthData.time", "birthData.location", "date", ...(endpoint === "council" ? ["question"] : [])].map((k) => (
            <Fragment key={k}>
              <span className="text-neutral-700 whitespace-nowrap">{k}</span>
              <SkelLine w="60%" />
            </Fragment>
          ))}
        </div>
      </section>

      {(showExperts || showSingleExpert) && (
        <section className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">
            {showSingleExpert ? "Expert" : `Experts (${expertCount})`}
          </div>
          <div className={showSingleExpert ? "max-w-md" : "grid gap-3"} style={showSingleExpert ? undefined : { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {Array.from({ length: expertCount }).map((_, i) => <SkelExpertCard key={i} />)}
          </div>
        </section>
      )}

      {showOracle && (
        <section className="mb-6 max-w-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">Oracle</div>
          <div className="rounded border border-neutral-700 bg-neutral-900/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-neutral-800 text-xs font-mono text-neutral-700">◈ The Oracle</div>
            <div className="px-3 py-3 space-y-2">
              <SkelLine w="80%" />
              <SkelLine />
              <SkelLine w="90%" />
            </div>
          </div>
        </section>
      )}

      {showChart && (
        <section className="mb-6 max-w-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">Raw Chart Data</div>
          <div className="space-y-2">
            {["western", "chinese", "vedic", "numerology", "tarot"].map((t) => (
              <div key={t} className="border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-700">{t} ▼</div>
            ))}
          </div>
        </section>
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
  const [results, setResults] = useState<Partial<Record<EndpointId, Record<string, unknown>>>>({});
  const [errors, setErrors] = useState<Partial<Record<EndpointId, string>>>({});
  const [clientMsMap, setClientMsMap] = useState<Partial<Record<EndpointId, number>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [runs, setRuns] = useState<RunLog[]>([]);

  useEffect(() => { setRuns(listRuns()); }, []);

  const selectEndpoint = (id: EndpointId) => {
    setEndpoint(id);
    setInputJson(defaultInput(id));
    // Preserve per-endpoint results — don't clear
  };

  const run = async () => {
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, [endpoint]: undefined }));
    setClientMsMap((prev) => ({ ...prev, [endpoint]: undefined }));
    const t0 = Date.now();
    try {
      let body: unknown;
      try {
        body = JSON.parse(inputJson);
      } catch {
        setErrors((prev) => ({ ...prev, [endpoint]: "Invalid JSON in input" }));
        return;
      }
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const elapsed = Date.now() - t0;
      setClientMsMap((prev) => ({ ...prev, [endpoint]: elapsed }));
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [endpoint]: JSON.stringify(data, null, 2) }));
      } else {
        setResults((prev) => ({ ...prev, [endpoint]: data }));
        // Compute run totals for history
        const experts = Array.isArray(data.experts) ? (data.experts as Record<string, unknown>[]) : [];
        const oracle = data.oracle as Record<string, unknown> | undefined;
        const totalTokens = experts.reduce((s, e) => s + (((e.usage as Record<string, number> | undefined)?.totalTokens) ?? 0), 0)
          + ((oracle?.usage as Record<string, number> | undefined)?.totalTokens ?? 0);
        const totalCost = experts.reduce((s, e) => {
          const u = e.usage as { promptTokens: number; completionTokens: number } | undefined;
          const m = e.model as string | undefined;
          return s + (u && m ? estimateCost(m, u) : 0);
        }, 0) + (() => {
          const u = oracle?.usage as { promptTokens: number; completionTokens: number } | undefined;
          const m = oracle?.model as string | undefined;
          return u && m ? estimateCost(m, u) : 0;
        })();
        const log: RunLog = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          endpoint,
          input: body as Record<string, unknown>,
          result: data,
          totals: { durationMs: data.totalDurationMs as number | undefined, tokens: totalTokens, cost: totalCost },
        };
        appendRun(log);
        setRuns(listRuns());
      }
    } catch (e) {
      setErrors((prev) => ({ ...prev, [endpoint]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setIsLoading(false);
    }
  };

  const result = results[endpoint] ?? null;
  const error = errors[endpoint] ?? null;
  const clientMs = clientMsMap[endpoint] ?? null;

  const res = result;
  const experts = Array.isArray(res?.experts) ? (res!.experts as Record<string, unknown>[]) : null;
  const oracle = res?.oracle as Record<string, unknown> | undefined;
  const traditions = res?.traditions as Record<string, unknown> | undefined;
  const singleExpert = res?.expert as Record<string, unknown> | undefined;
  const serverMs = res?.totalDurationMs as number | undefined;

  const totalTokens = result
    ? (experts ?? []).reduce((s, e) => s + (((e.usage as Record<string, number> | undefined)?.totalTokens) ?? 0), 0)
        + ((oracle?.usage as Record<string, number> | undefined)?.totalTokens ?? 0)
    : 0;
  const totalCost = result
    ? (experts ?? []).reduce((s, e) => {
        const u = e.usage as { promptTokens: number; completionTokens: number } | undefined;
        const m = e.model as string | undefined;
        return s + (u && m ? estimateCost(m, u) : 0);
      }, 0) + (() => {
        const u = oracle?.usage as { promptTokens: number; completionTokens: number } | undefined;
        const m = oracle?.model as string | undefined;
        return u && m ? estimateCost(m, u) : 0;
      })()
    : 0;

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

        {/* History panel */}
        <div className="border-b border-neutral-800">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-600 hover:text-neutral-400"
          >
            <span>History ({runs.length})</span>
            <span>{historyOpen ? "▲" : "▼"}</span>
          </button>
          {historyOpen && (
            <div className="px-4 pb-3 max-h-48 overflow-y-auto">
              {runs.length === 0 ? (
                <div className="text-[10px] font-mono text-neutral-700 italic">no runs yet</div>
              ) : (
                <>
                  <button
                    onClick={() => { clearRuns(); setRuns([]); }}
                    className="text-[10px] font-mono text-neutral-700 hover:text-red-400 mb-2 block"
                  >
                    clear all
                  </button>
                  <div className="space-y-1">
                    {runs.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          const ep = r.endpoint as EndpointId;
                          setEndpoint(ep);
                          setInputJson(JSON.stringify(r.input, null, 2));
                          setResults((prev) => ({ ...prev, [ep]: r.result }));
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-900 transition-colors group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1 rounded">{r.endpoint}</span>
                          <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400">
                            {r.totals.tokens > 0 ? `${r.totals.tokens.toLocaleString()}tok` : ""}
                            {r.totals.cost > 0 ? ` · ${formatCost(r.totals.cost)}` : ""}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-neutral-700 mt-0.5">
                          {new Date(r.ts).toLocaleTimeString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
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
            {totalTokens > 0 && <span className="text-neutral-500">{totalTokens.toLocaleString()} tok</span>}
            {totalCost > 0 && <span className="text-neutral-500">{formatCost(totalCost)}</span>}
            {error && <span className="text-red-500">error</span>}
            {result !== null && (
              <div className="ml-auto flex gap-2">
                <CopyButton value={JSON.stringify(result, null, 2)} label="Copy payload" />
                <CopyButton
                  value={`POST /api/${endpoint}\n${inputJson}\n\n--- response ---\n${JSON.stringify(result, null, 2)}`}
                  label="Copy debug bundle"
                />
              </div>
            )}
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
            {/* Engine inputs transparency */}
            {result.input != null && (
              <section className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Engine Inputs</div>
                <div className="rounded border border-neutral-800 bg-neutral-900/50 p-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[11px] font-mono">
                  {Object.entries(result.input as Record<string, unknown>).flatMap(([k, v]) => {
                    if (v == null) return [];
                    if (typeof v === "object") {
                      return Object.entries(v as Record<string, unknown>).map(([k2, v2]) => (
                        <Fragment key={`${k}.${k2}`}>
                          <span className="text-neutral-600 whitespace-nowrap">{k}.{k2}</span>
                          <span className="text-neutral-300 truncate">{String(v2)}</span>
                        </Fragment>
                      ));
                    }
                    return [
                      <Fragment key={k}>
                        <span className="text-neutral-600 whitespace-nowrap">{k}</span>
                        <span className="text-neutral-300 truncate">{String(v)}</span>
                      </Fragment>,
                    ];
                  })}
                </div>
              </section>
            )}

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
          <Skeleton endpoint={endpoint} />
        )}
      </div>
    </div>
  );
}
