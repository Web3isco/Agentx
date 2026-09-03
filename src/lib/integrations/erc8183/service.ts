import { formatUnits, type Address, type Log } from "viem";
import { readCommerce, readRouter, readPolicy, readERC20 } from "./client";
import { getApexConfig } from "./network";
import type {
  RawJob,
  ParsedJob,
  EscrowInfo,
  EvaluatorInfo,
  SettlementInfo,
  CommerceContractState,
  RouterContractState,
  ReadResult,
  JobSummary,
} from "./types";
import { JOB_STATUS_LABELS, POLICY_VERDICTS, POLICY_VERDICT_LABELS } from "./types";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;
const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
const ZERO = BigInt(0);

// ── Helpers ───────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function ok<T>(data: T): ReadResult<T> {
  return { data, error: null, readAt: now() };
}

function fail<T>(error: string): ReadResult<T> {
  return { data: null, error, readAt: now() };
}

function parseJob(raw: RawJob): ParsedJob {
  const budgetFormatted =
    raw.budget > ZERO ? formatUnits(raw.budget, 18) : "0";
  const expiredAtDate =
    raw.expiredAt > ZERO ? new Date(Number(raw.expiredAt) * 1000) : null;
  const submittedAtDate =
    raw.submittedAt > ZERO
      ? new Date(Number(raw.submittedAt) * 1000)
      : null;
  const isExpired =
    expiredAtDate !== null && Date.now() > expiredAtDate.getTime();

  return {
    id: raw.id,
    client: raw.client,
    provider: raw.provider,
    evaluator: raw.evaluator,
    description: raw.description,
    budget: raw.budget,
    budgetFormatted,
    expiredAt: raw.expiredAt,
    expiredAtDate,
    status: raw.status,
    statusLabel: JOB_STATUS_LABELS[raw.status] ?? "Unknown",
    hook: raw.hook,
    submittedAt: raw.submittedAt,
    submittedAtDate,
    deliverable: raw.deliverable,
    isExpired,
  };
}

// ── Commerce reads ────────────────────────────────────────────

/**
 * Read a job from the AgenticCommerce kernel.
 * Returns null data + error if the job does not exist or the read fails.
 */
export async function getJob(
  jobId: bigint | number,
  chainId: number = 97,
): Promise<ReadResult<ParsedJob>> {
  const id = BigInt(jobId);
  const raw = await readCommerce<RawJob>("getJob", [id], chainId);

  if (!raw) {
    return fail(`Job ${id} not found or contract read failed`);
  }

  // The contract reverts with InvalidJob for non-existent IDs.
  // If we got here without error, the job exists.
  // However the status field being 0 (Open) with zero addresses means
  // the job was never created — guard against that.
  if (
    raw.client === ZERO_ADDR &&
    raw.provider === ZERO_ADDR &&
    raw.description === ""
  ) {
    return fail(`Job ${id} does not exist (all-zero data)`);
  }

  return ok(parseJob(raw));
}

/**
 * Read just the status of a job (lighter than full getJob).
 */
export async function getJobStatus(
  jobId: bigint | number,
  chainId: number = 97,
): Promise<ReadResult<{ status: number; label: string }>> {
  const raw = await readCommerce<RawJob>("getJob", [BigInt(jobId)], chainId);
  if (!raw) {
    return fail(`Job ${jobId} status not readable`);
  }
  return ok({
    status: raw.status,
    label: JOB_STATUS_LABELS[raw.status] ?? "Unknown",
  });
}

/**
 * Read escrow information for a job.
 */
export async function getEscrow(
  jobId: bigint | number,
  chainId: number = 97,
): Promise<ReadResult<EscrowInfo>> {
  const id = BigInt(jobId);
  const config = getApexConfig(chainId);

  const [rawJob, hasBudget, paymentToken] = await Promise.all([
    readCommerce<RawJob>("getJob", [id], chainId),
    readCommerce<boolean>("jobHasBudget", [id], chainId),
    readCommerce<`0x${string}`>("paymentToken", [], chainId),
  ]);

  if (!rawJob) {
    return fail(`Escrow for job ${id}: contract read failed`);
  }

  const token = paymentToken ?? config.paymentTokenFallback;
  const isFunded =
    hasBudget !== null ? hasBudget : rawJob.budget > ZERO;

  const canRefund =
    rawJob.status === 5 || // Expired — always refundable
    (rawJob.status === 4 && rawJob.budget > ZERO); // Rejected with funds
  const expiredAtMs =
    rawJob.expiredAt > ZERO ? Number(rawJob.expiredAt) * 1000 : 0;
  const isExpired = expiredAtMs > 0 && Date.now() > expiredAtMs;
  const canSettle =
    rawJob.status === 2 && // Submitted
    rawJob.budget > ZERO &&
    !isExpired;

  return ok({
    jobId: id,
    budget: rawJob.budget,
    budgetFormatted: formatUnits(rawJob.budget, 18),
    paymentToken: token,
    isFunded,
    canRefund,
    canSettle,
  });
}

// ── Evaluator reads ───────────────────────────────────────────

/**
 * Read evaluator information for a job from the EvaluatorRouter (policy
 * binding) and the OptimisticPolicy (per-job dispute/execution state).
 */
export async function getEvaluator(
  jobId: bigint | number,
  chainId: number = 97,
): Promise<ReadResult<EvaluatorInfo>> {
  const id = BigInt(jobId);

  const [policyAddr, submittedAt, isDisputed, rejectVotes, quorum] =
    await Promise.all([
      readRouter<`0x${string}`>("jobPolicy", [id], chainId),
      readPolicy<bigint>("submittedAt", [id], chainId),
      readPolicy<boolean>("disputed", [id], chainId),
      readPolicy<number>("rejectVotes", [id], chainId),
      readPolicy<number>("voteQuorum", [], chainId),
    ]);

  const subAt = submittedAt ?? ZERO;
  const subAtMs = subAt > ZERO ? Number(subAt) * 1000 : null;

  return ok({
    jobId: id,
    policyAddress: policyAddr,
    isDisputed: isDisputed ?? false,
    rejectVotes: rejectVotes ?? 0,
    quorum: quorum ?? 0,
    submittedAt: subAt,
    submittedAtDate: subAtMs ? new Date(subAtMs) : null,
    hasVoted: false, // Requires caller address — left for client-side
  });
}

// ── Settlement reads ──────────────────────────────────────────

/**
 * Read settlement state from the OptimisticPolicy, including the
 * authoritative verdict from `check(jobId)`. Verdict codes follow IPolicy:
 * 0 = Pending, 1 = Approve, 2 = Reject.
 */
export async function getSettlement(
  jobId: bigint | number,
  chainId: number = 97,
): Promise<ReadResult<SettlementInfo>> {
  const id = BigInt(jobId);

  const [disputeWindow, voteQuorum, activeVoterCount, submittedAt, check] =
    await Promise.all([
      readPolicy<number>("disputeWindow", [], chainId),
      readPolicy<number>("voteQuorum", [], chainId),
      readPolicy<number>("activeVoterCount", [], chainId),
      readPolicy<bigint>("submittedAt", [id], chainId),
      readPolicy<readonly [number, `0x${string}`]>("check", [id, "0x"], chainId),
    ]);

  const subAt = submittedAt ?? ZERO;
  const subAtMs = subAt > ZERO ? Number(subAt) * 1000 : null;
  const dw = disputeWindow ?? 0;
  const settleAtMs = subAtMs !== null && dw > 0 ? subAtMs + dw * 1000 : null;
  const canSettleNow = settleAtMs !== null && Date.now() >= settleAtMs;

  const verdict = check ? check[0] : POLICY_VERDICTS.PENDING;
  const reason = check
    ? (check[1] as `0x${string}`)
    : (ZERO_HASH as `0x${string}`);

  return ok({
    jobId: id,
    verdict,
    verdictLabel: POLICY_VERDICT_LABELS[verdict] ?? "Pending",
    reason,
    disputeWindow: dw,
    voteQuorum: voteQuorum ?? 0,
    activeVoterCount: activeVoterCount ?? 0,
    submittedAt: subAt,
    submittedAtDate: subAtMs ? new Date(subAtMs) : null,
    settleAtMs,
    canSettleNow,
  });
}

// ── Contract-level state reads ────────────────────────────────

/**
 * Read AgenticCommerce contract-level state.
 */
export async function getCommerceState(
  chainId: number = 97,
): Promise<ReadResult<CommerceContractState>> {
  const [jobCounter, paymentToken, feeBP, treasury, isPaused] =
    await Promise.all([
      readCommerce<bigint>("jobCounter", [], chainId),
      readCommerce<`0x${string}`>("paymentToken", [], chainId),
      readCommerce<bigint>("platformFeeBP", [], chainId),
      readCommerce<`0x${string}`>("platformTreasury", [], chainId),
      readCommerce<boolean>("paused", [], chainId),
    ]);

  return ok({
    jobCounter: jobCounter ?? BigInt(0),
    paymentToken: paymentToken ?? null,
    platformFeeBP: feeBP ?? BigInt(0),
    platformTreasury: treasury ?? null,
    isPaused: isPaused ?? false,
  });
}

/**
 * Read EvaluatorRouter contract-level state.
 */
export async function getRouterState(
  chainId: number = 97,
): Promise<ReadResult<RouterContractState>> {
  const [commerce, isPaused, activeVoterCount, disputeWindow, voteQuorum] =
    await Promise.all([
      readRouter<`0x${string}`>("commerce", [], chainId),
      readRouter<boolean>("paused", [], chainId),
      readRouter<number>("activeVoterCount", [], chainId),
      readRouter<number>("disputeWindow", [], chainId),
      readRouter<number>("voteQuorum", [], chainId),
    ]);

  return ok({
    commerce: commerce ?? null,
    isPaused: isPaused ?? false,
    activeVoterCount: activeVoterCount ?? 0,
    disputeWindow: disputeWindow ?? 0,
    voteQuorum: voteQuorum ?? 0,
  });
}

// ── Composite reads ───────────────────────────────────────────

/**
 * Read all job-related data in parallel.
 * Returns a unified summary with individual errors for each sub-read.
 */
export async function getJobSummary(
  jobId: bigint | number,
  chainId: number = 97,
): Promise<JobSummary> {
  const [jobResult, escrowResult, evaluatorResult, settlementResult] =
    await Promise.all([
      getJob(jobId, chainId),
      getEscrow(jobId, chainId),
      getEvaluator(jobId, chainId),
      getSettlement(jobId, chainId),
    ]);

  const errors: string[] = [];
  if (jobResult.error) errors.push(`job: ${jobResult.error}`);
  if (escrowResult.error) errors.push(`escrow: ${escrowResult.error}`);
  if (evaluatorResult.error) errors.push(`evaluator: ${evaluatorResult.error}`);
  if (settlementResult.error)
    errors.push(`settlement: ${settlementResult.error}`);

  return {
    job: jobResult.data,
    escrow: escrowResult.data,
    evaluator: evaluatorResult.data,
    settlement: settlementResult.data,
    errors,
    readAt: now(),
  };
}

// ── Convenience: getCommerceJob alias ─────────────────────────

/**
 * Alias matching the user's requested API surface.
 * Reads the full job data from the Commerce kernel.
 */
export const getCommerceJob = getJob;

// ── Receipt event extraction ─────────────────────────────────

/**
 * Compute the keccak256 topic0 for the JobCreated event.
 * Event signature: JobCreated(uint256,address,address,address,uint256,address)
 */
/**
 * keccak256("JobCreated(uint256,address,address,address,uint256,address)")
 * Computed from the contract ABI event signature.
 */
const JOB_CREATED_TOPIC0 =
  "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9" as const;

/**
 * Extract the jobId from a JobCreated event in transaction logs.
 *
 * The event is: JobCreated(uint256 indexed jobId, address indexed client, ...)
 * jobId is topics[1] (first indexed param, uint256).
 *
 * Returns null if the event is not found in the logs.
 */
export function extractJobIdFromReceipt(
  logs: readonly Log[],
): bigint | null {
  for (const log of logs) {
    if (
      log.topics &&
      log.topics[0]?.toLowerCase() === JOB_CREATED_TOPIC0.toLowerCase() &&
      log.topics[1]
    ) {
      return BigInt(log.topics[1]);
    }
  }
  return null;
}

/**
 * Fallback: if JobCreated event topic doesn't match (e.g. topic0 differs
 * on-chain), derive jobId from jobCounter - 1. This is a heuristic that
 * works when the caller is the only one creating jobs in the same block.
 */
export async function getJobIdFallback(
  chainId: number = 97,
): Promise<bigint | null> {
  const counter = await readCommerce<bigint>("jobCounter", [], chainId);
  if (counter === null || counter <= BigInt(0)) return null;
  return counter - BigInt(1);
}

// ── ERC-20 helpers ───────────────────────────────────────────

/**
 * Check the ERC-20 allowance of `owner` for `spender` on `token`.
 */
export async function checkAllowance(
  tokenAddress: Address,
  owner: Address,
  spender: Address,
  chainId: number = 97,
): Promise<bigint | null> {
  return readERC20<bigint>(tokenAddress, "allowance", [owner, spender], chainId);
}

/**
 * Check the ERC-20 balance of `account` on `token`.
 */
export async function checkBalance(
  tokenAddress: Address,
  account: Address,
  chainId: number = 97,
): Promise<bigint | null> {
  return readERC20<bigint>(tokenAddress, "balanceOf", [account], chainId);
}

/**
 * Read the ERC-20 token symbol.
 */
export async function getTokenSymbol(
  tokenAddress: Address,
  chainId: number = 97,
): Promise<string | null> {
  return readERC20<string>(tokenAddress, "symbol", [], chainId);
}

/**
 * Read the ERC-20 token decimals.
 */
export async function getTokenDecimals(
  tokenAddress: Address,
  chainId: number = 97,
): Promise<number | null> {
  const d = await readERC20<number>(tokenAddress, "decimals", [], chainId);
  return d;
}
