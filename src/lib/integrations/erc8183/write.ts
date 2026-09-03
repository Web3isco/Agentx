import { parseUnits, type Hex, type Address } from "viem";
import { getApexConfig } from "./network";
import { AGENTIC_COMMERCE_ABI, ERC20_ABI, EVALUATOR_ROUTER_ABI } from "./abi";

export interface CreateJobParams {
  provider: Hex;
  evaluator: Hex;
  description: string;
  budgetAmount: string;
  durationDays: number;
  hook?: Hex;
}

export interface WriteResult {
  jobId: bigint | null;
  txHash: Hex | null;
  error: string | null;
}

export function getCreateJobConfig(params: CreateJobParams, chainId: number = 97) {
  const config = getApexConfig(chainId);
  const now = Math.floor(Date.now() / 1000);
  const expiredAt = BigInt(now + params.durationDays * 86400);
  // hook defaults to the EvaluatorRouter so the evaluation/dispute flow works
  const hook = params.hook ?? config.routerAddress;

  return {
    address: config.commerceAddress,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: "createJob" as const,
    args: [
      params.provider,
      params.evaluator,
      expiredAt,
      params.description,
      hook,
    ] as const,
  };
}

export function getSetBudgetConfig(
  jobId: bigint,
  budgetAmount: string,
  chainId: number = 97,
) {
  const config = getApexConfig(chainId);
  const amount = parseUnits(budgetAmount, 18);

  return {
    address: config.commerceAddress,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: "setBudget" as const,
    args: [jobId, amount, "0x"] as const,
  };
}

/**
 * Build a wagmi writeContract config to bind a job to a policy on the
 * EvaluatorRouter. Required before `fund` — the Router's `beforeAction`
 * hook reverts with `PolicyNotSet` if `jobPolicy[jobId] == 0`.
 */
export function getRegisterJobConfig(jobId: bigint, chainId: number = 97) {
  const config = getApexConfig(chainId);

  return {
    address: config.routerAddress,
    abi: EVALUATOR_ROUTER_ABI,
    functionName: "registerJob" as const,
    args: [jobId, config.policyAddress] as const,
  };
}

export function getFundConfig(
  jobId: bigint,
  budgetAmount: string,
  chainId: number = 97,
) {
  const config = getApexConfig(chainId);
  const amount = parseUnits(budgetAmount, 18);

  return {
    address: config.commerceAddress,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: "fund" as const,
    args: [jobId, amount, "0x"] as const,
  };
}

/**
 * Build a wagmi writeContract config for the provider to submit a
 * deliverable, moving the job from Funded → Submitted. The Router hook
 * forwards the submission to the OptimisticPolicy which records
 * `submittedAt` and starts the dispute window.
 *
 * Only `job.provider` may call `submit` on the kernel.
 */
export function getSubmitConfig(
  jobId: bigint,
  deliverable: Hex,
  chainId: number = 97,
) {
  const config = getApexConfig(chainId);

  return {
    address: config.commerceAddress,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: "submit" as const,
    args: [jobId, deliverable, "0x"] as const,
  };
}

/**
 * Build a wagmi writeContract config to settle a submitted job. Permissionless:
 * pulls the current verdict from the bound policy (`check`) and applies it to
 * the kernel — Approve → `complete` (payment released to provider), Reject →
 * `reject` (client refunded). Reguires the optimistic dispute window to have
 * elapsed for an Approve verdict.
 */
export function getSettleConfig(
  jobId: bigint,
  chainId: number = 97,
) {
  const config = getApexConfig(chainId);

  return {
    address: config.routerAddress,
    abi: EVALUATOR_ROUTER_ABI,
    functionName: "settle" as const,
    args: [jobId, "0x"] as const,
  };
}

// ── ERC-20 approval ──────────────────────────────────────────

/**
 * Build a wagmi writeContract config to approve `spender` to spend `amount`
 * of `tokenAddress` on behalf of the connected wallet.
 */
export function getApproveConfig(
  tokenAddress: Address,
  spender: Address,
  amount: bigint,
) {
  return {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve" as const,
    args: [spender, amount] as const,
  };
}

export { getApexConfig };
