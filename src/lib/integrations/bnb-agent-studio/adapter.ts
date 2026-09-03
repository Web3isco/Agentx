import type {
  StudioAgent,
  StudioAgentId,
  StudioNetwork,
  StudioAgentCreator,
  StudioAgentCapability,
  StudioAgentMetadata,
  StudioDiscoveryFilter,
  StudioDiscoveryResult,
  StudioAgentStatus,
} from "./types";

const BSC_TESTNET: StudioNetwork = {
  chainId: 97,
  chainName: "BSC Testnet",
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
  explorerUrl: "https://testnet.bscscan.com",
  nativeCurrency: "tBNB",
};

const BSC_MAINNET: StudioNetwork = {
  chainId: 56,
  chainName: "BNB Chain",
  rpcUrl: "https://bsc-dataseed.binance.org",
  explorerUrl: "https://bscscan.com",
  nativeCurrency: "BNB",
};

const creators: Record<string, StudioAgentCreator> = {
  SentinelLabs: { id: "creator-sentinel", name: "SentinelLabs", verified: true, deployedAgents: 3, reputation: 96, website: "https://sentinellabs.io" },
  DeFiCollective: { id: "creator-defi", name: "DeFi Collective", verified: true, deployedAgents: 2, reputation: 93, website: "https://deficollective.xyz" },
  ChainSight: { id: "creator-chainsight", name: "ChainSight", verified: true, deployedAgents: 3, reputation: 95, website: "https://chainsight.dev" },
  AlphaForge: { id: "creator-alpha", name: "AlphaForge", verified: true, deployedAgents: 3, reputation: 91, website: null },
  BridgeOps: { id: "creator-bridge", name: "BridgeOps", verified: true, deployedAgents: 1, reputation: 90, website: "https://bridgeops.io" },
  ShieldOps: { id: "creator-shield", name: "ShieldOps", verified: true, deployedAgents: 1, reputation: 94, website: null },
  RegTechDAO: { id: "creator-regtech", name: "RegTech DAO", verified: true, deployedAgents: 3, reputation: 89, website: "https://regtechdao.com" },
  DCALabs: { id: "creator-dca", name: "DCA Labs", verified: true, deployedAgents: 1, reputation: 92, website: null },
};

function id(local: string, studio: string): StudioAgentId {
  return { local, studio };
}

function cap(name: string, desc: string): StudioAgentCapability {
  return { id: `cap-${name.toLowerCase().replace(/\s+/g, "-")}`, name, description: desc, inputSchema: null, outputSchema: null };
}

const studioAgents: StudioAgent[] = [
  {
    id: id("sentinel-guard", "studio-sg-001"),
    metadata: { name: "Sentinel Guard", description: "Real-time portfolio monitoring and threat detection across DeFi protocols.", version: "2.4.1", category: "Security", tags: ["security", "monitoring", "auto-revoke"], icon: null, documentationUri: "https://docs.agentx.io/agents/sentinel-guard", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.SentinelLabs,
    capabilities: [cap("Threat Detection", "Real-time phishing and scam detection"), cap("Approval Revocation", "Auto-revoke compromised token approvals"), cap("Portfolio Scanning", "Continuous wallet monitoring")],
    endpoint: { url: "https://api.agentx.io/v1/agents/sentinel-guard", method: "POST", authRequired: true, rateLimit: 100 },
    deployedAt: "2025-03-15T00:00:00Z", updatedAt: "2025-08-10T00:00:00Z", onchainVerified: true, erc8004TokenId: "1001",
  },
  {
    id: id("yield-oracle", "studio-yo-002"),
    metadata: { name: "Yield Oracle", description: "Cross-protocol yield optimization with automated rebalancing.", version: "1.8.3", category: "DeFi", tags: ["defi", "yield", "rebalancing"], icon: null, documentationUri: "https://docs.agentx.io/agents/yield-oracle", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_MAINNET, creator: creators.DeFiCollective,
    capabilities: [cap("Yield Scanning", "Cross-protocol APY comparison"), cap("Auto Rebalance", "Automated position migration"), cap("Risk Scoring", "Protocol risk assessment")],
    endpoint: { url: "https://api.agentx.io/v1/agents/yield-oracle", method: "POST", authRequired: true, rateLimit: 50 },
    deployedAt: "2025-01-20T00:00:00Z", updatedAt: "2025-08-12T00:00:00Z", onchainVerified: true, erc8004TokenId: "1002",
  },
  {
    id: id("gas-optimizer", "studio-go-003"),
    metadata: { name: "Gas Optimizer", description: "Optimal gas timing, transaction simulation and batch execution.", version: "3.1.0", category: "Analytics", tags: ["gas", "optimization", "analytics"], icon: null, documentationUri: "https://docs.agentx.io/agents/gas-optimizer", sourceUri: "https://github.com/agentx/gas-optimizer", license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.ChainSight,
    capabilities: [cap("Gas Forecasting", "Predict optimal gas windows"), cap("Batch Execution", "Multi-tx batching for gas savings"), cap("Simulation", "Pre-execution transaction dry-run")],
    endpoint: { url: "https://api.agentx.io/v1/agents/gas-optimizer", method: "POST", authRequired: false, rateLimit: 200 },
    deployedAt: "2024-11-10T00:00:00Z", updatedAt: "2025-08-14T00:00:00Z", onchainVerified: true, erc8004TokenId: "1003",
  },
  {
    id: id("portfolio-pilot", "studio-pp-004"),
    metadata: { name: "Portfolio Pilot", description: "Automated portfolio management with risk-adjusted allocation.", version: "1.5.2", category: "Portfolio", tags: ["portfolio", "rebalancing", "risk"], icon: null, documentationUri: "https://docs.agentx.io/agents/portfolio-pilot", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_MAINNET, creator: creators.AlphaForge,
    capabilities: [cap("Auto Rebalance", "Risk-adjusted portfolio rebalancing"), cap("Risk Modeling", "Portfolio risk analysis"), cap("Tax Reporting", "Automated tax report generation")],
    endpoint: { url: "https://api.agentx.io/v1/agents/portfolio-pilot", method: "POST", authRequired: true, rateLimit: 30 },
    deployedAt: "2025-02-01T00:00:00Z", updatedAt: "2025-08-08T00:00:00Z", onchainVerified: true, erc8004TokenId: "1004",
  },
  {
    id: id("bridge-watch", "studio-bw-005"),
    metadata: { name: "Bridge Watch", description: "Cross-chain bridge monitoring, fee comparison and optimal routing.", version: "1.2.1", category: "Cross-Chain", tags: ["bridge", "cross-chain", "monitoring"], icon: null, documentationUri: "https://docs.agentx.io/agents/bridge-watch", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.BridgeOps,
    capabilities: [cap("Bridge Alerts", "Real-time bridge status monitoring"), cap("Fee Tracking", "Cross-chain fee comparison"), cap("Route Optimization", "Optimal bridge path selection")],
    endpoint: { url: "https://api.agentx.io/v1/agents/bridge-watch", method: "POST", authRequired: true, rateLimit: 40 },
    deployedAt: "2025-04-15T00:00:00Z", updatedAt: "2025-08-05T00:00:00Z", onchainVerified: true, erc8004TokenId: "1005",
  },
  {
    id: id("sentinel-pro", "studio-sp-006"),
    metadata: { name: "Sentinel Pro", description: "Advanced threat intelligence with real-time alerting and auto-revoke.", version: "2.0.0", category: "Security", tags: ["security", "enterprise", "threat-intel"], icon: null, documentationUri: "https://docs.agentx.io/agents/sentinel-pro", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.SentinelLabs,
    capabilities: [cap("MEV Protection", "Front-running and sandwich attack defense"), cap("Phishing Shield", "Advanced phishing detection"), cap("Multi-sig Support", "Enterprise-grade wallet protection")],
    endpoint: { url: "https://api.agentx.io/v1/agents/sentinel-pro", method: "POST", authRequired: true, rateLimit: 150 },
    deployedAt: "2025-06-01T00:00:00Z", updatedAt: "2025-08-15T00:00:00Z", onchainVerified: true, erc8004TokenId: "1006",
  },
  {
    id: id("mev-shield", "studio-ms-007"),
    metadata: { name: "MEV Shield", description: "Front-running and sandwich attack protection for onchain trades.", version: "1.7.4", category: "Trading", tags: ["mev", "protection", "trading"], icon: null, documentationUri: "https://docs.agentx.io/agents/mev-shield", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_MAINNET, creator: creators.ShieldOps,
    capabilities: [cap("Private Routing", "Private mempool transaction routing"), cap("Slippage Guard", "Real-time slippage protection"), cap("Flashbots", "Flashbots protect integration")],
    endpoint: { url: "https://api.agentx.io/v1/agents/mev-shield", method: "POST", authRequired: true, rateLimit: 80 },
    deployedAt: "2025-05-10T00:00:00Z", updatedAt: "2025-08-11T00:00:00Z", onchainVerified: true, erc8004TokenId: "1007",
  },
  {
    id: id("compliance-sentinel", "studio-cs-008"),
    metadata: { name: "Compliance Sentinel", description: "Transaction screening and regulatory compliance checks.", version: "1.1.0", category: "Compliance", tags: ["compliance", "screening", "regulatory"], icon: null, documentationUri: null, sourceUri: null, license: "MIT" },
    status: "testing", network: BSC_TESTNET, creator: creators.RegTechDAO,
    capabilities: [cap("OFAC Screening", "Sanctions list screening"), cap("Risk Scoring", "Transaction risk assessment"), cap("Audit Logs", "Compliance audit trail")],
    endpoint: { url: "https://api.agentx.io/v1/agents/compliance-sentinel", method: "POST", authRequired: true, rateLimit: 20 },
    deployedAt: "2025-07-20T00:00:00Z", updatedAt: "2025-08-01T00:00:00Z", onchainVerified: false, erc8004TokenId: null,
  },
  {
    id: id("dca-engine", "studio-de-009"),
    metadata: { name: "DCA Engine", description: "Automated dollar-cost averaging across multiple tokens.", version: "2.3.1", category: "Trading", tags: ["dca", "trading", "automation"], icon: null, documentationUri: "https://docs.agentx.io/agents/dca-engine", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_MAINNET, creator: creators.DCALabs,
    capabilities: [cap("Smart Scheduling", "Volatility-based DCA timing"), cap("Multi-token", "Parallel DCA across multiple tokens"), cap("Volatility Tracking", "Market condition monitoring")],
    endpoint: { url: "https://api.agentx.io/v1/agents/dca-engine", method: "POST", authRequired: true, rateLimit: 60 },
    deployedAt: "2024-12-05T00:00:00Z", updatedAt: "2025-08-13T00:00:00Z", onchainVerified: true, erc8004TokenId: "1008",
  },
  {
    id: id("audit-trail", "studio-at-010"),
    metadata: { name: "Audit Trail", description: "Immutable onchain audit logging for all wallet interactions.", version: "1.4.0", category: "Compliance", tags: ["audit", "logging", "compliance"], icon: null, documentationUri: null, sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.RegTechDAO,
    capabilities: [cap("Immutable Logs", "Onchain audit log recording"), cap("CSV Export", "Exportable compliance reports"), cap("Tax Reports", "Automated tax report generation")],
    endpoint: { url: "https://api.agentx.io/v1/agents/audit-trail", method: "POST", authRequired: true, rateLimit: 40 },
    deployedAt: "2025-08-01T00:00:00Z", updatedAt: "2025-08-10T00:00:00Z", onchainVerified: false, erc8004TokenId: null,
  },
  {
    id: id("liquidity-radar", "studio-lr-011"),
    metadata: { name: "Liquidity Radar", description: "Real-time liquidity monitoring across DEXs.", version: "1.6.2", category: "DeFi", tags: ["liquidity", "dex", "monitoring"], icon: null, documentationUri: "https://docs.agentx.io/agents/liquidity-radar", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_MAINNET, creator: creators.DeFiCollective,
    capabilities: [cap("Whale Alerts", "Large movement detection"), cap("Pool Analytics", "DEX pool depth analysis"), cap("Depth Tracking", "Liquidity depth monitoring")],
    endpoint: { url: "https://api.agentx.io/v1/agents/liquidity-radar", method: "POST", authRequired: true, rateLimit: 70 },
    deployedAt: "2025-03-20T00:00:00Z", updatedAt: "2025-08-09T00:00:00Z", onchainVerified: true, erc8004TokenId: "1009",
  },
  {
    id: id("wallet-sentinel", "studio-ws-012"),
    metadata: { name: "Wallet Sentinel", description: "Multi-wallet monitoring and threat detection.", version: "2.1.0", category: "Security", tags: ["security", "monitoring", "multi-wallet"], icon: null, documentationUri: "https://docs.agentx.io/agents/wallet-sentinel", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.SentinelLabs,
    capabilities: [cap("Approval Scanner", "Token approval risk analysis"), cap("Multi-wallet", "Cross-wallet monitoring"), cap("Push Alerts", "Telegram and Discord notifications")],
    endpoint: { url: "https://api.agentx.io/v1/agents/wallet-sentinel", method: "POST", authRequired: true, rateLimit: 90 },
    deployedAt: "2025-04-10T00:00:00Z", updatedAt: "2025-08-14T00:00:00Z", onchainVerified: true, erc8004TokenId: "1010",
  },
  {
    id: id("sniper-alpha", "studio-sa-013"),
    metadata: { name: "Sniper Alpha", description: "Early token detection and sniper execution.", version: "0.9.1", category: "Trading", tags: ["sniper", "trading", "new-tokens"], icon: null, documentationUri: null, sourceUri: null, license: "MIT" },
    status: "testing", network: BSC_MAINNET, creator: creators.AlphaForge,
    capabilities: [cap("New Pool Scanner", "Real-time pool creation monitoring"), cap("Rug Detection", "Rug pull risk analysis"), cap("Auto-snipe", "Automated token acquisition")],
    endpoint: { url: "https://api.agentx.io/v1/agents/sniper-alpha", method: "POST", authRequired: true, rateLimit: 10 },
    deployedAt: "2025-07-15T00:00:00Z", updatedAt: "2025-08-02T00:00:00Z", onchainVerified: false, erc8004TokenId: null,
  },
  {
    id: id("tax-reporter", "studio-tr-014"),
    metadata: { name: "Tax Reporter", description: "Automated tax reporting for onchain transactions.", version: "1.3.0", category: "Portfolio", tags: ["tax", "reporting", "compliance"], icon: null, documentationUri: null, sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.RegTechDAO,
    capabilities: [cap("Auto-categorize", "Transaction categorization"), cap("PDF Export", "Tax report PDF generation"), cap("Multi-jurisdiction", "Jurisdiction-specific reporting")],
    endpoint: { url: "https://api.agentx.io/v1/agents/tax-reporter", method: "POST", authRequired: true, rateLimit: 25 },
    deployedAt: "2025-01-10T00:00:00Z", updatedAt: "2025-08-07T00:00:00Z", onchainVerified: false, erc8004TokenId: null,
  },
  {
    id: id("chain-scanner", "studio-cs-015"),
    metadata: { name: "Chain Scanner", description: "Deep onchain analytics and wallet profiling.", version: "2.0.3", category: "Analytics", tags: ["analytics", "profiling", "whale-tracking"], icon: null, documentationUri: "https://docs.agentx.io/agents/chain-scanner", sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.ChainSight,
    capabilities: [cap("Whale Tracking", "Large wallet movement monitoring"), cap("TVL Monitor", "Protocol TVL tracking"), cap("Wallet Profiler", "Wallet behavior analysis")],
    endpoint: { url: "https://api.agentx.io/v1/agents/chain-scanner", method: "POST", authRequired: true, rateLimit: 100 },
    deployedAt: "2025-02-15T00:00:00Z", updatedAt: "2025-08-12T00:00:00Z", onchainVerified: true, erc8004TokenId: "1011",
  },
  {
    id: id("apy-hunter", "studio-ah-016"),
    metadata: { name: "APY Hunter", description: "Automated yield discovery across emerging protocols.", version: "0.8.2", category: "DeFi", tags: ["yield", "defi", "discovery"], icon: null, documentationUri: null, sourceUri: null, license: "MIT" },
    status: "testing", network: BSC_MAINNET, creator: creators.DeFiCollective,
    capabilities: [cap("Protocol Scanner", "New protocol discovery"), cap("Risk Filter", "Protocol risk assessment"), cap("Auto-migrate", "Automated yield migration")],
    endpoint: { url: "https://api.agentx.io/v1/agents/apy-hunter", method: "POST", authRequired: true, rateLimit: 15 },
    deployedAt: "2025-06-20T00:00:00Z", updatedAt: "2025-08-03T00:00:00Z", onchainVerified: false, erc8004TokenId: null,
  },
  {
    id: id("position-guard", "studio-pg-017"),
    metadata: { name: "Position Guard", description: "DeFi position monitoring with liquidation protection.", version: "1.9.0", category: "Security", tags: ["defi", "liquidation", "protection"], icon: null, documentationUri: "https://docs.agentx.io/agents/position-guard", sourceUri: null, license: "MIT" },
    status: "deprecated", network: BSC_MAINNET, creator: creators.AlphaForge,
    capabilities: [cap("Liquidation Alerts", "Position risk monitoring"), cap("Auto-close", "Automated position closure"), cap("Health Factor", "Collateral health tracking")],
    endpoint: { url: "https://api.agentx.io/v1/agents/position-guard", method: "POST", authRequired: true, rateLimit: 30 },
    deployedAt: "2025-05-01T00:00:00Z", updatedAt: "2025-07-30T00:00:00Z", onchainVerified: true, erc8004TokenId: null,
  },
  {
    id: id("nft-watcher", "studio-nw-018"),
    metadata: { name: "NFT Watcher", description: "NFT floor price monitoring, rarity tracking and wash trade detection.", version: "1.0.5", category: "Analytics", tags: ["nft", "floor-price", "analytics"], icon: null, documentationUri: null, sourceUri: null, license: "MIT" },
    status: "live", network: BSC_TESTNET, creator: creators.ChainSight,
    capabilities: [cap("Floor Alerts", "NFT floor price monitoring"), cap("Rarity Scoring", "NFT rarity analysis"), cap("Wash Detection", "Wash trade identification")],
    endpoint: { url: "https://api.agentx.io/v1/agents/nft-watcher", method: "POST", authRequired: false, rateLimit: 50 },
    deployedAt: "2025-09-01T00:00:00Z", updatedAt: "2025-08-15T00:00:00Z", onchainVerified: false, erc8004TokenId: null,
  },
];

const agentIndex = new Map(studioAgents.map((a) => [a.id.local, a]));
const studioIndex = new Map(studioAgents.map((a) => [a.id.studio, a]));

export function getStudioAgent(localId: string): StudioAgent | undefined {
  return agentIndex.get(localId);
}

export function getStudioAgentByStudioId(studioId: string): StudioAgent | undefined {
  return studioIndex.get(studioId);
}

export function getStudioAgentIds(localId: string): StudioAgentId | undefined {
  return agentIndex.get(localId)?.id;
}

export function discoverStudioAgents(filter: StudioDiscoveryFilter = {}): StudioDiscoveryResult {
  let results = studioAgents;

  if (filter.category) {
    results = results.filter((a) => a.metadata.category === filter.category);
  }
  if (filter.status) {
    results = results.filter((a) => a.status === filter.status);
  }
  if (filter.network) {
    results = results.filter((a) => a.network.chainId === filter.network);
  }
  if (filter.creator) {
    results = results.filter((a) => a.creator.id === filter.creator || a.creator.name === filter.creator);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(
      (a) =>
        a.metadata.name.toLowerCase().includes(q) ||
        a.metadata.description.toLowerCase().includes(q) ||
        a.metadata.tags.some((t) => t.includes(q))
    );
  }

  return { agents: results, total: results.length, page: 1, pageSize: results.length };
}

export function getAllStudioAgents(): StudioAgent[] {
  return studioAgents;
}

export function getStudioNetworks(): StudioNetwork[] {
  return [BSC_TESTNET, BSC_MAINNET];
}
