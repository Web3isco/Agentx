"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  Lock,
  Unlock,
  Zap,
  Clock,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Target,
  Activity,
  Loader2,
  ExternalLink,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { agents, type Agent } from "@/components/discover/agents-data";
import { agentDetails, type AgentDetail } from "@/components/agent/agent-detail-data";
import { getAgentVerification } from "@/lib/agents/verification/service";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { bscTestnet } from "viem/chains";
import { parseUnits } from "viem";
import {
  getCreateJobConfig,
  getSetBudgetConfig,
  getRegisterJobConfig,
  getFundConfig,
  getApproveConfig,
  getCommerceState,
  getApexConfig,
  extractJobIdFromReceipt,
  getJobIdFallback,
  checkAllowance,
} from "@/lib/integrations/erc8183";
import { saveHireRecord } from "@/lib/integrations/erc8183/hire-record";
import type { CommerceContractState } from "@/lib/integrations/erc8183";
import { enrichOnchainAgentDetail } from "@/components/agent/agent-detail-data";
import {
  resolveOnchainHireIdentity,
  isNonZeroAddress,
  type OnchainHireIdentity,
} from "@/lib/hire/onchain-provider";

const steps = [
  { id: 1, label: "Select Agent" },
  { id: 2, label: "Review" },
  { id: 3, label: "Configure" },
  { id: 4, label: "Confirm" },
];

function isOnchainId(id: string): boolean {
  return id.startsWith("onchain-");
}

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
              step < current
                ? "bg-success text-black"
                : step === current
                  ? "bg-accent text-black"
                  : "border border-border bg-surface text-muted"
            }`}
          >
            {step < current ? <Check size={14} /> : step}
          </div>
          {step < total && (
            <div
              className={`h-px w-8 sm:w-12 transition-all ${
                step < current ? "bg-success" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1({
  selectedId,
  onSelect,
  preselectStatus,
  preselectError,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  preselectStatus: "idle" | "resolving" | "ready" | "rejected";
  preselectError: string | null;
}) {
  const [onchainAgents, setOnchainAgents] = useState<Agent[]>([]);
  const [onchainLoading, setOnchainLoading] = useState(false);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [viewTab, setViewTab] = useState<"marketplace" | "onchain">("marketplace");

  useEffect(() => {
    if (viewTab !== "onchain") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data load gated by tab
    setOnchainLoading(true);
    setOnchainError(null);
    import("@/lib/discovery/service").then(({ getDiscoveredAgents }) =>
      getDiscoveredAgents(1, 50)
        .then(({ agents: fetched }) => {
          if (cancelled) return;
          setOnchainAgents(fetched);
          if (fetched.length === 0) {
            setOnchainError(
              "Couldn't load onchain agents from 8004scan. Check your connection and try again.",
            );
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOnchainAgents([]);
            setOnchainError(
              "Couldn't load onchain agents from 8004scan. Check your connection and try again.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setOnchainLoading(false);
        })
    );
    return () => { cancelled = true; };
  }, [viewTab, retryTick]);

  const displayAgents = viewTab === "marketplace" ? agents : onchainAgents;

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">Select an agent</h2>
      <p className="text-sm text-muted mb-4">
        Choose the agent you want to hire. You&apos;ll review capabilities and set
        limits before confirming.
      </p>

      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => setViewTab("marketplace")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            viewTab === "marketplace"
              ? "bg-accent text-black"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          Marketplace ({agents.length})
        </button>
        <button
          onClick={() => setViewTab("onchain")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            viewTab === "onchain"
              ? "bg-accent text-black"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          Onchain ({onchainAgents.length})
        </button>
      </div>

      {(selectedId !== null && isOnchainId(selectedId) && preselectStatus === "rejected") && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3">
          <AlertTriangle size={14} className="text-[#ef4444] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">Hire blocked for this onchain agent</p>
            <p className="text-[11px] text-muted mt-0.5">{preselectError}</p>
          </div>
        </div>
      )}
      {(selectedId !== null && isOnchainId(selectedId) && preselectStatus === "resolving") && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <Loader2 size={14} className="text-accent shrink-0 mt-0.5 animate-spin" />
          <p className="text-xs text-muted">
            Resolving the real provider address from the onchain registration…
          </p>
        </div>
      )}

      {viewTab === "onchain" && onchainLoading ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Loader2 size={32} className="mx-auto text-accent animate-spin mb-3" />
          <p className="text-sm font-medium text-foreground">Loading onchain agents...</p>
        </div>
      ) : viewTab === "onchain" && onchainError ? (
        <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-10 text-center">
          <AlertTriangle size={28} className="mx-auto text-[#ef4444] mb-3" />
          <p className="text-sm font-medium text-foreground">Live agents unavailable</p>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">{onchainError}</p>
          <button
            onClick={() => setRetryTick((t) => t + 1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayAgents.map((a) => {
            const detail = agentDetails[a.id];
            const active = selectedId === a.id;
            const isOnchain = isOnchainId(a.id);
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface hover:border-accent/20 hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: a.color + "20",
                      color: a.color,
                    }}
                  >
                    {a.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {a.name}
                      </span>
                      {a.verified && (
                        <Shield size={11} className="text-success shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted">
                      {a.category} · {a.chain}
                    </span>
                  </div>
                  {active && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent shrink-0">
                      <Check size={11} className="text-black" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted leading-relaxed line-clamp-2">
                  {a.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {a.price === "Unknown" ? "—" : a.price}
                  </span>
                  {isOnchain && a.qualityTier && (
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                      {a.qualityTier}
                    </span>
                  )}
                  {!isOnchain && detail && (
                    <div className="flex items-center gap-1">
                      <Target size={10} className="text-success" />
                      <span className="text-[10px] text-muted">
                        {detail.successRate}% success
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Step2({ agentDetail }: { agentDetail: AgentDetail | null }) {
  if (!agentDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted">
          Detailed profile not available for this agent yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">
        Review capabilities & permissions
      </h2>
      <p className="text-sm text-muted mb-6">
        Understand what {agentDetail.name} can and cannot do before deploying.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-success/10">
              <CheckCircle2 size={13} className="text-success" />
            </div>
            <span className="text-xs font-semibold text-foreground">Capabilities</span>
          </div>
          <div className="space-y-2">
            {agentDetail.capabilities.map((cap) => (
              <div
                key={cap}
                className="flex items-start gap-2.5 rounded-lg bg-background/30 px-3 py-2.5"
              >
                <Check size={12} className="text-success mt-0.5 shrink-0" />
                <span className="text-xs text-muted leading-relaxed">{cap}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10">
              <Lock size={13} className="text-accent" />
            </div>
            <span className="text-xs font-semibold text-foreground">Permissions</span>
          </div>
          <div className="space-y-2">
            {agentDetail.permissions.map((perm) => (
              <div
                key={perm.label}
                className={`flex items-start gap-3 rounded-lg px-3 py-3 ${
                  perm.granted ? "bg-success/5" : "bg-[#ef4444]/5"
                }`}
              >
                {perm.granted ? (
                  <Unlock size={13} className="text-success mt-0.5 shrink-0" />
                ) : (
                  <Lock size={13} className="text-[#ef4444] mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{perm.label}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        perm.granted ? "text-success" : "text-[#ef4444]"
                      }`}
                    >
                      {perm.granted ? "Granted" : "Denied"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">{perm.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} className="text-accent" />
          <span className="text-xs font-semibold text-foreground">Trust & Verification</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {agentDetail.trustSignals.map((signal, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-lg bg-background/30 px-3 py-2.5"
            >
              {signal.verified ? (
                <Check size={12} className="text-success mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={12} className="text-accent mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-[11px] font-medium text-foreground">{signal.title}</p>
                <p className="text-[10px] text-muted mt-0.5">{signal.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface JobConfig {
  budget: string;
  durationDays: number;
  description: string;
  providerAddress: string;
}

function Step3({
  agentId,
  agentDetail,
  config,
  onChange,
  identity,
  preselectStatus,
}: {
  agentId: string;
  agentDetail: AgentDetail | null;
  config: JobConfig;
  onChange: (c: Partial<JobConfig>) => void;
  identity: OnchainHireIdentity | null;
  preselectStatus: "idle" | "resolving" | "ready" | "rejected";
}) {
  const isOnchain = isOnchainId(agentId);
  const agent = agents.find((a) => a.id === agentId);
  const name = agentDetail?.name ?? agent?.name ?? "Agent";

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">Configure job</h2>
      <p className="text-sm text-muted mb-6">
        Set budget, duration, and job description for {name}.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={14} className="text-accent" />
              <span className="text-xs font-semibold text-foreground">Budget</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Job budget (BNB)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={config.budget}
                  onChange={(e) => onChange({ budget: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
              <div className="flex gap-2">
                {[0.1, 0.5, 1, 2].map((v) => (
                  <button
                    key={v}
                    onClick={() => onChange({ budget: String(v) })}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${
                      config.budget === String(v)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-background/50 text-muted hover:text-foreground"
                    }`}
                  >
                    {v} BNB
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-accent" />
              <span className="text-xs font-semibold text-foreground">Duration</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: 7, label: "7 days" },
                { value: 30, label: "30 days" },
                { value: 90, label: "90 days" },
                { value: 365, label: "1 year" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ durationDays: opt.value })}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all ${
                    config.durationDays === opt.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-background/50 text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-accent" />
              <span className="text-xs font-semibold text-foreground">Job Description</span>
            </div>
            <textarea
              value={config.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe what you want the agent to do..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all resize-none"
            />
          </div>

          {isOnchain && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={14} className="text-accent" />
                <span className="text-xs font-semibold text-foreground">Provider Address</span>
              </div>
              {preselectStatus === "resolving" ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background/50 px-3 py-2.5">
                  <Loader2 size={13} className="text-accent animate-spin shrink-0" />
                  <span className="text-[11px] text-muted">
                    Resolving the real provider wallet from the ERC-8004 registration…
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  readOnly
                  disabled={preselectStatus === "rejected"}
                  value={preselectStatus === "ready" && identity ? identity.providerAddress : ""}
                  placeholder="0x... (agent provider wallet address)"
                  className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted/40 outline-none transition-all read-only:opacity-90 disabled:opacity-50"
                />
              )}
              {preselectStatus === "rejected" && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#ef4444]/5 px-3 py-2">
                  <AlertTriangle size={12} className="text-[#ef4444] shrink-0 mt-0.5" />
                  <span className="text-[10px] text-muted">
                    Real provider address could not be resolved from the onchain
                    registration. Hiring is blocked until a valid address is available.
                  </span>
                </div>
              )}
              {preselectStatus === "ready" && identity && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-success/5 px-3 py-2">
                  <CheckCircle2 size={12} className="text-success shrink-0 mt-0.5" />
                  <span className="text-[10px] text-muted">
                    Locked from the ERC-8004 registration (agent wallet
                    {identity.creatorAddress ? " / creator" : ""}
                    {identity.ownerAddress ? " / owner" : ""}). The provider is
                    read-only to prevent wrong or fabricated payouts.
                  </span>
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted">
                The wallet address that will receive and execute this job. For real onchain agents, this is the verified provider from the ERC-8004 registration and cannot be edited.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-muted" />
              <span className="text-xs font-semibold text-foreground">Job Summary</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Agent</span>
                <span className="text-xs font-medium text-foreground">{name}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Budget</span>
                <span className="text-xs font-semibold text-foreground">
                  {config.budget || "0"} BNB
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Duration</span>
                <span className="text-xs font-medium text-foreground">
                  {config.durationDays} days
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Description</span>
                <span className="text-xs font-medium text-foreground text-right max-w-[200px] truncate">
                  {config.description || "—"}
                </span>
              </div>
              {isOnchain && (
                <>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Hire network</span>
                    <span className="text-xs font-medium text-foreground">BSC Testnet</span>
                  </div>
                  {identity && (
                    <>
                      <div className="border-t border-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">Agent network</span>
                        <span className="text-xs font-medium text-foreground">
                          {identity.chainId === 56 ? "BNB Chain" : `Chain ${identity.chainId}`} · token #{identity.tokenId}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {agentDetail && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                Agent Details
              </span>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Price</span>
                  <span className="text-xs font-medium text-foreground">
                    {agentDetail.price === "Unknown" ? "—" : agentDetail.price}
                  </span>
                </div>
                {agentDetail.reputation > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Reputation</span>
                    <span className="text-xs font-medium text-foreground">
                      {agentDetail.reputation}/100
                    </span>
                  </div>
                )}
                {agentDetail.successRate > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Success rate</span>
                    <span className="text-xs font-medium text-success">
                      {agentDetail.successRate}%
                    </span>
                  </div>
                )}
                {isOnchain && agentDetail.avgCost && agentDetail.avgCost !== "Unknown" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Avg cost/task</span>
                    <span className="text-xs font-medium text-foreground">
                      {agentDetail.avgCost}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type TxPhase =
  | "idle"
  | "creating"
  | "registering-policy"
  | "setting-budget"
  | "approving"
  | "funding"
  | "reading-status"
  | "success"
  | "error";

interface TxStepRecord {
  phase: TxPhase;
  txHash: string | null;
  error: string | null;
  label: string;
}

function Step4({
  agentId,
  agentDetail,
  config,
  identity,
  preselectStatus,
}: {
  agentId: string;
  agentDetail: AgentDetail | null;
  config: JobConfig;
  identity: OnchainHireIdentity | null;
  preselectStatus: "idle" | "resolving" | "ready" | "rejected";
}) {
  const isOnchain = isOnchainId(agentId);
  const agent = agents.find((a) => a.id === agentId);
  const name = agentDetail?.name ?? agent?.name ?? "Agent";

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isCorrectNetwork = chainId === bscTestnet.id;

  const [txPhase, setTxPhase] = useState<TxPhase>("idle");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [commerceState, setCommerceState] = useState<CommerceContractState | null>(null);
  const [txSteps, setTxSteps] = useState<TxStepRecord[]>([]);

  // Real onchain hires require a verified provider wallet resolved from the
  // agent's onchain registration. We never fabricate an address.
  const providerRaw = config.providerAddress.trim();
  const onchainReady =
    !isOnchain ||
    (preselectStatus === "ready" &&
      isNonZeroAddress(providerRaw) &&
      (!identity || providerRaw === identity.providerAddress));

  useEffect(() => {
    if (!isOnchain || !isCorrectNetwork) return;
    getCommerceState(bscTestnet.id).then((result) => {
      if (result.data) setCommerceState(result.data);
    });
  }, [isOnchain, isCorrectNetwork]);

  const recordStep = (phase: TxPhase, txHash: string | null, error: string | null, label: string) => {
    setTxSteps((prev) => [...prev, { phase, txHash, error, label }]);
  };

  const runLifecycle = useCallback(async () => {
    if (!isConnected || !isCorrectNetwork || !address) return;

    if (isOnchain && !onchainReady) {
      setTxError(
        "Cannot hire this onchain agent: no valid provider address could be resolved from its ERC-8004 registration. AGENTX never fabricates addresses — reselect the agent or try again later.",
      );
      setTxPhase("error");
      return;
    }

    setTxSteps([]);
    setTxError(null);
    setTxPhase("creating");

    try {
      const { writeContract, waitForTransactionReceipt } = await import("@wagmi/core");
      const { config: wagmiConfig } = await import("@/lib/web3/config");
      const apexConfig = getApexConfig(bscTestnet.id);

      // ── Step 1: createJob ──────────────────────────────
      const createParams = getCreateJobConfig(
        {
          provider: (isOnchain
            ? providerRaw
            : config.providerAddress.trim() || address) as `0x${string}`,
          evaluator: apexConfig.routerAddress as `0x${string}`,
          description: config.description,
          budgetAmount: config.budget,
          durationDays: config.durationDays,
        },
        bscTestnet.id,
      );

      const createHash = await writeContract(wagmiConfig, createParams);
      recordStep("creating", createHash, null, "Create job");

      const createReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: createHash });

      let jobId = extractJobIdFromReceipt(createReceipt.logs);
      if (jobId === null) {
        jobId = await getJobIdFallback(bscTestnet.id);
      }
      if (jobId === null) {
        throw new Error("Could not extract job ID from transaction logs.");
      }

      setCreatedJobId(String(jobId));
      setTxPhase("registering-policy");

      // ── Step 2: registerJob — bind policy on Router ───────
      // Required before fund: Router's beforeAction hook reverts
      // with PolicyNotSet if jobPolicy[jobId] == 0.
      const registerParams = getRegisterJobConfig(jobId, bscTestnet.id);
      const registerHash = await writeContract(wagmiConfig, registerParams);
      recordStep("registering-policy", registerHash, null, "Bind policy to job (Router)");

      await waitForTransactionReceipt(wagmiConfig, { hash: registerHash });
      setTxPhase("setting-budget");

      // ── Step 3: setBudget ──────────────────────────────
      const budgetParams = getSetBudgetConfig(jobId, config.budget, bscTestnet.id);
      const budgetHash = await writeContract(wagmiConfig, budgetParams);
      recordStep("setting-budget", budgetHash, null, "Set budget");

      await waitForTransactionReceipt(wagmiConfig, { hash: budgetHash });
      setTxPhase("approving");

      // ── Step 4: ERC-20 approve ─────────────────────────
      // paymentToken is a separate ERC-20 (e.g. "U" on BSC), not the commerce address
      const paymentToken = commerceState?.paymentToken ?? apexConfig.paymentTokenFallback;
      const budgetWei = parseUnits(config.budget, 18);

      const currentAllowance = await checkAllowance(
        paymentToken as `0x${string}`,
        address,
        apexConfig.commerceAddress,
        bscTestnet.id,
      );

      const needsApproval = currentAllowance === null || currentAllowance < budgetWei;
      let approveHash: `0x${string}` | null = null;

      if (needsApproval) {
        const approveParams = getApproveConfig(
          paymentToken as `0x${string}`,
          apexConfig.commerceAddress,
          budgetWei,
        );
        approveHash = await writeContract(wagmiConfig, approveParams);
        recordStep("approving", approveHash, null, "Approve ERC-20");

        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      } else {
        recordStep("approving", null, null, "Approve ERC-20 (sufficient allowance)");
      }

      setTxPhase("funding");

      // ── Step 5: fund ───────────────────────────────────
      const fundParams = getFundConfig(jobId, config.budget, bscTestnet.id);
      const fundHash = await writeContract(wagmiConfig, fundParams);
      recordStep("funding", fundHash, null, "Fund job");

      await waitForTransactionReceipt(wagmiConfig, { hash: fundHash });

      // Persist the real tx hashes so the job page can render the timeline.
      saveHireRecord({
        jobId: String(jobId),
        agentId,
        agentName: name,
        chainId: bscTestnet.id,
        hiredAt: new Date().toISOString(),
        ...(isOnchain && identity
          ? {
              agentChainId: identity.chainId,
              agentTokenId: identity.tokenId,
              providerAddress: providerRaw,
            }
          : {}),
        tx: {
          create: createHash,
          register: registerHash,
          budget: budgetHash,
          approve: approveHash,
          fund: fundHash,
        },
      });

      setTxPhase("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      const friendly =
        msg.includes("rejected") || msg.includes("denied") || msg.includes("user")
          ? "Transaction rejected in wallet."
          : msg.includes("insufficient")
            ? "Insufficient token balance."
            : msg.length > 200
              ? "Transaction failed. Check wallet for details."
              : msg;
      setTxError(friendly);
      setTxPhase("error");
    }
  }, [isOnchain, isConnected, isCorrectNetwork, address, config, onchainReady, providerRaw, identity, name, agentId, commerceState]);

  if (!isOnchain) {
    return (
      <div className="text-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Agent hired successfully
        </h2>
        <p className="text-sm text-muted max-w-md mx-auto mb-6">
          {name} has been added to your active agents. You can monitor its
          activity from the agent profile.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/agents/${agentId}`}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            View Agent Profile
          </Link>
          <Link
            href="/discover"
            className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  if (txPhase === "success") {
    return (
      <div className="text-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mx-auto mb-4">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          APEX job created &amp; funded
        </h2>
        <p className="text-sm text-muted max-w-md mx-auto mb-2">
          Job for {name} is live on BSC Testnet via APEX.
        </p>
        {createdJobId && (
          <p className="text-xs text-muted mb-1">
            Job ID: <span className="font-mono text-foreground">{createdJobId}</span>
          </p>
        )}

        <div className="rounded-xl border border-border bg-surface p-5 max-w-lg mx-auto mb-6 text-left mt-4">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
            Transaction history
          </span>
          <div className="mt-3 space-y-3">
            {txSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10 shrink-0 mt-0.5">
                  <Check size={10} className="text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground">{step.label}</span>
                    {step.error && (
                      <span className="text-[10px] font-semibold text-[#ef4444]">Failed</span>
                    )}
                  </div>
                  {step.txHash && (
                    <a
                      href={`https://testnet.bscscan.com/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-accent hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                      <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 max-w-lg mx-auto mb-6 text-left">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
            What happens next
          </span>
          <div className="mt-3 space-y-2">
            {[
              "Provider accepts and begins execution of the job",
              "Deliverable is submitted and evaluated",
              "Payment is released upon approval",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                </div>
                <span className="text-xs text-muted leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href={`/agents/${agentId}`}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            View Agent Profile
          </Link>
          {createdJobId && (
            <Link
              href={`/jobs/${createdJobId}`}
              className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink size={12} />
              Track Job
            </Link>
          )}
          <Link
            href="/discover"
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  if (txPhase === "error") {
    return (
      <div className="text-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]/10 mx-auto mb-4">
          <AlertTriangle size={32} className="text-[#ef4444]" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Transaction failed</h2>
        <p className="text-sm text-muted max-w-md mx-auto mb-4">
          {txError ?? "Something went wrong. Please try again."}
        </p>

        {txSteps.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 max-w-lg mx-auto mb-6 text-left">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              Completed steps
            </span>
            <div className="mt-3 space-y-3">
              {txSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 mt-0.5 ${
                    step.error ? "bg-[#ef4444]/10" : "bg-success/10"
                  }`}>
                    {step.error ? (
                      <AlertTriangle size={10} className="text-[#ef4444]" />
                    ) : (
                      <Check size={10} className="text-success" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-foreground">{step.label}</span>
                    {step.txHash && (
                      <a
                        href={`https://testnet.bscscan.com/tx/${step.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-accent hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setTxPhase("idle"); setTxError(null); setTxSteps([]); }}
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
          <Link
            href="/discover"
            className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors"
          >
            Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground mb-1">Confirm hire</h2>
      <p className="text-sm text-muted mb-6">
        Review everything before creating the APEX job for {name}.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold"
              style={{
                backgroundColor: (agentDetail?.color ?? agent?.color ?? "#71717a") + "20",
                color: agentDetail?.color ?? agent?.color ?? "#71717a",
              }}
            >
              {agentDetail?.avatar ?? agent?.avatar ?? "?"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-foreground">{name}</span>
                {getAgentVerification(agentId).status === "verified" && (
                  <Shield size={14} className="text-success" />
                )}
              </div>
              <span className="text-xs text-muted">
                {agentDetail?.category} · {agentDetail?.chain}
              </span>
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Budget</span>
              <p className="text-sm font-bold text-foreground mt-1">{config.budget} BNB</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Duration</span>
              <p className="text-sm font-medium text-foreground mt-1">{config.durationDays} days</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Network</span>
              <p className="text-sm font-medium text-foreground mt-1">BSC Testnet</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Protocol</span>
              <p className="text-sm font-medium text-foreground mt-1">ERC-8183 APEX</p>
            </div>
          </div>

          {isOnchain && identity && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Agent network</span>
                  <span className="text-xs font-medium text-foreground">
                    {identity.chainId === 56 ? "BNB Chain" : `Chain ${identity.chainId}`} · token #{identity.tokenId}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Provider wallet</span>
                  <span className="text-[10px] font-mono text-foreground truncate max-w-[180px]">
                    {providerRaw}
                  </span>
                </div>
              </div>
            </>
          )}

          {commerceState && (
            <>
              <div className="border-t border-border" />
              <div className="rounded-lg bg-background/50 px-3 py-2.5">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>Platform fee</span>
                  <span className="font-medium text-foreground">
                    {Number(commerceState.platformFeeBP) / 100}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted mt-1">
                  <span>Payment token</span>
                  <span className="font-mono text-foreground">
                    {commerceState.paymentToken
                      ? `${commerceState.paymentToken.slice(0, 6)}...${commerceState.paymentToken.slice(-4)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <span className="text-xs font-semibold text-foreground mb-3 block">
              What happens next
            </span>
            <div className="space-y-3">
              {[
                "APEX job is created on BSC Testnet",
                "Job budget is set and funded via ERC-20 approval",
                "Provider begins execution of the job",
                "Deliverable is submitted and evaluated",
                "Payment is released upon approval",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                  </div>
                  <span className="text-xs text-muted leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {!isConnected ? (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
              <div className="flex items-start gap-3">
                <Wallet size={16} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Connect your wallet to continue
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    You need a wallet connected to BSC Testnet to create an APEX job.
                  </p>
                </div>
              </div>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Wrong network
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    APEX jobs require BSC Testnet. Switch your wallet network.
                  </p>
                  <button
                    onClick={() => switchChain({ chainId: bscTestnet.id })}
                    className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-accent-hover transition-colors"
                  >
                    Switch to BSC Testnet
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    By creating this job, you agree to the APEX terms
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    Budget limits are enforced on-chain. You can refund if the job expires or is rejected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isOnchain && !onchainReady && txPhase === "idle" && (
            <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-[#ef4444] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">Cannot create this job yet</p>
                  <p className="text-[11px] text-muted mt-1">
                    {preselectStatus === "rejected"
                      ? "Real provider data could not be resolved for this onchain agent. Reselect the agent or try again later."
                      : "Resolving the real provider address from the onchain registration…"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={runLifecycle}
            disabled={!isConnected || !isCorrectNetwork || txPhase !== "idle" || (isOnchain && !onchainReady)}
            className="w-full rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-black hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {txPhase === "idle" ? (
              <>
                <Zap size={16} />
                Create &amp; Fund APEX Job
              </>
            ) : (
              <>
                <Loader2 size={16} className="animate-spin" />
                {txPhase === "creating" && "Creating job..."}
                {txPhase === "registering-policy" && "Binding policy to job..."}
                {txPhase === "setting-budget" && "Setting budget..."}
                {txPhase === "approving" && "Approving token spend..."}
                {txPhase === "funding" && "Funding job..."}
                {txPhase === "reading-status" && "Reading job status..."}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HirePage() {
  const [step, setStep] = useState(1);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [config, setConfig] = useState<JobConfig>({
    budget: "0.5",
    durationDays: 30,
    description: "",
    providerAddress: "",
  });
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [preselectStatus, setPreselectStatus] = useState<
    "idle" | "resolving" | "ready" | "rejected"
  >("idle");
  const [preselectError, setPreselectError] = useState<string | null>(null);
  const [onchainIdentity, setOnchainIdentity] =
    useState<OnchainHireIdentity | null>(null);

  useEffect(() => {
    if (!selectedAgentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear detail on reselect
      setAgentDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);

    if (isOnchainId(selectedAgentId)) {
      enrichOnchainAgentDetail(selectedAgentId)
        .then((d) => { if (!cancelled) setAgentDetail(d ?? null); })
        .catch(() => { if (!cancelled) setAgentDetail(null); })
        .finally(() => { if (!cancelled) setDetailLoading(false); });
    } else {
      const d = agentDetails[selectedAgentId] ?? null;
      setAgentDetail(d);
      setDetailLoading(false);
    }
    return () => { cancelled = true; };
  }, [selectedAgentId]);

  const handleSelectAgent = useCallback((id: string) => {
    setSelectedAgentId(id);
    setOnchainIdentity(null);
    setPreselectError(null);

    if (!isOnchainId(id)) {
      setPreselectStatus("ready");
      return;
    }

    setPreselectStatus("resolving");
    resolveOnchainHireIdentity(id)
      .then((identity) => {
        if (identity) {
          setOnchainIdentity(identity);
          setConfig((prev) => ({ ...prev, providerAddress: identity.providerAddress }));
          setPreselectStatus("ready");
        } else {
          setPreselectStatus("rejected");
          setPreselectError(
            "This onchain agent could not be resolved for hire (offline or missing a real provider wallet). No fabricated address will be used — reselect the agent or try again later.",
          );
        }
      })
      .catch(() => {
        setPreselectStatus("rejected");
        setPreselectError(
          "Could not resolve the onchain provider data right now. Please try again later.",
        );
      });
  }, []);

  // Support ?agent=<id> preselect (from onchain profile / compare / benchmark).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("agent")?.trim();
    if (!id) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      handleSelectAgent(id);
      setStep(2);
    });
    return () => {
      cancelled = true;
    };
  }, [handleSelectAgent]);

  const selectionReady =
    selectedAgentId === null ||
    !isOnchainId(selectedAgentId) ||
    preselectStatus === "ready";

  const canNext =
    selectionReady &&
    ((step === 1 && selectedAgentId !== null) ||
      step === 2 ||
      step === 3 ||
      step === 4);

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 pt-4">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={12} />
            Back to Discover
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Hire Agent
          </h1>
          <p className="mt-2 text-sm text-muted">
            Deploy an onchain AI agent to your wallet in 4 steps.
          </p>
        </div>

        <div className="mb-8">
          <StepIndicator current={step} total={steps.length} />
        </div>

        {selectedAgentId && isOnchainId(selectedAgentId) && preselectStatus === "rejected" && (
          <div className="mb-8 flex items-start gap-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3">
            <AlertTriangle size={14} className="text-[#ef4444] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">
                Hire blocked for this onchain agent
              </p>
              <p className="text-[11px] text-muted mt-0.5">{preselectError}</p>
            </div>
          </div>
        )}
        {selectedAgentId && isOnchainId(selectedAgentId) && preselectStatus === "resolving" && (
          <div className="mb-8 flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
            <Loader2 size={14} className="text-accent shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="text-xs font-medium text-foreground">
                Resolving this agent&apos;s real provider address
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                Verifying the ERC-8004 registration before hire can continue. No
                steps are available until it resolves.
              </p>
            </div>
          </div>
        )}

        <div className="mb-12">
          {step === 1 && (
            <Step1
              selectedId={selectedAgentId}
              onSelect={handleSelectAgent}
              preselectStatus={preselectStatus}
              preselectError={preselectError}
            />
          )}
          {step === 2 && selectedAgentId && (
            detailLoading ? (
              <div className="rounded-xl border border-border bg-surface p-12 text-center">
                <Loader2 size={32} className="mx-auto text-accent animate-spin mb-3" />
                <p className="text-sm font-medium text-foreground">Loading agent details...</p>
              </div>
            ) : (
              <>
                {isOnchainId(selectedAgentId) && !agentDetail?.onchainTrust && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
                    <AlertTriangle size={14} className="text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Live onchain data could not be loaded for this agent
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Showing a synthesized profile. The agent may be offline or
                        8004scan is unreachable — hiring stays blocked until its real
                        provider address resolves.
                      </p>
                    </div>
                  </div>
                )}
                <Step2 agentDetail={agentDetail} />
              </>
            )
          )}
          {step === 3 && selectedAgentId && (
            <Step3
              agentId={selectedAgentId}
              agentDetail={agentDetail}
              config={config}
              onChange={(c) => setConfig((prev) => ({ ...prev, ...c }))}
              identity={onchainIdentity}
              preselectStatus={preselectStatus}
            />
          )}
          {step === 4 && selectedAgentId && (
            <Step4
              agentId={selectedAgentId}
              agentDetail={agentDetail}
              config={config}
              identity={onchainIdentity}
              preselectStatus={preselectStatus}
            />
          )}
        </div>

        {step < 4 && (
          <div className="flex items-center justify-between border-t border-border pt-6">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={13} />
              Back
            </button>
            <button
              onClick={() => canNext && setStep((s) => Math.min(4, s + 1))}
              disabled={!canNext}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-xs font-semibold text-black hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === 3 ? "Review & Confirm" : "Continue"}
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
