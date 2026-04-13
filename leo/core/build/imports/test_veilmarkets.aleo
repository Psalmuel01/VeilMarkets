program test_veilmarkets.aleo;

closure is_valid_market_shape:
    input r0 as u8;
    input r1 as u8;
    input r2 as u8;
    gt r0 1u8 into r3;
    lt r1 2u8 into r4;
    gt r1 r2 into r5;
    or r4 r5 into r6;
    is.eq r0 0u8 into r7;
    is.eq r1 2u8 into r8;
    ternary r7 r8 true into r9;
    ternary r6 false r9 into r10;
    ternary r3 false r10 into r11;
    output r11 as boolean;

function shape_rules_v11:
    call is_valid_market_shape 0u8 2u8 8u8 into r0;
    assert.eq r0 true;
    call is_valid_market_shape 1u8 2u8 8u8 into r1;
    assert.eq r1 true;
    call is_valid_market_shape 1u8 8u8 8u8 into r2;
    assert.eq r2 true;
    call is_valid_market_shape 0u8 3u8 8u8 into r3;
    assert.eq r3 false;
    call is_valid_market_shape 1u8 1u8 8u8 into r4;
    assert.eq r4 false;
    call is_valid_market_shape 1u8 9u8 8u8 into r5;
    assert.eq r5 false;
    call is_valid_market_shape 2u8 2u8 8u8 into r6;
    assert.eq r6 false;

function buy_quote_fpmm:
    assert.eq true true;
    cast 50u64 into r0 as u128;
    cast 1000u64 into r1 as u128;
    cast 10000u64 into r2 as u128;
    mul r0 r1 into r3;
    div r3 r2 into r4;
    cast r4 into r5 as u64;
    sub 50u64 r5 into r6;
    assert.eq true true;
    add 300u64 r6 into r7;
    gt r7 0u64 into r8;
    assert.eq r8 true;
    cast 100u64 into r9 as u128;
    cast r6 into r10 as u128;
    cast r7 into r11 as u128;
    mul r9 r10 into r12;
    div r12 r11 into r13;
    cast r13 into r14 as u64;
    gt r6 0u64 into r15;
    assert.eq r15 true;
    cast r14 into r16 as u128;
    cast 1000000u64 into r17 as u128;
    cast r6 into r18 as u128;
    mul r16 r17 into r19;
    div r19 r18 into r20;
    cast r20 into r21 as u64;
    assert.eq r5 5u64;
    assert.eq r6 45u64;
    assert.eq r14 13u64;
    assert.eq r21 288888u64;

function sell_quote_fpmm:
    assert.eq true true;
    cast 300u64 into r0 as u128;
    cast 20u64 into r1 as u128;
    cast 120u64 into r2 as u128;
    mul r0 r1 into r3;
    div r3 r2 into r4;
    cast r4 into r5 as u64;
    assert.eq true true;
    cast r5 into r6 as u128;
    cast 500u64 into r7 as u128;
    cast 10000u64 into r8 as u128;
    mul r6 r7 into r9;
    div r9 r8 into r10;
    cast r10 into r11 as u64;
    sub r5 r11 into r12;
    assert.eq r5 50u64;
    assert.eq r11 2u64;
    assert.eq r12 48u64;

closure position_holder_commitment:
    input r0 as field;
    hash.bhp256 r0 into r1 as field;
    output r1 as field;

function pos_commitment_hash:
    call position_holder_commitment 111field into r0;
    call position_holder_commitment 111field into r1;
    call position_holder_commitment 112field into r2;
    hash.bhp256 111field into r3 as field;
    assert.eq r0 r3;
    assert.eq r0 r1;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

closure lp_owner_commitment:
    input r0 as field;
    input r1 as address;
    cast r1 into r2 as field;
    add r0 r2 into r3;
    hash.bhp256 r3 into r4 as field;
    output r4 as field;

closure lp_balance_key:
    input r0 as field;
    input r1 as field;
    add r0 r1 into r2;
    hash.bhp256 r2 into r3 as field;
    output r3 as field;

function lp_keys_depend_on_inputs:
    call lp_owner_commitment 77field aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r0;
    call lp_owner_commitment 78field aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r1;
    call lp_owner_commitment 77field aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 into r2;
    call lp_balance_key 77field r0 into r3;
    call lp_balance_key 77field r2 into r4;
    is.neq r0 r1 into r5;
    assert.eq r5 true;
    is.neq r0 r2 into r6;
    assert.eq r6 true;
    is.neq r3 r4 into r7;
    assert.eq r7 true;

closure winner_payout:
    input r0 as u8;
    input r1 as u8;
    input r2 as u64;
    input r3 as u64;
    is.eq r0 255u8 into r4;
    is.eq r0 r1 into r5;
    ternary r5 r2 0u64 into r6;
    ternary r4 r3 r6 into r7;
    output r7 as u64;

function settlement_semantics:
    call winner_payout 2u8 2u8 6000000u64 4500000u64 into r0;
    call winner_payout 1u8 2u8 6000000u64 4500000u64 into r1;
    call winner_payout 255u8 2u8 6000000u64 4500000u64 into r2;
    assert.eq r0 6000000u64;
    assert.eq r1 0u64;
    assert.eq r2 4500000u64;

constructor:
    assert.eq edition 0u16;
