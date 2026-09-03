import Link from "next/link";
import { Star, Shield, TrendingUp, ArrowRight, Clock } from "lucide-react";

const trending = [
  {
    id: "sentinel-guard",
    name: "Sentinel Guard",
    category: "Security",
    rating: 4.9,
    reviews: 342,
    tasks: "12.4k",
    verified: true,
    description: "Real-time portfolio monitoring and threat detection across DeFi protocols",
    performance: 98.7,
    uptime: 99.99,
    avatar: "SG",
    color: "#22c55e",
    price: "0.5 BNB/mo",
    trend: "+18%",
  },
  {
    id: "yield-oracle",
    name: "Yield Oracle",
    category: "DeFi",
    rating: 4.8,
    reviews: 287,
    tasks: "8.7k",
    verified: true,
    description: "Cross-protocol yield optimization with automated rebalancing strategies",
    performance: 96.2,
    uptime: 99.95,
    avatar: "YO",
    color: "#3b82f6",
    price: "1.2 BNB/mo",
    trend: "+24%",
  },
  {
    id: "gas-optimizer",
    name: "Gas Optimizer",
    category: "Analytics",
    rating: 4.7,
    reviews: 521,
    tasks: "21.3k",
    verified: true,
    description: "Optimal gas timing, transaction simulation and batch execution",
    performance: 99.1,
    uptime: 99.98,
    avatar: "GO",
    color: "#a855f7",
    price: "Free",
    trend: "+31%",
  },
  {
    id: "portfolio-pilot",
    name: "Portfolio Pilot",
    category: "Portfolio",
    rating: 4.6,
    reviews: 198,
    tasks: "5.2k",
    verified: true,
    description: "Automated portfolio management with risk-adjusted allocation strategies",
    performance: 94.8,
    uptime: 99.92,
    avatar: "PP",
    color: "#f97316",
    price: "0.8 BNB/mo",
    trend: "+12%",
  },
  {
    id: "bridge-watch",
    name: "Bridge Watch",
    category: "Cross-Chain",
    rating: 4.5,
    reviews: 156,
    tasks: "3.8k",
    verified: true,
    description: "Cross-chain bridge monitoring, fee comparison and optimal routing",
    performance: 97.3,
    uptime: 99.88,
    avatar: "BW",
    color: "#06b6d4",
    price: "0.3 BNB/mo",
    trend: "+9%",
  },
  {
    id: "sentinel-pro",
    name: "Sentinel Pro",
    category: "Security",
    rating: 4.9,
    reviews: 412,
    tasks: "15.6k",
    verified: true,
    description: "Advanced threat intelligence with real-time alerting and auto-revoke",
    performance: 99.4,
    uptime: 99.99,
    avatar: "SP",
    color: "#22c55e",
    price: "2.0 BNB/mo",
    trend: "+42%",
  },
];

export default function TrendingAgents() {
  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Trending Agents
            </h2>
            <p className="mt-3 text-muted">
              Most deployed agents this week, ranked by performance and usage
            </p>
          </div>
          <Link
            href="/discover"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trending.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="group block rounded-xl border border-border bg-surface p-5 hover:border-accent/20 hover:bg-surface-hover transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{
                      backgroundColor: agent.color + "20",
                      color: agent.color,
                    }}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {agent.name}
                      </span>
                      {agent.verified && (
                        <Shield size={12} className="text-success" />
                      )}
                    </div>
                    <span className="text-xs text-muted">{agent.category}</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-success">
                  {agent.trend}
                </span>
              </div>

              <p className="mt-3 text-xs text-muted leading-relaxed">
                {agent.description}
              </p>

              <div className="mt-4 flex items-center gap-4 text-xs text-muted">
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-accent fill-accent" />
                  <span className="font-semibold text-foreground">
                    {agent.rating}
                  </span>
                  <span>({agent.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={11} />
                  <span>{agent.tasks} tasks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={11} />
                  <span>{agent.uptime}%</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm font-semibold text-foreground">
                  {agent.price}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted">Performance</span>
                  <span className="text-xs font-semibold text-success">
                    {agent.performance}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 sm:hidden text-center">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            View all agents
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
