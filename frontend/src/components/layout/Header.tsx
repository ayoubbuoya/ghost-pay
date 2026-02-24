// ========================================================
// Header — Top navigation bar with wallet status and branding
//
// Shows:
//   - GhostPay logo and tagline
//   - Connected wallet address (truncated)
//   - Network indicator (Testnet)
//   - Demo mode badge
// ========================================================

import { Ghost, Wifi, WifiOff } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export default function Header() {
  const { wallet, isDemoMode } = useWallet();

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 10)}...${addr.slice(-6)}`;

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
        <div className="flex items-center gap-4">
          {isDemoMode && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              Demo Mode
            </span>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-aleo-border bg-gray-900/50 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-aleo-cyan">
              {wallet.network}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-aleo-border bg-gray-900/50 px-3 py-2">
            {wallet.connected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-xs text-gray-300">
                  {wallet.address ? truncateAddress(wallet.address) : 'Connected'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-gray-500">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

