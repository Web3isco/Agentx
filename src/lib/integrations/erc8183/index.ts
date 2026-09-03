/**
 * ERC-8183 APEX integration layer.
 *
 * Read + write service for the full hire lifecycle:
 * createJob → setBudget → approve ERC-20 → fund → read status.
 *
 * All read functions return ReadResult<T> with null data + error string
 * on failure — never throw, never return fake values.
 */

// Types
export type {
  ParsedJob,
  EscrowInfo,
  EvaluatorInfo,
  SettlementInfo,
  CommerceContractState,
  RouterContractState,
  ReadResult,
  JobSummary,
  JobStatusRaw,
} from "./types";
export {
  JOB_STATUS_LABELS,
  POLICY_VERDICTS,
  POLICY_VERDICT_LABELS,
} from "./types";

// ABIs
export { AGENTIC_COMMERCE_ABI, ERC20_ABI, EVALUATOR_ROUTER_ABI } from "./abi";

// Network config
export { getApexConfig, BSC_TESTNET_CONFIG, BSC_MAINNET_CONFIG } from "./network";
export type { ApexNetworkConfig } from "./network";

// Service functions
export {
  getJob,
  getJobStatus,
  getEscrow,
  getEvaluator,
  getSettlement,
  getCommerceState,
  getRouterState,
  getJobSummary,
  getCommerceJob,
} from "./service";

// ERC-20 helpers
export {
  checkAllowance,
  checkBalance,
  getTokenSymbol,
  getTokenDecimals,
  extractJobIdFromReceipt,
  getJobIdFallback,
} from "./service";

// Write helpers
export {
  getCreateJobConfig,
  getSetBudgetConfig,
  getRegisterJobConfig,
  getFundConfig,
  getApproveConfig,
  getSubmitConfig,
  getSettleConfig,
} from "./write";
export type { CreateJobParams, WriteResult } from "./write";

// Deliverable builder (provider submit payload)
export { buildExecutionDeliverable } from "./deliverable";
export type { ExecutionDeliverable, DeliverableInput } from "./deliverable";

// Raw client helpers
export { readERC20 } from "./client";
