import { http, createConfig, createStorage } from "wagmi";
import { bsc, bscTestnet } from "viem/chains";
import { injected } from "@wagmi/connectors";

export const config = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [
    injected(),
  ],
  transports: {
    [bscTestnet.id]: http(),
    [bsc.id]: http(),
  },
  storage: createStorage({ storage: typeof window !== "undefined" && window.localStorage ? window.localStorage : undefined }),
});
