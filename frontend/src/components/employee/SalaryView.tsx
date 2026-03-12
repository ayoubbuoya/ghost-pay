// ========================================================
// SalaryView — Employee's view of their private salary records
//
// This component demonstrates the EMPLOYEE'S privacy perspective:
//   - The employee receives private EmployeeRecord and SalaryPayment records
//   - These records are encrypted on-chain — only the employee can decrypt
//   - The employer created them, but the employee OWNS them
//   - The chain verifies ZK constraints without seeing amounts
//
// What the employee sees (from their private records):
//   ✓ Their base salary, tax rate, min salary
//   ✓ Net salary after tax and bonus
//   ✓ Payment status (unclaimed / claimed)
//
// What the chain sees (public mappings):
//   ✗ Only a salary commitment hash (not the salary)
//   ✗ Only batch summary (not individual payments)
// ========================================================

import { Wallet, Shield, ArrowRight } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import { useGhostPay } from '../../context/WalletContext';

function formatCredits(micro: number): string {
  return `${(micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} AC`;
}

export default function SalaryView() {
  const { employees, payments } = useGhostPay();
  // In demo mode, show the first employee's perspective
  const myRecord = employees[0] || null;
  const myPayments = payments.filter(p => p.owner === myRecord?.owner);

  if (!myRecord) {
    return (
      <GlowCard>
        <p className="text-center text-gray-500">No employee record found. Your employer must register you first.</p>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Private Employee Record */}
      <GlowCard glowColor="purple">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2 text-purple-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">My Employment Record</h3>
              <p className="text-xs text-gray-500">Private record — only you can see this</p>
            </div>
          </div>
          <PrivacyBadge level="private" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
            <p className="text-xs text-gray-500">Base Salary</p>
            <p className="text-lg font-bold text-emerald-400">{formatCredits(myRecord.base_salary)}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
            <p className="text-xs text-gray-500">Tax Rate</p>
            <p className="text-lg font-bold text-amber-400">{(myRecord.tax_rate_bps / 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
            <p className="text-xs text-gray-500">Min Salary</p>
            <p className="text-lg font-bold text-gray-300">{formatCredits(myRecord.min_salary)}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
            <p className="text-xs text-gray-500">Commitment</p>
            <p className="truncate font-mono text-sm text-blue-400">{myRecord.salary_commitment}</p>
            <PrivacyBadge level="public" className="mt-1" />
          </div>
        </div>

        {/* On-chain vs off-chain comparison */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <p className="text-xs leading-relaxed text-gray-400">
            Your salary of <strong className="text-purple-300">{formatCredits(myRecord.base_salary)}</strong> is
            stored in a <strong className="text-purple-300">private record</strong> on Aleo.
            The chain only stores the commitment hash <code className="text-blue-400">{myRecord.salary_commitment.slice(0, 12)}...</code>.
            Nobody — not validators, not observers — can determine your salary from this hash.
          </p>
        </div>
      </GlowCard>

      {/* Payment history */}
      <GlowCard>
        <h3 className="mb-4 font-semibold text-white">
          Payment History <PrivacyBadge level="private" className="ml-2" />
        </h3>
        {myPayments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet. Awaiting payroll processing.</p>
        ) : (
          <div className="space-y-3">
            {myPayments.map((pay, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/20 p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{formatCredits(pay.net_salary)}</p>
                    <p className="text-xs text-gray-500">
                      Base + {formatCredits(pay.bonus)} bonus − {formatCredits(pay.tax_deducted)} tax
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Ready to Claim
                  </span>
                  <p className="mt-1 font-mono text-[10px] text-gray-600">nonce: {pay.payment_nonce}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowCard>
    </div>
  );
}

