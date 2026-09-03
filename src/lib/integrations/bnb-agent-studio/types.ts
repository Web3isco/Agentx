export interface StudioAgentId {
  local: string;
  studio: string;
}

export interface StudioNetwork {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
}

export type StudioAgentStatus =
  | "live"
  | "testing"
  | "deprecated"
  | "disabled";

export interface StudioAgentEndpoint {
  url: string;
  method: "GET" | "POST" | "WS";
  authRequired: boolean;
  rateLimit: number;
}

export interface StudioAgentCreator {
  id: string;
  name: string;
  verified: boolean;
  deployedAgents: number;
  reputation: number;
  website: string | null;
}

export interface StudioAgentCapability {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
}

export interface StudioAgentMetadata {
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  icon: string | null;
  documentationUri: string | null;
  sourceUri: string | null;
  license: string | null;
}

export interface StudioAgent {
  id: StudioAgentId;
  metadata: StudioAgentMetadata;
  status: StudioAgentStatus;
  network: StudioNetwork;
  creator: StudioAgentCreator;
  capabilities: StudioAgentCapability[];
  endpoint: StudioAgentEndpoint;
  deployedAt: string;
  updatedAt: string;
  onchainVerified: boolean;
  erc8004TokenId: string | null;
}

export interface StudioDiscoveryFilter {
  category?: string;
  status?: StudioAgentStatus;
  network?: number;
  creator?: string;
  search?: string;
}

export interface StudioDiscoveryResult {
  agents: StudioAgent[];
  total: number;
  page: number;
  pageSize: number;
}
