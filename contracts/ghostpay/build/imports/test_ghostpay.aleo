import ghostpay.aleo;
program test_ghostpay.aleo;

function test_audit_proof:
    hash.bhp256 3260460799406925384450789443848721250796883831019095717716089006895746294528field into r0 as field;
    add r0 3736522601382494394255789052466017870786031735005680174691203879959757105441field into r1;
    hash.bhp256 r1 into r2 as field;
    add r2 3784389418964719981816894781287115017553786961964078707004764868992997308403field into r3;
    hash.bhp256 r3 into r4 as field;
    call ghostpay.aleo/generate_audit_proof aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px 8015891080115402417931553528799241029458523448503416463287732051668412489184field 13500000u64 3u32 r4 into r5;
    assert.eq r5.owner aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px;
    assert.eq r5.total_disbursed 13500000u64;
    assert.eq r5.employee_count 3u32;
    assert.eq r5.employees_merkle_root r4;

function test_audit_zero_fails:
    call ghostpay.aleo/generate_audit_proof aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px 1field 1000000u64 0u32 0field into r0;

function test_merkle_step:
    hash.bhp256 1field into r0 as field;
    assert.eq r0 3260460799406925384450789443848721250796883831019095717716089006895746294528field;
    add r0 2field into r1;
    hash.bhp256 r1 into r2 as field;
    hash.bhp256 r1 into r3 as field;
    assert.eq r2 r3;
    hash.bhp256 2field into r4 as field;
    add r4 1field into r5;
    hash.bhp256 r5 into r6 as field;
    is.neq r2 r6 into r7;
    assert.eq r7 true;

constructor:
    assert.eq edition 0u16;
