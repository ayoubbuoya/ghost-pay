import { useEmployeeList, useContractOwner, useRemoveEmployee } from "../../hooks/useContract";
import { useAccount } from "wagmi";
import { Badge } from "../ui/Badge";
import { AddressDisplay } from "../ui/AddressDisplay";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { useState } from "react";
import { showToast, dismissToast } from "../ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { type Address } from "viem";
import { GHOSTPAY_ADDRESS, GHOSTPAY_ABI } from "../../lib/contract";

interface EmployeeTableProps {
  onPay: (address: Address) => void;
}

export function EmployeeTable({ onPay }: EmployeeTableProps) {
  const { data: employeeList, isLoading } = useEmployeeList();
  const { data: owner } = useContractOwner();
  const { address } = useAccount();
  const { removeEmployee, isPending, isConfirming } = useRemoveEmployee();
  const [removing, setRemoving] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isOwner = !!address && !!owner && address.toLowerCase() === (owner as string).toLowerCase();

  const handleRemove = (empAddress: Address) => {
    if (!confirm("Are you sure you want to remove this employee?")) return;
    setRemoving(empAddress);
    const toastId = showToast("Removing employee...", "pending");
    removeEmployee(
      {
        address: GHOSTPAY_ADDRESS,
        abi: GHOSTPAY_ABI,
        functionName: "removeEmployee",
        args: [empAddress],
      },
      {
        onSuccess: () => {
          showToast("Employee removed!", "success");
          dismissToast(toastId);
          queryClient.invalidateQueries();
          setRemoving(null);
        },
        onError: (err) => {
          showToast(err.message.slice(0, 80), "error");
          dismissToast(toastId);
          setRemoving(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="w-6 h-6 text-ghost-500" />
        <span className="ml-3 text-surface-400">Loading employees...</span>
      </div>
    );
  }

  const employees = (employeeList as Address[] | undefined) ?? [];

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-surface-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-surface-400 text-lg">No employees yet</p>
        <p className="text-surface-600 text-sm mt-1">Add your first employee to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-700">
            <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wider">#</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wider">Address</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wider">Salary</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wider">Bonus</th>
            {isOwner ? (
              <th className="text-right py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wider">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, i) => (
            <tr key={emp} className="border-b border-surface-800 hover:bg-surface-900/50 transition-colors">
              <td className="py-3 px-4 text-sm text-surface-500">{i + 1}</td>
              <td className="py-3 px-4">
                <AddressDisplay address={emp} />
              </td>
              <td className="py-3 px-4">
                <Badge variant="active">Active</Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant="encrypted">Encrypted</Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant="encrypted">Encrypted</Badge>
              </td>
              {isOwner ? (
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" className="py-1! px-3! text-xs!" onClick={() => onPay(emp)}>
                      Pay
                    </Button>
                    <Button
                      variant="danger"
                      className="py-1! px-3! text-xs!"
                      onClick={() => handleRemove(emp)}
                      isLoading={removing === emp && (isPending || isConfirming)}
                      disabled={!!removing}
                    >
                      Remove
                    </Button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
