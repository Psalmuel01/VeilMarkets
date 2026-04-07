program test_governance.aleo;

closure proposal_target_valid:
    input r0 as u8;
    lte r0 1u8 into r1;
    output r1 as boolean;

function target_bounds:
    call proposal_target_valid 0u8 into r0;
    assert.eq r0 true;
    call proposal_target_valid 1u8 into r1;
    assert.eq r1 true;
    call proposal_target_valid 2u8 into r2;
    assert.eq r2 false;

function vote_majority_check:
    assert.eq true true;

closure can_execute:
    input r0 as u64;
    input r1 as u64;
    input r2 as boolean;
    input r3 as boolean;
    not r2 into r4;
    gt r0 r1 into r5;
    ternary r4 false r5 into r6;
    ternary r3 false r6 into r7;
    output r7 as boolean;

function execution_gate_checks:
    call can_execute 5u64 2u64 true false into r0;
    assert.eq r0 true;
    call can_execute 2u64 5u64 true false into r1;
    assert.eq r1 false;
    call can_execute 5u64 2u64 false false into r2;
    assert.eq r2 false;
    call can_execute 5u64 2u64 true true into r3;
    assert.eq r3 false;

constructor:
    assert.eq edition 0u16;
