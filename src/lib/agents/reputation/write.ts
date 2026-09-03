import type { Hex } from "viem";
import {
  getRegistryAddress,
  BSC_TESTNET_CHAIN_ID,
} from "./onchain";

/**
 * ERC-8004 Reputation Registry — giveFeedback write config.
 *
 * Signature verified against the deployed implementation
 * (0x16e0fa7f7c56b9a767e34b192b51f921be31da34, version 2.0.0):
 *
 *   giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals,
 *                string tag1, string tag2, string endpoint,
 *                string feedbackURI, bytes32 feedbackHash)
 *
 * The caller (msg.sender) is the client — there is no clientAddress param.
 * Reverts with "Self-feedback not allowed" if the caller is the agent's
 * owner/operator, and with ERC721NonexistentToken if the agent does not exist.
 */

export const REPUTATION_REGISTRY_GIVE_FEEDBACK_ABI = [
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    name: "giveFeedback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export const MAX_ABS_FEEDBACK_VALUE = BigInt(10) ** BigInt(38);

export interface GiveFeedbackParams {
  agentId: bigint | number;
  /** Signed feedback value (e.g. 88 on a 0–100 scale). */
  value: bigint | number;
  /** Value decimals (0–18). Default 0. */
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  feedbackURI?: string;
  feedbackHash?: Hex;
  chainId?: number;
}

/**
 * Build a wagmi writeContract config for giveFeedback on the agent's chain.
 * Throws on configuration errors (unsupported chain / invalid params) so the
 * UI can surface a clear message before any transaction is attempted.
 */
export function getGiveFeedbackConfig(params: GiveFeedbackParams) {
  const chainId = params.chainId ?? BSC_TESTNET_CHAIN_ID;
  const address = getRegistryAddress(chainId);
  if (!address) {
    throw new Error(
      `Reputation registry is not configured for chain ${chainId}`,
    );
  }

  const valueDecimals = params.valueDecimals ?? 0;
  if (valueDecimals < 0 || valueDecimals > 18) {
    throw new Error("valueDecimals must be between 0 and 18");
  }

  const value = BigInt(params.value);
  if (value > MAX_ABS_FEEDBACK_VALUE || value < -MAX_ABS_FEEDBACK_VALUE) {
    throw new Error("Feedback value out of allowed range");
  }

  return {
    address,
    abi: REPUTATION_REGISTRY_GIVE_FEEDBACK_ABI,
    functionName: "giveFeedback" as const,
    args: [
      BigInt(params.agentId),
      value,
      valueDecimals,
      params.tag1 ?? "",
      params.tag2 ?? "",
      params.endpoint ?? "",
      params.feedbackURI ?? "",
      params.feedbackHash ?? ZERO_BYTES32,
    ] as const,
  };
}