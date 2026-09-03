/**
 * Local persistence for hire flow transaction hashes.
 *
 * The Hire flow produces the real onchain tx hashes (createJob → registerJob →
 * setBudget → approve → fund). Storing them keyed by jobId lets any page
 * (e.g. /jobs/[jobId]) render the exact transaction timeline without
 * fabricating values. Missing tx hashes (e.g. approve was skipped because a
 * sufficient allowance already existed) remain null — never invented.
 */

export interface HireRecordTxHashes {
  create: string | null;
  register: string | null;
  budget: string | null;
  approve: string | null;
  fund: string | null;
  /** Provider submit tx — real hash when the job has been executed */
  submit?: string | null;
  /** Settle (finalization) tx — real hash when the job has been settled */
  settle?: string | null;
}

export interface HireRecord {
  jobId: string;
  agentId: string;
  agentName: string;
  /** Chain the ERC-8183 job was created on (BSC testnet = 97). */
  chainId: number;
  hiredAt: string;
  tx: HireRecordTxHashes;
  /** Real ERC-8004 agent chain id (e.g. BSC mainnet = 56) for onchain hires. */
  agentChainId?: number;
  /** Real ERC-8004 registration token id for onchain hires. */
  agentTokenId?: number;
  /** Real provider wallet used in createJob — onchain hires only. */
  providerAddress?: string;
  /** bytes32 deliverable submitted on-chain during execution */
  deliverable?: string | null;
  executedAt?: string | null;
  settledAt?: string | null;
}

const STORAGE_KEY = "agentx:hire-records";

function readMap(): Record<string, HireRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HireRecord>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, HireRecord>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode / quota) — timeline just won't persist.
  }
}

export function saveHireRecord(record: HireRecord): void {
  const map = readMap();
  map[record.jobId] = record;
  writeMap(map);
}

export function getHireRecord(jobId: string | number): HireRecord | null {
  const map = readMap();
  return map[String(jobId)] ?? null;
}

/**
 * Persist execution-phase results (provider submit / settlement) for a job.
 * Merges into the existing hire record if present so the full timeline
 * (create → fund → submit → settle) lives in one place. Only real tx hashes
 * are stored — never placeholder values.
 */
export interface ExecutionPatch {
  deliverable?: string;
  submit?: string;
  settle?: string;
  executedAt?: string;
  settledAt?: string;
}

export function saveExecutionRecord(
  jobId: string | number,
  patch: ExecutionPatch,
): void {
  const key = String(jobId);
  const map = readMap();
  const existing = map[key];

  map[key] = {
    jobId: key,
    agentId: existing?.agentId ?? "",
    agentName: existing?.agentName ?? "",
    chainId: existing?.chainId ?? 97,
    agentChainId: existing?.agentChainId,
    agentTokenId: existing?.agentTokenId,
    providerAddress: existing?.providerAddress,
    hiredAt: existing?.hiredAt ?? new Date().toISOString(),
    tx: {
      create: existing?.tx?.create ?? null,
      register: existing?.tx?.register ?? null,
      budget: existing?.tx?.budget ?? null,
      approve: existing?.tx?.approve ?? null,
      fund: existing?.tx?.fund ?? null,
      submit: patch.submit ?? existing?.tx?.submit ?? null,
      settle: patch.settle ?? existing?.tx?.settle ?? null,
    },
    deliverable: patch.deliverable ?? existing?.deliverable ?? null,
    executedAt: patch.executedAt ?? existing?.executedAt ?? null,
    settledAt: patch.settledAt ?? existing?.settledAt ?? null,
  };

  writeMap(map);
}