// ========================================================
// TransactionStatusBar — Visual feedback for transaction lifecycle
//
// Transaction states match the Aleo execution flow:
//   idle        → No active transaction
//   building    → Constructing the transaction inputs
//   proving     → Generating ZK proof (client-side via WASM)
//   broadcasting → Submitting to the Aleo network
//   confirmed   → Transaction included in a block
//   failed      → Transaction rejected or timed out
// ========================================================

import { Loader2, CheckCircle, XCircle, Radio } from 'lucide-react';
import type { TransactionStatus } from '../../types/ghostpay';

interface Props {
  status: TransactionStatus;
}

const stateConfig = {
  idle: { icon: null, color: 'text-gray-500', bg: '' },
  building: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  proving: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-aleo-cyan',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  broadcasting: {
    icon: <Radio className="h-4 w-4 animate-pulse" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  confirmed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
};

const stateLabels = {
  idle: 'Idle',
  building: 'Building Transaction...',
  proving: 'Generating ZK Proof...',
  broadcasting: 'Broadcasting to Network...',
  confirmed: 'Confirmed',
  failed: 'Failed',
};

export default function TransactionStatusBar({ status }: Props) {
  if (status.state === 'idle') return null;

  const cfg = stateConfig[status.state];

  return (
    <div
      className={`animate-slide-up flex items-center gap-3 rounded-lg border p-4 ${cfg.bg}`}
    >
      <span className={cfg.color}>{cfg.icon}</span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${cfg.color}`}>
          {stateLabels[status.state]}
        </p>
        <p className="text-xs text-gray-500">{status.description}</p>
        {status.txId && (
          <p className="mt-1 font-mono text-xs text-gray-400">
            TX: {status.txId.slice(0, 16)}...
          </p>
        )}
        {status.error && (
          <p className="mt-1 text-xs text-red-400">{status.error}</p>
        )}
      </div>
      <span className="text-xs text-gray-600">
        {new Date(status.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

