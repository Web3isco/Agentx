import type {
  OnchainAgent,
  OnchainAgentDetail,
  ScoreBreakdown,
  HealthStatusData,
  ServiceHealthDetail,
} from "./types";
import { normalizeAgent } from "./client";

/**
 * Server-side curated catalog of real ERC-8004 agents from the 8004scan
 * Public API (BSC Mainnet, chainId 56 / testnet 97).
 *
 * Design rules:
 * - Every value flows from 8004scan. We never fabricate ratings, prices,
 *   health, uptime or verification. Missing data stays null.
 * - Curation tiers (featured / promising / new / listed) are AGENTX-authored
 *   labels derived with deterministic constants. They are a separate concept
 *   from the quality tiering already used by the discovery UI.
 * - The curated pool is fetched server-side with an in-memory TTL cache and
 *   reuses the existing OnchainAgent normalizer.
 */

export const CATALOG_SCHEMA_VERSION = "1";

export const ALLOWED_CHAIN_IDS = [56, 97] as const;
export type CatalogChainId = (typeof ALLOWED_CHAIN_IDS)[number];

export type CatalogTier = "featured" | "promising" | "new" | "listed";
export type CatalogSortBy =
  | "total_score"
  | "created_at"
  | "feedbacks"
  | "name"
  | "token_id";
export type CatalogSortOrder = "asc" | "desc";

export const ALLOWED_TIERS = ["all", "featured", "promising", "new"] as const;
export const ALLOWED_SORT_BY: CatalogSortBy[] = [
  "total_score",
  "created_at",
  "feedbacks",
  "name",
  "token_id",
];
export const ALLOWED_SORT_ORDER: CatalogSortOrder[] = ["asc", "desc"];
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;

/** Pool is the top-scored hasMcp=true slice of a chain: 4 pages x 100. */
const POOL_PAGES = 4;
const POOL_LIMIT = 100;
const POOL_SORT_BY: CatalogSortBy = "total_score";
const POOL_SORT_ORDER: CatalogSortOrder = "desc";

/** A user-submitted on-chain feedback exists AND the endpoint health is confirmed. */
const FEATURED_MIN_FEEDBACKS = 1;
const FEATURED_MIN_HEALTH = 90;

/** Reachable MCP endpoint plus a second protocol, or a confirmed-healthy endpoint. */
const PROMISING_MIN_HEALTH = 90;
const PROMISING_MIN_PROTOCOLS = 2;

/** Recency window for the "new" curation tier. */
const NEW_WINDOW_DAYS = 60;

const POOL_TTL_MS = 5 * 60 * 1000;
const DETAIL_TTL_MS = 2 * 60 * 1000;
/** Upstream 8004scan is deliberately slow; individual requests can stall. */
const REQUEST_TIMEOUT_MS = 45_000;
const PAGE_RETRY_COUNT = 3;
const PAGE_RETRY_BACKOFF_MS = 2_000;
/** Reject cache so an upstream outage doesn't stampede external requests. */
const POOL_ERROR_TTL_MS = 60 * 1000;
const DETAIL_ERROR_TTL_MS = 30 * 1000;

const CHAIN_BASES: Record<number, { base: string; label: string; isTestnet: boolean }> = {
  56: { base: "https://8004scan.io/api/v1/public", label: "BSC Mainnet", isTestnet: false },
  97: { base: "https://testnet.8004scan.io/api/v1/public", label: "BSC Testnet", isTestnet: true },
};

export function getCatalogChainLabel(chainId: number): string {
  return CHAIN_BASES[chainId]?.label ?? `chain ${chainId}`;
}

export class UpstreamError extends Error {
  readonly kind: "rate_limit" | "not_found" | "http" | "timeout" | "network";
  readonly status?: number;
  readonly statusText?: string;

  constructor(
    kind: UpstreamError["kind"],
    message: string,
    opts: { status?: number; statusText?: string } = {}
  ) {
    super(message);
    this.name = "UpstreamError";
    this.kind = kind;
    this.status = opts.status;
    this.statusText = opts.statusText;
  }
}

export interface CatalogAgentEntry {
  agent: OnchainAgent;
  catalogTier: CatalogTier;
  isFeatured: boolean;
  isNew: boolean;
  curationReasons: string[];
}

export interface CatalogPool {
  chainId: number;
  chainLabel: string;
  fetchedAt: string;
  totalUpstream: number;
  entries: CatalogAgentEntry[];
}

export interface CatalogListOptions {
  chainId: CatalogChainId;
  page: number;
  limit: number;
  tier: (typeof ALLOWED_TIERS)[number];
  sortBy: CatalogSortBy;
  sortOrder: CatalogSortOrder;
}

export interface CatalogListResult {
  entries: CatalogAgentEntry[];
  total: number;
  hasMore: boolean;
  pool: CatalogPool;
}

/** Full detail payload returned by the enriched 8004scan agents endpoint. */
export interface ParseStatusDetail {
  status: string;
  errors: string[];
  warnings: string[];
  info: string[];
  lastParsedAt: string | null;
}

export interface CatalogAgentDetail extends OnchainAgentDetail {
  parseStatus: ParseStatusDetail | null;
  supportedTrustModels: string[] | null;
  mcpVersion: string | null;
  a2aVersion: string | null;
  totalValidations: number | null;
  successfulValidations: number | null;
  serviceKeys: string[];
  agentUrl: string | null;
  creatorAddress: string | null;
  agentType: string | null;
}

interface RawEnvelope<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: { total?: number; hasMore?: boolean };
  };
  error?: { code?: string; message?: string };
}

function toMs(value: string): number {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= PAGE_RETRY_COUNT; attempt++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
      } finally {
        clearTimeout(timer);
      }
      if (res.status === 429) throw new UpstreamError("rate_limit", "8004scan rate limit exceeded", { status: 429 });
      if (!res.ok) throw new UpstreamError("http", `8004scan returned HTTP ${res.status}`, { status: res.status, statusText: res.statusText });
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof UpstreamError) {
        if (err.kind === "rate_limit") throw err;
        if (err.kind === "http" && err.status !== undefined && err.status < 500) throw err;
      }
      if (attempt < PAGE_RETRY_COUNT) {
        await new Promise((r) => setTimeout(r, PAGE_RETRY_BACKOFF_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw new UpstreamError("network", lastError?.message ?? "upstream request failed");
}

/**
 * Deterministic AGENTX curation of a single agent, based only on fields that
 * 8004scan actually returns in the list payload. Priority order:
 * featured > promising > new > listed.
 */
export function classifyCatalogAgent(agent: OnchainAgent, now: number = Date.now()): Omit<CatalogAgentEntry, "agent"> {
  const reasons: string[] = [];
  const protocolsLower = agent.supportedProtocols.map((p) => p.toLowerCase());

  const isFeatured =
    agent.totalFeedbacks >= FEATURED_MIN_FEEDBACKS &&
    agent.healthScore !== null &&
    agent.healthScore >= FEATURED_MIN_HEALTH;

  const isPromising =
    !isFeatured &&
    protocolsLower.includes("mcp") &&
    (agent.supportedProtocols.length >= PROMISING_MIN_PROTOCOLS ||
      (agent.healthScore !== null && agent.healthScore >= PROMISING_MIN_HEALTH));

  const ageMs = now - toMs(agent.createdAt);
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const isNew = ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  if (isFeatured) {
    reasons.push(`${agent.totalFeedbacks} on-chain ${agent.totalFeedbacks === 1 ? "feedback" : "feedbacks"}`);
    reasons.push(`confirmed endpoint health ${agent.healthScore}/100`);
  } else if (isPromising) {
    if (agent.supportedProtocols.length >= PROMISING_MIN_PROTOCOLS) {
      reasons.push(`${agent.supportedProtocols.length} protocols (${agent.supportedProtocols.join(", ")})`);
    }
    if (agent.healthScore !== null && agent.healthScore >= PROMISING_MIN_HEALTH) {
      reasons.push(`confirmed endpoint health ${agent.healthScore}/100`);
    }
  } else if (isNew) {
    reasons.push(`registered ${ageDays} day${ageDays === 1 ? "" : "s"} ago`);
    if (agent.totalFeedbacks === 0) reasons.push("no user feedback yet");
  }

  const tier: CatalogTier = isFeatured ? "featured" : isPromising ? "promising" : isNew ? "new" : "listed";
  return { catalogTier: tier, isFeatured, isNew, curationReasons: reasons };
}

async function fetchPoolPage(
  base: string,
  chainId: number,
  page: number
): Promise<RawEnvelope<Record<string, unknown>[]>> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    hasMcp: "true",
    sortBy: POOL_SORT_BY,
    sortOrder: POOL_SORT_ORDER,
    limit: String(POOL_LIMIT),
    page: String(page),
  });
  const res = await fetchWithRetry(`${base}/agents?${params.toString()}`);
  return res.json() as Promise<RawEnvelope<Record<string, unknown>[]>>;
}

interface FailedPoolEntry {
  at: number;
  error: UpstreamError;
}

const poolCache = new Map<number, { at: number; pool: CatalogPool }>();
const poolErrorCache = new Map<number, FailedPoolEntry>();
const poolInflight = new Map<number, Promise<CatalogPool>>();

export async function getCatalogPool(chainId: CatalogChainId = 56): Promise<CatalogPool> {
  const meta = CHAIN_BASES[chainId];
  if (!meta) throw new UpstreamError("http", `unsupported chain ${chainId}`);

  const cached = poolCache.get(chainId);
  if (cached && Date.now() - cached.at < POOL_TTL_MS) return cached.pool;

  const failed = poolErrorCache.get(chainId);
  if (failed && Date.now() - failed.at < POOL_ERROR_TTL_MS) throw failed.error;

  // Single-flight: concurrent callers share one upstream build (avoids
  // stampede against the anonymous rate limiter).
  const inflight = poolInflight.get(chainId);
  if (inflight) return inflight;

  const build = (async () => {
    let totalUpstream = 0;
    const entries: CatalogAgentEntry[] = [];

    // Sequential: avoid bursts that trip the anonymous rate limiter.
    for (let page = 1; page <= POOL_PAGES; page++) {
      let env: RawEnvelope<Record<string, unknown>[]> | null = null;
      try {
        env = await fetchPoolPage(meta.base, chainId, page);
      } catch (err) {
        const error = err instanceof UpstreamError ? err : new UpstreamError("network", String(err));
        if (page === 1) {
          // Page 1 is the anchor of the curated pool: fail fast rather than
          // serving a partial (misleading) slice. Later pages degrade gracefully.
          poolErrorCache.set(chainId, { at: Date.now(), error });
          throw error;
        }
        // Partial failure: keep whatever real pages succeeded.
        break;
      }
      if (!Array.isArray(env.data) || env.data.length === 0) break;
      if (page === 1) totalUpstream = env.meta?.pagination?.total ?? 0;
      const now = Date.now();
      for (const raw of env.data) {
        const agent = normalizeAgent(raw);
        if (!agent.tokenId) continue;
        entries.push({ agent, ...classifyCatalogAgent(agent, now) });
      }
    }

    if (entries.length === 0) {
      const error = new UpstreamError("network", `8004scan returned an empty curated pool`, {});
      poolErrorCache.set(chainId, { at: Date.now(), error });
      throw error;
    }

    const pool: CatalogPool = {
      chainId,
      chainLabel: meta.label,
      fetchedAt: new Date().toISOString(),
      totalUpstream,
      entries,
    };
    poolCache.set(chainId, { at: Date.now(), pool });
    return pool;
  })();

  poolInflight.set(chainId, build);
  try {
    return await build;
  } finally {
    poolInflight.delete(chainId);
  }
}

const COMPARATORS: Record<CatalogSortBy, (a: CatalogAgentEntry, b: CatalogAgentEntry) => number> = {
  total_score: (a, b) => b.agent.totalScore - a.agent.totalScore,
  created_at: (a, b) => toMs(b.agent.createdAt) - toMs(a.agent.createdAt),
  feedbacks: (a, b) => b.agent.totalFeedbacks - a.agent.totalFeedbacks,
  name: (a, b) => a.agent.name.localeCompare(b.agent.name),
  token_id: (a, b) => a.agent.tokenId - b.agent.tokenId,
};

function compareEntries(
  a: CatalogAgentEntry,
  b: CatalogAgentEntry,
  sortBy: CatalogSortBy,
  sortOrder: CatalogSortOrder
): number {
  const base = COMPARATORS[sortBy](a, b);
  if (base !== 0) return sortOrder === "asc" ? base : -base;
  return a.agent.tokenId - b.agent.tokenId;
}

export async function listCatalogAgents(opts: CatalogListOptions): Promise<CatalogListResult> {
  const pool = await getCatalogPool(opts.chainId);

  const filtered =
    opts.tier === "all" ? pool.entries : pool.entries.filter((e) => e.catalogTier === opts.tier);
  const sorted = [...filtered].sort((a, b) => compareEntries(a, b, opts.sortBy, opts.sortOrder));

  const start = (opts.page - 1) * opts.limit;
  const pageEntries = sorted.slice(start, start + opts.limit);

  return {
    entries: pageEntries,
    total: sorted.length,
    hasMore: start + opts.limit < sorted.length,
    pool,
  };
}

export interface TierCounts {
  featured: number;
  promising: number;
  new: number;
  listed: number;
  total: number;
}

export function tallyTiers(pool: CatalogPool): TierCounts {
  const counts: TierCounts = { featured: 0, promising: 0, new: 0, listed: 0, total: pool.entries.length };
  for (const entry of pool.entries) counts[entry.catalogTier]++;
  return counts;
}

/**
 * JSON-safe DTO. Mirrors the 8004scan fields faithfully and never invents
 * ratings or prices. averageScore is only exposed when a real on-chain
 * feedback count exists AND the reported average is above zero; otherwise it
 * stays null so clients can display a "no reviews" state.
 */
export interface CatalogAgentDto {
  id: string;
  tokenId: number;
  chainId: number;
  chainType: string;
  contractAddress: string;
  isTestnet: boolean;
  ownerUsername: string | null;
  ownerAddress: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  protocols: string[];
  x402Supported: boolean;
  isVerified: boolean;
  starCount: number;
  totalScore: number;
  healthScore: number | null;
  totalFeedbacks: number;
  averageScore: number | null;
  createdAt: string;
  updatedAt: string;
  catalogTier: CatalogTier;
  isFeatured: boolean;
  isNew: boolean;
  curationReasons: string[];
}

export function toCatalogAgentDto(entry: CatalogAgentEntry): CatalogAgentDto {
  const a = entry.agent;
  return {
    id: `onchain-${a.chainId}-${a.tokenId}`,
    tokenId: a.tokenId,
    chainId: a.chainId,
    chainType: a.chainType,
    contractAddress: a.contractAddress,
    isTestnet: a.isTestnet,
    ownerUsername: a.ownerUsername,
    ownerAddress: a.ownerAddress,
    name: a.name,
    description: a.description,
    imageUrl: a.imageUrl,
    protocols: a.supportedProtocols,
    x402Supported: a.x402Supported,
    isVerified: a.isVerified,
    starCount: a.starCount,
    totalScore: a.totalScore,
    healthScore: a.healthScore,
    totalFeedbacks: a.totalFeedbacks,
    averageScore: a.averageScore > 0 && a.totalFeedbacks > 0 ? a.averageScore : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    catalogTier: entry.catalogTier,
    isFeatured: entry.isFeatured,
    isNew: entry.isNew,
    curationReasons: entry.curationReasons,
  };
}

const detailCache = new Map<string, { at: number; detail: CatalogAgentDetail }>();
const detailErrorCache = new Map<string, FailedPoolEntry>();

/**
 * Full 8004scan detail for one agent (enriched agents endpoint). Cached for
 * DETAIL_TTL_MS. Throws UpstreamError: kind "not_found" (404) is
 * differentiated from upstream/network failures so the gateway can answer
 * with the correct HTTP status.
 */
export async function getCatalogAgentDetail(
  chainId: CatalogChainId,
  tokenId: number
): Promise<CatalogAgentDetail> {
  const meta = CHAIN_BASES[chainId];
  if (!meta) throw new UpstreamError("http", `unsupported chain ${chainId}`);

  const key = `${chainId}/${tokenId}`;
  const cached = detailCache.get(key);
  if (cached && Date.now() - cached.at < DETAIL_TTL_MS) return cached.detail;

  const failed = detailErrorCache.get(key);
  if (failed && Date.now() - failed.at < DETAIL_ERROR_TTL_MS) throw failed.error;

  let res: Response;
  try {
    res = await fetchWithRetry(`${meta.base}/agents/${chainId}/${tokenId}`);
  } catch (err) {
    let error = err instanceof UpstreamError ? err : new UpstreamError("network", String(err));
    if (error.kind === "http" && error.status === 404) {
      error = new UpstreamError("not_found", `agent ${chainId}/${tokenId} not found`, { status: 404 });
    }
    if (error.kind !== "not_found") {
      detailErrorCache.set(key, { at: Date.now(), error });
    }
    throw error;
  }
  const env = (await res.json()) as RawEnvelope<Record<string, unknown>> & {
    error?: { code?: string; message?: string };
  };

  if (!env.success || !env.data) {
    const error =
      env.error?.code === "NOT_FOUND"
        ? new UpstreamError("not_found", `agent ${chainId}/${tokenId} not found`, { status: 404 })
        : new UpstreamError("http", env.error?.message ?? "8004scan detail request failed", {
            status: res.status,
          });
    if (error.kind !== "not_found") {
      detailErrorCache.set(key, { at: Date.now(), error });
    }
    throw error;
  }

  const raw = env.data;
  const agent = normalizeAgent(raw);
  const detail: CatalogAgentDetail = {
    ...agent,
    parseStatus: null,
    supportedTrustModels: null,
    mcpVersion: null,
    a2aVersion: null,
    totalValidations: null,
    successfulValidations: null,
    serviceKeys: [],
    agentUrl: null,
    creatorAddress: null,
    agentType: null,
  };

  const rawScores = raw.scores as Record<string, unknown> | undefined;
  if (rawScores) {
    const rawBreakdown = rawScores.breakdown as Record<string, unknown> | undefined;
    const rawLeaderboard = rawBreakdown?.leaderboard_policy as Record<string, unknown> | undefined;
    const scores: ScoreBreakdown = {
      quality: (rawScores.quality as number) ?? 0,
      popularity: (rawScores.popularity as number) ?? 0,
      activity: (rawScores.activity as number) ?? 0,
      wallet: (rawScores.wallet as number) ?? 0,
      freshness: (rawScores.freshness as number) ?? 0,
      metadataCompleteness: (rawScores.metadata_completeness as number) ?? 0,
      healthScore: (rawScores.health_score as number) ?? 0,
      finalScore: (rawBreakdown?.final_score as number) ?? agent.totalScore,
      leaderboardPolicy: rawLeaderboard
        ? {
            meritScore: (rawLeaderboard.merit_score as number) ?? 0,
            proofScore: (rawLeaderboard.proof_score as number) ?? 0,
            supportScore: (rawLeaderboard.support_score as number) ?? 0,
            evidenceTier: (rawLeaderboard.evidence_tier as string) ?? "",
            integrityTier: (rawLeaderboard.integrity_tier as string) ?? "",
            discoverabilityTier: (rawLeaderboard.discoverability_tier as string) ?? "",
            feedbackCount: (rawLeaderboard.feedback_count as number) ?? 0,
          }
        : undefined,
    };
    detail.scores = scores;
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
          stats: stats
            ? {
                toolsCount: stats.tools_count as number | undefined,
                promptsCount: stats.prompts_count as number | undefined,
                resourcesCount: stats.resources_count as number | undefined,
                skillsCount: stats.skills_count as number | undefined,
                hasName: stats.has_name as boolean | undefined,
              }
            : undefined,
        };
      }
    }
    const hp = rawHealth.overall_status as HealthStatusData["overallStatus"] | undefined;
    detail.healthStatus = {
      overallStatus: hp && ["healthy", "degraded", "unhealthy"].includes(hp) ? hp : "unhealthy",
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

  detail.parseStatus = (() => {
    const ps = raw.parse_status as Record<string, unknown> | undefined;
    if (!ps || typeof ps !== "object") return null;
    return {
      status: typeof ps.status === "string" ? ps.status : "",
      errors: Array.isArray(ps.errors) ? (ps.errors as string[]) : [],
      warnings: Array.isArray(ps.warnings) ? (ps.warnings as string[]) : [],
      info: Array.isArray(ps.info) ? (ps.info as string[]) : [],
      lastParsedAt: typeof ps.last_parsed_at === "string" ? ps.last_parsed_at : null,
    };
  })();
  detail.supportedTrustModels = (raw.supported_trust_models as string[] | null) ?? null;
  detail.mcpVersion = (raw.mcp_version as string) ?? null;
  detail.a2aVersion = (raw.a2a_version as string) ?? null;
  detail.totalValidations = (raw.total_validations as number | null) ?? null;
  detail.successfulValidations = (raw.successful_validations as number | null) ?? null;
  detail.serviceKeys = Object.keys((raw.services as Record<string, unknown>) ?? {});
  detail.agentUrl = (raw.agent_url as string) ?? null;
  detail.creatorAddress = (raw.creator_address as string) ?? null;
  detail.agentType = (raw.agent_type as string) ?? null;

  detailCache.set(key, { at: Date.now(), detail });
  return detail;
}

export interface CatalogAgentDetailDto extends CatalogAgentDto {
  isEndpointVerified: boolean;
  parseStatus: ParseStatusDetail | null;
  supportedTrustModels: string[] | null;
  mcpServer: string | null;
  mcpVersion: string | null;
  a2aEndpoint: string | null;
  a2aVersion: string | null;
  totalValidations: number | null;
  successfulValidations: number | null;
  services: string[];
  agentUrl: string | null;
  creatorAddress: string | null;
  agentType: string | null;
  healthStatus: HealthStatusData | null;
  scores: ScoreBreakdown | null;
}

export function toCatalogAgentDetailDto(
  entry: CatalogAgentEntry,
  detail: CatalogAgentDetail
): CatalogAgentDetailDto {
  return {
    ...toCatalogAgentDto(entry),
    isEndpointVerified: detail.isEndpointVerified ?? false,
    parseStatus: detail.parseStatus,
    supportedTrustModels: detail.supportedTrustModels,
    mcpServer: detail.mcpServer ?? null,
    mcpVersion: detail.mcpVersion,
    a2aEndpoint: detail.a2aEndpoint ?? null,
    a2aVersion: detail.a2aVersion,
    totalValidations: detail.totalValidations,
    successfulValidations: detail.successfulValidations,
    services: detail.serviceKeys,
    agentUrl: detail.agentUrl,
    creatorAddress: detail.creatorAddress,
    agentType: detail.agentType,
    healthStatus: detail.healthStatus ?? null,
    scores: detail.scores ?? null,
  };
}