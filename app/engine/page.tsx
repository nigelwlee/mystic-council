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
  { id: "chart", label: "Chart", desc: "No-LLM raw tool outputs only" },
  { id: "daily", label: "Daily", desc: "Today's daily reading" },
  { id: "council", label: "Council", desc: "Full Q&A — all 5 experts + Oracle" },
  { id: "expert/western", label: "Western", desc: "Stella · birth chart + transits" },
  { id: "expert/chinese", label: "Chinese", desc: "Master Wei · Ba Zi + lunar" },
  { id: "expert/vedic", label: "Vedic", desc: "Priya · sidereal + dasha" },
  { id: "expert/tarot", label: "Tarot", desc: "Madame Crow · 3-card spread" },
  { id: "expert/numerology", label: "Numerology", desc: "Pythia · life path + name" },
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

// ─── Sequence model ──────────────────────────────────────────────────────────
//
// Recommended flow: chart → daily → council. Earlier steps' results are passed
// forward as `chart` and `dailyReading` so interpretations stay coherent.

const SEQUENCE: { step: number; id: EndpointId; label: string; tagline: string }[] = [
  { step: 1, id: "chart", label: "Chart", tagline: "Deterministic facts (no LLM)" },
  { step: 2, id: "daily", label: "Daily", tagline: "Today's reading — needs Chart" },
  { step: 3, id: "council", label: "Council", tagline: "Q&A — needs Chart + Daily" },
];

const STEP_BY_ENDPOINT: Partial<Record<EndpointId, number>> = {
  chart: 1,
  daily: 2,
  council: 3,
};

/** Stable JSON-stringify of birthData for prereq-match comparison. */
function birthKey(bd: unknown): string {
  if (!bd || typeof bd !== "object") return "null";
  const b = bd as Record<string, unknown>;
  return JSON.stringify({
    name: b.name ?? null,
    date: b.date ?? null,
    time: b.time ?? null,
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
  });
}

type PrereqMatch = {
  chart?: Record<string, unknown>;
  chartKey?: string;
  dailyReading?: Record<string, unknown>;
  dailyKey?: string;
};

/** Returns prerequisite results from `results` whose birthData+date match the
 * input the user is about to send. */
function findPrereqs(
  input: { birthData?: unknown; date?: unknown },
  results: Partial<Record<EndpointId, Record<string, unknown>>>,
): PrereqMatch {
  const wantBd = birthKey(input.birthData);
  const wantDate = String(input.date ?? "");

  const matches = (r: Record<string, unknown> | undefined): boolean => {
    if (!r) return false;
    const ri = r.input as { birthData?: unknown; date?: unknown } | undefined;
    if (!ri) return false;
    return birthKey(ri.birthData) === wantBd && String(ri.date ?? "") === wantDate;
  };

  const out: PrereqMatch = {};
  if (matches(results.chart)) {
    out.chart = results.chart;
    out.chartKey = String((results.chart as Record<string, unknown>).id ?? "");
  }
  if (matches(results.daily)) {
    out.dailyReading = results.daily;
    out.dailyKey = String((results.daily as Record<string, unknown>).id ?? "");
  }
  return out;
}

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

function PrereqChip({
  label,
  state,
}: {
  label: string;
  state: "inline" | "attached" | "missing";
}) {
  const config = {
    inline: { dot: "●", color: "text-emerald-500", note: "in input JSON" },
    attached: { dot: "●", color: "text-emerald-500", note: "auto-attaching from cached result" },
    missing: { dot: "○", color: "text-neutral-600", note: "not provided — run prior step" },
  }[state];
  return (
    <div className="flex items-center gap-1.5">
      <span className={config.color}>{config.dot}</span>
      <span className="text-neutral-300">{label}</span>
      <span className="text-neutral-600">— {config.note}</span>
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

// ─── SSE helper ──────────────────────────────────────────────────────────────

async function runSse(
  url: string,
  body: unknown,
  onExpert: (e: Record<string, unknown>) => void,
  onOracle: (o: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 300)}` : ""}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let runResult: Record<string, unknown> = {};
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
        if (event.type === "expert-complete") {
          const { type: _t, ...expertData } = event;
          onExpert(expertData as Record<string, unknown>);
        } else if (event.type === "oracle-complete") {
          onOracle(event.oracle as Record<string, unknown>);
        } else if (event.type === "run-complete") {
          const { type: _t, ...runData } = event;
          runResult = runData as Record<string, unknown>;
        }
      } catch { /* ignore malformed lines */ }
    }
  }
  return runResult;
}

// ─── Run Sequence view ────────────────────────────────────────────────────────

const TRADITION_META: Record<string, { emoji: string; label: string }> = {
  western: { emoji: "♈", label: "Western" },
  chinese: { emoji: "🐉", label: "Chinese" },
  vedic: { emoji: "🕉", label: "Vedic" },
  tarot: { emoji: "🃏", label: "Tarot" },
  numerology: { emoji: "∞", label: "Numerology" },
};

function tradPreview(tradId: string, data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;

  if (tradId === "numerology") {
    const lp = (obj.lifePath as Record<string, unknown> | null)?.lifePath;
    const pd = (obj.personalNumbers as Record<string, unknown> | null)?.personalDay;
    const py = (obj.personalNumbers as Record<string, unknown> | null)?.personalYear;
    const bits: string[] = [];
    if (lp != null) bits.push(`lifePath: ${lp}`);
    if (pd != null) bits.push(`personalDay: ${pd}`);
    else if (py != null) bits.push(`personalYear: ${py}`);
    return bits.join(" · ");
  }

  const bits: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (bits.length >= 2) break;
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      bits.push(`${k}: ${v}`);
    } else if (Array.isArray(v) && v.length > 0) {
      const first = v[0];
      if (typeof first === "string" || typeof first === "number") {
        bits.push(`${k}: ${v.slice(0, 3).join(", ")}${v.length > 3 ? "…" : ""}`);
      } else {
        bits.push(`${k}: ${v.length} item${v.length === 1 ? "" : "s"}`);
      }
    }
  }
  return bits.join(" · ");
}

function renderValue(v: unknown): React.ReactNode {
  if (v == null) return <span className="text-neutral-700 italic">null</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return (
    <pre className="text-[10px] font-mono text-neutral-400 whitespace-pre-wrap break-all bg-neutral-950/60 px-2 py-1 rounded mt-0.5">
      {JSON.stringify(v, null, 2)}
    </pre>
  );
}

function ChartCard({ tradId, data }: { tradId: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  const meta = TRADITION_META[tradId] ?? { emoji: "·", label: tradId };
  const preview = tradPreview(tradId, data);
  const entries = data && typeof data === "object" ? Object.entries(data as Record<string, unknown>) : [];

  return (
    <div className="border border-neutral-800 rounded overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 hover:bg-neutral-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.emoji}</span>
          <span className="text-xs font-mono text-neutral-300">{meta.label}</span>
          <span className="ml-auto text-[10px] font-mono text-neutral-700">{open ? "▲" : "▼"}</span>
        </div>
        {preview && <div className="text-[10px] text-neutral-600 mt-1 truncate">{preview}</div>}
      </button>
      {open && (
        <div className="border-t border-neutral-800 px-3 py-2 bg-neutral-950/40 space-y-1.5">
          {entries.length === 0 ? (
            <div className="text-[10px] text-neutral-700 italic">empty</div>
          ) : (
            entries.map(([k, v]) => (
              <div key={k} className="text-[11px] font-mono">
                <div className="text-neutral-600">{k}</div>
                <div className="text-neutral-300 ml-2">{renderValue(v)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RunSequenceView() {
  const [name, setName] = useState(DEFAULT_BIRTH_DATA.name);
  const [dob, setDob] = useState(DEFAULT_BIRTH_DATA.date);
  const [time, setTime] = useState(DEFAULT_BIRTH_DATA.time);
  const [lat, setLat] = useState(String(DEFAULT_BIRTH_DATA.latitude));
  const [lng, setLng] = useState(String(DEFAULT_BIRTH_DATA.longitude));
  const [location, setLocation] = useState(DEFAULT_BIRTH_DATA.location);
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));

  const [geocoding, setGeocoding] = useState(false);
  useEffect(() => {
    if (!location.trim() || location === DEFAULT_BIRTH_DATA.location) return;
    const id = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
          { headers: { "Accept-Language": "en" } },
        );
        const data = await res.json() as { lat: string; lon: string }[];
        if (data[0]) {
          setLat(parseFloat(data[0].lat).toFixed(4));
          setLng(parseFloat(data[0].lon).toFixed(4));
        }
      } catch { /* ignore */ } finally {
        setGeocoding(false);
      }
    }, 800);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [dailyExperts, setDailyExperts] = useState<Record<string, unknown>[]>([]);
  const [dailyOracle, setDailyOracle] = useState<Record<string, unknown> | null>(null);
  const [dailyFull, setDailyFull] = useState<Record<string, unknown> | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; experts: Record<string, unknown>[]; oracle: Record<string, unknown> | null; error?: string; ts: number; durationMs: number }[]>([]);
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [chatElapsed, setChatElapsed] = useState(0);

  useEffect(() => {
    if (chatStartedAt === null) return;
    const id = setInterval(() => setChatElapsed(Date.now() - chatStartedAt), 100);
    return () => clearInterval(id);
  }, [chatStartedAt]);

  const [busy, setBusy] = useState<"chart" | "daily" | "council" | null>(null);
  const [showSummaries, setShowSummaries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const birthData = {
    name, date: dob, time,
    latitude: parseFloat(lat) || 0,
    longitude: parseFloat(lng) || 0,
    location,
  };

  const runAll = async () => {
    setBusy("chart");
    setError(null);
    setChart(null);
    setDailyExperts([]);
    setDailyOracle(null);
    setDailyFull(null);

    let chartResult: Record<string, unknown>;
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ birthData, date }),
      });
      if (!res.ok) throw new Error(`Chart HTTP ${res.status}: ${await res.text()}`);
      chartResult = await res.json() as Record<string, unknown>;
      setChart(chartResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
      return;
    }

    setBusy("daily");
    const liveExperts: Record<string, unknown>[] = [];
    try {
      const dailyRunResult = await runSse(
        "/api/daily/stream",
        { birthData, date, chart: chartResult },
        (e) => { liveExperts.push(e); setDailyExperts([...liveExperts]); },
        (o) => setDailyOracle(o),
      );
      setDailyFull(dailyRunResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }

    setBusy(null);
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || busy) return;
    setChatInput("");
    setBusy("council");
    const startedAt = Date.now();
    setChatStartedAt(startedAt);
    setChatElapsed(0);
    const chatExperts: Record<string, unknown>[] = [];
    let chatOracle: Record<string, unknown> | null = null;
    try {
      await runSse(
        "/api/council/stream",
        {
          birthData, date, question: q,
          ...(chart ? { chart } : {}),
          ...(dailyFull ? { dailyReading: dailyFull } : {}),
        },
        (e) => { chatExperts.push(e); },
        (o) => { chatOracle = o; },
      );
      const durationMs = Date.now() - startedAt;
      setChatHistory((prev) => [{ q, experts: chatExperts, oracle: chatOracle, ts: startedAt, durationMs }, ...prev]);
    } catch (e) {
      const durationMs = Date.now() - startedAt;
      setChatHistory((prev) => [{ q, experts: chatExperts, oracle: chatOracle, error: e instanceof Error ? e.message : String(e), ts: startedAt, durationMs }, ...prev]);
    }
    setChatStartedAt(null);
    setBusy(null);
  };

  const traditions = chart?.traditions as Record<string, unknown> | undefined;

  const inputRows: [string, string, (v: string) => void][] = [
    ["Name", name, setName],
    ["Date of birth", dob, setDob],
    ["Time", time, setTime],
  ];

  return (
    <div className="p-4 max-w-4xl">
      {/* Inputs */}
      <section className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Inputs</div>
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-6 gap-y-1.5 text-[11px] font-mono mb-3">
          {inputRows.map(([label, val, setter]) => (
            <Fragment key={label}>
              <span className="text-neutral-600 self-center whitespace-nowrap">{label}</span>
              <input
                value={val}
                onChange={(e) => setter(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-neutral-600 rounded"
              />
            </Fragment>
          ))}
          {/* Location with auto-geocoding */}
          <span className="text-neutral-600 self-center whitespace-nowrap">Location</span>
          <div className="relative">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="city or place name"
              className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-neutral-600 rounded"
            />
            {geocoding && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-amber-500 font-mono animate-pulse">locating…</span>}
          </div>
          <span className="text-neutral-600 self-center whitespace-nowrap">Latitude</span>
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-neutral-600 rounded"
          />
          <span className="text-neutral-600 self-center whitespace-nowrap">Longitude</span>
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-neutral-600 rounded"
          />
          <span className="text-neutral-600 self-center whitespace-nowrap">Reading date</span>
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-neutral-600 rounded"
          />
          <span />
        </div>
        <button
          onClick={runAll}
          disabled={busy !== null}
          className="px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded"
        >
          {busy === "chart" ? "Running chart…" : busy === "daily" ? "Running daily…" : "▶  Run Chart + Daily"}
        </button>
        {error && (
          <div className="mt-3 text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-900/40 rounded p-2 whitespace-pre-wrap">
            {error}
          </div>
        )}
      </section>

      {/* Step 1: Chart cards */}
      {traditions && (
        <section className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">1. Chart</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {Object.entries(traditions).map(([tradId, data]) => (
              <ChartCard key={tradId} tradId={tradId} data={data} />
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Daily one-liners */}
      {(dailyExperts.length > 0 || dailyOracle) && (
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">2. Daily</div>
            <button
              onClick={() => setShowSummaries((v) => !v)}
              className="text-[10px] font-mono text-neutral-700 hover:text-neutral-400 transition-colors"
            >
              {showSummaries ? "hide summaries" : "show summaries"}
            </button>
            {busy === "daily" && <span className="text-[10px] font-mono text-amber-500 animate-pulse">streaming…</span>}
          </div>
          {dailyOracle && (
            <div className="mb-3 text-sm text-amber-400/90 leading-relaxed">
              ◈ {dailyOracle.oneLiner as string}
            </div>
          )}
          <div className="space-y-1.5">
            {dailyExperts.map((e, i) => {
              const content = e.content as Record<string, string> | undefined;
              return (
                <div key={i} className="text-[11px] font-mono">
                  <span className="text-neutral-600">{e.expertEmoji as string} {e.expertName as string}:</span>{" "}
                  <span className="text-neutral-300">{content?.oneLiner ?? ""}</span>
                  {showSummaries && content?.summary && (
                    <div className="text-[10px] text-neutral-600 mt-0.5 ml-4 leading-snug">{content.summary}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 3: Chat */}
      {dailyFull !== null && (
        <section className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">3. Chat</div>
          <div className="flex gap-2 mb-4">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChat(); } }}
              placeholder="Ask the council anything…"
              rows={2}
              className="flex-1 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 px-2 py-1.5 resize-none focus:outline-none focus:border-neutral-600 rounded"
            />
            <button
              onClick={() => void sendChat()}
              disabled={busy !== null || !chatInput.trim()}
              className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded self-start"
            >
              {busy === "council" ? "…" : "Ask"}
            </button>
          </div>
          {busy === "council" && chatStartedAt !== null && (
            <div className="mb-4 border-t border-neutral-900 pt-3 flex items-center gap-3 text-[11px] font-mono">
              <span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-400">Council deliberating…</span>
              <span className="text-neutral-500">{(chatElapsed / 1000).toFixed(1)}s</span>
            </div>
          )}
          {chatHistory.map((item) => (
            <div key={item.ts} className="mb-5 border-t border-neutral-900 pt-3">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="text-[10px] font-mono text-neutral-600">Q: {item.q}</div>
                <div className="text-[9px] font-mono text-neutral-700 whitespace-nowrap shrink-0">
                  {new Date(item.ts).toLocaleTimeString()} · {(item.durationMs / 1000).toFixed(1)}s
                </div>
              </div>
              {item.oracle && (
                <div className="mb-1 text-sm text-amber-400/90 leading-relaxed">
                  ◈ {item.oracle.oneLiner as string}
                </div>
              )}
              {item.oracle && (item.oracle.summary as string) && (
                <div className="mb-3 text-[11px] text-neutral-400 leading-relaxed">
                  {item.oracle.summary as string}
                </div>
              )}
              <div className="space-y-1">
                {item.experts.map((e, i) => {
                  const content = e.content as Record<string, string> | undefined;
                  const text = content?.oneLiner || content?.summary || (e.error as string | undefined) || "";
                  if (!text) return null;
                  return (
                    <div key={i} className="text-[11px] font-mono">
                      <span className="text-neutral-600">{e.expertEmoji as string} {e.expertName as string}:</span>{" "}
                      <span className={e.error ? "text-red-400" : "text-neutral-300"}>{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EngineInspector() {
  const [view, setView] = useState<"run-sequence" | EndpointId>("run-sequence");
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
    setView(id);
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

    // Auto-attach prerequisite results for council/daily based on matching birthData+date.
    // User-provided values in the JSON take precedence (we only fill in when missing).
    if (endpoint === "council" || endpoint === "daily") {
      const inputObj = body as Record<string, unknown>;
      const prereqs = findPrereqs(inputObj, results);
      if (prereqs.chart && inputObj.chart === undefined) {
        body = { ...inputObj, chart: prereqs.chart };
      }
      if (endpoint === "council" && prereqs.dailyReading && (body as Record<string, unknown>).dailyReading === undefined) {
        body = { ...(body as Record<string, unknown>), dailyReading: prereqs.dailyReading };
      }
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

  // Prereq state for the *current* input (so the UX reflects what the next Run
  // would actually attach). Falls back to defaults if input JSON is unparseable.
  const currentInput: { birthData?: unknown; date?: unknown } = (() => {
    try { return JSON.parse(inputJson); } catch { return {}; }
  })();
  const livePrereqs = findPrereqs(currentInput, results);
  const willAttachChart = (endpoint === "council" || endpoint === "daily")
    && livePrereqs.chart !== undefined
    && (currentInput as Record<string, unknown>).chart === undefined;
  const willAttachDaily = endpoint === "council"
    && livePrereqs.dailyReading !== undefined
    && (currentInput as Record<string, unknown>).dailyReading === undefined;
  const sequenceStatus = (epId: EndpointId): "done" | "ready" | "blocked" => {
    if (results[epId]) return "done";
    if (epId === "chart") return "ready";
    if (epId === "daily") return results.chart ? "ready" : "blocked";
    if (epId === "council") return results.daily ? "ready" : results.chart ? "ready" : "blocked";
    return "ready";
  };

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
        {/* Run Sequence */}
        <div className="px-3 py-3 border-b border-neutral-800">
          <button
            onClick={() => setView("run-sequence")}
            className={`w-full text-left px-2 py-2 rounded text-xs font-mono transition-colors ${
              view === "run-sequence"
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
            }`}
          >
            <div className="font-semibold tracking-wide">Run Sequence</div>
            <div className="text-[10px] text-neutral-600 leading-tight mt-0.5">Chart → Daily → Chat</div>
          </button>
        </div>

        {/* Sequence guide */}
        <div className="px-3 py-3 border-b border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
            Recommended sequence
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {SEQUENCE.map((s, i) => {
              const status = sequenceStatus(s.id);
              const isActive = endpoint === s.id;
              const dot = status === "done" ? "●" : status === "ready" ? "○" : "·";
              const dotColor =
                status === "done" ? "text-emerald-500"
                : status === "ready" ? "text-amber-500"
                : "text-neutral-700";
              return (
                <Fragment key={s.id}>
                  <button
                    onClick={() => selectEndpoint(s.id)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                      view === s.id ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                    title={`Step ${s.step}: ${s.tagline}`}
                  >
                    <span className={dotColor}>{dot}</span>
                    <span>{s.step}.</span>
                    <span>{s.label}</span>
                  </button>
                  {i < SEQUENCE.length - 1 && <span className="text-neutral-700">→</span>}
                </Fragment>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] text-neutral-600 leading-snug">
            Run in order. Each step's output is auto-attached to the next when birthData + date match.
          </div>
        </div>

        <div className="px-3 py-3 border-b border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Endpoint</div>
          <div className="space-y-0.5">
            {ENDPOINTS.map((ep) => {
              const step = STEP_BY_ENDPOINT[ep.id];
              const status = step ? sequenceStatus(ep.id) : null;
              const dot = status === "done" ? "●" : status === "ready" ? "○" : status === "blocked" ? "·" : null;
              const dotColor =
                status === "done" ? "text-emerald-500"
                : status === "ready" ? "text-amber-500"
                : "text-neutral-700";
              return (
                <button
                  key={ep.id}
                  onClick={() => selectEndpoint(ep.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    view === ep.id
                      ? "bg-neutral-800 text-neutral-100"
                      : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-mono">
                    {step && dot && <span className={`text-[10px] ${dotColor}`}>{dot}</span>}
                    {step && <span className="text-[10px] text-neutral-600">{step}.</span>}
                    <span>{ep.label}</span>
                  </div>
                  <div className="text-[10px] text-neutral-600 leading-tight pl-0">{ep.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prerequisite status — only on council/daily endpoint views */}
        {view !== "run-sequence" && (endpoint === "council" || endpoint === "daily") && (
          <div className="px-3 py-3 border-b border-neutral-800">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
              Prerequisites
            </div>
            <div className="space-y-1 text-[10px] font-mono">
              <PrereqChip
                label="Chart"
                state={
                  (currentInput as Record<string, unknown>).chart !== undefined
                    ? "inline"
                    : willAttachChart
                      ? "attached"
                      : "missing"
                }
              />
              {endpoint === "council" && (
                <PrereqChip
                  label="Daily reading"
                  state={
                    (currentInput as Record<string, unknown>).dailyReading !== undefined
                      ? "inline"
                      : willAttachDaily
                        ? "attached"
                        : "missing"
                  }
                />
              )}
            </div>
            {(!willAttachChart && (currentInput as Record<string, unknown>).chart === undefined) && (
              <button
                onClick={() => selectEndpoint("chart")}
                className="mt-2 text-[10px] font-mono text-amber-500 hover:text-amber-400 transition-colors"
              >
                → Run /api/chart first for coherent results
              </button>
            )}
            {endpoint === "council" && !willAttachDaily && (currentInput as Record<string, unknown>).dailyReading === undefined && results.chart && (
              <button
                onClick={() => selectEndpoint("daily")}
                className="mt-1 text-[10px] font-mono text-amber-500 hover:text-amber-400 transition-colors"
              >
                → Run /api/daily next so council respects today's frame
              </button>
            )}
          </div>
        )}

        {view !== "run-sequence" && (
          <>
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
          </>
        )}
      </div>

      {/* ── Center: results ── */}
      <div className="overflow-y-auto min-w-0">
        <div className={view === "run-sequence" ? "block" : "hidden"}><RunSequenceView /></div>
        <div className={view === "run-sequence" ? "hidden" : "p-4"}>
        {/* Run header */}
        {(result !== null || storedResult !== null || error !== null || isLoading) && (() => {
          const sentInput = (storedResult?.input as Record<string, unknown> | undefined) ?? null;
          const usedChart = sentInput?.chart !== undefined;
          const usedDaily = sentInput?.dailyReading !== undefined;
          return (
          <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-600 flex-wrap">
            <span className="uppercase tracking-widest">POST /api/{endpoint}</span>
            {clientMs != null && <span>{clientMs}ms client</span>}
            {serverMs != null && <span>{serverMs}ms server</span>}
            {totalTokens > 0 && <span className="text-neutral-500">{totalTokens.toLocaleString()} tok</span>}
            {totalCost > 0 && <span className="text-neutral-500">{formatCost(totalCost)}</span>}
            {(usedChart || usedDaily) && (
              <span className="text-emerald-600 border border-emerald-900 px-1.5 py-0.5 rounded">
                {[usedChart && "+chart", usedDaily && "+daily"].filter(Boolean).join(" ")}
              </span>
            )}
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
          );
        })()}

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
