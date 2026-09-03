import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_CHAIN_IDS,
  ALLOWED_SORT_BY,
  ALLOWED_SORT_ORDER,
  ALLOWED_TIERS,
  CATALOG_SCHEMA_VERSION,
  CatalogChainId,
  CatalogSortBy,
  CatalogSortOrder,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  UpstreamError,
  getCatalogChainLabel,
  listCatalogAgents,
  tallyTiers,
  toCatalogAgentDto,
} from "@/lib/discovery/catalog";
import type { CatalogTier } from "@/lib/discovery/catalog";

export const dynamic = "force-dynamic";

function invalid(message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: "INVALID_PARAMETER", message } },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

function parsePosInt(value: string | null, fallback: number, max: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const n = parseInt(value, 10);
  if (n < 1 || n > max) return null;
  return n;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const chainIdValue = sp.get("chainId") ?? "56";
  const chainId = parseInt(chainIdValue, 10) as CatalogChainId;
  if (!ALLOWED_CHAIN_IDS.includes(chainId as (typeof ALLOWED_CHAIN_IDS)[number])) {
    return invalid(`chainId must be one of: ${ALLOWED_CHAIN_IDS.join(", ")}`);
  }

  const page = parsePosInt(sp.get("page"), 1, Number.MAX_SAFE_INTEGER);
  if (page === null) return invalid("page must be a positive integer");

  const limit = parsePosInt(sp.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  if (limit === null) return invalid(`limit must be an integer between 1 and ${MAX_LIMIT}`);

  const tierParam = sp.get("tier") ?? "all";
  if (!ALLOWED_TIERS.includes(tierParam as (typeof ALLOWED_TIERS)[number])) {
    return invalid(`tier must be one of: ${ALLOWED_TIERS.join(", ")}`);
  }
  const tier = tierParam as (typeof ALLOWED_TIERS)[number];

  const sortParam = sp.get("sortBy") ?? "total_score";
  if (!ALLOWED_SORT_BY.includes(sortParam as CatalogSortBy)) {
    return invalid(`sortBy must be one of: ${ALLOWED_SORT_BY.join(", ")}`);
  }
  const sortBy = sortParam as CatalogSortBy;

  const orderParam = sp.get("sortOrder") ?? "desc";
  if (!ALLOWED_SORT_ORDER.includes(orderParam as CatalogSortOrder)) {
    return invalid(`sortOrder must be one of: ${ALLOWED_SORT_ORDER.join(", ")}`);
  }
  const sortOrder = orderParam as CatalogSortOrder;

  try {
    const result = await listCatalogAgents({ chainId, page, limit, tier, sortBy, sortOrder });
    const tiers = tallyTiers(result.pool);
    const body = {
      success: true,
      source: "8004scan",
      schemaVersion: CATALOG_SCHEMA_VERSION,
      chainId,
      chainLabel: getCatalogChainLabel(chainId),
      data: result.entries.map(toCatalogAgentDto),
      meta: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore,
        tier: tier as CatalogTier,
      },
      tiers,
      pool: {
        size: result.pool.entries.length,
        totalUpstream: result.pool.totalUpstream,
        fetchedAt: result.pool.fetchedAt,
      },
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.kind === "rate_limit" ? 429 : err.kind === "not_found" ? 404 : 502;
      return NextResponse.json(
        { success: false, error: { code: err.kind === "rate_limit" ? "RATE_LIMIT_EXCEEDED" : "UPSTREAM_UNAVAILABLE", message: err.message } },
        { status, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}