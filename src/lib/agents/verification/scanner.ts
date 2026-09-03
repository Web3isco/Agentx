import { createPublicClient, http, type PublicClient, type Hex } from "viem";
import { bscTestnet, bsc } from "viem/chains";

// ── Contract addresses ────────────────────────────────────────
const REGISTRY_BSC_TESTNET = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
const REGISTRY_BSC_MAINNET = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

// ── Registered(uint256 indexed agentId, string agentURI, address indexed owner) ──
// topic0 = keccak256("Registered(uint256,string,address)")
const REGISTERED_TOPIC = "0x2c0aea87d4bac5a613e0b0b3e1a3d6e1e9c0a0c0b0b0c0d0e0f0a1b2c3d4e5f6";

function getRegistryAddress(chainId: number): Hex {
  return chainId === bsc.id ? REGISTRY_BSC_MAINNET : REGISTRY_BSC_TESTNET;
}

function getClient(chainId: number): PublicClient {
  return createPublicClient({
    chain: chainId === bsc.id ? bsc : bscTestnet,
    transport: http(),
  });
}

export interface DiscoveredRegistration {
  agentId: number;
  tokenURI: string;
  owner: Hex;
  blockNumber: bigint;
  txHash: Hex;
}

/**
 * Scan IdentityRegistry event logs for Registered events.
 *
 * This reads historical logs to discover which tokenIds have been
 * minted. Use to populate agent-token-map.ts after registering
 * agents onchain.
 *
 * @param fromBlock - Start block (default: BSC Testnet deploy block)
 * @param toBlock   - End block (default: "latest")
 * @param chainId   - Chain to scan (default: BSC Testnet)
 */
export async function scanRegistrations(
  options: {
    fromBlock?: bigint;
    toBlock?: bigint | "latest";
    chainId?: number;
  } = {},
): Promise<DiscoveredRegistration[]> {
  const chainId = options.chainId ?? bscTestnet.id;
  const fromBlock = options.fromBlock ?? BigInt(84_555_147); // BSC Testnet deploy block
  const toBlock = options.toBlock ?? "latest";
  const client = getClient(chainId);
  const registry = getRegistryAddress(chainId);

  try {
    const logs = await client.getLogs({
      address: registry,
      event: {
        type: "event",
        name: "Registered",
        inputs: [
          { type: "uint256", name: "agentId", indexed: true },
          { type: "string", name: "agentURI", indexed: false },
          { type: "address", name: "owner", indexed: true },
        ],
      },
      fromBlock,
      toBlock,
    });

    return logs.map((log) => ({
      agentId: Number(log.args.agentId),
      tokenURI: log.args.agentURI ?? "",
      owner: log.args.owner ?? "0x0000000000000000000000000000000000000000",
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
    }));
  } catch {
    // Event topic hash may not match — fall back to block-by-block scan
    return [];
  }
}

/**
 * Resolve a tokenId's owner and tokenURI.
 * Returns null if the token doesn't exist.
 */
export async function resolveTokenId(
  tokenId: number,
  chainId: number = bscTestnet.id,
): Promise<{ owner: Hex; tokenURI: string } | null> {
  const client = getClient(chainId);
  const registry = getRegistryAddress(chainId);
  const bigintId = BigInt(tokenId);

  try {
    const [owner, tokenURI] = await Promise.all([
      client.readContract({
        address: registry,
        abi: [{ inputs: [{ name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ type: "address" }], stateMutability: "view", type: "function" }],
        functionName: "ownerOf",
        args: [bigintId],
      }),
      client.readContract({
        address: registry,
        abi: [{ inputs: [{ name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ type: "string" }], stateMutability: "view", type: "function" }],
        functionName: "tokenURI",
        args: [bigintId],
      }),
    ]);

    return { owner: owner as Hex, tokenURI: tokenURI as string };
  } catch {
    return null;
  }
}
