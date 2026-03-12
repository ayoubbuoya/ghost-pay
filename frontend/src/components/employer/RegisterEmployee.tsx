// ========================================================
// RegisterEmployee — Form for the employer to register a new employee
//
// Calls: ghostpay.aleo/register_employee transition via Leo Wallet
//
// Privacy flow:
//   1. Employer fills in salary details
//   2. Leo Wallet generates ZK proof and salary commitment
//   3. Transaction submitted to Aleo network
//   4. On-chain: ONLY the commitment hash is stored
//   5. The employee receives a private EmployeeRecord
// ========================================================

import { useState } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useGhostPay, useWallet } from '../../context/WalletContext';
import { buildRegisterEmployeeTransaction } from '../../services/aleo';
import type { TransactionStatus } from '../../types/ghostpay';

export default function RegisterEmployee() {
  const { addTransaction, refreshRecords } = useGhostPay();
  const { publicKey, requestTransaction } = useWallet();

  const [form, setForm] = useState({
    address: '',
    name: '',
    baseSalary: '',
    taxRate: '',
    minSalary: '',
  });
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    state: 'idle', timestamp: Date.now(), description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate wallet connection
    if (!publicKey || !requestTransaction) {
      return alert('Please connect your Leo Wallet first');
    }

    const base = parseInt(form.baseSalary, 10);
    const taxBps = Math.round(parseFloat(form.taxRate) * 100); // Convert % to bps
    const min = parseInt(form.minSalary, 10);

    // Validate constraints matching the Leo contract assertions
    if (taxBps > 10000) return alert('Tax rate cannot exceed 100%');
    if (min > base) return alert('Minimum salary cannot exceed base salary');
    if (base <= 0) return alert('Base salary must be positive');

    try {
      // Step 1: Build the transaction
      setTxStatus({
        state: 'building',
        timestamp: Date.now(),
        description: 'Constructing register_employee inputs...',
      });

      // Generate a deterministic employee ID hash from the name
      const employeeIdHash = `${Math.abs(hashString(form.name || form.address))}`;

      const transaction = buildRegisterEmployeeTransaction(publicKey, {
        employeeAddress: form.address,
        employeeIdHash,
        baseSalary: base,
        taxRateBps: taxBps,
        minSalary: min,
      });

      // Step 2: Submit to Leo Wallet (handles proving + broadcasting)
      setTxStatus({
        state: 'proving',
        timestamp: Date.now(),
        description: 'Leo Wallet is generating ZK proof...',
      });

      const txId = await requestTransaction(transaction);

      // Step 3: Transaction submitted
      setTxStatus({
        state: 'confirmed',
        timestamp: Date.now(),
        description: 'Transaction submitted to network',
        txId: txId as string,
      });
      addTransaction({
        state: 'confirmed',
        timestamp: Date.now(),
        description: `Registered employee ${form.name}`,
        txId: txId as string,
      });

      // Refresh records to pick up the new EmployeeRecord
      await refreshRecords();

      // Reset form
      setForm({ address: '', name: '', baseSalary: '', taxRate: '', minSalary: '' });
      setTimeout(
        () => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }),
        4000,
      );
    } catch (error) {
      console.error('Registration failed:', error);
      setTxStatus({
        state: 'failed',
        timestamp: Date.now(),
        description: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setTimeout(
        () => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }),
        6000,
      );
    }
  };

  return (
    <GlowCard glowColor="purple">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/20 p-2 text-purple-400">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Register Employee</h3>
            <p className="text-xs text-gray-500">Issue a private EmployeeRecord</p>
          </div>
        </div>
        <PrivacyBadge level="private" label="Record → Employee" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Employee Name</label>
            <input className="ghost-input" placeholder="Alice" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Wallet Address</label>
            <input className="ghost-input font-mono text-xs" placeholder="aleo1..."
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-400">
              Base Salary <PrivacyBadge level="private" />
            </label>
            <input className="ghost-input" type="number" placeholder="5000000" value={form.baseSalary}
              onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))} required />
            <p className="mt-1 text-[10px] text-gray-600">microcredits</p>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-400">
              Tax Rate <PrivacyBadge level="private" />
            </label>
            <input className="ghost-input" type="number" step="0.01" placeholder="20" value={form.taxRate}
              onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} required />
            <p className="mt-1 text-[10px] text-gray-600">percentage (0–100%)</p>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-400">
              Min Salary <PrivacyBadge level="private" />
            </label>
            <input className="ghost-input" type="number" placeholder="3500000" value={form.minSalary}
              onChange={e => setForm(f => ({ ...f, minSalary: e.target.value }))} required />
            <p className="mt-1 text-[10px] text-gray-600">contractual floor</p>
          </div>
        </div>

        {/* Privacy explanation box */}
        <div className="flex items-start gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <p className="text-xs leading-relaxed text-gray-400">
            On-chain, only a <strong className="text-purple-300">salary commitment hash</strong> is stored.
            The actual salary, tax rate, and minimum are embedded in a <strong className="text-purple-300">private record</strong> delivered
            only to the employee. Chain validators never see salary amounts.
          </p>
        </div>

        <TransactionStatusBar status={txStatus} />

        <button type="submit" className="ghost-btn w-full"
          disabled={!publicKey || (txStatus.state !== 'idle' && txStatus.state !== 'confirmed')}>
          <UserPlus className="h-4 w-4" />
          Register Employee
        </button>
      </form>
    </GlowCard>
  );
}

/**
 * Simple string hash for generating deterministic employee ID hashes.
 * Uses djb2 algorithm — sufficient for demo/hackathon purposes.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure unsigned
}
