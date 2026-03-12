// ========================================================
// AuditorView — Main container for the Auditor role
//
// The auditor has the MOST RESTRICTED visibility:
//   ✓ Total disbursed amount (aggregate)
//   ✓ Employee count (aggregate)
//   ✓ Merkle root of employee set (verifiable)
//   ✓ Batch hash (public reference)
//   ✗ NO individual salaries
//   ✗ NO employee identities
//   ✗ NO tax rates or bonus amounts
//
// This is the crown jewel of GhostPay's privacy model:
// a compliance audit can be performed with mathematical
// certainty while revealing ZERO individual salary data.
// ========================================================

import { ShieldCheck, Eye, EyeOff, Banknote, Users, Shield } from 'lucide-react';
import StatusCard from '../common/StatusCard';
import AuditProofCard from './AuditProofCard';
import GlowCard from '../common/GlowCard';
import { useGhostPay } from '../../context/WalletContext';

export default function AuditorView() {
  const { auditProofs, batchSummaries } = useGhostPay();

  const totalDisbursed = auditProofs.reduce((s, p) => s + p.total_disbursed, 0);
  const totalEmployees = auditProofs.reduce((s, p) => s + p.employee_count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 pb-12">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-500/20 p-2.5 text-amber-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Auditor View</h2>
          <p className="text-sm text-gray-400">
            Restricted view — aggregated compliance data only, no individual salaries
          </p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard
          icon={<Banknote className="h-5 w-5" />}
          label="Total Disbursed"
          value={`${(totalDisbursed / 1_000_000).toFixed(2)} AC`}
          privacy="selective"
          iconColor="text-emerald-400"
          subValue="Verified via ZK proof"
        />
        <StatusCard
          icon={<Users className="h-5 w-5" />}
          label="Total Employees"
          value={totalEmployees}
          privacy="selective"
          iconColor="text-blue-400"
          subValue="Headcount only"
        />
        <StatusCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Audit Proofs"
          value={auditProofs.length}
          privacy="selective"
          iconColor="text-amber-400"
          subValue="Received from employers"
        />
        <StatusCard
          icon={<Eye className="h-5 w-5" />}
          label="Batch Summaries"
          value={batchSummaries.length}
          privacy="public"
          iconColor="text-gray-400"
          subValue="On-chain public data"
        />
      </div>

      {/* Comparison: What auditor sees vs. what's hidden */}
      <GlowCard>
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-white">Privacy Comparison</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Visible to auditor */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">What you CAN see</p>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-300">
              <li className="flex items-center gap-2">✓ Total payroll spend (sum of all net salaries)</li>
              <li className="flex items-center gap-2">✓ Employee headcount per batch</li>
              <li className="flex items-center gap-2">✓ Cryptographic Merkle root of employee set</li>
              <li className="flex items-center gap-2">✓ Batch reference hash (public)</li>
              <li className="flex items-center gap-2">✓ Mathematical proof that payroll is correct</li>
            </ul>
          </div>
          {/* Hidden from auditor */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-red-400" />
              <p className="text-sm font-medium text-red-400">What remains HIDDEN</p>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li className="flex items-center gap-2">✗ Individual employee salaries</li>
              <li className="flex items-center gap-2">✗ Tax rates per employee</li>
              <li className="flex items-center gap-2">✗ Bonus amounts per employee</li>
              <li className="flex items-center gap-2">✗ Employee wallet addresses</li>
              <li className="flex items-center gap-2">✗ Employee identity mapping</li>
            </ul>
          </div>
        </div>
      </GlowCard>

      {/* Audit proof cards */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">Received Audit Proofs</h3>
        {auditProofs.length === 0 ? (
          <GlowCard>
            <p className="text-center text-gray-500">No audit proofs received yet. Request one from an employer.</p>
          </GlowCard>
        ) : (
          auditProofs.map((proof, i) => <AuditProofCard key={i} proof={proof} />)
        )}
      </div>
    </div>
  );
}

