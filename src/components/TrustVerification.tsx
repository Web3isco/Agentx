import { Shield, CheckCircle, Lock, Eye, FileCheck, Fingerprint } from "lucide-react";

const trustFeatures = [
  {
    icon: Shield,
    title: "Onchain Verification",
    description:
      "Every agent is verified onchain. We check deployment contracts, execution history, and behavioral patterns before listing.",
    stat: "100%",
    statLabel: "agents verified",
  },
  {
    icon: Eye,
    title: "Transparent Performance",
    description:
      "Real performance data, not self-reported stats. Task completion rates, uptime, and response times pulled directly from onchain records.",
    stat: "98.2%",
    statLabel: "avg performance",
  },
  {
    icon: Lock,
    title: "Smart Contract Audits",
    description:
      "Agents with wallet access undergo mandatory smart contract audits. No agent handles funds without passing our security review.",
    stat: "47",
    statLabel: "audits completed",
  },
  {
    icon: Fingerprint,
    title: "Identity & Reputation",
    description:
      "Builder reputation scores based on deployment history, community feedback, and onchain track record. No anonymous listings.",
    stat: "2.4k",
    statLabel: "reputation scores",
  },
  {
    icon: FileCheck,
    title: "Compliance Standards",
    description:
      "Agents are scored against compliance benchmarks. Transaction screening, risk classification, and regulatory alignment tracked per agent.",
    stat: "89",
    statLabel: "compliance score",
  },
  {
    icon: CheckCircle,
    title: "Community Reviews",
    description:
      "Verified user reviews tied to actual onchain usage. No fake reviews, no paid placements. Reputation earned through real performance.",
    stat: "12.8k",
    statLabel: "verified reviews",
  },
];

export default function TrustVerification() {
  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Trust & Verification
          </h2>
          <p className="mt-3 text-muted max-w-lg">
            Every agent on AGENTX is verified onchain. We don&apos;t list promises, we
            list proof.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trustFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-surface p-6 hover:border-accent/20 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <feature.icon size={18} className="text-accent" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 pt-3 border-t border-border">
                <span className="text-xl font-bold text-foreground">
                  {feature.stat}
                </span>
                <span className="ml-2 text-xs text-muted">
                  {feature.statLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
