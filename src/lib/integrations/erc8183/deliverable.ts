import { keccak256, toBytes, type Hex } from "viem";

/**
 * ERC-8183 deliverable builder.
 *
 * A job deliverable is a `bytes32` submitted by the provider on-chain. This
 * helper builds a real, verifiable execution record for the selected agent and
 * returns its keccak256 hash — the exact value the provider submits via
 * `commerce.submit`. The record JSON is kept so the UI can explain what was
 * submitted without fabricating chain state.
 */
export interface DeliverableInput {
  jobId: bigint | number;
  agentId?: string | null;
  agentName?: string | null;
  provider?: Hex | null;
  description?: string;
  chainId?: number;
}

export interface ExecutionDeliverable {
  hash: Hex;
  record: string;
}

export function buildExecutionDeliverable(
  input: DeliverableInput,
): ExecutionDeliverable {
  const record = JSON.stringify(
    {
      protocol: "AGENTX-ERC8183",
      version: 1,
      chainId: input.chainId ?? 97,
      jobId: String(input.jobId),
      agentId: input.agentId ?? null,
      agentName: input.agentName ?? null,
      provider: input.provider ?? null,
      description: input.description ?? "",
      executedAt: new Date().toISOString(),
      statement: "Deliverable submitted on-chain by the job provider.",
    },
    null,
    2,
  );

  return { hash: keccak256(toBytes(record)), record };
}