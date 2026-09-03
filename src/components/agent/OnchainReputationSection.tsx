"use client";

import { useMemo, useState } from "react";
import {
  Star,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { bsc, bscTestnet } from "viem/chains";
import type { OnchainReputationData } from "@/lib/agents/reputation/types";
import { getOnchainAgentReputation } from "@/lib/agents/reputation/service";

/**
 * Interactive ERC-8004 onchain reputation section (profile).
 *
 * Reads real feedback via readAllFeedback / getSummary. Never fabricates —
 * zero feedback shows a clean "No reviews yet" state; unavailable fields
 * render "—". Rating reuses the giveFeedback write config and, after a
 * successful transaction, re-fetches the reputation snapshot so the new
 * review appears immediately (client-side refresh of the SSR data).
 */

function parseOnchainAgentId(
  id: string,
): { chainId: number; tokenId: number } | null {
  if (!id.startsWith("onchain-")) return null;
  const parts = id.split("-");
  if (parts.length < 3) return null;
  const chainId = parseInt(parts[1], 10);
  const tokenId = parseInt(parts[2], 10);
  if (!Number.isFinite(chainId) || !Number.isFinite(tokenId)) return null;
  return { chainId, tokenId };
}

function truncateAddr(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function formatReputationValue(value: number, decimals: number | null): string {
  if (!Number.isFinite(value)) return "—";
  if (decimals === null || decimals === 0 || Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.min(decimals, 6),
  });
}

type ScoreFilter = "all" | "positive" | "neutral" | "negative";
type TagFilter = string | null;

const SCORE_BUCKET = (v: number): Exclude<ScoreFilter, "all"> =>
  v > 50 ? "positive" : v < 50 ? "negative" : "neutral";

const CHAIN_META: Record<number, { name: string; explorer: string }> = {
  [bscTestnet.id]: {
    name: "BNB Chain (testnet)",
    explorer: "https://testnet.bscscan.com/tx/",
  },
  [bsc.id]: {
    name: "BNB Chain (mainnet)",
    explorer: "https://bscscan.com/tx/",
  },
};

export default function OnchainReputationSection({
  agentId,
  initial,
}: {
  agentId: string;
  initial: OnchainReputationData | null;
}) {
  const parsed = parseOnchainAgentId(agentId);
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();

  const [data, setData] = useState<OnchainReputationData | null>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>(null);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("100");
  const [tag1, setTag1] = useState("");
  const [tag2, setTag2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const registryAddress = data?.registryAddress ?? "";
  const version = data?.version;
  const repReadFailed =
    !!parsed && !!registryAddress && !version;

  const refresh = async () => {
    if (!parsed) return;
    setRefreshing(true);
    const next = await getOnchainAgentReputation(parsed.tokenId, parsed.chainId);
    setData(next);
    setRefreshing(false);
  };

  // Re-derive state from the fresh snapshot whenever it changes.
  const feedback = useMemo(() => data?.feedback ?? [], [data]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const f of feedback) {
      if (f.tag1) set.add(f.tag1);
      if (f.tag2) set.add(f.tag2);
    }
    return Array.from(set).sort();
  }, [feedback]);

  // Tag filter is applied only while the tag still exists in the live data.
  const activeTag = tagFilter && allTags.includes(tagFilter) ? tagFilter : null;

  const filtered = feedback.filter((f) => {
    if (scoreFilter !== "all" && SCORE_BUCKET(f.value) !== scoreFilter) return false;
    if (activeTag && f.tag1 !== activeTag && f.tag2 !== activeTag) return false;
    return true;
  });

  const chainMeta = parsed ? CHAIN_META[parsed.chainId] : undefined;
  const targetLabel = chainMeta?.name ?? (parsed ? `chain ${parsed.chainId}` : "chain");
  const onTargetChain = parsed ? walletChainId === parsed.chainId : false;
  const canSubmit =
    !!parsed && isConnected && onTargetChain && !busy && !txHash;

  const runSubmit = async () => {
    if (!parsed) return;
    try {
      setBusy(true);
      setError(null);
      const safe = Math.max(
        0,
        Math.min(100, Math.round(Number.parseFloat(value) || 0)),
      );
      const { writeContract, waitForTransactionReceipt } = await import(
        "@wagmi/core"
      );
      const { config } = await import("@/lib/web3/config");
      const { getGiveFeedbackConfig } = await import(
        "@/lib/agents/reputation/write"
      );
      const writeCfg = getGiveFeedbackConfig({
        agentId: parsed.tokenId,
        value: safe,
        valueDecimals: 0,
        tag1: tag1.trim(),
        tag2: tag2.trim(),
        chainId: parsed.chainId,
      });
      const hash = await writeContract(config, writeCfg);
      await waitForTransactionReceipt(config, { hash });
      setTxHash(hash);
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(
        msg.includes("rejected") || msg.includes("denied") || msg.includes("user")
          ? "Transaction rejected in wallet."
          : msg.includes("Self-feedback") ||
              msg.includes("ERC721NonexistentToken")
            ? "Feedback rejected on-chain (agent ownership restriction)."
            : msg.length > 200
              ? "Transaction failed. Check wallet for details."
              : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  // ── Unsupported chain ──
  if (parsed && !registryAddress) {
    return (
      <p className="text-[11px] text-muted leading-relaxed">
        Reputation registry not configured for this chain — no onchain
        reputation data available.
      </p>
    );
  }
  // ── Read failed ──
  if (parsed && repReadFailed) {
    return (
      <p className="text-[11px] text-muted leading-relaxed">
        Could not read the ERC-8004 reputation registry — reputation data
        unavailable right now.
      </p>
    );
  }
  // ── No agent id / no data ──
  if (!parsed || !data) {
    return (
      <p className="text-[11px] text-muted leading-relaxed">
        No onchain reputation data for this agent.
      </p>
    );
  }

  const hasReviews = data.count > 0;

  return (
    <div>
      {refreshing && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted mb-3">
          <Loader2 size={11} className="animate-spin" />
          Refreshing reputation…
        </p>
      )}

      {!hasReviews ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-background/30 px-4 py-6">
          <div className="flex items-start gap-2">
            <Star size={15} className="text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">No reviews yet</p>
              <p className="text-[11px] text-muted mt-0.5">
                Be the first to leave onchain feedback for this agent on the
                ERC-8004 Reputation Registry.
              </p>
            </div>
          </div>
          <RateButton
            open={open}
            onToggle={() => setOpen((o) => !o)}
            targetLabel={targetLabel}
            onTargetChain={onTargetChain}
            isConnected={isConnected}
            canSubmit={canSubmit}
            value={value}
            setValue={setValue}
            tag1={tag1}
            setTag1={setTag1}
            tag2={tag2}
            setTag2={setTag2}
            busy={busy}
            error={error}
            runSubmit={runSubmit}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="rounded-lg bg-background/30 px-3 py-2.5">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Reviews
                </span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {data.count}
                </p>
              </div>
              <div className="rounded-lg bg-background/30 px-3 py-2.5">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Average value
                </span>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {data.averageValue != null
                    ? formatReputationValue(data.averageValue, data.summaryValueDecimals)
                    : "—"}
                </p>
              </div>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={refreshing}
              className="ml-3 self-start inline-flex items-center gap-1 rounded-lg border border-border bg-background/30 px-2.5 py-1.5 text-[11px] font-medium text-muted hover:text-foreground hover:border-accent/20 transition-colors disabled:opacity-40"
              title="Refresh onchain reputation"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full mb-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
          >
            <Star size={13} />
            {open ? "Close rating" : "Rate this agent"}
          </button>

          <div>
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              Feedback
            </span>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <FilterChip
                active={scoreFilter === "all"}
                label="All"
                onClick={() => setScoreFilter("all")}
              />
              <FilterChip
                active={scoreFilter === "positive"}
                label="Positive"
                onClick={() => setScoreFilter("positive")}
              />
              <FilterChip
                active={scoreFilter === "neutral"}
                label="Neutral"
                onClick={() => setScoreFilter("neutral")}
              />
              <FilterChip
                active={scoreFilter === "negative"}
                label="Negative"
                onClick={() => setScoreFilter("negative")}
              />
              {allTags.map((t) => (
                <FilterChip
                  key={t}
                  active={tagFilter === t}
                  label={`#${t}`}
                  onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
                />
              ))}
            </div>

            {filtered.length > 0 ? (
              <div className="mt-2">
                {filtered.map((f, i) => (
                  <div key={`${f.client}-${f.feedbackIndex}`}>
                    <div className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted font-mono">
                            {truncateAddr(f.client)}
                          </span>
                          {f.isRevoked && (
                            <span className="text-[9px] font-semibold text-[#ef4444] uppercase">
                              revoked
                            </span>
                          )}
                          {(f.tag1 || f.tag2) && (
                            <span className="text-[9px] text-muted">
                              · {[f.tag1, f.tag2].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted mt-0.5">
                          Timestamp: —
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground shrink-0">
                        {formatReputationValue(f.value, f.valueDecimals)}
                      </span>
                    </div>
                    {i < filtered.length - 1 && (
                      <div className="border-b border-border" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted mt-2">
                No feedback matches this filter.
              </p>
            )}
          </div>

          {open && (
            <div className="mt-3 border-t border-border pt-3">
              {error && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2.5">
                  <AlertTriangle
                    size={13}
                    className="text-[#ef4444] shrink-0 mt-0.5"
                  />
                  <span className="text-[11px] text-[#ef4444]">{error}</span>
                </div>
              )}

              {!isConnected ? (
                <p className="text-[11px] text-muted">
                  Connect a wallet on {targetLabel} to submit feedback.
                </p>
              ) : !onTargetChain ? (
                <p className="text-[11px] text-muted">
                  Switch your wallet to {targetLabel} to submit feedback.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      Value (0–100)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/40"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Tag 1 (optional)
                      </label>
                      <input
                        value={tag1}
                        onChange={(e) => setTag1(e.target.value)}
                        maxLength={64}
                        placeholder="e.g. execution"
                        className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Tag 2 (optional)
                      </label>
                      <input
                        value={tag2}
                        onChange={(e) => setTag2(e.target.value)}
                        maxLength={64}
                        placeholder="e.g. market-swap"
                        className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/40"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => void runSubmit()}
                    disabled={!canSubmit}
                    className="w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Submitting feedback…
                      </>
                    ) : (
                      <>
                        <Star size={13} />
                        Submit Feedback onchain
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-muted">
                    Signs a giveFeedback tx from{" "}
                    {address ? truncateAddr(address) : "your wallet"}. Cannot be
                    your own agent (self-feedback is blocked onchain).
                  </p>
                </div>
              )}
            </div>
          )}

          {txHash && chainMeta && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-background/30 px-3 py-2.5">
              <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-success">
                  Feedback submitted onchain
                </p>
                <a
                  href={`${chainMeta.explorer}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1 mt-1"
                >
                  {truncateAddr(txHash)}
                  <ExternalLink size={9} />
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
        active
          ? "bg-accent text-black"
          : "bg-background/50 text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function RateButton({
  open,
  onToggle,
  targetLabel,
  onTargetChain,
  isConnected,
  canSubmit,
  value,
  setValue,
  tag1,
  setTag1,
  tag2,
  setTag2,
  busy,
  error,
  runSubmit,
}: {
  open: boolean;
  onToggle: () => void;
  targetLabel: string;
  onTargetChain: boolean;
  isConnected: boolean;
  canSubmit: boolean;
  value: string;
  setValue: (v: string) => void;
  tag1: string;
  setTag1: (v: string) => void;
  tag2: string;
  setTag2: (v: string) => void;
  busy: boolean;
  error: string | null;
  runSubmit: () => void;
}) {
  const { address } = useAccount();
  return (
    <div className="w-full">
      <button
        onClick={onToggle}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
      >
        <Star size={13} />
        {open ? "Close rating" : "Rate this agent"}
      </button>

      {open && (
        <div className="mt-3">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2.5">
              <AlertTriangle size={13} className="text-[#ef4444] shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#ef4444]">{error}</span>
            </div>
          )}

          {!isConnected ? (
            <p className="text-[11px] text-muted">
              Connect a wallet on {targetLabel} to submit feedback.
            </p>
          ) : !onTargetChain ? (
            <p className="text-[11px] text-muted">
              Switch your wallet to {targetLabel} to submit feedback.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Value (0–100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Tag 1 (optional)
                  </label>
                  <input
                    value={tag1}
                    onChange={(e) => setTag1(e.target.value)}
                    maxLength={64}
                    placeholder="e.g. execution"
                    className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Tag 2 (optional)
                  </label>
                  <input
                    value={tag2}
                    onChange={(e) => setTag2(e.target.value)}
                    maxLength={64}
                    placeholder="e.g. market-swap"
                    className="mt-1.5 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/40"
                  />
                </div>
              </div>
              <button
                onClick={() => void runSubmit()}
                disabled={!canSubmit}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Submitting feedback…
                  </>
                ) : (
                  <>
                    <Star size={13} />
                    Submit Feedback onchain
                  </>
                )}
              </button>
              <p className="text-[10px] text-muted">
                Signs a giveFeedback tx from{" "}
                {address ? truncateAddr(address) : "your wallet"}. Cannot be
                your own agent (self-feedback is blocked onchain).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
