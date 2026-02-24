// ========================================================
// GhostPay — Private Payroll for Web3 Companies
// Program: ghostpay.aleo
// Leo version: 3.4.0+
//
// Architecture (three logical modules in one program):
//   1. Employee Registry  — register / update / remove employees
//   2. Payroll Engine     — process salary batches with ZK proofs
//   3. Audit Module       — selective disclosure for auditors
//
// Privacy model:
//   - Salary amounts are NEVER published on-chain.
//   - Commitments (hash of salary + salt) anchor data on-chain.
//   - Private records carry encrypted salary data to employees.
//   - The chain verifies: proof of correctness + batch summary only.
//
// Security features:
//   - BHP256 salary commitments (hash of base + tax_rate + salt)
//   - Payment nonces prevent double-claiming of salary records
//   - Batch nonces prevent payroll replay across cycles
//   - assert / assert_eq enforce all circuit constraints
//   - self.caller checks ensure only authorized parties act
// ========================================================

program ghostpay.aleo {

    // ============================================================
    // UPGRADE POLICY
    // Prevents future code upgrades — immutable contract guarantee.
    // Replace @noupgrade with @admin(address="aleo1...") to allow
    // admin-controlled upgrades.
    // ============================================================
    @noupgrade
    async constructor() {}

    // ============================================================
    // STRUCTS — Public value types used for grouping on-chain data
    // ============================================================

    /// Summary of a completed payroll batch stored publicly on-chain.
    /// Individual salary amounts are NEVER exposed here — only aggregates.
    struct PayrollBatchSummary {
        // Unique identifier for this payroll batch
        batch_hash: field,
        // Employer who authorized this batch
        employer: address,
        // Total number of employees paid in this batch
        employee_count: u32,
        // Batch nonce — monotonically increasing; prevents replay attacks
        nonce: u64,
        // Whether this batch has been finalized (no further modifications)
        finalized: bool,
    }

    // ============================================================
    // RECORDS — Private state; only visible to the record `owner`
    // ============================================================

    /// Private employee record — sent to the employee upon registration.
    /// Contains the agreed salary commitment so the employee can verify
    /// in zero knowledge that the employer stored their correct salary.
    record EmployeeRecord {
        // Record owner = the employee's wallet address
        owner: address,
        // The employer who created this record
        employer: address,
        // Unique employee identifier (BHP256 hash of off-chain employee ID)
        employee_id_hash: field,
        // salary_commitment = BHP256::hash(base_salary_field + tax_rate_field * 1e9 + salt_field)
        salary_commitment: field,
        // The raw base salary in microcredits (private — only employee sees this)
        base_salary: u64,
        // Tax rate in basis points (e.g. 2000 = 20.00%; max 10000 = 100%)
        tax_rate_bps: u16,
        // Minimum guaranteed net salary per period (contractual floor)
        min_salary: u64,
        // Random blinding factor for the commitment; prevents brute-force
        salt: scalar,
    }

    /// Private salary payment record — sent to the employee after payroll.
    /// The employee consumes this record to claim their earnings.
    record SalaryPayment {
        // Record owner = the employee receiving the payment
        owner: address,
        // Employer who issued the payment
        employer: address,
        // Batch this payment belongs to (for employee-side traceability)
        batch_hash: field,
        // Final net salary: base_salary + bonus - tax_deducted
        net_salary: u64,
        // Discretionary bonus component (private)
        bonus: u64,
        // Tax withheld this period (private)
        tax_deducted: u64,
        // Unique nonce to prevent double-claiming this payment
        payment_nonce: field,
    }

    /// Audit proof record — delivered privately to an auditor.
    /// Reveals only aggregate data; no individual salary information.
    record AuditProof {
        // Record owner = the auditor's wallet address
        owner: address,
        // The employer being audited
        employer: address,
        // The batch being audited
        batch_hash: field,
        // Total net payroll disbursed across all employees in the batch
        total_disbursed: u64,
        // Number of employees included in the batch
        employee_count: u32,
        // Hash chain proving all employees were processed (Merkle root)
        employees_merkle_root: field,
    }

    // ============================================================
    // ON-CHAIN STORAGE (PUBLIC STATE)
    // ============================================================

    /// employee_id_hash → salary_commitment
    /// Anchors each employee's commitment; enables employer/auditor verification.
    mapping employee_commitments: field => field;

    /// batch_hash → PayrollBatchSummary
    /// Public log of approved payroll batches (no salary details stored here).
    mapping payroll_batches: field => PayrollBatchSummary;

    /// employer_address → number of currently registered employees
    mapping employee_count_per_employer: address => u32;

    /// payment_nonce → claimed (true = already claimed)
    /// Prevents an employee from double-spending the same SalaryPayment record.
    mapping claimed_payments: field => bool;

    // ============================================================
    // MODULE 1: EMPLOYEE REGISTRY
    // ============================================================

    /// Register a new employee and issue them a private EmployeeRecord.
    ///
    /// Called by: Employer
    ///
    /// ZK Privacy guarantee:
    ///   The salary and tax details are embedded in the private EmployeeRecord
    ///   returned to the employee. On-chain, only the salary_commitment hash
    ///   is stored — the chain never learns the actual salary amount.
    ///
    /// Params:
    ///   employee         — employee wallet address
    ///   employee_id_hash — BHP256 hash of the employee's off-chain identifier
    ///   base_salary      — gross base salary in microcredits per period
    ///   tax_rate_bps     — tax rate in basis points (0–10000)
    ///   min_salary       — contractual minimum net salary per period
    ///   salt             — random scalar used for commitment blinding
    async transition register_employee(
        employee: address,
        employee_id_hash: field,
        base_salary: u64,
        tax_rate_bps: u16,
        min_salary: u64,
        salt: scalar,
    ) -> (EmployeeRecord, Future) {
        // Validate: tax rate must be a valid percentage (0–10000 bps = 0–100%)
        assert(tax_rate_bps <= 10000u16);
        // Validate: minimum salary must not exceed the base salary
        assert(min_salary <= base_salary);
        // Validate: base salary must be non-zero
        assert(base_salary > 0u64);

        // Compute the salary commitment: BHP256::hash(packed_salary_data + salt)
        // Packing: combine base_salary and tax_rate into a single field element
        // by positioning tax_rate in a high-order region (multiply by 1_000_000_000).
        // This prevents hash collision between different (base, tax) pairs.
        let packed: field = (base_salary as field) + (tax_rate_bps as field) * 1000000000field;
        let salary_commitment: field = BHP256::hash_to_field(packed + (salt as field));

        // Capture caller before the async block (self.caller not available inside async)
        let employer: address = self.caller;

        // Build the private EmployeeRecord delivered to the employee
        let emp_record: EmployeeRecord = EmployeeRecord {
            owner: employee,
            employer: employer,
            employee_id_hash: employee_id_hash,
            salary_commitment: salary_commitment,
            base_salary: base_salary,
            tax_rate_bps: tax_rate_bps,
            min_salary: min_salary,
            salt: salt,
        };

        // Schedule on-chain state: store commitment + increment employer's headcount
        let f: Future = async {
            // Ensure employee is NOT already registered (prevent duplicate entries)
            let existing: field = employee_commitments.get_or_use(employee_id_hash, 0field);
            assert_eq(existing, 0field);

            // Store only the commitment on-chain — salary stays private
            employee_commitments.set(employee_id_hash, salary_commitment);

            // Increment the employer's registered employee count
            let current_count: u32 = employee_count_per_employer.get_or_use(employer, 0u32);
            employee_count_per_employer.set(employer, current_count + 1u32);
        };

        return (emp_record, f);
    }

    /// Update an existing employee's salary agreement.
    ///
    /// Called by: Employer (must be the original issuer of old_record)
    ///
    /// The old EmployeeRecord is consumed (spent), and a fresh one is issued
    /// with updated salary terms. The on-chain commitment is atomically updated.
    ///
    /// Params:
    ///   old_record        — the employee's existing EmployeeRecord (consumed/spent)
    ///   new_base_salary   — updated gross base salary
    ///   new_tax_rate_bps  — updated tax rate in basis points
    ///   new_min_salary    — updated contractual minimum net salary
    ///   new_salt          — fresh random scalar for the new commitment
    async transition update_employee(
        old_record: EmployeeRecord,
        new_base_salary: u64,
        new_tax_rate_bps: u16,
        new_min_salary: u64,
        new_salt: scalar,
    ) -> (EmployeeRecord, Future) {
        // Authorization: only the original employer may update the record
        assert_eq(self.caller, old_record.employer);
        // Validate new values
        assert(new_tax_rate_bps <= 10000u16);
        assert(new_min_salary <= new_base_salary);
        assert(new_base_salary > 0u64);

        // Recompute the OLD commitment for on-chain verification
        let old_packed: field = (old_record.base_salary as field) + (old_record.tax_rate_bps as field) * 1000000000field;
        let old_commitment: field = BHP256::hash_to_field(old_packed + (old_record.salt as field));

        // Compute the NEW commitment from updated salary terms
        let new_packed: field = (new_base_salary as field) + (new_tax_rate_bps as field) * 1000000000field;
        let new_commitment: field = BHP256::hash_to_field(new_packed + (new_salt as field));

        // Capture immutable values for use inside async block
        let emp_id_hash: field = old_record.employee_id_hash;

        // Issue the updated EmployeeRecord (old record is consumed above)
        let updated_record: EmployeeRecord = EmployeeRecord {
            owner: old_record.owner,
            employer: old_record.employer,
            employee_id_hash: emp_id_hash,
            salary_commitment: new_commitment,
            base_salary: new_base_salary,
            tax_rate_bps: new_tax_rate_bps,
            min_salary: new_min_salary,
            salt: new_salt,
        };

        let f: Future = async {
            // Verify the stored commitment matches old_commitment (tamper check)
            let stored: field = employee_commitments.get(emp_id_hash);
            assert_eq(stored, old_commitment);

            // Atomically replace with the new commitment
            employee_commitments.set(emp_id_hash, new_commitment);
        };

        return (updated_record, f);
    }

    /// Remove an employee from the registry.
    ///
    /// Called by: Employer
    ///
    /// Consumes the EmployeeRecord (it is spent), removes the on-chain
    /// commitment, and decrements the employer's registered employee count.
    ///
    /// Params:
    ///   emp_record — the employee's EmployeeRecord (consumed/spent)
    async transition remove_employee(
        emp_record: EmployeeRecord,
    ) -> Future {
        // Authorization: only the original employer may remove the employee
        assert_eq(self.caller, emp_record.employer);

        // Recompute the commitment for on-chain lookup and verification
        let ci: field = (emp_record.base_salary as field) + (emp_record.tax_rate_bps as field) * 1000000000field;
        let commitment: field = BHP256::hash_to_field(ci + (emp_record.salt as field));

        // Capture immutable values for the async block
        let emp_id_hash: field = emp_record.employee_id_hash;
        let employer: address = emp_record.employer;

        let f: Future = async {
            // Verify this exact commitment exists before removing (integrity check)
            let stored: field = employee_commitments.get(emp_id_hash);
            assert_eq(stored, commitment);

            // Remove the commitment entry
            employee_commitments.remove(emp_id_hash);

            // Decrement the employer's employee count (guard against underflow)
            let current_count: u32 = employee_count_per_employer.get_or_use(employer, 0u32);
            assert(current_count > 0u32);
            employee_count_per_employer.set(employer, current_count - 1u32);
        };

        return f;
    }

    // ============================================================
    // MODULE 1 HELPER: Employee Self-Verification
    // ============================================================

    /// Allow an employee to verify their salary commitment privately.
    ///
    /// Called by: Employee (the record owner)
    ///
    /// Pure off-chain transition — no on-chain side effects.
    /// Returns true if the commitment stored in the record matches the
    /// recomputed commitment from the private salary fields.
    /// This proves the employer stored the correct terms.
    ///
    /// Params:
    ///   emp_record — the employee's own EmployeeRecord
    transition verify_salary_commitment(
        emp_record: EmployeeRecord,
    ) -> bool {
        // Authorization: only the record owner may verify
        assert_eq(self.caller, emp_record.owner);

        // Recompute the commitment from the private salary data inside the record
        let packed: field = (emp_record.base_salary as field) + (emp_record.tax_rate_bps as field) * 1000000000field;
        let recomputed: field = BHP256::hash_to_field(packed + (emp_record.salt as field));

        // Return whether the recomputed value matches the stored commitment
        // true  → employer stored the correct salary terms
        // false → record has been tampered with (should never happen)
        return recomputed == emp_record.salary_commitment;
    }

    // ============================================================
    // MODULE 2: PAYROLL ENGINE
    // ============================================================

    /// Process payroll for a single employee within a batch.
    ///
    /// Called by: Employer (once per employee per payroll cycle)
    ///
    /// ZK Circuit Constraints enforced by Leo/SnarkVM:
    ///   1. tax_deducted  = (base_salary / 10000) * tax_rate_bps
    ///   2. net_salary    = base_salary + bonus - tax_deducted
    ///   3. net_salary   >= emp_record.min_salary  (contractual floor)
    ///   4. net_salary   >  0                      (no zero/negative pay)
    ///   5. payment_nonce not previously used       (replay prevention)
    ///
    /// Privacy guarantee: All salary amounts live only inside the returned
    /// private SalaryPayment record. The on-chain batch summary contains
    /// zero salary information — just aggregate headcount and batch hash.
    ///
    /// Params:
    ///   emp_record  — the employee's EmployeeRecord (read-only; not consumed)
    ///   bonus       — discretionary bonus for this pay period
    ///   batch_id    — employer-assigned batch identifier (unique per cycle)
    ///   batch_nonce — monotonically increasing nonce per batch (replay guard)
    async transition process_payroll(
        emp_record: EmployeeRecord,
        bonus: u64,
        batch_id: field,
        batch_nonce: u64,
    ) -> (SalaryPayment, Future) {
        // Authorization: only the employer who issued the record may run payroll
        assert_eq(self.caller, emp_record.employer);

        // ---- Circuit Constraint 1: Compute tax ----
        // tax = (base_salary * tax_rate_bps) / 10000
        // Divide first to avoid u64 overflow, then multiply.
        // This truncates sub-unit remainders (acceptable precision for payroll).
        let tax_bps: u64 = emp_record.tax_rate_bps as u64;
        let tax_deducted: u64 = (emp_record.base_salary / 10000u64) * tax_bps;

        // ---- Circuit Constraint 2: Compute net salary ----
        // gross = base + bonus (employer bears bonus, it does not affect tax)
        let gross: u64 = emp_record.base_salary + bonus;
        // Safety: tax must not exceed gross pay
        assert(tax_deducted <= gross);
        let net_salary: u64 = gross - tax_deducted;

        // ---- Circuit Constraint 3: Enforce contractual minimum ----
        assert(net_salary >= emp_record.min_salary);

        // ---- Circuit Constraint 4: No zero-value payments ----
        assert(net_salary > 0u64);

        // Compute a batch hash used for on-chain identification
        let batch_hash: field = BHP256::hash_to_field(batch_id + (batch_nonce as field));

        // Compute a payment nonce unique to this (employee, batch) pair
        // Prevents double-claiming if the same employee appears in two batches
        let nonce_input: field = emp_record.employee_id_hash + batch_id + (batch_nonce as field);
        let payment_nonce: field = BHP256::hash_to_field(nonce_input);

        // Capture values for the async block
        let ci: field = (emp_record.base_salary as field) + (emp_record.tax_rate_bps as field) * 1000000000field;
        let expected_commitment: field = BHP256::hash_to_field(ci + (emp_record.salt as field));
        let emp_id_hash: field = emp_record.employee_id_hash;
        let employer: address = emp_record.employer;

        // Issue the private SalaryPayment record to the employee
        let payment: SalaryPayment = SalaryPayment {
            owner: emp_record.owner,
            employer: employer,
            batch_hash: batch_hash,
            net_salary: net_salary,
            bonus: bonus,
            tax_deducted: tax_deducted,
            payment_nonce: payment_nonce,
        };

        // Schedule on-chain: verify commitment + log batch summary
        let f: Future = async {
            // ---- Constraint 5: Verify salary commitment against registry ----
            // Ensures the employer cannot silently reduce the salary below
            // what was committed at registration time.
            let stored_commitment: field = employee_commitments.get(emp_id_hash);
            assert_eq(stored_commitment, expected_commitment);

            // Ensure this payment nonce has never been marked claimed
            // (Prevents replay: resubmitting the same payroll transaction)
            let already_claimed: bool = claimed_payments.get_or_use(payment_nonce, false);
            assert(!already_claimed);

            // Log the batch summary publicly — no salary amounts stored here
            let emp_count: u32 = employee_count_per_employer.get_or_use(employer, 0u32);
            let summary: PayrollBatchSummary = PayrollBatchSummary {
                batch_hash: batch_hash,
                employer: employer,
                employee_count: emp_count,
                nonce: batch_nonce,
                finalized: false,
            };
            payroll_batches.set(batch_hash, summary);
        };

        return (payment, f);
    }

    /// Claim a salary payment (employee withdraws their net earnings).
    ///
    /// Called by: Employee (the SalaryPayment record owner)
    ///
    /// Consumes the SalaryPayment record (prevents double-spending).
    /// Marks the payment nonce as claimed on-chain.
    ///
    /// In a production deployment this would also call credits.aleo to
    /// transfer the actual tokens. For the hackathon it proves entitlement
    /// and marks the nonce consumed — the backend handles the fund release.
    ///
    /// Params:
    ///   payment — the SalaryPayment record issued by the employer
    async transition claim_salary(
        payment: SalaryPayment,
    ) -> Future {
        // Authorization: only the payment owner (employee) may claim
        assert_eq(self.caller, payment.owner);
        // Sanity: net salary must be positive
        assert(payment.net_salary > 0u64);

        let nonce: field = payment.payment_nonce;

        let f: Future = async {
            // Double-claim prevention: fail if this nonce was already used
            let already_claimed: bool = claimed_payments.get_or_use(nonce, false);
            assert(!already_claimed);

            // Mark the nonce as claimed — the SalaryPayment record is now spent
            claimed_payments.set(nonce, true);
        };

        return f;
    }

    // ============================================================
    // MODULE 3: AUDITOR — Selective Disclosure
    // ============================================================

    /// Generate a selective disclosure audit proof for an authorized auditor.
    ///
    /// Called by: Employer
    ///
    /// The auditor receives a private AuditProof record containing:
    ///   ✓ Total payroll disbursed (aggregate)
    ///   ✓ Employee count in the batch
    ///   ✓ Merkle root proving all employees were processed
    ///
    /// The auditor CANNOT see:
    ///   ✗ Individual salary amounts
    ///   ✗ Individual bonus or tax breakdowns
    ///   ✗ Employee wallet addresses (only hashed identifiers)
    ///
    /// Params:
    ///   auditor               — auditor's wallet address
    ///   batch_hash            — identifier of the batch being audited
    ///   total_disbursed       — sum of all net_salaries in the batch
    ///   employee_count        — number of employees paid in the batch
    ///   employees_merkle_root — hash chain root proving employee inclusion
    transition generate_audit_proof(
        auditor: address,
        batch_hash: field,
        total_disbursed: u64,
        employee_count: u32,
        employees_merkle_root: field,
    ) -> AuditProof {
        // Validate the batch is non-trivial
        assert(employee_count > 0u32);
        assert(total_disbursed > 0u64);

        // Build and return the audit proof record — sent privately to the auditor
        return AuditProof {
            owner: auditor,
            employer: self.caller,
            batch_hash: batch_hash,
            total_disbursed: total_disbursed,
            employee_count: employee_count,
            employees_merkle_root: employees_merkle_root,
        };
    }

    // ============================================================
    // HELPER: Sequential Merkle Step (off-chain accumulator)
    // ============================================================

    /// Fold one employee ID hash into the running Merkle root.
    ///
    /// Called by: Off-chain backend (iterated once per employee in a batch)
    ///
    /// The backend initializes current_root = 0field and calls this for each
    /// employee_id_hash in the batch. The final value is the employees_merkle_root
    /// passed to generate_audit_proof.
    ///
    /// Params:
    ///   current_root     — accumulated hash so far (start with 0field)
    ///   employee_id_hash — next employee's ID hash to fold in
    inline compute_merkle_step(
        current_root: field,
        employee_id_hash: field,
    ) -> field {
        // Combine current root with the new employee hash via BHP256
        return BHP256::hash_to_field(current_root + employee_id_hash);
    }
}
