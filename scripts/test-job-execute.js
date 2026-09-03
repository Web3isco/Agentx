#!/usr/bin/env node
/**
 * ERC-8183 APEX Job Execution — Live BSC Testnet Wallet Test
 *
 * Takes an existing FUNDED job and actually executes it through the provider:
 *
 *   PHASE 1  Load job → must be Funded (status 1) with provider == wallet
 *   PHASE 2  Build deliverable (keccak256 of the agent execution record)
 *            Provider calls commerce.submit(jobId, deliverable) → Submitted
 *            Router hook records policy.submittedAt (starts dispute window)
 *   PHASE 3  Wait for the optimistic dispute window (policy.disputeWindow)
 *   PHASE 4  Any wallet calls router.settle(jobId) → policy.check = Approve
 *            → commerce.complete → payment released to provider
 *   PHASE 5  Verify status == Completed (3) and provider U balance increased
 *
 * Usage:
 *   APEX_TEST_PRIVATE_KEY=0x... node scripts/test-job-execute.js [JOB_ID]
 *
 * NEVER commit or share the private key. This script never prints it.
 */

const {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  formatUnits,
  encodeFunctionData,
} = require("viem");
const { bscTestnet } = require("viem/chains");
const { privateKeyToAccount } = require("viem/accounts");

// ── Verified contract addresses (BSC Testnet) ────────────────
const COMMERCE = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const ROUTER = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const POLICY = "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea";
const U_TOKEN = "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565";

const RPC = "https://bsc-testnet-rpc.publicnode.com";
const BSCSCAN_TX = "https://testnet.bscscan.com/tx/";
const DEFAULT_JOB_ID = 786; // the fully funded job created earlier on testnet

// ── ABIs ─────────────────────────────────────────────────────
const COMMERCE_ABI = [
  {
    inputs: [{ name: "jobId", type: "uint256" }],
    name: "getJob",
    outputs: [{
      components: [
        { name: "id", type: "uint256" },
        { name: "client", type: "address" },
        { name: "provider", type: "address" },
        { name: "evaluator", type: "address" },
        { name: "description", type: "string" },
        { name: "budget", type: "uint256" },
        { name: "expiredAt", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "hook", type: "address" },
      ],
      name: "",
      type: "tuple",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "deliverable", type: "bytes32" },
      { name: "optParams", type: "bytes" },
    ],
    name: "submit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
const ROUTER_ABI = [
  {
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "evidence", type: "bytes" },
    ],
    name: "settle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const POLICY_ABI = [
  { inputs: [], name: "disputeWindow", outputs: [{ type: "uint64" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "jobId", type: "uint256" }], name: "submittedAt", outputs: [{ type: "uint64" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "jobId", type: "uint256" }], name: "disputed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
];

// ── Reporting helpers ─────────────────────────────────────────
let stepCount = 0;
let passCount = 0;
let failCount = 0;
let currentStep = "";
const steps = [];

function step(name) {
  currentStep = name;
  stepCount += 1;
  console.log(`\n▶ PHASE ${stepCount} — ${name}`);
}
function pass(msg) {
  passCount += 1;
  console.log(`   ✓ PASS  ${msg}`);
  steps.push({ phase: currentStep, ok: true, msg: `PASS ${msg}` });
}
function fail(msg, hard = true) {
  failCount += 1;
  console.log(`   ✗ FAIL  ${msg}`);
  steps.push({ phase: currentStep, ok: false, msg: `FAIL ${msg}` });
  if (hard) {
    console.log("\n── Execution aborted ──");
    process.exitCode = 1;
    process.exit(1);
  }
}
function info(label, value) {
  console.log(`   ℹ ${label}: ${value}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  // ── 0. Env + client setup ──────────────────────────────────
  const pk = process.env.APEX_TEST_PRIVATE_KEY;
  if (!pk || !pk.startsWith("0x") || pk.length !== 66) {
    console.error("APEX_TEST_PRIVATE_KEY must be set to 0x + 64 hex chars");
    process.exit(1);
  }
  const account = privateKeyToAccount(pk);
  console.log(`Account (provider): ${account.address}`);

  const jobIdInput = process.argv[2] ?? String(DEFAULT_JOB_ID);
  const JOB_ID = BigInt(jobIdInput);

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC),
  });
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http(RPC),
  });

  // ── PHASE 1: load job ──────────────────────────────────────
  step("Load job + validate provider role");
  let job;
  try {
    job = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "getJob",
      args: [JOB_ID],
    });
  } catch (e) {
    fail(`getJob(${jobIdInput}) failed: ${e.shortMessage ?? e.message}`, false);
  }
  if (job) {
    info("status", `${job.status} (0 Open, 1 Funded, 2 Submitted, 3 Completed, 4 Rejected, 5 Expired)`);
    info("provider", job.provider);
    info("budget", `${formatUnits(job.budget, 18)} U`);
    if (job.status !== 1) {
      fail(`Job must be Funded (1) to execute — got status ${job.status}.`, false);
    } else if (job.provider.toLowerCase() !== account.address.toLowerCase()) {
      fail(`Connected wallet is not the job provider (${job.provider}).`, false);
    } else {
      pass(`Job ${jobIdInput} is Funded and this wallet is the provider`);
    }
  }

  // ── PHASE 2: submit deliverable ────────────────────────────
  step("Provider submits deliverable (submit → Submitted)");
  const record = JSON.stringify(
    {
      protocol: "AGENTX-ERC8183",
      chainId: 97,
      jobId: jobIdInput,
      provider: account.address,
      description: job?.description ?? "",
      executedAt: new Date().toISOString(),
      statement: "Deliverable submitted on-chain by the job provider.",
    },
    null,
    2,
  );
  const deliverable = keccak256(toBytes(record));
  info("deliverable (sha3 of record)", deliverable);

  let submitTxHash;
  try {
    submitTxHash = await walletClient.sendTransaction({
      to: COMMERCE,
      data: encodeFunctionData({
        abi: COMMERCE_ABI,
        functionName: "submit",
        args: [JOB_ID, deliverable, "0x"],
      }),
    });
    info("tx", `${BSCSCAN_TX}${submitTxHash}`);
    await publicClient.waitForTransactionReceipt({ hash: submitTxHash });
    pass(`submit tx mined: ${submitTxHash}`);
  } catch (e) {
    fail(`submit failed: ${e.shortMessage ?? e.message}`);
  }

  // ── PHASE 3: verify Submitted + dispute window ─────────────
  step("Verify Submitted + optimistic window start");
  const [policySubmittedAt, disputeWindow, disputed] = await Promise.all([
    publicClient.readContract({
      address: POLICY,
      abi: POLICY_ABI,
      functionName: "submittedAt",
      args: [JOB_ID],
    }).catch(() => 0n),
    publicClient.readContract({
      address: POLICY,
      abi: POLICY_ABI,
      functionName: "disputeWindow",
    }).catch(() => 0n),
    publicClient.readContract({
      address: POLICY,
      abi: POLICY_ABI,
      functionName: "disputed",
      args: [JOB_ID],
    }).catch(() => false),
  ]);

  if (policySubmittedAt === 0n) {
    fail("policy.submittedAt is still 0 — submission was not recorded");
  } else {
    pass(`submit recorded: policy.submittedAt = ${policySubmittedAt} (${new Date(Number(policySubmittedAt) * 1000).toISOString()})`);
  }
  info("policy.disputeWindow", `${disputeWindow.toString()}s`);
  info("policy.disputed", String(disputed));

  const settleAt = policySubmittedAt + disputeWindow;
  console.log(`   ℹ optimistic approval available at block time >= ${settleAt.toString()} (~${new Date(Number(settleAt) * 1000).toISOString()})`);

  // ── PHASE 4: wait for the dispute window ───────────────────
  step("Wait for optimistic window (poll latest block time)");
  let blockTime = 0n;
  while (true) {
    const latest = await publicClient.getBlock({ blockTag: "latest" });
    blockTime = latest.timestamp;
    const remaining = Number(settleAt - blockTime);
    if (remaining <= 0) {
      pass(`window elapsed (block time ${blockTime} >= ${settleAt})`);
      break;
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    console.log(`   ⏳ waiting… ${m}m ${s}s until settle available`);
    await sleep(20000);
  }

  // ── PHASE 5: settle (permissionless) ───────────────────────
  step("Settle via Router (policy verdict → complete)");
  const balBefore = await publicClient.readContract({
    address: U_TOKEN,
    abi: COMMERCE_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  info("provider U balance before settle", `${formatUnits(balBefore, 18)} U`);

  let settleTxHash;
  try {
    settleTxHash = await walletClient.sendTransaction({
      to: ROUTER,
      data: encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: "settle",
        args: [JOB_ID, "0x"],
      }),
    });
    info("tx", `${BSCSCAN_TX}${settleTxHash}`);
    await publicClient.waitForTransactionReceipt({ hash: settleTxHash });
    pass(`settle tx mined: ${settleTxHash}`);
  } catch (e) {
    fail(`settle failed: ${e.shortMessage ?? e.message}`);
  }

  // ── PHASE 6: verify completion + payment ───────────────────
  step("Verify job Completed + payment released to provider");
  const finalJob = await publicClient.readContract({
    address: COMMERCE,
    abi: COMMERCE_ABI,
    functionName: "getJob",
    args: [JOB_ID],
  });
  const finalStatus = finalJob.status;
  if (finalStatus === 3) {
    pass(`job status = 3 (Completed)`);
  } else {
    fail(`expected status 3, got ${finalStatus}`, false);
  }

  const balAfter = await publicClient.readContract({
    address: U_TOKEN,
    abi: COMMERCE_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  const delta = balAfter - balBefore;
  info("provider U balance after settle", `${formatUnits(balAfter, 18)} U`);
  info("balance delta", `${formatUnits(delta, 18)} U`);

  if (delta >= finalJob.budget) {
    pass(`payment released to provider = ${formatUnits(finalJob.budget, 18)} U`);
  } else if (delta > 0n) {
    fail(`partial release only: ${formatUnits(delta, 18)} U < budget ${formatUnits(finalJob.budget, 18)} U`, false);
  } else {
    fail(`no payment released to provider (delta = 0)`, false);
  }

  // ── Summary ────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`EXECUTION ${failCount === 0 ? "PASSED" : "FAILED"} — ${stepCount} phases, ${passCount} pass, ${failCount} fail`);
  console.log(`  submit: ${submitTxHash}`);
  console.log(`  settle: ${settleTxHash}`);
  console.log("=".repeat(60));
  process.exit(failCount === 0 ? 0 : 1);
})();