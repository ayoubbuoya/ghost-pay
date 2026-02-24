// ========================================================
// App.tsx — Root application component for GhostPay
//
// Renders the appropriate dashboard based on the user's
// active role (employer / employee / auditor).
//
// The role-based structure mirrors the GhostPay privacy model:
//   - Employer: full visibility (created all records)
//   - Employee: sees only own private records
//   - Auditor:  sees only aggregate compliance data
//
// In production, role determination would be based on the
// connected wallet address and on-chain state. For the
// hackathon demo, users can switch roles freely.
// ========================================================

import Header from './components/layout/Header';
import RoleSelector from './components/layout/RoleSelector';
import EmployerDashboard from './components/employer/EmployerDashboard';
import EmployeePortal from './components/employee/EmployeePortal';
import AuditorView from './components/auditor/AuditorView';
import { useWallet } from './context/WalletContext';

export default function App() {
  const { activeRole } = useWallet();

  return (
    <div className="noise-bg min-h-screen">
      <Header />
      <RoleSelector />

      <main className="animate-fade-in">
        {activeRole === 'employer' && <EmployerDashboard />}
        {activeRole === 'employee' && <EmployeePortal />}
        {activeRole === 'auditor' && <AuditorView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-aleo-border py-8 text-center">
        <p className="text-xs text-gray-600">
          GhostPay — Privacy-Preserving Payroll on Aleo · Built with Zero-Knowledge Proofs
        </p>
        <p className="mt-1 text-[10px] text-gray-700">
          Salary data is never exposed on-chain. Only commitment hashes and aggregate proofs are publicly visible.
        </p>
      </footer>
    </div>
  );
}

