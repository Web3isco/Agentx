import { ShieldCheck, Hash, Calendar } from "lucide-react";
import { getAgentVerification } from "@/lib/agents/verification/service";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateAddr(addr: string): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      {value}
    </div>
  );
}

export default function VerificationSection({
  agentId,
}: {
  agentId: string;
}) {
  const v = getAgentVerification(agentId);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <ShieldCheck size={14} className="text-accent" />
        ERC-8004 Verification
      </h3>

      <div className="space-y-3">
        <Row
          label="Status"
          value={
            <span
              className={`text-xs font-semibold ${
                v.status === "verified"
                  ? "text-success"
                  : v.status === "pending"
                    ? "text-accent"
                    : "text-muted"
              }`}
            >
              {v.status === "verified" && "Verified"}
              {v.status === "pending" && "Pending"}
              {v.status === "unverified" && "Unverified"}
            </span>
          }
        />

        {v.status === "verified" && (
          <>
            <Row
              label="Token ID"
              value={
                <span className="text-xs font-mono text-foreground">
                  #{v.erc8004.tokenId}
                </span>
              }
            />
            <Row
              label="Issued"
              value={
                <span className="text-xs text-foreground">
                  {formatDate(v.erc8004.issuedAt!)}
                </span>
              }
            />
            <Row
              label="Expires"
              value={
                <span className="text-xs text-foreground">
                  {formatDate(v.erc8004.expiresAt!)}
                </span>
              }
            />
            <Row
              label="Chain"
              value={
                <span className="text-xs text-foreground">
                  {v.identity.chainName}
                </span>
              }
            />
            <Row
              label="Trust Score"
              value={
                <span className="text-xs font-semibold text-success">
                  {v.trustScore}/100
                </span>
              }
            />
            <Row
              label="Contract"
              value={
                <span className="text-xs font-mono text-foreground">
                  {truncateAddr(v.identity.contractAddress)}
                </span>
              }
            />
          </>
        )}

        {v.status === "pending" && (
          <div className="rounded-lg bg-accent/5 border border-accent/10 px-3 py-2.5">
            <p className="text-[11px] text-accent leading-relaxed">
              ERC-8004 verification is in progress. The agent has submitted
              its onchain identity for review.
            </p>
          </div>
        )}

        {v.status === "unverified" && (
          <div className="rounded-lg bg-background/30 border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted leading-relaxed">
              This agent has not completed ERC-8004 onchain verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
