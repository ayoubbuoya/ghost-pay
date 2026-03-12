// ========================================================
// ProcessPayroll — Execute a payroll batch for all employees
//
// Calls: ghostpay.aleo/process_payroll transition via Leo Wallet
//        (once per employee in the batch)
//
// Privacy flow:
//   1. Employer sets bonus amounts per employee
//   2. Leo Wallet generates ZK proofs per employee
//   3. Contract verifies: net >= min_salary (ZK constraint)
//   4. Private SalaryPayment records issued to each employee
//   5. On-chain: only PayrollBatchSummary stored (no salary data)
// ========================================================

import { useState } from 'react';
import { Banknote, Shield, Zap } from 'lucide-react';
import GlowCard from '../common/GlowCard';
import PrivacyBadge from '../common/PrivacyBadge';
import TransactionStatusBar from '../common/TransactionStatusBar';
import { useGhostPay, useWallet } from '../../context/WalletContext';
import { buildProcessPayrollTransaction } from '../../services/aleo';
import type { TransactionStatus } from '../../types/ghostpay';

export default function ProcessPayroll() {
  const { employees, addTransaction, refreshRecords } = useGhostPay();
  const { publicKey, requestTransaction } = useWallet();

  const [bonuses, setBonuses] = useState<Record<string, string>>({});
  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    state: 'idle', timestamp: Date.now(), description: '',
  });

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !requestTransaction) {
      return alert('Please connect your Leo Wallet first');
    }
    if (employees.length === 0) return alert('No employees to process');

    // Verify all employees have record plaintexts (needed for the transaction)
    const missingPlaintexts = employees.filter(emp => !emp._recordPlaintext);
    if (missingPlaintexts.length > 0) {
      return alert(
        'Some employee records are missing plaintext data. ' +
        'Please refresh records first using the Refresh button in the header.',
      );
    }

    try {
      // Generate a unique batch ID and nonce for this payroll cycle
      const batchId = `${Math.floor(Math.random() * 999_999_999)}`;
      const batchNonce = Math.floor(Math.random() * 10000);

      setTxStatus({
        state: 'building',
        timestamp: Date.now(),
        description: `Building payroll batch for ${employees.length} employees...`,
      });

      // Process each employee sequentially (Leo Wallet handles one TX at a time)
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const bonus = parseInt(bonuses[emp.employee_id_hash] || '0', 10);

        setTxStatus({
          state: 'proving',
          timestamp: Date.now(),
          description: `Processing employee ${i + 1}/${employees.length}... Leo Wallet generating ZK proof`,
        });

        // Build and submit the transaction via Leo Wallet
        const transaction = buildProcessPayrollTransaction(
          publicKey,
          emp._recordPlaintext!,
          bonus,
          batchId,
          batchNonce,
        );

        const txId = await requestTransaction(transaction);

        addTransaction({
          state: 'confirmed',
          timestamp: Date.now(),
          description: `Payroll: employee ${i + 1}/${employees.length}`,
          txId: txId as string,
        });
      }

      setTxStatus({
        state: 'confirmed',
        timestamp: Date.now(),
        description: `Payroll processed: ${employees.length} payments submitted`,
      });

      // Refresh records to pick up new SalaryPayment records
      await refreshRecords();

      setBonuses({});
      setTimeout(
        () => setTxStatus({ state: 'idle', timestamp: Date.now(), description: '' }),
        5000,
      );
    } catch (error) {
      console.error('Payroll processing failed:', error);
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
          {employees.length === 0 && (
            <p className="text-sm text-gray-500">No employees registered. Register employees first.</p>
          )}
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

        <button type="submit" className="ghost-btn w-full"
          disabled={!publicKey || employees.length === 0 ||
            (txStatus.state !== 'idle' && txStatus.state !== 'confirmed')}>
          <Zap className="h-4 w-4" />
          Process Payroll ({employees.length} employees)
        </button>
      </form>
    </GlowCard>
  );
}
