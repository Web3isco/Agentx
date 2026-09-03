import Link from "next/link";
import { BarChart3, TrendingUp, Star, ArrowRight } from "lucide-react";

const benchmarkData = [
  { label: "Sentinel Guard", score: 98.7, category: "Security", change: "+2.1%" },
  { label: "Yield Oracle", score: 96.2, category: "DeFi", change: "+5.4%" },
  { label: "Gas Optimizer", score: 99.1, category: "Analytics", change: "+1.8%" },
  { label: "Portfolio Pilot", score: 94.8, category: "Portfolio", change: "+3.2%" },
  { label: "Bridge Watch", score: 97.3, category: "Cross-Chain", change: "+1.1%" },
];

export default function BenchmarkPreview() {
  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Agent Benchmarks
            </h2>
            <p className="mt-3 text-muted max-w-md">
              Real performance data, not marketing claims. Every benchmark is
              calculated from onchain execution records.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <BarChart3 size={18} className="text-accent" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    Performance Score
                  </span>
                  <p className="text-xs text-muted">
                    Composite score from task success, uptime, and speed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp size={18} className="text-success" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    Growth Trend
                  </span>
                  <p className="text-xs text-muted">
                    Week-over-week usage and performance improvement
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Star size={18} className="text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    Community Rating
                  </span>
                  <p className="text-xs text-muted">
                    Verified reviews from actual onchain usage
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Top Agents by Score
              </span>
              <span className="text-[10px] text-muted">Last 7 days</span>
            </div>
            <div className="divide-y divide-border">
              {benchmarkData.map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors"
                >
                  <span className="w-5 text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-muted bg-background/50 rounded px-1.5 py-0.5">
                        {item.category}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-foreground">
                      {item.score}
                    </span>
                    <span className="ml-1 text-[10px] font-semibold text-success">
                      {item.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3">
              <Link
                href="/benchmark"
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
              >
                View full benchmark
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
