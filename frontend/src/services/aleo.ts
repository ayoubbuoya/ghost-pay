// ========================================================
// GhostPay — Aleo SDK Service Layer
//
// This module wraps all interactions with the Aleo blockchain
// via the @provablehq/sdk. It handles:
//   - Account management (key generation, import)
//   - Program execution (building & submitting transactions)
//   - Mapping reads (public on-chain state)
//   - Record management (private state decryption)
//
// SDK Reference: https://developer.aleo.org/sdk/guides/getting_started
//
// ARCHITECTURE NOTE:
//   The ProgramManager handles ZK proof generation client-side via
//   WebAssembly compiled from snarkVM. All private data stays in the
//   browser — only encrypted proofs are sent to the network.
// ========================================================

import type {
  EmployeeRecord,
  SalaryPayment,
  AuditProof,
  PayrollBatchSummary,
  TransactionStatus,
  RegisterEmployeeInput,
  ProcessPayrollInput,
  GenerateAuditInput,
} from '../types/ghostpay';

// ============================================================
// CONSTANTS
// ============================================================

const NETWORK_URL = import.meta.env.VITE_ALEO_NETWORK_URL || 'https://api.explorer.provable.com/v1';
const PROGRAM_ID = import.meta.env.VITE_GHOSTPAY_PROGRAM_ID || 'ghostpay.aleo';

// ============================================================
// Aleo SDK Dynamic Import
// ============================================================

/**
 * Lazily load the Aleo SDK. The SDK ships heavy WASM modules that should
 * only be loaded when needed. We import from the testnet entry point
 * per the official docs (https://developer.aleo.org/sdk/guides/getting_started).
 *
 * For mainnet, change the import to '@provablehq/sdk/mainnet.js'.
 */
let sdkModule: typeof import('@provablehq/sdk') | null = null;
let sdkInitialized = false;

export async function initializeAleoSDK(): Promise<typeof import('@provablehq/sdk')> {
  if (sdkModule && sdkInitialized) return sdkModule;

  try {
    // Dynamic import — network-specific entry point per Aleo docs
    sdkModule = await import('@provablehq/sdk');

    // Initialize the multi-threaded WASM pool for performant ZK proof generation.
    // Must be called once before any other SDK operations.
    // See: https://developer.aleo.org/sdk/guides/getting_started#webassembly-initialization
    if ('initThreadPool' in sdkModule) {
      await sdkModule.initThreadPool();
    }

    sdkInitialized = true;
    return sdkModule;
  } catch (error) {
    console.warn('Aleo SDK initialization failed — running in demo mode.', error);
    throw error;
  }
}

// ============================================================
// ACCOUNT MANAGEMENT
// ============================================================

/**
 * Generate a new Aleo account (private key, view key, address).
 *
 * In production, the private key should be stored securely (e.g., in
 * the Leo Wallet browser extension). For this demo, we generate
 * ephemeral accounts.
 */
export async function createAccount(): Promise<{
  privateKey: string;
  viewKey: string;
  address: string;
}> {
  const sdk = await initializeAleoSDK();
  const account = new sdk.Account();
  return {
    privateKey: account.privateKey().to_string(),
    viewKey: account.viewKey().to_string(),
    address: account.address().to_string(),
  };
}

/**
 * Import an existing Aleo account from a private key string.
 */
export async function importAccount(privateKey: string): Promise<{
  privateKey: string;
  viewKey: string;
  address: string;
}> {
  const sdk = await initializeAleoSDK();
  const account = new sdk.Account({ privateKey });
  return {
    privateKey: account.privateKey().to_string(),
    viewKey: account.viewKey().to_string(),
    address: account.address().to_string(),
  };
}

// ============================================================
// PROGRAM EXECUTION — Employer Transitions
// ============================================================

/**
 * Execute `register_employee` transition on ghostpay.aleo.
 *
 * Leo signature:
 *   async transition register_employee(
 *     employee: address,
 *     employee_id_hash: field,
 *     base_salary: u64,
 *     tax_rate_bps: u16,
 *     min_salary: u64,
 *     salt: scalar,
 *   ) -> (EmployeeRecord, Future)
 *
 * Privacy: The salary data is embedded in the private EmployeeRecord
 * returned to the employee. On-chain, only the salary_commitment hash
 * is stored — the chain never learns the actual salary amount.
 *
 * @param privateKey  Employer's private key (the caller / self.caller)
 * @param input       Registration form data
 * @returns           Transaction ID on success
 */
export async function executeRegisterEmployee(
  privateKey: string,
  input: RegisterEmployeeInput,
): Promise<string> {
  const sdk = await initializeAleoSDK();
  const account = new sdk.Account({ privateKey });
  const keyProvider = new sdk.AleoKeyProvider();
  keyProvider.useCache(true);

  const programManager = new sdk.ProgramManager(NETWORK_URL, keyProvider);
  programManager.setAccount(account);

  // Generate a random salt as a scalar for the commitment blinding factor
  const salt = `${Math.floor(Math.random() * 1000000)}scalar`;

  // Format inputs according to Leo type annotations:
  //   address, field, u64, u16, u64, scalar
  const inputs = [
    input.employeeAddress,
    `${input.employeeIdHash}field`,
    `${input.baseSalary}u64`,
    `${input.taxRateBps}u16`,
    `${input.minSalary}u64`,
    salt,
  ];

  const txId = await programManager.execute({
    programName: PROGRAM_ID,
    functionName: 'register_employee',
    inputs,
    priorityFee: 0.01,
    privateFee: false,
  });

  return txId;
}

/**
 * Execute `process_payroll` transition on ghostpay.aleo.
 *
 * Leo signature:
 *   async transition process_payroll(
 *     emp_record: EmployeeRecord,
 *     bonus: u64,
 *     batch_id: field,
 *     batch_nonce: u64,
 *   ) -> (SalaryPayment, Future)
 *
 * ZK Circuit Constraints enforced:
 *   1. tax = (base / 10000) * tax_rate_bps
 *   2. net = base + bonus - tax
 *   3. net >= min_salary (contractual floor)
 *   4. net > 0
 *   5. payment_nonce not previously used
 *
 * Privacy: All salary amounts live only inside the returned private
 * SalaryPayment record. The on-chain batch summary has zero salary info.
 */
export async function executeProcessPayroll(
  privateKey: string,
  employeeRecord: string,  // Plaintext record string
  bonus: number,
  batchId: string,
  batchNonce: number,
): Promise<string> {
  const sdk = await initializeAleoSDK();
  const account = new sdk.Account({ privateKey });
  const keyProvider = new sdk.AleoKeyProvider();
  keyProvider.useCache(true);

  const programManager = new sdk.ProgramManager(NETWORK_URL, keyProvider);
  programManager.setAccount(account);

  const inputs = [
    employeeRecord,
    `${bonus}u64`,
    `${batchId}field`,
    `${batchNonce}u64`,
  ];

  const txId = await programManager.execute({
    programName: PROGRAM_ID,
    functionName: 'process_payroll',
    inputs,
    priorityFee: 0.01,
    privateFee: false,
  });

  return txId;
}

/**
 * Execute `claim_salary` transition on ghostpay.aleo.
 *
 * Leo signature:
 *   async transition claim_salary(payment: SalaryPayment) -> Future
 *
 * Called by: Employee (the SalaryPayment record owner)
 * Effect: Consumes the SalaryPayment record (double-spend prevention).
 *         Marks the payment_nonce as claimed on-chain.
 *
 * In production, this would also trigger a credits.aleo transfer.
 * For the hackathon, it proves entitlement and marks the nonce consumed.
 */
export async function executeClaimSalary(
  privateKey: string,
  paymentRecord: string,  // Plaintext SalaryPayment record string
): Promise<string> {
  const sdk = await initializeAleoSDK();
  const account = new sdk.Account({ privateKey });
  const keyProvider = new sdk.AleoKeyProvider();
  keyProvider.useCache(true);

  const programManager = new sdk.ProgramManager(NETWORK_URL, keyProvider);
  programManager.setAccount(account);

  const txId = await programManager.execute({
    programName: PROGRAM_ID,
    functionName: 'claim_salary',
    inputs: [paymentRecord],
    priorityFee: 0.01,
    privateFee: false,
  });

  return txId;
}

/**
 * Execute `generate_audit_proof` transition on ghostpay.aleo.
 *
 * Leo signature:
 *   transition generate_audit_proof(
 *     auditor: address,
 *     batch_hash: field,
 *     total_disbursed: u64,
 *     employee_count: u32,
 *     employees_merkle_root: field,
 *   ) -> AuditProof
 *
 * Called by: Employer
 * Output: Private AuditProof delivered to the auditor
 *
 * The auditor receives:  ✓ total disbursed, ✓ employee count, ✓ merkle root
 * The auditor CANNOT see: ✗ individual salaries, ✗ bonuses, ✗ tax breakdowns
 */
export async function executeGenerateAuditProof(
  privateKey: string,
  input: GenerateAuditInput,
): Promise<string> {
  const sdk = await initializeAleoSDK();
  const account = new sdk.Account({ privateKey });
  const keyProvider = new sdk.AleoKeyProvider();
  keyProvider.useCache(true);

  const programManager = new sdk.ProgramManager(NETWORK_URL, keyProvider);
  programManager.setAccount(account);

  const inputs = [
    input.auditorAddress,
    `${input.batchHash}field`,
    `${input.totalDisbursed}u64`,
    `${input.employeeCount}u32`,
    `${input.employeesMerkleRoot}field`,
  ];

  const txId = await programManager.execute({
    programName: PROGRAM_ID,
    functionName: 'generate_audit_proof',
    inputs,
    priorityFee: 0.01,
    privateFee: false,
  });

  return txId;
}


// ============================================================
// PUBLIC STATE — Mapping Reads
// ============================================================

/**
 * Read a value from the `employee_commitments` mapping.
 *
 * On-chain mapping: employee_id_hash (field) => salary_commitment (field)
 *
 * This data is PUBLIC — anyone can see that an employee commitment exists,
 * but the commitment itself reveals nothing about the actual salary.
 * It's a BHP256 hash with a random salt, making it computationally
 * infeasible to reverse-engineer the salary.
 */
export async function getEmployeeCommitment(employeeIdHash: string): Promise<string | null> {
  try {
    const sdk = await initializeAleoSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      'employee_commitments',
      `${employeeIdHash}field`,
    );
    return value;
  } catch {
    return null;
  }
}

/**
 * Read a value from the `payroll_batches` mapping.
 *
 * On-chain mapping: batch_hash (field) => PayrollBatchSummary
 *
 * This is PUBLIC data — the batch summary intentionally contains NO
 * salary information. Only batch metadata: hash, employer, headcount,
 * nonce, and finalization status.
 */
export async function getPayrollBatch(batchHash: string): Promise<PayrollBatchSummary | null> {
  try {
    const sdk = await initializeAleoSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      'payroll_batches',
      `${batchHash}field`,
    );
    if (!value) return null;
    // Parse the struct from on-chain format
    return JSON.parse(value) as PayrollBatchSummary;
  } catch {
    return null;
  }
}

/**
 * Read the employer's registered employee count.
 *
 * On-chain mapping: employer_address => u32 count
 * PUBLIC data — reveals only headcount, not identities or salaries.
 */
export async function getEmployeeCount(employerAddress: string): Promise<number> {
  try {
    const sdk = await initializeAleoSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      'employee_count_per_employer',
      employerAddress,
    );
    if (!value) return 0;
    return parseInt(value.replace('u32', ''), 10);
  } catch {
    return 0;
  }
}

/**
 * Check whether a payment nonce has been claimed.
 *
 * On-chain mapping: payment_nonce (field) => bool
 * PUBLIC data — reveals only whether a specific payment was claimed,
 * not the amount or recipient.
 */
export async function isPaymentClaimed(paymentNonce: string): Promise<boolean> {
  try {
    const sdk = await initializeAleoSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      'claimed_payments',
      `${paymentNonce}field`,
    );
    return value === 'true';
  } catch {
    return false;
  }
}

// ============================================================
// DEMO DATA — For hackathon demonstration purposes
// ============================================================

/**
 * Generate demo data simulating a full payroll cycle.
 * This allows the frontend to be demonstrated without requiring
 * a deployed contract or real Aleo credits.
 *
 * In production, all this data would come from on-chain state
 * and decrypted private records.
 */
export function generateDemoData() {
  const employer = 'aleo1employer0000000000000000000000000000000000000000000000000';
  const employees: EmployeeRecord[] = [
    {
      owner: 'aleo1alice00000000000000000000000000000000000000000000000000000',
      employer,
      employee_id_hash: '1234567890field',
      salary_commitment: '9876543210field',
      base_salary: 5000000,     // 5M microcredits
      tax_rate_bps: 2000,       // 20%
      min_salary: 3500000,      // 3.5M microcredits
      salt: '42scalar',
    },
    {
      owner: 'aleo1bob0000000000000000000000000000000000000000000000000000000',
      employer,
      employee_id_hash: '2345678901field',
      salary_commitment: '8765432109field',
      base_salary: 7500000,     // 7.5M microcredits
      tax_rate_bps: 2500,       // 25%
      min_salary: 5000000,      // 5M microcredits
      salt: '99scalar',
    },
    {
      owner: 'aleo1carol000000000000000000000000000000000000000000000000000000',
      employer,
      employee_id_hash: '3456789012field',
      salary_commitment: '7654321098field',
      base_salary: 6000000,     // 6M microcredits
      tax_rate_bps: 1800,       // 18%
      min_salary: 4200000,      // 4.2M microcredits
      salt: '77scalar',
    },
  ];

  // Compute salary payments following the contract's formula:
  //   tax = (base / 10000) * tax_rate_bps
  //   net = base + bonus - tax
  const payments: SalaryPayment[] = employees.map((emp, i) => {
    const bonus = [500000, 750000, 300000][i];
    const tax = Math.floor(emp.base_salary / 10000) * emp.tax_rate_bps;
    const net = emp.base_salary + bonus - tax;
    return {
      owner: emp.owner,
      employer: emp.employer,
      batch_hash: '1000field',
      net_salary: net,
      bonus,
      tax_deducted: tax,
      payment_nonce: `${i + 100}field`,
    };
  });

  const batchSummary: PayrollBatchSummary = {
    batch_hash: '1000field',
    employer,
    employee_count: employees.length,
    nonce: 1,
    finalized: false,
  };

  const auditProof: AuditProof = {
    owner: 'aleo1auditor0000000000000000000000000000000000000000000000000000',
    employer,
    batch_hash: '1000field',
    total_disbursed: payments.reduce((sum, p) => sum + p.net_salary, 0),
    employee_count: employees.length,
    employees_merkle_root: '5555555555field',
  };

  return { employer, employees, payments, batchSummary, auditProof };
}