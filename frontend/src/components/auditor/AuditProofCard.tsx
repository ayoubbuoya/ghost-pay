// ========================================================
// AuditProofCard — Display a single AuditProof record
//
// The AuditProof record is a PRIVATE record issued to the auditor.
// It contains ONLY aggregate data:
//   - total_disbursed: Sum of all net salaries in the batch
//   - employee_count: Number of employees paid
//   - employees_merkle_root: Cryptographic root of employee set
//   - batch_hash: Reference to the payroll batch
//
// CRITICAL PRIVACY PROPERTY:
//   The auditor can verify compliance (total budget, headcount)
//   WITHOUT seeing any individual salary, tax rate, or identity.
//   This is the power of ZK selective disclosure.
// ========================================================

import { ShieldCheck, Hash, Users, Banknote, GitBranch } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import type { AuditProof } from '../../types/ghostpay';

interface Props {
  proof: AuditProof;
}

function formatCredits(micro: number): string {
  return `${(micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} AC`;
}

export default function AuditProofCard({ proof }: Props) {
  return (
    <GlowCard glowColor="amber">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Audit Proof</h3>
            <p className="text-xs text-gray-500">Selective disclosure — aggregates only</p>
          </div>
        </div>
        <PrivacyBadge level="selective" />
      </div>

      {/* Aggregate data the auditor receives */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Banknote className="h-4 w-4" />
            <span className="text-xs">Total Disbursed</span>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-400">{formatCredits(proof.total_disbursed)}</p>
          <p className="mt-1 text-[10px] text-gray-600">Sum of all net salaries in batch</p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="h-4 w-4" />
            <span className="text-xs">Employee Count</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">{proof.employee_count}</p>
          <p className="mt-1 text-[10px] text-gray-600">Headcount in this batch</p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Hash className="h-4 w-4" />
            <span className="text-xs">Batch Hash</span>
          </div>
          <p className="mt-2 truncate font-mono text-sm text-blue-400">{proof.batch_hash}</p>
          <PrivacyBadge level="public" className="mt-1" />
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <GitBranch className="h-4 w-4" />
            <span className="text-xs">Merkle Root</span>
          </div>
          <p className="mt-2 truncate font-mono text-sm text-purple-400">{proof.employees_merkle_root}</p>
          <p className="mt-1 text-[10px] text-gray-600">Verifiable employee set proof</p>
        </div>
      </div>

      {/* What's hidden from the auditor */}
      <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
        <p className="mb-2 text-xs font-medium text-red-400">🔒 Hidden from auditor:</p>
        <div className="flex flex-wrap gap-2">
          {['Individual salaries', 'Tax rates', 'Bonus amounts', 'Employee identities', 'Payment nonces'].map(item => (
            <span key={item} className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Employer info */}
      <div className="mt-3 text-xs text-gray-600">
        Employer: <span className="font-mono text-gray-500">{proof.employer.slice(0, 16)}...</span>
      </div>
    </GlowCard>
  );
}

