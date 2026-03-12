// ========================================================
// ClaimSalary — Employee claims their salary payment
//
// Calls: ghostpay.aleo/claim_salary transition via Leo Wallet
//
// Privacy flow:
//   1. Employee selects an unclaimed SalaryPayment record
//   2. Leo Wallet generates ZK proof and consumes the record
//   3. The payment_nonce is marked as claimed on-chain
//   4. On-chain: only the nonce boolean flip is visible
//      — the amount and recipient remain private
// ========================================================

import { useState } from 'react';
import { Download, Shield, CheckCircle } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useGhostPay, useWallet } from '../../context/WalletContext';
import { buildClaimSalaryTransaction } from '../../services/aleo';
import type { TransactionStatus } from '../../types/ghostpay';

function formatCredits(micro: number): string {
  return `${(micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} AC`;
}

export default function ClaimSalary() {
  const { payments, employees, addTransaction, refreshRecords } = useGhostPay();
  const { publicKey, requestTransaction } = useWallet();

  const myRecord = employees[0] || null;
  const myPayments = payments.filter(p => p.owner === myRecord?.owner);

  const [claimedNonces, setClaimedNonces] = useState<Set<string>>(new Set());
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    state: 'idle', timestamp: Date.now(), description: '',
  });
  const [claimingNonce, setClaimingNonce] = useState<string | null>(null);

  const handleClaim = async (nonce: string, amount: number, recordPlaintext?: string) => {
    if (!publicKey || !requestTransaction) {
      return alert('Please connect your Leo Wallet first');
    }

    if (!recordPlaintext) {
      return alert('Record plaintext not available. Please refresh records first.');
    }

    setClaimingNonce(nonce);

    try {
      setTxStatus({
        state: 'building',
        timestamp: Date.now(),
        description: 'Building claim_salary transaction...',
      });

      // Build and submit via Leo Wallet
      const transaction = buildClaimSalaryTransaction(publicKey, recordPlaintext);

      setTxStatus({
        state: 'proving',
        timestamp: Date.now(),
        description: 'Leo Wallet generating ZK proof (record consumption)...',
      });

      const txId = await requestTransaction(transaction);

      setClaimedNonces(prev => new Set(prev).add(nonce));

      setTxStatus({
        state: 'confirmed',
        timestamp: Date.now(),
        description: `Claimed ${formatCredits(amount)}`,
        txId: txId as string,
      });
      addTransaction({
        state: 'confirmed',
        timestamp: Date.now(),
        description: `Claimed salary: ${formatCredits(amount)}`,
        txId: txId as string,
      });

      // Refresh records — the consumed SalaryPayment record should disappear
      await refreshRecords();

      setClaimingNonce(null);
      setTimeout(
        () => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }),
        4000,
      );
    } catch (error) {
      console.error('Salary claim failed:', error);
      setClaimingNonce(null);
      setTxStatus({
        state: 'failed',
        timestamp: Date.now(),
        description: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setTimeout(
        () => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }),
        6000,
      );
    }
  };

  return (
    <GlowCard glowColor="emerald">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Claim Salary</h3>
            <p className="text-xs text-gray-500">Consume payment record to receive credits</p>
          </div>
        </div>
        <PrivacyBadge level="private" label="Record consumed" />
      </div>

      {myPayments.length === 0 ? (
        <p className="text-sm text-gray-500">No payments available to claim.</p>
      ) : (
        <div className="space-y-3">
          {myPayments.map(pay => {
            const isClaimed = claimedNonces.has(pay.payment_nonce);
            const isClaiming = claimingNonce === pay.payment_nonce;

            return (
              <div key={pay.payment_nonce} className={`flex items-center justify-between rounded-lg border p-4 ${isClaimed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-800 bg-gray-900/20'
                }`}>
                <div>
                  <p className="text-sm font-medium text-white">{formatCredits(pay.net_salary)}</p>
                  <p className="text-xs text-gray-500">
                    Bonus: {formatCredits(pay.bonus)} · Tax: {formatCredits(pay.tax_deducted)}
                  </p>
                </div>
                {isClaimed ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle className="h-4 w-4" /> Claimed
                  </span>
                ) : (
                  <button
                    onClick={() => handleClaim(pay.payment_nonce, pay.net_salary, pay._recordPlaintext)}
                    className="ghost-btn px-4 py-2 text-xs"
                    disabled={!publicKey || isClaiming ||
                      (txStatus.state !== 'idle' && txStatus.state !== 'confirmed')}
                  >
                    <Download className="h-3 w-3" /> Claim
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-xs leading-relaxed text-gray-400">
          Claiming <strong className="text-emerald-300">consumes the private record</strong> and marks the
          payment_nonce as used on-chain. The chain sees only a nonce → true flip.
          <strong className="text-emerald-300"> The payment amount stays private forever.</strong>
        </p>
      </div>

      <TransactionStatusBar status={txStatus} />
    </GlowCard>
  );
}
