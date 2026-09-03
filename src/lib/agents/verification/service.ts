import type {
  AgentVerification,
  VerificationStatus,
} from "./types";
import { readAgentOnchain, isOnchainConfigured, type OnchainReadResult } from "./onchain";

const BSC_TESTNET_ID = 97;
const BSC_ID = 56;

const MOCK_REGISTRY = "0x0000000000000000000000000000000000001001";

function pending(id: string, chainId: number = BSC_TESTNET_ID): AgentVerification {
  const chainName = chainId === BSC_ID ? "BNB Chain" : "BSC Testnet";
  return {
    agentId: id,
    status: "pending",
    identity: {
      contractAddress: "0x0000000000000000000000000000000000000000",
      chainId,
      chainName,
      deployerAddress: "0x0000000000000000000000000000000000000000",
      deploymentBlock: 0,
      deploymentTxHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      registeredAt: new Date().toISOString(),
    },
    erc8004: {
      status: "pending",
      tokenId: null,
      issuerAddress: null,
      issuedAt: null,
      expiresAt: null,
      revocationReason: null,
      metadataUri: null,
    },
    registration: {
      registered: false,
      registryAddress: MOCK_REGISTRY,
      registryChainId: chainId,
      agentId: id,
      registeredBy: "0x0000000000000000000000000000000000000000",
      registeredAt: new Date().toISOString(),
      metadataUri: "",
    },
    trustScore: 0,
    lastVerifiedAt: "",
  };
}

function unverified(id: string): AgentVerification {
  return {
    agentId: id,
    status: "unverified",
    identity: {
      contractAddress: "0x0000000000000000000000000000000000000000",
      chainId: BSC_TESTNET_ID,
      chainName: "BSC Testnet",
      deployerAddress: "0x0000000000000000000000000000000000000000",
      deploymentBlock: 0,
      deploymentTxHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      registeredAt: "",
    },
    erc8004: {
      status: "unverified",
      tokenId: null,
      issuerAddress: null,
      issuedAt: null,
      expiresAt: null,
      revocationReason: null,
      metadataUri: null,
    },
    registration: {
      registered: false,
      registryAddress: MOCK_REGISTRY,
      registryChainId: BSC_TESTNET_ID,
      agentId: id,
      registeredBy: "0x0000000000000000000000000000000000000000",
      registeredAt: "",
      metadataUri: "",
    },
    trustScore: 0,
    lastVerifiedAt: "",
  };
}

const verifications: Record<string, AgentVerification> = {
  // The curated preview agents are illustrative product showcases. None of them
  // are actually registered in the ERC-8004 IdentityRegistry, so they are
  // reported honestly as unverified rather than presenting fabricated onchain
  // identities (fake token IDs, contract addresses, or trust scores).
  "sentinel-guard":      unverified("sentinel-guard"),
  "yield-oracle":        unverified("yield-oracle"),
  "gas-optimizer":       unverified("gas-optimizer"),
  "portfolio-pilot":     unverified("portfolio-pilot"),
  "bridge-watch":        unverified("bridge-watch"),
  "sentinel-pro":        unverified("sentinel-pro"),
  "mev-shield":          unverified("mev-shield"),
  "dca-engine":          unverified("dca-engine"),
  "liquidity-radar":     unverified("liquidity-radar"),
  "wallet-sentinel":     unverified("wallet-sentinel"),
  "chain-scanner":       unverified("chain-scanner"),

  "compliance-sentinel": pending("compliance-sentinel"),
  "sniper-alpha":        pending("sniper-alpha"),
  "audit-trail":         pending("audit-trail"),

  "tax-reporter":    unverified("tax-reporter"),
  "position-guard":  unverified("position-guard"),
  "nft-watcher":     unverified("nft-watcher"),
  "apy-hunter":      unverified("apy-hunter"),
};

export function getAgentVerification(agentId: string): AgentVerification {
  return verifications[agentId] ?? unverified(agentId);
}

export function getVerificationStatus(agentId: string): VerificationStatus {
  return getAgentVerification(agentId).status;
}

export function getAllVerifications(): AgentVerification[] {
  return Object.values(verifications);
}

// ── Onchain-aware async functions ─────────────────────────────
// These attempt a real BSC Testnet read first. If the contract is
// not configured or the read fails, they fall back to mock data.

function buildFromOnchain(agentId: string, onchain: OnchainReadResult): AgentVerification {
  const chainName = onchain.chainId === BSC_ID ? "BNB Chain" : "BSC Testnet";
  const base = verifications[agentId] ?? unverified(agentId);

  if (!onchain.configured || onchain.error) {
    return base;
  }

  const status: VerificationStatus = onchain.registered
    ? "verified"
    : "unverified";

  return {
    agentId,
    status,
    identity: {
      contractAddress: onchain.contractAddress,
      chainId: onchain.chainId,
      chainName,
      deployerAddress: onchain.owner ?? base.identity.deployerAddress,
      deploymentBlock: base.identity.deploymentBlock,
      deploymentTxHash: base.identity.deploymentTxHash,
      registeredAt: base.identity.registeredAt,
    },
    erc8004: {
      status,
      tokenId: base.erc8004.tokenId,
      issuerAddress: onchain.agentWallet ?? base.erc8004.issuerAddress,
      issuedAt: base.erc8004.issuedAt,
      expiresAt: base.erc8004.expiresAt,
      revocationReason: null,
      metadataUri: onchain.tokenURI ?? base.erc8004.metadataUri,
    },
    registration: {
      registered: onchain.registered,
      registryAddress: onchain.contractAddress,
      registryChainId: onchain.chainId,
      agentId,
      registeredBy: onchain.owner ?? base.registration.registeredBy,
      registeredAt: base.registration.registeredAt,
      metadataUri: onchain.tokenURI ?? base.registration.metadataUri,
    },
    trustScore: base.trustScore,
    lastVerifiedAt: onchain.readAt,
  };
}

/**
 * Async: reads ERC-8004 data from BSC Testnet, falls back to mock.
 * Safe to call even if contract is not configured — returns mock data.
 */
export async function getAgentVerificationOnchain(
  agentId: string,
  chainId: number = BSC_TESTNET_ID,
): Promise<AgentVerification> {
  try {
    const onchain = await readAgentOnchain(agentId, chainId);
    return buildFromOnchain(agentId, onchain);
  } catch {
    return verifications[agentId] ?? unverified(agentId);
  }
}

/**
 * Async: checks if an agent is verified onchain.
 * Falls back to mock status if contract not configured or read fails.
 */
export async function getVerificationStatusOnchain(
  agentId: string,
  chainId: number = BSC_TESTNET_ID,
): Promise<VerificationStatus> {
  const v = await getAgentVerificationOnchain(agentId, chainId);
  return v.status;
}

/**
 * Returns whether the ERC-8004 contract is configured (non-zero address).
 * When false, all reads return mock data.
 */
export { isOnchainConfigured };
