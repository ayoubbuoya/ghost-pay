// ========================================================
// GhostPay — Aleo Service Layer (Leo Wallet Integration)
//
// This module provides:
//   1. Transaction builders — create Transaction objects for Leo Wallet
//   2. Record parsers — parse decrypted record plaintexts into TypeScript types
//   3. Mapping readers — read public on-chain state via AleoNetworkClient
//
// All private key operations (signing, proving, decrypting) are delegated
// to the Leo Wallet browser extension via the wallet adapter.
//
// SDK Reference: https://developer.aleo.org/sdk/guides/getting_started
// Wallet Adapter: https://github.com/ProvableHQ/aleo-wallet-adapter
// ========================================================

import {
  Transaction,
  WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

import type {
  EmployeeRecord,
  SalaryPayment,
  AuditProof,
  PayrollBatchSummary,
  RegisterEmployeeInput,
  GenerateAuditInput,
} from "../types/ghostpay";

// ============================================================
// CONSTANTS
// ============================================================

/** Aleo network RPC endpoint for reading public state */
const NETWORK_URL =
  import.meta.env.VITE_ALEO_NETWORK_URL || "https://api.explorer.aleo.org/v1";

/** Deployed program ID on-chain */
const PROGRAM_ID = import.meta.env.VITE_GHOSTPAY_PROGRAM_ID || "ghostpay.aleo";

/** Default transaction fee in microcredits (0.5 Aleo credits) */
const DEFAULT_FEE = 500_000;

// ============================================================
// TRANSACTION BUILDERS
// ============================================================
// These functions create Transaction objects that are passed to
// Leo Wallet's `requestTransaction()`. The wallet handles ZK proof
// generation, signing, and broadcasting to the network.

/**
 * Build a transaction for `register_employee` transition.
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
 * @param publicKey  Connected wallet's public key (employer address)
 * @param input      Registration form data
 * @returns          Transaction object for Leo Wallet
 */
export function buildRegisterEmployeeTransaction(
  publicKey: string,
  input: RegisterEmployeeInput,
): Transaction {
  // Generate a random salt as a scalar for the commitment blinding factor
  const salt = `${Math.floor(Math.random() * 1_000_000_000)}scalar`;

  // Format inputs according to Leo type annotations
  const inputs = [
    input.employeeAddress, // address
    `${input.employeeIdHash}field`, // field
    `${input.baseSalary}u64`, // u64
    `${input.taxRateBps}u16`, // u16
    `${input.minSalary}u64`, // u64
    salt, // scalar
  ];

  return Transaction.createTransaction(
    publicKey,
    WalletAdapterNetwork.TestnetBeta,
    PROGRAM_ID,
    "register_employee",
    inputs,
    DEFAULT_FEE,
  );
}

/**
 * Build a transaction for `process_payroll` transition.
 *
 * Leo signature:
 *   async transition process_payroll(
 *     emp_record: EmployeeRecord,
 *     bonus: u64,
 *     batch_id: field,
 *     batch_nonce: u64,
 *   ) -> (SalaryPayment, Future)
 *
 * @param publicKey       Connected wallet's public key (employer)
 * @param recordPlaintext Employee record plaintext string from Leo Wallet
 * @param bonus           Bonus amount in microcredits
 * @param batchId         Unique batch identifier
 * @param batchNonce      Batch nonce for replay prevention
 * @returns               Transaction object for Leo Wallet
 */
export function buildProcessPayrollTransaction(
  publicKey: string,
  recordPlaintext: string,
  bonus: number,
  batchId: string,
  batchNonce: number,
): Transaction {
  const inputs = [
    recordPlaintext, // EmployeeRecord (private record)
    `${bonus}u64`, // u64
    `${batchId}field`, // field
    `${batchNonce}u64`, // u64
  ];

  return Transaction.createTransaction(
    publicKey,
    WalletAdapterNetwork.TestnetBeta,
    PROGRAM_ID,
    "process_payroll",
    inputs,
    DEFAULT_FEE,
  );
}

/**
 * Build a transaction for `claim_salary` transition.
 *
 * Leo signature:
 *   async transition claim_salary(payment: SalaryPayment) -> Future
 *
 * Called by: Employee (the SalaryPayment record owner)
 *
 * @param publicKey       Connected wallet's public key (employee)
 * @param recordPlaintext SalaryPayment record plaintext string
 * @returns               Transaction object for Leo Wallet
 */
export function buildClaimSalaryTransaction(
  publicKey: string,
  recordPlaintext: string,
): Transaction {
  return Transaction.createTransaction(
    publicKey,
    WalletAdapterNetwork.TestnetBeta,
    PROGRAM_ID,
    "claim_salary",
    [recordPlaintext],
    DEFAULT_FEE,
  );
}

/**
 * Build a transaction for `generate_audit_proof` transition.
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
 * @param publicKey  Connected wallet's public key (employer)
 * @param input      Audit proof generation parameters
 * @returns          Transaction object for Leo Wallet
 */
export function buildGenerateAuditTransaction(
  publicKey: string,
  input: GenerateAuditInput,
): Transaction {
  const inputs = [
    input.auditorAddress, // address
    `${input.batchHash}field`, // field
    `${input.totalDisbursed}u64`, // u64
    `${input.employeeCount}u32`, // u32
    `${input.employeesMerkleRoot}field`, // field
  ];

  return Transaction.createTransaction(
    publicKey,
    WalletAdapterNetwork.TestnetBeta,
    PROGRAM_ID,
    "generate_audit_proof",
    inputs,
    DEFAULT_FEE,
  );
}

// ============================================================
// RECORD PARSERS
// ============================================================
// Parse decrypted record plaintext strings (from Leo Wallet's
// `requestRecords()`) into typed TypeScript objects.
//
// Record plaintext format example:
//   {
//     owner: aleo1abc...xyz.private,
//     employer: aleo1def...uvw.private,
//     employee_id_hash: 123456field.private,
//     salary_commitment: 789012field.private,
//     base_salary: 5000000u64.private,
//     tax_rate_bps: 2000u16.private,
//     min_salary: 3500000u64.private,
//     salt: 42scalar.private,
//     _nonce: 0group.public,
//   }

/**
 * Extract a field value from a record plaintext string.
 * Handles Aleo's type suffixes (u64, u32, u16, field, scalar, address, etc.)
 * and visibility suffixes (.private, .public).
 */
function extractField(plaintext: string, fieldName: string): string | null {
  // Match patterns like: fieldName: value.visibility
  const regex = new RegExp(`${fieldName}:\\s*([^,}]+)`);
  const match = plaintext.match(regex);
  if (!match) return null;
  // Remove trailing .private/.public and whitespace
  return match[1]
    .trim()
    .replace(/\.(private|public)$/, "")
    .trim();
}

/**
 * Parse a numeric value from a record field, stripping Aleo type suffixes.
 * e.g., "5000000u64" -> 5000000
 */
function parseNumeric(value: string): number {
  return parseInt(value.replace(/[a-z]+$/i, ""), 10);
}

/**
 * Determine the record type from its plaintext structure.
 * Uses field presence heuristics since Aleo records don't have explicit type tags.
 */
export function identifyRecordType(
  plaintext: string,
): "EmployeeRecord" | "SalaryPayment" | "AuditProof" | "unknown" {
  if (
    plaintext.includes("salary_commitment") &&
    plaintext.includes("base_salary")
  ) {
    return "EmployeeRecord";
  }
  if (plaintext.includes("net_salary") && plaintext.includes("payment_nonce")) {
    return "SalaryPayment";
  }
  if (
    plaintext.includes("total_disbursed") &&
    plaintext.includes("employees_merkle_root")
  ) {
    return "AuditProof";
  }
  return "unknown";
}

/**
 * Parse a decrypted EmployeeRecord plaintext into a TypeScript object.
 */
export function parseEmployeeRecord(plaintext: string): EmployeeRecord | null {
  try {
    return {
      owner: extractField(plaintext, "owner") || "",
      employer: extractField(plaintext, "employer") || "",
      employee_id_hash: extractField(plaintext, "employee_id_hash") || "",
      salary_commitment: extractField(plaintext, "salary_commitment") || "",
      base_salary: parseNumeric(extractField(plaintext, "base_salary") || "0"),
      tax_rate_bps: parseNumeric(
        extractField(plaintext, "tax_rate_bps") || "0",
      ),
      min_salary: parseNumeric(extractField(plaintext, "min_salary") || "0"),
      salt: extractField(plaintext, "salt") || "",
      _recordPlaintext: plaintext,
    };
  } catch (error) {
    console.error("Failed to parse EmployeeRecord:", error);
    return null;
  }
}

/**
 * Parse a decrypted SalaryPayment plaintext into a TypeScript object.
 */
export function parseSalaryPayment(plaintext: string): SalaryPayment | null {
  try {
    return {
      owner: extractField(plaintext, "owner") || "",
      employer: extractField(plaintext, "employer") || "",
      batch_hash: extractField(plaintext, "batch_hash") || "",
      net_salary: parseNumeric(extractField(plaintext, "net_salary") || "0"),
      bonus: parseNumeric(extractField(plaintext, "bonus") || "0"),
      tax_deducted: parseNumeric(
        extractField(plaintext, "tax_deducted") || "0",
      ),
      payment_nonce: extractField(plaintext, "payment_nonce") || "",
      _recordPlaintext: plaintext,
    };
  } catch (error) {
    console.error("Failed to parse SalaryPayment:", error);
    return null;
  }
}

/**
 * Parse a decrypted AuditProof plaintext into a TypeScript object.
 */
export function parseAuditProof(plaintext: string): AuditProof | null {
  try {
    return {
      owner: extractField(plaintext, "owner") || "",
      employer: extractField(plaintext, "employer") || "",
      batch_hash: extractField(plaintext, "batch_hash") || "",
      total_disbursed: parseNumeric(
        extractField(plaintext, "total_disbursed") || "0",
      ),
      employee_count: parseNumeric(
        extractField(plaintext, "employee_count") || "0",
      ),
      employees_merkle_root:
        extractField(plaintext, "employees_merkle_root") || "",
      _recordPlaintext: plaintext,
    };
  } catch (error) {
    console.error("Failed to parse AuditProof:", error);
    return null;
  }
}

/**
 * Parse all records returned by Leo Wallet's `requestRecords()`.
 * Categorizes them by type and returns typed arrays.
 */
export function parseAllRecords(records: Array<{ plaintext: string }>): {
  employees: EmployeeRecord[];
  payments: SalaryPayment[];
  auditProofs: AuditProof[];
} {
  const employees: EmployeeRecord[] = [];
  const payments: SalaryPayment[] = [];
  const auditProofs: AuditProof[] = [];

  for (const record of records) {
    const text = record.plaintext;
    const type = identifyRecordType(text);

    switch (type) {
      case "EmployeeRecord": {
        const parsed = parseEmployeeRecord(text);
        if (parsed) employees.push(parsed);
        break;
      }
      case "SalaryPayment": {
        const parsed = parseSalaryPayment(text);
        if (parsed) payments.push(parsed);
        break;
      }
      case "AuditProof": {
        const parsed = parseAuditProof(text);
        if (parsed) auditProofs.push(parsed);
        break;
      }
      default:
        console.warn("Unknown record type:", text.slice(0, 100));
    }
  }

  return { employees, payments, auditProofs };
}

// ============================================================
// PUBLIC STATE — Mapping Reads
// ============================================================
// These functions read public on-chain mappings directly via
// the Aleo network API. No wallet connection required.

/** Lazy-loaded Aleo SDK for network client operations */
let sdkModule: typeof import("@provablehq/sdk") | null = null;

/**
 * Get or initialize the Aleo SDK for network client operations.
 * Only used for reading public mappings — not for signing/proving.
 */
async function getSDK(): Promise<typeof import("@provablehq/sdk")> {
  if (sdkModule) return sdkModule;

  sdkModule = await import("@provablehq/sdk");
  if ("initThreadPool" in sdkModule) {
    await sdkModule.initThreadPool();
  }
  return sdkModule;
}

/**
 * Read an employee's salary commitment from the public mapping.
 *
 * On-chain mapping: employee_id_hash (field) => salary_commitment (field)
 * Public data — reveals only that a commitment exists, not the salary.
 */
export async function getEmployeeCommitment(
  employeeIdHash: string,
): Promise<string | null> {
  try {
    const sdk = await getSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      "employee_commitments",
      `${employeeIdHash}field`,
    );
    return value;
  } catch {
    return null;
  }
}

/**
 * Read a payroll batch summary from the public mapping.
 *
 * On-chain mapping: batch_hash (field) => PayrollBatchSummary
 * Public data — contains NO salary information.
 */
export async function getPayrollBatch(
  batchHash: string,
): Promise<PayrollBatchSummary | null> {
  try {
    const sdk = await getSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      "payroll_batches",
      `${batchHash}field`,
    );
    if (!value) return null;
    return JSON.parse(value) as PayrollBatchSummary;
  } catch {
    return null;
  }
}

/**
 * Read the employer's registered employee count from the public mapping.
 *
 * On-chain mapping: employer_address => u32 count
 * Public data — reveals only headcount, not identities or salaries.
 */
export async function getEmployeeCount(
  employerAddress: string,
): Promise<number> {
  try {
    const sdk = await getSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      "employee_count_per_employer",
      employerAddress,
    );
    if (!value) return 0;
    return parseInt(value.replace("u32", ""), 10);
  } catch {
    return 0;
  }
}

/**
 * Check whether a payment nonce has been claimed from the public mapping.
 *
 * On-chain mapping: payment_nonce (field) => bool
 * Public data — reveals only whether a payment was claimed, not the amount.
 */
export async function isPaymentClaimed(paymentNonce: string): Promise<boolean> {
  try {
    const sdk = await getSDK();
    const networkClient = new sdk.AleoNetworkClient(NETWORK_URL);
    const value = await networkClient.getProgramMappingValue(
      PROGRAM_ID,
      "claimed_payments",
      `${paymentNonce}field`,
    );
    return value === "true";
  } catch {
    return false;
  }
}

// ============================================================
// EXPORTS — Program ID for components that need it
// ============================================================

export { PROGRAM_ID, NETWORK_URL };
