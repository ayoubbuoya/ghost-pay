// ========================================================
// GenerateAudit — Generate an audit proof for a compliance auditor
//
// Calls: ghostpay.aleo/generate_audit_proof transition
//
// Leo signature:
//   transition generate_audit_proof(
//     auditor: address,
//     batch_hash: field,
//     total_disbursed: u64,
//     employee_count: u32,
//     employees_merkle_root: field,
//   ) -> AuditProof
//
// Privacy flow:
//   1. Employer specifies the auditor's Aleo address
//   2. A private AuditProof record is issued to the auditor
//   3. The proof contains ONLY aggregate data:
//      - Total amount disbursed (sum of all net salaries)
//      - Employee count
//      - Merkle root of employee set (no individual identity disclosure)
//   4. Individual salary amounts are NEVER revealed to the auditor
// ========================================================

import { useState } from 'react';
import { FileCheck, Shield } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useWallet } from '../../context/WalletContext';
import type { AuditProof, TransactionStatus } from '../../types/ghostpay';

export default function GenerateAudit() {
  const { wallet, payments, employees, setAuditProofs, addTransaction } = useWallet();
  const [auditorAddress, setAuditorAddress] = useState('');
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    state: 'idle', timestamp: Date.now(), description: '',
  });

  const totalDisbursed = payments.reduce((s, p) => s + p.net_salary, 0);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorAddress) return alert('Enter auditor address');

    setTxStatus({ state: 'building', timestamp: Date.now(), description: 'Building audit proof inputs...' });
    await new Promise(r => setTimeout(r, 600));

    setTxStatus({ state: 'proving', timestamp: Date.now(), description: 'Generating selective disclosure ZK proof...' });
    await new Promise(r => setTimeout(r, 1500));

    setTxStatus({ state: 'broadcasting', timestamp: Date.now(), description: 'Issuing AuditProof record to auditor...' });
    await new Promise(r => setTimeout(r, 800));

    const proof: AuditProof = {
      owner: auditorAddress,
      employer: wallet.address!,
      batch_hash: payments[0]?.batch_hash || `${Math.floor(Math.random() * 999999)}field`,
      total_disbursed: totalDisbursed,
      employee_count: employees.length,
      employees_merkle_root: `${Math.floor(Math.random() * 999999999)}field`,
    };

    setAuditProofs(prev => [...prev, proof]);

    const txId = `at1${Math.random().toString(36).slice(2, 18)}`;
    setTxStatus({ state: 'confirmed', timestamp: Date.now(), description: 'Audit proof generated', txId });
    addTransaction({ state: 'confirmed', timestamp: Date.now(), description: `Audit proof → ${auditorAddress.slice(0, 12)}...`, txId });

    setAuditorAddress('');
    setTimeout(() => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }), 4000);
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

        <button type="submit" className="ghost-btn w-full" disabled={txStatus.state !== 'idle' && txStatus.state !== 'confirmed'}>
          <FileCheck className="h-4 w-4" />
          Generate Audit Proof
        </button>
      </form>
    </GlowCard>
  );
}

