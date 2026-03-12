// ========================================================
// EmployeeList — Table of registered employees
//
// Shows employer's view of all employee records.
// The employer created these records, so they can see ALL fields.
// On-chain, only the salary_commitment (hash) is public.
//
// Privacy demonstration:
//   - Left columns: public data (commitment hash, employee address)
//   - Right columns: private data (salary, tax rate) — marked with badges
//   - The employer sees everything because they hold the private records
// ========================================================

import { Users, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import { useGhostPay } from '../../context/WalletContext';

/** Format microcredits to a human-readable Aleo credit value */
function formatCredits(micro: number): string {
  return `${(micro / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} AC`;
}

export default function EmployeeList() {
  const { employees } = useGhostPay();
  const [showPrivate, setShowPrivate] = useState(true);

  return (
    <GlowCard>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-aleo-cyan/20 p-2 text-aleo-cyan">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Employee Registry</h3>
            <p className="text-xs text-gray-500">{employees.length} registered employees</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrivate(p => !p)}
          className="ghost-btn-outline flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          {showPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showPrivate ? 'Hide Private' : 'Show Private'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">
                Address <PrivacyBadge level="public" className="ml-1" />
              </th>
              <th className="pb-3 pr-4">
                Commitment <PrivacyBadge level="public" className="ml-1" />
              </th>
              {showPrivate && (
                <>
                  <th className="pb-3 pr-4">
                    Base Salary <PrivacyBadge level="private" className="ml-1" />
                  </th>
                  <th className="pb-3 pr-4">
                    Tax Rate <PrivacyBadge level="private" className="ml-1" />
                  </th>
                  <th className="pb-3 pr-4">
                    Min Salary <PrivacyBadge level="private" className="ml-1" />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.employee_id_hash} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-3 pr-4 font-mono text-xs text-gray-300">
                  {emp.owner.slice(0, 12)}...{emp.owner.slice(-4)}
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-blue-400">{emp.salary_commitment}</td>
                {showPrivate && (
                  <>
                    <td className="py-3 pr-4 text-emerald-400">{formatCredits(emp.base_salary)}</td>
                    <td className="py-3 pr-4 text-amber-400">{(emp.tax_rate_bps / 100).toFixed(1)}%</td>
                    <td className="py-3 pr-4 text-gray-300">{formatCredits(emp.min_salary)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Privacy explanation */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-aleo-cyan/10 bg-aleo-cyan/5 p-3">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-aleo-cyan" />
        <p className="text-xs leading-relaxed text-gray-400">
          <strong className="text-aleo-cyan">On-chain view:</strong> Only the employee address and
          salary commitment hash are publicly visible. Toggle "Hide Private" to see what
          a chain observer would see. Salary amounts exist only in <strong className="text-aleo-cyan">private records</strong>.
        </p>
      </div>
    </GlowCard>
  );
}

