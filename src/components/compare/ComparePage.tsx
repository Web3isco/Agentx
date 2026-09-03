"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronDown,
  X,
  Shield,
  Star,
  ArrowRight,
  BarChart3,
  Loader2,
} from "lucide-react";
import { agents } from "@/components/discover/agents-data";
import { agentDetails } from "@/components/agent/agent-detail-data";
import { compareRows, type CompareRow } from "./compare-data";
import { getAgentMetrics } from "@/lib/agents/reputation/service";
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

/**
 * Build a display Agent for an onchain id from real 8004scan + ERC-8004 data.
 * When real data has not resolved yet, returns a neutral "Loading…" placeholder
 * so the UI never fabricates values — real data replaces it on arrival.
 */
function buildOnchainAgent(
  id: string,
  real?: OnchainCompareView | null
): AgentLike {
  const parsed = parseDiscoveredAgentId(id);
  if (!parsed) {
    return (
      findAgent(id) ?? {
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
      }
    );
  }
  const resolved = real ?? null;
  if (!resolved) {
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
    name: resolved.name,
    category: resolved.category,
    description: `Onchain agent (token ${parsed.tokenId} on chain ${parsed.chainId})`,
    avatar: resolved.avatar,
    color: resolved.color,
    verified: resolved.verified,
    status: (resolved.healthScore ?? 0) >= 80 ? "active" : "beta",
    chain: (resolved.chain === "BNB Chain" || resolved.chain === "Ethereum" || resolved.chain === "Arbitrum") ? resolved.chain as AgentLike["chain"] : "Multi-chain",
    rating: resolved.rating ?? 0,
    reviews: resolved.feedbackCount ?? 0,
    tasks: resolved.feedbackCount != null ? String(resolved.feedbackCount) : "0",
    performance: resolved.healthScore ?? 0,
    uptime: resolved.healthScore ?? 0,
    price: resolved.price ?? "Unknown",
    priceNumeric: 0,
    trend: resolved.feedbackCount != null ? `${resolved.feedbackCount} reviews` : "new",
    lastActive: "now",
    features: ["Onchain", ...resolved.protocols.map((p) => p.toUpperCase())],
    builder: "",
    deployed: resolved.createdBlockNumber != null ? `Block ${resolved.createdBlockNumber}` : "",
  };
}

/**
 * Resolve the real onchain value for a compare metric key, or "—" when the
 * metric has no honest onchain measurement. Mock agents keep their existing
 * resolution path unchanged.
 */
function getOnchainValue(
  id: string,
  key: string,
  real?: OnchainCompareView | null
): string | number {
  if (!isDiscoveredAgentId(id) || !real) return "—";
  switch (key) {
    case "reputationScore":
      return real.reputationScore ?? "—";
    case "successRate":
      return real.successRate ?? "—";
    case "completedTasks":
    case "failedTasks":
    case "avgExecutionTime":
    case "avgCost":
      return "—";
    case "performance":
      return real.healthScore ?? "—";
    case "uptime":
      return real.healthScore ?? "—";
    case "chain":
      return real.chain || "—";
    case "price":
      return real.price ?? "—";
    case "rating":
      return real.rating ?? "—";
    default:
      return "—";
  }
}

function AgentSelector({
  label,
  selectedAgent,
  onSelect,
  excludeIds,
  onchainOptions,
  onchainLoading,
}: {
  label: string;
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
      <span className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
        {label}
      </span>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:border-accent/20 transition-all"
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {selected.name}
                </span>
                {selected.verified && (
                  <Shield size={12} className="text-success shrink-0" />
                )}
              </div>
              <span className="text-xs text-muted">{selected.category}</span>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted">Select an agent</span>
        )}
        <ChevronDown
          size={16}
          className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-surface shadow-2xl py-1 max-h-64 overflow-y-auto scrollbar-none">
            {onchainLoading && available.length === 0 && onchainAvailable.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted text-center flex items-center justify-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Loading agents…
              </div>
            )}
            {onchainAvailable.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: a.color + "20",
                    color: a.color,
                  }}
                >
                  {a.avatar}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {a.name}
                    </span>
                    {a.verified && (
                      <Shield size={10} className="text-success shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted">
                    {a.category} · On-chain
                  </span>
                </div>
              </button>
            ))}
            {onchainAvailable.length > 0 && available.length > 0 && (
              <div className="px-4 py-1.5 text-[9px] font-semibold text-muted/60 uppercase tracking-wider border-t border-border">
                On-chain agents
              </div>
            )}
            {available.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor: a.color + "20",
                    color: a.color,
                  }}
                >
                  {a.avatar}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground truncate">
                      {a.name}
                    </span>
                    {a.verified && (
                      <Shield size={10} className="text-success shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted">
                    {a.category} · {a.chain}
                  </span>
                </div>
              </button>
            ))}
            {available.length === 0 && onchainAvailable.length === 0 && (
              <div className="px-4 py-3 text-xs text-muted text-center">
                All agents selected
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getAgentValue(
  agentId: string,
  key: string,
  realData: Map<string, OnchainCompareView | null>
): string | number {
  if (isDiscoveredAgentId(agentId)) {
    return getOnchainValue(agentId, key, realData.get(agentId));
  }
  const metrics = getAgentMetrics(agentId);
  const detail = agentDetails[agentId];
  const base = findAgent(agentId);

  if (metrics && key in metrics) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (metrics as any)[key] as string | number;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (detail && key in (detail as any)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (detail as any)[key] as string | number;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (base && key in (base as any)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (base as any)[key] as string | number;
  }
  return "—";
}

function getBestValue(
  agentIds: string[],
  row: CompareRow,
  realData: Map<string, OnchainCompareView | null>
): string | number | null {
  if (row.format === "text") return null;

  const values = agentIds.map((id) => ({
    id,
    raw: getAgentValue(id, row.key, realData),
  }));

  const numericValues = values
    .map((v) => ({
      ...v,
      num: typeof v.raw === "number" ? v.raw : parseFloat(String(v.raw)),
    }))
    .filter((v) => !isNaN(v.num));

  if (numericValues.length === 0) return null;

  const best = numericValues.reduce((a, b) =>
    row.higherBetter ? (a.num > b.num ? a : b) : (a.num < b.num ? a : b)
  );

  return best.id;
}

function CellValue({
  value,
  row,
  isBest,
}: {
  value: string | number;
  row: CompareRow;
  isBest: boolean;
}) {
  let display: string;

  if (value === "—") {
    display = "—";
  } else if (row.format === "percent") {
    display = `${value}%`;
  } else if (row.format === "time") {
    display = String(value);
  } else if (row.format === "cost") {
    display = String(value);
  } else if (row.format === "number" && typeof value === "number") {
    display = String(value);
  } else {
    display = String(value);
  }

  return (
    <span
      className={`text-sm font-medium ${
        value === "—"
          ? "text-muted/60"
          : isBest
            ? "text-success"
            : "text-foreground"
      }`}
    >
      {display}
      {isBest && (
        <span className="ml-1.5 text-[9px] font-bold text-success bg-success/10 rounded px-1 py-0.5">
          BEST
        </span>
      )}
    </span>
  );
}

function OnchainDetailRows({
  filledIds,
  realData,
  realLoading,
}: {
  filledIds: string[];
  realData: Map<string, OnchainCompareView | null>;
  realLoading: boolean;
}) {
  const cell = (id: string, node: ReactNode) => (
    <div
      key={id}
      className="px-4 py-3.5 flex items-center border-border last:border-r-0 text-sm"
    >
      {node}
    </div>
  );

  const label = (text: string) => (
    <div className="px-4 py-3.5 border-r border-border flex items-center">
      <span className="text-xs font-medium text-muted">{text}</span>
    </div>
  );

  const dash = <span className="text-muted/60">—</span>;

  const rows: { labelText: string; render: (id: string) => ReactNode }[] =
    [
      {
        labelText: "Health",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          const v = r.healthScore;
          if (v == null) return dash;
          return (
            <span
              className={`font-medium ${
                v >= 80 ? "text-success" : v >= 60 ? "text-amber-500" : "text-[#ef4444]"
              }`}
            >
              {v}/100 · {r.healthStatus ?? "unknown"}
            </span>
          );
        },
      },
      {
        labelText: "Feedback Count",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          return r.feedbackCount != null ? (
            <span className="font-medium text-foreground">{r.feedbackCount}</span>
          ) : (
            dash
          );
        },
      },
      {
        labelText: "Feedback Avg",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          return r.successRate != null ? (
            <span className="font-medium text-foreground">
              {r.successRate}/100
            </span>
          ) : (
            dash
          );
        },
      },
      {
        labelText: "Protocols",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          return r.protocols.length > 0 ? (
            <span className="font-medium text-foreground">
              {r.protocols.join(", ")}
            </span>
          ) : (
            dash
          );
        },
      },
      {
        labelText: "Verification",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          if (r.isEndpointVerified) {
            return (
              <span className="font-medium text-success">Verified</span>
            );
          }
          if (r.endpointVerificationError) {
            return <span className="font-medium text-[#ef4444]">Unverified</span>;
          }
          return dash;
        },
      },
      {
        labelText: "Trust Models",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          return r.trustModels.length > 0 ? (
            <span className="font-medium text-foreground">
              {r.trustModels.join(", ")}
            </span>
          ) : (
            dash
          );
        },
      },
      {
        labelText: "Validations",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          if (r.totalValidations != null) {
            return (
              <span className="font-medium text-foreground">
                {r.successfulValidations ?? r.totalValidations}/
                {r.totalValidations}
              </span>
            );
          }
          return dash;
        },
      },
      {
        labelText: "Services",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          return r.services.length > 0 ? (
            <div className="flex flex-col gap-1">
              {r.services.map((s, i) => (
                <span key={i} className="text-[11px] text-muted">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            dash
          );
        },
      },
      {
        labelText: "Stars",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          return r.starCount != null ? (
            <span className="font-medium text-foreground">{r.starCount}</span>
          ) : (
            dash
          );
        },
      },
      {
        labelText: "Created Block",
        render: (id) => {
          const r = realData.get(id);
          if (!r) return realLoading ? <LoadingCell /> : dash;
          if (!isDiscoveredAgentId(id)) return dash;
          return r.createdBlockNumber != null ? (
            <span className="font-medium text-foreground">
              {r.createdBlockNumber}
            </span>
          ) : (
            dash
          );
        },
      },
    ];

  return (
    <>
      {rows.map((row, i) => (
        <div
          key={row.labelText}
          className={`grid min-w-max ${i % 2 === 0 ? "bg-surface" : "bg-surface/50"}`}
          style={{ gridTemplateColumns: `200px repeat(${filledIds.length}, 1fr)` }}
        >
          {label(row.labelText)}
          {filledIds.map((id) => cell(id, row.render(id)))}
        </div>
      ))}
    </>
  );
}

function LoadingCell() {
  return <Loader2 size={14} className="text-muted animate-spin" />;
}

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);

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

  // Pre-select agents from ?agents= (e.g. onchain agents sent from Discover).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("agents");
    if (!q) return;
    const ids = q.split(",").filter(Boolean);
    if (ids.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL preselect must apply on mount
      setSelectedIds((prev) => {
        const next: (string | null)[] = ids.slice(0, 5);
        while (next.length < prev.length && next.length < 5) next.push(null);
        return next;
      });
    }
  }, []);

  // Load selectable onchain agents for the dropdowns.
  useEffect(() => {
    let cancelled = false;
    loadOnchainOptions(24)
      .then((opts) => {
        if (!cancelled) setOnchainOptions(opts);
      })
      .finally(() => {
        if (!cancelled) setOnchainOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filledIds = (selectedIds.filter(Boolean) as string[]).filter(
    (id) => !!agents.find((a) => a.id === id) || isDiscoveredAgentId(id)
  );

  const { data: realData, loading: realLoading } =
    useOnchainCompareData(filledIds);

  const hasOnchain = filledIds.some(isDiscoveredAgentId);

  const displayAgents = useMemo(() => {
    const map = new Map<string, AgentLike>();
    for (const id of filledIds) {
      if (isDiscoveredAgentId(id)) {
        map.set(id, buildOnchainAgent(id, realData.get(id)));
      } else {
        const a = findAgent(id);
        if (a) map.set(id, a);
      }
    }
    return map;
  }, [filledIds, realData]);

  const selectAgent = (slotIndex: number, agentId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[slotIndex] = agentId;
      return next;
    });
  };

  const removeAgent = (slotIndex: number) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  const clearAll = () => {
    setSelectedIds([null, null, null]);
  };

  const addSlot = () => {
    if (selectedIds.length < 5) {
      setSelectedIds((prev) => [...prev, null]);
    }
  };

  const removeSlot = (slotIndex: number) => {
    if (selectedIds.length > 2) {
      setSelectedIds((prev) => prev.filter((_, i) => i !== slotIndex));
    }
  };

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 pt-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Compare Agents
          </h1>
          <p className="mt-2 text-sm text-muted">
            Select 2 or more agents to compare performance, cost, and capabilities
            side by side.
          </p>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {selectedIds.map((id, i) => {
            const otherIds = selectedIds.filter((_, j) => j !== i).filter(Boolean) as string[];
            return (
              <div key={i} className="relative">
                <AgentSelector
                  label={`Agent ${i + 1}`}
                  selectedAgent={id ? displayAgents.get(id) : undefined}
                  onSelect={(agentId) => selectAgent(i, agentId)}
                  excludeIds={otherIds}
                  onchainOptions={onchainOptions}
                  onchainLoading={onchainOptionsLoading}
                />
                {id && (
                  <button
                    onClick={() => removeAgent(i)}
                    className="absolute top-8 right-10 p-1 text-muted hover:text-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {selectedIds.length < 5 && (
            <div>
              <span className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 opacity-0">
                Add
              </span>
              <button
                onClick={addSlot}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface/50 px-4 py-3.5 text-sm font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
              >
                + Add agent
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-muted">
            {filledIds.length} agent{filledIds.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              Clear All
            </button>
            {filledIds.length >= 2 && (
              <Link
                href={`/benchmark?agents=${filledIds.join(",")}`}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
              >
                <BarChart3 size={13} />
                View in Benchmark
              </Link>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        {filledIds.length >= 2 ? (
          <div className="rounded-xl border border-border bg-surface overflow-x-auto">
            {/* Table Header - Agent Cards */}
            <div className="grid min-w-max" style={{ gridTemplateColumns: `200px repeat(${filledIds.length}, 1fr)` }}>
              <div className="p-4 border-b border-r border-border bg-surface">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Metric
                </span>
              </div>
              {filledIds.map((id) => {
                const agent = displayAgents.get(id) ?? findAgent(id)!;
                return (
                  <div
                    key={id}
                    className="p-4 border-b border-border flex items-center gap-3"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: agent.color + "20",
                        color: agent.color,
                      }}
                    >
                      {agent.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {agent.name}
                        </span>
                        {agent.verified && (
                          <Shield size={11} className="text-success shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted">
                        {agent.category}
                      </span>
                    </div>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="text-[10px] text-muted hover:text-accent transition-colors shrink-0"
                    >
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Table Rows */}
            {compareRows.map((row, i) => {
              const bestId = getBestValue(filledIds, row, realData);
              return (
                <div
                  key={row.key}
                  className={`grid min-w-max ${i % 2 === 0 ? "bg-surface" : "bg-surface/50"}`}
                  style={{ gridTemplateColumns: `200px repeat(${filledIds.length}, 1fr)` }}
                >
                  <div className="px-4 py-3.5 border-r border-border flex items-center">
                    <span className="text-xs font-medium text-muted">
                      {row.label}
                    </span>
                  </div>
                  {filledIds.map((id) => {
                    const value = getAgentValue(id, row.key, realData);
                    return (
                      <div
                        key={id}
                        className="px-4 py-3.5 flex items-center border-border last:border-r-0"
                      >
                        <CellValue
                          value={value}
                          row={row}
                          isBest={bestId === id}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Onchain detail rows — shown only when an onchain agent is present */}
            {hasOnchain && (
              <OnchainDetailRows
                filledIds={filledIds}
                realData={realData}
                realLoading={realLoading}
              />
            )}

            {/* Action Row */}
            <div
              className="grid min-w-max border-t border-border"
              style={{ gridTemplateColumns: `200px repeat(${filledIds.length}, 1fr)` }}
            >
              <div className="px-4 py-4 border-r border-border flex items-center">
                <span className="text-xs font-medium text-muted">Actions</span>
              </div>
              {filledIds.map((id) => (
                <div
                  key={id}
                  className="px-4 py-4 flex items-center gap-2"
                >
                  <Link
                    href={`/agents/${id}`}
                    className="flex items-center gap-1 rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-[11px] font-medium text-muted hover:text-foreground hover:border-border transition-all"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/hire?agent=${id}`}
                    className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-black hover:bg-accent-hover transition-colors"
                  >
                    Hire
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-16 text-center">
            <BarChart3 size={40} className="mx-auto text-muted/20 mb-4" />
            <p className="text-sm font-medium text-foreground">
              Select at least 2 agents to compare
            </p>
            <p className="mt-1.5 text-xs text-muted max-w-sm mx-auto">
              Choose agents from the selectors above to see a side-by-side
              comparison of their performance, cost, and capabilities.
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

        {/* Bottom CTA */}
        {filledIds.length >= 2 && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Ready to deploy?
              </p>
              <p className="text-xs text-muted mt-1">
                Hire the best-performing agent directly or run a benchmark to
                validate results.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/benchmark?agents=${filledIds.join(",")}`}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <BarChart3 size={13} />
                Run Benchmark
              </Link>
              <Link
                href="/discover"
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors flex items-center gap-1.5"
              >
                Browse More
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
