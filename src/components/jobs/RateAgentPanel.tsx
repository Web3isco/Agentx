"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Star,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { bsc, bscTestnet } from "viem/chains";

/**
 * Rate Agent — ERC-8004 feedback entry point for completed ERC-8183 jobs.
 *
 * Only onchain agents (`onchain-{chainId}-{tokenId}`) have an ERC-8004
 * identity that can receive feedback via the Reputation Registry's
 * giveFeedback. Static marketplace agents fall back to a link to their
 * profile page.
 *
 * The giveFeedback write config uses the deployed 2.0.0 signature
 * (verified against the live registry implementation).
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
  if (!addr) return "—";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

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

export default function RateAgentPanel({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string | null;
}) {
  const parsed = parseOnchainAgentId(agentId);
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("100");
  const [tag1, setTag1] = useState("");
  const [tag2, setTag2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Static/non-onchain agent → just point to the agent's profile.
  if (!parsed) {
    return (
      <div className="mt-4 rounded-lg bg-background/30 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-muted leading-relaxed">
              Onchain feedback requires an ERC-8004 agent identity. You can still
              review this agent on its profile page.
            </p>
          </div>
          <Link
            href={`/agents/${agentId}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-colors shrink-0"
          >
            <Star size={13} />
            View Agent
          </Link>
        </div>
      </div>
    );
  }

  const chainMeta = CHAIN_META[parsed.chainId];
  const targetLabel = chainMeta?.name ?? `chain ${parsed.chainId}`;
  const onTargetChain = walletChainId === parsed.chainId;
  const canSubmit =
    isConnected && onTargetChain && !busy && !txHash;

  const runSubmit = async () => {
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

  return (
    <div className="mt-4 rounded-lg bg-background/30 p-4">
      {!txHash ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-muted leading-relaxed">
                Job completed — leave onchain feedback for{" "}
                {agentName ? (
                  <span className="text-foreground font-medium">{agentName}</span>
                ) : (
                  <span className="text-foreground font-medium font-mono">
                    #{parsed.tokenId}
                  </span>
                )}{" "}
                on the ERC-8004 Reputation Registry.
              </p>
              <p className="text-[11px] text-muted mt-1">
                Target registry: {targetLabel} · agent #{parsed.tokenId}
              </p>
            </div>
            <button
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors shrink-0"
            >
              <Star size={13} />
              {open ? "Close" : "Rate Agent"}
            </button>
          </div>

          {open && (
            <div className="mt-4 border-t border-border pt-4">
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
                    Signs a giveFeedback tx from {address ? truncateAddr(address) : "your wallet"}.
                    Cannot be your own agent (self-feedback is blocked onchain).
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-start gap-2.5">
          <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-success">
              Feedback submitted onchain
            </p>
            {chainMeta && (
              <a
                href={`${chainMeta.explorer}${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-accent hover:underline inline-flex items-center gap-1 mt-1"
              >
                {truncateAddr(txHash)}
                <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}