import type {
  AgentReputation,
  PerformanceMetrics,
  PerformanceHistory,
  OnchainReputationData,
} from "./types";
import {
  getSummary as getOnchainSummary,
  readAllFeedback as readOnchainFeedback,
  getClients as getOnchainClients,
  getVersion,
  getRegistryAddress,
  isReputationSupportedChain,
  BSC_TESTNET_CHAIN_ID,
  type ReputationSummary,
  type FeedbackEntry,
} from "./onchain";

function makeHistory(
  tasks: number[],
  successes: number[],
  avgSpeeds: number[],
  avgCosts: number[]
): PerformanceHistory {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    daily: tasks.map((t, i) => ({
      date: days[i],
      tasks: t,
      successes: successes[i],
      failures: t - successes[i],
      avgSpeed: avgSpeeds[i],
      avgCost: avgCosts[i],
      uptime: 99 + Math.random() * 1,
    })),
  };
}

const entries: [string, PerformanceMetrics, PerformanceHistory][] = [
  [
    "sentinel-guard",
    { reputationScore: 98, successRate: 99.2, completedTasks: 12437, failedTasks: 99, avgExecutionTime: "1.2s", avgExecutionTimeMs: 1200, avgCost: "$0.03", avgCostUsd: 0.03, uptime: 99.99, performance: 98.7, rating: 4.9, reviews: 342 },
    makeHistory([1820, 1950, 1880, 1910, 2010, 1780, 1087], [1808, 1934, 1866, 1896, 1996, 1768, 1069], [1.1, 1.3, 1.0, 1.2, 1.4, 1.1, 0.9], [0.03, 0.02, 0.04, 0.03, 0.02, 0.03, 0.04]),
  ],
  [
    "yield-oracle",
    { reputationScore: 95, successRate: 98.7, completedTasks: 8742, failedTasks: 114, avgExecutionTime: "3.8s", avgExecutionTimeMs: 3800, avgCost: "$0.12", avgCostUsd: 0.12, uptime: 99.95, performance: 96.2, rating: 4.8, reviews: 287 },
    makeHistory([1310, 1420, 1370, 1290, 1450, 1380, 1522], [1294, 1404, 1354, 1274, 1434, 1364, 1512], [3.5, 4.1, 3.8, 3.6, 4.0, 3.9, 3.7], [0.12, 0.10, 0.14, 0.11, 0.13, 0.12, 0.11]),
  ],
  [
    "gas-optimizer",
    { reputationScore: 97, successRate: 99.8, completedTasks: 21309, failedTasks: 43, avgExecutionTime: "0.4s", avgExecutionTimeMs: 400, avgCost: "Free", avgCostUsd: 0, uptime: 99.98, performance: 99.1, rating: 4.7, reviews: 521 },
    makeHistory([3050, 3180, 3010, 2990, 3220, 3100, 2759], [3044, 3174, 3004, 2986, 3214, 3094, 2753], [0.3, 0.5, 0.4, 0.3, 0.4, 0.5, 0.3], [0, 0, 0, 0, 0, 0, 0]),
  ],
  [
    "portfolio-pilot",
    { reputationScore: 93, successRate: 97.5, completedTasks: 5200, failedTasks: 130, avgExecutionTime: "2.2s", avgExecutionTimeMs: 2200, avgCost: "$0.08", avgCostUsd: 0.08, uptime: 99.92, performance: 94.8, rating: 4.6, reviews: 198 },
    makeHistory([780, 820, 750, 810, 850, 790, 400], [764, 806, 736, 796, 834, 776, 394], [2.1, 2.4, 2.0, 2.3, 2.2, 2.5, 2.1], [0.08, 0.07, 0.09, 0.08, 0.07, 0.08, 0.09]),
  ],
  [
    "bridge-watch",
    { reputationScore: 91, successRate: 98.1, completedTasks: 3800, failedTasks: 72, avgExecutionTime: "1.8s", avgExecutionTimeMs: 1800, avgCost: "$0.05", avgCostUsd: 0.05, uptime: 99.88, performance: 97.3, rating: 4.5, reviews: 156 },
    makeHistory([560, 610, 540, 580, 620, 570, 320], [550, 598, 530, 570, 610, 562, 310], [1.8, 2.0, 1.7, 1.9, 2.1, 1.8, 1.6], [0.05, 0.04, 0.06, 0.05, 0.04, 0.05, 0.06]),
  ],
  [
    "sentinel-pro",
    { reputationScore: 97, successRate: 99.5, completedTasks: 15600, failedTasks: 78, avgExecutionTime: "0.9s", avgExecutionTimeMs: 900, avgCost: "$0.02", avgCostUsd: 0.02, uptime: 99.99, performance: 99.4, rating: 4.9, reviews: 412 },
    makeHistory([2230, 2380, 2290, 2180, 2410, 2340, 1770], [2219, 2368, 2279, 2169, 2398, 2328, 1761], [0.8, 1.0, 0.9, 0.7, 1.1, 0.8, 0.9], [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.03]),
  ],
  [
    "mev-shield",
    { reputationScore: 96, successRate: 99.1, completedTasks: 9100, failedTasks: 82, avgExecutionTime: "0.6s", avgExecutionTimeMs: 600, avgCost: "$0.04", avgCostUsd: 0.04, uptime: 99.97, performance: 97.8, rating: 4.8, reviews: 334 },
    makeHistory([1340, 1420, 1300, 1380, 1450, 1360, 850], [1328, 1408, 1288, 1368, 1438, 1348, 842], [0.5, 0.7, 0.6, 0.5, 0.8, 0.6, 0.4], [0.04, 0.03, 0.05, 0.04, 0.03, 0.04, 0.05]),
  ],
  [
    "compliance-sentinel",
    { reputationScore: 88, successRate: 97.0, completedTasks: 2100, failedTasks: 63, avgExecutionTime: "2.6s", avgExecutionTimeMs: 2600, avgCost: "$0.15", avgCostUsd: 0.15, uptime: 99.94, performance: 96.5, rating: 4.4, reviews: 89 },
    makeHistory([310, 340, 290, 320, 350, 330, 160], [301, 330, 281, 311, 340, 321, 156], [2.5, 2.8, 2.4, 2.6, 2.9, 2.7, 2.5], [0.15, 0.13, 0.17, 0.14, 0.16, 0.15, 0.14]),
  ],
  [
    "dca-engine",
    { reputationScore: 92, successRate: 98.3, completedTasks: 4300, failedTasks: 73, avgExecutionTime: "1.5s", avgExecutionTimeMs: 1500, avgCost: "$0.06", avgCostUsd: 0.06, uptime: 99.91, performance: 95.2, rating: 4.5, reviews: 176 },
    makeHistory([640, 690, 620, 660, 710, 650, 330], [629, 678, 610, 650, 698, 640, 325], [1.5, 1.8, 1.4, 1.6, 1.7, 1.5, 1.3], [0.06, 0.05, 0.07, 0.06, 0.05, 0.06, 0.07]),
  ],
  [
    "audit-trail",
    { reputationScore: 90, successRate: 98.5, completedTasks: 1800, failedTasks: 27, avgExecutionTime: "0.9s", avgExecutionTimeMs: 900, avgCost: "$0.02", avgCostUsd: 0.02, uptime: 99.96, performance: 98.2, rating: 4.3, reviews: 67 },
    makeHistory([270, 290, 260, 280, 300, 275, 125], [266, 286, 256, 276, 296, 271, 123], [0.9, 1.1, 0.8, 1.0, 1.2, 0.9, 0.7], [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.03]),
  ],
  [
    "liquidity-radar",
    { reputationScore: 93, successRate: 97.8, completedTasks: 3200, failedTasks: 70, avgExecutionTime: "1.3s", avgExecutionTimeMs: 1300, avgCost: "$0.07", avgCostUsd: 0.07, uptime: 99.89, performance: 95.8, rating: 4.6, reviews: 143 },
    makeHistory([480, 520, 460, 500, 540, 490, 310], [469, 509, 450, 490, 529, 480, 303], [1.3, 1.5, 1.2, 1.4, 1.6, 1.3, 1.1], [0.07, 0.06, 0.08, 0.07, 0.06, 0.07, 0.08]),
  ],
  [
    "wallet-sentinel",
    { reputationScore: 96, successRate: 99.0, completedTasks: 7800, failedTasks: 78, avgExecutionTime: "0.7s", avgExecutionTimeMs: 700, avgCost: "$0.02", avgCostUsd: 0.02, uptime: 99.97, performance: 98.1, rating: 4.7, reviews: 256 },
    makeHistory([1160, 1240, 1120, 1200, 1280, 1180, 620], [1148, 1228, 1109, 1188, 1267, 1168, 614], [0.7, 0.9, 0.6, 0.8, 1.0, 0.7, 0.5], [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.03]),
  ],
  [
    "sniper-alpha",
    { reputationScore: 82, successRate: 95.0, completedTasks: 1900, failedTasks: 95, avgExecutionTime: "0.5s", avgExecutionTimeMs: 500, avgCost: "$0.10", avgCostUsd: 0.10, uptime: 98.5, performance: 91.3, rating: 4.2, reviews: 94 },
    makeHistory([280, 310, 260, 290, 320, 285, 155], [266, 295, 247, 276, 304, 271, 147], [0.4, 0.6, 0.5, 0.3, 0.7, 0.5, 0.3], [0.10, 0.08, 0.12, 0.09, 0.11, 0.10, 0.09]),
  ],
  [
    "tax-reporter",
    { reputationScore: 85, successRate: 96.5, completedTasks: 2600, failedTasks: 91, avgExecutionTime: "3.3s", avgExecutionTimeMs: 3300, avgCost: "$0.04", avgCostUsd: 0.04, uptime: 99.93, performance: 97.6, rating: 4.4, reviews: 112 },
    makeHistory([390, 420, 370, 400, 440, 385, 195], [377, 407, 358, 388, 426, 374, 188], [3.2, 3.5, 3.1, 3.4, 3.6, 3.3, 3.0], [0.04, 0.03, 0.05, 0.04, 0.03, 0.04, 0.05]),
  ],
  [
    "chain-scanner",
    { reputationScore: 94, successRate: 98.0, completedTasks: 6100, failedTasks: 122, avgExecutionTime: "1.7s", avgExecutionTimeMs: 1700, avgCost: "$0.06", avgCostUsd: 0.06, uptime: 99.95, performance: 97.9, rating: 4.6, reviews: 198 },
    makeHistory([910, 980, 870, 940, 1010, 920, 470], [892, 961, 853, 921, 990, 902, 461], [1.6, 1.9, 1.5, 1.7, 2.0, 1.6, 1.4], [0.06, 0.05, 0.07, 0.06, 0.05, 0.06, 0.07]),
  ],
  [
    "apy-hunter",
    { reputationScore: 83, successRate: 96.0, completedTasks: 1400, failedTasks: 56, avgExecutionTime: "2.9s", avgExecutionTimeMs: 2900, avgCost: "$0.09", avgCostUsd: 0.09, uptime: 98.7, performance: 93.4, rating: 4.3, reviews: 78 },
    makeHistory([210, 230, 190, 220, 240, 215, 95], [202, 221, 182, 211, 230, 207, 91], [2.8, 3.1, 2.7, 2.9, 3.2, 3.0, 2.6], [0.09, 0.07, 0.11, 0.08, 0.10, 0.09, 0.08]),
  ],
  [
    "position-guard",
    { reputationScore: 89, successRate: 97.2, completedTasks: 3700, failedTasks: 104, avgExecutionTime: "1.0s", avgExecutionTimeMs: 1000, avgCost: "$0.03", avgCostUsd: 0.03, uptime: 97.2, performance: 96.8, rating: 4.5, reviews: 134 },
    makeHistory([550, 590, 520, 570, 610, 560, 300], [535, 574, 506, 555, 594, 545, 291], [1.0, 1.2, 0.9, 1.1, 1.3, 1.0, 0.8], [0.03, 0.02, 0.04, 0.03, 0.02, 0.03, 0.04]),
  ],
  [
    "nft-watcher",
    { reputationScore: 80, successRate: 95.5, completedTasks: 1100, failedTasks: 50, avgExecutionTime: "2.1s", avgExecutionTimeMs: 2100, avgCost: "Free", avgCostUsd: 0, uptime: 99.85, performance: 94.1, rating: 4.1, reviews: 56 },
    makeHistory([170, 190, 150, 180, 200, 175, 35], [162, 182, 143, 172, 191, 167, 33], [2.0, 2.3, 1.9, 2.1, 2.4, 2.0, 1.8], [0, 0, 0, 0, 0, 0, 0]),
  ],
];

function compositeScore(m: PerformanceMetrics): number {
  return Math.round(
    (m.reputationScore * 0.25 +
      m.successRate * 0.25 +
      m.performance * 0.25 +
      m.uptime * 0.25) *
      10
  ) / 10;
}

const reputationMap: Record<string, AgentReputation> = {};

for (const [agentId, metrics, history] of entries) {
  reputationMap[agentId] = {
    agentId,
    metrics,
    history,
    compositeScore: compositeScore(metrics),
    lastUpdated: "2025-08-20T00:00:00Z",
  };
}

export function getAgentReputation(agentId: string): AgentReputation | null {
  return reputationMap[agentId] ?? null;
}

export function getAgentMetrics(agentId: string): PerformanceMetrics | null {
  return reputationMap[agentId]?.metrics ?? null;
}

export function getAgentHistory(agentId: string): PerformanceHistory | null {
  return reputationMap[agentId]?.history ?? null;
}

export function getAllReputations(): AgentReputation[] {
  return Object.values(reputationMap);
}

export function getCompositeScore(agentId: string): number {
  return reputationMap[agentId]?.compositeScore ?? 0;
}

// ── Onchain reputation bridge ─────────────────────────────────

/**
 * Read onchain reputation for an ERC-8004 agent by its numeric tokenId.
 *
 * Returns null data when:
 * - The agent has no feedback onchain
 * - The contract is unreachable
 * - The agentId doesn't exist
 *
 * This function is async and completely separate from the mock data above.
 * It reads directly from the Reputation Registry.
 */
export async function getOnchainReputationSummary(
  agentId: bigint | number,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationSummary | null> {
  try {
    const result = await getOnchainSummary(agentId, [], "", "", chainId);
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Read all onchain feedback for an ERC-8004 agent.
 *
 * Returns empty array when no feedback exists.
 * Each entry contains the raw onchain signal (value, tags, revocation status).
 */
export async function getOnchainFeedbackEntries(
  agentId: bigint | number,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<FeedbackEntry[]> {
  try {
    const result = await readOnchainFeedback(agentId, [], "", "", false, chainId);
    return result.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Get the list of client addresses that have given feedback for an onchain agent.
 */
export async function getOnchainFeedbackClients(
  agentId: bigint | number,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<string[]> {
  try {
    const result = await getOnchainClients(agentId, chainId);
    return (result.data ?? []).map((addr) => addr.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * Build a real ERC-8004 reputation snapshot for an agent.
 *
 * Fetches the client list once, then reads getSummary + readAllFeedback in
 * parallel. Returns a structured snapshot that never throws:
 * - Unsupported chain  → registryAddress "" (UI renders "unavailable")
 * - Registry unreachable → version null, count 0 (UI renders "read failed")
 * - No feedback        → count 0, feedback [] (UI renders "No reviews")
 *
 * Values are never fabricated — zero-feedback stays zero.
 */
export async function getOnchainAgentReputation(
  agentId: bigint | number,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<OnchainReputationData> {
  const id = Number(agentId);
  const chain = Number(chainId);
  const registryAddress = getRegistryAddress(chain) ?? "";
  const base: OnchainReputationData = {
    agentId: id,
    chainId: chain,
    registryAddress,
    version: null,
    count: 0,
    averageValue: null,
    summaryValueDecimals: null,
    tag1: "",
    tag2: "",
    feedback: [],
    readAt: new Date().toISOString(),
  };

  if (!registryAddress) return base;

  try {
    const versionResult = await getVersion(chain);
    const clientsResult = await getOnchainClients(agentId, chain);

    const version = versionResult.data;
    const clients = clientsResult.data ?? [];

    base.version = version;

    if (clients.length === 0) return base;

    const [summaryResult, feedbackResult] = await Promise.all([
      getOnchainSummary(agentId, clients, "", "", chain),
      readOnchainFeedback(agentId, clients, "", "", false, chain),
    ]);

    const summary = summaryResult.data;
    if (summary) {
      base.count = summary.count;
      base.averageValue = summary.summaryValue;
      base.summaryValueDecimals = summary.summaryValueDecimals;
      base.tag1 = summary.tag1;
      base.tag2 = summary.tag2;
    }
    base.feedback = feedbackResult.data ?? [];

    return { ...base, readAt: new Date().toISOString() };
  } catch {
    return base;
  }
}

/**
 * True when a Reputation Registry is configured for the chain.
 */
export function hasOnchainRegistry(chainId: number): boolean {
  return isReputationSupportedChain(chainId);
}
