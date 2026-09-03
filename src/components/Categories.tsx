import Link from "next/link";
import { Shield, TrendingUp, Search, Zap, BarChart3, Wallet, Lock, Layers } from "lucide-react";

const categories = [
  {
    name: "Security & Monitoring",
    description: "Protect wallets, detect threats, monitor positions",
    agents: 124,
    icon: Shield,
    color: "#22c55e",
    filter: "Security",
  },
  {
    name: "DeFi Optimization",
    description: "Yield farming, liquidity management, rebalancing",
    agents: 89,
    icon: TrendingUp,
    color: "#3b82f6",
    filter: "DeFi",
  },
  {
    name: "Analytics & Research",
    description: "Market analysis, onchain data, sentiment tracking",
    agents: 156,
    icon: BarChart3,
    color: "#a855f7",
    filter: "Analytics",
  },
  {
    name: "Portfolio Management",
    description: "Automated strategies, risk assessment, reporting",
    agents: 67,
    icon: Wallet,
    color: "#f97316",
    filter: "Portfolio",
  },
  {
    name: "Trading Execution",
    description: "MEV protection, limit orders, DCA automation",
    agents: 93,
    icon: Zap,
    color: "#06b6d4",
    filter: "Trading",
  },
  {
    name: "Compliance & Audit",
    description: "Transaction screening, regulatory checks, logging",
    agents: 41,
    icon: Lock,
    color: "#ec4899",
    filter: "Compliance",
  },
  {
    name: "Cross-Chain Operations",
    description: "Bridge monitoring, multi-chain portfolio views",
    agents: 78,
    icon: Layers,
    color: "#8b5cf6",
    filter: "Cross-Chain",
  },
  {
    name: "Search & Discovery",
    description: "Agent finding, comparison, recommendation engines",
    agents: 52,
    icon: Search,
    color: "#14b8a6",
  },
];

export default function Categories() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Marketplace Categories
          </h2>
          <p className="mt-3 text-muted max-w-lg">
            Browse agents organized by what they do. Every agent is verified onchain
            before listing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.filter ? `/discover?category=${encodeURIComponent(cat.filter)}` : "/discover"}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-accent/20 hover:bg-surface-hover transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: cat.color + "15" }}
                >
                  <cat.icon size={18} style={{ color: cat.color }} />
                </div>
                <span className="text-xs font-medium text-muted bg-background/50 rounded-md px-2 py-1">
                  {cat.agents} agents
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                {cat.name}
              </h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
