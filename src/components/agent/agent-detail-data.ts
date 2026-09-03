import type { OnchainReputationData } from "@/lib/agents/reputation/types";
import { agents } from "@/components/discover/agents-data";
import { parseDiscoveredAgentId } from "@/lib/discovery/service";

export interface AgentDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  avatar: string;
  color: string;
  verified: boolean;
  status: "active" | "beta" | "maintenance";
  chain: string;
  rating: number;
  reviews: number;
  tasks: string;
  performance: number;
  uptime: number;
  price: string;
  priceNumeric: number;
  trend: string;
  lastActive: string;
  features: string[];
  builder: string;
  builderVerified: boolean;
  deployed: string;
  contractAddress: string;
  reputation: number;
  successRate: number;
  completedTasks: string;
  avgExecutionTime: string;
  avgCost: string;
  capabilities: string[];
  supportedProtocols: { name: string; logo: string }[];
  permissions: { label: string; granted: boolean; description: string }[];
  recentActivity: {
    action: string;
    timestamp: string;
    status: "success" | "failed" | "pending";
    txHash?: string;
  }[];
  trustSignals: {
    title: string;
    detail: string;
    verified: boolean;
  }[];
  endpoints?: {
    name: string;
    status: "healthy" | "degraded" | "unhealthy" | "skipped";
    domain: string;
    tools?: number;
    /** Real per-service endpoint verification status (e.g. "verified", "skipped"). */
    verificationStatus?: string;
    /** Real per-service domain verification flag. */
    domainVerified?: boolean;
  }[];
  /** Real ERC-8004 reputation registry data — onchain agents only. */
  onchainReputation?: OnchainReputationData;
  /**
   * Real 8004scan trust/registration data surfaced on the profile for
   * onchain agents (validations, creation tx/block, wallets, trust models,
   * endpoint verification timestamps, score breakdown). Never fabricated —
   * absent values stay null and render as "—".
   */
  onchainTrust?: {
    supportedTrustModels: string[];
    totalValidations: number | null;
    successfulValidations: number | null;
    createdTxHash: string | null;
    createdBlockNumber: number | null;
    agentWallet: string | null;
    creatorAddress: string | null;
    ownerUsername: string | null;
    ownerPublisherTier: string | null;
    ownerCertifiedName: string | null;
    starCount: number | null;
    watchCount: number | null;
    endpointVerifiedAt: string | null;
    endpointVerifiedDomain: string | null;
    endpointLastCheckedAt: string | null;
    healthCheckedAt: string | null;
    reputationBreakdown: {
      quality: number | null;
      popularity: number | null;
      activity: number | null;
      wallet: number | null;
      freshness: number | null;
      metadataCompleteness: number | null;
      finalScore: number | null;
      leaderboard?: {
        meritScore: number | null;
        proofScore: number | null;
        supportScore: number | null;
        evidenceTier: string | null;
        integrityTier: string | null;
        discoverabilityTier: string | null;
        feedbackCount: number | null;
      };
    } | null;
  };
}

export const agentDetails: Record<string, AgentDetail> = {
  "sentinel-guard": {
    id: "sentinel-guard",
    name: "Sentinel Guard",
    category: "Security",
    description:
      "Real-time portfolio monitoring and threat detection across DeFi protocols. Auto-revoke compromised approvals.",
    longDescription:
      "Sentinel Guard monitors your wallet portfolio 24/7 across all supported DeFi protocols. It detects suspicious contract interactions, phishing attempts, and unauthorized approval requests in real-time. When a threat is detected, the agent immediately alerts you and can auto-revoke compromised approvals before funds are lost. It tracks over 200 DeFi protocols and uses pattern recognition trained on thousands of known attack vectors.",
    avatar: "SG",
    color: "#22c55e",
    verified: true,
    status: "active",
    chain: "Multi-chain",
    rating: 4.9,
    reviews: 342,
    tasks: "12.4k",
    performance: 98.7,
    uptime: 99.99,
    price: "0.5 BNB/mo",
    priceNumeric: 0.5,
    trend: "+18%",
    lastActive: "2 min ago",
    features: ["Auto-revoke", "Real-time alerts", "Multi-wallet"],
    builder: "SentinelLabs",
    builderVerified: true,
    deployed: "Mar 2025",
    contractAddress: "",
    reputation: 98,
    successRate: 99.2,
    completedTasks: "12,437",
    avgExecutionTime: "1.2s",
    avgCost: "$0.03",
    capabilities: [
      "Real-time transaction monitoring",
      "Phishing and scam detection",
      "Automatic approval revocation",
      "Multi-wallet portfolio tracking",
      "Custom alert thresholds",
      "Historical threat analysis",
      "Smart contract risk scoring",
      "Push notifications via Telegram and Discord",
    ],
    supportedProtocols: [
      { name: "PancakeSwap", logo: "🥞" },
      { name: "Venus", logo: "💛" },
      { name: "Aave", logo: "👻" },
      { name: "Uniswap", logo: "🦄" },
      { name: "Curve", logo: "🌀" },
      { name: "Trader Joe", logo: "Joe" },
      { name: "SushiSwap", logo: "🍣" },
      { name: "Compound", logo: "🏛" },
    ],
    permissions: [
      {
        label: "Read wallet data",
        granted: true,
        description: "View token balances and transaction history",
      },
      {
        label: "Simulate transactions",
        granted: true,
        description: "Dry-run transactions to detect threats",
      },
      {
        label: "Revoke approvals",
        granted: true,
        description: "Cancel compromised token approvals",
      },
      {
        label: "Execute trades",
        granted: false,
        description: "Cannot buy, sell, or transfer assets",
      },
      {
        label: "Move funds",
        granted: false,
        description: "Cannot transfer tokens or NFTs",
      },
      {
        label: "Contract deployment",
        granted: false,
        description: "Cannot deploy or modify smart contracts",
      },
    ],
    recentActivity: [
      {
        action: "Revoked approval for a suspicious contract",
        timestamp: "2 min ago",
        status: "success",
      },
      {
        action: "Detected phishing link in transaction memo, blocked",
        timestamp: "18 min ago",
        status: "success",
      },
      {
        action: "Portfolio scan completed — 0 threats found",
        timestamp: "1 hr ago",
        status: "success",
      },
      {
        action: "Alert: Unusual approval request detected",
        timestamp: "2 hr ago",
        status: "success",
      },
      {
        action: "System health check passed",
        timestamp: "4 hr ago",
        status: "success",
      },
      {
        action: "Auto-revoke triggered for expired approval",
        timestamp: "6 hr ago",
        status: "success",
      },
      {
        action: "Failed to reach RPC endpoint, retrying",
        timestamp: "12 hr ago",
        status: "failed",
      },
    ],
    trustSignals: [
      {
        title: "Smart contract audited by CertiK",
        detail: "Full security audit completed March 2025. No critical vulnerabilities found.",
        verified: true,
      },
      {
        title: "99.99% uptime over 18 months",
        detail: "No unplanned downtime since deployment. Monitoring infrastructure is distributed.",
        verified: true,
      },
      {
        title: "Zero fund loss incidents",
        detail: "No user funds have been lost through agent operations or failures.",
        verified: true,
      },
      {
        title: "SentinelLabs has 3 verified agents",
        detail: "Builder reputation: 96/100 across 3 deployments with 4.8 avg rating.",
        verified: true,
      },
    ],
  },
  "yield-oracle": {
    id: "yield-oracle",
    name: "Yield Oracle",
    category: "DeFi",
    description:
      "Cross-protocol yield optimization with automated rebalancing. Finds highest APY across lending and LP pools.",
    longDescription:
      "Yield Oracle continuously scans yield opportunities across lending protocols, LP pools, and staking vaults on BNB Chain. It calculates risk-adjusted returns and automatically rebalances your position to capture the highest sustainable APY. The agent considers smart contract risk, TVL depth, and historical sustainability before recommending migrations.",
    avatar: "YO",
    color: "#3b82f6",
    verified: true,
    status: "active",
    chain: "BNB Chain",
    rating: 4.8,
    reviews: 287,
    tasks: "8.7k",
    performance: 96.2,
    uptime: 99.95,
    price: "1.2 BNB/mo",
    priceNumeric: 1.2,
    trend: "+24%",
    lastActive: "5 min ago",
    features: ["Auto-rebalance", "Multi-protocol", "Risk scoring"],
    builder: "DeFi Collective",
    builderVerified: true,
    deployed: "Jan 2025",
    contractAddress: "",
    reputation: 95,
    successRate: 98.7,
    completedTasks: "8,742",
    avgExecutionTime: "3.8s",
    avgCost: "$0.12",
    capabilities: [
      "Cross-protocol yield scanning",
      "Risk-adjusted APY calculation",
      "Automated position rebalancing",
      "IL (impermanent loss) estimation",
      "TVL and liquidity depth analysis",
      "Gas-optimized batch migrations",
      "Custom risk tolerance settings",
      "Weekly yield performance reports",
    ],
    supportedProtocols: [
      { name: "Venus", logo: "💛" },
      { name: "PancakeSwap", logo: "🥞" },
      { name: "Alpaca Finance", logo: "🦙" },
      { name: "Beefy Finance", logo: "🐄" },
      { name: "Wombat Exchange", logo: "🦛" },
    ],
    permissions: [
      {
        label: "Read wallet data",
        granted: true,
        description: "View balances and LP positions",
      },
      {
        label: "Execute swaps",
        granted: true,
        description: "Swap tokens for yield rebalancing",
      },
      {
        label: "Manage LP positions",
        granted: true,
        description: "Add/remove liquidity across protocols",
      },
      {
        label: "Move funds to external wallets",
        granted: false,
        description: "Cannot transfer assets outside your wallets",
      },
    ],
    recentActivity: [
      {
        action: "Migrated $12,400 from Venus USDT (8.2%) to Beefy BUSD (11.4%)",
        timestamp: "5 min ago",
        status: "success",
      },
      {
        action: "Yield scan completed — 47 pools analyzed",
        timestamp: "1 hr ago",
        status: "success",
      },
      {
        action: "Rebalancing skipped: gas price above threshold",
        timestamp: "3 hr ago",
        status: "pending",
      },
      {
        action: "Removed liquidity from PancakeSwap BNB/BUSD pool",
        timestamp: "6 hr ago",
        status: "success",
      },
    ],
    trustSignals: [
      {
        title: "Audit by SlowMist",
        detail: "Full audit of yield calculation and rebalancing logic. Completed Jan 2025.",
        verified: true,
      },
      {
        title: "No unauthorized fund movements",
        detail: "All transactions stay within connected wallets.",
        verified: true,
      },
      {
        title: "DeFi Collective has 2 verified agents",
        detail: "Builder reputation: 93/100 with 4.6 avg rating.",
        verified: true,
      },
    ],
  },
  "gas-optimizer": {
    id: "gas-optimizer",
    name: "Gas Optimizer",
    category: "Analytics",
    description:
      "Optimal gas timing, transaction simulation and batch execution. Saves 30-60% on average gas costs.",
    longDescription:
      "Gas Optimizer analyzes historical gas patterns and current mempool conditions to predict optimal transaction timing. It simulates transactions before submission, identifies batching opportunities, and routes through the most gas-efficient paths. Used by over 21,000 wallets with documented savings of 30-60% on average gas costs.",
    avatar: "GO",
    color: "#a855f7",
    verified: true,
    status: "active",
    chain: "Multi-chain",
    rating: 4.7,
    reviews: 521,
    tasks: "21.3k",
    performance: 99.1,
    uptime: 99.98,
    price: "Free",
    priceNumeric: 0,
    trend: "+31%",
    lastActive: "1 min ago",
    features: ["Gas forecasting", "Batch tx", "Simulation"],
    builder: "ChainSight",
    builderVerified: true,
    deployed: "Nov 2024",
    contractAddress: "",
    reputation: 97,
    successRate: 99.8,
    completedTasks: "21,309",
    avgExecutionTime: "0.4s",
    avgCost: "Free",
    capabilities: [
      "Real-time gas price monitoring",
      "Optimal timing prediction",
      "Transaction simulation and dry-run",
      "Batch transaction optimization",
      "Multi-chain gas comparison",
      "Gas spending analytics dashboard",
      "Custom gas price alerts",
      "Historical gas cost reports",
    ],
    supportedProtocols: [
      { name: "BNB Chain", logo: "💎" },
      { name: "Ethereum", logo: "⟠" },
      { name: "Arbitrum", logo: "🔵" },
      { name: "Polygon", logo: "🟣" },
      { name: "Optimism", logo: "🔴" },
    ],
    permissions: [
      {
        label: "Read wallet data",
        granted: true,
        description: "View transaction history for gas analysis",
      },
      {
        label: "Simulate transactions",
        granted: true,
        description: "Dry-run to estimate gas costs",
      },
      {
        label: "Execute trades",
        granted: false,
        description: "Cannot initiate any transactions",
      },
      {
        label: "Move funds",
        granted: false,
        description: "Cannot transfer tokens or assets",
      },
    ],
    recentActivity: [
      {
        action: "Batched 4 swaps into 1 transaction, saved 67% gas",
        timestamp: "1 min ago",
        status: "success",
      },
      {
        action: "Gas price alert: below 5 gwei, optimal window",
        timestamp: "12 min ago",
        status: "success",
      },
      {
        action: "Simulation: swap USDT→BNB estimated at 0.0008 BNB",
        timestamp: "30 min ago",
        status: "success",
      },
    ],
    trustSignals: [
      {
        title: "Open-source and audited",
        detail: "Fully open-source codebase. Community-audited with no findings.",
        verified: true,
      },
      {
        title: "Free tier available",
        detail: "No fees for basic gas monitoring. Pro features optional.",
        verified: true,
      },
      {
        title: "21k+ active users",
        detail: "Most used analytics agent on AGENTX by task volume.",
        verified: true,
      },
    ],
  },
};

function buildFallbackDetail(base: {
  id: string; name: string; category: string; description: string;
  avatar: string; color: string; verified: boolean; status: "active" | "beta" | "maintenance";
  chain: string; rating: number; reviews: number; tasks: string;
  performance: number; uptime: number; price: string; priceNumeric: number;
  trend: string; lastActive: string; features: string[];
  builder: string; deployed: string;
}): AgentDetail {
  return {
    ...base,
    longDescription: base.description,
    builderVerified: base.verified,
    contractAddress: "",
    reputation: Math.round(base.performance * 0.98),
    successRate: Math.round(base.performance * 0.995 * 10) / 10,
    completedTasks: base.tasks,
    avgExecutionTime: "1.5s",
    avgCost: base.priceNumeric === 0 ? "Free" : `$${(base.priceNumeric * 0.1).toFixed(2)}`,
    capabilities: ["Onchain monitoring", "Automated execution", "Real-time alerts", "Custom configuration"],
    supportedProtocols: [{ name: base.chain, logo: "🔗" }],
    permissions: [
      { label: "Read wallet data", granted: true, description: "View balances and transaction history" },
      { label: "Execute trades", granted: false, description: "Cannot initiate transactions" },
      { label: "Move funds", granted: false, description: "Cannot transfer tokens or assets" },
    ],
    recentActivity: [
      { action: "Agent initialized and monitoring started", timestamp: base.lastActive, status: "success" },
      { action: "Portfolio scan completed — all clear", timestamp: "1 hr ago", status: "success" },
    ],
    trustSignals: [
      { title: "Listed in AGENTX directory", detail: `Listed in the AGENTX agent directory for ${base.chain}.`, verified: false },
      { title: `${base.builder} builder reputation`, detail: `Builder has a ${base.rating} star average across deployments.`, verified: true },
    ],
  };
}

export function getAgentDetail(id: string): AgentDetail | undefined {
  if (agentDetails[id]) return agentDetails[id];
  const base = agents.find((a: { id: string }) => a.id === id);
  if (base) return buildFallbackDetail(base);
  if (id.startsWith("onchain-")) {
    const parsed = parseDiscoveredAgentId(id);
    if (parsed) {
      return buildFallbackDetail({
        id,
        name: `Agent #${parsed.tokenId}`,
        category: "Analytics",
        description: `ERC-8004 registered agent on chain ${parsed.chainId}, token ${parsed.tokenId}. Quality data requires fetching full agent details from 8004scan.io.`,
        avatar: `#${parsed.tokenId}`.slice(0, 2),
        color: "#71717a",
        verified: false,
        status: "beta",
        chain: "Multi-chain" as const,
        rating: 1,
        reviews: 0,
        tasks: "0",
        performance: 0,
        uptime: 0,
        price: "Unknown",
        priceNumeric: 0,
        trend: "new",
        lastActive: "unknown",
        features: ["Onchain"],
        builder: `Chain ${parsed.chainId}`,
        deployed: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });
    }
  }
  return undefined;
}

export function getAllAgentIds(): string[] {
  return Object.keys(agentDetails);
}

export async function enrichOnchainAgentDetail(id: string): Promise<AgentDetail | undefined> {
  if (!id.startsWith("onchain-")) return undefined;
  const { parseDiscoveredAgentId, classifyAgentQuality } = await import("@/lib/discovery/service");
  const { getOnchainAgent } = await import("@/lib/discovery/client");
  const parsed = parseDiscoveredAgentId(id);
  if (!parsed) return undefined;

  const detail = await getOnchainAgent(parsed.chainId, parsed.tokenId);
  if (!detail) return getAgentDetail(id);

  // Real ERC-8004 reputation reads (getClients → getSummary/readAllFeedback).
  // Never throws — the snapshot reflects the actual registry state.
  const { getOnchainAgentReputation } = await import(
    "@/lib/agents/reputation/service"
  );
  const onchainReputation = await getOnchainAgentReputation(
    parsed.tokenId,
    parsed.chainId,
  );

  const quality = classifyAgentQuality(detail, detail.scores, detail.healthStatus);
  const protocols = detail.supportedProtocols.map((p) => p.toUpperCase()).join(", ") || "On-chain";
  const features: string[] = [];
  if (detail.x402Supported) features.push("x402 Payments");
  const lower = detail.supportedProtocols.map((p) => p.toLowerCase());
  if (lower.includes("mcp")) features.push("MCP");
  if (lower.includes("a2a")) features.push("A2A");
  if (lower.includes("oasf")) features.push("OASF");
  if (detail.crossChainVersions) features.push("Multi-chain");
  if (features.length === 0) features.push(protocols);

  const totalScore = detail.totalScore;
  const tasksDisplay = detail.totalFeedbacks >= 1000
    ? `${(detail.totalFeedbacks / 1000).toFixed(1)}k`
    : String(detail.totalFeedbacks);

  const serviceEntries: string[] = [];
  const endpoints: { name: string; status: "healthy" | "degraded" | "unhealthy" | "skipped"; domain: string; tools?: number; verificationStatus?: string; domainVerified?: boolean }[] = [];
  if (detail.healthStatus?.services) {
    for (const [name, svc] of Object.entries(detail.healthStatus.services)) {
      if (svc.status === "skipped") continue;
      const tools = svc.stats?.toolsCount ?? svc.stats?.skillsCount ?? 0;
      serviceEntries.push(`${name.toUpperCase()}: ${svc.status}${tools > 0 ? ` (${tools} tools)` : ""}`);
      endpoints.push({
        name: name.toUpperCase(),
        status: svc.status,
        domain: svc.domain,
        tools: tools || undefined,
        verificationStatus: svc.verificationStatus || undefined,
        domainVerified: svc.domainVerified,
      });
    }
  }

  const trustSignals: AgentDetail["trustSignals"] = [
    {
      title: "ERC-8004 registered",
      detail: `Onchain agent on chain ${detail.chainId}, token ${detail.tokenId}. Contract: ${detail.contractAddress.slice(0, 10)}...`,
      verified: true,
    },
  ];
  if (quality.signals.length > 0) {
    trustSignals.push({
      title: `Quality: ${quality.tier}`,
      detail: quality.signals.join(". "),
      verified: quality.tier === "premium" || quality.tier === "quality",
    });
  }
  if (detail.isEndpointVerified) {
    trustSignals.push({ title: "Endpoint verified", detail: "Service endpoints independently verified.", verified: true });
  } else if (detail.endpointVerificationError) {
    trustSignals.push({ title: "Endpoint unverified", detail: detail.endpointVerificationError, verified: false });
  }
  if (detail.healthStatus?.ownerWallet) {
    trustSignals.push({
      title: "Owner wallet",
      detail: detail.healthStatus.ownerWallet.message,
      verified: detail.healthStatus.ownerWallet.status === "healthy",
    });
  }

  const hasFeedback = detail.totalFeedbacks > 0;
  const hasServices = serviceEntries.length > 0;

  const base: AgentDetail = {
    id,
    name: detail.name || `Agent #${detail.tokenId}`,
    category: detectCategoryFromDetail(detail),
    description: detail.description || `ERC-8004 agent on chain ${detail.chainId}`,
    longDescription: detail.description || `ERC-8004 agent on chain ${detail.chainId}`,
    avatar: getInitialsFromName(detail.name || `Agent ${detail.tokenId}`),
    color: pickColorFromScore(totalScore),
    verified: false,
    status: hasFeedback ? "active" : "beta",
    chain: CHAIN_NAMES_MAP[detail.chainId] ?? "Multi-chain",
    rating: hasFeedback ? Math.min(5, Math.max(1, totalScore / 10)) : 0,
    reviews: detail.totalFeedbacks,
    tasks: tasksDisplay,
    performance: Math.min(100, totalScore || 0),
    uptime: detail.healthScore ?? 0,
    price: detail.x402Supported ? "Pay-per-use" : "Unknown",
    priceNumeric: 0,
    trend: hasFeedback ? `${detail.totalFeedbacks} reviews` : "new",
    lastActive: formatRelativeTimeFromISO(detail.updatedAt),
    features,
    builder: detail.ownerUsername ?? detail.ownerAddress.slice(0, 10),
    builderVerified: false,
    deployed: new Date(detail.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    contractAddress: detail.contractAddress,
    reputation: Math.round(totalScore),
    successRate: hasFeedback && detail.averageScore > 0 ? detail.averageScore : 0,
    completedTasks: tasksDisplay,
    avgExecutionTime: "—",
    avgCost: detail.x402Supported ? "Pay-per-use" : "Unknown",
    capabilities: hasServices
      ? serviceEntries
      : [
          "Onchain registration (ERC-8004)",
          detail.isEndpointVerified ? "Endpoint verified" : "No endpoint verification",
        ],
    supportedProtocols: detail.supportedProtocols.map((p) => ({ name: p.toUpperCase(), logo: "🔗" })),
    permissions: [
      { label: "Onchain registration", granted: true, description: "ERC-8004 identity registered onchain" },
      { label: "Service endpoints", granted: hasServices, description: hasServices ? "Has declared service endpoints" : "No service endpoints declared" },
    ],
    recentActivity: [
      { action: `Registered on ${CHAIN_NAMES_MAP[detail.chainId] ?? "chain"}`, timestamp: formatRelativeTimeFromISO(detail.createdAt), status: "success" },
      ...(detail.healthStatus ? [{ action: `Health check: ${detail.healthStatus.overallStatus}`, timestamp: formatRelativeTimeFromISO(detail.updatedAt), status: detail.healthStatus.overallStatus === "healthy" ? "success" as const : "failed" as const }] : []),
    ],
    trustSignals,
    endpoints: endpoints.length > 0 ? endpoints : undefined,
    onchainReputation,
    onchainTrust: buildOnchainTrust(detail),
  };
  return base;
}

function buildOnchainTrust(detail: Awaited<ReturnType<typeof import("@/lib/discovery/client").getOnchainAgent>>): AgentDetail["onchainTrust"] {
  if (!detail) return undefined;
  const scores = detail.scores;
  const lb = scores?.leaderboardPolicy;
  const breakdown: AgentDetail["onchainTrust"] & { reputationBreakdown: NonNullable<AgentDetail["onchainTrust"]>["reputationBreakdown"] } = {
    supportedTrustModels: detail.supportedTrustModels ?? [],
    totalValidations: numberOrNull(detail.totalValidations),
    successfulValidations: numberOrNull(detail.successfulValidations),
    createdTxHash: stringOrNull(detail.createdTxHash),
    createdBlockNumber: numberOrNull(detail.createdBlockNumber),
    agentWallet: stringOrNull(detail.agentWallet),
    creatorAddress: stringOrNull(detail.creatorAddress),
    ownerUsername: stringOrNull(detail.ownerUsername),
    ownerPublisherTier: stringOrNull(detail.ownerPublisherTier),
    ownerCertifiedName: stringOrNull(detail.ownerCertifiedName),
    starCount: numberOrNull(detail.starCount),
    watchCount: numberOrNull(detail.watchCount),
    endpointVerifiedAt: stringOrNull(detail.endpointVerifiedAt),
    endpointVerifiedDomain: stringOrNull(detail.endpointVerifiedDomain),
    endpointLastCheckedAt: stringOrNull(detail.endpointLastCheckedAt),
    healthCheckedAt: stringOrNull(detail.healthCheckedAt),
    reputationBreakdown: scores
      ? {
          quality: scores.quality ?? null,
          popularity: scores.popularity ?? null,
          activity: scores.activity ?? null,
          wallet: scores.wallet ?? null,
          freshness: scores.freshness ?? null,
          metadataCompleteness: scores.metadataCompleteness ?? null,
          finalScore: scores.finalScore ?? null,
          leaderboard: lb
            ? {
                meritScore: lb.meritScore ?? null,
                proofScore: lb.proofScore ?? null,
                supportScore: lb.supportScore ?? null,
                evidenceTier: lb.evidenceTier || null,
                integrityTier: lb.integrityTier || null,
                discoverabilityTier: lb.discoverabilityTier || null,
                feedbackCount: lb.feedbackCount ?? null,
              }
            : undefined,
        }
      : null,
  };
  return breakdown;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function detectCategoryFromDetail(detail: { name: string; description: string | null; tags?: string[]; categories?: string[] }): string {
  if (detail.categories && detail.categories.length > 0) return detail.categories[0];
  if (detail.tags && detail.tags.length > 0) return detail.tags[0];
  const text = `${detail.name} ${detail.description ?? ""}`.toLowerCase();
  const kw: Record<string, string[]> = {
    Trading: ["trading", "trade", "swap", "dex", "market", "odds"],
    DeFi: ["defi", "yield", "farming", "lending", "staking", "liquidity", "aave", "venus"],
    Security: ["security", "audit", "monitor", "guard", "protect", "fraud"],
    Analytics: ["analytics", "analysis", "data", "index", "track", "report", "xg"],
    Portfolio: ["portfolio", "rebalance", "allocation", "management"],
    Compliance: ["compliance", "kyc", "aml", "regulatory", "tax"],
    "Cross-Chain": ["cross-chain", "bridge", "multichain", "interop"],
    Prediction: ["prediction", "forecast", "football", "sports", "odds"],
  };
  for (const [cat, keywords] of Object.entries(kw)) {
    if (keywords.some((k) => text.includes(k))) return cat;
  }
  return "Analytics";
}

function getInitialsFromName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!cleaned) return "AG";
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function pickColorFromScore(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#71717a";
}

const CHAIN_NAMES_MAP: Record<number, string> = {
  56: "BNB Chain", 1: "Ethereum", 8453: "Base", 42161: "Arbitrum",
  137: "Polygon", 10: "Optimism", 42220: "Celo", 43114: "Avalanche",
  100: "Gnosis", 143: "Monad", 167000: "Taiko", 534352: "Scroll",
};

function formatRelativeTimeFromISO(dateStr: string): string {
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
