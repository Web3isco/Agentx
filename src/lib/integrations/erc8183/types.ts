import type { Hex } from "viem";

/**
 * ERC-8183 APEX types.
 *
 * Source: https://github.com/bnb-chain/apex-contracts
 * Spec:   https://eips.ethereum.org/EIPS/eip-8183
 *
 * These types mirror the on-chain structs from AgenticCommerceUpgradeable
 * and EvaluatorRouterUpgradeable. All fields are read-only; no write
 * transaction types are included yet.
 */

// ── Job status enum (mirrors IACP.JobStatus) ──────────────────

export type JobStatusRaw = 0 | 1 | 2 | 3 | 4 | 5;

export const JOB_STATUS_LABELS: Record<JobStatusRaw, string> = {
  0: "Open",
  1: "Funded",
  2: "Submitted",
  3: "Completed",
  4: "Rejected",
  5: "Expired",
};

// ── Raw on-chain structs ──────────────────────────────────────

/** Raw job tuple returned by AgenticCommerce.getJob(jobId) */
export interface RawJob {
  id: bigint;
  client: Hex;
  provider: Hex;
  evaluator: Hex;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: JobStatusRaw;
  hook: Hex;
  submittedAt: bigint;
  deliverable: Hex;
}

/** Parsed job with human-friendly fields */
export interface ParsedJob {
  id: bigint;
  client: Hex;
  provider: Hex;
  evaluator: Hex;
  description: string;
  budget: bigint;
  budgetFormatted: string;
  expiredAt: bigint;
  expiredAtDate: Date | null;
  status: JobStatusRaw;
  statusLabel: string;
  hook: Hex;
  submittedAt: bigint;
  submittedAtDate: Date | null;
  deliverable: Hex;
  isExpired: boolean;
}

/** Escrow information derived from job data */
export interface EscrowInfo {
  jobId: bigint;
  budget: bigint;
  budgetFormatted: string;
  paymentToken: Hex | null;
  isFunded: boolean;
  canRefund: boolean;
  canSettle: boolean;
}

/** Evaluator information from EvaluatorRouter + OptimisticPolicy */
export interface EvaluatorInfo {
  jobId: bigint;
  /** jobPolicy(jobId) on the Router — the policy bound to this job */
  policyAddress: Hex | null;
  isDisputed: boolean;
  /** rejectVotes(jobId) on the policy */
  rejectVotes: number;
  /** Global minimum reject votes required for a REJECT verdict */
  quorum: number;
  /** submittedAt(jobId) on the policy — when the deliverable was submitted */
  submittedAt: bigint;
  submittedAtDate: Date | null;
  /** Whether the job has been disputed by the client within the window */
  hasVoted: boolean;
}

/** Settlement verdict codes per IPolicy */
export const POLICY_VERDICTS = {
  PENDING: 0,
  APPROVE: 1,
  REJECT: 2,
} as const;

export const POLICY_VERDICT_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Approve",
  2: "Reject",
};

/** Settlement verdict from OptimisticPolicy */
export interface SettlementInfo {
  jobId: bigint;
  /** Authoritative verdict from policy.check: 0 Pending, 1 Approve, 2 Reject */
  verdict: number;
  verdictLabel: string;
  reason: Hex;
  disputeWindow: number;
  voteQuorum: number;
  activeVoterCount: number;
  submittedAt: bigint;
  submittedAtDate: Date | null;
  /** ms timestamp when the optimistic window elapses (submittedAt + disputeWindow) */
  settleAtMs: number | null;
  /** True once now >= settleAtMs (verdict becomes Approve unless disputed) */
  canSettleNow: boolean;
}

/** Commerce-level summary from AgenticCommerce contract state */
export interface CommerceContractState {
  jobCounter: bigint;
  paymentToken: Hex | null;
  platformFeeBP: bigint;
  platformTreasury: Hex | null;
  isPaused: boolean;
}

/** Router-level summary from EvaluatorRouter contract state */
export interface RouterContractState {
  commerce: Hex | null;
  isPaused: boolean;
  activeVoterCount: number;
  disputeWindow: number;
  voteQuorum: number;
}

/** Result wrapper for any on-chain read that may fail */
export interface ReadResult<T> {
  data: T | null;
  error: string | null;
  readAt: string;
}

/** Summary of all reads for a single jobId */
export interface JobSummary {
  job: ParsedJob | null;
  escrow: EscrowInfo | null;
  evaluator: EvaluatorInfo | null;
  settlement: SettlementInfo | null;
  errors: string[];
  readAt: string;
}
