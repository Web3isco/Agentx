"use client";

import { useReadContract, useChainId } from "wagmi";
import { IDENTITY_REGISTRY_ABI } from "./abi";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function getContractAddress(chainId: number): `0x${string}` {
  if (chainId === 56) {
    return (process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS_BSC_MAINNET ?? ZERO_ADDR) as `0x${string}`;
  }
  return (process.env.NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS_BSC_TESTNET ?? ZERO_ADDR) as `0x${string}`;
}

export interface UseErc8004ReadResult {
  isConfigured: boolean;
  chainId: number;
  contractAddress: `0x${string}`;
  tokenURI: string | null;
  owner: string | null;
  agentWallet: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * React hook for reading ERC-8004 IdentityRegistry data from BSC.
 *
 * Uses the official contract functions: tokenURI, ownerOf, getAgentWallet.
 * Accepts a numeric tokenId (the ERC-721 token ID).
 */
export function useErc8004Read(tokenId: number | null): UseErc8004ReadResult {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const isConfigured = contractAddress !== ZERO_ADDR;
  const bigintId = tokenId !== null ? BigInt(tokenId) : undefined;

  const {
    data: tokenURI,
    isLoading: uriLoading,
    error: uriError,
  } = useReadContract({
    address: isConfigured && bigintId !== undefined ? contractAddress : undefined,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: bigintId !== undefined ? [bigintId] : undefined,
    query: { enabled: isConfigured && bigintId !== undefined },
  });

  const {
    data: owner,
    isLoading: ownerLoading,
    error: ownerError,
  } = useReadContract({
    address: isConfigured && bigintId !== undefined ? contractAddress : undefined,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "ownerOf",
    args: bigintId !== undefined ? [bigintId] : undefined,
    query: { enabled: isConfigured && bigintId !== undefined },
  });

  const {
    data: agentWallet,
    isLoading: walletLoading,
    error: walletError,
  } = useReadContract({
    address: isConfigured && bigintId !== undefined ? contractAddress : undefined,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "getAgentWallet",
    args: bigintId !== undefined ? [bigintId] : undefined,
    query: { enabled: isConfigured && bigintId !== undefined },
  });

  const isLoading = uriLoading || ownerLoading || walletLoading;
  const error = uriError ?? ownerError ?? walletError ?? null;

  return {
    isConfigured,
    chainId,
    contractAddress,
    tokenURI: (tokenURI as string | undefined) ?? null,
    owner: (owner as string | undefined) ?? null,
    agentWallet: (agentWallet as string | undefined) ?? null,
    isLoading,
    error,
  };
}
