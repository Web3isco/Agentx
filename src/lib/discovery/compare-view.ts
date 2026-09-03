"use client";

import { useEffect, useState } from "react";
import { enrichOnchainAgentDetail } from "@/components/agent/agent-detail-data";
import { getDiscoveredAgents, isDiscoveredAgentId } from "./service";

/**
 * Real onchain view-model for the Compare + Benchmark experiences.
 *
 * This is NOT a second data layer: it reuses the existing discovery / detail /
 * reputation pipeline (`enrichOnchainAgentDetail`, which itself reads 8004scan
 * + ERC-8004) so onchain agents show genuine values instead of fabricated
 * placeholders. Every value below is honest — `null` means "unavailable" and
 * the UI renders it as "—". Nothing is ever synthesized.
 */

export interface OnchainCompareView {
  id: string;
  name: string;
  avatar: string;
  color: string;
  verified: boolean;
  category: string;
  chain: string;
  /** Real 8004scan total reputation score (0–100). */
  reputationScore: number | null;
  /** Real average feedback value from the ERC-8004 registry (0–100). */
  successRate: number | null;
  /** Real feedback (review) count. */
  feedbackCount: number | null;
  /** Real 8004scan health score (0–100). */
  healthScore: number | null;
  /** Real end-point / service health overall status, if reported. */
  healthStatus: string | null;
  /** Derived 1–5 rating from the real total score (only when feedback exists). */
  rating: number | null;
  /** Real price — only when an actual x402 value exists, else null. */
  price: string | null;
  /** Real chain name. */
  chainName: string | null;
  /** Real declared protocols (MCP / A2A / …). */
  protocols: string[];
  /** Real endpoint verification status. */
  isEndpointVerified: boolean | null;
  endpointVerificationError: string | null;
  endpointVerifiedDomain: string | null;
  /** Real supported trust models. */
  trustModels: string[];
  /** Real validation counts. */
  totalValidations: number | null;
  successfulValidations: number | null;
  /** Real service endpoints (name + status), not fabricated. */
  services: string[];
  /** Real star & watch counts. */
  starCount: number | null;
  watchCount: number | null;
  /** Real onchain rank (from 8004scan), if ranked. */
  rank: number | null;
  /** Real creation block number. */
  createdBlockNumber: number | null;
}

const detailCache = new Map<string, OnchainCompareView | null>();

/**
 * Build the real onchain view-model for one `onchain-{chainId}-{tokenId}` id.
 * Returns null for non-onchain ids or when real detail cannot be resolved.
 */
export async function loadOnchainCompareData(
  id: string
): Promise<OnchainCompareView | null> {
  if (!isDiscoveredAgentId(id)) return null;
  if (detailCache.has(id)) return detailCache.get(id) ?? null;

  let view: OnchainCompareView | null = null;
  try {
    const detail = await enrichOnchainAgentDetail(id);
    // Reject the offline fallback placeholder (synthesized when 8004scan is
    // unreachable) so we never present fabricated values in Compare/Benchmark.
    if (detail && detail.contractAddress !== "0x0000...0000") {
      const trust = detail.onchainTrust;
      const rep = detail.onchainReputation;
      const hasFeedback = detail.reviews > 0;
      const successRate =
        rep?.averageValue != null
          ? rep.averageValue
          : detail.successRate > 0
            ? detail.successRate
            : null;

      const healthScore =
        typeof detail.uptime === "number" && detail.uptime > 0
          ? detail.uptime
          : null;

      view = {
        id,
        name: detail.name,
        avatar: detail.avatar,
        color: detail.color,
        verified: !!trust?.endpointVerifiedAt,
        category: detail.category,
        chain: detail.chain,
        reputationScore:
          typeof detail.reputation === "number" ? detail.reputation : null,
        successRate,
        feedbackCount: detail.reviews,
        healthScore,
        healthStatus:
          healthScore == null
            ? null
            : healthScore >= 80
              ? "healthy"
              : healthScore >= 60
                ? "degraded"
                : "unhealthy",
        rating: hasFeedback && detail.rating > 0 ? detail.rating : null,
        price:
          detail.price && detail.price !== "Unknown" ? detail.price : null,
        chainName: detail.chain,
        protocols: detail.supportedProtocols.map((p) => p.name),
        isEndpointVerified: trust?.endpointVerifiedAt
          ? true
          : null,
        endpointVerificationError: null,
        endpointVerifiedDomain: trust?.endpointVerifiedDomain ?? null,
        trustModels: trust?.supportedTrustModels ?? [],
        totalValidations: trust?.totalValidations ?? null,
        successfulValidations: trust?.successfulValidations ?? null,
        services: (detail.endpoints ?? []).map(
          (e) => `${e.name}: ${e.status}`
        ),
        starCount: trust?.starCount ?? null,
        watchCount: trust?.watchCount ?? null,
        rank: null,
        createdBlockNumber: trust?.createdBlockNumber ?? null,
      };
    }
  } catch {
    view = null;
  }

  detailCache.set(id, view);
  return view;
}

/** Resolve several ids, returning a Map id → view (real data). */
export async function loadOnchainCompareDataMany(
  ids: string[]
): Promise<Map<string, OnchainCompareView | null>> {
  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await loadOnchainCompareData(id)] as const)
  );
  return new Map(entries);
}

/** Client hook that resolves real onchain data for the given ids. */
export function useOnchainCompareData(
  ids: string[]
): { data: Map<string, OnchainCompareView | null>; loading: boolean } {
  const [, setTick] = useState(0);

  const onchainIds = ids
    .filter(isDiscoveredAgentId)
    .filter((id) => !detailCache.has(id));

  useEffect(() => {
    if (onchainIds.length === 0) return;
    let cancelled = false;
    loadOnchainCompareDataMany(onchainIds)
      .then(() => {
        if (!cancelled) setTick((t) => t + 1);
      })
      .catch(() => {
        if (!cancelled) setTick((t) => t + 1);
      });
    return () => {
      cancelled = true;
    };
    // onchainIds is derived from the mutable external cache; re-run when its
    // resolved set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onchainIds.join(",")]);

  // Pull resolved views for all selected ids from the module cache.
  const dataMap = new Map<string, OnchainCompareView | null>();
  for (const id of ids) {
    if (detailCache.has(id)) dataMap.set(id, detailCache.get(id) ?? null);
  }

  const loading = onchainIds.length > 0;

  return {
    data: dataMap,
    loading,
  };
}

/** Load a selectable onchain agent list (for the Compare/Benchmark dropdowns). */
export async function loadOnchainOptions(limit = 24): Promise<
  { id: string; name: string; avatar: string; color: string; verified: boolean; category: string; chain: string }[]
> {
  try {
    const { agents } = await getDiscoveredAgents(1, limit);
    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      color: a.color,
      verified: a.verified,
      category: a.category,
      chain: a.chain,
    }));
  } catch {
    return [];
  }
}
