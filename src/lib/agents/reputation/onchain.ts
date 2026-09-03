import { createPublicClient, http, type PublicClient, type Hex } from "viem";
import { bscTestnet, bsc } from "viem/chains";

/**
 * ERC-8004 Reputation Registry — onchain reads.
 *
 * Verified live on BSC (2026-08-30):
 *   Testnet proxy 0x8004B663056A597Dffe9eCcC1965A193B7388713 → getVersion() = "2.0.0"
 *   Mainnet proxy 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 → getVersion() = "2.0.0"
 *   Shared implementation: 0x16e0fa7f7c56b9a767e34b192b51f921be31da34 (both chains)
 *   getSummary / readAllFeedback / getClients / getLastIndex / readFeedback /
 *   getResponseCount confirmed working against the deployed contract.
 *
 * Source: https://github.com/erc-8004/erc-8004-contracts
 * Spec:   https://eips.ethereum.org/EIPS/eip-8004
 *
 * All functions are read-only. They never throw — returning null/empty
 * on any RPC failure, missing contract, or non-existent agent.
 */

// ── Supported chains ─────────────────────────────────────────

export const BSC_TESTNET_CHAIN_ID = 97;
export const BSC_MAINNET_CHAIN_ID = 56;

/**
 * Deployed Reputation Registry proxies per chain. The 0x8004… vanity
 * addresses are deterministic across chains (CREATE2 via the SAFE
 * Singleton Factory), keyed here by the two chains the app supports.
 */
const REGISTRY_ADDRESSES: Record<number, Hex> = {
  [BSC_TESTNET_CHAIN_ID]: (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS ??
    "0x8004B663056A597Dffe9eCcC1965A193B7388713") as Hex,
  [BSC_MAINNET_CHAIN_ID]: (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_MAINNET ??
    "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63") as Hex,
};

const RPC_URLS: Record<number, string> = {
  [BSC_TESTNET_CHAIN_ID]:
    process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ??
    "https://bsc-testnet-rpc.publicnode.com",
  [BSC_MAINNET_CHAIN_ID]:
    process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL ??
    "https://bsc-rpc.publicnode.com",
};

const CHAIN_LOOKUP: Record<number, (typeof bscTestnet) | (typeof bsc)> = {
  [BSC_TESTNET_CHAIN_ID]: bscTestnet,
  [BSC_MAINNET_CHAIN_ID]: bsc,
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

/**
 * True when a Reputation Registry is configured for the given chain.
 */
export function isReputationSupportedChain(chainId: number): boolean {
  return REGISTRY_ADDRESSES[chainId] !== undefined;
}

/**
 * Resolve the Reputation Registry proxy address for a chain.
 * Returns null for unsupported chains.
 */
export function getRegistryAddress(chainId: number): Hex | null {
  const addr = REGISTRY_ADDRESSES[chainId];
  if (!addr || addr.toLowerCase() === ZERO_ADDR) return null;
  return addr;
}

// ── ABI (read-only subset, verified against the deployed 2.0.0 impl) ──

const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [],
    name: "getIdentityRegistry",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getVersion",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getClients",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
    ],
    name: "getLastIndex",
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    name: "getSummary",
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint64" },
    ],
    name: "readFeedback",
    outputs: [
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "isRevoked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "includeRevoked", type: "bool" },
    ],
    name: "readAllFeedback",
    outputs: [
      { name: "clients", type: "address[]" },
      { name: "feedbackIndexes", type: "uint64[]" },
      { name: "values", type: "int128[]" },
      { name: "valueDecimals", type: "uint8[]" },
      { name: "tag1s", type: "string[]" },
      { name: "tag2s", type: "string[]" },
      { name: "revokedStatuses", type: "bool[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint64" },
      { name: "responders", type: "address[]" },
    ],
    name: "getResponseCount",
    outputs: [{ name: "count", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ── Client singletons (one per chain) ────────────────────────

const clients: Partial<Record<number, PublicClient>> = {};

function getClient(chainId: number): PublicClient | null {
  if (clients[chainId]) return clients[chainId];
  const chain = CHAIN_LOOKUP[chainId] ?? bscTestnet;
  const rpcUrl = RPC_URLS[chainId];
  if (!rpcUrl) return null;
  clients[chainId] = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  return clients[chainId];
}

// ── Low-level read helper ────────────────────────────────────

async function readContract<T>(
  functionName: string,
  args: readonly unknown[] = [],
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<T | null> {
  const address = getRegistryAddress(chainId);
  if (!address) return null;
  try {
    const client = getClient(chainId);
    if (!client) return null;
    const result = await client.readContract({
      address,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: functionName as never,
      args: args as never,
    });
    return result as T;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────

export interface ReputationSummary {
  agentId: bigint;
  count: number;
  summaryValue: number;
  summaryValueDecimals: number;
  tag1: string;
  tag2: string;
}

export interface FeedbackEntry {
  client: Hex;
  feedbackIndex: number;
  /** Decoded value (value / 10^valueDecimals). */
  value: number;
  /** Raw onchain decimals the value was stored with. */
  valueDecimals: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
}

export interface ReadFeedbackResult {
  value: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
}

export interface ReputationReadResult<T> {
  data: T | null;
  error: string | null;
  readAt: string;
}

// ── Value decoder ────────────────────────────────────────────

/**
 * Convert on-chain (value, valueDecimals) pair to a JS number.
 * e.g. value=87, decimals=0 → 87
 *      value=9977, decimals=2 → 99.77
 *      value=-32, decimals=1 → -3.2
 */
function decodeValue(value: bigint | number, decimals: number): number {
  const v = typeof value === "bigint" ? Number(value) : value;
  if (decimals === 0) return v;
  return v / Math.pow(10, decimals);
}

// ── Public API ───────────────────────────────────────────────

const now = () => new Date().toISOString();

/**
 * Check if the Reputation Registry contract is reachable on a chain.
 */
export async function isRegistryConfigured(
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<boolean> {
  if (!getRegistryAddress(chainId)) return false;
  try {
    const version = await readContract<string>("getVersion", [], chainId);
    return version !== null;
  } catch {
    return false;
  }
}

/**
 * Get the version string of the deployed Reputation Registry.
 */
export async function getVersion(
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<string>> {
  const data = await readContract<string>("getVersion", [], chainId);
  return {
    data,
    error: data === null ? "Could not read contract version" : null,
    readAt: now(),
  };
}

/**
 * Get the Identity Registry address linked to this Reputation Registry.
 */
export async function getIdentityRegistry(
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<Hex>> {
  const data = await readContract<Hex>("getIdentityRegistry", [], chainId);
  return {
    data,
    error: data === null ? "Could not read identity registry address" : null,
    readAt: now(),
  };
}

/**
 * Get all client addresses that have given feedback for an agent.
 *
 * Returns empty array if agent has no feedback or the read fails.
 */
export async function getClients(
  agentId: bigint | number,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<Hex[]>> {
  const id = BigInt(agentId);
  const data = await readContract<Hex[]>("getClients", [id], chainId);
  return {
    data: data ?? [],
    error: data === null ? `Could not read clients for agent ${id}` : null,
    readAt: now(),
  };
}

/**
 * Read the aggregated summary for an agent.
 *
 * getSummary requires clientAddresses to be non-empty (Sybil protection).
 * Pass an empty array to auto-fetch the client list first. When no clients
 * exist, returns a zeroed summary (count=0) — never a fabricated value.
 */
export async function getSummary(
  agentId: bigint | number,
  clientAddresses: Hex[] = [],
  tag1: string = "",
  tag2: string = "",
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<ReputationSummary>> {
  const id = BigInt(agentId);

  let clientsList = clientAddresses;
  if (clientsList.length === 0) {
    const clientsResult = await readContract<Hex[]>("getClients", [id], chainId);
    clientsList = clientsResult ?? [];
    if (clientsList.length === 0) {
      return {
        data: {
          agentId: id,
          count: 0,
          summaryValue: 0,
          summaryValueDecimals: 0,
          tag1,
          tag2,
        },
        error: null,
        readAt: now(),
      };
    }
  }

  const raw = await readContract<
    readonly [
      count: bigint,
      summaryValue: bigint,
      summaryValueDecimals: number,
    ]
  >("getSummary", [id, clientsList, tag1, tag2], chainId);

  if (!raw) {
    return {
      data: null,
      error: `Could not read summary for agent ${id}`,
      readAt: now(),
    };
  }

  const [count, rawValue, decimals] = raw;
  return {
    data: {
      agentId: id,
      count: Number(count),
      summaryValue: decodeValue(rawValue, decimals),
      summaryValueDecimals: decimals,
      tag1,
      tag2,
    },
    error: null,
    readAt: now(),
  };
}

/**
 * Read all feedback for an agent.
 *
 * Pass empty clientAddresses to query all known clients. Pass tag1/tag2
 * filters to narrow results. Set includeRevoked=true to include revoked entries.
 */
export async function readAllFeedback(
  agentId: bigint | number,
  clientAddresses: Hex[] = [],
  tag1: string = "",
  tag2: string = "",
  includeRevoked: boolean = false,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<FeedbackEntry[]>> {
  const id = BigInt(agentId);

  let clientsList = clientAddresses;
  if (clientsList.length === 0) {
    const clientsResult = await readContract<Hex[]>("getClients", [id], chainId);
    clientsList = clientsResult ?? [];
    if (clientsList.length === 0) {
      return {
        data: [],
        error: null,
        readAt: now(),
      };
    }
  }

  const raw = await readContract<
    readonly [
      clients: Hex[],
      feedbackIndexes: bigint[],
      values: bigint[],
      valueDecimals: number[],
      tag1s: string[],
      tag2s: string[],
      revokedStatuses: boolean[],
    ]
  >("readAllFeedback", [id, clientsList, tag1, tag2, includeRevoked], chainId);

  if (!raw) {
    return {
      data: null,
      error: `Could not read feedback for agent ${id}`,
      readAt: now(),
    };
  }

  const [clientsArr, feedbackIndexes, values, valueDecimals, tag1s, tag2s, revokedStatuses] =
    raw;
  const entries: FeedbackEntry[] = clientsArr.map((clientAddr, i) => ({
    client: clientAddr,
    feedbackIndex: Number(feedbackIndexes[i]),
    value: decodeValue(values[i], valueDecimals[i]),
    valueDecimals: valueDecimals[i],
    tag1: tag1s[i],
    tag2: tag2s[i],
    isRevoked: revokedStatuses[i],
  }));

  return {
    data: entries,
    error: null,
    readAt: now(),
  };
}

/**
 * Read a single feedback entry.
 */
export async function readFeedback(
  agentId: bigint | number,
  clientAddress: Hex,
  feedbackIndex: number,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<ReadFeedbackResult>> {
  const raw = await readContract<
    readonly [
      value: bigint,
      valueDecimals: number,
      tag1: string,
      tag2: string,
      isRevoked: boolean,
    ]
  >("readFeedback", [BigInt(agentId), clientAddress, BigInt(feedbackIndex)], chainId);

  if (!raw) {
    return {
      data: null,
      error: `Feedback ${feedbackIndex} not found for agent ${agentId}`,
      readAt: now(),
    };
  }

  const [value, valueDecimals, tag1, tag2, isRevoked] = raw;
  return {
    data: {
      value: decodeValue(value, valueDecimals),
      tag1,
      tag2,
      isRevoked,
    },
    error: null,
    readAt: now(),
  };
}

/**
 * Get the response count for a specific feedback entry.
 */
export async function getResponseCount(
  agentId: bigint | number,
  clientAddress: Hex,
  feedbackIndex: number,
  responders: Hex[] = [],
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<number>> {
  const data = await readContract<bigint>(
    "getResponseCount",
    [BigInt(agentId), clientAddress, BigInt(feedbackIndex), responders],
    chainId,
  );

  return {
    data: data !== null ? Number(data) : null,
    error: data === null ? "Could not read response count" : null,
    readAt: now(),
  };
}

/**
 * Get the last feedback index for a client on a given agent.
 */
export async function getLastIndex(
  agentId: bigint | number,
  clientAddress: Hex,
  chainId: number = BSC_TESTNET_CHAIN_ID,
): Promise<ReputationReadResult<number>> {
  const data = await readContract<bigint>(
    "getLastIndex",
    [BigInt(agentId), clientAddress],
    chainId,
  );

  return {
    data: data !== null ? Number(data) : null,
    error: data === null ? "Could not read last index" : null,
    readAt: now(),
  };
}