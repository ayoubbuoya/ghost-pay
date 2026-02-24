// ========================================================
// RoleSelector — Tab navigation for switching between roles
//
// The three roles map to the GhostPay contract's access model:
//   - Employer: calls register_employee, process_payroll, generate_audit_proof
//   - Employee: calls verify_salary_commitment, claim_salary
//   - Auditor:  receives AuditProof records (read-only view)
//
// Each role sees different data, demonstrating the privacy model:
//   Employer sees everything (they created the records)
//   Employee sees only their own private records
//   Auditor sees only aggregated batch data
// ========================================================

import { Building2, User, ShieldCheck } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import type { UserRole } from '../../types/ghostpay';

const roles: { id: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'employer',
    label: 'Employer',
    icon: <Building2 className="h-5 w-5" />,
    desc: 'Register employees, run payroll, generate audit proofs',
  },
  {
    id: 'employee',
    label: 'Employee',
    icon: <User className="h-5 w-5" />,
    desc: 'View salary records, claim payments, verify commitments',
  },
  {
    id: 'auditor',
    label: 'Auditor',
    icon: <ShieldCheck className="h-5 w-5" />,
    desc: 'View batch compliance, verify proofs (aggregates only)',
  },
];

export default function RoleSelector() {
  const { activeRole, setActiveRole } = useWallet();

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {roles.map((role) => {
          const isActive = activeRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              className={`group flex flex-1 items-center gap-3 rounded-xl border px-5 py-4 text-left transition-all duration-300 ${
                isActive
                  ? 'border-aleo-cyan/40 bg-aleo-cyan/5 shadow-lg shadow-aleo-cyan/5'
                  : 'border-aleo-border bg-aleo-card hover:border-gray-600'
              }`}
            >
              <div
                className={`rounded-lg p-2 transition-colors ${
                  isActive
                    ? 'bg-aleo-cyan/20 text-aleo-cyan'
                    : 'bg-gray-800 text-gray-400 group-hover:text-gray-300'
                }`}
              >
                {role.icon}
              </div>
              <div>
                <p
                  className={`font-semibold ${
                    isActive ? 'text-white' : 'text-gray-300'
                  }`}
                >
                  {role.label}
                </p>
                <p className="text-xs text-gray-500">{role.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

