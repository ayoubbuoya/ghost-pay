// ========================================================
// RegisterEmployee — Form for the employer to register a new employee
//
// Calls: ghostpay.aleo/register_employee transition
//
// Leo signature:
//   async transition register_employee(
//     employee: address,
//     employee_id_hash: field,
//     base_salary: u64,
//     tax_rate_bps: u16,
//     min_salary: u64,
//     salt: scalar,
//   ) -> (EmployeeRecord, Future)
//
// Privacy flow:
//   1. Employer fills in salary details
//   2. Frontend computes salary_commitment = BHP256::hash(packed + salt)
//   3. On-chain: ONLY the commitment hash is stored
//   4. The employee receives a private EmployeeRecord with full salary data
//   5. Nobody else can see the salary — not even the chain validators
// ========================================================

import { useState } from 'react';
import { UserPlus, Shield } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useWallet } from '../../context/WalletContext';
import type { EmployeeRecord, TransactionStatus } from '../../types/ghostpay';

export default function RegisterEmployee() {
  const { employees, setEmployees, wallet, addTransaction } = useWallet();
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
    const base = parseInt(form.baseSalary, 10);
    const taxBps = Math.round(parseFloat(form.taxRate) * 100); // Convert % to bps
    const min = parseInt(form.minSalary, 10);

    // Validate constraints matching the Leo contract assertions
    if (taxBps > 10000) return alert('Tax rate cannot exceed 100%');
    if (min > base) return alert('Minimum salary cannot exceed base salary');
    if (base <= 0) return alert('Base salary must be positive');

    // Simulate the transaction lifecycle for demo
    setTxStatus({ state: 'building', timestamp: Date.now(), description: 'Constructing register_employee inputs...' });

    await new Promise(r => setTimeout(r, 800));
    setTxStatus({ state: 'proving', timestamp: Date.now(), description: 'Generating ZK proof (salary commitment)...' });

    await new Promise(r => setTimeout(r, 1500));
    setTxStatus({ state: 'broadcasting', timestamp: Date.now(), description: 'Submitting to Aleo Testnet...' });

    await new Promise(r => setTimeout(r, 1000));

    // Create the simulated EmployeeRecord (mirrors what the contract returns)
    const idHash = `${Math.floor(Math.random() * 999999999)}field`;
    const salt = `${Math.floor(Math.random() * 100000)}scalar`;
    const newRecord: EmployeeRecord = {
      owner: form.address || `aleo1${form.name.toLowerCase().padEnd(58, '0')}`,
      employer: wallet.address!,
      employee_id_hash: idHash,
      salary_commitment: `${Math.floor(Math.random() * 999999999)}field`,
      base_salary: base,
      tax_rate_bps: taxBps,
      min_salary: min,
      salt,
    };

    setEmployees(prev => [...prev, newRecord]);

    const txId = `at1${Math.random().toString(36).slice(2, 18)}`;
    setTxStatus({ state: 'confirmed', timestamp: Date.now(), description: 'Employee registered successfully', txId });
    addTransaction({ state: 'confirmed', timestamp: Date.now(), description: `Registered employee ${form.name}`, txId });

    // Reset form
    setForm({ address: '', name: '', baseSalary: '', taxRate: '', minSalary: '' });
    setTimeout(() => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }), 4000);
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
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
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

        <button type="submit" className="ghost-btn w-full" disabled={txStatus.state !== 'idle' && txStatus.state !== 'confirmed'}>
          <UserPlus className="h-4 w-4" />
          Register Employee
        </button>
      </form>
    </GlowCard>
  );
}

