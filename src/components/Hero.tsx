"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, Shield, Star, TrendingUp, Zap, Activity } from "lucide-react";

const suggestions = [
  "Protect my DeFi position",
  "Find the best yield",
  "Monitor my wallet",
];

const featuredAgents = [
  {
    id: "sentinel-guard",
    name: "Sentinel Guard",
    category: "Security",
    rating: 4.9,
    tasks: "12.4k",
    verified: true,
    performance: 98.7,
    avatar: "SG",
    color: "#22c55e",
    description: "Real-time portfolio monitoring and threat detection",
    chain: "BNB Chain",
  },
  {
    id: "yield-oracle",
    name: "Yield Oracle",
    category: "DeFi",
    rating: 4.8,
    tasks: "8.7k",
    verified: true,
    performance: 96.2,
    avatar: "YO",
    color: "#3b82f6",
    description: "Cross-protocol yield optimization and rebalancing",
    chain: "BNB Chain",
  },
  {
    id: "gas-optimizer",
    name: "Gas Tracker",
    category: "Analytics",
    rating: 4.7,
    tasks: "21.3k",
    verified: true,
    performance: 99.1,
    avatar: "GT",
    color: "#a855f7",
    description: "Optimal gas timing and transaction simulation",
    chain: "Multi-chain",
  },
];

export default function Hero() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    router.push(search.trim() ? `/discover?q=${encodeURIComponent(search.trim())}` : "/discover");
  };

  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      <img
        src="/for branding.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.04]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Onchain AI agents, verified and ranked
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground">
                Find the right
                <br />
                AI agent.
              </h1>
              <p className="text-lg text-muted max-w-lg leading-relaxed">
                Search, verify, compare and hire onchain AI agents built for
                real outcomes.
              </p>
            </div>

            <div className="space-y-3 max-w-lg">
              <div className="relative group">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors"
                />
                <input
                  type="text"
                  placeholder="What do you want an agent to do?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full rounded-xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent p-2 text-black hover:bg-accent-hover transition-colors"
                >
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Link
                    key={s}
                    href={`/discover?q=${encodeURIComponent(s)}`}
                    className="rounded-lg border border-border bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-border hover:bg-surface transition-all"
                  >
                    {s}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-muted">
              <div className="flex items-center gap-1.5">
                <Shield size={14} className="text-success" />
                <span>Verified agents</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-accent" />
                <span>Onchain performance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-blue-400" />
                <span>Instant deploy</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <span className="ml-2 text-xs font-medium text-muted">
                  AGENTX Marketplace
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Trending Agents
                    </span>
                    <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Activity size={12} className="text-success" />
                    <span>847 active</span>
                  </div>
                </div>

                {featuredAgents.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="group block rounded-xl border border-border bg-background/50 p-3.5 hover:border-accent/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: agent.color + "22", color: agent.color }}
                        >
                          {agent.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {agent.name}
                            </span>
                            {agent.verified && (
                              <Shield size={12} className="text-success" />
                            )}
                          </div>
                          <span className="text-xs text-muted">
                            {agent.category} · {agent.chain}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star
                            size={11}
                            className="text-accent fill-accent"
                          />
                          <span className="text-xs font-semibold text-foreground">
                            {agent.rating}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted">
                          {agent.tasks} tasks
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted leading-relaxed">
                      {agent.description}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted">
                          Performance
                        </span>
                        <span className="text-[10px] font-semibold text-success">
                          {agent.performance}%
                        </span>
                      </div>
                      <div className="h-1 w-16 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-success transition-all"
                          style={{ width: `${agent.performance}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
