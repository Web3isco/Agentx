"use client";

import Link from "next/link";
import { Star, ExternalLink, GitCompare, Zap, Activity, MessageSquare } from "lucide-react";
import type { Agent } from "./agents-data";
import { VerificationBadge } from "@/components/agent/VerificationBadge";

function isOnchainId(id: string): boolean {
  return id.startsWith("onchain-");
}

interface AgentCardProps {
  agent: Agent;
  compareSelected: boolean;
  onToggleCompare: (id: string) => void;
}

const tierConfig: Record<string, { label: string; bg: string; text: string }> = {
  premium: { label: "Premium", bg: "bg-accent/15", text: "text-accent" },
  quality: { label: "Quality", bg: "bg-success/15", text: "text-success" },
  basic: { label: "Basic", bg: "bg-border/50", text: "text-muted" },
  unclassified: { label: "New", bg: "bg-border/30", text: "text-muted/70" },
};

function formatScore(score: number | undefined): string {
  if (score === undefined || score === null) return "—";
  return score >= 100 ? score.toFixed(0) : score.toFixed(1);
}

function formatHealth(health: number | null | undefined): { label: string; color: string } {
  if (health === undefined || health === null) return { label: "—", color: "text-muted" };
  if (health >= 80) return { label: `${health.toFixed(0)}%`, color: "text-success" };
  if (health >= 50) return { label: `${health.toFixed(0)}%`, color: "text-accent" };
  return { label: `${health.toFixed(0)}%`, color: "text-[#ef4444]" };
}

function formatFeedback(count: number | undefined): string {
  if (count === undefined || count === null) return "—";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export default function AgentCard({
  agent,
  compareSelected,
  onToggleCompare,
}: AgentCardProps) {
  const isOnchain = isOnchainId(agent.id);
  const tier = agent.qualityTier ?? (isOnchain ? "unclassified" : undefined);
  const tierInfo = tier ? tierConfig[tier] : null;
  const health = formatHealth(agent.healthScore);
  const protocols = agent.protocols ?? [];
  const score = agent.score ?? (isOnchain ? undefined : agent.performance);
  const feedbackCount = agent.feedbackCount ?? (isOnchain ? undefined : agent.reviews);
  const rank = agent.rank;

  return (
    <div className="group rounded-xl border border-border bg-surface p-5 hover:border-accent/20 hover:bg-surface-hover transition-all flex flex-col">
      {/* Row 1: Avatar + Name + Tier + Score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold shrink-0"
            style={{
              backgroundColor: agent.color + "20",
              color: agent.color,
            }}
          >
            {agent.avatar}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">
                {agent.name}
              </span>
              <VerificationBadge agentId={agent.id} size="sm" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted">{agent.category}</span>
              <span className="text-[10px] text-border">·</span>
              <span className="text-xs text-muted">{agent.chain}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {tierInfo && (
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${tierInfo.bg} ${tierInfo.text}`}>
              {tierInfo.label}
            </span>
          )}
          {isOnchain && score !== undefined && (
            <div className="flex items-center gap-1">
              <Star size={10} className="text-accent fill-accent" />
              <span className="text-xs font-semibold text-foreground">{formatScore(score)}</span>
            </div>
          )}
          {!isOnchain && agent.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={10} className="text-accent fill-accent" />
              <span className="text-xs font-semibold text-foreground">{agent.rating.toFixed(1)}</span>
              <span className="text-[10px] text-muted">({agent.reviews})</span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-xs text-muted leading-relaxed line-clamp-2">
        {agent.description}
      </p>

      {/* Row 2: Protocols */}
      {protocols.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {protocols.map((p) => (
            <span
              key={p}
              className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent"
            >
              {p.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* Row 3: Health + Feedback + Rank */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        <div className="flex items-center gap-1">
          <Activity size={11} className={health.color} />
          <span className={health.color}>{health.label}</span>
          <span className="text-muted/60">health</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare size={11} />
          <span>{formatFeedback(feedbackCount)}</span>
          <span className="text-muted/60">feedback</span>
        </div>
        {rank !== null && rank !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-muted/60">rank</span>
            <span className="font-semibold text-foreground">#{rank.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Row 4: Score bar (onchain only) */}
      {isOnchain && score !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-muted">Score</span>
          <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-accent">{formatScore(score)}</span>
        </div>
      )}

      {/* Row 5: Price + Actions */}
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {agent.price === "Unknown" ? "—" : agent.price}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => onToggleCompare(agent.id)}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
            compareSelected
              ? "border-accent bg-accent/10 text-accent"
              : "border-border bg-background/50 text-muted hover:text-foreground hover:border-border"
          }`}
        >
          <GitCompare size={11} />
          Compare
        </button>
        <Link
          href={`/agents/${agent.id}`}
          className="flex items-center gap-1 rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-[11px] font-medium text-muted hover:text-foreground hover:border-border transition-all"
        >
          <ExternalLink size={11} />
          View
        </Link>
        <Link
          href={`/hire?agent=${agent.id}`}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-black hover:bg-accent-hover transition-colors"
        >
          <Zap size={11} />
          Hire
        </Link>
      </div>
    </div>
  );
}
