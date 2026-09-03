#!/usr/bin/env node
/**
 * ERC-8183 APEX Hire Lifecycle — Live BSC Testnet Wallet Test
 *
 * Usage:
 *   APEX_TEST_PRIVATE_KEY=0x... node scripts/test-hire-lifecycle.js
 *
 * NEVER commit or share the private key. This script:
 *   - Never prints the private key
 *   - Never logs the raw key in errors
 *   - Validates all inputs before any transaction
 *   - Reports PASS/FAIL for every lifecycle step
 */

const {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  formatUnits,
  parseUnits,
  formatEther,
  decodeEventLog,
  parseEther,
} = require("viem");
const { bscTestnet } = require("viem/chains");
const { privateKeyToAccount } = require("viem/accounts");

// ── Verified contract addresses ──────────────────────────────
const COMMERCE = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const ROUTER = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const POLICY = "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea";

const RPC = "https://bsc-testnet-rpc.publicnode.com";
const BSCSCAN_TX = "https://testnet.bscscan.com/tx/";

// ── ABIs (JSON format — parseAbi doesn't support inline tuples) ──
const COMMERCE_ABI = [
  { inputs: [], name: "jobCounter", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paymentToken", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "platformFeeBP", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
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
        { name: "submittedAt", type: "uint256" },
        { name: "deliverable", type: "bytes32" },
      ],
      name: "",
      type: "tuple",
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    name: "createJob",
    outputs: [{ name: "jobId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    name: "setBudget",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "expectedBudget", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    name: "fund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "evaluator", type: "address" },
      { indexed: false, name: "expiredAt", type: "uint256" },
      { indexed: false, name: "hook", type: "address" },
    ],
    name: "JobCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "BudgetSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "JobFunded",
    type: "event",
  },
];

const ERC20_ABI = [
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
];

const ROUTER_ABI = [
  { inputs: [{ name: "jobId", type: "uint256" }], name: "jobPolicy", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "policy", type: "address" }], name: "policyWhitelist", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "jobId", type: "uint256" }, { name: "policy", type: "address" }],
    name: "registerJob",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ── Test parameters ──────────────────────────────────────────
const BUDGET_AMOUNT = "0.01";
const DURATION_DAYS = 7;
const JOB_DESCRIPTION = `ERC-8183 lifecycle test — ${new Date().toISOString()}`;

// ── Results tracker ──────────────────────────────────────────
const results = [];
let currentStep = "";

function pass(detail) {
  results.push({ step: currentStep, status: "PASS", detail: detail || "" });
  console.log(`  \x1b[32m✓ PASS\x1b[0m ${currentStep}${detail ? ": " + detail : ""}`);
}

function fail(detail) {
  results.push({ step: currentStep, status: "FAIL", detail: detail || "" });
  console.log(`  \x1b[31m✗ FAIL\x1b[0m ${currentStep}: ${detail}`);
}

function info(label, value) {
  console.log(`  ℹ ${label}: ${value}`);
}

function txLink(hash) {
  return `${BSCSCAN_TX}${hash}`;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ERC-8183 APEX Hire Lifecycle — Live Wallet Test       ║");
  console.log("║   BSC Testnet                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ═══ PHASE 0: Pre-flight validation ════════════════════════
  console.log("═══ PHASE 0: PRE-FLIGHT VALIDATION ═══");

  // 0.1 Environment variable
  currentStep = "APEX_TEST_PRIVATE_KEY env var";
  const pk = process.env.APEX_TEST_PRIVATE_KEY;
  if (!pk) {
    fail("APEX_TEST_PRIVATE_KEY not set. Usage: APEX_TEST_PRIVATE_KEY=0x... node scripts/test-hire-lifecycle.js");
    process.exit(1);
  }
  if (!pk.startsWith("0x") || pk.length !== 66) {
    fail("Private key must be 0x + 64 hex chars");
    process.exit(1);
  }
  pass("Private key loaded (NOT logged)");

  // 0.2 Create clients
  currentStep = "Wallet client creation";
  let account;
  try {
    account = privateKeyToAccount(pk);
    pass(`Account: ${account.address}`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http(RPC),
  });

  // 0.3 Chain ID
  currentStep = "BSC Testnet chain ID";
  try {
    const chainId = await publicClient.getChainId();
    if (chainId === 97) {
      pass(`Chain ID = ${chainId}`);
    } else {
      fail(`Expected 97, got ${chainId}`);
      process.exit(1);
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.4 Balance check
  currentStep = "Wallet tBNB balance";
  let balance;
  try {
    balance = await publicClient.getBalance({ address: account.address });
    info("Balance", `${formatEther(balance)} tBNB`);
    if (balance < parseEther("0.005")) {
      fail("Insufficient tBNB. Need at least 0.005 tBNB for gas + test.");
      process.exit(1);
    }
    pass(`${formatEther(balance)} tBNB available`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.5 Commerce contract code
  currentStep = "Commerce contract code";
  try {
    const code = await publicClient.getCode({ address: COMMERCE });
    if (code && code !== "0x") {
      pass(`${Math.floor((code.length - 2) / 2)} bytes`);
    } else {
      fail("No code at Commerce address");
      process.exit(1);
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.6 Commerce paused check
  currentStep = "Commerce not paused";
  try {
    const paused = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "paused",
    });
    if (!paused) {
      pass("Not paused");
    } else {
      fail("Contract is PAUSED");
      process.exit(1);
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.7 Job counter
  currentStep = "jobCounter read";
  let jobCounter;
  try {
    jobCounter = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "jobCounter",
    });
    pass(`Current counter = ${jobCounter.toString()}`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.8 Payment token from contract
  currentStep = "paymentToken from Commerce";
  let paymentToken;
  try {
    paymentToken = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "paymentToken",
    });
    if (paymentToken === "0x0000000000000000000000000000000000000000") {
      fail("Zero address returned");
      process.exit(1);
    }
    pass(paymentToken);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.9 Token decimals
  currentStep = "Payment token decimals";
  let tokenDecimals;
  try {
    tokenDecimals = await publicClient.readContract({
      address: paymentToken,
      abi: ERC20_ABI,
      functionName: "decimals",
    });
    pass(`${tokenDecimals}`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.10 Token balance
  currentStep = "Payment token wallet balance";
  let tokenBalance;
  try {
    tokenBalance = await publicClient.readContract({
      address: paymentToken,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    info("Balance", `${formatUnits(tokenBalance, tokenDecimals)} tokens`);
    const required = parseUnits(BUDGET_AMOUNT, tokenDecimals);
    if (tokenBalance < required) {
      fail(`Need ${formatUnits(required, tokenDecimals)} tokens, have ${formatUnits(tokenBalance, tokenDecimals)}`);
      process.exit(1);
    }
    pass(`${formatUnits(tokenBalance, tokenDecimals)} tokens available`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 0.11 Platform fee
  currentStep = "platformFeeBP read";
  try {
    const fee = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "platformFeeBP",
    });
    pass(`${fee.toString()} BP (${Number(fee) / 100}%)`);
  } catch (e) {
    fail(e.message);
  }

  // ═══ PHASE 1: CREATE JOB ═══════════════════════════════════
  console.log("\n═══ PHASE 1: CREATE JOB ═══");

  const now = Math.floor(Date.now() / 1000);
  const expiredAt = BigInt(now + DURATION_DAYS * 86400);

  currentStep = "createJob transaction";
  let createTxHash;
  let createReceipt;
  let jobId;

  try {
    createTxHash = await walletClient.writeContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "createJob",
      args: [
        account.address,  // provider = our wallet
        ROUTER,           // evaluator = Router
        expiredAt,
        JOB_DESCRIPTION,
        ROUTER,           // hook = Router
      ],
    });

    info("TX hash", createTxHash);
    info("BscScan", txLink(createTxHash));

    createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });
    info("Status", createReceipt.status === "success" ? "SUCCESS" : "REVERTED");
    info("Gas used", createReceipt.gasUsed.toString());

    if (createReceipt.status !== "success") {
      fail("Transaction reverted on-chain");
      process.exit(1);
    }

    pass(`Receipt status: success, gas: ${createReceipt.gasUsed}`);
  } catch (e) {
    fail(e.message);
    if (createTxHash) info("TX hash (may still be pending)", createTxHash);
    process.exit(1);
  }

  // 1.1 Extract jobId from JobCreated event
  currentStep = "Extract jobId from JobCreated event";
  try {
    const JOB_CREATED_TOPIC = keccak256(
      toBytes("JobCreated(uint256,address,address,address,uint256,address)")
    );

    let foundJobId = null;
    for (const log of createReceipt.logs) {
      if (log.topics && log.topics[0] && log.topics[0].toLowerCase() === JOB_CREATED_TOPIC.toLowerCase()) {
        foundJobId = BigInt(log.topics[1]);
        info("Job ID (from event)", foundJobId.toString());
        info("Client (from event)", log.topics[2] ? `0x${log.topics[2].slice(26)}` : "N/A");
        info("Provider (from event)", log.topics[3] ? `0x${log.topics[3].slice(26)}` : "N/A");
        break;
      }
    }

    if (foundJobId === null) {
      const newCounter = await publicClient.readContract({
        address: COMMERCE,
        abi: COMMERCE_ABI,
        functionName: "jobCounter",
      });
      foundJobId = newCounter - 1n;
      info("Job ID (fallback from counter)", foundJobId.toString());
    }

    jobId = foundJobId;
    pass(`jobId = ${jobId.toString()}`);
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // ═══ PHASE 2: VERIFY JOB ON-CHAIN ══════════════════════════
  console.log("\n═══ PHASE 2: VERIFY JOB ON-CHAIN ═══");

  currentStep = "getJob(jobId) read";
  let onChainJob;
  try {
    onChainJob = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "getJob",
      args: [jobId],
    });

    info("id", onChainJob.id.toString());
    info("client", onChainJob.client);
    info("provider", onChainJob.provider);
    info("evaluator", onChainJob.evaluator);
    info("description", onChainJob.description.slice(0, 80) + (onChainJob.description.length > 80 ? "..." : ""));
    info("budget", `${onChainJob.budget.toString()} (${formatUnits(onChainJob.budget, tokenDecimals)} tokens)`);
    info("expiredAt", new Date(Number(onChainJob.expiredAt) * 1000).toISOString());
    info("status", `${onChainJob.status} (0=Open)`);
    info("hook", onChainJob.hook);

    const issues = [];
    if (onChainJob.client.toLowerCase() !== account.address.toLowerCase()) {
      issues.push(`client mismatch: expected ${account.address}, got ${onChainJob.client}`);
    }
    if (onChainJob.evaluator.toLowerCase() !== ROUTER.toLowerCase()) {
      issues.push(`evaluator mismatch: expected ${ROUTER}, got ${onChainJob.evaluator}`);
    }
    if (onChainJob.hook.toLowerCase() !== ROUTER.toLowerCase()) {
      issues.push(`hook mismatch: expected ${ROUTER}, got ${onChainJob.hook}`);
    }
    if (onChainJob.status !== 0) {
      issues.push(`expected status 0 (Open), got ${onChainJob.status}`);
    }

    if (issues.length > 0) {
      fail(issues.join("; "));
    } else {
      pass(`client=${onChainJob.client.slice(0, 10)}..., evaluator=Router, hook=Router, status=Open`);
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // ═══ PHASE 3: REGISTER JOB WITH POLICY ON ROUTER ════════════
  console.log("\n═══ PHASE 3: REGISTER JOB WITH POLICY (Router) ═══");

  // 3.1 Pre-check: Router not paused
  currentStep = "Router not paused";
  try {
    const routerPaused = await publicClient.readContract({
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "paused",
    });
    if (!routerPaused) {
      pass("Not paused");
    } else {
      fail("Router is PAUSED");
      process.exit(1);
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 3.2 Pre-check: policy is whitelisted on the deployed Router
  currentStep = "Policy whitelist check";
  try {
    const whitelisted = await publicClient.readContract({
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "policyWhitelist",
      args: [POLICY],
    });
    if (whitelisted) {
      pass(`Policy ${POLICY} whitelisted`);
    } else {
      fail(`Policy ${POLICY} NOT whitelisted on Router`);
      process.exit(1);
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 3.3 Pre-check: job has no policy yet
  currentStep = "jobPolicy(jobId) before register";
  let policyBefore;
  try {
    policyBefore = await publicClient.readContract({
      address: ROUTER,
      abi: ROUTER_ABI,
      functionName: "jobPolicy",
      args: [jobId],
    });
    info("Current policy", policyBefore);
    if (policyBefore === "0x0000000000000000000000000000000000000000") {
      pass("No policy bound yet — proceeding");
    } else {
      info("Policy already bound — skipping registerJob");
    }
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  // 3.4 registerJob transaction
  let registerTxHash;
  let registerSkipped = false;
  if (policyBefore !== "0x0000000000000000000000000000000000000000") {
    currentStep = "registerJob (skip — policy already bound)";
    registerSkipped = true;
    pass("Policy = " + policyBefore);
  } else {
    currentStep = "registerJob transaction";
    try {
      registerTxHash = await walletClient.writeContract({
        address: ROUTER,
        abi: ROUTER_ABI,
        functionName: "registerJob",
        args: [jobId, POLICY],
      });

      info("TX hash", registerTxHash);
      info("BscScan", txLink(registerTxHash));

      const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTxHash });

      if (registerReceipt.status !== "success") {
        fail("registerJob reverted on-chain");
        process.exit(1);
      }

      info("Gas used", registerReceipt.gasUsed.toString());
      pass(`Gas: ${registerReceipt.gasUsed}`);

      // Verify policy is now bound
      currentStep = "Verify jobPolicy after register";
      try {
        const policyAfter = await publicClient.readContract({
          address: ROUTER,
          abi: ROUTER_ABI,
          functionName: "jobPolicy",
          args: [jobId],
        });
        info("jobPolicy now", policyAfter);
        if (policyAfter.toLowerCase() === POLICY.toLowerCase()) {
          pass(`Policy bound = ${POLICY}`);
        } else {
          fail(`Expected ${POLICY}, got ${policyAfter}`);
        }
      } catch (e) {
        fail(e.message);
      }
    } catch (e) {
      fail(e.message);
      if (registerTxHash) info("TX hash", registerTxHash);
      process.exit(1);
    }
  }

  // ═══ PHASE 4: SET BUDGET ═══════════════════════════════════
  console.log("\n═══ PHASE 4: SET BUDGET ═══");

  currentStep = "setBudget transaction";
  let budgetTxHash;
  try {
    const budgetWei = parseUnits(BUDGET_AMOUNT, tokenDecimals);

    budgetTxHash = await walletClient.writeContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "setBudget",
      args: [jobId, budgetWei, "0x"],
    });

    info("TX hash", budgetTxHash);
    info("BscScan", txLink(budgetTxHash));

    const budgetReceipt = await publicClient.waitForTransactionReceipt({ hash: budgetTxHash });

    if (budgetReceipt.status !== "success") {
      fail("setBudget reverted on-chain");
      process.exit(1);
    }

    info("Gas used", budgetReceipt.gasUsed.toString());
    pass(`Gas: ${budgetReceipt.gasUsed}`);
  } catch (e) {
    fail(e.message);
    if (budgetTxHash) info("TX hash", budgetTxHash);
    process.exit(1);
  }

  // Verify budget was set
  currentStep = "Verify budget on-chain";
  try {
    const jobAfterBudget = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "getJob",
      args: [jobId],
    });
    const budgetWei = parseUnits(BUDGET_AMOUNT, tokenDecimals);
    info("On-chain budget", `${jobAfterBudget.budget.toString()} (${formatUnits(jobAfterBudget.budget, tokenDecimals)} tokens)`);

    if (jobAfterBudget.budget === budgetWei) {
      pass(`Budget = ${BUDGET_AMOUNT} tokens`);
    } else {
      fail(`Expected ${budgetWei}, got ${jobAfterBudget.budget}`);
    }
  } catch (e) {
    fail(e.message);
  }

  // ═══ PHASE 5: ERC-20 APPROVAL ══════════════════════════════
  console.log("\n═══ PHASE 5: ERC-20 APPROVAL ═══");

  currentStep = "Check current allowance";
  let currentAllowance;
  try {
    currentAllowance = await publicClient.readContract({
      address: paymentToken,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, COMMERCE],
    });
    const required = parseUnits(BUDGET_AMOUNT, tokenDecimals);
    info("Current allowance", formatUnits(currentAllowance, tokenDecimals));
    info("Required", formatUnits(required, tokenDecimals));
  } catch (e) {
    fail(e.message);
    process.exit(1);
  }

  const requiredWei = parseUnits(BUDGET_AMOUNT, tokenDecimals);
  let approveTxHash;

  if (currentAllowance >= requiredWei) {
    currentStep = "ERC-20 approve (skip — sufficient allowance)";
    pass(`Allowance ${formatUnits(currentAllowance, tokenDecimals)} >= required ${formatUnits(requiredWei, tokenDecimals)}`);
  } else {
    currentStep = "ERC-20 approve transaction";
    try {
      approveTxHash = await walletClient.writeContract({
        address: paymentToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [COMMERCE, requiredWei],
      });

      info("TX hash", approveTxHash);
      info("BscScan", txLink(approveTxHash));

      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash });

      if (approveReceipt.status !== "success") {
        fail("approve reverted on-chain");
        process.exit(1);
      }

      info("Gas used", approveReceipt.gasUsed.toString());
      pass(`Gas: ${approveReceipt.gasUsed}`);
    } catch (e) {
      fail(e.message);
      if (approveTxHash) info("TX hash", approveTxHash);
      process.exit(1);
    }

    // Verify allowance after approval
    currentStep = "Verify allowance after approve";
    try {
      const newAllowance = await publicClient.readContract({
        address: paymentToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account.address, COMMERCE],
      });
      info("New allowance", formatUnits(newAllowance, tokenDecimals));

      if (newAllowance >= requiredWei) {
        pass(`Allowance ${formatUnits(newAllowance, tokenDecimals)} >= ${formatUnits(requiredWei, tokenDecimals)}`);
      } else {
        fail(`Allowance still insufficient: ${formatUnits(newAllowance, tokenDecimals)}`);
      }
    } catch (e) {
      fail(e.message);
    }
  }

  // ═══ PHASE 6: FUND JOB ═════════════════════════════════════
  console.log("\n═══ PHASE 6: FUND JOB ═══");

  currentStep = "fund transaction";
  let fundTxHash;
  try {
    fundTxHash = await walletClient.writeContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "fund",
      args: [jobId, requiredWei, "0x"],
    });

    info("TX hash", fundTxHash);
    info("BscScan", txLink(fundTxHash));

    const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundTxHash });

    if (fundReceipt.status !== "success") {
      fail("fund reverted on-chain");
      process.exit(1);
    }

    info("Gas used", fundReceipt.gasUsed.toString());

    // Decode JobFunded event
    for (const log of fundReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: COMMERCE_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "JobFunded") {
          info("JobFunded event", `jobId=${decoded.args.jobId}, amount=${decoded.args.amount}`);
        }
      } catch (e) {
        // not all logs decode
      }
    }

    pass(`Gas: ${fundReceipt.gasUsed}`);
  } catch (e) {
    fail(e.message);
    if (fundTxHash) info("TX hash", fundTxHash);
    process.exit(1);
  }

  // ═══ PHASE 7: FINAL VERIFICATION ═══════════════════════════
  console.log("\n═══ PHASE 7: FINAL VERIFICATION ═══");

  currentStep = "getJob(jobId) after fund";
  let finalJob;
  try {
    finalJob = await publicClient.readContract({
      address: COMMERCE,
      abi: COMMERCE_ABI,
      functionName: "getJob",
      args: [jobId],
    });

    const statusLabels = { 0: "Open", 1: "Funded", 2: "Submitted", 3: "Completed", 4: "Rejected", 5: "Expired" };
    info("status", `${finalJob.status} (${statusLabels[finalJob.status] || "Unknown"})`);
    info("budget", `${formatUnits(finalJob.budget, tokenDecimals)} tokens`);

    if (finalJob.status === 1) {
      pass("Status = 1 (Funded)");
    } else {
      fail(`Expected status 1 (Funded), got ${finalJob.status}`);
    }
  } catch (e) {
    fail(e.message);
  }

  // Token balance after
  currentStep = "Payment token balance after fund";
  try {
    const finalBalance = await publicClient.readContract({
      address: paymentToken,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    info("Remaining balance", `${formatUnits(finalBalance, tokenDecimals)} tokens`);
    pass(`Remaining: ${formatUnits(finalBalance, tokenDecimals)}`);
  } catch (e) {
    fail(e.message);
  }

  // tBNB balance after
  currentStep = "Wallet tBNB balance after";
  try {
    const finalTbnb = await publicClient.getBalance({ address: account.address });
    info("Remaining tBNB", formatEther(finalTbnb));
    pass(`Remaining: ${formatEther(finalTbnb)} tBNB`);
  } catch (e) {
    fail(e.message);
  }

  // ═══ SUMMARY ═══════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    TEST SUMMARY                         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;

  console.log(`  Total steps: ${results.length}`);
  console.log(`  \x1b[32mPASS: ${passed}\x1b[0m`);
  if (failed > 0) {
    console.log(`  \x1b[31mFAIL: ${failed}\x1b[0m`);
  }

  console.log("\n  Step-by-step results:");
  for (const r of results) {
    const icon = r.status === "PASS" ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`    ${icon} ${r.step}: ${r.detail}`);
  }

  console.log("\n  Transaction hashes:");
  if (createTxHash) console.log(`    createJob:   ${txLink(createTxHash)}`);
  if (registerTxHash) console.log(`    registerJob: ${txLink(registerTxHash)}`);
  if (registerSkipped) console.log(`    registerJob: (skipped — policy already bound)`);
  if (budgetTxHash) console.log(`    setBudget:   ${txLink(budgetTxHash)}`);
  if (approveTxHash) console.log(`    approve:     ${txLink(approveTxHash)}`);
  if (fundTxHash) console.log(`    fund:        ${txLink(fundTxHash)}`);
  if (jobId !== undefined) console.log(`    Job ID:      ${jobId.toString()}`);

  console.log("");
  if (failed === 0) {
    console.log("  \x1b[32m═══ ALL LIFECYCLE STEPS PASSED ═══\x1b[0m\n");
  } else {
    console.log("  \x1b[31m═══ SOME STEPS FAILED — SEE ABOVE ═══\x1b[0m\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(function(e) {
  console.error("\n  \x1b[31mFATAL ERROR:\x1b[0m", e.message || e);
  process.exit(1);
});
