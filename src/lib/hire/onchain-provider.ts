import { isAddress, type Hex } from "viem";
import { isDiscoveredAgentId, parseDiscoveredAgentId } from "@/lib/discovery/service";
import { getOnchainAgent } from "@/lib/discovery/client";

/**
 * ERC-8004 → ERC-8183 hire identity resolver.
 *
 * When a real `onchain-*` agent is hired, the ERC-8183 createJob call needs the
 * real provider (operator/agent) wallet. This resolver extracts that address
 * from the agent's live 8004scan registration (agent wallet → creator → owner),
 * preserving chain id + token id so the hire flow can render and persist the
 * real identity.
 *
 * Safety rules — never fabricated:
 *  - Non-onchain ids are rejected up-front.
 *  - If 8004scan is unreachable / the detail is unavailable, null is returned
 *    (the hire flow then blocks, it never invents an address).
 *  - Only real, valid non-zero addresses are accepted (agentWallet,
 *    creatorAddress, ownerAddress from the registration, in that order).
 *  - The offline placeholder produced elsewhere (`0x0000...0000`) is rejected.
 */

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const OFFLINE_PLACEHOLDER_CONTRACT = "0x0000...0000";

export interface OnchainHireIdentity {
  id: string;
  /** Agent's real chain id (e.g. BSC mainnet = 56). */
  chainId: number;
  /** ERC-8004 registration token id. */
  tokenId: number;
  name: string;
  /** The provider wallet used to create the ERC-8183 job. */
  providerAddress: Hex;
  /** All real non-zero candidate wallets found in the registration. */
  availableProviderAddresses: Hex[];
  /** ERC-8004 registration contract address (real, non-placeholder). */
  contractAddress: string;
  creatorAddress: string | null;
  agentWallet: string | null;
  ownerAddress: string | null;
  /** Registration chain is BSC mainnet; the hire job runs on BSC testnet. */
  hireChainId: number;
}

/** Resolve the real hire identity for an onchain agent id, or null when unsafe. */
export async function resolveOnchainHireIdentity(
  id: string,
  hireChainId: number = 97,
): Promise<OnchainHireIdentity | null> {
  if (!isDiscoveredAgentId(id)) return null;
  const parsed = parseDiscoveredAgentId(id);
  if (!parsed) return null;

  const isTestnet = parsed.chainId === 97;
  const detail = await getOnchainAgent(parsed.chainId, parsed.tokenId, isTestnet);
  if (!detail) return null;
  if (
    !detail.contractAddress ||
    detail.contractAddress === ZERO_ADDRESS ||
    detail.contractAddress === OFFLINE_PLACEHOLDER_CONTRACT
  ) {
    return null;
  }

  const candidates = [detail.agentWallet, detail.creatorAddress, detail.ownerAddress]
    .filter((a): a is string => isNonZeroAddress(a));
  if (candidates.length === 0) return null;

  return {
    id,
    chainId: parsed.chainId,
    tokenId: parsed.tokenId,
    name: detail.name || `Agent #${parsed.tokenId}`,
    providerAddress: candidates[0] as Hex,
    availableProviderAddresses: candidates as Hex[],
    contractAddress: detail.contractAddress,
    creatorAddress: detail.creatorAddress ?? null,
    agentWallet: detail.agentWallet ?? null,
    ownerAddress: detail.ownerAddress ?? null,
    hireChainId,
  };
}

/** True when the string is a real, valid, non-zero address. */
export function isNonZeroAddress(addr: string | null | undefined): boolean {
  if (typeof addr !== "string") return false;
  const trimmed = addr.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === ZERO_ADDRESS) return false;
  return isAddress(trimmed);
}