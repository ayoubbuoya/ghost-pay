// ========================================================
// GhostPay — Unit & Integration Tests
// File: tests/test_ghostpay.leo
// Program: test_ghostpay.aleo
//
// Runs via: leo test
//
// Covers the entire payroll lifecycle:
//   1. Register employees with salary commitments
//   2. Verify salary commitments (employee side)
//   3. Process payroll with ZK salary constraints
//   4. Claim salary payments
//   5. Generate audit proofs with selective disclosure
//   6. Update and remove employees
//   7. Edge cases and expected failures
//
// Leo test framework:
//   @test       — marks a test function
//   @should_fail— test expected to revert
//   script      — can await Futures and read/write mappings
//   transition  — off-chain only (no mapping access)
// ========================================================

import ghostpay.aleo;

program test_ghostpay.aleo {

    // Constructor required since ConsensusVersion V9
    @noupgrade
    async constructor() {}

    // ============================================================
    // TEST ADDRESSES
    // ============================================================
    const EMPLOYEE_1: address = aleo13ssze66adjjkt795z9u5wpq8h6kn0y2657726h4h3e3wfnez4vqsm3008q;
    const EMPLOYEE_2: address = aleo17vy26rpdhqx4598y5gp7nvaa9rk7tnvl6ufhvvf4calsrrqdaqyshdsf5z;
    const AUDITOR: address = aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px;

    // Local inline helper replicating ghostpay's compute_merkle_step
    // (inline functions cannot be called externally across programs)
    inline merkle_step(root: field, emp_hash: field) -> field {
        return BHP256::hash_to_field(root + emp_hash);
    }

    // ============================================================
    // TEST 1: Register Employee
    // Registers an employee and verifies on-chain commitment.
    // ============================================================
    @test
    script test_register_emp() {
        let emp_id: field = BHP256::hash_to_field(1field);
        let base: u64 = 5000000u64;
        let tax: u16 = 2000u16;
        let min_sal: u64 = 3500000u64;
        let salt: scalar = 42scalar;

        // Register employee
        let (rec, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, base, tax, min_sal, salt);
        f.await();

        // Assert record fields
        assert_eq(rec.owner, EMPLOYEE_1);
        assert_eq(rec.base_salary, 5000000u64);
        assert_eq(rec.tax_rate_bps, 2000u16);
        assert_eq(rec.min_salary, 3500000u64);

        // Assert on-chain commitment was stored
        let packed: field = (base as field) + (tax as field) * 1000000000field;
        let expected: field = BHP256::hash_to_field(packed + (salt as field));
        let stored: field = Mapping::get(ghostpay.aleo/employee_commitments, emp_id);
        assert_eq(stored, expected);

        // Assert employee count incremented
        let count: u32 = Mapping::get(ghostpay.aleo/employee_count_per_employer, self.signer);
        assert_eq(count, 1u32);
    }

    // ============================================================
    // TEST 2: Duplicate Registration Fails
    // Same employee_id_hash twice must revert.
    // ============================================================
    @test
    @should_fail
    script test_dup_register_fails() {
        let emp_id: field = BHP256::hash_to_field(99field);

        // First registration — OK
        let (r1, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 2000u16, 3500000u64, 1scalar);
        f1.await();

        // Second with same ID — FAIL
        let (r2, f2): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_2, emp_id, 6000000u64, 1500u16, 4000000u64, 2scalar);
        f2.await();
    }

    // ============================================================
    // TEST 3: Invalid Tax Rate Fails
    // tax_rate_bps > 10000 must be rejected.
    // ============================================================
    @test
    @should_fail
    script test_bad_tax_fails() {
        let (r, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(
                EMPLOYEE_1, BHP256::hash_to_field(2field),
                5000000u64, 15000u16, 3500000u64, 1scalar,
            );
        f.await();
    }

    // ============================================================
    // TEST 4: Min > Base Salary Fails
    // min_salary > base_salary violates the invariant.
    // ============================================================
    @test
    @should_fail
    script test_min_gt_base_fails() {
        let (r, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(
                EMPLOYEE_1, BHP256::hash_to_field(3field),
                3000000u64, 2000u16, 5000000u64, 1scalar,
            );
        f.await();
    }

    // ============================================================
    // TEST 5: Zero Base Salary Fails
    // ============================================================
    @test
    @should_fail
    script test_zero_base_fails() {
        let (r, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(
                EMPLOYEE_1, BHP256::hash_to_field(4field),
                0u64, 2000u16, 0u64, 1scalar,
            );
        f.await();
    }

    // ============================================================
    // TEST 6: Verify Salary Commitment
    // Employee side: commitment matches recomputed value.
    // ============================================================
    @test
    script test_verify_commitment() {
        let emp_id: field = BHP256::hash_to_field(5field);

        let (rec, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 6000000u64, 1800u16, 4000000u64, 77scalar);
        f.await();

        // Employee verifies — should return true
        let valid: bool = ghostpay.aleo/verify_salary_commitment(rec);
        assert(valid);
    }

    // ============================================================
    // TEST 7: Process Payroll
    // Register → Process → Verify salary computation.
    // ============================================================
    @test
    script test_process_payroll() {
        let emp_id: field = BHP256::hash_to_field(6field);
        let base: u64 = 5000000u64;
        let tax: u16 = 2000u16;     // 20%
        let salt: scalar = 42scalar;
        let bonus: u64 = 500000u64;

        // Register
        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, base, tax, 3500000u64, salt);
        f1.await();

        // Process payroll
        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, bonus, 100field, 1u64);
        f2.await();

        // Expected: tax = (5000000/10000) * 2000 = 1,000,000
        //           net = 5000000 + 500000 - 1000000 = 4,500,000
        assert_eq(pay.net_salary, 4500000u64);
        assert_eq(pay.bonus, 500000u64);
        assert_eq(pay.tax_deducted, 1000000u64);
        assert_eq(pay.owner, EMPLOYEE_1);
    }

    // ============================================================
    // TEST 8: Claim Salary
    // Register → Process → Claim → Verify nonce is marked.
    // ============================================================
    @test
    script test_claim_salary() {
        let emp_id: field = BHP256::hash_to_field(7field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 500000u64, 200field, 1u64);
        f2.await();

        let f3: Future = ghostpay.aleo/claim_salary(pay);
        f3.await();

        // Verify nonce is claimed
        let claimed: bool = Mapping::get(ghostpay.aleo/claimed_payments, pay.payment_nonce);
        assert(claimed);
    }

    // ============================================================
    // TEST 9: Double Claim Fails
    // ============================================================
    @test
    @should_fail
    script test_double_claim_fails() {
        let emp_id: field = BHP256::hash_to_field(8field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 500000u64, 300field, 1u64);
        f2.await();

        // Manually mark nonce as claimed (simulating first claim)
        Mapping::set(ghostpay.aleo/claimed_payments, pay.payment_nonce, true);

        // Second claim — should FAIL
        let f3: Future = ghostpay.aleo/claim_salary(pay);
        f3.await();
    }

    // ============================================================
    // TEST 10: Payroll Below Minimum Fails
    // net_salary < min_salary must revert.
    // ============================================================
    @test
    @should_fail
    script test_below_min_fails() {
        let emp_id: field = BHP256::hash_to_field(9field);

        // base=1M, tax=90%, min=500K → net=100K < 500K
        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 1000000u64, 9000u16, 500000u64, 42scalar);
        f1.await();

        let (p, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 0u64, 400field, 1u64);
        f2.await();
    }

    // ============================================================
    // TEST 11: Update Employee
    // Updates salary and verifies new commitment on-chain.
    // ============================================================
    @test
    script test_update_employee() {
        let emp_id: field = BHP256::hash_to_field(10field);
        let old_salt: scalar = 42scalar;
        let new_salt: scalar = 99scalar;

        // Register
        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 2000u16, 3500000u64, old_salt);
        f1.await();

        // Update: 6M base, 15% tax, 4M min
        let (upd, f2): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/update_employee(rec, 6000000u64, 1500u16, 4000000u64, new_salt);
        f2.await();

        // Verify record updated
        assert_eq(upd.base_salary, 6000000u64);
        assert_eq(upd.tax_rate_bps, 1500u16);
        assert_eq(upd.min_salary, 4000000u64);

        // Verify NEW commitment on-chain
        let packed: field = (6000000u64 as field) + (1500u16 as field) * 1000000000field;
        let expected: field = BHP256::hash_to_field(packed + (new_salt as field));
        let stored: field = Mapping::get(ghostpay.aleo/employee_commitments, emp_id);
        assert_eq(stored, expected);
    }

    // ============================================================
    // TEST 12: Remove Employee
    // Removes employee and verifies commitment deleted.
    // ============================================================
    @test
    script test_remove_employee() {
        let emp_id: field = BHP256::hash_to_field(11field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        // Verify count = 1
        let c1: u32 = Mapping::get(ghostpay.aleo/employee_count_per_employer, self.signer);
        assert_eq(c1, 1u32);

        // Remove
        let f2: Future = ghostpay.aleo/remove_employee(rec);
        f2.await();

        // Verify commitment deleted
        let exists: bool = Mapping::contains(ghostpay.aleo/employee_commitments, emp_id);
        assert(!exists);

        // Verify count = 0
        let c2: u32 = Mapping::get(ghostpay.aleo/employee_count_per_employer, self.signer);
        assert_eq(c2, 0u32);
    }

    // ============================================================
    // TEST 13: Generate Audit Proof
    // Verifies proof contains correct aggregates.
    // ============================================================
    @test
    transition test_audit_proof() {
        let bh: field = BHP256::hash_to_field(500field);
        let total: u64 = 13500000u64;
        let count: u32 = 3u32;

        // Build merkle root from 3 employee IDs
        let r0: field = 0field;
        let r1: field = merkle_step(r0, BHP256::hash_to_field(1field));
        let r2: field = merkle_step(r1, BHP256::hash_to_field(2field));
        let r3: field = merkle_step(r2, BHP256::hash_to_field(3field));

        let proof: ghostpay.aleo/AuditProof =
            ghostpay.aleo/generate_audit_proof(AUDITOR, bh, total, count, r3);

        assert_eq(proof.owner, AUDITOR);
        assert_eq(proof.total_disbursed, 13500000u64);
        assert_eq(proof.employee_count, 3u32);
        assert_eq(proof.batch_hash, bh);
        assert_eq(proof.employees_merkle_root, r3);
    }

    // ============================================================
    // TEST 14: Audit with 0 Employees Fails
    // ============================================================
    @test
    @should_fail
    transition test_audit_zero_fails() {
        let p: ghostpay.aleo/AuditProof =
            ghostpay.aleo/generate_audit_proof(AUDITOR, 1field, 1000000u64, 0u32, 0field);
    }

    // ============================================================
    // TEST 15: Full End-to-End Payroll Cycle
    // 2 employees → payroll → claims → audit proof
    // ============================================================
    @test
    script test_full_cycle() {
        // Register Employee 1
        let id1: field = BHP256::hash_to_field(20field);
        let (e1, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, id1, 5000000u64, 2000u16, 3500000u64, 111scalar);
        f1.await();

        // Register Employee 2
        let id2: field = BHP256::hash_to_field(21field);
        let (e2, f2): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_2, id2, 8000000u64, 2500u16, 5000000u64, 222scalar);
        f2.await();

        // Verify 2 employees registered
        let cnt: u32 = Mapping::get(ghostpay.aleo/employee_count_per_employer, self.signer);
        assert_eq(cnt, 2u32);

        // Process payroll for Employee 1
        // net = 5M + 200K - (5M/10000*2000) = 5.2M - 1M = 4.2M
        let bid: field = 1000field;
        let (p1, fp1): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(e1, 200000u64, bid, 1u64);
        fp1.await();
        assert_eq(p1.net_salary, 4200000u64);

        // Process payroll for Employee 2
        // net = 8M + 300K - (8M/10000*2500) = 8.3M - 2M = 6.3M
        let (p2, fp2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(e2, 300000u64, bid, 2u64);
        fp2.await();
        assert_eq(p2.net_salary, 6300000u64);

        // Claim salaries
        let fc1: Future = ghostpay.aleo/claim_salary(p1);
        fc1.await();
        let fc2: Future = ghostpay.aleo/claim_salary(p2);
        fc2.await();

        // Verify both claimed
        assert(Mapping::get(ghostpay.aleo/claimed_payments, p1.payment_nonce));
        assert(Mapping::get(ghostpay.aleo/claimed_payments, p2.payment_nonce));

        // Generate audit proof
        // Total = 4.2M + 6.3M = 10.5M
        let mr: field = merkle_step(0field, id1);
        let mr_final: field = merkle_step(mr, id2);
        let bh: field = BHP256::hash_to_field(bid + 1field);

        let audit: ghostpay.aleo/AuditProof =
            ghostpay.aleo/generate_audit_proof(AUDITOR, bh, 10500000u64, 2u32, mr_final);

        assert_eq(audit.total_disbursed, 10500000u64);
        assert_eq(audit.employee_count, 2u32);
        assert_eq(audit.owner, AUDITOR);
    }

    // ============================================================
    // TEST 16: Payroll Zero Bonus
    // ============================================================
    @test
    script test_zero_bonus() {
        let emp_id: field = BHP256::hash_to_field(30field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        // net = 5M + 0 - 1M = 4M
        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 0u64, 600field, 1u64);
        f2.await();

        assert_eq(pay.net_salary, 4000000u64);
        assert_eq(pay.bonus, 0u64);
        assert_eq(pay.tax_deducted, 1000000u64);
    }

    // ============================================================
    // TEST 17: Payroll Zero Tax
    // 0% tax → employee gets full base + bonus.
    // ============================================================
    @test
    script test_zero_tax() {
        let emp_id: field = BHP256::hash_to_field(31field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(EMPLOYEE_1, emp_id, 5000000u64, 0u16, 3000000u64, 42scalar);
        f1.await();

        // net = 5M + 1M - 0 = 6M
        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 1000000u64, 700field, 1u64);
        f2.await();

        assert_eq(pay.net_salary, 6000000u64);
        assert_eq(pay.tax_deducted, 0u64);
    }

    // ============================================================
    // TEST 18: Merkle Step Computation
    // Verifies the inline hash accumulator.
    // ============================================================
    @test
    transition test_merkle_step() {
        let root: field = 0field;

        // Step 1: fold in 1field
        let s1: field = merkle_step(root, 1field);
        let e1: field = BHP256::hash_to_field(0field + 1field);
        assert_eq(s1, e1);

        // Step 2: fold in 2field
        let s2: field = merkle_step(s1, 2field);
        let e2: field = BHP256::hash_to_field(s1 + 2field);
        assert_eq(s2, e2);

        // Different order → different root
        let a1: field = merkle_step(root, 2field);
        let a2: field = merkle_step(a1, 1field);
        assert(s2 != a2);
    }
}
