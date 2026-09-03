import { agents, type Agent } from "@/components/discover/agents-data";
import { agentDetails, type AgentDetail } from "@/components/agent/agent-detail-data";
import { getAgentVerification } from "@/lib/agents/verification/service";
import type { AgentVerification } from "@/lib/agents/verification/types";
import { getAgentReputation } from "@/lib/agents/reputation/service";
import type { AgentReputation, PerformanceMetrics } from "@/lib/agents/reputation/types";
import { getStudioAgent } from "@/lib/integrations/bnb-agent-studio/adapter";
import type { StudioAgent } from "@/lib/integrations/bnb-agent-studio/types";

export interface UnifiedAgent {
  base: Agent;
  detail: AgentDetail | null;
  verification: AgentVerification;
  reputation: AgentReputation | null;
  metrics: PerformanceMetrics | null;
  studio: StudioAgent | null;
}

const cache = new Map<string, UnifiedAgent>();
const allCache: UnifiedAgent[] = [];

function build(agentId: string): UnifiedAgent {
  const base = agents.find((a) => a.id === agentId);
  if (!base) return null as unknown as UnifiedAgent;

  const detail = agentDetails[agentId] ?? null;
  const verification = getAgentVerification(agentId);
  const reputation = getAgentReputation(agentId);
  const metrics = reputation?.metrics ?? null;
  const studio = getStudioAgent(agentId) ?? null;

  return { base, detail, verification, reputation, metrics, studio };
}

function ensureAll(): UnifiedAgent[] {
  if (allCache.length > 0) return allCache;
  for (const a of agents) {
    const u = build(a.id);
    if (u) {
      cache.set(a.id, u);
      allCache.push(u);
    }
  }
  return allCache;
}

export function getAgent(id: string): UnifiedAgent | null {
  if (cache.has(id)) return cache.get(id)!;
  const u = build(id);
  if (u) cache.set(id, u);
  return u;
}

export function getAgents(): UnifiedAgent[] {
  return ensureAll();
}

export function getAgentByStudioId(studioId: string): UnifiedAgent | null {
  const all = ensureAll();
  const match = all.find((a) => a.studio?.id.studio === studioId);
  return match ?? null;
}

export function searchAgents(query: string): UnifiedAgent[] {
  const q = query.toLowerCase().trim();
  if (!q) return ensureAll();

  return ensureAll().filter((a) => {
    if (a.base.name.toLowerCase().includes(q)) return true;
    if (a.base.description.toLowerCase().includes(q)) return true;
    if (a.base.category.toLowerCase().includes(q)) return true;
    if (a.base.builder.toLowerCase().includes(q)) return true;
    if (a.base.features.some((f) => f.toLowerCase().includes(q))) return true;
    if (a.studio?.metadata.tags.some((tag: string) => tag.includes(q))) return true;
    if (a.studio?.metadata.description.toLowerCase().includes(q)) return true;
    return false;
  });
}

export function getRecommendedAgents(query: string): UnifiedAgent[] {
  const q = query.toLowerCase().trim();
  const all = ensureAll();

  if (!q) {
    return [...all]
      .sort((a, b) => (b.metrics?.reputationScore ?? 0) - (a.metrics?.reputationScore ?? 0))
      .slice(0, 6);
  }

  const scored = all.map((a) => {
    let score = 0;

    if (a.base.name.toLowerCase().includes(q)) score += 10;
    if (a.base.category.toLowerCase().includes(q)) score += 8;
    if (a.base.description.toLowerCase().includes(q)) score += 5;
    if (a.base.features.some((f) => f.toLowerCase().includes(q))) score += 4;
    if (a.studio?.metadata.tags.some((tag: string) => tag.includes(q))) score += 6;
    if (a.verification.status === "verified") score += 3;
    score += (a.metrics?.reputationScore ?? 0) / 50;
    score += (a.metrics?.successRate ?? 0) / 100;

    return { agent: a, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.agent);
}
