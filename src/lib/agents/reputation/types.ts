import type { FeedbackEntry } from "./onchain";

export interface PerformanceMetrics {
  reputationScore: number;
  successRate: number;
  completedTasks: number;
  failedTasks: number;
  avgExecutionTime: string;
  avgExecutionTimeMs: number;
  avgCost: string;
  avgCostUsd: number;
  uptime: number;
  performance: number;
  rating: number;
  reviews: number;
}

export interface PerformanceHistory {
  daily: {
    date: string;
    tasks: number;
    successes: number;
    failures: number;
    avgSpeed: number;
    avgCost: number;
    uptime: number;
  }[];
}

export interface AgentReputation {
  agentId: string;
  metrics: PerformanceMetrics;
  history: PerformanceHistory;
  compositeScore: number;
  lastUpdated: string;
}

/**
 * Real ERC-8004 reputation snapshot read from the Reputation Registry.
 *
 * Never fabricated: every field reflects a live get clients / getSummary /
 * readAllFeedback read (or an explicit zero-value fallback when the agent
 * has no feedback). `registryAddress === ""` means the chain is unsupported.
 */
export interface OnchainReputationData {
  agentId: number;
  chainId: number;
  /** Reputation Registry proxy address for the agent's chain. Empty when unsupported. */
  registryAddress: string;
  /** Registry version (e.g. "2.0.0"). Null when the registry could not be read. */
  version: string | null;
  /** Total (non-revoked) feedback count. */
  count: number;
  /** Average feedback value (decoded). Null when count === 0 or unreadable. */
  averageValue: number | null;
  /** Decimals of the aggregate summary value. */
  summaryValueDecimals: number | null;
  tag1: string;
  tag2: string;
  /** Individual feedback entries (all non-revoked by default). */
  feedback: FeedbackEntry[];
  readAt: string;
}
