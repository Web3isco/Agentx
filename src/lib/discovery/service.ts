import type { OnchainAgent, OnchainAgentDetail, ScoreBreakdown, HealthStatusData } from "./types";
import type { Agent } from "@/components/discover/agents-data";
import { getOnchainAgent, searchOnchainAgents, getBscAgents } from "./client";

/** Catalog DTO shape returned by the Phase 4B /api/agents gateway. */
interface CatalogAgentDto {
  id: string;
  tokenId: number;
  chainId: number;
  name: string;
  description: string | null;
  ownerUsername: string | null;
  ownerAddress: string;
  protocols: string[];
  x402Supported: boolean;
  isVerified: boolean;
  totalScore: number;
  healthScore: number | null;
  totalFeedbacks: number;
  averageScore: number | null;
  createdAt: string;
  updatedAt: string;
  catalogTier: "featured" | "promising" | "new" | "listed";
  isFeatured: boolean;
  isNew: boolean;
  curationReasons: string[];
}

const CHAIN_NAMES: Record<number, string> = {
  56: "BNB Chain",
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  137: "Polygon",
  10: "Optimism",
  42220: "Celo",
  43114: "Avalanche",
  100: "Gnosis",
  143: "Monad",
  167000: "Taiko",
  534352: "Scroll",
  4217: "Tempo",
  196: "X Layer",
  5000: "Mantle",
  1187947933: "SKALE",
  2741: "Abstract",
  1088: "Metis",
  1868: "Soneium",
  360: "Shape",
  1776: "Injective",
  45056: "Billions",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Trading: ["trading", "trade", "swap", "dex", "market", "order"],
  DeFi: ["defi", "yield", "farming", "lending", "staking", "liquidity", "apy"],
  Security: ["security", "audit", "monitor", "guard", "protect", "fraud"],
  Analytics: ["analytics", "analysis", "data", "index", "track", "report"],
  Prediction: ["prediction", "predict", "forecast", "oracle", "bet", "odds", "gambling", "wager"],
  Portfolio: ["portfolio", "rebalance", "allocation", "management"],
  Compliance: ["compliance", "kyc", "aml", "regulatory", "tax"],
  "Cross-Chain": ["cross-chain", "bridge", "multichain", "interop"],
};

function detectCategory(agent: OnchainAgent): string {
  const text = `${agent.name} ${agent.description ?? ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return cat;
  }
  return "Analytics";
}

function getChainName(chainId: number): Agent["chain"] {
  const name = CHAIN_NAMES[chainId];
  if (!name) return "Multi-chain";
  if (["BNB Chain"].includes(name)) return "BNB Chain";
  if (["Ethereum"].includes(name)) return "Ethereum";
  if (["Arbitrum"].includes(name)) return "Arbitrum";
  return "Multi-chain";
}

function getInitials(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!cleaned) return "AG";
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function pickColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#71717a";
}

export type QualityTier = "premium" | "quality" | "basic" | "unclassified";

export interface OnchainQuality {
  tier: QualityTier;
  score: number;
  signals: string[];
  hasRealServices: boolean;
  hasFeedback: boolean;
  isHealthy: boolean;
}

const PROTOCOL_WITH_SERVICES = ["mcp", "a2a"];

export function classifyAgentQuality(
  agent: OnchainAgent,
  breakdown?: ScoreBreakdown | null,
  health?: HealthStatusData | null
): OnchainQuality {
  const signals: string[] = [];
  const totalScore = agent.totalScore;
  const protocols = agent.supportedProtocols.map((p) => p.toLowerCase());

  const hasMcpOrA2a = protocols.some((p) => PROTOCOL_WITH_SERVICES.includes(p));
  const hasRealServices = hasMcpOrA2a;
  const hasFeedback = agent.totalFeedbacks > 0;
  const isHealthy = (agent.healthScore ?? 0) >= 80;
  const hasGoodScore = totalScore >= 10;
  const isRanked = agent.rank !== null && agent.rank <= 5000;
  const hasStars = agent.starCount > 0;

  if (hasMcpOrA2a) signals.push(`${protocols.filter((p) => PROTOCOL_WITH_SERVICES.includes(p)).map((p) => p.toUpperCase()).join("+")} services`);
  if (hasFeedback) signals.push(`${agent.totalFeedbacks} feedback${agent.totalFeedbacks !== 1 ? "s" : ""}`);
  if (isHealthy) signals.push("healthy endpoints");
  if (hasGoodScore) signals.push(`score ${totalScore.toFixed(1)}`);
  if (isRanked) signals.push(`rank #${agent.rank}`);
  if (hasStars) signals.push(`${agent.starCount} star${agent.starCount !== 1 ? "s" : ""}`);

  if (breakdown?.leaderboardPolicy) {
    const lp = breakdown.leaderboardPolicy;
    if (lp.integrityTier && lp.integrityTier !== "broken") signals.push(`integrity: ${lp.integrityTier}`);
    if (lp.evidenceTier) signals.push(`evidence: ${lp.evidenceTier}`);
  }

  let tier: QualityTier;
  if (hasMcpOrA2a && hasGoodScore && hasFeedback && isHealthy) {
    tier = "premium";
  } else if (hasMcpOrA2a && hasGoodScore && (hasFeedback || hasStars)) {
    tier = "quality";
  } else if ((hasMcpOrA2a || hasGoodScore) && (hasFeedback || isHealthy || hasStars)) {
    tier = "basic";
  } else {
    tier = "unclassified";
  }

  return { tier, score: totalScore, signals, hasRealServices, hasFeedback, isHealthy };
}

export function onchainToAgent(agent: OnchainAgent): Agent {
  const category = detectCategory(agent);
  const protocols = agent.supportedProtocols.map((p) => p.toUpperCase()).join(", ") || "On-chain";
  const features: string[] = [];
  if (agent.x402Supported) features.push("x402 Payments");
  const lowerProtocols = agent.supportedProtocols.map((p) => p.toLowerCase());
  if (lowerProtocols.includes("mcp")) features.push("MCP");
  if (lowerProtocols.includes("a2a")) features.push("A2A");
  if (lowerProtocols.includes("oasf")) features.push("OASF");
  if (agent.crossChainVersions) features.push("Multi-chain");
  if (features.length === 0) features.push(protocols);

  const quality = classifyAgentQuality(agent);
  const totalScore = agent.totalScore;

  const tasksDisplay =
    agent.totalFeedbacks >= 1000
      ? `${(agent.totalFeedbacks / 1000).toFixed(1)}k`
      : String(agent.totalFeedbacks);

  return {
    id: `onchain-${agent.chainId}-${agent.tokenId}`,
    name: agent.name || `Agent #${agent.tokenId}`,
    category,
    description: agent.description || `ERC-8004 agent on ${CHAIN_NAMES[agent.chainId] ?? "chain " + agent.chainId}`,
    avatar: getInitials(agent.name || `Agent ${agent.tokenId}`),
    color: pickColor(totalScore),
    verified: false,
    status: agent.totalFeedbacks > 0 ? "active" : "beta",
    chain: getChainName(agent.chainId),
    rating: agent.totalFeedbacks > 0 ? Math.min(5, Math.max(1, totalScore / 10)) : 0,
    reviews: agent.totalFeedbacks,
    tasks: tasksDisplay,
    performance: Math.min(100, totalScore || 0),
    uptime: agent.healthScore ?? 0,
    price: agent.x402Supported ? "Pay-per-use" : "Unknown",
    priceNumeric: 0,
    trend: agent.totalFeedbacks > 0 ? `${agent.totalFeedbacks} reviews` : "new",
    lastActive: formatRelativeTime(agent.updatedAt),
    features,
    builder: agent.ownerUsername ?? agent.ownerAddress.slice(0, 10),
    deployed: new Date(agent.createdAt).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    qualityTier: quality.tier,
    score: totalScore,
    healthScore: agent.healthScore,
    protocols: agent.supportedProtocols,
    feedbackCount: agent.totalFeedbacks,
    rank: agent.rank,
    tokenId: agent.tokenId,
    chainId: agent.chainId,
  };
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

let cachedBscAgents: Agent[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getDiscoveredAgents(
  page = 1,
  limit = 50,
  search?: string
): Promise<{ agents: Agent[]; total: number; hasMore: boolean }> {
  const now = Date.now();
  if (!search && cachedBscAgents && now - cacheTime < CACHE_TTL) {
    const start = (page - 1) * limit;
    return {
      agents: cachedBscAgents.slice(start, start + limit),
      total: cachedBscAgents.length,
      hasMore: start + limit < cachedBscAgents.length,
    };
  }

  if (search) {
    const results = await searchOnchainAgents(search, limit, false);
    const agents = results.map(onchainToAgent);
    return { agents, total: agents.length, hasMore: false };
  }

  const { agents: raw, total, hasMore } = await getBscAgents(page, limit);
  const agents = raw.map(onchainToAgent);

  if (page === 1) {
    cachedBscAgents = agents;
    cacheTime = now;
  }

  return { agents, total, hasMore };
}

export async function getDiscoveredAgentByChainAndToken(
  chainId: number,
  tokenId: number,
  isTestnet = false
): Promise<Agent | null> {
  const agent = await getOnchainAgent(chainId, tokenId, isTestnet);
  if (!agent) return null;
  return onchainToAgent(agent);
}

export function isDiscoveredAgentId(id: string): boolean {
  return id.startsWith("onchain-");
}

export function parseDiscoveredAgentId(id: string): {
  chainId: number;
  tokenId: number;
} | null {
  if (!isDiscoveredAgentId(id)) return null;
  const parts = id.split("-");
  if (parts.length < 3) return null;
  return {
    chainId: parseInt(parts[1], 10),
    tokenId: parseInt(parts[2], 10),
  };
}

/** Map the curated AGENTX catalog tier to the existing quality-tier display filter. */
function catalogTierToQualityTier(
  tier: CatalogAgentDto["catalogTier"]
): "premium" | "quality" | "basic" | "unclassified" {
  switch (tier) {
    case "featured":
      return "premium";
    case "promising":
      return "quality";
    case "new":
      return "basic";
    default:
      return "unclassified";
  }
}

/**
 * Map a Phase 4B curated catalog agent (from the /api/agents gateway DTO) into
 * the AGENTX Agent shape. Mirrors 8004scan fields faithfully: no fabricated
 * ratings, prices, or health values. Missing values stay null / "—" at the UI.
 */
function catalogToAgent(dto: CatalogAgentDto): Agent {
  const protocols = dto.protocols.map((p) => p.toUpperCase()).join(", ") || "On-chain";
  const features: string[] = [];
  if (dto.x402Supported) features.push("x402 Payments");
  const lower = dto.protocols.map((p) => p.toLowerCase());
  if (lower.includes("mcp")) features.push("MCP");
  if (lower.includes("a2a")) features.push("A2A");
  if (lower.includes("oasf")) features.push("OASF");
  if (dto.catalogTier === "featured") features.push("Curated");
  if (features.length === 0) features.push(protocols);

  const hasFeedback = dto.totalFeedbacks > 0;
  const builder = dto.ownerUsername ?? (dto.ownerAddress ? dto.ownerAddress.slice(0, 10) : "unknown");

  return {
    id: dto.id,
    name: dto.name || `Agent #${dto.tokenId}`,
    category: detectCategoryFromDto(dto),
    description: dto.description || `ERC-8004 agent on ${getChainName(dto.chainId)}`,
    avatar: getInitials(dto.name || `Agent ${dto.tokenId}`),
    color: pickColor(dto.totalScore),
    verified: dto.isVerified ?? false,
    status: hasFeedback ? "active" : "beta",
    chain: getChainName(dto.chainId),
    rating: dto.averageScore !== null ? Math.min(5, Math.max(1, dto.totalScore / 10)) : 0,
    reviews: dto.totalFeedbacks,
    tasks: dto.totalFeedbacks >= 1000
      ? `${(dto.totalFeedbacks / 1000).toFixed(1)}k`
      : String(dto.totalFeedbacks),
    performance: Math.min(100, dto.totalScore || 0),
    uptime: dto.healthScore ?? 0,
    price: dto.x402Supported ? "Pay-per-use" : "Unknown",
    priceNumeric: 0,
    trend: hasFeedback ? `${dto.totalFeedbacks} reviews` : "new",
    lastActive: formatRelativeTime(dto.updatedAt),
    features,
    builder,
    deployed: new Date(dto.createdAt).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    qualityTier: catalogTierToQualityTier(dto.catalogTier),
    score: dto.totalScore,
    healthScore: dto.healthScore,
    protocols: dto.protocols,
    feedbackCount: dto.totalFeedbacks,
    rank: null,
    tokenId: dto.tokenId,
    chainId: dto.chainId,
  };
}

function detectCategoryFromDto(dto: { name: string; description: string | null }): string {
  const text = `${dto.name} ${dto.description ?? ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return cat;
  }
  return "Analytics";
}

interface CatalogListResponse {
  success: boolean;
  data: CatalogAgentDto[];
  meta: { total: number; hasMore: boolean };
}

let cachedCatalogAgents: Agent[] | null = null;
let catalogCacheTime = 0;
const CATALOG_CACHE_TTL = 5 * 60 * 1000;
const CATALOG_MAX = 400;
const CATALOG_PAGE_SIZE = 100;

async function fetchCatalogPages(chainId: number): Promise<CatalogAgentDto[]> {
  const pages = Math.ceil(CATALOG_MAX / CATALOG_PAGE_SIZE);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      fetch(`/api/agents?chainId=${chainId}&tier=all&limit=${CATALOG_PAGE_SIZE}&page=${i + 1}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        const body = (await res.json()) as CatalogListResponse;
        if (!body.success || !Array.isArray(body.data)) throw new Error("INVALID_CATALOG_RESPONSE");
        return body.data;
      })
    )
  );
  return results.flat();
}

/**
 * Load the curated real-BSC catalog from the AGENTX /api/agents gateway
 * (Phase 4B). The pool is bounded at CATALOG_MAX entries, fetched as pages of
 * CATALOG_PAGE_SIZE; filtering, sorting and pagination are then applied
 * client-side exactly as the existing UI does. Falls back to the mock agents
 * (passed in) if the gateway is unavailable.
 */
export async function getCatalogAgents(
  fallback: Agent[],
  chainId: number = 56
): Promise<{ agents: Agent[]; total: number; hasMore: boolean }> {
  const now = Date.now();
  if (cachedCatalogAgents && now - catalogCacheTime < CATALOG_CACHE_TTL) {
    return { agents: cachedCatalogAgents, total: cachedCatalogAgents.length, hasMore: false };
  }

  try {
    const data = await fetchCatalogPages(chainId);
    if (data.length === 0) throw new Error("EMPTY_CATALOG");

    const agents = data.map(catalogToAgent);
    cachedCatalogAgents = agents;
    catalogCacheTime = now;
    return { agents, total: agents.length, hasMore: false };
  } catch {
    // Graceful degradation: curated catalog unavailable → mock agents.
    return { agents: fallback, total: fallback.length, hasMore: false };
  }
}
