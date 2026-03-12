// ========================================================
// WalletContext — GhostPay application state
//
// Uses Leo Wallet adapter for wallet operations and manages:
//   - Parsed on-chain records (employees, payments, audit proofs)
//   - Batch summaries from public mappings
//   - Transaction history log
//   - Active user role (employer / employee / auditor)
//   - Record refresh via Leo Wallet's `requestRecords()`
//
// The actual wallet connection (address, signing, decrypting)
// is handled by the Leo Wallet adapter's `useWallet()` hook
// from `@demox-labs/aleo-wallet-adapter-react`.
// ========================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useWallet as useLeoWallet } from '@demox-labs/aleo-wallet-adapter-react';

import type {
  UserRole,
  EmployeeRecord,
  SalaryPayment,
  AuditProof,
  PayrollBatchSummary,
  TransactionStatus,
} from '../types/ghostpay';
import { parseAllRecords, PROGRAM_ID } from '../services/aleo';

// ============================================================
// Context Shape
// ============================================================

interface GhostPayContextType {
  // Role management (for UI switching)
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;

  // Parsed on-chain records (populated by refreshRecords)
  employees: EmployeeRecord[];
  payments: SalaryPayment[];
  auditProofs: AuditProof[];
  batchSummaries: PayrollBatchSummary[];

  // Record refresh from Leo Wallet
  refreshRecords: () => Promise<void>;
  isRefreshing: boolean;

  // Transaction log
  transactions: TransactionStatus[];
  addTransaction: (tx: TransactionStatus) => void;
  updateTransaction: (txId: string, update: Partial<TransactionStatus>) => void;
}

const GhostPayContext = createContext<GhostPayContextType | null>(null);

// ============================================================
// Provider Component
// ============================================================

export function GhostPayProvider({ children }: { children: ReactNode }) {
  // Leo Wallet adapter hook — provides wallet connection, record fetching, etc.
  const { publicKey, requestRecords } = useLeoWallet();

  // Application state — starts empty, populated by refreshRecords()
  const [activeRole, setActiveRole] = useState<UserRole>('employer');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [auditProofs, setAuditProofs] = useState<AuditProof[]>([]);
  const [batchSummaries, setBatchSummaries] = useState<PayrollBatchSummary[]>([]);
  const [transactions, setTransactions] = useState<TransactionStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch and parse all private records from the Leo Wallet.
   *
   * Calls `requestRecords(PROGRAM_ID)` which asks the Leo Wallet to scan
   * the Aleo network for records belonging to the connected account,
   * decrypt them, and return the plaintexts.
   *
   * Records are then parsed by type (EmployeeRecord, SalaryPayment, AuditProof)
   * using the parsers in services/aleo.ts.
   */
  const refreshRecords = useCallback(async () => {
    if (!publicKey || !requestRecords) {
      console.warn('Cannot refresh records: wallet not connected');
      return;
    }

    setIsRefreshing(true);
    try {
      // Request all records for the GhostPay program from Leo Wallet
      const rawRecords = await requestRecords(PROGRAM_ID);

      // Parse and categorize records by type
      const parsed = parseAllRecords(rawRecords as Array<{ plaintext: string }>);

      // Update state with parsed records
      setEmployees(parsed.employees);
      setPayments(parsed.payments);
      setAuditProofs(parsed.auditProofs);

      console.log(
        `Records refreshed: ${parsed.employees.length} employees, ` +
        `${parsed.payments.length} payments, ${parsed.auditProofs.length} audit proofs`,
      );
    } catch (error) {
      console.error('Failed to refresh records:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicKey, requestRecords]);

  // Transaction logging helpers
  const addTransaction = useCallback((tx: TransactionStatus) => {
    setTransactions(prev => [tx, ...prev]);
  }, []);

  const updateTransaction = useCallback(
    (txId: string, update: Partial<TransactionStatus>) => {
      setTransactions(prev =>
        prev.map(tx => (tx.txId === txId ? { ...tx, ...update } : tx)),
      );
    },
    [],
  );

  const value = useMemo<GhostPayContextType>(
    () => ({
      activeRole,
      setActiveRole,
      employees,
      payments,
      auditProofs,
      batchSummaries,
      refreshRecords,
      isRefreshing,
      transactions,
      addTransaction,
      updateTransaction,
    }),
    [
      activeRole,
      employees,
      payments,
      auditProofs,
      batchSummaries,
      refreshRecords,
      isRefreshing,
      transactions,
      addTransaction,
      updateTransaction,
    ],
  );

  return (
    <GhostPayContext.Provider value={value}>
      {children}
    </GhostPayContext.Provider>
  );
}

// ============================================================
// Hooks
// ============================================================

/**
 * Access GhostPay application state (records, transactions, role).
 * Must be used within GhostPayProvider.
 */
export function useGhostPay(): GhostPayContextType {
  const ctx = useContext(GhostPayContext);
  if (!ctx) throw new Error('useGhostPay must be used within GhostPayProvider');
  return ctx;
}

/**
 * Re-export useWallet from Leo Wallet adapter for convenience.
 * Components use this for wallet operations (publicKey, requestTransaction, etc.)
 * and useGhostPay() for application state (records, transactions, role).
 */
export { useLeoWallet as useWallet };
