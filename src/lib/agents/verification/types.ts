export type VerificationStatus = "verified" | "pending" | "unverified";

export interface AgentOnchainIdentity {
  contractAddress: string;
  chainId: number;
  chainName: string;
  deployerAddress: string;
  deploymentBlock: number;
  deploymentTxHash: string;
  registeredAt: string;
}

export interface Erc8004Verification {
  status: VerificationStatus;
  tokenId: string | null;
  issuerAddress: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  revocationReason: string | null;
  metadataUri: string | null;
}

export interface AgentRegistration {
  registered: boolean;
  registryAddress: string;
  registryChainId: number;
  agentId: string;
  registeredBy: string;
  registeredAt: string;
  metadataUri: string;
}

export interface AgentVerification {
  agentId: string;
  status: VerificationStatus;
  identity: AgentOnchainIdentity;
  erc8004: Erc8004Verification;
  registration: AgentRegistration;
  trustScore: number;
  lastVerifiedAt: string;
}
