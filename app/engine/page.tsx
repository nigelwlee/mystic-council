"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { estimateCost, formatCost } from "@/lib/api/pricing";

if (process.env.NODE_ENV !== "development") {
  notFound();
}

// ─── Constants ────────────────────────────────────────────────────────────────

type EndpointId =
  | "council"
  | "daily"
  | "daily/facets"
  | "expert/western"
  | "expert/chinese"
  | "expert/vedic"
  | "expert/tarot"
  | "expert/numerology"
  | "chart";

const ENDPOINTS: { id: EndpointId; label: string; desc: string }[] = [
  { id: "chart", label: "Chart", desc: "No-LLM raw tool outputs only" },
  { id: "daily", label: "Daily", desc: "Today's daily reading" },
  { id: "daily/facets", label: "Facets", desc: "5 life areas — health/work/finances/relations/family" },
  { id: "council", label: "Council", desc: "Full Q&A — all 5 experts + Py" },
  { id: "expert/western", label: "Western", desc: "Stella · birth chart + transits" },
  { id: "expert/chinese", label: "Chinese", desc: "Master Wei · Ba Zi + lunar" },
  { id: "expert/vedic", label: "Vedic", desc: "Priya · sidereal + dasha" },
  { id: "expert/tarot", label: "Tarot", desc: "Madame Crow · 3-card spread" },
  { id: "expert/numerology", label: "Numerology", desc: "Pythia · life path + name" },
];

function defaultInput(endpoint: EndpointId): string {
  const base = {
    birthData: {
      name: "Nigel Lee",
      birthdate: "1991-06-01",
      birthtime: "11:44",
      birthplace: "Manila, Philippines",
    },
    date: new Date().toISOString().slice(0, 10),
  };
  if (endpoint === "council") {
    return JSON.stringify({ ...base, question: "What should I focus on this week?" }, null, 2);
  }
  return JSON.stringify(base, null, 2);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "oneLiner" | "summary" | "analysis" | "facts" | "raw";
const TABS: { id: Tab; label: string }[] = [
  { id: "oneLiner", label: "1-liner" },
  { id: "summary", label: "Summary" },
  { id: "analysis", label: "Analysis" },
  { id: "facts", label: "Facts" },
  { id: "raw", label: "Raw" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function expertTabValue(expert: Record<string, unknown>, tab: Tab): string {
  if (tab === "raw") return (expert.rawText as string) ?? "";
  const content = expert.content as Record<string, string> | undefined;
  return content?.[tab] ?? "";
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
      className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-neutral-200 px-2 py-1 border border-neutral-800 hover:border-neutral-600 transition-colors"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function ExpertCard({ expert }: { expert: Record<string, unknown> }) {
  const [tab, setTab] = useState<Tab>("oneLiner");
  const usage = expert.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  const model = expert.model as string | undefined;
  const cost = model && usage ? estimateCost(model, usage) : 0;
  const hasError = Boolean(expert.error);
  const value = expertTabValue(expert, tab);

  return (
    <div
      className="border border-neutral-800 overflow-hidden flex flex-col"
      style={{ borderLeftColor: (expert.color as string) ?? "#555", borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900">
        <span className="text-lg">{expert.expertEmoji as string}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-neutral-300 truncate">{expert.expertName as string}</div>
          <div className="text-[10px] text-neutral-600">
            {expert.traditionId as string}
            {expert.durationMs != null && ` · ${expert.durationMs as number}ms`}
            {usage && ` · ${formatTokens(usage.totalTokens)}tok`}
            {cost > 0 && ` · ${formatCost(cost)}`}
          </div>
        </div>
        {hasError && (
          <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5">error</span>
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
          <div className="px-3 py-2 text-xs text-neutral-300 leading-relaxed flex-1 overflow-y-auto max-h-56">
            {value ? (
              tab === "raw" ? (
                <pre className="text-[10px] font-mono text-neutral-400 whitespace-pre-wrap break-all">
                  {value}
                </pre>
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
  const usage = oracle.usage as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
  const model = oracle.model as string | undefined;
  const oracleUserMessage = oracle.userMessage as string | undefined;
  const oracleSystemPrompt = oracle.systemPrompt as string | undefined;
  const cost = model && usage ? estimateCost(model, usage) : 0;
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="border border-neutral-700 bg-neutral-900/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-800 flex items-center gap-2">
        <span>◈</span>
        <span className="text-xs font-mono text-neutral-400">Py</span>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-neutral-600">
          {oracle.durationMs != null && <span>{oracle.durationMs as number}ms</span>}
          {usage && <span>{formatTokens(usage.totalTokens)}tok</span>}
          {cost > 0 && <span>{formatCost(cost)}</span>}
          {Boolean(oracleSystemPrompt) && (
            <button
              onClick={() => setShowPrompt((v) => !v)}
              className="font-mono uppercase tracking-widest text-neutral-600 hover:text-neutral-300 transition-colors"
            >
              {showPrompt ? "hide prompt" : "prompt"}
            </button>
          )}
        </div>
      </div>
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs font-semibold text-amber-400/80 leading-relaxed">
          {oracle.oneLiner as string}
        </div>
        <div className="text-xs text-neutral-300 leading-relaxed">
          {oracle.summary as string}
        </div>
        {!!(oracle.quote as string | undefined) && (
          <div className="text-[11px] italic text-neutral-500 leading-relaxed border-l-2 border-neutral-700 pl-2">
            {oracle.quote as string}
          </div>
        )}
        {!!(oracle.commonThread as unknown) && (() => {
          const ct = oracle.commonThread as { luck?: string; charms?: string[]; watchouts?: string[] };
          return (
            <div className="text-[10px] font-mono border border-neutral-800 p-2 space-y-1">
              <div className="text-neutral-500 uppercase tracking-widest mb-1">Common Thread</div>
              {ct.luck && <div>luck: <span className="text-amber-400/70">{ct.luck}</span></div>}
              {ct.charms && ct.charms.length > 0 && (
                <div className="text-emerald-600">charms: {ct.charms.join(" · ")}</div>
              )}
              {ct.watchouts && ct.watchouts.length > 0 && (
                <div className="text-red-600/70">watchouts: {ct.watchouts.join(" · ")}</div>
              )}
            </div>
          );
        })()}
        {!!(oracle.weaving as unknown) && (() => {
          const w = oracle.weaving as { subtitle?: string; headline?: string; checklist?: { type: string; text: string }[] };
          return (
            <div className="text-[10px] font-mono border border-neutral-800 p-2 space-y-1">
              <div className="text-neutral-500 uppercase tracking-widest mb-1">Weaving</div>
              {w.subtitle && <div className="text-neutral-400">{w.subtitle}</div>}
              {w.headline && <div className="text-neutral-200 font-medium">{w.headline}</div>}
              {w.checklist && w.checklist.length > 0 && (
                <ul className="space-y-0.5 mt-1">
                  {w.checklist.map((item, i) => (
                    <li key={i} className={item.type === "positive" ? "text-emerald-600" : "text-red-600/70"}>
                      {item.type === "positive" ? "✓" : "⚠"} {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
        {showPrompt && (
          <div className="space-y-2 text-[10px] font-mono pt-2 border-t border-neutral-800">
            {model && (
              <div className="text-neutral-500">
                model: <span className="text-neutral-300">{model}</span>
              </div>
            )}
            {oracleUserMessage && (
              <div>
                <div className="text-neutral-500 uppercase tracking-widest mb-1">User</div>
                <pre className="text-neutral-300 whitespace-pre-wrap break-all">
                  {oracleUserMessage}
                </pre>
              </div>
            )}
            {oracleSystemPrompt && (
              <div>
                <div className="text-neutral-500 uppercase tracking-widest mb-1">System</div>
                <pre className="text-neutral-400 whitespace-pre-wrap break-all">
                  {oracleSystemPrompt.slice(0, 500)}…
                </pre>
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
    <div className="border border-neutral-800 overflow-hidden">
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
    <div className="border border-neutral-800 overflow-hidden mt-4">
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

// ─── Skeleton placeholders ────────────────────────────────────────────────────

function SkelLine({ w = "100%" }: { w?: string }) {
  return <div className="h-2 bg-neutral-900" style={{ width: w }} />;
}

function SkelExpertCard() {
  return (
    <div className="border border-neutral-800 overflow-hidden flex flex-col" style={{ borderLeftColor: "#333", borderLeftWidth: 3 }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900">
        <div className="w-5 h-5 bg-neutral-800" />
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

function FacetsSkeleton() {
  const FACET_LABELS = ["Health", "Work", "Finances", "Relations", "Family"];
  return (
    <div className="opacity-40">
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-700">
        <span className="uppercase tracking-widest">POST /api/daily/facets</span>
        <span className="ml-auto italic">— select inputs and click Run —</span>
      </div>
      <div className="flex gap-2 mb-4">
        {FACET_LABELS.map((f) => (
          <div key={f} className="px-3 py-1 border border-neutral-800 text-[10px] font-mono text-neutral-700">{f}</div>
        ))}
      </div>
      <div className="space-y-4">
        {FACET_LABELS.map((f) => (
          <div key={f} className="border border-neutral-800 p-3">
            <div className="text-[10px] font-mono text-neutral-700 mb-2 uppercase">{f}</div>
            <div className="h-3 bg-neutral-900 w-2/3 mb-2" />
            <div className="space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-neutral-900" />
                  <div className="h-2 bg-neutral-900 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FacetsResultPanel({ result, inputJson }: { result: Record<string, unknown>; inputJson: string }) {
  const FACET_KEYS = ["health", "work", "finances", "relations", "family"] as const;
  const [activeFacet, setActiveFacet] = useState<typeof FACET_KEYS[number]>("health");

  const oracle = result.oracle as { facets: Record<string, { keyAction: string; summary: string; oneLiner: string }> } | undefined;
  const experts = Array.isArray(result.experts) ? result.experts as Record<string, unknown>[] : [];
  const serverMs = result.totalDurationMs as number | undefined;

  const activeSynthesis = oracle?.facets?.[activeFacet];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-600 flex-wrap">
        <span className="uppercase tracking-widest">POST /api/daily/facets</span>
        {serverMs != null && <span>{serverMs}ms</span>}
        <div className="ml-auto flex gap-2">
          <CopyButton value={JSON.stringify(result, null, 2)} label="Copy payload" />
          <CopyButton
            value={`POST /api/daily/facets\n${inputJson}\n\n--- response ---\n${JSON.stringify(result, null, 2)}`}
            label="Copy debug bundle"
          />
        </div>
      </div>

      {/* Facet tab strip */}
      <div className="flex gap-1 mb-4">
        {FACET_KEYS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFacet(f)}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors border ${
              activeFacet === f
                ? "border-neutral-500 text-neutral-200 bg-neutral-800"
                : "border-neutral-800 text-neutral-600 hover:text-neutral-400"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Oracle synthesis for active facet */}
      {activeSynthesis && (
        <div className="border border-neutral-700 bg-neutral-900/50 p-3 mb-4 max-w-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">◈ Oracle — {activeFacet}</div>
          <div className="text-sm font-semibold text-amber-400/80 mb-1">{activeSynthesis.keyAction}</div>
          <div className="text-xs text-neutral-300 mb-1">{activeSynthesis.oneLiner}</div>
          <div className="text-xs text-neutral-400 leading-relaxed">{activeSynthesis.summary}</div>
        </div>
      )}

      {/* Expert rows for active facet */}
      {experts.length > 0 && (
        <section className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
            Experts ({experts.length}) — {activeFacet}
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {experts.map((e, i) => {
              const facets = e.facets as Record<string, { oneLiner: string; summary: string; analysis: string; facts?: string }> | undefined;
              const fc = facets?.[activeFacet];
              const hasError = Boolean(e.error);
              return (
                <div
                  key={i}
                  className="border border-neutral-800 overflow-hidden flex flex-col"
                  style={{ borderLeftColor: (e.color as string) ?? "#555", borderLeftWidth: 3 }}
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-neutral-300 truncate">{e.expertName as string}</div>
                      <div className="text-[10px] text-neutral-600">
                        {e.traditionId as string}
                        {e.durationMs != null && ` · ${e.durationMs as number}ms`}
                      </div>
                    </div>
                    {hasError && (
                      <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5">error</span>
                    )}
                  </div>
                  {hasError ? (
                    <div className="px-3 py-2 text-[11px] text-red-400 font-mono">{e.error as string}</div>
                  ) : fc ? (
                    <div className="px-3 py-2 space-y-1.5 text-xs text-neutral-300">
                      <div className="font-medium text-neutral-100">{fc.oneLiner}</div>
                      <div className="text-neutral-400 text-[11px]">{fc.summary}</div>
                      <div className="text-neutral-500 text-[10px]">{fc.analysis}</div>
                      {fc.facts && <div className="text-neutral-600 text-[10px] font-mono">{fc.facts}</div>}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-[11px] text-neutral-600 italic">no data for {activeFacet}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <RawJson data={result} />
    </div>
  );
}

function Skeleton({ endpoint }: { endpoint: EndpointId }) {
  if (endpoint === "daily/facets") return <FacetsSkeleton />;
  const showExperts = endpoint === "council" || endpoint === "daily";
  const showSingleExpert = endpoint.startsWith("expert/");
  const showOracle = endpoint === "council" || endpoint === "daily";
  const showChart = endpoint === "chart";
  const expertCount = showExperts ? 5 : 1;

  return (
    <div className="opacity-40">
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-700">
        <span className="uppercase tracking-widest">POST /api/{endpoint}</span>
        <span className="ml-auto italic">— select inputs and click Run —</span>
      </div>

      {(showExperts || showSingleExpert) && (
        <section className="mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">
            {showSingleExpert ? "Expert" : `Experts (${expertCount})`}
          </div>
          <div
            className={showSingleExpert ? "max-w-md" : "grid gap-3"}
            style={showSingleExpert ? undefined : { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {Array.from({ length: expertCount }).map((_, i) => (
              <SkelExpertCard key={i} />
            ))}
          </div>
        </section>
      )}

      {showOracle && (
        <section className="mb-6 max-w-2xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-700 mb-2">Oracle</div>
          <div className="border border-neutral-700 bg-neutral-900/30 overflow-hidden">
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
              <div key={t} className="border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-700">
                {t} ▼
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Result renderer ──────────────────────────────────────────────────────────

function ResultPanel({
  endpoint,
  result,
  inputJson,
}: {
  endpoint: EndpointId;
  result: Record<string, unknown>;
  inputJson: string;
}) {
  const experts = Array.isArray(result.experts)
    ? (result.experts as Record<string, unknown>[])
    : null;
  const singleExpert = result.expert as Record<string, unknown> | undefined;
  const oracle = result.oracle as Record<string, unknown> | undefined;
  const traditions = result.traditions as Record<string, unknown> | undefined;
  const serverMs = result.totalDurationMs as number | undefined;

  const totalTokens =
    (experts ?? []).reduce(
      (s, e) => s + ((e.usage as { totalTokens?: number } | undefined)?.totalTokens ?? 0),
      0,
    ) + ((oracle?.usage as { totalTokens?: number } | undefined)?.totalTokens ?? 0);

  const totalCost =
    (experts ?? []).reduce((s, e) => {
      const u = e.usage as { promptTokens: number; completionTokens: number } | undefined;
      const m = e.model as string | undefined;
      return s + (u && m ? estimateCost(m, u) : 0);
    }, 0) +
    (() => {
      const u = oracle?.usage as { promptTokens: number; completionTokens: number } | undefined;
      const m = oracle?.model as string | undefined;
      return u && m ? estimateCost(m, u) : 0;
    })();

  return (
    <div>
      {/* Run header */}
      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-neutral-600 flex-wrap">
        <span className="uppercase tracking-widest">POST /api/{endpoint}</span>
        {serverMs != null && <span>{serverMs}ms</span>}
        {totalTokens > 0 && <span>{totalTokens.toLocaleString()} tok</span>}
        {totalCost > 0 && <span>{formatCost(totalCost)}</span>}
        <div className="ml-auto flex gap-2">
          <CopyButton value={JSON.stringify(result, null, 2)} label="Copy payload" />
          <CopyButton
            value={`POST /api/${endpoint}\n${inputJson}\n\n--- response ---\n${JSON.stringify(result, null, 2)}`}
            label="Copy debug bundle"
          />
        </div>
      </div>

      {/* Timing row per expert */}
      {experts && experts.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 text-[10px] font-mono text-neutral-600">
          {experts.map((e, i) => (
            <span key={i}>
              {e.expertEmoji as string} {e.traditionId as string}
              {e.durationMs != null && (
                <span className="text-neutral-500"> {e.durationMs as number}ms</span>
              )}
            </span>
          ))}
          {oracle?.durationMs != null && (
            <span>◈ oracle <span className="text-neutral-500">{oracle.durationMs as number}ms</span></span>
          )}
        </div>
      )}

      {/* Experts grid */}
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

      {/* Single expert */}
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
    </div>
  );
}

// ─── Recent runs panel ────────────────────────────────────────────────────────

interface EngineRunRow {
  id: string;
  created_at: string;
  route: string;
  phase: string;
  expert_id?: string | null;
  tradition_id?: string | null;
  attempt?: number | null;
  ok: boolean;
  duration_ms?: number | null;
  model?: string | null;
  error?: string | null;
}

function RecentRunsPanel() {
  const [runs, setRuns] = useState<EngineRunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/engine/runs");
      const data = await res.json() as { runs: EngineRunRow[] };
      setRuns(data.runs ?? []);
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) void load(); }, [open]);

  return (
    <div className="border-t border-neutral-800 mt-8 pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-2"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>Recent engine_runs</span>
        {!open && <span className="text-neutral-700">(click to load)</span>}
        {open && <button onClick={(e) => { e.stopPropagation(); void load(); }} className="ml-2 text-neutral-600 hover:text-neutral-400">[refresh]</button>}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto">
          {loading && <div className="text-neutral-600 text-[11px] font-mono">Loading…</div>}
          {!loading && runs.length === 0 && <div className="text-neutral-600 text-[11px] font-mono">No rows yet.</div>}
          {!loading && runs.length > 0 && (
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead>
                <tr className="text-neutral-600 border-b border-neutral-800">
                  {["time", "route", "phase", "expert", "model", "ok", "ms", "error"].map((h) => (
                    <th key={h} className="text-left py-1 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className={`border-b border-neutral-900 ${r.ok ? "text-neutral-400" : "text-red-400"}`}>
                    <td className="py-0.5 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleTimeString()}</td>
                    <td className="py-0.5 pr-4">{r.route}</td>
                    <td className="py-0.5 pr-4">{r.phase}</td>
                    <td className="py-0.5 pr-4">{r.expert_id ?? "—"}</td>
                    <td className="py-0.5 pr-4 max-w-[160px] truncate">{r.model?.split("/")[1] ?? "—"}</td>
                    <td className="py-0.5 pr-4">{r.ok ? "✓" : "✗"}</td>
                    <td className="py-0.5 pr-4">{r.duration_ms ?? "—"}</td>
                    <td className="py-0.5 max-w-[280px] truncate text-red-500">{r.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EngineInspector() {
  const [endpoint, setEndpoint] = useState<EndpointId>("daily");
  const [inputJson, setInputJson] = useState(() => defaultInput("daily"));
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    let body: unknown;
    try {
      body = JSON.parse(inputJson);
    } catch {
      setError("Invalid JSON in input");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Record<string, unknown>;
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

  return (
    <div className="h-[100dvh] grid grid-cols-[260px_1fr] bg-neutral-950 text-neutral-100 overflow-hidden">

      {/* ── Left panel: controls ── */}
      <div className="flex flex-col border-r border-neutral-800 overflow-y-auto">

        {/* Header */}
        <div className="px-3 py-3 border-b border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
            Engine Inspector
          </div>
        </div>

        {/* Endpoint picker */}
        <div className="px-3 py-3 border-b border-neutral-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
            Endpoint
          </div>
          <div className="space-y-0.5">
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.id}
                onClick={() => selectEndpoint(ep.id)}
                className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
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

        {/* Input JSON */}
        <div className="flex-1 px-3 py-3 flex flex-col min-h-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">
            Input JSON
          </div>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            className="flex-1 w-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 p-2 resize-none focus:outline-none focus:border-neutral-600 min-h-[200px]"
            spellCheck={false}
          />
        </div>

        {/* Run button */}
        <div className="px-3 pb-4">
          <button
            onClick={() => void run()}
            disabled={isLoading}
            className="w-full py-2 text-xs font-mono uppercase tracking-widest bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Running…" : "▶  Run"}
          </button>
        </div>
      </div>

      {/* ── Right panel: results ── */}
      <div className="overflow-y-auto p-4 min-w-0">

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-3 text-neutral-600 text-[11px] font-mono mb-4">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>●</span>
            <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>●</span>
            <span className="ml-2">POST /api/{endpoint} — running…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <pre className="text-red-400 text-[11px] font-mono bg-red-950/20 border border-red-900/40 p-3 whitespace-pre-wrap">
            {error}
          </pre>
        )}

        {/* Result */}
        {result && !isLoading && endpoint === "daily/facets" && (
          <FacetsResultPanel result={result} inputJson={inputJson} />
        )}
        {result && !isLoading && endpoint !== "daily/facets" && (
          <ResultPanel endpoint={endpoint} result={result} inputJson={inputJson} />
        )}

        {/* Skeleton: shown when no result yet and not loading */}
        {!result && !error && !isLoading && (
          <Skeleton endpoint={endpoint} />
        )}

        <RecentRunsPanel />
      </div>
    </div>
  );
}
