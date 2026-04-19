import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { useEmployeeCount, useEmployeeList, useContractOwner } from "../../hooks/useContract";
import { useAccount } from "wagmi";
import { type Address } from "viem";

export function StatsCards() {
  const { data: count, isLoading: loadingCount } = useEmployeeCount();
  const { data: employeeList, isLoading: loadingList } = useEmployeeList();
  const { data: owner, isLoading: loadingOwner } = useContractOwner();
  const { address } = useAccount();

  const activeCount = (employeeList as Address[] | undefined)?.length ?? 0;
  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ghost-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-ghost-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-surface-500">Total Employees</p>
            {loadingCount ? <Spinner /> : (
              <p className="text-2xl font-semibold text-surface-100">{count?.toString() ?? "0"}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-surface-500">Active</p>
            {loadingList ? <Spinner /> : (
              <p className="text-2xl font-semibold text-surface-100">{activeCount}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwner ? "bg-success/20" : "bg-warning/20"}`}>
            <svg className={`w-5 h-5 ${isOwner ? "text-success" : "text-warning"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-surface-500">Role</p>
            {loadingOwner ? <Spinner /> : (
              <p className={`text-lg font-semibold ${isOwner ? "text-success" : "text-warning"}`}>
                {isOwner ? "Owner" : "Viewer"}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
