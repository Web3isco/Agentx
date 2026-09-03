import { createPublicClient, http, type PublicClient, type Hex } from "viem";
import { bscTestnet, bsc } from "viem/chains";
import { IDENTITY_REGISTRY_ABI } from "./abi";
import { getErc8004TokenId } from "./agent-token-map";

// ── Official contract addresses ────────────────────────────────
// Source: https://github.com/erc-8004/erc-8004-contracts
const ERC8004_ADDRESS_BSC_TESTNET = (process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS_BSC_TESTNET ?? "0x8004A818BFB912233c491871b3d84c89A494BD9e") as Hex;
const ERC8004_ADDRESS_BSC_MAINNET = (process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS_BSC_MAINNET ?? "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432") as Hex;

const RPC_BSC_TESTNET = process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ?? "https://bsc-testnet-rpc.publicnode.com";
const RPC_BSC_MAINNET = process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL ?? "https://bsc-rpc.publicnode.com";

// ── Zero-address sentinel ─────────────────────────────────────
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

// ── Client singletons ────────────────────────────────────────
let testnetClient: PublicClient | null = null;
let mainnetClient: PublicClient | null = null;

function getTestnetClient(): PublicClient {
  if (!testnetClient) {
    testnetClient = createPublicClient({
      chain: bscTestnet,
      transport: http(RPC_BSC_TESTNET),
    });
  }
  return testnetClient;
}

function getMainnetClient(): PublicClient {
  if (!mainnetClient) {
    mainnetClient = createPublicClient({
      chain: bsc,
      transport: http(RPC_BSC_MAINNET),
    });
  }
  return mainnetClient;
}

function getClientForChain(chainId: number): PublicClient {
  return chainId === bsc.id ? getMainnetClient() : getTestnetClient();
}

function getContractAddress(chainId: number): Hex {
  return chainId === bsc.id ? ERC8004_ADDRESS_BSC_MAINNET : ERC8004_ADDRESS_BSC_TESTNET;
}

// ── Configuration check ──────────────────────────────────────
export function isOnchainConfigured(): boolean {
  return (
    ERC8004_ADDRESS_BSC_TESTNET !== ZERO_ADDR ||
    ERC8004_ADDRESS_BSC_MAINNET !== ZERO_ADDR
  );
}

// ── Onchain read result types ─────────────────────────────────
export interface OnchainReadResult {
  configured: boolean;
  chainId: number;
  contractAddress: Hex;
  tokenURI: string | null;
  owner: string | null;
  agentWallet: string | null;
  metadata: Record<string, string>;
  registered: boolean;
  readAt: string;
  error: string | null;
}

// ── Core read function ───────────────────────────────────────
/**
 * Reads ERC-8004 agent data from the IdentityRegistry on BSC.
 *
 * The real contract uses uint256 agentId (the ERC-721 tokenId).
 * This function accepts numeric tokenIds directly.
 * For string-based agent IDs, use readAgentOnchainByTokenId with
 * a known tokenId mapping, or fall back to mock data.
 *
 * Calls: tokenURI, getAgentWallet, ownerOf, getMetadata.
 */
export async function readAgentOnchainByTokenId(
  tokenId: number,
  chainId: number = bscTestnet.id,
): Promise<OnchainReadResult> {
  const contractAddr = getContractAddress(chainId);

  if (contractAddr === ZERO_ADDR) {
    return {
      configured: false,
      chainId,
      contractAddress: contractAddr,
      tokenURI: null,
      owner: null,
      agentWallet: null,
      metadata: {},
      registered: false,
      readAt: new Date().toISOString(),
      error: "Contract address not configured. Set NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS_BSC_TESTNET in .env.local",
    };
  }

  const client = getClientForChain(chainId);
  const bigintId = BigInt(tokenId);

  try {
    const [uriResult, ownerResult, walletResult] = await Promise.allSettled([
      client.readContract({
        address: contractAddr,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [bigintId],
      }),
      client.readContract({
        address: contractAddr,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "ownerOf",
        args: [bigintId],
      }),
      client.readContract({
        address: contractAddr,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getAgentWallet",
        args: [bigintId],
      }),
    ]);

    const tokenURI = uriResult.status === "fulfilled" ? (uriResult.value as string) : null;
    const owner = ownerResult.status === "fulfilled" ? (ownerResult.value as string) : null;
    const agentWallet = walletResult.status === "fulfilled" ? (walletResult.value as string) : null;

    // Try to read common metadata keys
    const metadataKeys = ["name", "description", "agentWallet"];
    const metadataEntries = await Promise.allSettled(
      metadataKeys.map((key) =>
        client.readContract({
          address: contractAddr,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: "getMetadata",
          args: [bigintId, key],
        }),
      ),
    );

    const metadata: Record<string, string> = {};
    metadataKeys.forEach((key, i) => {
      const entry = metadataEntries[i];
      if (entry.status === "fulfilled") {
        const raw = entry.value as string;
        if (raw) metadata[key] = raw;
      }
    });

    const errors: string[] = [];
    if (uriResult.status === "rejected") errors.push(`tokenURI: ${uriResult.reason}`);
    if (ownerResult.status === "rejected") errors.push(`ownerOf: ${ownerResult.reason}`);
    if (walletResult.status === "rejected") errors.push(`getAgentWallet: ${walletResult.reason}`);

    return {
      configured: true,
      chainId,
      contractAddress: contractAddr,
      tokenURI,
      owner,
      agentWallet,
      metadata,
      registered: owner !== null && owner !== ZERO_ADDR,
      readAt: new Date().toISOString(),
      error: errors.length > 0 ? errors.join("; ") : null,
    };
  } catch (err) {
    return {
      configured: true,
      chainId,
      contractAddress: contractAddr,
      tokenURI: null,
      owner: null,
      agentWallet: null,
      metadata: {},
      registered: false,
      readAt: new Date().toISOString(),
      error: `Contract read failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Read agent data by string ID.
 *
 * Resolves the AGENTX agent ID to a tokenId via the mapping,
 * then reads onchain data. Falls back gracefully when:
 * - Contract not configured → configured: false
 * - Agent not in mapping → registered: false + informational error
 * - Contract read fails → registered: false + error details
 */
export async function readAgentOnchain(
  agentId: string,
  chainId: number = bscTestnet.id,
): Promise<OnchainReadResult> {
  const contractAddr = getContractAddress(chainId);

  if (contractAddr === ZERO_ADDR) {
    return {
      configured: false,
      chainId,
      contractAddress: contractAddr,
      tokenURI: null,
      owner: null,
      agentWallet: null,
      metadata: {},
      registered: false,
      readAt: new Date().toISOString(),
      error: "Contract address not configured. Set NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS_BSC_TESTNET in .env.local",
    };
  }

  const tokenId = getErc8004TokenId(agentId);

  if (tokenId === null) {
    return {
      configured: true,
      chainId,
      contractAddress: contractAddr,
      tokenURI: null,
      owner: null,
      agentWallet: null,
      metadata: {},
      registered: false,
      readAt: new Date().toISOString(),
      error: `Agent "${agentId}" has no ERC-8004 tokenId mapping. Register onchain first, then add to agent-token-map.ts.`,
    };
  }

  return readAgentOnchainByTokenId(tokenId, chainId);
}

// ── Convenience aliases ──────────────────────────────────────
export async function readAgentVerification(
  agentId: string,
  chainId: number = bscTestnet.id,
): Promise<OnchainReadResult> {
  return readAgentOnchain(agentId, chainId);
}
