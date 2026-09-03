"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
  useAccountEffect,
} from "wagmi";
import { useState, useRef, useEffect, useCallback } from "react";
import { bsc, bscTestnet } from "viem/chains";

const chainNames: Record<number, string> = {
  [bscTestnet.id]: "BSC Testnet",
  [bsc.id]: "BNB Chain",
};

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [menuOpen, setMenuOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    setConnectModalOpen(false);
    setLocalError(null);
    setConnectingId(null);
  }, []);

  // Close connect modal when wallet connects
  useEffect(() => {
    if (isConnected && connectModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync modal on connect
      closeModal();
    }
  }, [isConnected, connectModalOpen, closeModal]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear error when modal closes
  useEffect(() => {
    if (!connectModalOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear on modal close
      setLocalError(null);
      setConnectingId(null);
    }
  }, [connectModalOpen]);

  // Clear error when connection succeeds
  useEffect(() => {
    if (isConnected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear on successful connect
      setLocalError(null);
      setConnectingId(null);
    }
  }, [isConnected]);

  useAccountEffect({
    onConnect() {
      setMenuOpen(false);
    },
    onDisconnect() {
      setMenuOpen(false);
    },
  });

  function handleConnect(connector: (typeof connectors)[number]) {
    setLocalError(null);
    setConnectingId(connector.uid);
    connect({ connector });
  }

  // Clear local error when wagmi error changes (e.g. after rejection)
  useEffect(() => {
    if (connectError) {
      const msg = connectError.message || "Connection failed";
      if (msg.includes("rejected") || msg.includes("denied") || msg.includes("user")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reflect wagmi connectError
        setLocalError("Connection rejected. Please approve in your wallet.");
      } else if (msg.includes("No provider")) {
        setLocalError("No wallet detected. Install a wallet extension.");
      } else {
        setLocalError(msg.length > 100 ? "Connection failed. Try again." : msg);
      }
      setConnectingId(null);
    }
  }, [connectError]);

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setConnectModalOpen(true)}
          disabled={isPending}
          className={`rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover ${className}`}
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>

        {connectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-foreground">Connect a wallet</h3>
                <button
                  onClick={closeModal}
                  className="text-muted hover:text-foreground transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="space-y-2">
                {connectors.map((connector) => {
                  const isThisConnecting = connectingId === connector.uid;
                  return (
                    <button
                      key={connector.uid}
                      disabled={isPending || (connectingId !== null && !isThisConnecting)}
                      onClick={() => handleConnect(connector)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                        isThisConnecting
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-border bg-surface-hover text-foreground hover:border-accent/30"
                      } disabled:opacity-40`}
                    >
                      <ConnectorIcon connector={connector} />
                      <span className="flex-1 text-left">{connector.name}</span>
                      {isThisConnecting && (
                        <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {localError && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {localError}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  const networkName = chainNames[chainId] ?? `Chain ${chainId}`;
  const isTestnet = chainId === bscTestnet.id;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:border-accent/30 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-success flex-shrink-0" />
        <span className="hidden sm:inline">{truncateAddress(address!)}</span>
        <span className="hidden sm:inline text-xs text-muted font-normal">{networkName}</span>
        <svg
          className={`h-3.5 w-3.5 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-xs text-muted mb-1">Connected</div>
            <div className="text-sm font-mono text-foreground break-all">{address}</div>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <div className="text-xs text-muted mb-1">Wallet</div>
            <div className="text-sm text-foreground">{activeConnector?.name ?? "Unknown"}</div>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <div className="text-xs text-muted mb-1.5">Network</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => switchChain({ chainId: bscTestnet.id })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isTestnet
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "text-muted border border-border hover:text-foreground"
                }`}
              >
                Testnet
              </button>
              <button
                onClick={() => switchChain({ chainId: bsc.id })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  !isTestnet
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "text-muted border border-border hover:text-foreground"
                }`}
              >
                BNB Chain
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              disconnect();
              setMenuOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-surface-hover transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function ConnectorIcon({ connector }: { connector: { id: string; name: string } }) {
  const name = connector.name.toLowerCase();
  if (name.includes("metamask")) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 35 33" fill="none">
        <path d="M32.96 1l-9.74 7.22L24.4 1h8.56z" fill="#E17726"/>
        <path d="M2.38 1l9.68 7.27L11.24 1H2.38z" fill="#E27625"/>
        <path d="M29.77 24.56l-7.38 1.13 2.62-10.57H15.2l5.19 13.32 14.76-.05-.38-3.83z" fill="#E27625"/>
        <path d="M2.88 24.56l7.38 1.13-2.62-10.57H4.46L.69 28.38l-.38-3.83z" fill="#E27625"/>
        <path d="M9.56 15.93H15.2l1.93-7.42-8.57-.01 3.03 7.43z" fill="#E47628"/>
        <path d="M25.74 15.93l-1.93-7.42 5.58.01-3.65 7.41z" fill="#E47628"/>
        <path d="M15.2 15.93l1.85 5.42-6.56-.02-.1-5.4h4.81z" fill="#E47628"/>
        <path d="M18.93 21.35l1.85-5.42h4.81l.1 5.4h-6.76z" fill="#E47628"/>
        <path d="M15.47 25.77l-.4-2.38 2.87-.14.4 2.38h-2.87z" fill="#E47628"/>
        <path d="M19.79 25.77l.4-2.38 2.87-.14-.4 2.38h-2.87z" fill="#E47628"/>
      </svg>
    );
  }
  if (name.includes("brave")) {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6v6c0 5.25 3.83 10.17 9 11.38 5.17-1.21 9-6.13 9-11.38V6l-9-4z" fill="currentColor" opacity="0.15"/>
        <path d="M12 3.5L4.5 7v5c0 4.5 3.3 8.75 7.5 9.83 4.2-1.08 7.5-5.33 7.5-9.83V7L12 3.5z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="16" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
