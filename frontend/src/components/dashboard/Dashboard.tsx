import { useState } from "react";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { StatsCards } from "./StatsCards";
import { EmployeeTable } from "./EmployeeTable";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { PayEmployeeModal } from "./PayEmployeeModal";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useContractOwner } from "../../hooks/useContract";

export function Dashboard() {
  const { isConnected } = useAccount();
  const { data: owner } = useContractOwner();
  const { address } = useAccount();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Address | null>(null);

  const isOwner =
    !!address && !!owner && address.toLowerCase() === (owner as string).toLowerCase();

  const handlePay = (empAddress: Address) => {
    setPayTarget(empAddress);
    setPayModalOpen(true);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-ghost-500/20 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-ghost-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-surface-100 mb-2">Connect Your Wallet</h2>
        <p className="text-surface-500 text-center max-w-sm">
          Connect your wallet to access the GhostPay company dashboard and manage your encrypted payroll.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-surface-100">Company Dashboard</h2>
          <p className="text-sm text-surface-500 mt-1">Manage your encrypted payroll</p>
        </div>
        {isOwner ? (
          <Button onClick={() => setAddModalOpen(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </Button>
        ) : null}
      </div>

      <StatsCards />

      <Card className="p-0">
        <div className="px-5 py-4 border-b border-surface-700">
          <h3 className="text-lg font-medium text-surface-100">Employees</h3>
        </div>
        <div className="px-5 pb-5">
          <EmployeeTable onPay={handlePay} />
        </div>
      </Card>

      {isOwner ? (
        <>
          <AddEmployeeModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
          <PayEmployeeModal
            open={payModalOpen}
            onClose={() => {
              setPayModalOpen(false);
              setPayTarget(null);
            }}
            employeeAddress={payTarget}
          />
        </>
      ) : null}
    </div>
  );
}
