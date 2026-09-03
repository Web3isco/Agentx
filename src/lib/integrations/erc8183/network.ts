/**
 * ERC-8183 APEX network configuration.
 *
 * Official deployed addresses from:
 *   https://github.com/bnb-chain/apex-contracts/blob/main/scripts/addresses.ts
 *
 * The SDK also reads these from environment variables when available,
 * falling back to the hardcoded official addresses.
 */

export interface ApexNetworkConfig {
  /** Chain ID */
  chainId: number;
  /** Human-readable network name */
  name: string;
  /** AgenticCommerce (kernel) proxy address */
  commerceAddress: `0x${string}`;
  /** EvaluatorRouter proxy address */
  routerAddress: `0x${string}`;
  /** OptimisticPolicy address */
  policyAddress: `0x${string}`;
  /** Payment token (U on BSC) — read from commerce.paymentToken() at runtime */
  paymentTokenFallback: `0x${string}`;
  /** RPC URL */
  rpcUrl: string;
}

/** BSC Testnet (Chain ID 97) — active deployment */
export const BSC_TESTNET_CONFIG: ApexNetworkConfig = {
  chainId: 97,
  name: "BSC Testnet",
  commerceAddress:
    (process.env.NEXT_PUBLIC_APEX_COMMERCE_ADDRESS ??
      "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de") as `0x${string}`,
  routerAddress:
    (process.env.NEXT_PUBLIC_APEX_ROUTER_ADDRESS ??
      "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25") as `0x${string}`,
  policyAddress:
    (process.env.NEXT_PUBLIC_APEX_POLICY_ADDRESS ??
      "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea") as `0x${string}`,
  paymentTokenFallback:
    (process.env.NEXT_PUBLIC_APEX_PAYMENT_TOKEN ??
      "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565") as `0x${string}`,
  rpcUrl:
    process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ??
    "https://bsc-testnet-rpc.publicnode.com",
};

/** BSC Mainnet (Chain ID 56) — active deployment */
export const BSC_MAINNET_CONFIG: ApexNetworkConfig = {
  chainId: 56,
  name: "BSC Mainnet",
  commerceAddress:
    (process.env.NEXT_PUBLIC_APEX_COMMERCE_ADDRESS_MAINNET ??
      "0xea4daa3100a767e86fded867729ae7446476eba6") as `0x${string}`,
  routerAddress:
    (process.env.NEXT_PUBLIC_APEX_ROUTER_ADDRESS_MAINNET ??
      "0x51895229e12f9876011789b04f8698af06ccd6da") as `0x${string}`,
  policyAddress:
    (process.env.NEXT_PUBLIC_APEX_POLICY_ADDRESS_MAINNET ??
      "0x9c01845705b3078aa2e8cff7520a6376fd766de5") as `0x${string}`,
  paymentTokenFallback:
    (process.env.NEXT_PUBLIC_APEX_PAYMENT_TOKEN_MAINNET ??
      "0xcE24439F2D9C6a2289F741120FE202248B666666") as `0x${string}`,
  rpcUrl:
    process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL ??
    "https://bsc-rpc.publicnode.com",
};

export const NETWORKS: Record<number, ApexNetworkConfig> = {
  97: BSC_TESTNET_CONFIG,
  56: BSC_MAINNET_CONFIG,
};

/**
 * Get the APEX config for a given chain.
 * Defaults to BSC Testnet if chainId is unknown.
 */
export function getApexConfig(chainId: number = 97): ApexNetworkConfig {
  return NETWORKS[chainId] ?? BSC_TESTNET_CONFIG;
}
