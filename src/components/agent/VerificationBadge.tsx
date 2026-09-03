import { ShieldCheck, Clock, ShieldOff } from "lucide-react";
import { getVerificationStatus } from "@/lib/agents/verification/service";
import type { VerificationStatus } from "@/lib/agents/verification/types";

const badgeStyles: Record<
  VerificationStatus,
  {
    icon: typeof ShieldCheck;
    tooltip: string;
    iconClass: string;
    pillClass: string;
    label: string;
  }
> = {
  verified: {
    icon: ShieldCheck,
    tooltip: "ERC-8004 verified",
    iconClass: "text-success",
    pillClass: "bg-success/10 border-success/20 text-success",
    label: "Verified",
  },
  pending: {
    icon: Clock,
    tooltip: "Verification pending",
    iconClass: "text-accent",
    pillClass: "bg-accent/10 border-accent/20 text-accent",
    label: "Pending",
  },
  unverified: {
    icon: ShieldOff,
    tooltip: "Not verified",
    iconClass: "text-muted",
    pillClass: "bg-surface border-border text-muted",
    label: "Unverified",
  },
};

export function VerificationBadge({
  agentId,
  showLabel = false,
  size = "sm",
}: {
  agentId: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const status = getVerificationStatus(agentId);
  const style = badgeStyles[status];
  const Icon = style.icon;

  if (size === "sm") {
    if (!showLabel && status === "unverified") return null;
    return (
      <span
        title={style.tooltip}
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${style.pillClass}`}
      >
        <Icon size={10} className={style.iconClass} />
        {showLabel && <span>{style.label}</span>}
      </span>
    );
  }

  return (
    <span
      title={style.tooltip}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${style.pillClass}`}
    >
      <Icon size={13} className={style.iconClass} />
      {style.label}
    </span>
  );
}

export function VerificationShield({
  agentId,
  size = 14,
}: {
  agentId: string;
  size?: number;
}) {
  const status = getVerificationStatus(agentId);
  const style = badgeStyles[status];
  const Icon = style.icon;

  return (
    <span title={style.tooltip}>
      <Icon size={size} className={style.iconClass} />
    </span>
  );
}
