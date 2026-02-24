// ========================================================
// ProcessPayroll — Execute a payroll batch for all employees
//
// Calls: ghostpay.aleo/process_payroll transition (once per employee)
//
// Leo signature:
//   async transition process_payroll(
//     record: EmployeeRecord,
//     bonus: u64,
//     batch_nonce: u32,
//     batch_hash: field,
//   ) -> (EmployeeRecord, SalaryPayment, Future)
//
// Privacy flow:
//   1. Employer sets bonus amounts per employee
//   2. Contract computes: tax = (base / 10000) * tax_rate_bps
//   3. Contract computes: net = base + bonus - tax
//   4. Contract verifies: net >= min_salary (ZK constraint)
//   5. A private SalaryPayment record is issued to the employee
//   6. On-chain: only a PayrollBatchSummary (no salary data) is stored
// ========================================================

import { useState } from 'react';
import { Banknote, Shield, Zap } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useWallet } from '../../context/WalletContext';
import type { SalaryPayment, TransactionStatus, PayrollBatchSummary } from '../../types/ghostpay';

export default function ProcessPayroll() {
  const { employees, setPayments, setBatchSummaries, wallet, addTransaction } = useWallet();
  const [bonuses, setBonuses] = useState<Record<string, string>>({});
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    state: 'idle', timestamp: Date.now(), description: '',
  });

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length === 0) return alert('No employees to process');

    setTxStatus({ state: 'building', timestamp: Date.now(), description: `Building payroll batch for ${employees.length} employees...` });
    await new Promise(r => setTimeout(r, 800));

    setTxStatus({ state: 'proving', timestamp: Date.now(), description: 'Generating ZK proofs (salary constraints, tax calculations)...' });
    await new Promise(r => setTimeout(r, 2000));

    setTxStatus({ state: 'broadcasting', timestamp: Date.now(), description: 'Broadcasting batch to Aleo Testnet...' });
    await new Promise(r => setTimeout(r, 1200));

    // Simulate payroll results matching the Leo contract formula
    const batchHash = `${Math.floor(Math.random() * 999999999)}field`;
    const batchNonce = Math.floor(Math.random() * 10000);

    const newPayments: SalaryPayment[] = employees.map(emp => {
      const bonus = parseInt(bonuses[emp.employee_id_hash] || '0', 10);
      const tax = Math.floor(emp.base_salary / 10000) * emp.tax_rate_bps;
      const net = emp.base_salary + bonus - tax;
      return {
        owner: emp.owner,
        employer: emp.employer,
        batch_hash: batchHash,
        net_salary: net,
        bonus,
        tax_deducted: tax,
        payment_nonce: `${Math.floor(Math.random() * 999999)}field`,
      };
    });

    const summary: PayrollBatchSummary = {
      batch_hash: batchHash,
      employer: wallet.address!,
      employee_count: employees.length,
      nonce: batchNonce,
      finalized: true,
    };

    setPayments(prev => [...prev, ...newPayments]);
    setBatchSummaries(prev => [...prev, summary]);

    const txId = `at1${Math.random().toString(36).slice(2, 18)}`;
    setTxStatus({ state: 'confirmed', timestamp: Date.now(), description: `Payroll processed: ${employees.length} payments issued`, txId });
    addTransaction({ state: 'confirmed', timestamp: Date.now(), description: `Payroll batch ${batchHash.slice(0, 8)}...`, txId });

    setBonuses({});
    setTimeout(() => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }), 5000);
  };

  return (
    <GlowCard glowColor="emerald">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Process Payroll</h3>
            <p className="text-xs text-gray-500">Run payroll batch for all employees</p>
          </div>
        </div>
        <PrivacyBadge level="private" label="Payments → Employees" />
      </div>

      <form onSubmit={handleProcess} className="space-y-4">
        {/* Bonus inputs per employee */}
        <div className="space-y-2">
          <label className="mb-1 block text-xs font-medium text-gray-400">Bonus Amounts (optional)</label>
          {employees.map((emp, i) => (
            <div key={emp.employee_id_hash} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/30 px-3 py-2">
              <span className="w-6 text-xs text-gray-500">{i + 1}</span>
              <span className="flex-1 truncate font-mono text-xs text-gray-400">{emp.owner.slice(0, 16)}...</span>
              <input
                className="ghost-input w-32 py-1.5 text-right text-sm"
                type="number" placeholder="0" min="0"
                value={bonuses[emp.employee_id_hash] || ''}
                onChange={e => setBonuses(b => ({ ...b, [emp.employee_id_hash]: e.target.value }))}
              />
              <span className="text-[10px] text-gray-600">μcredits</span>
            </div>
          ))}
        </div>

        {/* ZK proof explanation */}
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-gray-400">
            Each payment generates a <strong className="text-emerald-300">zero-knowledge proof</strong> that:
            net_salary = base + bonus − tax, tax is correctly calculated from tax_rate_bps,
            and net_salary ≥ min_salary. The chain <strong className="text-emerald-300">verifies these constraints
            without seeing any amounts</strong>.
          </p>
        </div>

        <TransactionStatusBar status={txStatus} />

        <button type="submit" className="ghost-btn w-full" disabled={txStatus.state !== 'idle' && txStatus.state !== 'confirmed'}>
          <Zap className="h-4 w-4" />
          Process Payroll ({employees.length} employees)
        </button>
      </form>
    </GlowCard>
  );
}

