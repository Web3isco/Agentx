"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Star,
  TrendingUp,
  Clock,
  Zap,
  GitCompare,
  Activity,
  Award,
  Target,
  DollarSign,
  FileCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Check,
} from "lucide-react";
import type { AgentDetail } from "./agent-detail-data";
import { VerificationBadge } from "./VerificationBadge";
import VerificationSection from "./VerificationSection";
import OnchainReputationSection from "./OnchainReputationSection";
import { getAgentMetrics } from "@/lib/agents/reputation/service";

const statusConfig = {
  active: { label: "Active", dot: "bg-success", text: "text-success" },
  beta: { label: "Beta", dot: "bg-accent", text: "text-accent" },
  maintenance: {
    label: "Maintenance",
    dot: "bg-[#f97316]",
    text: "text-[#f97316]",
  },
};

function isOnchainId(id: string): boolean {
  return id.startsWith("onchain-");
}

function formatStat(label: string, value: string | number): string {
  if (typeof value === "string") return value;
  if (label === "Rating") return value > 0 ? value.toFixed(1) : "—";
  if (label === "Success Rate") return value > 0 ? `${value}%` : "—";
  if (label === "Uptime") return value > 0 ? `${value}%` : "—";
  if (label === "Performance") return value > 0 ? `${value}%` : "—";
  if (label === "Reputation") return value > 0 ? `${value}/100` : "—";
  if (label === "Completed") return value > 0 ? String(value) : "—";
  if (label === "Failed") return value > 0 ? String(value) : "—";
  return String(value);
}

function truncateAddr(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentProfile({ agent }: { agent: AgentDetail }) {
  const status = statusConfig[agent.status];
  const rep = getAgentMetrics(agent.id);
  const onchain = isOnchainId(agent.id);
  const onchainTrust = agent.onchainTrust;

  const repData = agent.onchainReputation;

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 pt-4">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={12} />
            Back to Discover
          </Link>
        </div>

        {!onchain && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p>
              This is a demo agent from the marketplace preview. Its metrics,
              verification state, and activity are simulated for illustration.
              Real onchain agents load their genuine ERC-8004 data from
              8004scan instead.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl text-xl font-bold shrink-0"
              style={{
                backgroundColor: agent.color + "20",
                color: agent.color,
              }}
            >
              {agent.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {agent.name}
                </h1>
                <VerificationBadge agentId={agent.id} size="md" showLabel />
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm text-muted">{agent.category}</span>
                <span className="text-border">·</span>
                <span className="text-sm text-muted">{agent.chain}</span>
                <span className="text-border">·</span>
                <div className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  <span className={`text-xs font-medium ${status.text}`}>
                    {status.label}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
                {agent.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/compare?agents=${agent.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
            >
              <GitCompare size={14} />
              Compare
            </Link>
            <Link
              href={`/benchmark?agents=${agent.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
            >
              <Activity size={14} />
              Run Benchmark
            </Link>
            {onchain && !agent.onchainTrust ? (
              <span
                title="This onchain agent is offline — hire is unavailable until its real onchain data resolves."
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted cursor-not-allowed"
              >
                <Zap size={14} />
                Hire Unavailable
              </span>
            ) : (
              <Link
                href={onchain ? `/hire?agent=${agent.id}` : "/hire"}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-accent-hover transition-colors"
              >
                <Zap size={14} />
                Hire Agent
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-10">
          {[
            {
              label: "Reputation",
              value: rep?.reputationScore ?? agent.reputation,
              icon: Award,
              color: "#F0B90B",
            },
            {
              label: "Success Rate",
              value: rep?.successRate ?? agent.successRate,
              icon: Target,
              color: "#22c55e",
            },
            {
              label: "Completed",
              value: rep
                ? rep.completedTasks.toLocaleString()
                : agent.completedTasks,
              icon: FileCheck,
              color: "#3b82f6",
            },
            {
              label: "Failed",
              value: rep ? rep.failedTasks : 0,
              icon: AlertTriangle,
              color: "#ef4444",
            },
            {
              label: "Avg Execution",
              value: rep?.avgExecutionTime ?? agent.avgExecutionTime,
              icon: Clock,
              color: "#a855f7",
            },
            {
              label: "Avg Cost",
              value: rep?.avgCost ?? agent.avgCost,
              icon: DollarSign,
              color: "#06b6d4",
            },
            {
              label: "Performance",
              value: rep?.performance ?? agent.performance,
              icon: TrendingUp,
              color: "#22c55e",
            },
          ].map((stat) => {
            const display = formatStat(stat.label, stat.value);
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: stat.color + "15" }}
                  >
                    <stat.icon size={13} style={{ color: stat.color }} />
                  </div>
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  {display}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* About */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                About this agent
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {agent.longDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {agent.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-background/50 px-2.5 py-1 text-xs font-medium text-muted"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Onchain Reputation (ERC-8004) */}
            {onchain && (
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Award size={14} className="text-accent" />
                    Onchain Reputation
                  </h2>
                  {repData?.version && (
                    <span className="text-[10px] text-muted font-mono">
                      ERC-8004 · v{repData.version}
                    </span>
                  )}
                </div>

                {onchain && repData && (
                  <OnchainReputationSection agentId={agent.id} initial={repData} />
                )}

                {!repData && (
                  <p className="text-[11px] text-muted leading-relaxed">
                    No onchain reputation data for this agent.
                  </p>
                )}

                {onchainTrust?.reputationBreakdown && (
                  <div className="mt-5 border-t border-border pt-4">
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      8004scan score breakdown
                    </span>
                    <div className="mt-3 space-y-2.5">
                      {[
                        ["Quality", onchainTrust.reputationBreakdown.quality],
                        ["Popularity", onchainTrust.reputationBreakdown.popularity],
                        ["Activity", onchainTrust.reputationBreakdown.activity],
                        ["Wallet", onchainTrust.reputationBreakdown.wallet],
                        ["Freshness", onchainTrust.reputationBreakdown.freshness],
                        ["Metadata", onchainTrust.reputationBreakdown.metadataCompleteness],
                      ]
                        .filter(([, v]) => v != null)
                        .map(([label, val]) => (
                          <div key={label as string}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted">{label as string}</span>
                              <span className="text-[11px] font-semibold text-foreground">
                                {Math.round(val as number)}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${Math.min(100, val as number)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                    {onchainTrust.reputationBreakdown.leaderboard && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[
                          ["Integrity", onchainTrust.reputationBreakdown.leaderboard.integrityTier],
                          ["Evidence", onchainTrust.reputationBreakdown.leaderboard.evidenceTier],
                          ["Discoverability", onchainTrust.reputationBreakdown.leaderboard.discoverabilityTier],
                        ]
                          .filter(([, v]) => v)
                          .map(([label, v]) => (
                            <span
                              key={label as string}
                              className="rounded-md bg-background/50 px-2 py-0.5 text-[10px] text-muted"
                            >
                              {label}: {v}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Capabilities */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Capabilities
              </h2>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {agent.capabilities.map((cap) => {
                  const isHealthy = /\bhealthy\b/.test(cap);
                  const isDegraded = /\bdegraded\b/.test(cap);
                  const isUnhealthy = /\bunhealthy\b/.test(cap);
                  const dotColor = isHealthy
                    ? "text-success"
                    : isDegraded
                    ? "text-accent"
                    : isUnhealthy
                    ? "text-[#ef4444]"
                    : "text-success";
                  return (
                    <div
                      key={cap}
                      className="flex items-start gap-2.5 rounded-lg bg-background/30 px-3 py-2.5"
                    >
                      <Check size={13} className={`${dotColor} mt-0.5 shrink-0`} />
                      <span className="text-xs text-muted leading-relaxed">
                        {cap}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Supported Protocols */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Supported Protocols
              </h2>
              <div className="flex flex-wrap gap-2">
                {agent.supportedProtocols.map((proto) => (
                  <div
                    key={proto.name}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/30 px-3 py-2"
                  >
                    <span className="text-sm">{proto.logo}</span>
                    <span className="text-xs font-medium text-foreground">
                      {proto.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Permissions
              </h2>
              <div className="space-y-2.5">
                {agent.permissions.map((perm) => (
                  <div
                    key={perm.label}
                    className="flex items-start gap-3 rounded-lg bg-background/30 px-3 py-3"
                  >
                    {perm.granted ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-success/10 shrink-0 mt-0.5">
                        <Unlock size={12} className="text-success" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ef4444]/10 shrink-0 mt-0.5">
                        <Lock size={12} className="text-[#ef4444]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {perm.label}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            perm.granted ? "text-success" : "text-[#ef4444]"
                          }`}
                        >
                          {perm.granted ? "Granted" : "Denied"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        {perm.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Recent Activity
              </h2>
              <div className="space-y-0">
                {agent.recentActivity.map((activity, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-3 py-3">
                      <div className="mt-0.5 shrink-0">
                        {activity.status === "success" && (
                          <div className="h-2 w-2 rounded-full bg-success" />
                        )}
                        {activity.status === "failed" && (
                          <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
                        )}
                        {activity.status === "pending" && (
                          <div className="h-2 w-2 rounded-full bg-accent" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground leading-relaxed">
                          {activity.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted">
                            {activity.timestamp}
                          </span>
                          {activity.txHash && (
                            <span className="text-[10px] text-muted font-mono">
                              tx: {activity.txHash}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {i < agent.recentActivity.length - 1 && (
                      <div className="border-b border-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Verification */}
            <VerificationSection agentId={agent.id} />

            {/* Quick Info */}
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Price</span>
                <span className="text-sm font-semibold text-foreground">
                  {agent.price === "Unknown" ? "—" : agent.price}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Rating</span>
                <div className="flex items-center gap-1">
                  {agent.rating > 0 ? (
                    <>
                      <Star size={12} className="text-accent fill-accent" />
                      <span className="text-sm font-semibold text-foreground">
                        {agent.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted">({agent.reviews})</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted">No reviews</span>
                  )}
                </div>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{onchain ? "Health" : "Uptime"}</span>
                <span className="text-sm font-semibold text-success">
                  {agent.uptime > 0 ? `${agent.uptime}%` : "—"}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Builder</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {agent.builder}
                  </span>
                  {agent.builderVerified && (
                    <Shield size={11} className="text-success" />
                  )}
                </div>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Deployed</span>
                <span className="text-sm text-foreground">{agent.deployed}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Contract</span>
                <span className={`text-sm font-mono ${agent.contractAddress ? "text-foreground" : "text-muted"}`}>
                  {agent.contractAddress ? (
                    agent.contractAddress
                  ) : (
                    "Not onchain registered"
                  )}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Last active</span>
                <span className="text-sm text-foreground">{agent.lastActive}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Trend</span>
                <span className="text-sm font-semibold text-success">
                  {agent.trend}
                </span>
              </div>
            </div>

            {/* Service Endpoints */}
            {onchain && agent.endpoints && agent.endpoints.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-accent" />
                  Service Endpoints
                </h3>
                <div className="space-y-2.5">
                  {agent.endpoints.map((ep) => {
                    const statusColor =
                      ep.status === "healthy"
                        ? "bg-success"
                        : ep.status === "degraded"
                        ? "bg-accent"
                        : "bg-[#ef4444]";
                    const statusText =
                      ep.status === "healthy"
                        ? "text-success"
                        : ep.status === "degraded"
                        ? "text-accent"
                        : "text-[#ef4444]";
                    return (
                      <div key={ep.name} className="rounded-lg bg-background/30 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                            <span className="text-xs font-semibold text-foreground">
                              {ep.name}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold uppercase ${statusText}`}>
                            {ep.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted font-mono truncate max-w-[160px]">
                            {ep.domain}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            {ep.domainVerified && (
                              <span className="flex items-center gap-0.5 text-[10px] font-medium text-success">
                                <Check size={10} /> verified
                              </span>
                            )}
                            {ep.tools !== undefined && (
                              <span className="text-[10px] text-muted">
                                {ep.tools} tool{ep.tools !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Registration & Trust */}
            {onchain && onchainTrust && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award size={14} className="text-accent" />
                  Registration & Trust
                </h3>
                <div className="space-y-4">
                  {onchainTrust.supportedTrustModels.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Trust models
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {onchainTrust.supportedTrustModels.map((m) => (
                          <span
                            key={m}
                            className="rounded-md bg-background/50 px-2 py-1 text-[11px] font-medium text-foreground"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {onchainTrust.totalValidations != null && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Validations</span>
                      <span className="text-sm font-semibold text-foreground">
                        {onchainTrust.successfulValidations != null
                          ? `${onchainTrust.successfulValidations} / ${onchainTrust.totalValidations}`
                          : `${onchainTrust.totalValidations}`}
                      </span>
                    </div>
                  )}
                  {onchainTrust.createdBlockNumber != null && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Creation block</span>
                      <span className="text-sm text-foreground font-mono">
                        {onchainTrust.createdBlockNumber}
                      </span>
                    </div>
                  )}
                  {onchainTrust.createdTxHash && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Creation tx</span>
                      <span className="text-sm text-foreground font-mono">
                        {truncateAddr(onchainTrust.createdTxHash)}
                      </span>
                    </div>
                  )}
                  {onchainTrust.agentWallet && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Agent wallet</span>
                      <span className="text-sm text-foreground font-mono">
                        {truncateAddr(onchainTrust.agentWallet)}
                      </span>
                    </div>
                  )}
                  {onchainTrust.creatorAddress && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Creator</span>
                      <span className="text-sm text-foreground font-mono">
                        {truncateAddr(onchainTrust.creatorAddress)}
                      </span>
                    </div>
                  )}
                  {onchainTrust.ownerCertifiedName && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Certified owner</span>
                      <span className="text-sm font-medium text-foreground">
                        {onchainTrust.ownerCertifiedName}
                      </span>
                    </div>
                  )}
                  {onchainTrust.ownerPublisherTier && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Publisher tier</span>
                      <span className="text-sm font-medium text-foreground">
                        {onchainTrust.ownerPublisherTier}
                      </span>
                    </div>
                  )}
                  {onchainTrust.starCount != null && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Stars</span>
                      <span className="text-sm font-semibold text-foreground">
                        {onchainTrust.starCount}
                      </span>
                    </div>
                  )}
                  {onchainTrust.watchCount != null && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Watches</span>
                      <span className="text-sm font-semibold text-foreground">
                        {onchainTrust.watchCount}
                      </span>
                    </div>
                  )}
                  {onchainTrust.endpointVerifiedAt && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Endpoint verified</span>
                      <span className="text-sm font-medium text-success">
                        {new Date(onchainTrust.endpointVerifiedAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {onchainTrust.endpointVerifiedDomain && (
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">Verified domain</span>
                      <span className="text-sm text-foreground font-mono truncate max-w-[180px]">
                        {onchainTrust.endpointVerifiedDomain}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Why Trust This Agent */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield size={14} className="text-accent" />
                Why trust this agent?
              </h3>
              <div className="space-y-3">
                {agent.trustSignals.map((signal, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-background/30 p-3"
                  >
                    <div className="flex items-start gap-2">
                      {signal.verified ? (
                        <Check
                          size={13}
                          className="text-success mt-0.5 shrink-0"
                        />
                      ) : (
                        <AlertTriangle
                          size={13}
                          className="text-accent mt-0.5 shrink-0"
                        />
                      )}
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {signal.title}
                        </p>
                        <p className="text-[11px] text-muted mt-1 leading-relaxed">
                          {signal.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Bar */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {onchain ? "8004scan Metrics" : "Performance"}
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                      Success Rate
                    </span>
                    <span className="text-xs font-bold text-success">
                      {agent.successRate > 0 ? `${agent.successRate}%` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${agent.successRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                      {onchain ? "Endpoint Health" : "Uptime"}
                    </span>
                    <span className="text-xs font-bold text-accent">
                      {agent.uptime > 0 ? `${agent.uptime}%` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${agent.uptime}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                      {onchain ? "Quality Score" : "Performance Score"}
                    </span>
                    <span className="text-xs font-bold text-[#3b82f6]">
                      {agent.performance > 0 ? `${agent.performance}%` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#3b82f6]"
                      style={{ width: `${agent.performance}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
