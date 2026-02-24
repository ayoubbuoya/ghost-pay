program ghostpay.aleo;

record EmployeeRecord:
    owner as address.private;
    employer as address.private;
    employee_id_hash as field.private;
    salary_commitment as field.private;
    base_salary as u64.private;
    tax_rate_bps as u16.private;
    min_salary as u64.private;
    salt as scalar.private;

record SalaryPayment:
    owner as address.private;
    employer as address.private;
    batch_hash as field.private;
    net_salary as u64.private;
    bonus as u64.private;
    tax_deducted as u64.private;
    payment_nonce as field.private;

record AuditProof:
    owner as address.private;
    employer as address.private;
    batch_hash as field.private;
    total_disbursed as u64.private;
    employee_count as u32.private;
    employees_merkle_root as field.private;

struct PayrollBatchSummary:
    batch_hash as field;
    employer as address;
    employee_count as u32;
    nonce as u64;
    finalized as boolean;

mapping employee_commitments:
    key as field.public;
    value as field.public;

mapping payroll_batches:
    key as field.public;
    value as PayrollBatchSummary.public;

mapping employee_count_per_employer:
    key as address.public;
    value as u32.public;

mapping claimed_payments:
    key as field.public;
    value as boolean.public;

function register_employee:
    input r0 as address.private;
    input r1 as field.private;
    input r2 as u64.private;
    input r3 as u16.private;
    input r4 as u64.private;
    input r5 as scalar.private;
    lte r3 10000u16 into r6;
    assert.eq r6 true;
    lte r4 r2 into r7;
    assert.eq r7 true;
    gt r2 0u64 into r8;
    assert.eq r8 true;
    cast r2 into r9 as field;
    cast r3 into r10 as field;
    mul r10 1000000000field into r11;
    add r9 r11 into r12;
    cast r5 into r13 as field;
    add r12 r13 into r14;
    hash.bhp256 r14 into r15 as field;
    cast r0 self.caller r1 r15 r2 r3 r4 r5 into r16 as EmployeeRecord.record;
    async register_employee r1 r15 self.caller into r17;
    output r16 as EmployeeRecord.record;
    output r17 as ghostpay.aleo/register_employee.future;

finalize register_employee:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as address.public;
    get.or_use employee_commitments[r0] 0field into r3;
    assert.eq r3 0field;
    set r1 into employee_commitments[r0];
    get.or_use employee_count_per_employer[r2] 0u32 into r4;
    add r4 1u32 into r5;
    set r5 into employee_count_per_employer[r2];

function update_employee:
    input r0 as EmployeeRecord.record;
    input r1 as u64.private;
    input r2 as u16.private;
    input r3 as u64.private;
    input r4 as scalar.private;
    assert.eq self.caller r0.employer;
    lte r2 10000u16 into r5;
    assert.eq r5 true;
    lte r3 r1 into r6;
    assert.eq r6 true;
    gt r1 0u64 into r7;
    assert.eq r7 true;
    cast r0.base_salary into r8 as field;
    cast r0.tax_rate_bps into r9 as field;
    mul r9 1000000000field into r10;
    add r8 r10 into r11;
    cast r0.salt into r12 as field;
    add r11 r12 into r13;
    hash.bhp256 r13 into r14 as field;
    cast r1 into r15 as field;
    cast r2 into r16 as field;
    mul r16 1000000000field into r17;
    add r15 r17 into r18;
    cast r4 into r19 as field;
    add r18 r19 into r20;
    hash.bhp256 r20 into r21 as field;
    cast r0.owner r0.employer r0.employee_id_hash r21 r1 r2 r3 r4 into r22 as EmployeeRecord.record;
    async update_employee r0.employee_id_hash r14 r21 into r23;
    output r22 as EmployeeRecord.record;
    output r23 as ghostpay.aleo/update_employee.future;

finalize update_employee:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as field.public;
    get employee_commitments[r0] into r3;
    assert.eq r3 r1;
    set r2 into employee_commitments[r0];

function remove_employee:
    input r0 as EmployeeRecord.record;
    assert.eq self.caller r0.employer;
    cast r0.base_salary into r1 as field;
    cast r0.tax_rate_bps into r2 as field;
    mul r2 1000000000field into r3;
    add r1 r3 into r4;
    cast r0.salt into r5 as field;
    add r4 r5 into r6;
    hash.bhp256 r6 into r7 as field;
    async remove_employee r0.employee_id_hash r7 r0.employer into r8;
    output r8 as ghostpay.aleo/remove_employee.future;

finalize remove_employee:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as address.public;
    get employee_commitments[r0] into r3;
    assert.eq r3 r1;
    remove employee_commitments[r0];
    get.or_use employee_count_per_employer[r2] 0u32 into r4;
    gt r4 0u32 into r5;
    assert.eq r5 true;
    sub r4 1u32 into r6;
    set r6 into employee_count_per_employer[r2];

function verify_salary_commitment:
    input r0 as EmployeeRecord.record;
    assert.eq self.caller r0.owner;
    cast r0.base_salary into r1 as field;
    cast r0.tax_rate_bps into r2 as field;
    mul r2 1000000000field into r3;
    add r1 r3 into r4;
    cast r0.salt into r5 as field;
    add r4 r5 into r6;
    hash.bhp256 r6 into r7 as field;
    is.eq r7 r0.salary_commitment into r8;
    output r8 as boolean.private;

function process_payroll:
    input r0 as EmployeeRecord.record;
    input r1 as u64.private;
    input r2 as field.private;
    input r3 as u64.private;
    assert.eq self.caller r0.employer;
    cast r0.tax_rate_bps into r4 as u64;
    div r0.base_salary 10000u64 into r5;
    mul r5 r4 into r6;
    add r0.base_salary r1 into r7;
    lte r6 r7 into r8;
    assert.eq r8 true;
    sub r7 r6 into r9;
    gte r9 r0.min_salary into r10;
    assert.eq r10 true;
    gt r9 0u64 into r11;
    assert.eq r11 true;
    cast r3 into r12 as field;
    add r2 r12 into r13;
    hash.bhp256 r13 into r14 as field;
    add r0.employee_id_hash r2 into r15;
    cast r3 into r16 as field;
    add r15 r16 into r17;
    hash.bhp256 r17 into r18 as field;
    cast r0.base_salary into r19 as field;
    cast r0.tax_rate_bps into r20 as field;
    mul r20 1000000000field into r21;
    add r19 r21 into r22;
    cast r0.salt into r23 as field;
    add r22 r23 into r24;
    hash.bhp256 r24 into r25 as field;
    cast r0.owner r0.employer r14 r9 r1 r6 r18 into r26 as SalaryPayment.record;
    async process_payroll r0.employee_id_hash r25 r18 r0.employer r14 r3 into r27;
    output r26 as SalaryPayment.record;
    output r27 as ghostpay.aleo/process_payroll.future;

finalize process_payroll:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as address.public;
    input r4 as field.public;
    input r5 as u64.public;
    get employee_commitments[r0] into r6;
    assert.eq r6 r1;
    get.or_use claimed_payments[r2] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    get.or_use employee_count_per_employer[r3] 0u32 into r9;
    cast r4 r3 r9 r5 false into r10 as PayrollBatchSummary;
    set r10 into payroll_batches[r4];

function claim_salary:
    input r0 as SalaryPayment.record;
    assert.eq self.caller r0.owner;
    gt r0.net_salary 0u64 into r1;
    assert.eq r1 true;
    async claim_salary r0.payment_nonce into r2;
    output r2 as ghostpay.aleo/claim_salary.future;

finalize claim_salary:
    input r0 as field.public;
    get.or_use claimed_payments[r0] false into r1;
    not r1 into r2;
    assert.eq r2 true;
    set true into claimed_payments[r0];

function generate_audit_proof:
    input r0 as address.private;
    input r1 as field.private;
    input r2 as u64.private;
    input r3 as u32.private;
    input r4 as field.private;
    gt r3 0u32 into r5;
    assert.eq r5 true;
    gt r2 0u64 into r6;
    assert.eq r6 true;
    cast r0 self.caller r1 r2 r3 r4 into r7 as AuditProof.record;
    output r7 as AuditProof.record;

constructor:
    assert.eq edition 0u16;
