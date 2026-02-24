// ========================================================
// EmployerDashboard — Main container for the Employer role
//
// The employer has FULL visibility:
//   - They created all EmployeeRecords (so they hold copies)
//   - They executed process_payroll (so they know all amounts)
//   - They can generate audit proofs for compliance
//
// This dashboard composes:
//   1. Summary metrics (employees, payments, batches)
//   2. RegisterEmployee form
//   3. EmployeeList table
//   4. ProcessPayroll action
//   5. GenerateAudit action
// ========================================================

import { Building2, Users, Banknote, FileCheck, Hash } from 'lucide-react';
import StatusCard from '../common/StatusCard';
import RegisterEmployee from './RegisterEmployee';
import EmployeeList from './EmployeeList';
import ProcessPayroll from './ProcessPayroll';
import GenerateAudit from './GenerateAudit';
import { useWallet } from '../../context/WalletContext';

export default function EmployerDashboard() {
  const { employees, payments, batchSummaries, auditProofs } = useWallet();

  const totalDisbursed = payments.reduce((s, p) => s + p.net_salary, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 pb-12">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-aleo-cyan/20 p-2.5 text-aleo-cyan">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Employer Dashboard</h2>
          <p className="text-sm text-gray-400">
            Full visibility — you created all records and hold private copies
          </p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard
          icon={<Users className="h-5 w-5" />}
          label="Registered Employees"
          value={employees.length}
          privacy="private"
          subValue="Private records issued"
        />
        <StatusCard
          icon={<Banknote className="h-5 w-5" />}
          label="Total Disbursed"
          value={`${(totalDisbursed / 1_000_000).toFixed(2)} AC`}
          privacy="private"
          iconColor="text-emerald-400"
          subValue={`${payments.length} payments`}
        />
        <StatusCard
          icon={<Hash className="h-5 w-5" />}
          label="Payroll Batches"
          value={batchSummaries.length}
          privacy="public"
          iconColor="text-blue-400"
          subValue="Batch summaries on-chain"
        />
        <StatusCard
          icon={<FileCheck className="h-5 w-5" />}
          label="Audit Proofs"
          value={auditProofs.length}
          privacy="selective"
          iconColor="text-amber-400"
          subValue="Issued to auditors"
        />
      </div>

      {/* Employee registry */}
      <EmployeeList />

      {/* Action cards — 2 column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RegisterEmployee />
        <ProcessPayroll />
      </div>

      {/* Audit proof generation */}
      <GenerateAudit />
    </div>
  );
}

