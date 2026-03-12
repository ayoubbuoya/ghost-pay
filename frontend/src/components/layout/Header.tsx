// ========================================================
// Header — Top navigation bar with Leo Wallet connect button
//
// Shows:
//   - GhostPay logo and tagline
//   - Leo Wallet connect/disconnect button (WalletMultiButton)
//   - Network indicator (Testnet)
//   - Connected wallet address
// ========================================================

import { Ghost, RefreshCw } from 'lucide-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { useWallet, useGhostPay } from '../../context/WalletContext';

export default function Header() {
  const { publicKey } = useWallet();
  const { refreshRecords, isRefreshing } = useGhostPay();

  return (
    <header className="sticky top-0 z-50 border-b border-aleo-border bg-aleo-darker/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Ghost className="h-8 w-8 text-aleo-cyan" />
            <div className="absolute -inset-1 -z-10 animate-glow-pulse rounded-full bg-aleo-cyan/20" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="gradient-text">GhostPay</span>
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
              Private Payroll on Aleo
            </p>
          </div>
        </div>

        {/* Right side — wallet & network */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="flex items-center gap-2 rounded-lg border border-aleo-border bg-gray-900/50 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-aleo-cyan">
              testnet
            </span>
          </div>

          {/* Refresh records button — only shown when connected */}
          {publicKey && (
            <button
              onClick={refreshRecords}
              disabled={isRefreshing}
              className="ghost-btn-outline flex items-center gap-2 px-3 py-2 text-xs"
              title="Refresh records from the Aleo network"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </button>
          )}

          {/* Leo Wallet connect button — provided by the wallet adapter UI */}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
