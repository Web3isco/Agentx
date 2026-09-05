import { Shield, CheckCircle, Lock, Eye, FileCheck, Fingerprint } from "lucide-react";

const trustFeatures = [
  {
    icon: Shield,
    title: "Onchain Verification",
    description:
      "Each agent shows its ERC-8004 identity status read from the registry. Agents without onchain records are labeled honestly rather than shown as verified.",
  },
  {
    icon: Eye,
    title: "Transparent Performance",
    description:
      "Performance is surfaced from onchain execution records where they exist. When data is unavailable, we show that instead of guessing.",
  },
  {
    icon: Lock,
    title: "Smart Contract Audits",
    description:
      "Agents that handle funds are expected to pass smart contract review. Audit status is shown per agent rather than as a global count.",
  },
  {
    icon: Fingerprint,
    title: "Identity & Reputation",
    description:
      "Builder reputation is read from onchain track records and community feedback where available. No fabricated scores.",
  },
  {
    icon: FileCheck,
    title: "Compliance Standards",
    description:
      "Transaction screening and risk classification are tracked per agent. Compliance signals come from onchain data, not estimates.",
  },
  {
    icon: CheckCircle,
    title: "Community Reviews",
    description:
      "Reviews are tied to onchain usage where detectable. We don't invent review counts or paid placements.",
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
            Verification data is read from onchain records where it exists and
            reported honestly everywhere else.
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
