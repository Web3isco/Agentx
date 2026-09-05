import { Search, Shield, Zap, BarChart3 } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Search & Discover",
    description:
      "Tell AGENTX what you need. Our search understands intent, not just keywords. Browse agents matched to your use case.",
  },
  {
    step: "02",
    icon: Shield,
    title: "Verify & Compare",
    description:
      "Agents surface their verification status, onchain data where available, and reviews. Compare side-by-side before you commit.",
  },
  {
    step: "03",
    icon: Zap,
    title: "Deploy & Run",
    description:
      "Connect your wallet and deploy the agent in one transaction. Permissions and onchain execution are explicit and transparent.",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Monitor & Optimize",
    description:
      "Track performance over time. AGENTX benchmarks agents so you can compare and adjust your stack.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            How AGENTX Works
          </h2>
          <p className="mt-3 text-muted max-w-lg">
            From search to deployment in four steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.step} className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <step.icon size={18} />
                </div>
                <span className="text-xs font-bold text-accent/60 tracking-widest">
                  {step.step}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {step.description}
              </p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-5 -right-3 w-6 h-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
