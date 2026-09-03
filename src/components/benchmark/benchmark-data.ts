export interface BenchmarkMetric {
  label: string;
  key: string;
  unit: string;
  max: number;
  higherBetter: boolean;
  color: string;
}

export const benchmarkMetrics: BenchmarkMetric[] = [
  { label: "Performance", key: "performance", unit: "%", max: 100, higherBetter: true, color: "#22c55e" },
  { label: "Success Rate", key: "successRate", unit: "%", max: 100, higherBetter: true, color: "#3b82f6" },
  { label: "Uptime", key: "uptime", unit: "%", max: 100, higherBetter: true, color: "#F0B90B" },
  { label: "Reputation", key: "reputation", unit: "/100", max: 100, higherBetter: true, color: "#a855f7" },
  { label: "Rating", key: "rating", unit: "/5", max: 5, higherBetter: true, color: "#f97316" },
];

export const speedData: { id: string; label: string; values: number[] }[] = [
  { id: "sentinel-guard", label: "Sentinel Guard", values: [1.1, 1.3, 1.0, 1.2, 1.4, 1.1, 0.9] },
  { id: "yield-oracle", label: "Yield Oracle", values: [3.5, 4.1, 3.8, 3.6, 4.0, 3.9, 3.7] },
  { id: "gas-optimizer", label: "Gas Optimizer", values: [0.3, 0.5, 0.4, 0.3, 0.4, 0.5, 0.3] },
  { id: "portfolio-pilot", label: "Portfolio Pilot", values: [2.1, 2.4, 2.0, 2.3, 2.2, 2.5, 2.1] },
  { id: "bridge-watch", label: "Bridge Watch", values: [1.8, 2.0, 1.7, 1.9, 2.1, 1.8, 1.6] },
  { id: "sentinel-pro", label: "Sentinel Pro", values: [0.8, 1.0, 0.9, 0.7, 1.1, 0.8, 0.9] },
  { id: "mev-shield", label: "MEV Shield", values: [0.5, 0.7, 0.6, 0.5, 0.8, 0.6, 0.4] },
  { id: "compliance-sentinel", label: "Compliance Sentinel", values: [2.5, 2.8, 2.4, 2.6, 2.9, 2.7, 2.5] },
  { id: "dca-engine", label: "DCA Engine", values: [1.5, 1.8, 1.4, 1.6, 1.7, 1.5, 1.3] },
  { id: "audit-trail", label: "Audit Trail", values: [0.9, 1.1, 0.8, 1.0, 1.2, 0.9, 0.7] },
  { id: "liquidity-radar", label: "Liquidity Radar", values: [1.3, 1.5, 1.2, 1.4, 1.6, 1.3, 1.1] },
  { id: "wallet-sentinel", label: "Wallet Sentinel", values: [0.7, 0.9, 0.6, 0.8, 1.0, 0.7, 0.5] },
  { id: "sniper-alpha", label: "Sniper Alpha", values: [0.4, 0.6, 0.5, 0.3, 0.7, 0.5, 0.3] },
  { id: "tax-reporter", label: "Tax Reporter", values: [3.2, 3.5, 3.1, 3.4, 3.6, 3.3, 3.0] },
  { id: "chain-scanner", label: "Chain Scanner", values: [1.6, 1.9, 1.5, 1.7, 2.0, 1.6, 1.4] },
  { id: "apy-hunter", label: "APY Hunter", values: [2.8, 3.1, 2.7, 2.9, 3.2, 3.0, 2.6] },
  { id: "position-guard", label: "Position Guard", values: [1.0, 1.2, 0.9, 1.1, 1.3, 1.0, 0.8] },
  { id: "nft-watcher", label: "NFT Watcher", values: [2.0, 2.3, 1.9, 2.1, 2.4, 2.0, 1.8] },
];

export const costData: { id: string; label: string; values: number[] }[] = [
  { id: "sentinel-guard", label: "Sentinel Guard", values: [0.03, 0.02, 0.04, 0.03, 0.02, 0.03, 0.04] },
  { id: "yield-oracle", label: "Yield Oracle", values: [0.12, 0.10, 0.14, 0.11, 0.13, 0.12, 0.11] },
  { id: "gas-optimizer", label: "Gas Optimizer", values: [0, 0, 0, 0, 0, 0, 0] },
  { id: "portfolio-pilot", label: "Portfolio Pilot", values: [0.08, 0.07, 0.09, 0.08, 0.07, 0.08, 0.09] },
  { id: "bridge-watch", label: "Bridge Watch", values: [0.05, 0.04, 0.06, 0.05, 0.04, 0.05, 0.06] },
  { id: "sentinel-pro", label: "Sentinel Pro", values: [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.03] },
  { id: "mev-shield", label: "MEV Shield", values: [0.04, 0.03, 0.05, 0.04, 0.03, 0.04, 0.05] },
  { id: "compliance-sentinel", label: "Compliance Sentinel", values: [0.15, 0.13, 0.17, 0.14, 0.16, 0.15, 0.14] },
  { id: "dca-engine", label: "DCA Engine", values: [0.06, 0.05, 0.07, 0.06, 0.05, 0.06, 0.07] },
  { id: "audit-trail", label: "Audit Trail", values: [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.03] },
  { id: "liquidity-radar", label: "Liquidity Radar", values: [0.07, 0.06, 0.08, 0.07, 0.06, 0.07, 0.08] },
  { id: "wallet-sentinel", label: "Wallet Sentinel", values: [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.03] },
  { id: "sniper-alpha", label: "Sniper Alpha", values: [0.10, 0.08, 0.12, 0.09, 0.11, 0.10, 0.09] },
  { id: "tax-reporter", label: "Tax Reporter", values: [0.04, 0.03, 0.05, 0.04, 0.03, 0.04, 0.05] },
  { id: "chain-scanner", label: "Chain Scanner", values: [0.06, 0.05, 0.07, 0.06, 0.05, 0.06, 0.07] },
  { id: "apy-hunter", label: "APY Hunter", values: [0.09, 0.07, 0.11, 0.08, 0.10, 0.09, 0.08] },
  { id: "position-guard", label: "Position Guard", values: [0.03, 0.02, 0.04, 0.03, 0.02, 0.03, 0.04] },
  { id: "nft-watcher", label: "NFT Watcher", values: [0, 0, 0, 0, 0, 0, 0] },
];

export const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
