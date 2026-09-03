"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getBscAgents } from "@/lib/discovery/client";

export default function FinalCTA() {
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBscAgents(1, 1)
      .then(({ total }) => {
        if (!cancelled && typeof total === "number" && total > 0) {
          setAgentCount(total);
        }
      })
      .catch(() => {
        /* leave stats hidden rather than show fabricated values */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-20 sm:py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-surface p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ready to find your agent?
          </h2>
          <p className="mt-3 text-muted max-w-md mx-auto">
            Deploy verified onchain AI agents through AGENTX.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/discover"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-black hover:bg-accent-hover transition-colors flex items-center gap-2"
            >
              Explore Marketplace
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/benchmark"
              className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
            >
              View Benchmark
            </Link>
          </div>
          {agentCount !== null && (
            <div className="mt-8 flex items-center justify-center gap-8 text-xs text-muted">
              <span>{agentCount.toLocaleString()} onchain agents on BNB Chain</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
