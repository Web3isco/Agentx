"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  GitCompare,
  ChevronDown,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { agents, categories, type Agent, type QualityTier } from "./agents-data";
import AgentCard from "./AgentCard";
import { getCatalogAgents, getDiscoveredAgents } from "@/lib/discovery/service";

const qualityTiers: { value: QualityTier | "All"; label: string }[] = [
  { value: "All", label: "All Tiers" },
  { value: "premium", label: "Premium" },
  { value: "quality", label: "Quality" },
  { value: "basic", label: "Basic" },
  { value: "unclassified", label: "New" },
];

const protocolOptions = ["All", "MCP", "A2A", "OASF", "Web", "Email"];

const healthOptions = [
  { value: "All", label: "Any Health" },
  { value: "healthy", label: "Healthy (≥80)" },
  { value: "degraded", label: "Degraded (<80)" },
];

const sortOptions = [
  { value: "score", label: "Score" },
  { value: "health", label: "Health" },
  { value: "feedback", label: "Feedback" },
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
];

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted hover:border-accent/20 hover:text-foreground transition-all"
      >
        <span className="text-[10px] uppercase tracking-wider text-muted/60">
          {label}
        </span>
        <span className="text-foreground">{selected?.label || value}</span>
        <ChevronDown
          size={12}
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border bg-surface shadow-xl py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                  value === opt.value
                    ? "text-accent bg-accent/5"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
        active
          ? "bg-accent text-black"
          : "border border-border bg-background/50 text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function hasProtocol(agent: Agent, protocol: string): boolean {
  const lower = protocol.toLowerCase();
  if (agent.protocols) {
    return agent.protocols.some((p) => p.toLowerCase() === lower);
  }
  return agent.features.some((f) => f.toLowerCase() === lower);
}

function getHealthStatus(agent: Agent): "healthy" | "degraded" | "unknown" {
  if (agent.healthScore === undefined || agent.healthScore === null) return "unknown";
  return agent.healthScore >= 80 ? "healthy" : "degraded";
}

export default function DiscoverPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("score");
  const [filterTier, setFilterTier] = useState<QualityTier | "All">("All");
  const [filterProtocol, setFilterProtocol] = useState("All");
  const [filterHealth, setFilterHealth] = useState("All");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"marketplace" | "onchain">("marketplace");
  const [marketplaceAgents, setMarketplaceAgents] = useState<Agent[]>(agents);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [initialOnchain, setInitialOnchain] = useState<Agent[]>([]);
  const [searchOnchainResults, setSearchOnchainResults] = useState<Agent[] | null>(null);
  const [onchainLoading, setOnchainLoading] = useState(false);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [onchainTotal, setOnchainTotal] = useState(0);
  const [onchainPage, setOnchainPage] = useState(1);
  const [onchainHasMore, setOnchainHasMore] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-select search + category from URL (?q= and ?category=, e.g. from Home).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL preselect must apply on mount
      setSearch(q);
    }
    const cat = params.get("category");
    if (cat && categories.includes(cat)) {
      setActiveCategory(cat);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Curated real-BSC catalog is the primary marketplace source; the 18 mock
    // agents are the fallback when the catalog gateway is unavailable.
    getCatalogAgents(agents, 56)
      .then(({ agents: fetched }) => {
        if (!cancelled && fetched.length > 0) {
          setMarketplaceAgents(fetched);
          setCatalogUnavailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogUnavailable(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (viewMode !== "onchain") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load gated by tab
    setOnchainLoading(true);
    setOnchainError(null);
    getDiscoveredAgents(1, 100)
      .then(({ agents: fetched, total, hasMore }) => {
        if (cancelled) return;
        setInitialOnchain(fetched);
        setOnchainTotal(total);
        setOnchainPage(1);
        setOnchainHasMore(hasMore);
      })
      .catch(() => {
        if (!cancelled) {
          setInitialOnchain([]);
          setOnchainError("Failed to load onchain agents");
        }
      })
      .finally(() => {
        if (!cancelled) setOnchainLoading(false);
      });
    return () => { cancelled = true; };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "onchain" || !search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setOnchainLoading(true);
      setOnchainError(null);
      getDiscoveredAgents(1, 100, search)
        .then(({ agents: fetched, total, hasMore }) => {
          setSearchOnchainResults(fetched);
          setOnchainTotal(total);
          setOnchainPage(1);
          setOnchainHasMore(hasMore);
        })
        .catch(() => {
          setSearchOnchainResults([]);
          setOnchainError("Search failed");
        })
        .finally(() => setOnchainLoading(false));
    }, 500);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search, viewMode]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    let result = [...marketplaceAgents];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.builder.toLowerCase().includes(q) ||
          a.features.some((f: string) => f.toLowerCase().includes(q))
      );
    }

    if (activeCategory !== "All") {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (filterTier !== "All") {
      result = result.filter((a) => a.qualityTier === filterTier);
    }

    if (filterProtocol !== "All") {
      result = result.filter((a) => hasProtocol(a, filterProtocol));
    }

    if (filterHealth !== "All") {
      result = result.filter((a) => getHealthStatus(a) === filterHealth);
    }

    switch (sortBy) {
      case "score":
        result.sort((a, b) => (b.score ?? b.performance) - (a.score ?? a.performance));
        break;
      case "health":
        result.sort((a, b) => (b.healthScore ?? b.uptime) - (a.healthScore ?? a.uptime));
        break;
      case "feedback":
        result.sort((a, b) => (b.feedbackCount ?? b.reviews) - (a.feedbackCount ?? a.reviews));
        break;
      case "newest":
        result.sort(
          (a, b) => new Date(b.deployed).getTime() - new Date(a.deployed).getTime(),
        );
        break;
      default:
        break;
    }

    return result;
  }, [marketplaceAgents, search, activeCategory, sortBy, filterTier, filterProtocol, filterHealth]);

  const filteredOnchain = useMemo(() => {
    const source = searchOnchainResults ?? initialOnchain;
    let result = [...source];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.builder.toLowerCase().includes(q) ||
          a.features.some((f: string) => f.toLowerCase().includes(q))
      );
    }

    if (activeCategory !== "All") {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (filterTier !== "All") {
      result = result.filter((a) => a.qualityTier === filterTier);
    }

    if (filterProtocol !== "All") {
      result = result.filter((a) => hasProtocol(a, filterProtocol));
    }

    if (filterHealth !== "All") {
      result = result.filter((a) => getHealthStatus(a) === filterHealth);
    }

    switch (sortBy) {
      case "score":
        result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        break;
      case "health":
        result.sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0));
        break;
      case "feedback":
        result.sort((a, b) => (b.feedbackCount ?? 0) - (a.feedbackCount ?? 0));
        break;
      case "newest":
        result.sort(
          (a, b) => new Date(b.deployed).getTime() - new Date(a.deployed).getTime(),
        );
        break;
      default:
        break;
    }

    return result;
  }, [initialOnchain, searchOnchainResults, search, activeCategory, sortBy, filterTier, filterProtocol, filterHealth]);

  const activeAgents = viewMode === "marketplace" ? filtered : filteredOnchain;
  const onchainSource = searchOnchainResults ?? initialOnchain;
  const compareAgents = (viewMode === "marketplace" ? marketplaceAgents : onchainSource).filter(
    (a) => compareIds.includes(a.id)
  );

  const hasActiveFilters = filterTier !== "All" || filterProtocol !== "All" || filterHealth !== "All";

  return (
    <div className="pt-20 pb-12 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Discover Agents
              </h1>
              <p className="mt-2 text-sm text-muted">
                {viewMode === "marketplace"
                  ? `${filtered.length} curated demo agents across ${categories.length - 1} categories`
                  : `${onchainTotal.toLocaleString()} onchain agents from 8004scan.io`}
              </p>
            </div>
            <div className="flex items-center rounded-xl border border-border bg-surface p-0.5 shrink-0">
              <button
                onClick={() => { setViewMode("marketplace"); setCompareIds([]); setSearchOnchainResults(null); setOnchainError(null); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "marketplace"
                    ? "bg-accent text-black"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Marketplace
              </button>
              <button
                onClick={() => { setViewMode("onchain"); setCompareIds([]); setSearchOnchainResults(null); setOnchainError(null); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  viewMode === "onchain"
                    ? "bg-accent text-black"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <LinkIcon size={12} />
                Onchain
              </button>
            </div>
          </div>
        </div>

        {/* Catalog unavailable notice */}
        {catalogUnavailable && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <p>
              The 8004scan agent catalog is temporarily unreachable. Showing a
              marketplace preview while we reconnect.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative group max-w-xl">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors"
            />
            <input
              type="text"
              placeholder={
                viewMode === "marketplace"
                  ? "Search agents by name, category, builder or feature..."
                  : "Search onchain agents by name or description..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-accent text-black"
                    : "border border-border bg-surface text-muted hover:text-foreground hover:border-accent/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar: Filters + Sort */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                showFilters || hasActiveFilters
                  ? "border-accent/50 bg-accent/5 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground hover:border-accent/20"
              }`}
            >
              <SlidersHorizontal size={13} />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>
            {filterTier !== "All" && (
              <button
                onClick={() => setFilterTier("All")}
                className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[11px] font-medium text-accent"
              >
                {qualityTiers.find((t) => t.value === filterTier)?.label}
                <X size={10} />
              </button>
            )}
            {filterProtocol !== "All" && (
              <button
                onClick={() => setFilterProtocol("All")}
                className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[11px] font-medium text-accent"
              >
                {filterProtocol}
                <X size={10} />
              </button>
            )}
            {filterHealth !== "All" && (
              <button
                onClick={() => setFilterHealth("All")}
                className="flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[11px] font-medium text-accent"
              >
                {filterHealth === "healthy" ? "Healthy" : "Degraded"}
                <X size={10} />
              </button>
            )}
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterTier("All"); setFilterProtocol("All"); setFilterHealth("All"); }}
                className="text-[11px] text-muted hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <Dropdown
            label="Sort"
            value={sortBy}
            options={sortOptions}
            onChange={setSortBy}
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                Quality Tier
              </label>
              <div className="flex flex-wrap gap-1.5">
                {qualityTiers.map((t) => (
                  <FilterChip
                    key={t.value}
                    label={t.label}
                    active={filterTier === t.value}
                    onClick={() => setFilterTier(t.value)}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                Protocol
              </label>
              <div className="flex flex-wrap gap-1.5">
                {protocolOptions.map((p) => (
                  <FilterChip
                    key={p}
                    label={p}
                    active={filterProtocol === p}
                    onClick={() => setFilterProtocol(p)}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                Endpoint Health
              </label>
              <div className="flex flex-wrap gap-1.5">
                {healthOptions.map((h) => (
                  <FilterChip
                    key={h.value}
                    label={h.label}
                    active={filterHealth === h.value}
                    onClick={() => setFilterHealth(h.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-muted">
            {viewMode === "onchain" && onchainLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                Loading onchain agents...
              </span>
            ) : (
              `Showing ${activeAgents.length} agent${activeAgents.length !== 1 ? "s" : ""}${
                viewMode === "onchain" ? ` of ${onchainTotal.toLocaleString()}` : ""
              }`
            )}
          </span>
          {compareIds.length > 0 && (
            <span className="text-xs text-accent font-medium">
              {compareIds.length} selected to compare
            </span>
          )}
        </div>

        {/* Agent Grid */}
        {viewMode === "onchain" && onchainLoading && onchainSource.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <Loader2 size={32} className="mx-auto text-accent animate-spin mb-3" />
            <p className="text-sm font-medium text-foreground">Fetching onchain agents</p>
            <p className="mt-1 text-xs text-muted">
              Querying 8004scan.io for BSC registered agents...
            </p>
          </div>
        ) : viewMode === "onchain" && onchainError ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <AlertCircle size={32} className="mx-auto text-[#ef4444] mb-3" />
            <p className="text-sm font-medium text-foreground">{onchainError}</p>
            <p className="mt-1 text-xs text-muted">
              Check your connection and try again
            </p>
            <button
              onClick={() => {
                setOnchainError(null);
                setOnchainLoading(true);
                getDiscoveredAgents(1, 100)
                  .then(({ agents: fetched, total, hasMore }) => {
                    setInitialOnchain(fetched);
                    setOnchainTotal(total);
                    setOnchainPage(1);
                    setOnchainHasMore(hasMore);
                  })
                  .catch(() => setOnchainError("Failed to load onchain agents"))
                  .finally(() => setOnchainLoading(false));
              }}
              className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all inline-flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        ) : activeAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                compareSelected={compareIds.includes(agent.id)}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <Inbox size={32} className="mx-auto text-muted/30 mb-3" />
            <p className="text-sm font-medium text-foreground">No agents found</p>
            <p className="mt-1 text-xs text-muted">
              {viewMode === "onchain"
                ? search
                  ? "No onchain agents match your search"
                  : "No onchain agents available yet"
                : "Try adjusting your search or filters"}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
                setFilterTier("All");
                setFilterProtocol("All");
                setFilterHealth("All");
                setSearchOnchainResults(null);
              }}
              className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Onchain Load More */}
        {viewMode === "onchain" && onchainHasMore && !onchainLoading && (
          <div className="mt-6 text-center">
            <button
              onClick={async () => {
                const nextPage = onchainPage + 1;
                setOnchainPage(nextPage);
                setOnchainLoading(true);
                try {
                  const { agents: fetched, hasMore } = await getDiscoveredAgents(
                    nextPage,
                    100,
                    search || undefined
                  );
                  setInitialOnchain((prev) => [...prev, ...fetched]);
                  setOnchainHasMore(hasMore);
                } catch {
                  /* ignore */
                } finally {
                  setOnchainLoading(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted hover:text-foreground hover:border-accent/20 transition-all"
            >
              <RefreshCw size={13} />
              Load more onchain agents
            </button>
          </div>
        )}
      </div>

      {/* Compare Drawer */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <GitCompare size={16} className="text-accent" />
                Compare ({compareIds.length})
              </div>

              <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {compareAgents.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-1.5 shrink-0"
                  >
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold"
                      style={{
                        backgroundColor: a.color + "20",
                        color: a.color,
                      }}
                    >
                      {a.avatar}
                    </div>
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                      {a.name}
                    </span>
                    <button
                      onClick={() => toggleCompare(a.id)}
                      className="text-muted hover:text-foreground ml-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setCompareIds([])}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (compareIds.length >= 2) {
                      router.push(`/compare?agents=${compareIds.join(",")}`);
                    }
                  }}
                  disabled={compareIds.length < 2}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black hover:bg-accent-hover transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <GitCompare size={13} />
                  Compare Now
                  {compareIds.length < 2 && (
                    <span className="text-[10px] font-medium opacity-80">
                      (select {2 - compareIds.length} more)
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
