// ========================================================
// WalletContext — Global state for the connected Aleo wallet
//
// Manages:
//   - Wallet connection state (address, keys, network)
//   - Active user role (employer / employee / auditor)
//   - Demo data for offline demonstration
//   - Transaction history
//
// In production, this would integrate with the Leo Wallet
// browser extension. For the hackathon, we use ephemeral
// accounts generated via the Aleo SDK.
// ========================================================

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type {
  UserRole,
  WalletState,
  EmployeeRecord,
  SalaryPayment,
  AuditProof,
  PayrollBatchSummary,
  TransactionStatus,
} from '../types/ghostpay';
import { generateDemoData } from '../services/aleo';

// ============================================================
// Context Shape
// ============================================================

interface WalletContextType {
  // Wallet state
  wallet: WalletState;
  connectWallet: (privateKey?: string) => Promise<void>;
  disconnectWallet: () => void;

  // Role management
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;

  // Demo data (simulated on-chain + private state)
  employees: EmployeeRecord[];
  setEmployees: React.Dispatch<React.SetStateAction<EmployeeRecord[]>>;
  payments: SalaryPayment[];
  setPayments: React.Dispatch<React.SetStateAction<SalaryPayment[]>>;
  auditProofs: AuditProof[];
  setAuditProofs: React.Dispatch<React.SetStateAction<AuditProof[]>>;
  batchSummaries: PayrollBatchSummary[];
  setBatchSummaries: React.Dispatch<React.SetStateAction<PayrollBatchSummary[]>>;

  // Transaction log
  transactions: TransactionStatus[];
  addTransaction: (tx: TransactionStatus) => void;
  updateTransaction: (txId: string, update: Partial<TransactionStatus>) => void;

  // Demo mode flag
  isDemoMode: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

// ============================================================
// Provider Component
// ============================================================

export function WalletProvider({ children }: { children: ReactNode }) {
  // Initialize with demo data for hackathon presentation
  const demo = useMemo(() => generateDemoData(), []);

  const [wallet, setWallet] = useState<WalletState>({
    connected: true,
    address: demo.employer,
    publicKey: null,
    network: 'testnet',
  });

  const [activeRole, setActiveRole] = useState<UserRole>('employer');
  const [employees, setEmployees] = useState<EmployeeRecord[]>(demo.employees);
  const [payments, setPayments] = useState<SalaryPayment[]>(demo.payments);
  const [auditProofs, setAuditProofs] = useState<AuditProof[]>([demo.auditProof]);
  const [batchSummaries, setBatchSummaries] = useState<PayrollBatchSummary[]>([demo.batchSummary]);
  const [transactions, setTransactions] = useState<TransactionStatus[]>([]);

  const connectWallet = useCallback(async (_privateKey?: string) => {
    // In demo mode, simulate wallet connection
    setWallet({
      connected: true,
      address: demo.employer,
      publicKey: null,
      network: 'testnet',
    });
  }, [demo.employer]);

  const disconnectWallet = useCallback(() => {
    setWallet({ connected: false, address: null, publicKey: null, network: 'testnet' });
  }, []);

  const addTransaction = useCallback((tx: TransactionStatus) => {
    setTransactions(prev => [tx, ...prev]);
  }, []);

  const updateTransaction = useCallback((txId: string, update: Partial<TransactionStatus>) => {
    setTransactions(prev =>
      prev.map(tx => (tx.txId === txId ? { ...tx, ...update } : tx)),
    );
  }, []);

  const value = useMemo<WalletContextType>(
    () => ({
      wallet,
      connectWallet,
      disconnectWallet,
      activeRole,
      setActiveRole,
      employees,
      setEmployees,
      payments,
      setPayments,
      auditProofs,
      setAuditProofs,
      batchSummaries,
      setBatchSummaries,
      transactions,
      addTransaction,
      updateTransaction,
      isDemoMode: true,
    }),
    [wallet, connectWallet, disconnectWallet, activeRole, employees, payments,
     auditProofs, batchSummaries, transactions, addTransaction, updateTransaction],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

