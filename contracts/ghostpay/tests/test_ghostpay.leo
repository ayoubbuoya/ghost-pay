// ========================================================
// GhostPay — Unit & Integration Tests
// File: tests/test_ghostpay.leo
// Program: test_ghostpay.aleo
//
// Run with: leo test
//
// Test Coverage:
//   - Employee registration / update / removal
//   - Salary commitment verification
//   - Payroll processing with ZK constraints
//   - Salary claims with double-spend prevention
//   - Audit proof generation
//   - Expected-failure edge cases
//
// Note on self.signer:
//   In Leo script tests, self.signer is the test runner.
//   All transitions see self.caller = self.signer.
//   Tests that need the employee to be the caller must
//   use self.signer as the employee address.
// ========================================================

import ghostpay.aleo;

program test_ghostpay.aleo {

    // Constructor required since ConsensusVersion V9
    @noupgrade
    async constructor() {}

    // ============================================================
    // CONSTANTS
    // ============================================================
    // Auditor address (distinct from the test runner / self.signer)
    const AUDITOR: address = aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px;

    // Local inline: mirrors ghostpay's compute_merkle_step
    // (inline functions cannot be called across program boundaries)
    inline merkle_step(root: field, h: field) -> field {
        return BHP256::hash_to_field(root + h);
    }

    // ============================================================
    // TEST 1: Register Employee
    // self.signer acts as employer; employee = self.signer
    // (employer registers themselves for testing purposes)
    // ============================================================
    @test
    script test_register_emp() {
        let emp_id: field = BHP256::hash_to_field(1field);
        let base: u64 = 5000000u64;
        let tax: u16 = 2000u16;
        let min_sal: u64 = 3500000u64;
        let salt: scalar = 42scalar;

        // Register: employer = self.signer, employee = self.signer
        let (rec, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, base, tax, min_sal, salt);
        f.await();

        // Assert record fields
        assert_eq(rec.owner, self.signer);
        assert_eq(rec.base_salary, 5000000u64);
        assert_eq(rec.tax_rate_bps, 2000u16);
        assert_eq(rec.min_salary, 3500000u64);

        // Assert on-chain commitment stored
        let packed: field = (base as field) + (tax as field) * 1000000000field;
        let expected: field = BHP256::hash_to_field(packed + (salt as field));
        let stored: field = Mapping::get(ghostpay.aleo/employee_commitments, emp_id);
        assert_eq(stored, expected);

        // Assert employee count = 1
        let count: u32 = Mapping::get_or_use(ghostpay.aleo/employee_count_per_employer, self.signer, 0u32);
        assert_eq(count, 1u32);
    }

    // ============================================================
    // TEST 2: Duplicate Registration Fails
    // ============================================================
    @test
    @should_fail
    script test_dup_register_fails() {
        let emp_id: field = BHP256::hash_to_field(99field);

        let (r1, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 1scalar);
        f1.await();

        // Same emp_id — should FAIL
        let (r2, f2): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 6000000u64, 1500u16, 4000000u64, 2scalar);
        f2.await();
    }

    // ============================================================
    // TEST 3: Invalid Tax Rate Fails (> 10000 bps)
    // ============================================================
    @test
    @should_fail
    script test_bad_tax_fails() {
        let (r, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(
                self.signer, BHP256::hash_to_field(2field),
                5000000u64, 15000u16, 3500000u64, 1scalar,
            );
        f.await();
    }

    // ============================================================
    // TEST 4: Min > Base Salary Fails
    // ============================================================
    @test
    @should_fail
    script test_min_gt_base_fails() {
        let (r, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(
                self.signer, BHP256::hash_to_field(3field),
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
                self.signer, BHP256::hash_to_field(4field),
                0u64, 2000u16, 0u64, 1scalar,
            );
        f.await();
    }

    // ============================================================
    // TEST 6: Verify Salary Commitment
    // Employee verifies the commitment matches.
    // ============================================================
    @test
    script test_verify_commitment() {
        let emp_id: field = BHP256::hash_to_field(5field);

        let (rec, f): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 6000000u64, 1800u16, 4000000u64, 77scalar);
        f.await();

        let valid: bool = ghostpay.aleo/verify_salary_commitment(rec);
        assert(valid);
    }

    // ============================================================
    // TEST 7: Process Payroll — ZK Salary Computation
    // Verifies: net = base + bonus - tax
    // ============================================================
    @test
    script test_process_payroll() {
        let emp_id: field = BHP256::hash_to_field(6field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        // Process: base=5M, bonus=500K, tax=20%
        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 500000u64, 100field, 1u64);
        f2.await();

        // net = 5M + 500K - (5M/10000*2000) = 5.5M - 1M = 4.5M
        assert_eq(pay.net_salary, 4500000u64);
        assert_eq(pay.bonus, 500000u64);
        assert_eq(pay.tax_deducted, 1000000u64);
        assert_eq(pay.owner, self.signer);
    }

    // ============================================================
    // TEST 8: Claim Salary — Nonce Marked
    // ============================================================
    @test
    script test_claim_salary() {
        let emp_id: field = BHP256::hash_to_field(7field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
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
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 500000u64, 300field, 1u64);
        f2.await();

        // Mark nonce as claimed (simulating first claim)
        Mapping::set(ghostpay.aleo/claimed_payments, pay.payment_nonce, true);

        // Second claim — should FAIL
        let f3: Future = ghostpay.aleo/claim_salary(pay);
        f3.await();
    }

    // ============================================================
    // TEST 10: Payroll Below Minimum Fails
    // base=1M, tax=90%, bonus=0 → net=100K < min=500K
    // ============================================================
    @test
    @should_fail
    script test_below_min_fails() {
        let emp_id: field = BHP256::hash_to_field(9field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 1000000u64, 9000u16, 500000u64, 42scalar);
        f1.await();

        let (p, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 0u64, 400field, 1u64);
        f2.await();
    }

    // ============================================================
    // TEST 11: Update Employee Salary
    // ============================================================
    @test
    script test_update_employee() {
        let emp_id: field = BHP256::hash_to_field(10field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        // Update: 6M base, 15% tax, 4M min
        let (upd, f2): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/update_employee(rec, 6000000u64, 1500u16, 4000000u64, 99scalar);
        f2.await();

        assert_eq(upd.base_salary, 6000000u64);
        assert_eq(upd.tax_rate_bps, 1500u16);
        assert_eq(upd.min_salary, 4000000u64);

        // Verify NEW commitment stored on-chain
        let packed: field = (6000000u64 as field) + (1500u16 as field) * 1000000000field;
        let expected: field = BHP256::hash_to_field(packed + (99scalar as field));
        let stored: field = Mapping::get(ghostpay.aleo/employee_commitments, emp_id);
        assert_eq(stored, expected);
    }

    // ============================================================
    // TEST 12: Remove Employee
    // ============================================================
    @test
    script test_remove_employee() {
        let emp_id: field = BHP256::hash_to_field(11field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        // Verify count = 1 after registration
        let c1: u32 = Mapping::get_or_use(ghostpay.aleo/employee_count_per_employer, self.signer, 0u32);
        assert_eq(c1, 1u32);

        // Remove the employee
        let f2: Future = ghostpay.aleo/remove_employee(rec);
        f2.await();

        // Verify count decremented to 0
        let c2: u32 = Mapping::get_or_use(ghostpay.aleo/employee_count_per_employer, self.signer, 0u32);
        assert_eq(c2, 0u32);
    }

    // ============================================================
    // TEST 13: Generate Audit Proof
    // ============================================================
    @test
    transition test_audit_proof() {
        let bh: field = BHP256::hash_to_field(500field);

        let r0: field = 0field;
        let r1: field = merkle_step(r0, BHP256::hash_to_field(1field));
        let r2: field = merkle_step(r1, BHP256::hash_to_field(2field));
        let r3: field = merkle_step(r2, BHP256::hash_to_field(3field));

        let proof: ghostpay.aleo/AuditProof =
            ghostpay.aleo/generate_audit_proof(AUDITOR, bh, 13500000u64, 3u32, r3);

        assert_eq(proof.owner, AUDITOR);
        assert_eq(proof.total_disbursed, 13500000u64);
        assert_eq(proof.employee_count, 3u32);
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
    // TEST 15: End-to-End Payroll Cycle
    // Register → Payroll → Claim (single employee)
    // ============================================================
    @test
    script test_full_cycle() {
        // Register employee: base=5M, tax=20%
        let id1: field = BHP256::hash_to_field(20field);
        let (e1, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, id1, 5000000u64, 2000u16, 3500000u64, 111scalar);
        f1.await();

        // Verify registration
        let cnt: u32 = Mapping::get_or_use(ghostpay.aleo/employee_count_per_employer, self.signer, 0u32);
        assert_eq(cnt, 1u32);

        // Process payroll: net = 5M + 200K - 1M = 4.2M
        let bid: field = 1000field;
        let (p1, fp1): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(e1, 200000u64, bid, 1u64);
        fp1.await();
        assert_eq(p1.net_salary, 4200000u64);
        assert_eq(p1.tax_deducted, 1000000u64);

        // Claim salary
        let fc1: Future = ghostpay.aleo/claim_salary(p1);
        fc1.await();

        // Verify claim marked
        assert(Mapping::get(ghostpay.aleo/claimed_payments, p1.payment_nonce));
    }

    // ============================================================
    // TEST 16: Payroll with Zero Bonus
    // ============================================================
    @test
    script test_zero_bonus() {
        let emp_id: field = BHP256::hash_to_field(30field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 2000u16, 3500000u64, 42scalar);
        f1.await();

        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 0u64, 600field, 1u64);
        f2.await();

        // net = 5M - 1M = 4M
        assert_eq(pay.net_salary, 4000000u64);
        assert_eq(pay.bonus, 0u64);
        assert_eq(pay.tax_deducted, 1000000u64);
    }

    // ============================================================
    // TEST 17: Payroll with Zero Tax
    // ============================================================
    @test
    script test_zero_tax() {
        let emp_id: field = BHP256::hash_to_field(31field);

        let (rec, f1): (ghostpay.aleo/EmployeeRecord, Future) =
            ghostpay.aleo/register_employee(self.signer, emp_id, 5000000u64, 0u16, 3000000u64, 42scalar);
        f1.await();

        let (pay, f2): (ghostpay.aleo/SalaryPayment, Future) =
            ghostpay.aleo/process_payroll(rec, 1000000u64, 700field, 1u64);
        f2.await();

        // net = 5M + 1M - 0 = 6M
        assert_eq(pay.net_salary, 6000000u64);
        assert_eq(pay.tax_deducted, 0u64);
    }

    // ============================================================
    // TEST 18: Merkle Step Computation
    // ============================================================
    @test
    transition test_merkle_step() {
        let root: field = 0field;

        let s1: field = merkle_step(root, 1field);
        let e1: field = BHP256::hash_to_field(0field + 1field);
        assert_eq(s1, e1);

        let s2: field = merkle_step(s1, 2field);
        let e2: field = BHP256::hash_to_field(s1 + 2field);
        assert_eq(s2, e2);

        // Different order → different root
        let a1: field = merkle_step(root, 2field);
        let a2: field = merkle_step(a1, 1field);
        assert(s2 != a2);
    }
}
