"use client";

import { useState, useEffect, Fragment } from "react";
import { notFound } from "next/navigation";
import { estimateCost, formatCost } from "@/lib/api/pricing";
import { appendRun, listRuns, clearRuns, type RunLog } from "@/lib/engine/run-log";

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

// ─── Types ────────────────────────────────────────────────────────────────────

const STREAMING_ENDPOINTS: EndpointId[] = ["council", "daily"];

type Tab = "oneLiner" | "summary" | "analysis" | "facts" | "raw" | "prompt";
const TABS: { id: Tab; label: string }[] = [
  { id: "oneLiner", label: "1-liner" },
  { id: "summary", label: "Summary" },
  { id: "analysis", label: "Analysis" },
  { id: "facts", label: "Facts" },
  { id: "raw", label: "Raw" },
  { id: "prompt", label: "Prompt" },
];

type ViewMode = "matrix" | "perExpert" | "timeline";
const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "matrix", label: "Matrix" },
  { id: "perExpert", label: "Per-Expert" },
  { id: "timeline", label: "Timeline" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function expertContent(expert: Record<string, unknown>, tab: Tab): string {
  const content = expert.content as Record<string, string> | undefined;
  if (tab === "raw") return (expert.rawText as string) ?? "";
  if (tab === "prompt") {
    const parts: string[] = [];
    if (expert.model) parts.push(`model: ${expert.model}`);
    if (expert.userMessage) parts.push(`user:\n${expert.userMessage}`);
    if (expert.systemPrompt) parts.push(`system:\n${(expert.systemPrompt as string).slice(0, 300)}…`);
    return parts.join("\n\n");
  }
  return content?.[tab] ?? "";
}

function oracleContent(oracle: Record<string, unknown>, tab: Tab): string {
  if (tab === "oneLiner") return (oracle.oneLiner as string) ?? "";
  if (tab === "summary") return (oracle.summary as string) ?? "";
  if (tab === "prompt") {
    const parts: string[] = [];
    if (oracle.model) parts.push(`model: ${oracle.model}`);
    if (oracle.userMessage) parts.push(`user:\n${oracle.userMessage}`);
    if (oracle.systemPrompt) parts.push(`system:\n${(oracle.systemPrompt as string).slice(0, 300)}…`);
    return parts.join("\n\n");
  }
  return "";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function TabBar({ tabs, active, onChange }: { tabs: readonly { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex border border-neutral-800 rounded overflow-hidden w-fit">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            active === t.id ? "bg-neutral-800 text-neutral-100" : "text-neutral-600 hover:text-neutral-400"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ExpertCard({ expert, activeTab }: { expert: Record<string, unknown>; activeTab?: Tab }) {
  const [localTab, setLocalTab] = useState<Tab>("oneLiner");
  const tab = activeTab ?? localTab;
  const setTab = (t: Tab) => { if (!activeTab) setLocalTab(t); };

  const usage = expert.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  const model = expert.model as string | undefined;
  const cost = model && usage ? estimateCost(model, usage) : 0;
  const hasError = Boolean(expert.error);
  const value = expertContent(expert, tab);

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
        {hasError && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">error</span>}
      </div>

      {hasError ? (
        <div className="px-3 py-2 text-[11px] text-red-400 font-mono">{expert.error as string}</div>
      ) : (
        <>
          {!activeTab && (
            <div className="flex border-b border-neutral-800">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 text-[9px] py-1 font-mono uppercase tracking-wider transition-colors ${
                    tab === t.id ? "bg-neutral-800 text-neutral-100" : "text-neutral-600 hover:text-neutral-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div className="px-3 py-2 text-xs text-neutral-300 leading-relaxed flex-1 overflow-y-auto max-h-64">
            {value ? (
              tab === "raw" || tab === "prompt" ? (
                <pre className="text-[10px] font-mono text-neutral-400 whitespace-pre-wrap break-all">{value}</pre>
              ) : (
                value
              )
            ) : (
              <span className="text-neutral-600 italic">empty</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OracleCard({ oracle }: { oracle: Record<string, unknown> }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const usage = oracle.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  const model = oracle.model as string | undefined;
  const oracleUserMessage = oracle.userMessage as string | undefined;
  const oracleSystemPrompt = oracle.systemPrompt as string | undefined;
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
        {(Boolean(oracle.systemPrompt) || Boolean(oracle.userMessage)) && (
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 hover:text-neutral-300"
          >
            {showPrompt ? "hide" : "prompt"}
          </button>
        )}
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs font-semibold text-amber-400/80 leading-relaxed">{oracle.oneLiner as string}</div>
        <div className="text-xs text-neutral-300 leading-relaxed">{oracle.summary as string}</div>
        {showPrompt && (
          <div className="space-y-2 text-[10px] font-mono pt-2 border-t border-neutral-800">
            {model && <div className="text-neutral-500">model: <span className="text-neutral-300">{model}</span></div>}
            {oracleUserMessage && (
              <div>
                <div className="text-neutral-500 uppercase tracking-widest mb-1">User</div>
                <pre className="text-neutral-300 whitespace-pre-wrap break-all">{oracleUserMessage}</pre>
              </div>
            )}
            {oracleSystemPrompt && (
              <div>
                <div className="text-neutral-500 uppercase tracking-widest mb-1">System</div>
                <pre className="text-neutral-400 whitespace-pre-wrap break-all">{oracleSystemPrompt}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Matrix view ──────────────────────────────────────────────────────────────

function MatrixCell({ value, isOracle }: { value: string; isOracle?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return <span className="text-neutral-800 italic">—</span>;
  const truncated = value.length > 140 ? value.slice(0, 140) + "…" : value;
  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={`text-left w-full leading-relaxed transition-colors text-[11px] whitespace-pre-wrap break-words ${
        isOracle ? "text-amber-400/80 hover:text-amber-400" : "text-neutral-300 hover:text-neutral-100"
      }`}
    >
      {expanded ? value : truncated}
      {value.length > 140 && (
        <span className="text-neutral-700 ml-1 text-[9px]">[{expanded ? "less" : "more"}]</span>
      )}
    </button>
  );
}

const ORACLE_TABS: Tab[] = ["oneLiner", "summary", "prompt"];

function MatrixView({ experts, oracle }: { experts: Record<string, unknown>[]; oracle?: Record<string, unknown> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-1.5 text-[9px] text-neutral-600 uppercase tracking-widest border-b border-neutral-800 bg-neutral-950 w-16 sticky left-0">Field</th>
            {experts.map((e, i) => (
              <th key={i} className="text-left px-2 py-1.5 border-b border-neutral-800 min-w-[180px] max-w-[240px]">
                <div className="flex items-center gap-1">
                  <span>{e.expertEmoji as string}</span>
                  <span className="text-[10px] text-neutral-400 truncate">{e.expertName as string}</span>
                </div>
                <div className="text-[9px] text-neutral-700 font-normal">
                  {e.durationMs != null ? `${e.durationMs}ms` : ""}
                  {(e.usage as { totalTokens?: number } | undefined)?.totalTokens
                    ? ` · ${formatTokens((e.usage as { totalTokens: number }).totalTokens)}tok`
                    : ""}
                </div>
              </th>
            ))}
            {oracle && (
              <th className="text-left px-2 py-1.5 border-b border-neutral-800 min-w-[180px] max-w-[240px]">
                <div className="flex items-center gap-1">
                  <span>◈</span>
                  <span className="text-[10px] text-neutral-400">Oracle</span>
                </div>
                <div className="text-[9px] text-neutral-700 font-normal">
                  {oracle.durationMs != null ? `${oracle.durationMs as number}ms` : ""}
                </div>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {TABS.map((t) => (
            <tr key={t.id} className="border-b border-neutral-900/40 hover:bg-neutral-900/20 align-top">
              <td className="px-2 py-2 text-[9px] text-neutral-600 uppercase tracking-wider bg-neutral-950 sticky left-0 font-semibold pt-3">
                {t.label}
              </td>
              {experts.map((e, i) => (
                <td key={i} className="px-2 py-2 align-top max-w-[240px]">
                  <MatrixCell value={expertContent(e, t.id)} />
                </td>
              ))}
              {oracle && (
                <td className="px-2 py-2 align-top max-w-[240px]">
                  {ORACLE_TABS.includes(t.id) ? (
                    <MatrixCell value={oracleContent(oracle, t.id)} isOracle />
                  ) : (
                    <span className="text-neutral-800 italic">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Per-Expert view ──────────────────────────────────────────────────────────

function PerExpertView({ experts, oracle }: { experts: Record<string, unknown>[]; oracle?: Record<string, unknown> }) {
  const [globalTab, setGlobalTab] = useState<Tab>("oneLiner");
  return (
    <div>
      <div className="mb-4">
        <TabBar tabs={TABS} active={globalTab} onChange={(id) => setGlobalTab(id as Tab)} />
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {experts.map((e, i) => (
          <ExpertCard key={i} expert={e} activeTab={globalTab} />
        ))}
      </div>
      {oracle && (
        <div className="mt-4 max-w-2xl">
          <OracleCard oracle={oracle} />
        </div>
      )}
    </div>
  );
}

// ─── Timeline view ─────────────────────────────────────────────────────────────

function TimelineView({ experts, oracle }: { experts: Record<string, unknown>[]; oracle?: Record<string, unknown> }) {
  const [globalTab, setGlobalTab] = useState<Tab>("oneLiner");
  const sorted = [...experts].sort(
    (a, b) => ((a.durationMs as number) ?? 0) - ((b.durationMs as number) ?? 0)
  );
  const allItems = oracle
    ? [...sorted, { ...oracle, _isOracle: true }]
    : sorted;

  return (
    <div>
      <div className="mb-4">
        <TabBar tabs={TABS} active={globalTab} onChange={(id) => setGlobalTab(id as Tab)} />
      </div>
      <div className="space-y-2">
        {allItems.map((item, i) => {
          const isOracle = Boolean((item as Record<string, unknown>)._isOracle);
          const ms = item.durationMs as number | undefined;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-14 text-right text-[10px] font-mono text-neutral-600 pt-2.5 flex-shrink-0">
                {ms != null ? `${ms}ms` : "—"}
              </div>
              <div className="flex-1 max-w-2xl">
                {isOracle ? (
                  <OracleCard oracle={oracle!} />
                ) : (
                  <ExpertCard expert={item as Record<string, unknown>} activeTab={globalTab} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Misc display components ──────────────────────────────────────────────────

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
  const [viewMode, setViewMode] = useState<ViewMode>("matrix");
  const [runs, setRuns] = useState<RunLog[]>([]);

  // Streaming state — populated progressively for council/daily
  const [streamingExperts, setStreamingExperts] = useState<Record<string, unknown>[]>([]);
  const [streamingStarted, setStreamingStarted] = useState<Set<string>>(new Set());
  const [streamingOracle, setStreamingOracle] = useState<Record<string, unknown> | undefined>(undefined);
  const [streamPhase, setStreamPhase] = useState<"idle" | "experts" | "oracle" | "done">("idle");

  useEffect(() => { setRuns(listRuns()); }, []);

  const selectEndpoint = (id: EndpointId) => {
    setEndpoint(id);
    setInputJson(defaultInput(id));
  };

  const finalizeResult = (data: Record<string, unknown>, body: unknown, ep: EndpointId) => {
    setResults((prev) => ({ ...prev, [ep]: data }));
    const expArr = Array.isArray(data.experts) ? (data.experts as Record<string, unknown>[]) : [];
    const orc = data.oracle as Record<string, unknown> | undefined;
    const totalTokens =
      expArr.reduce((s, e) => s + (((e.usage as Record<string, number> | undefined)?.totalTokens) ?? 0), 0)
      + ((orc?.usage as Record<string, number> | undefined)?.totalTokens ?? 0);
    const totalCost = expArr.reduce((s, e) => {
      const u = e.usage as { promptTokens: number; completionTokens: number } | undefined;
      const m = e.model as string | undefined;
      return s + (u && m ? estimateCost(m, u) : 0);
    }, 0) + (() => {
      const u = orc?.usage as { promptTokens: number; completionTokens: number } | undefined;
      const m = orc?.model as string | undefined;
      return u && m ? estimateCost(m, u) : 0;
    })();
    appendRun({
      id: crypto.randomUUID(),
      ts: Date.now(),
      endpoint: ep,
      input: body as Record<string, unknown>,
      result: data,
      totals: { durationMs: data.totalDurationMs as number | undefined, tokens: totalTokens, cost: totalCost },
    });
    setRuns(listRuns());
  };

  const run = async () => {
    setIsLoading(true);
    setErrors((prev) => ({ ...prev, [endpoint]: undefined }));
    setClientMsMap((prev) => ({ ...prev, [endpoint]: undefined }));
    // Reset streaming state
    setStreamingExperts([]);
    setStreamingStarted(new Set());
    setStreamingOracle(undefined);
    setStreamPhase("idle");

    const t0 = Date.now();
    let body: unknown;
    try { body = JSON.parse(inputJson); } catch {
      setErrors((prev) => ({ ...prev, [endpoint]: "Invalid JSON in input" }));
      setIsLoading(false);
      return;
    }

    // Streaming path for council/daily
    if (STREAMING_ENDPOINTS.includes(endpoint)) {
      const ep = endpoint;
      try {
        const res = await fetch(`/api/${ep}/stream`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
          const errData = await res.json().catch(() => ({}));
          setErrors((prev) => ({ ...prev, [ep]: JSON.stringify(errData, null, 2) }));
          setIsLoading(false);
          return;
        }

        setStreamPhase("experts");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
              if (event.type === "expert-start") {
                setStreamingStarted((prev) => new Set([...prev, event.expertId as string]));
              } else if (event.type === "expert-complete") {
                const { type: _t, ...expertData } = event;
                setStreamingExperts((prev) => [...prev, expertData]);
              } else if (event.type === "oracle-start") {
                setStreamPhase("oracle");
              } else if (event.type === "oracle-complete") {
                setStreamingOracle(event.oracle as Record<string, unknown>);
              } else if (event.type === "run-complete") {
                const { type: _t, ...runData } = event;
                setClientMsMap((prev) => ({ ...prev, [ep]: Date.now() - t0 }));
                finalizeResult(runData as Record<string, unknown>, body, ep);
                setStreamPhase("done");
              } else if (event.type === "oracle-error") {
                setErrors((prev) => ({ ...prev, [ep]: event.error as string }));
              }
            } catch { /* ignore malformed lines */ }
          }
        }
      } catch (e) {
        setErrors((prev) => ({ ...prev, [endpoint]: e instanceof Error ? e.message : String(e) }));
      } finally {
        setIsLoading(false);
        setStreamPhase("done");
      }
      return;
    }

    // Non-streaming path for other endpoints
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setClientMsMap((prev) => ({ ...prev, [endpoint]: Date.now() - t0 }));
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [endpoint]: JSON.stringify(data, null, 2) }));
      } else {
        finalizeResult(data, body, endpoint);
      }
    } catch (e) {
      setErrors((prev) => ({ ...prev, [endpoint]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setIsLoading(false);
    }
  };

  const storedResult = results[endpoint] ?? null;
  const error = errors[endpoint] ?? null;
  const clientMs = clientMsMap[endpoint] ?? null;

  // During streaming, display partial state; after done, use stored result
  const isStreaming = isLoading && STREAMING_ENDPOINTS.includes(endpoint);
  const result = isStreaming ? null : storedResult;
  const liveExperts = isStreaming ? streamingExperts : null;
  const liveOracle = isStreaming ? streamingOracle : undefined;

  const experts = isStreaming
    ? (streamingExperts.length > 0 ? streamingExperts : null)
    : Array.isArray(storedResult?.experts) ? (storedResult!.experts as Record<string, unknown>[]) : null;
  const oracle = isStreaming
    ? streamingOracle
    : storedResult?.oracle as Record<string, unknown> | undefined;
  const digest = storedResult?.digest as Record<string, unknown> | undefined;
  const traditions = storedResult?.traditions as Record<string, unknown> | undefined;
  const singleExpert = storedResult?.expert as Record<string, unknown> | undefined;
  const serverMs = storedResult?.totalDurationMs as number | undefined;
  const isMultiExpert = Boolean(experts && experts.length > 0)
    || (isStreaming && streamingStarted.size > 0);

  // Suppress unused variable warnings — liveExperts/liveOracle used for streaming display
  void liveExperts; void liveOracle;

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
    <div className="h-[100dvh] grid grid-cols-[240px_1fr_260px] bg-neutral-950 text-neutral-100 overflow-hidden">

      {/* ── Left rail: endpoint + input ── */}
      <div className="flex flex-col border-r border-neutral-800 overflow-y-auto">
        <div className="px-3 py-3 border-b border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Endpoint</div>
          <div className="space-y-0.5">
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
                <div className="text-[10px] text-neutral-600 leading-tight">{ep.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-3 py-3 flex flex-col min-h-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Input JSON</div>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            className="flex-1 w-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 p-2 resize-none focus:outline-none focus:border-neutral-600 rounded min-h-[200px]"
            spellCheck={false}
          />
        </div>

        <div className="px-3 pb-4">
          <button
            onClick={run}
            disabled={isLoading}
            className="w-full py-2 text-xs font-mono uppercase tracking-widest bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
          >
            {isLoading ? "Running…" : "▶  Run"}
          </button>
        </div>
      </div>

      {/* ── Center: results ── */}
      <div className="overflow-y-auto p-4 min-w-0">
        {/* Run header */}
        {(result !== null || storedResult !== null || error !== null || isLoading) && (
          <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-600 flex-wrap">
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

        {/* Streaming progress strip */}
        {isLoading && STREAMING_ENDPOINTS.includes(endpoint) && (
          <div className="flex items-center gap-2 mb-4 text-[10px] font-mono text-neutral-600">
            {(["western", "chinese", "vedic", "tarot", "numerology"] as const).map((tid) => {
              const done = streamingExperts.some((e) => e.traditionId === tid);
              const started = streamingStarted.size > streamingExperts.length;
              return (
                <span
                  key={tid}
                  title={tid}
                  className={`transition-colors ${done ? "text-neutral-300" : started ? "text-amber-500 animate-pulse" : "text-neutral-800"}`}
                >
                  {done ? "▣" : "▢"}
                </span>
              );
            })}
            <span className={`ml-1 transition-colors ${streamPhase === "oracle" ? "text-amber-500 animate-pulse" : streamPhase === "done" ? "text-neutral-300" : "text-neutral-800"}`}>◈</span>
            <span className="ml-2 text-neutral-600">
              {streamPhase === "oracle" ? "Oracle synthesizing…" : `${streamingExperts.length}/5 experts complete`}
            </span>
          </div>
        )}
        {isLoading && !STREAMING_ENDPOINTS.includes(endpoint) && (
          <div className="flex items-center gap-2 text-neutral-600 text-sm mb-4">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span>
            <span className="ml-2 text-xs font-mono">Running…</span>
          </div>
        )}

        {error && (
          <pre className="text-red-400 text-[11px] font-mono bg-red-950/20 border border-red-900/40 rounded p-3 whitespace-pre-wrap">
            {error}
          </pre>
        )}

        {(result !== null || isStreaming) && (
          <>
            {/* Engine inputs — show parsed input during streaming */}
            {(result?.input != null || isStreaming) && (
              <section className="mb-5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Engine Inputs</div>
                <div className="rounded border border-neutral-800 bg-neutral-900/50 p-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[11px] font-mono">
                  {Object.entries((result?.input ?? (() => { try { return JSON.parse(inputJson); } catch { return {}; } })()) as Record<string, unknown>).flatMap(([k, v]) => {
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

            {/* View toggle + expert results — also show during streaming */}
            {(isMultiExpert || (isStreaming && streamingStarted.size > 0)) && (
              <section className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">
                    Experts {experts ? `(${experts.length})` : `(${streamingStarted.size} started)`}
                  </div>
                  {!isLoading && <TabBar tabs={VIEWS} active={viewMode} onChange={(id) => setViewMode(id as ViewMode)} />}
                </div>

                {/* During streaming: Per-Expert view is forced (Matrix needs all data) */}
                {isStreaming ? (
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                    {streamingExperts.map((e, i) => <ExpertCard key={i} expert={e} />)}
                    {Array.from({ length: Math.max(0, streamingStarted.size - streamingExperts.length) }).map((_, i) => (
                      <SkelExpertCard key={`skel-${i}`} />
                    ))}
                    {oracle && (
                      <div className="col-span-full mt-2">
                        <OracleCard oracle={oracle} />
                      </div>
                    )}
                    {streamPhase === "oracle" && !oracle && (
                      <div className="col-span-full mt-2 rounded border border-neutral-700 bg-neutral-900/30 px-3 py-3">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600">
                          <span className="animate-pulse">◈</span>
                          <span>Oracle synthesizing…</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {viewMode === "matrix" && <MatrixView experts={experts!} oracle={oracle} />}
                    {viewMode === "perExpert" && <PerExpertView experts={experts!} oracle={oracle} />}
                    {viewMode === "timeline" && <TimelineView experts={experts!} oracle={oracle} />}
                  </>
                )}
              </section>
            )}

            {/* Single expert (expert/* endpoints) */}
            {singleExpert && (
              <section className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Expert</div>
                <div className="max-w-md">
                  <ExpertCard expert={singleExpert} />
                </div>
              </section>
            )}

            {/* Oracle — shown standalone only when not in multi-expert views */}
            {oracle && !isMultiExpert && (
              <section className="mb-6 max-w-2xl">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Oracle</div>
                <OracleCard oracle={oracle} />
              </section>
            )}

            {/* Daily digest (council + dailyDigest:true) */}
            {digest && (
              <section className="mb-6 max-w-2xl">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Daily Digest</div>
                <div className="rounded border border-amber-900/40 bg-amber-950/10 overflow-hidden">
                  <div className="px-3 py-2 border-b border-amber-900/30 flex items-center gap-2 text-[10px] font-mono text-neutral-600">
                    <span>◉</span>
                    <span>digest</span>
                    {digest.durationMs != null && <span className="ml-auto">{digest.durationMs as number}ms</span>}
                  </div>
                  <div className="px-3 py-2 space-y-2">
                    <div className="text-xs font-semibold text-amber-400/80">{digest.oneLiner as string}</div>
                    <div className="text-xs text-neutral-300 leading-relaxed">{digest.summary as string}</div>
                    {Boolean(digest.expertExcerpts) && (
                      <div className="pt-2 border-t border-amber-900/20 space-y-1">
                        {Object.entries(digest.expertExcerpts as Record<string, string>).map(([tid, excerpt]) =>
                          excerpt ? (
                            <div key={tid} className="flex gap-2 text-[11px]">
                              <span className="text-neutral-700 w-16 flex-shrink-0 font-mono">{tid}</span>
                              <span className="text-neutral-400">{excerpt}</span>
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Chart */}
            {traditions && (
              <section className="mb-6">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Raw Chart Data</div>
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

        {!result && !error && !isLoading && !isStreaming && <Skeleton endpoint={endpoint} />}
      </div>

      {/* ── Right rail: history ── */}
      <div className="flex flex-col border-l border-neutral-800 overflow-hidden">
        <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">
            History ({runs.length})
          </span>
          {runs.length > 0 && (
            <button
              onClick={() => { clearRuns(); setRuns([]); }}
              className="text-[10px] font-mono text-neutral-700 hover:text-red-400 transition-colors"
            >
              clear
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="px-3 py-4 text-[10px] font-mono text-neutral-700 italic">no runs yet</div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    const ep = r.endpoint as EndpointId;
                    setEndpoint(ep);
                    setInputJson(JSON.stringify(r.input, null, 2));
                    setResults((prev) => ({ ...prev, [ep]: r.result }));
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-neutral-900/60 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                      {r.endpoint}
                    </span>
                    {r.totals.durationMs && (
                      <span className="text-[9px] font-mono text-neutral-700">{r.totals.durationMs}ms</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 group-hover:text-neutral-400">
                    {r.totals.tokens > 0 ? `${r.totals.tokens.toLocaleString()} tok` : ""}
                    {r.totals.cost > 0 ? ` · ${formatCost(r.totals.cost)}` : ""}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-800 mt-0.5">
                    {new Date(r.ts).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
