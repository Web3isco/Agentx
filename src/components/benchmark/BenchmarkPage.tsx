"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  X,
  Shield,
  ArrowRight,
  BarChart3,
  Clock,
  DollarSign,
  Zap,
  Activity,
  Trophy,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { agents } from "@/components/discover/agents-data";
import { agentDetails } from "@/components/agent/agent-detail-data";
import {
  benchmarkMetrics,
  speedData,
  costData,
  dayLabels,
} from "./benchmark-data";
import { getAgentMetrics, getCompositeScore } from "@/lib/agents/reputation/service";
import { isDiscoveredAgentId, parseDiscoveredAgentId } from "@/lib/discovery/service";
import {
  useOnchainCompareData,
  loadOnchainOptions,
  type OnchainCompareView,
} from "@/lib/discovery/compare-view";

type AgentLike = typeof agents[0];

function findAgent(id: string): AgentLike | undefined {
  const mock = agents.find((a) => a.id === id);
  if (mock) return mock;
  if (isDiscoveredAgentId(id)) {
    const parsed = parseDiscoveredAgentId(id);
    if (parsed) {
      return {
        id,
        name: `Agent #${parsed.tokenId}`,
        category: "Onchain",
        description: `Onchain agent (token ${parsed.tokenId} on chain ${parsed.chainId})`,
        avatar: `#${parsed.tokenId}`.slice(0, 2),
        color: "#71717a",
        verified: false,
        status: "beta" as const,
        chain: "Multi-chain" as const,
        rating: 0,
        reviews: 0,
        tasks: "0",
        performance: 0,
        uptime: 0,
        price: "Unknown",
        priceNumeric: 0,
        trend: "new",
        lastActive: "unknown",
        features: ["Onchain"],
        builder: `Chain ${parsed.chainId}`,
        deployed: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      };
    }
  }
  return undefined;
}

function buildBenchmarkAgent(
  id: string,
  real?: OnchainCompareView | null
): AgentLike {
  const parsed = parseDiscoveredAgentId(id);
  if (!parsed) return findAgent(id) ?? buildPlaceholder(id);
  if (!real) {
    return {
      id,
      name: "Loading…",
      category: "Onchain",
      description: `Loading real onchain data for token ${parsed.tokenId}…`,
      avatar: "…",
      color: "#71717a",
      verified: false,
      status: "beta",
      chain: "Multi-chain",
      rating: 0,
      reviews: 0,
      tasks: "0",
      performance: 0,
      uptime: 0,
      price: "Unknown",
      priceNumeric: 0,
      trend: "new",
      lastActive: "unknown",
      features: ["Onchain"],
      builder: `Chain ${parsed.chainId}`,
      deployed: "",
    };
  }
  return {
    id,
    name: real.name,
    category: real.category,
    description: `Onchain agent (token ${parsed.tokenId} on chain ${parsed.chainId})`,
    avatar: real.avatar,
    color: real.color,
    verified: real.verified,
    status: (real.healthScore ?? 0) >= 80 ? "active" : "beta",
    chain: (real.chain === "BNB Chain" || real.chain === "Ethereum" || real.chain === "Arbitrum") ? real.chain as AgentLike["chain"] : "Multi-chain",
    rating: real.rating ?? 0,
    reviews: real.feedbackCount ?? 0,
    tasks: real.feedbackCount != null ? String(real.feedbackCount) : "0",
    performance: real.healthScore ?? 0,
    uptime: real.healthScore ?? 0,
    price: real.price ?? "Unknown",
    priceNumeric: 0,
    trend: real.feedbackCount != null ? `${real.feedbackCount} reviews` : "new",
    lastActive: "now",
    features: ["Onchain", ...real.protocols.map((p) => p.toUpperCase())],
    builder: "",
    deployed: real.createdBlockNumber != null ? `Block ${real.createdBlockNumber}` : "",
  };
}

function buildPlaceholder(id: string): AgentLike {
  return {
    id,
    name: id,
    category: "Onchain",
    description: "",
    avatar: "AG",
    color: "#71717a",
    verified: false,
    status: "beta",
    chain: "Multi-chain",
    rating: 0,
    reviews: 0,
    tasks: "0",
    performance: 0,
    uptime: 0,
    price: "Unknown",
    priceNumeric: 0,
    trend: "new",
    lastActive: "unknown",
    features: ["Onchain"],
    builder: "unknown",
    deployed: "",
  };
}

/**
 * Resolve a real onchain benchmark metric value, or null when the metric has
 * no honest onchain measurement. Mock agents keep their existing resolution.
 */
function getBenchmarkMetric(
  agentId: string,
  key: string,
  real?: OnchainCompareView | null
): number | null {
  if (isDiscoveredAgentId(agentId)) {
    if (!real) return null;
    switch (key) {
      case "performance":
        return real.healthScore;
      case "uptime":
        return real.healthScore;
      case "successRate":
        return real.successRate;
      case "reputation":
        return real.reputationScore;
      case "rating":
        return real.rating;
      default:
        return null;
    }
  }
  // Mocks
  const metrics = getAgentMetrics(agentId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (metrics && key in metrics) return (metrics as any)[key] as number;
  const detail = agentDetails[agentId];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (detail && key in (detail as any)) return (detail as any)[key] as number;
  const base = findAgent(agentId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (base && key in (base as any)) return (base as any)[key] as number;
  return null;
}

function AgentSelector({
  selectedId,
  selectedAgent,
  onSelect,
  excludeIds,
  onchainOptions,
  onchainLoading,
}: {
  selectedId: string | null;
  selectedAgent?: AgentLike | undefined;
  onSelect: (id: string) => void;
  excludeIds: string[];
  onchainOptions: {
    id: string;
    name: string;
    avatar: string;
    color: string;
    verified: boolean;
    category: string;
    chain: string;
  }[];
  onchainLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = selectedAgent;
  const available = agents.filter((a) => !excludeIds.includes(a.id));
  const onchainAvailable = onchainOptions.filter(
    (a) => !excludeIds.includes(a.id)
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:border-accent/20 transition-all"
      >
        {selected ? (
          <>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0"
              style={{
                backgroundColor: selected.color + "20",
                color: selected.color,
              }}
            >
              {selected.avatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                  {selected.name}
                </span>
                {selected.verified && (
                  <Shield size={10} className="text-success shrink-0" />
                )}
              </div>
            </div>
          </>
        ) : (
          <span className="text-xs text-muted px-1">+ Add</span>
        )}
        <ChevronDown
          size={14}
          className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-60 rounded-xl border border-border bg-surface shadow-2xl py-1 max-h-60 overflow-y-auto scrollbar-none">
            {selectedId && (
              <button
                onClick={() => {
                  onSelect("__clear__");
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#ef4444] hover:bg-surface-hover transition-colors"
              >
                <X size={12} />
                Remove
              </button>
            )}
            {onchainLoading && available.length === 0 && onchainAvailable.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted text-center flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </div>
            )}
            {onchainAvailable
              .filter((a) => a.id !== selectedId)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onSelect(a.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover transition-colors"
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold shrink-0"
                    style={{
                      backgroundColor: a.color + "20",
                      color: a.color,
                    }}
                  >
                    {a.avatar}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-foreground truncate">
                        {a.name}
                      </span>
                      {a.verified && (
                        <Shield size={9} className="text-success shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-muted">
                      {a.category} · On-chain
                    </span>
                  </div>
                </button>
              ))}
            {onchainAvailable.length > 0 && available.length > 0 && (
              <div className="px-3 py-1.5 text-[9px] font-semibold text-muted/60 uppercase tracking-wider border-t border-border">
                On-chain agents
              </div>
            )}
            {available
              .filter((a) => a.id !== selectedId)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onSelect(a.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover transition-colors"
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold shrink-0"
                    style={{
                      backgroundColor: a.color + "20",
                      color: a.color,
                    }}
                  >
                    {a.avatar}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-foreground truncate">
                        {a.name}
                      </span>
                      {a.verified && (
                        <Shield size={9} className="text-success shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-muted">
                      {a.category}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function MetricBar({
  agents,
  metric,
  realData,
}: {
  agents: { id: string; name: string; color: string; verified: boolean; avatar: string }[];
  metric: (typeof benchmarkMetrics)[0];
  realData: Map<string, OnchainCompareView | null>;
}) {
  const values = agents
    .map((a) => {
      const val = getBenchmarkMetric(a.id, metric.key, realData.get(a.id));
      return { agent: a, value: val };
    })
    .filter(
      (v): v is { agent: { id: string; name: string; color: string; verified: boolean; avatar: string }; value: number } =>
        v.value != null && v.value > 0
    );

  const hasOnchain = agents.some((a) => isDiscoveredAgentId(a.id));
  const loadingOnchain = agents.some(
    (a) => isDiscoveredAgentId(a.id) && !realData.get(a.id)
  );

  if (values.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            {metric.label}
          </span>
          <span className="text-[10px] text-muted">max {metric.max}{metric.unit}</span>
        </div>
        <div className="flex items-center justify-center h-10 text-xs text-muted/60">
          {hasOnchain && loadingOnchain ? (
            <span className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Loading real data…
            </span>
          ) : (
            "— (no real data)"
          )}
        </div>
      </div>
    );
  }

  const best = values.reduce(
    (a, b) =>
      metric.higherBetter ? (a.value > b.value ? a : b) : (a.value < b.value ? a : b),
    values[0]
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {metric.label}
        </span>
        <span className="text-[10px] text-muted">max {metric.max}{metric.unit}</span>
      </div>
      <div className="space-y-3">
        {values.map((v) => (
          <div key={v.agent.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: v.agent.color }}
                />
                <span className="text-[11px] text-foreground font-medium truncate max-w-[120px]">
                  {v.agent.name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-bold ${
                    v.agent.id === best.agent.id
                      ? "text-success"
                      : "text-foreground"
                  }`}
                >
                  {v.value}
                  {metric.unit}
                </span>
                {v.agent.id === best.agent.id && (
                  <Trophy size={10} className="text-accent" />
                )}
              </div>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(v.value / metric.max) * 100}%`,
                  backgroundColor: metric.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SparkBar({
  values,
  color,
  maxVal,
}: {
  values: number[];
  color: string;
  maxVal: number;
}) {
  const max = Math.max(maxVal, ...values);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all duration-300"
          style={{
            height: `${max > 0 ? (v / max) * 100 : 0}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

function SpeedChart({
  selectedAgents,
}: {
  selectedAgents: typeof agents;
}) {
  const data = selectedAgents
    .map((a) => speedData.find((s) => s.id === a.id))
    .filter(Boolean) as (typeof speedData)[0][];

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap((d) => d.values));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Execution Speed (7 days)
          </span>
        </div>
        <span className="text-[10px] text-muted">seconds avg</span>
      </div>
      <div className="space-y-4">
        {data.map((d) => {
          const agent = selectedAgents.find((a) => a.id === d.id)!;
          const avg = d.values.reduce((a, b) => a + b, 0) / d.values.length;
          return (
            <div key={d.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: agent.color }}
                  />
                  <span className="text-[11px] font-medium text-foreground">
                    {agent.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-foreground">
                  {avg.toFixed(2)}s
                </span>
              </div>
              <SparkBar
                values={d.values}
                color={agent.color}
                maxVal={maxVal}
              />
              <div className="flex justify-between mt-1">
                {dayLabels.map((d) => (
                  <span key={d} className="text-[8px] text-muted/50 flex-1 text-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CostChart({
  selectedAgents,
}: {
  selectedAgents: typeof agents;
}) {
  const data = selectedAgents
    .map((a) => costData.find((c) => c.id === a.id))
    .filter(Boolean) as (typeof costData)[0][];

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap((d) => d.values), 0.01);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-muted" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Cost per Task (7 days)
          </span>
        </div>
        <span className="text-[10px] text-muted">USD</span>
      </div>
      <div className="space-y-4">
        {data.map((d) => {
          const agent = selectedAgents.find((a) => a.id === d.id)!;
          const avg = d.values.reduce((a, b) => a + b, 0) / d.values.length;
          return (
            <div key={d.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: agent.color }}
                  />
                  <span className="text-[11px] font-medium text-foreground">
                    {agent.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-foreground">
                  ${avg.toFixed(3)}
                </span>
              </div>
              <SparkBar
                values={d.values}
                color={agent.color}
                maxVal={maxVal}
              />
              <div className="flex justify-between mt-1">
                {dayLabels.map((d) => (
                  <span key={d} className="text-[8px] text-muted/50 flex-1 text-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({
  selectedAgents,
  realData,
}: {
  selectedAgents: typeof agents;
  realData: Map<string, OnchainCompareView | null>;
}) {
  const ranked = useMemo(() => {
    return [...selectedAgents]
      .map((a) => {
        if (isDiscoveredAgentId(a.id)) {
          // Real onchain composite from measurable fields only (reputation +
          // health). Success rate / rating are excluded when unavailable so we
          // never fabricate a score.
          const real = realData.get(a.id);
          if (!real) {
            return {
              ...a,
              compositeScore: 0,
              isOnchain: true,
              noData: true,
            };
          }
          const rep = real.reputationScore ?? 0;
          const health = real.healthScore ?? 0;
          const score =
            (real.reputationScore != null && real.healthScore != null)
              ? rep * 0.5 + health * 0.5
              : real.reputationScore != null
                ? rep
                : real.healthScore != null
                  ? health
                  : 0;
          return {
            ...a,
            compositeScore: Math.round(score * 10) / 10,
            isOnchain: true,
            noData: real.reputationScore == null && real.healthScore == null,
          };
        }
        const composite = getCompositeScore(a.id);
        const detail = agentDetails[a.id];
        const score = composite || (detail
          ? (detail.reputation * 0.3 +
              detail.successRate * 0.3 +
              a.performance * 0.2 +
              a.uptime * 0.2)
          : a.performance);
        return {
          ...a,
          compositeScore: Math.round((score as number) * 10) / 10,
          isOnchain: false,
          noData: false,
        };
      })
      .sort((x, y) => y.compositeScore - x.compositeScore);
  }, [selectedAgents, realData]);

  const best = ranked[0];

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-accent" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Composite Ranking
          </span>
        </div>
        <span className="text-[10px] text-muted">
          30% reputation · 30% success · 20% performance · 20% uptime
        </span>
      </div>
      <div className="divide-y divide-border">
        {ranked.map((a, i) => (
          <div
            key={a.id}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors"
          >
            <span
              className={`w-6 text-sm font-bold ${
                i === 0 ? "text-accent" : "text-muted"
              }`}
            >
              {i + 1}
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold shrink-0"
              style={{
                backgroundColor: a.color + "20",
                color: a.color,
              }}
            >
              {a.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground truncate">
                  {a.name}
                </span>
                {a.verified && (
                  <Shield size={11} className="text-success shrink-0" />
                )}
                {a.id === best?.id && !a.noData && (
                  <span className="text-[9px] font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5">
                    #1
                  </span>
                )}
                {a.noData && (
                  <span className="text-[9px] font-medium text-muted/60">
                    (no real data)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted">{a.category}</span>
            </div>
            <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden hidden sm:block">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${a.noData ? 0 : a.compositeScore}%` }}
              />
            </div>
            <span className="text-sm font-bold text-foreground w-12 text-right">
              {a.noData ? "—" : a.compositeScore}
            </span>
            {!a.noData && (
              <Link
                href={`/hire?agent=${a.id}`}
                className="flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1 text-[10px] font-medium text-muted hover:text-accent hover:border-accent/20 transition-all shrink-0"
              >
                <Zap size={10} />
                Hire
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_IDS = ["sentinel-guard", "yield-oracle", "gas-optimizer"];

export default function BenchmarkPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([...DEFAULT_IDS]);

  const [onchainOptions, setOnchainOptions] = useState<
    {
      id: string;
      name: string;
      avatar: string;
      color: string;
      verified: boolean;
      category: string;
      chain: string;
    }[]
  >([]);
  const [onchainOptionsLoading, setOnchainOptionsLoading] = useState(true);
  const [preselectDone, setPreselectDone] = useState(false);

  // Load selectable onchain agents for the dropdowns + preselect one by default.
  useEffect(() => {
    let cancelled = false;
    loadOnchainOptions(24)
      .then((opts) => {
        if (cancelled) return;
        setOnchainOptions(opts);
        if (!preselectDone && opts.length > 0) {
          setSelectedIds((prev) => {
            if (prev.some(isDiscoveredAgentId)) return prev;
            return [...prev, opts[0].id].slice(0, 5);
          });
          setPreselectDone(true);
        }
      })
      .finally(() => {
        if (!cancelled) setOnchainOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Support ?agents= preselect (e.g. when navigating from Compare's results
  // or a single agent profile's "Run Benchmark"). A single id is seeded first,
  // then the default agents fill the slots so the benchmark always has ≥2.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("agents");
    if (!q) return;
    const ids = q.split(",").filter(Boolean).slice(0, 5);
    if (ids.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply ?agents= on mount
    setSelectedIds(
      [...ids, ...DEFAULT_IDS].filter(
        (id, i, arr) => arr.indexOf(id) === i
      ).slice(0, 5)
    );
    setPreselectDone(true);
  }, []);

  const realData = useOnchainCompareData(selectedIds);

  const selectedAgents = useMemo(
    () =>
      selectedIds
        .map((id) =>
          isDiscoveredAgentId(id)
            ? buildBenchmarkAgent(id, realData.data.get(id))
            : findAgent(id)
        )
        .filter(Boolean) as (AgentLike & {
          id: string;
        })[],
    [selectedIds, realData.data]
  );

  const updateAgent = (index: number, id: string) => {
    if (id === "__clear__") {
      setSelectedIds((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        next[index] = id;
        return next;
      });
    }
  };

  const addAgent = () => {
    if (selectedIds.length < 5) {
      const used = new Set(selectedIds);
      const next = agents.find((a) => !used.has(a.id));
      if (next) setSelectedIds((prev) => [...prev, next.id]);
    }
  };

  // Top agent that actually has measurable data and is therefore hireable.
  const topHireableAgentId = useMemo(() => {
    const ranked = [...selectedAgents]
      .map((a) => {
        if (isDiscoveredAgentId(a.id)) {
          const real = realData.data.get(a.id);
          const rep = real?.reputationScore ?? 0;
          const health = real?.healthScore ?? 0;
          const score =
            real && (real.reputationScore != null || real.healthScore != null)
              ? (real.reputationScore != null && real.healthScore != null
                  ? rep * 0.5 + health * 0.5
                  : real.reputationScore != null
                    ? rep
                    : health)
              : -1;
          return { id: a.id, compositeScore: Math.round(score * 10) / 10, noData: score < 0 };
        }
        const composite = getCompositeScore(a.id);
        const detail = agentDetails[a.id];
        const score = composite || (detail
          ? (detail.reputation * 0.3 + detail.successRate * 0.3 + a.performance * 0.2 + a.uptime * 0.2)
          : a.performance);
        return { id: a.id, compositeScore: Math.round((score as number) * 10) / 10, noData: false };
      })
      .filter((x) => !x.noData)
      .sort((a, b) => b.compositeScore - a.compositeScore);
    return ranked[0]?.id || "sentinel-guard";
  }, [selectedAgents, realData.data]);

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 pt-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Agent Benchmark
          </h1>
          <p className="mt-2 text-sm text-muted max-w-lg">
            Compare agent performance with onchain data where available. Metrics
            load from onchain records; demo entries are labeled sample.
          </p>
        </div>

        {/* Agent Selectors */}
        <div className="flex flex-wrap items-end gap-3 mb-8">
          {selectedIds.map((id, i) => (
            <div key={i} className="flex items-center gap-1">
              <AgentSelector
                selectedId={id}
                selectedAgent={isDiscoveredAgentId(id) ? selectedAgents.find((a) => a.id === id) : findAgent(id)}
                onSelect={(newId) => updateAgent(i, newId)}
                excludeIds={selectedIds.filter((_, j) => j !== i)}
                onchainOptions={onchainOptions}
                onchainLoading={onchainOptionsLoading}
              />
            </div>
          ))}
          {selectedIds.length < 5 && (
            <button
              onClick={addAgent}
              className="rounded-xl border border-dashed border-border bg-surface/50 px-3 py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
            >
              + Add agent
            </button>
          )}
        </div>

        {selectedAgents.length >= 2 ? (
          <>
            {/* Metric Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
              {benchmarkMetrics.map((metric) => (
                <MetricBar
                  key={metric.key}
                  agents={selectedAgents}
                  metric={metric}
                  realData={realData.data}
                />
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <SpeedChart selectedAgents={selectedAgents} />
              <CostChart selectedAgents={selectedAgents} />
            </div>

            {/* Leaderboard */}
            <Leaderboard
              selectedAgents={selectedAgents}
              realData={realData.data}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                    <Zap size={14} className="text-success" />
                  </div>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Fastest Agent
                  </span>
                </div>
                {(() => {
                  const speeds = selectedAgents
                    .map((a) => ({
                      agent: a,
                      metrics: getAgentMetrics(a.id),
                      detail: agentDetails[a.id],
                    }))
                    .filter((s) => s.detail || s.metrics);
                  const fastest = speeds.reduce(
                    (a, b) => {
                      const aTime = a.metrics?.avgExecutionTimeMs ?? (parseFloat(a.detail?.avgExecutionTime || "99") * 1000);
                      const bTime = b.metrics?.avgExecutionTimeMs ?? (parseFloat(b.detail?.avgExecutionTime || "99") * 1000);
                      return aTime < bTime ? a : b;
                    },
                    speeds[0]
                  );
                  const execTime = fastest?.metrics?.avgExecutionTime ?? fastest?.detail?.avgExecutionTime;
                  return fastest ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: fastest.agent.color + "20",
                          color: fastest.agent.color,
                        }}
                      >
                        {fastest.agent.avatar}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {fastest.agent.name}
                        </span>
                        <span className="block text-[10px] text-muted">
                          {execTime} avg
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <DollarSign size={14} className="text-accent" />
                  </div>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Lowest Cost
                  </span>
                </div>
                {(() => {
                  const costs = selectedAgents
                    .map((a) => ({
                      agent: a,
                      metrics: getAgentMetrics(a.id),
                      detail: agentDetails[a.id],
                    }))
                    .filter((s) => s.detail || s.metrics);
                  const cheapest = costs.reduce(
                    (a, b) => {
                      const parseCost = (s?: string) => {
                        if (!s || s === "Free") return 0;
                        return parseFloat(s.replace(/[$,]/g, "")) || 0;
                      };
                      const aCost = a.metrics?.avgCostUsd ?? parseCost(a.detail?.avgCost);
                      const bCost = b.metrics?.avgCostUsd ?? parseCost(b.detail?.avgCost);
                      return aCost < bCost ? a : b;
                    },
                    costs[0]
                  );
                  const avgCostVal = cheapest?.metrics?.avgCost ?? cheapest?.detail?.avgCost;
                  return cheapest ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: cheapest.agent.color + "20",
                          color: cheapest.agent.color,
                        }}
                      >
                        {cheapest.agent.avatar}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {cheapest.agent.name}
                        </span>
                        <span className="block text-[10px] text-muted">
                          {avgCostVal} avg
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <Activity size={14} className="text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Most Reliable
                  </span>
                </div>
                {(() => {
                  const reliable = [...selectedAgents]
                    .map((a) => ({
                      agent: a,
                      metrics: getAgentMetrics(a.id),
                    }))
                    .sort((a, b) => {
                      const aUptime = a.metrics?.uptime ?? 0;
                      const bUptime = b.metrics?.uptime ?? 0;
                      return bUptime - aUptime;
                    })[0];
                  return reliable ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: reliable.agent.color + "20",
                          color: reliable.agent.color,
                        }}
                      >
                        {reliable.agent.avatar}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {reliable.agent.name}
                        </span>
                        <span className="block text-[10px] text-muted">
                          {reliable.metrics?.uptime ?? reliable.agent.uptime}% uptime
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-8 rounded-xl border border-border bg-surface p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Ready to hire the winner?
                </p>
                <p className="text-xs text-muted mt-1">
                  Deploy the top-performing agent directly or view its full
                  profile.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/compare?agents=${selectedIds.filter(Boolean).join(",")}`}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  Compare Side by Side
                </Link>
                <Link
                  href={`/agents/${topHireableAgentId}`}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  View Top Agent
                  <ArrowRight size={13} />
                </Link>
                <Link
                  href={`/hire?agent=${topHireableAgentId}`}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors flex items-center gap-1.5"
                >
                  <Zap size={12} />
                  Hire Top Agent
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-16 text-center">
            <BarChart3 size={40} className="mx-auto text-muted/20 mb-4" />
            <p className="text-sm font-medium text-foreground">
              Select at least 2 agents to benchmark
            </p>
            <p className="mt-1.5 text-xs text-muted max-w-sm mx-auto">
              Choose agents above to see performance metrics, execution speed,
              cost analysis, and composite rankings.
            </p>
            <Link
              href="/discover"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
            >
              Browse agents
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
