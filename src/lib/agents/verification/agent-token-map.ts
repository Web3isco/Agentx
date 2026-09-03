/**
 * AGENTX → ERC-8004 tokenId mapping.
 *
 * Maps each AGENTX string agent ID to its onchain ERC-721 tokenId
 * in the IdentityRegistry at 0x8004A818BFB912233c491871b3d84c89A494BD9e
 * (BSC Testnet).
 *
 * Source of truth: agents registered in the contract. When an agent
 * is registered via `register()` or discovered via event logs, its
 * entry is added here.
 *
 * CRITICAL: Do not invent tokenIds. Only add entries for agents
 * that are actually registered onchain.
 */

export interface AgentTokenMapping {
  /** AGENTX string agent ID (e.g. "sentinel-guard") */
  agentId: string;
  /** Numeric ERC-721 tokenId in the IdentityRegistry */
  tokenId: number;
  /** When this mapping was confirmed onchain (ISO string) */
  confirmedAt: string;
  /** Block number where registration was confirmed */
  blockNumber: number | null;
  /** Registration URI (tokenURI) if fetched */
  tokenURI: string | null;
}

/**
 * Known agent → tokenId mappings.
 *
 * Initially empty: our 18 AGENTX agents are not yet registered onchain.
 * Populate by running the scanner or adding entries manually after
 * registering agents via the BNBAgent SDK.
 *
 * Real third-party registrations observed on BSC Testnet (NOT AGENTX):
 *   TokenId 1-2, 6, 10-11, 15, 16, 18, 19 — test/demo agents
 */
const AGENT_TOKEN_MAP: Record<string, AgentTokenMapping> = {
  // ── AGENTX agents ──────────────────────────────────────────
  // Add entries here as agents are registered onchain.
  // Example (DO NOT ADD until actually registered):
  // "sentinel-guard": {
  //   agentId: "sentinel-guard",
  //   tokenId: 100,
  //   confirmedAt: "2026-08-21T00:00:00Z",
  //   blockNumber: 84_555_200,
  //   tokenURI: null,
  // },
};

// ── Public lookup functions ──────────────────────────────────

/**
 * Get the ERC-8004 tokenId for an AGENTX agent ID.
 * Returns null if the agent is not registered onchain.
 */
export function getErc8004TokenId(agentId: string): number | null {
  const entry = AGENT_TOKEN_MAP[agentId];
  return entry?.tokenId ?? null;
}

/**
 * Get the full mapping entry for an AGENTX agent ID.
 * Returns null if not registered.
 */
export function getAgentTokenMapping(agentId: string): AgentTokenMapping | null {
  return AGENT_TOKEN_MAP[agentId] ?? null;
}

/**
 * Check if an AGENTX agent has an onchain registration.
 */
export function isAgentRegisteredOnchain(agentId: string): boolean {
  return agentId in AGENT_TOKEN_MAP;
}

/**
 * Get all known onchain-registered AGENTX agents.
 */
export function getAllRegisteredAgents(): AgentTokenMapping[] {
  return Object.values(AGENT_TOKEN_MAP);
}

/**
 * Get all AGENTX agent IDs that are NOT registered onchain.
 */
export function getUnregisteredAgents(allAgentIds: string[]): string[] {
  return allAgentIds.filter((id) => !(id in AGENT_TOKEN_MAP));
}

// ── Registration helpers ─────────────────────────────────────

/**
 * Register a new agent mapping. Call this after confirming an
 * onchain registration (via SDK or event log).
 *
 * @throws if tokenId is already claimed by a different agentId
 */
export function registerAgentMapping(
  agentId: string,
  tokenId: number,
  options: { blockNumber?: number; tokenURI?: string } = {},
): AgentTokenMapping {
  // Check tokenId isn't already used
  const existing = Object.values(AGENT_TOKEN_MAP).find((e) => e.tokenId === tokenId);
  if (existing && existing.agentId !== agentId) {
    throw new Error(
      `TokenId ${tokenId} is already mapped to "${existing.agentId}". ` +
      `Cannot register "${agentId}" to the same tokenId.`,
    );
  }

  const entry: AgentTokenMapping = {
    agentId,
    tokenId,
    confirmedAt: new Date().toISOString(),
    blockNumber: options.blockNumber ?? null,
    tokenURI: options.tokenURI ?? null,
  };

  AGENT_TOKEN_MAP[agentId] = entry;
  return entry;
}

/**
 * Bulk register from a scan result. Overwrites existing entries
 * for the same agentId but throws on tokenId conflicts.
 */
export function bulkRegisterAgents(
  entries: Array<{ agentId: string; tokenId: number; blockNumber?: number; tokenURI?: string }>,
): AgentTokenMapping[] {
  return entries.map((e) =>
    registerAgentMapping(e.agentId, e.tokenId, {
      blockNumber: e.blockNumber,
      tokenURI: e.tokenURI,
    }),
  );
}
