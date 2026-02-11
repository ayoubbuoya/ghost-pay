program silentpay.aleo;

record Paycheck:
    owner as address.private;
    amount as u64.private;
    issuer as address.private;
    timestamp as i64.private;

struct IncomeProof:
    employee as address;
    is_eligible as boolean;
    threshold as u64;
    timestamp as u32;

function main:
    input r0 as u32.public;
    input r1 as u32.private;
    add r0 r1 into r2;
    output r2 as u32.private;

function issue_paycheck:
    input r0 as address.private;
    input r1 as u64.private;
    input r2 as i64.public;
    cast r0 r1 self.caller r2 into r3 as Paycheck.record;
    output r3 as Paycheck.record;

function verify_income:
    input r0 as Paycheck.record;
    input r1 as u64.public;
    input r2 as u32.public;
    gte r0.amount r1 into r3;
    cast r0.owner r0.amount r0.issuer r0.timestamp into r4 as Paycheck.record;
    cast self.caller r3 r1 r2 into r5 as IncomeProof;
    output r4 as Paycheck.record;
    output r5 as IncomeProof.private;

constructor:
    assert.eq edition 0u16;
