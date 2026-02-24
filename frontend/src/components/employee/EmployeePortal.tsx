// ========================================================
// EmployeePortal — Main container for the Employee role
//
// The employee has LIMITED visibility:
//   - They can see only THEIR OWN private records
//   - They cannot see other employees' data
//   - They can verify their salary commitment matches the on-chain hash
//   - They can claim payments that the employer has issued
//
// This demonstrates the employee side of GhostPay's privacy model:
//   ✓ Employee knows their own salary (from their EmployeeRecord)
//   ✓ Employee can verify the commitment matches (verify_salary_commitment)
//   ✓ Employee can claim payments (claim_salary)
//   ✗ Employee cannot see anyone else's salary
//   ✗ Employee cannot see the employer's total payroll spend
// ========================================================

import { User, Wallet, Download, Hash } from 'lucide-react';
import StatusCard from '../common/StatusCard';
import SalaryView from './SalaryView';
import ClaimSalary from './ClaimSalary';
import { useWallet } from '../../context/WalletContext';

export default function EmployeePortal() {
  const { employees, payments } = useWallet();
  const myRecord = employees[0] || null;
  const myPayments = payments.filter(p => p.owner === myRecord?.owner);
  const totalEarnings = myPayments.reduce((s, p) => s + p.net_salary, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 pb-12">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-purple-500/20 p-2.5 text-purple-400">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Employee Portal</h2>
          <p className="text-sm text-gray-400">
            Your private view — only you can see your salary details
          </p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard
          icon={<Wallet className="h-5 w-5" />}
          label="Base Salary"
          value={myRecord ? `${(myRecord.base_salary / 1_000_000).toFixed(2)} AC` : '—'}
          privacy="private"
          iconColor="text-emerald-400"
        />
        <StatusCard
          icon={<Download className="h-5 w-5" />}
          label="Total Earnings"
          value={`${(totalEarnings / 1_000_000).toFixed(2)} AC`}
          privacy="private"
          iconColor="text-aleo-cyan"
          subValue={`${myPayments.length} payments`}
        />
        <StatusCard
          icon={<Hash className="h-5 w-5" />}
          label="Commitment Hash"
          value={myRecord?.salary_commitment.slice(0, 10) || '—'}
          privacy="public"
          iconColor="text-blue-400"
          subValue="On-chain (visible to all)"
        />
        <StatusCard
          icon={<User className="h-5 w-5" />}
          label="Tax Rate"
          value={myRecord ? `${(myRecord.tax_rate_bps / 100).toFixed(1)}%` : '—'}
          privacy="private"
          iconColor="text-amber-400"
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SalaryView />
        <ClaimSalary />
      </div>
    </div>
  );
}

