import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_CHAIN_IDS,
  CATALOG_SCHEMA_VERSION,
  CatalogChainId,
  UpstreamError,
  classifyCatalogAgent,
  getCatalogAgentDetail,
  getCatalogChainLabel,
  toCatalogAgentDetailDto,
} from "@/lib/discovery/catalog";

export const dynamic = "force-dynamic";

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ chainId: string; tokenId: string }> }
) {
  const { chainId: chainIdParam, tokenId: tokenIdParam } = await ctx.params;

  if (!/^\d+$/.test(chainIdParam)) {
    return errorResponse(400, "INVALID_PARAMETER", "chainId must be a positive integer");
  }
  const chainId = parseInt(chainIdParam, 10) as CatalogChainId;
  if (!ALLOWED_CHAIN_IDS.includes(chainId as (typeof ALLOWED_CHAIN_IDS)[number])) {
    return errorResponse(400, "INVALID_PARAMETER", `chainId must be one of: ${ALLOWED_CHAIN_IDS.join(", ")}`);
  }

  if (!/^\d+$/.test(tokenIdParam)) {
    return errorResponse(400, "INVALID_PARAMETER", "tokenId must be a positive integer");
  }
  const tokenId = parseInt(tokenIdParam, 10);
  if (!Number.isSafeInteger(tokenId) || tokenId < 1) {
    return errorResponse(400, "INVALID_PARAMETER", "tokenId must be a positive integer");
  }

  try {
    const detail = await getCatalogAgentDetail(chainId, tokenId);
    const entry = { agent: detail, ...classifyCatalogAgent(detail) };
    const body = {
      success: true,
      source: "8004scan",
      schemaVersion: CATALOG_SCHEMA_VERSION,
      chainId,
      chainLabel: getCatalogChainLabel(chainId),
      data: toCatalogAgentDetailDto(entry, detail),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=30" },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      if (err.kind === "not_found") {
        return errorResponse(404, "NOT_FOUND", "Agent not found on 8004scan");
      }
      const status = err.kind === "rate_limit" ? 429 : 502;
      return errorResponse(status, err.kind === "rate_limit" ? "RATE_LIMIT_EXCEEDED" : "UPSTREAM_UNAVAILABLE", err.message);
    }
    return errorResponse(500, "INTERNAL_ERROR", "Unexpected server error");
  }
}