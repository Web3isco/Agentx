export interface OnchainAgent {
  id: string;
  agentId: string;
  tokenId: number;
  chainId: number;
  chainType: string;
  contractAddress: string;
  isTestnet: boolean;
  ownerId: string;
  ownerAddress: string;
  ownerEns: string | null;
  ownerUsername: string | null;
  ownerAvatarUrl: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  starCount: number;
  supportedProtocols: string[];
  x402Supported: boolean;
  totalScore: number;
  rank: number | null;
  networkRank: number | null;
  healthScore: number | null;
  totalFeedbacks: number;
  averageScore: number;
  crossChainVersions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHealthDetail {
  domain: string;
  status: "healthy" | "degraded" | "unhealthy" | "skipped";
  message: string;
  latencyMs: number | null;
  domainVerified: boolean;
  verificationStatus: string;
  stats?: {
    toolsCount?: number;
    promptsCount?: number;
    resourcesCount?: number;
    skillsCount?: number;
    hasName?: boolean;
  };
}

export interface HealthStatusData {
  overallStatus: "healthy" | "degraded" | "unhealthy";
  healthScore: number;
  services: Record<string, ServiceHealthDetail>;
  ownerWallet?: {
    status: string;
    message: string;
  } | null;
  verificationSummary?: {
    anyVerified: boolean;
    verifiedCount: number;
    verifiableCount: number;
  };
}

export interface ScoreBreakdown {
  quality: number;
  popularity: number;
  activity: number;
  wallet: number;
  freshness: number;
  metadataCompleteness: number;
  healthScore: number;
  finalScore: number;
  leaderboardPolicy?: {
    meritScore: number;
    proofScore: number;
    supportScore: number;
    evidenceTier: string;
    integrityTier: string;
    discoverabilityTier: string;
    feedbackCount: number;
  };
}

export interface OnchainAgentDetail extends OnchainAgent {
  scores?: ScoreBreakdown;
  healthStatus?: HealthStatusData;
  isEndpointVerified?: boolean;
  endpointVerificationError?: string | null;
  isActive?: boolean;
  mcpServer?: string | null;
  a2aEndpoint?: string | null;
  tags?: string[];
  categories?: string[];
  /** Supported trust models (real 8004scan values, e.g. ["tee-attestation","reputation"]). Null when absent. */
  supportedTrustModels?: string[] | null;
  /** Total registered validations (real 8004scan value). Null when absent. */
  totalValidations?: number | null;
  /** Successful validations (real 8004scan value). Null when absent. */
  successfulValidations?: number | null;
  /** Creation transaction hash onchain. Null when absent. */
  createdTxHash?: string | null;
  /** Creation block number onchain. Null when absent. */
  createdBlockNumber?: number | null;
  /** Dedicated agent wallet address. Null when absent. */
  agentWallet?: string | null;
  /** Creator address who registered the agent. Null when absent. */
  creatorAddress?: string | null;
  /** Owner publisher tier (real 8004scan value). Null when absent. */
  ownerPublisherTier?: string | null;
  /** Owner certified name (real 8004scan value). Null when absent. */
  ownerCertifiedName?: string | null;
  /** Watch count (real 8004scan value). Null when absent. */
  watchCount?: number | null;
  /** Endpoint verification ISO timestamp. Null when absent/never verified. */
  endpointVerifiedAt?: string | null;
  /** Endpoint verification domain. Null when absent. */
  endpointVerifiedDomain?: string | null;
  /** Last endpoint check ISO timestamp. Null when absent. */
  endpointLastCheckedAt?: string | null;
  /** Last health check ISO timestamp. Null when absent. */
  healthCheckedAt?: string | null;
}

export interface OnchainAgentFeedback {
  id: string;
  chainId: number;
  tokenId: number;
  userId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface OnchainChain {
  chainId: number;
  name: string;
  isTestnet: boolean;
  explorerUrl: string;
}

export interface OnchainStats {
  totalAgents: number;
  totalUsers: number;
  totalValidators: number;
  totalFeedbacks: number;
  totalChats: number;
  totalMessages: number;
  dailyNewAgents: number;
  dailyNewUsers: number;
  dailyFeedbacks: number;
  averageFeedbackScore: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    version: string;
    timestamp: string;
    requestId: string;
    pagination?: Pagination;
  };
}

export interface DiscoveryFilters {
  chainId?: number;
  ownerAddress?: string;
  search?: string;
  protocol?: string;
  sortBy?: "created_at" | "stars" | "name" | "token_id" | "total_score";
  sortOrder?: "asc" | "desc";
  isTestnet?: boolean;
  page?: number;
  limit?: number;
}
