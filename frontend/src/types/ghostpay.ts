// ========================================================
// GhostPay TypeScript Types
//
// These types mirror the Leo smart contract records, structs,
// and mappings defined in ghostpay.aleo (contracts/ghostpay/src/main.leo).
//
// PRIVACY MODEL:
//   - Records (EmployeeRecord, SalaryPayment, AuditProof) are PRIVATE.
//     Only the record `owner` can decrypt and view their contents.
//   - Structs (PayrollBatchSummary) are PUBLIC on-chain data.
//   - Mappings store public key→value pairs on-chain.
// ========================================================

/** Represents the active user role in the application */
export type UserRole = 'employer' | 'employee' | 'auditor';

/**
 * Private employee record — mirrors `record EmployeeRecord` in Leo.
 *
 * Created by: `register_employee` transition (called by Employer)
 * Visible to: Only the employee (record owner)
 *
 * Contains the salary commitment and raw salary terms.
 * The commitment (hash) is stored on-chain; the salary details are private.
 */
export interface EmployeeRecord {
  owner: string;              // Employee wallet address
  employer: string;           // Employer who created this record
  employee_id_hash: string;   // BHP256 hash of off-chain employee identifier (field)
  salary_commitment: string;  // BHP256::hash(packed_salary + salt) — anchored on-chain (field)
  base_salary: number;        // Gross base salary in microcredits (u64)
  tax_rate_bps: number;       // Tax rate in basis points, e.g. 2000 = 20% (u16, max 10000)
  min_salary: number;         // Contractual minimum net salary per period (u64)
  salt: string;               // Random blinding factor for commitment (scalar)
}

/**
 * Private salary payment record — mirrors `record SalaryPayment` in Leo.
 *
 * Created by: `process_payroll` transition (called by Employer)
 * Visible to: Only the employee (record owner)
 * Consumed by: `claim_salary` transition (called by Employee)
 *
 * Contains the computed net salary breakdown. The payment_nonce prevents
 * double-claiming — once claimed, the nonce is marked on-chain.
 */
export interface SalaryPayment {
  owner: string;           // Employee wallet address
  employer: string;        // Employer who issued the payment
  batch_hash: string;      // Batch this payment belongs to (field)
  net_salary: number;      // Final net: base + bonus - tax (u64)
  bonus: number;           // Discretionary bonus component (u64)
  tax_deducted: number;    // Tax withheld this period (u64)
  payment_nonce: string;   // Unique per (employee, batch) — prevents double-claim (field)
}

/**
 * Private audit proof record — mirrors `record AuditProof` in Leo.
 *
 * Created by: `generate_audit_proof` transition (called by Employer)
 * Visible to: Only the auditor (record owner)
 *
 * Reveals ONLY aggregates — the auditor CANNOT see individual salaries,
 * bonuses, tax breakdowns, or employee wallet addresses.
 */
export interface AuditProof {
  owner: string;                  // Auditor wallet address
  employer: string;               // Employer being audited
  batch_hash: string;             // Batch being audited (field)
  total_disbursed: number;        // Sum of all net salaries in the batch (u64)
  employee_count: number;         // Number of employees paid (u32)
  employees_merkle_root: string;  // Hash chain root proving employee inclusion (field)
}

/**
 * Public batch summary — mirrors `struct PayrollBatchSummary` in Leo.
 *
 * Stored on-chain in the `payroll_batches` mapping.
 * Contains NO salary information — only metadata.
 * Anyone on the Aleo network can read this.
 */
export interface PayrollBatchSummary {
  batch_hash: string;      // Unique batch identifier (field)
  employer: string;        // Employer who authorized (address)
  employee_count: number;  // Headcount at batch time (u32)
  nonce: number;           // Replay-prevention nonce (u64)
  finalized: boolean;      // Whether the batch is closed
}

// ========================================================
// Transaction & UI State Types
// ========================================================

/** Transaction lifecycle states shown in the UI */
export type TransactionState = 'idle' | 'building' | 'proving' | 'broadcasting' | 'confirmed' | 'failed';

/** Wraps a pending or completed transaction for UI display */
export interface TransactionStatus {
  state: TransactionState;
  txId?: string;
  error?: string;
  timestamp: number;
  description: string;
}

/** Wallet connection state */
export interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  network: 'testnet' | 'mainnet';
}

/** Form data for registering a new employee */
export interface RegisterEmployeeInput {
  employeeAddress: string;
  employeeIdHash: string;
  baseSalary: number;
  taxRateBps: number;
  minSalary: number;
}

/** Form data for processing payroll for one employee */
export interface ProcessPayrollInput {
  employeeRecordIndex: number;
  bonus: number;
  batchId: string;
  batchNonce: number;
}

/** Form data for generating an audit proof */
export interface GenerateAuditInput {
  auditorAddress: string;
  batchHash: string;
  totalDisbursed: number;
  employeeCount: number;
  employeesMerkleRoot: string;
}

/**
 * Privacy visibility indicator — used by PrivacyBadge component
 * to show users what data is public vs. private.
 */
export type PrivacyLevel = 'private' | 'public' | 'selective';

