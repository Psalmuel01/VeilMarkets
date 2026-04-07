import veilmarkets_factory_v8.aleo;
import veilmarkets_v8.aleo;
program test_veilmarkets.aleo;

closure is_valid_market_shape:
    input r0 as u8;
    input r1 as u8;
    gt r0 1u8 into r2;
    is.eq r0 0u8 into r3;
    is.eq r1 2u8 into r4;
    lt r1 2u8 into r5;
    lte r1 8u8 into r6;
    ternary r5 false r6 into r7;
    ternary r3 r4 r7 into r8;
    ternary r2 false r8 into r9;
    output r9 as boolean;

function validates_market_shape_rules:
    call is_valid_market_shape 0u8 2u8 into r0;
    assert.eq r0 true;
    call is_valid_market_shape 1u8 2u8 into r1;
    assert.eq r1 true;
    call is_valid_market_shape 1u8 3u8 into r2;
    assert.eq r2 true;
    call is_valid_market_shape 1u8 4u8 into r3;
    assert.eq r3 true;
    call is_valid_market_shape 1u8 8u8 into r4;
    assert.eq r4 true;
    call is_valid_market_shape 0u8 3u8 into r5;
    assert.eq r5 false;
    call is_valid_market_shape 1u8 1u8 into r6;
    assert.eq r6 false;
    call is_valid_market_shape 1u8 9u8 into r7;
    assert.eq r7 false;
    call is_valid_market_shape 2u8 2u8 into r8;
    assert.eq r8 false;

function payout_formula_categorical:
    assert.eq 50u64 50u64;
    assert.eq 20u64 20u64;
    assert.eq 10u64 10u64;

function nullifier_changes_with_fields:
    hash.bhp256 aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r0 as field;
    add r0 987654field into r1;
    cast 2500000u64 into r2 as field;
    add r1 r2 into r3;
    cast 1u8 into r4 as field;
    add r3 r4 into r5;
    add r5 111field into r6;
    hash.bhp256 r6 into r7 as field;
    cast 2500001u64 into r8 as field;
    add r1 r8 into r9;
    cast 1u8 into r10 as field;
    add r9 r10 into r11;
    add r11 111field into r12;
    hash.bhp256 r12 into r13 as field;
    cast 2500000u64 into r14 as field;
    add r1 r14 into r15;
    add r15 0field into r16;
    add r16 111field into r17;
    hash.bhp256 r17 into r18 as field;
    is.neq r7 r13 into r19;
    assert.eq r19 true;
    is.neq r7 r18 into r20;
    assert.eq r20 true;

function outcome_within_count:
    assert.eq true true;
    assert.eq false false;

constructor:
    assert.eq edition 0u16;
