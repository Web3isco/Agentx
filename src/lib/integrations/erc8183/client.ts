import { createPublicClient, http, type PublicClient } from "viem";
import { bscTestnet, bsc } from "viem/chains";
import {
  AGENTIC_COMMERCE_ABI,
  EVALUATOR_ROUTER_ABI,
  OPTIMISTIC_POLICY_ABI,
  ERC20_ABI,
} from "./abi";
import { getApexConfig } from "./network";

// ── Client singletons ────────────────────────────────────────

const clientsByChain = new Map<number, PublicClient>();

function getClient(chainId: number): PublicClient {
  let client = clientsByChain.get(chainId);
  if (client) return client;

  const config = getApexConfig(chainId);
  const chain = chainId === bsc.id ? bsc : bscTestnet;

  client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  clientsByChain.set(chainId, client);
  return client;
}

// ── Low-level contract read helpers ───────────────────────────

/**
 * Read any view function on the AgenticCommerce kernel contract.
 * Returns null on any error (contract not deployed, revert, RPC failure).
 */
export async function readCommerce<T>(
  functionName: string,
  args: readonly unknown[] = [],
  chainId: number = 97,
): Promise<T | null> {
  const config = getApexConfig(chainId);
  const client = getClient(chainId);
  try {
    const result = await client.readContract({
      address: config.commerceAddress,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: functionName as never,
      args: args as never,
    });
    return result as T;
  } catch {
    return null;
  }
}

/**
 * Read any view function on the EvaluatorRouter contract.
 * Returns null on any error.
 */
export async function readRouter<T>(
  functionName: string,
  args: readonly unknown[] = [],
  chainId: number = 97,
): Promise<T | null> {
  const config = getApexConfig(chainId);
  const client = getClient(chainId);
  try {
    const result = await client.readContract({
      address: config.routerAddress,
      abi: EVALUATOR_ROUTER_ABI,
      functionName: functionName as never,
      args: args as never,
    });
    return result as T;
  } catch {
    return null;
  }
}

/**
 * Read any view function on the OptimisticPolicy contract.
 * Returns null on any error.
 */
export async function readPolicy<T>(
  functionName: string,
  args: readonly unknown[] = [],
  chainId: number = 97,
): Promise<T | null> {
  const config = getApexConfig(chainId);
  const client = getClient(chainId);
  try {
    const result = await client.readContract({
      address: config.policyAddress,
      abi: OPTIMISTIC_POLICY_ABI,
      functionName: functionName as never,
      args: args as never,
    });
    return result as T;
  } catch {
    return null;
  }
}

// ── ERC-20 reads ─────────────────────────────────────────────

/**
 * Read any view function on an ERC-20 token contract.
 * Returns null on any error.
 */
export async function readERC20<T>(
  tokenAddress: `0x${string}`,
  functionName: string,
  args: readonly unknown[] = [],
  chainId: number = 97,
): Promise<T | null> {
  const client = getClient(chainId);
  try {
    const result = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: functionName as never,
      args: args as never,
    });
    return result as T;
  } catch {
    return null;
  }
}
