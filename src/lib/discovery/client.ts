import type {
  OnchainAgent,
  OnchainAgentDetail,
  HealthStatusData,
  ServiceHealthDetail,
  OnchainAgentFeedback,
  OnchainChain,
  OnchainStats,
  ApiResponse,
  DiscoveryFilters,
} from "./types";

const MAINNET_BASE = "https://8004scan.io/api/v1/public";
const TESTNET_BASE = "https://testnet.8004scan.io/api/v1/public";

const BSC_CHAIN_ID = 56;
const BSC_TESTNET_CHAIN_ID = 97;

let rateLimitRemaining = 10;
let rateLimitReset = 0;

function getBase(isTestnet: boolean): string {
  return isTestnet ? TESTNET_BASE : MAINNET_BASE;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
}

export function normalizeAgent(raw: Record<string, unknown>): OnchainAgent {
  const n = normalizeKeys(raw);
  return {
    id: n.id as string,
    agentId: n.agentId as string,
    tokenId: typeof n.tokenId === "string" ? parseInt(n.tokenId, 10) : (n.tokenId as number),
    chainId: n.chainId as number,
    chainType: n.chainType as string,
    contractAddress: n.contractAddress as string,
    isTestnet: n.isTestnet as boolean,
    ownerId: n.ownerId as string,
    ownerAddress: n.ownerAddress as string,
    ownerEns: (n.ownerEns as string) ?? null,
    ownerUsername: (n.ownerUsername as string) ?? null,
    ownerAvatarUrl: (n.ownerAvatarUrl as string) ?? null,
    name: (n.name as string) ?? null,
    description: (n.description as string) ?? null,
    imageUrl: (n.imageUrl as string) ?? null,
    isVerified: n.isVerified as boolean,
    starCount: n.starCount as number,
    supportedProtocols: (n.supportedProtocols as string[]) ?? [],
    x402Supported: n.x402Supported as boolean,
    totalScore: n.totalScore as number,
    rank: (n.rank as number) ?? null,
    networkRank: (n.networkRank as number) ?? null,
    healthScore: (n.healthScore as number) ?? null,
    totalFeedbacks: n.totalFeedbacks as number,
    averageScore: n.averageScore as number,
    crossChainVersions: (n.crossChainVersions as string) ?? null,
    createdAt: n.createdAt as string,
    updatedAt: n.updatedAt as string,
  };
}

function buildParams(filters: DiscoveryFilters): string {
  const params = new URLSearchParams();
  if (filters.chainId) params.set("chainId", String(filters.chainId));
  if (filters.ownerAddress) params.set("ownerAddress", filters.ownerAddress);
  if (filters.search) params.set("search", filters.search);
  if (filters.protocol) params.set("protocol", filters.protocol);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters.isTestnet !== undefined) params.set("isTestnet", String(filters.isTestnet));
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));
  return params.toString();
}

async function fetchJson<T>(url: string): Promise<ApiResponse<T>> {
  const now = Date.now();
  if (rateLimitRemaining <= 1 && now < rateLimitReset) {
    const waitMs = rateLimitReset - now;
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 2000)));
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  const remain = res.headers.get("X-RateLimit-Remaining");
  const reset = res.headers.get("X-RateLimit-Reset");
  if (remain) rateLimitRemaining = parseInt(remain, 10);
  if (reset) rateLimitReset = new Date(reset).getTime();

  if (res.status === 429) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }
  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`);
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export async function listOnchainAgents(
  filters: DiscoveryFilters = {},
  isTestnet = false
): Promise<{ agents: OnchainAgent[]; total: number; hasMore: boolean }> {
  try {
    const base = getBase(isTestnet);
    const qs = buildParams(filters);
    const resp = await fetchJson<Record<string, unknown>[]>(`${base}/agents?${qs}`);
    return {
      agents: resp.data.map(normalizeAgent),
      total: resp.meta.pagination?.total ?? resp.data.length,
      hasMore: resp.meta.pagination?.hasMore ?? false,
    };
  } catch {
    return { agents: [], total: 0, hasMore: false };
  }
}

export async function getOnchainAgent(
  chainId: number,
  tokenId: number,
  isTestnet = false
): Promise<OnchainAgentDetail | null> {
  try {
    const base = getBase(isTestnet);
    const resp = await fetchJson<Record<string, unknown>>(
      `${base}/agents/${chainId}/${tokenId}`
    );
    const agent = normalizeAgent(resp.data);
    const detail: OnchainAgentDetail = { ...agent };

    const raw = resp.data;
    const rawScores = raw.scores as Record<string, unknown> | undefined;
    if (rawScores) {
      const rawBreakdown = rawScores.breakdown as Record<string, unknown> | undefined;
      const rawLeaderboard = rawBreakdown?.leaderboard_policy as Record<string, unknown> | undefined;
      detail.scores = {
        quality: (rawScores.quality as number) ?? 0,
        popularity: (rawScores.popularity as number) ?? 0,
        activity: (rawScores.activity as number) ?? 0,
        wallet: (rawScores.wallet as number) ?? 0,
        freshness: (rawScores.freshness as number) ?? 0,
        metadataCompleteness: (rawScores.metadata_completeness as number) ?? 0,
        healthScore: (rawScores.health_score as number) ?? 0,
        finalScore: (rawBreakdown?.final_score as number) ?? agent.totalScore,
        leaderboardPolicy: rawLeaderboard ? {
          meritScore: (rawLeaderboard.merit_score as number) ?? 0,
          proofScore: (rawLeaderboard.proof_score as number) ?? 0,
          supportScore: (rawLeaderboard.support_score as number) ?? 0,
          evidenceTier: (rawLeaderboard.evidence_tier as string) ?? "",
          integrityTier: (rawLeaderboard.integrity_tier as string) ?? "",
          discoverabilityTier: (rawLeaderboard.discoverability_tier as string) ?? "",
          feedbackCount: (rawLeaderboard.feedback_count as number) ?? 0,
        } : undefined,
      };
    }

    const rawHealth = raw.health_status as Record<string, unknown> | undefined;
    if (rawHealth) {
      const rawServices = rawHealth.services as Record<string, Record<string, unknown>> | undefined;
      const services: HealthStatusData["services"] = {};
      if (rawServices) {
        for (const [key, svc] of Object.entries(rawServices)) {
          const stats = svc.stats as Record<string, unknown> | undefined;
          services[key] = {
            domain: (svc.domain as string) ?? "",
            status: (svc.status as ServiceHealthDetail["status"]) ?? "skipped",
            message: (svc.message as string) ?? "",
            latencyMs: (svc.latency_ms as number) ?? null,
            domainVerified: (svc.domain_verified as boolean) ?? false,
            verificationStatus: (svc.verification_status as string) ?? "",
            stats: stats ? {
              toolsCount: stats.tools_count as number | undefined,
              promptsCount: stats.prompts_count as number | undefined,
              resourcesCount: stats.resources_count as number | undefined,
              skillsCount: stats.skills_count as number | undefined,
              hasName: stats.has_name as boolean | undefined,
            } : undefined,
          };
        }
      }
      detail.healthStatus = {
        overallStatus: (rawHealth.overall_status as HealthStatusData["overallStatus"]) ?? "unhealthy",
        healthScore: (rawHealth.health_score as number) ?? 0,
        services,
        ownerWallet: rawHealth.owner_wallet as HealthStatusData["ownerWallet"],
        verificationSummary: rawHealth.verification_summary as HealthStatusData["verificationSummary"],
      };
    }

    detail.isEndpointVerified = (raw.is_endpoint_verified as boolean) ?? false;
    detail.endpointVerificationError = (raw.endpoint_verification_error as string) ?? null;
    detail.isActive = (raw.is_active as boolean) ?? true;
    detail.mcpServer = (raw.mcp_server as string) ?? null;
    detail.a2aEndpoint = (raw.a2a_endpoint as string) ?? null;
    detail.tags = (raw.tags as string[]) ?? [];
    detail.categories = (raw.categories as string[]) ?? [];

    detail.supportedTrustModels = (raw.supported_trust_models as string[] | null) ?? null;
    detail.totalValidations = (raw.total_validations as number | null) ?? null;
    detail.successfulValidations = (raw.successful_validations as number | null) ?? null;
    detail.createdTxHash = (raw.created_tx_hash as string) ?? null;
    detail.createdBlockNumber = (raw.created_block_number as number | null) ?? null;
    detail.agentWallet = (raw.agent_wallet as string) ?? null;
    detail.creatorAddress = (raw.creator_address as string) ?? null;
    detail.ownerPublisherTier = (raw.owner_publisher_tier as string) ?? null;
    detail.ownerCertifiedName = (raw.owner_certified_name as string) ?? null;
    detail.watchCount = (raw.watch_count as number | null) ?? null;
    detail.endpointVerifiedAt = (raw.endpoint_verified_at as string) ?? null;
    detail.endpointVerifiedDomain = (raw.endpoint_verified_domain as string) ?? null;
    detail.endpointLastCheckedAt = (raw.endpoint_last_checked_at as string) ?? null;
    detail.healthCheckedAt = (raw.health_checked_at as string) ?? null;

    return detail;
  } catch {
    return null;
  }
}

export async function searchOnchainAgents(
  query: string,
  limit = 20,
  isTestnet = false
): Promise<OnchainAgent[]> {
  try {
    const base = getBase(isTestnet);
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const resp = await fetchJson<Record<string, unknown>[]>(
      `${base}/agents/search?${params}`
    );
    return resp.data.map(normalizeAgent);
  } catch {
    return [];
  }
}

export async function getOnchainAgentFeedback(
  chainId: number,
  tokenId: number,
  isTestnet = false
): Promise<OnchainAgentFeedback[]> {
  try {
    const base = getBase(isTestnet);
    const params = new URLSearchParams({
      chainId: String(chainId),
      tokenId: String(tokenId),
    });
    const resp = await fetchJson<Record<string, unknown>[]>(
      `${base}/feedbacks?${params}`
    );
    return resp.data.map((raw) => {
      const n = normalizeKeys(raw);
      return {
        id: n.id as string,
        chainId: n.chainId as number,
        tokenId: typeof n.tokenId === "string" ? parseInt(n.tokenId, 10) : (n.tokenId as number),
        userId: n.userId as string,
        score: n.score as number,
        comment: (n.comment as string) ?? null,
        createdAt: n.createdAt as string,
      } as OnchainAgentFeedback;
    });
  } catch {
    return [];
  }
}

export async function getOnchainStats(
  isTestnet = false
): Promise<OnchainStats | null> {
  try {
    const base = getBase(isTestnet);
    const resp = await fetchJson<Record<string, unknown>>(`${base}/stats`);
    const n = normalizeKeys(resp.data);
    return {
      totalAgents: n.totalAgents as number,
      totalUsers: n.totalUsers as number,
      totalValidators: n.totalValidators as number,
      totalFeedbacks: n.totalFeedbacks as number,
      totalChats: n.totalChats as number,
      totalMessages: n.totalMessages as number,
      dailyNewAgents: n.dailyNewAgents as number,
      dailyNewUsers: n.dailyNewUsers as number,
      dailyFeedbacks: n.dailyFeedbacks as number,
      averageFeedbackScore: n.averageFeedbackScore as number,
    } as OnchainStats;
  } catch {
    return null;
  }
}

export async function getOnchainChains(): Promise<OnchainChain[]> {
  try {
    const resp = await fetchJson<Record<string, unknown>[]>(`${MAINNET_BASE}/chains`);
    return resp.data.map((raw) => {
      const n = normalizeKeys(raw);
      return {
        chainId: n.chainId as number,
        name: n.name as string,
        isTestnet: n.isTestnet as boolean,
        explorerUrl: n.explorerUrl as string,
      } as OnchainChain;
    });
  } catch {
    return [];
  }
}

export async function getBscAgents(
  page = 1,
  limit = 20
): Promise<{ agents: OnchainAgent[]; total: number; hasMore: boolean }> {
  return listOnchainAgents(
    { chainId: BSC_CHAIN_ID, page, limit, sortBy: "created_at", sortOrder: "desc" },
    false
  );
}

export async function getBscTestnetAgents(
  page = 1,
  limit = 20
): Promise<{ agents: OnchainAgent[]; total: number; hasMore: boolean }> {
  return listOnchainAgents(
    { chainId: BSC_TESTNET_CHAIN_ID, page, limit, sortBy: "created_at", sortOrder: "desc" },
    true
  );
}
