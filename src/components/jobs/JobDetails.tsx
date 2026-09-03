"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  DollarSign,
  Calendar,
  Activity,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Zap,
  ScrollText,
  CheckCircle2,
  Wallet,
  Send,
  Timer,
  Coins,
  X,
} from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { bscTestnet } from "viem/chains";
import {
  getJobSummary,
  getCommerceState,
  getTokenSymbol,
  getTokenDecimals,
  getApexConfig,
  getSubmitConfig,
  getSettleConfig,
  buildExecutionDeliverable,
} from "@/lib/integrations/erc8183";
import {
  getHireRecord,
  saveExecutionRecord,
  type HireRecord,
} from "@/lib/integrations/erc8183/hire-record";
import type { ParsedJob, EscrowInfo, EvaluatorInfo, SettlementInfo } from "@/lib/integrations/erc8183";
import RateAgentPanel from "./RateAgentPanel";

const BSCSCAN_TX = "https://testnet.bscscan.com/tx/";
const BSCSCAN_ADDR = "https://testnet.bscscan.com/address/";

// ERC-8183 job status mapping (IACP.JobStatus)
const STATUS_META: Record<number, { label: string; badge: string; dot: string }> = {
  0: { label: "Open", badge: "bg-accent/10 text-accent border border-accent/20", dot: "bg-accent" },
  1: { label: "Funded", badge: "bg-success/10 text-success border border-success/20", dot: "bg-success" },
  2: { label: "Submitted", badge: "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20", dot: "bg-[#3b82f6]" },
  3: { label: "Completed", badge: "bg-success/10 text-success border border-success/20", dot: "bg-success" },
  4: { label: "Rejected", badge: "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20", dot: "bg-[#ef4444]" },
  5: { label: "Expired", badge: "bg-border/40 text-muted border border-border", dot: "bg-muted" },
};

function truncateAddr(addr: string | null): string {
  if (!addr) return "—";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "now";
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function nowMs(): number {
  return Date.now();
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0
    ? `finalize in ${h}h ${m}m`
    : `finalize in ${mm}:${ss}`;
}

export default function JobDetails({ jobId }: { jobId: number }) {
  const [job, setJob] = useState<ParsedJob | null>(null);
  const [escrow, setEscrow] = useState<EscrowInfo | null>(null);
  const [evaluator, setEvaluator] = useState<EvaluatorInfo | null>(null);
  const [settlement, setSettlement] = useState<SettlementInfo | null>(null);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number | null>(null);
  // Lazy-init from local storage: the Hire flow persists the real tx hashes
  // for this job, so the timeline can be rendered without fabrication.
  const [hireRecord] = useState<HireRecord | null>(() => getHireRecord(jobId));
  const [agentName, setAgentName] = useState<string | null>(
    () => getHireRecord(jobId)?.agentName ?? null,
  );
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [apiNote, setApiNote] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────
  const load = useCallback((mode: "initial" | "refresh" | "poll") => {
    const id = BigInt(jobId);

    return Promise.all([
      getJobSummary(id, bscTestnet.id),
      getCommerceState(bscTestnet.id),
    ])
      .then(async ([summary, state]) => {
        setContractError(null);

        if (summary.errors.length > 0) {
          setApiNote(summary.errors[0]);
        } else {
          setApiNote(null);
        }

        if (!summary.job) {
          setNotFound(true);
          setJob(null);
          setEscrow(null);
          setEvaluator(null);
          setSettlement(null);
          return;
        }

        setNotFound(false);
        setJob(summary.job);
        setEscrow(summary.escrow);
        setEvaluator(summary.evaluator);
        setSettlement(summary.settlement);

        // Payment token symbol/decimals (best-effort ERC-20 reads)
        const token = state.data?.paymentToken ?? null;
        setPaymentToken(token);
        if (token) {
          const [sym, dec] = await Promise.all([
            getTokenSymbol(token, bscTestnet.id),
            getTokenDecimals(token, bscTestnet.id),
          ]);
          setTokenSymbol(sym);
          setTokenDecimals(dec);
        }

        setLastUpdated(new Date().toISOString());
      })
      .catch(() => {
        setContractError("Unexpected error while reading the job on-chain.");
      })
      .finally(() => {
        setLoading(false);
        if (mode === "refresh") setRefreshing(false);
      });
  }, [jobId]);

  // ── Execution (provider submit + settle) ────────────────────
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [execBusy, setExecBusy] = useState<"submit" | "settle" | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [deliverableRecord, setDeliverableRecord] = useState<string | null>(
    () => hireRecord?.deliverable ?? null,
  );
  // Re-render every second while the dispute window is counting down.
  const [, setTick] = useState(0);

  const isProvider =
    !!address && !!job && job.provider.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    if (job?.status !== 2) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [job?.status]);

  const isOnCorrectChain = chainId === bscTestnet.id;
  const settleCountdown =
    settlement?.settleAtMs && settlement.settleAtMs > nowMs()
      ? Math.max(0, Math.floor((settlement.settleAtMs - nowMs()) / 1000))
      : 0;

  const runExecution = useCallback(
    async (action: "submit" | "settle") => {
      try {
        setExecBusy(action);
        setExecError(null);
        const { writeContract, waitForTransactionReceipt } = await import("@wagmi/core");
        const { config: wagmiConfig } = await import("@/lib/web3/config");

        if (action === "submit") {
          if (!job || job.status !== 1 || !isProvider) {
            throw new Error("Only the job provider can submit the deliverable.");
          }
          const { hash: deliverable, record } = buildExecutionDeliverable({
            jobId: BigInt(jobId),
            agentId: hireRecord?.agentId,
            agentName,
            provider: job.provider,
            description: job.description,
            chainId: bscTestnet.id,
          });
          setDeliverableRecord(record);

          const submitHash = await writeContract(
            wagmiConfig,
            getSubmitConfig(BigInt(jobId), deliverable, bscTestnet.id),
          );
          await waitForTransactionReceipt(wagmiConfig, { hash: submitHash });
          saveExecutionRecord(jobId, {
            deliverable,
            submit: submitHash,
            executedAt: new Date().toISOString(),
          });
        } else {
          if (!job || job.status !== 2) {
            throw new Error("Job must be in Submitted state to settle.");
          }
          const settleHash = await writeContract(
            wagmiConfig,
            getSettleConfig(BigInt(jobId), bscTestnet.id),
          );
          await waitForTransactionReceipt(wagmiConfig, { hash: settleHash });
          saveExecutionRecord(jobId, {
            settle: settleHash,
            settledAt: new Date().toISOString(),
          });
        }

        await load("refresh");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        setExecError(
          msg.includes("rejected") || msg.includes("denied") || msg.includes("user")
            ? "Transaction rejected in wallet."
            : msg.length > 200
              ? "Transaction failed. Check wallet for details."
              : msg,
        );
      } finally {
        setExecBusy(null);
      }
    },
    [isProvider, job, jobId, hireRecord, agentName, load],
  );

  // ── Created-at from the createJob tx block ──────────────────
  useEffect(() => {
    let cancelled = false;
    const record = getHireRecord(jobId);
    const createTx = record?.tx.create;
    if (!createTx) return;

    (async () => {
      try {
        const { createPublicClient, http } = await import("viem");
        const apexConfig = getApexConfig(bscTestnet.id);
        const client = createPublicClient({
          chain: bscTestnet,
          transport: http(apexConfig.rpcUrl),
        });
        const receipt = await client.getTransactionReceipt({ hash: createTx as `0x${string}` });
        const block = await client.getBlock({ blockNumber: receipt.blockNumber });
        if (!cancelled) setCreatedAt(new Date(Number(block.timestamp) * 1000).toISOString());
      } catch {
        // Best-effort only — created-at may be unavailable.
      }
    })();

    return () => { cancelled = true; };
  }, [jobId]);

  // ── Agent name resolution (best-effort, no fabrication) ──────
  useEffect(() => {
    if (agentName || !job?.provider) return;
    let cancelled = false;
    (async () => {
      try {
        const { listOnchainAgents } = await import("@/lib/discovery/client");
        const provider = job.provider.toLowerCase();
        // Job provider is usually the hiring wallet; resolving by ownerAddress
        // only returns a name if the address maps to a registered agent.
        const matches = [
          ...(await listOnchainAgents({ ownerAddress: job.provider }, true)).agents,
          ...(await listOnchainAgents({ ownerAddress: job.provider }, false)).agents,
        ];
        const found = matches.find((a) =>
          a.contractAddress.toLowerCase() === provider ||
          a.ownerAddress.toLowerCase() === provider
        );
        if (!cancelled && found?.name) {
          setAgentName(found.name);
        }
      } catch {
        // ignore — agent name stays "—"
      }
    })();
    return () => { cancelled = true; };
  }, [agentName, job]);

  // ── Initial + polling ───────────────────────────────────────
  useEffect(() => {
    void load("initial");
  }, [load]);

  const isActiveStatus = job !== null && [0, 1, 2].includes(job.status as number);
  useEffect(() => {
    if (!isActiveStatus) return;
    const id = setInterval(() => { void load("poll"); }, 20000);
    return () => clearInterval(id);
  }, [isActiveStatus, load]);

  // ── Render: loading ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="pt-20 pb-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <Loader2 size={32} className="mx-auto text-accent animate-spin mb-3" />
            <p className="text-sm font-medium text-foreground">Reading job #{jobId} on-chain…</p>
            <p className="text-xs text-muted mt-1">BSC Testnet · ERC-8183 APEX Commerce</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: job not found ───────────────────────────────────
  if (notFound) {
    return (
      <div className="pt-20 pb-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]/10 mx-auto mb-4">
              <AlertTriangle size={28} className="text-[#ef4444]" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Job #{jobId} not found</h2>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">
              The contract returned no data for this job ID on BSC Testnet. It may not exist,
              or it may have been created on a different network.
            </p>
            {apiNote && (
              <p className="text-[11px] text-muted font-mono mb-6">{apiNote}</p>
            )}
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/hire"
                className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
              >
                Hire an Agent
              </Link>
              <Link
                href="/discover"
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                Back to Discover
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: contract read error (RPC/network/wallet) ────────
  if (!job && contractError) {
    return (
      <div className="pt-20 pb-16 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]/10 mx-auto mb-4">
              <AlertTriangle size={28} className="text-[#ef4444]" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Could not read job #{jobId}</h2>
            <p className="text-sm text-muted max-w-md mx-auto mb-2">
              The RPC request failed or timed out. Check your network connection and retry.
            </p>
            {apiNote && <p className="text-[11px] text-muted font-mono mb-6">{apiNote}</p>}
            <button
              onClick={() => {
                setNotFound(false);
                setContractError(null);
                setLoading(true);
                setRefreshing(true);
                void load("refresh");
              }}
              className="rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              Retry
            </button>
            <Link
              href="/discover"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-colors"
            >
              <ArrowLeft size={13} />
              Back to Discover
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = STATUS_META[job ? (job.status as number) : 5] ?? STATUS_META[5];
  const decimals = tokenDecimals ?? 18;
  const budgetDisplay = job && job.budget > BigInt(0) ? `${formatUnits(job.budget, decimals)}` : "—";
  const tokenDisplay = tokenSymbol ?? paymentToken ?? null;

  const timelineSteps: { label: string; hash: string | null | undefined; hint: string }[] = [
    { label: "Create Job", hash: hireRecord?.tx.create ?? null, hint: "—" },
    { label: "Register Policy", hash: hireRecord?.tx.register ?? null, hint: "—" },
    { label: "Set Budget", hash: hireRecord?.tx.budget ?? null, hint: "—" },
    { label: "Approve U", hash: hireRecord?.tx.approve ?? null, hint: "No tx (sufficient allowance)" },
    { label: "Fund Job", hash: hireRecord?.tx.fund ?? null, hint: "—" },
    { label: "Submit Deliverable", hash: hireRecord?.tx.submit ?? null, hint: "Not executed yet" },
    { label: "Evaluate & Settle", hash: hireRecord?.tx.settle ?? null, hint: "Not settled yet" },
  ];

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 pt-4 flex items-center justify-between">
          <Link
            href="/hire"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={12} />
            Back to Hire
          </Link>
          <button
            onClick={() => { setRefreshing(true); void load("refresh"); }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stale-data notice: refresh/poll failed after data was already loaded */}
        {job && contractError && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3">
            <AlertTriangle size={14} className="text-[#ef4444] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Failed to refresh this job
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {contractError} Showing the last successfully loaded data.
              </p>
            </div>
            <button
              onClick={() => setContractError(null)}
              className="shrink-0 text-muted hover:text-foreground transition-colors"
              aria-label="Dismiss refresh error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Job <span className="font-mono">#{jobId}</span>
            </h1>
            {job && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${statusMeta.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap text-sm text-muted">
            <span>{agentName ?? "—"}</span>
            <span className="text-border">·</span>
            <span className="text-xs font-medium">BSC Testnet (chain 97)</span>
            {hireRecord && (
              <>
                <span className="text-border">·</span>
                <span className="text-xs">Hired via AGENTX</span>
              </>
            )}
          </div>
          {job && job.description && (
            <p className="mt-3 text-sm text-muted max-w-3xl leading-relaxed">
              {job.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {lastUpdated && (
              <span className="text-[11px] text-muted">
                Updated {relativeTime(lastUpdated)}
              </span>
            )}
            {apiNote && (
              <span className="text-[11px] text-muted font-mono">{apiNote}</span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            {
              label: "Status",
              value: job ? `${statusMeta.label}` : "—",
              icon: Activity,
              color: "#F0B90B",
            },
            {
              label: "Budget",
              value: job ? `${budgetDisplay} ${tokenDisplay ?? ""}`.trim() : "—",
              icon: DollarSign,
              color: "#22c55e",
            },
            {
              label: "Payment Token",
              value: escrow?.paymentToken ? (tokenDisplay ?? truncateAddr(escrow.paymentToken)) : "—",
              icon: Wallet,
              color: "#3b82f6",
            },
            {
              label: "Created",
              value: createdAt ? formatDate(new Date(createdAt)) : "—",
              icon: Calendar,
              color: "#a855f7",
            },
            {
              label: "Expires",
              value: job ? formatDate(job.expiredAtDate) : "—",
              icon: Clock,
              color: "#06b6d4",
            },
            {
              label: "Submitted",
              value: evaluator?.submittedAtDate
                ? formatDate(evaluator.submittedAtDate)
                : job?.status !== undefined && job.status >= 2
                  ? "—"
                  : "Not yet",
              icon: FileText,
              color: "#f97316",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
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
              <span className="text-sm font-bold text-foreground break-all">{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* On-chain details */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ScrollText size={14} className="text-accent" />
                Contract Data
              </h2>
              <div className="space-y-0">
                {[
                  { label: "Job ID", value: job ? job.id.toString() : "—", mono: true },
                  { label: "Client", value: job?.client ?? null, isAddr: true },
                  { label: "Provider", value: job?.provider ?? null, isAddr: true },
                  { label: "Evaluator", value: job?.evaluator ?? null, isAddr: true },
                  { label: "Policy", value: evaluator?.policyAddress ?? null, isAddr: true },
                  { label: "Hook", value: job?.hook ?? null, isAddr: true },
                ].map((row, i) => (
                  <div key={row.label}>
                    <div className="flex items-start justify-between gap-4 py-3">
                      <span className="text-xs text-muted shrink-0 pt-0.5">{row.label}</span>
                      {row.isAddr && row.value ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-foreground font-mono truncate">
                            {row.value}
                          </span>
                          <a
                            href={`${BSCSCAN_ADDR}${row.value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#71717a] hover:text-accent transition-colors shrink-0"
                            aria-label={`View ${row.label} on BscScan`}
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-foreground font-mono break-all text-right">
                          {row.value ?? "—"}
                        </span>
                      )}
                    </div>
                    {i < 5 && <div className="border-b border-border" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Escrow & Policy */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" />
                Escrow &amp; Policy
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    label: "Funded",
                    value: escrow ? (escrow.isFunded ? "Yes" : "No") : "—",
                    state: escrow?.isFunded ? "ok" : "idle",
                  },
                  {
                    label: "Refundable",
                    value: escrow ? (escrow.canRefund ? "Yes" : "No") : "—",
                    state: escrow?.canRefund ? "ok" : "idle",
                  },
                  {
                    label: "Settlement ready",
                    value: escrow ? (escrow.canSettle ? "Yes" : "No") : "—",
                    state: escrow?.canSettle ? "ok" : "idle",
                  },
                  {
                    label: "Disputed",
                    value: evaluator ? (evaluator.isDisputed ? "Yes" : "No") : "—",
                    state: evaluator?.isDisputed ? "warn" : "idle",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-background/30 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          item.state === "ok"
                            ? "text-success"
                            : item.state === "warn"
                              ? "text-accent"
                              : "text-foreground"
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {evaluator && evaluator.policyAddress && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-background/30 px-3 py-3">
                  <span className="text-xs text-muted">Dispute quorum</span>
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {evaluator.quorum > 0 || evaluator.rejectVotes > 0
                      ? `${evaluator.rejectVotes}/${evaluator.quorum}`
                      : "—"}
                  </span>
                </div>
              )}
              {settlement && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-background/30 px-3 py-3">
                  <span className="text-xs text-muted">Policy verdict</span>
                  <span
                    className={`text-xs font-semibold ${
                      settlement.verdict === 1
                        ? "text-success"
                        : settlement.verdict === 2
                          ? "text-[#ef4444]"
                          : "text-foreground"
                    }`}
                  >
                    {settlement.verdictLabel}
                    {settlement.verdict === 0 && settlement.submittedAt > BigInt(0)
                      ? ` · ${settlement.canSettleNow ? "ready" : "window open"}`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Execution */}
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap size={14} className="text-accent" />
                Execution
              </h2>

              {execError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2.5">
                  <AlertTriangle size={13} className="text-[#ef4444] shrink-0 mt-0.5" />
                  <span className="text-[11px] text-[#ef4444]">{execError}</span>
                </div>
              )}

              {job && job.status === 1 && (
                <div className="rounded-lg bg-background/30 p-4">
                  <p className="text-xs text-muted leading-relaxed">
                    Job is funded and waiting for the provider. The provider executes the
                    job through the bound OptimisticPolicy by submitting the deliverable
                    on-chain — this starts the dispute window before settlement.
                  </p>
                  {execBusy === "submit" ? (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                      <Loader2 size={14} className="animate-spin text-accent" />
                      Submitting deliverable…
                    </div>
                  ) : isProvider ? (
                    <button
                      onClick={() => void runExecution("submit")}
                      disabled={!isConnected || !isOnCorrectChain}
                      className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send size={13} />
                      Execute Job — submit deliverable
                    </button>
                  ) : (
                    <p className="mt-4 text-[11px] text-muted leading-relaxed">
                      Only the job provider ({truncateAddr(job.provider)}) can execute
                      this job. {isConnected ? "Switch to the provider wallet." : ""}
                    </p>
                  )}
                  {!isConnected && (
                    <p className="mt-3 text-[11px] text-muted">
                      Connect a wallet (BSC Testnet) to execute the job as the provider.
                    </p>
                  )}
                </div>
              )}

              {job && job.status === 2 && (
                <div className="rounded-lg bg-background/30 p-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Submitted at</span>
                      <span className="text-xs font-semibold text-foreground">
                        {settlement?.submittedAtDate
                          ? formatDate(settlement.submittedAtDate)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Evaluation</span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Timer size={12} className={settlement?.canSettleNow ? "text-success" : "text-accent"} />
                        {settlement?.canSettleNow
                          ? "Ready to finalize"
                          : settlement?.settleAtMs
                            ? `${formatCountdown(settleCountdown)}`
                            : "—"}
                      </span>
                    </div>
                  </div>

                  {execBusy === "settle" ? (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                      <Loader2 size={14} className="animate-spin text-accent" />
                      Finalizing settlement…
                    </div>
                  ) : settlement?.verdict === 1 ? (
                    <button
                      onClick={() => void runExecution("settle")}
                      disabled={!isConnected || !isOnCorrectChain}
                      className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Coins size={13} />
                      Finalize settlement — release payment
                    </button>
                  ) : (
                    <p className="mt-4 text-[11px] text-muted leading-relaxed">
                      Optimistic approval window open. No dispute has been raised; the
                      verdict becomes Approve and payment can be finalized when the
                      window elapses (any wallet can finalize).
                    </p>
                  )}
                </div>
              )}

              {job && job.status === 3 && (
                <div className="rounded-lg bg-background/30 p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-success">
                        Job completed — payment released
                      </p>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted">Verdict</span>
                          <span className="text-[11px] font-semibold text-success">
                            {settlement?.verdictLabel ?? "Approve"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted">Released to provider</span>
                          <span className="text-[11px] font-semibold text-foreground font-mono">
                            {settlement?.reason
                              ? `${settlement.reason.slice(0, 10)}…`
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted">Paid amount</span>
                          <span className="text-[11px] font-bold text-foreground">
                            {budgetDisplay} {tokenDisplay ?? ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted">Recipient</span>
                          <span className="text-[11px] font-mono text-foreground">
                            {truncateAddr(job.provider)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-muted leading-relaxed">
                        Funds moved from escrow to the provider. The reason hash is the
                        on-chain verdict reason ({settlement?.reason
                          ? settlement.reason.slice(0, 10)
                          : "…"}…).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {job && job.status === 3 && hireRecord?.agentId && (
                <RateAgentPanel
                  agentId={hireRecord.agentId}
                  agentName={agentName}
                />
              )}

              {job && (job.status === 4 || job.status === 5) && (
                <div className="rounded-lg bg-background/30 p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      size={15}
                      className={`shrink-0 mt-0.5 ${job.status === 4 ? "text-[#ef4444]" : "text-muted"}`}
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {job.status === 4 ? "Job rejected" : "Job expired"}
                      </p>
                      <p className="mt-2 text-[11px] text-muted leading-relaxed">
                        {job.status === 4
                          ? "The evaluator rejected the deliverable; escrowed funds were refunded to the client."
                          : "The job passed its expiry without completion; escrowed funds were refunded to the client."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {deliverableRecord && (
                <div className="mt-4">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Submitted deliverable record
                  </span>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-background/50 px-3 py-2.5 text-[10px] leading-relaxed text-muted font-mono whitespace-pre-wrap break-words">
                    {deliverableRecord}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Transaction timeline */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText size={14} className="text-accent" />
                Transaction Timeline
              </h2>
              {hireRecord ? (
                <div className="space-y-0">
                  {timelineSteps.map((step, i) => (
                    <div key={step.label}>
                      <div className="flex items-start gap-3 py-3">
                        <div className="mt-0.5 shrink-0">
                          {step.hash ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10">
                              <CheckCircle2 size={11} className="text-success" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-border/40">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-foreground">
                              {step.label}
                            </span>
                            {i < timelineSteps.length - 1 && (
                              <span className="text-[10px] text-muted">—</span>
                            )}
                          </div>
                          {step.hash ? (
                            <a
                              href={`${BSCSCAN_TX}${step.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-accent hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              {step.hash.slice(0, 10)}…{step.hash.slice(-8)}
                              <ExternalLink size={9} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted mt-0.5 block">
                              {step.hint}
                            </span>
                          )}
                        </div>
                      </div>
                      {i < timelineSteps.length - 1 && <div className="border-b border-border" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-background/30 px-3 py-4 text-center">
                  <p className="text-xs text-muted leading-relaxed">
                    No hire flow transaction history recorded for this job on this device.
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    On-chain state above reflects the live contract.
                  </p>
                </div>
              )}
            </div>

            {/* On-chain data notes */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity size={14} className="text-accent" />
                Source
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Network</span>
                  <span className="text-[11px] font-medium text-foreground">BSC Testnet · 97</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Commerce</span>
                  <a
                    href={`${BSCSCAN_ADDR}${getApexConfig(bscTestnet.id).commerceAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1"
                  >
                    {truncateAddr(getApexConfig(bscTestnet.id).commerceAddress)}
                    <ExternalLink size={9} />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Router</span>
                  <a
                    href={`${BSCSCAN_ADDR}${getApexConfig(bscTestnet.id).routerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1"
                  >
                    {truncateAddr(getApexConfig(bscTestnet.id).routerAddress)}
                    <ExternalLink size={9} />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted">Policy</span>
                  <a
                    href={`${BSCSCAN_ADDR}${getApexConfig(bscTestnet.id).policyAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1"
                  >
                    {truncateAddr(getApexConfig(bscTestnet.id).policyAddress)}
                    <ExternalLink size={9} />
                  </a>
                </div>
                {lastUpdated && (
                  <div className="flex items-center justify-between pt-1 border-t border-border mt-2">
                    <span className="text-[11px] text-muted">Read at</span>
                    <span className="text-[11px] text-muted">{relativeTime(lastUpdated)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}