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
// Wallet connection is handled by Leo Wallet browser extension.
// ========================================================

import Header from './components/layout/Header';
import RoleSelector from './components/layout/RoleSelector';
import EmployerDashboard from './components/employer/EmployerDashboard';
import EmployeePortal from './components/employee/EmployeePortal';
import AuditorView from './components/auditor/AuditorView';
import { useGhostPay, useWallet } from './context/WalletContext';

export default function App() {
  const { activeRole } = useGhostPay();
  const { publicKey } = useWallet();

  return (
    <div className="noise-bg min-h-screen">
      <Header />

      {/* Show role selector and dashboards only when wallet is connected */}
      {publicKey ? (
        <>
          <RoleSelector />
          <main className="animate-fade-in">
            {activeRole === 'employer' && <EmployerDashboard />}
            {activeRole === 'employee' && <EmployeePortal />}
            {activeRole === 'auditor' && <AuditorView />}
          </main>
        </>
      ) : (
        /* Prompt to connect wallet when not connected */
        <div className="flex flex-col items-center justify-center py-32">
          <div className="rounded-2xl border border-aleo-border bg-aleo-dark/50 p-12 text-center backdrop-blur-xl">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Connect Your Wallet
            </h2>
            <p className="mb-6 max-w-md text-sm text-gray-400">
              Connect your Leo Wallet to interact with GhostPay.
              All salary data stays private — only commitment hashes
              appear on-chain.
            </p>
            <p className="text-xs text-gray-600">
              Click the "Connect" button in the header to get started.
            </p>
          </div>
        </div>
      )}

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
