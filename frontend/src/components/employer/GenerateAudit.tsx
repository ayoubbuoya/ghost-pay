// ========================================================
// GenerateAudit — Generate an audit proof for a compliance auditor
//
// Calls: ghostpay.aleo/generate_audit_proof transition via Leo Wallet
//
// Privacy flow:
//   1. Employer specifies the auditor's Aleo address
//   2. Transaction submitted via Leo Wallet
//   3. A private AuditProof record is issued to the auditor
//   4. The proof contains ONLY aggregate data (total, headcount, merkle root)
//   5. Individual salary amounts are NEVER revealed to the auditor
// ========================================================

import { useState } from 'react';
import { FileCheck, Shield } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useGhostPay, useWallet } from '../../context/WalletContext';
import { buildGenerateAuditTransaction } from '../../services/aleo';
import type { TransactionStatus } from '../../types/ghostpay';

export default function GenerateAudit() {
  const { payments, employees, addTransaction, refreshRecords } = useGhostPay();
  const { publicKey, requestTransaction } = useWallet();

  const [auditorAddress, setAuditorAddress] = useState('');
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    state: 'idle', timestamp: Date.now(), description: '',
  });

  const totalDisbursed = payments.reduce((s, p) => s + p.net_salary, 0);

  /**
   * Compute a simple sequential Merkle root over employee ID hashes.
   * Mirrors the contract's `compute_merkle_step` inline function:
   *   root = BHP256::hash(current_root + employee_id_hash)
   * Since we can't call BHP256 in JS, we use a simple numeric hash chain
   * that serves as a placeholder. The actual ZK proof in the wallet
   * validates the real Merkle root.
   */
  const computeMerkleRoot = (): string => {
    let root = 0;
    for (const emp of employees) {
      // Extract numeric part from employee_id_hash (e.g., "123456field" -> 123456)
      const idNum = parseInt(emp.employee_id_hash.replace(/[^0-9]/g, ''), 10) || 0;
      root = ((root * 31) + idNum) >>> 0;
    }
    return `${root}`;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !requestTransaction) {
      return alert('Please connect your Leo Wallet first');
    }
    if (!auditorAddress) return alert('Enter auditor address');

    try {
      setTxStatus({
        state: 'building',
        timestamp: Date.now(),
        description: 'Building audit proof inputs...',
      });

      // Build the transaction with aggregate data
      const batchHash = payments[0]?.batch_hash || `${Math.floor(Math.random() * 999_999)}`;
      const merkleRoot = computeMerkleRoot();

      const transaction = buildGenerateAuditTransaction(publicKey, {
        auditorAddress,
        batchHash,
        totalDisbursed,
        employeeCount: employees.length,
        employeesMerkleRoot: merkleRoot,
      });

      // Submit via Leo Wallet
      setTxStatus({
        state: 'proving',
        timestamp: Date.now(),
        description: 'Leo Wallet generating selective disclosure ZK proof...',
      });

      const txId = await requestTransaction(transaction);

      setTxStatus({
        state: 'confirmed',
        timestamp: Date.now(),
        description: 'Audit proof generated and submitted',
        txId: txId as string,
      });
      addTransaction({
        state: 'confirmed',
        timestamp: Date.now(),
        description: `Audit proof → ${auditorAddress.slice(0, 12)}...`,
        txId: txId as string,
      });

      // Refresh to pick up the new AuditProof record
      await refreshRecords();

      setAuditorAddress('');
      setTimeout(
        () => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }),
        4000,
      );
    } catch (error) {
      console.error('Audit proof generation failed:', error);
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
    <GlowCard glowColor="amber">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Generate Audit Proof</h3>
            <p className="text-xs text-gray-500">Issue selective disclosure to an auditor</p>
          </div>
        </div>
        <PrivacyBadge level="selective" label="Aggregates Only" />
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">Auditor Aleo Address</label>
          <input className="ghost-input font-mono text-xs" placeholder="aleo1auditor..."
            value={auditorAddress} onChange={e => setAuditorAddress(e.target.value)} required />
        </div>

        {/* Preview what the auditor will see */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <p className="mb-2 text-xs font-medium text-gray-400">Auditor will receive:</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-bold text-white">{(totalDisbursed / 1_000_000).toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">Total Disbursed (AC)</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{employees.length}</p>
              <p className="text-[10px] text-gray-500">Employee Count</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">✓</p>
              <p className="text-[10px] text-gray-500">Merkle Root</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-gray-400">
            The auditor sees <strong className="text-amber-300">only aggregate data</strong>: total amount,
            headcount, and a Merkle root. <strong className="text-amber-300">No individual salary,
              tax rate, or employee identity</strong> is disclosed. This is selective disclosure via ZK proofs.
          </p>
        </div>

        <TransactionStatusBar status={txStatus} />

        <button type="submit" className="ghost-btn w-full"
          disabled={!publicKey || (txStatus.state !== 'idle' && txStatus.state !== 'confirmed')}>
          <FileCheck className="h-4 w-4" />
          Generate Audit Proof
        </button>
      </form>
    </GlowCard>
  );
}
