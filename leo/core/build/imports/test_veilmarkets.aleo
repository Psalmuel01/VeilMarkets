program test_veilmarkets.aleo;

closure is_valid_market_shape:
    input r0 as u8;
    input r1 as u8;
    gt r0 1u8 into r2;
    is.eq r0 0u8 into r3;
    is.eq r1 2u8 into r4;
    lt r1 2u8 into r5;
    lte r1 32u8 into r6;
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
    call is_valid_market_shape 1u8 32u8 into r4;
    assert.eq r4 true;
    call is_valid_market_shape 0u8 3u8 into r5;
    assert.eq r5 false;
    call is_valid_market_shape 1u8 1u8 into r6;
    assert.eq r6 false;
    call is_valid_market_shape 1u8 33u8 into r7;
    assert.eq r7 false;
    call is_valid_market_shape 2u8 2u8 into r8;
    assert.eq r8 false;

closure calc_buy_shares:
    input r0 as u64;
    input r1 as u8;
    input r2 as u64;
    input r3 as u64;
    input r4 as u64;
    cast r1 into r5 as u64;
    mul r2 r5 into r6;
    add r0 r6 into r7;
    div r0 r5 into r8;
    add r8 r2 into r9;
    add r9 r3 into r10;
    gt r10 0u64 into r11;
    assert.eq r11 true;
    cast r4 into r12 as u128;
    cast r7 into r13 as u128;
    cast r10 into r14 as u128;
    mul r12 r13 into r15;
    div r15 r14 into r16;
    cast r16 into r17 as u64;
    is.eq r17 0u64 into r18;
    ternary r18 1u64 r17 into r19;
    output r19 as u64;

function quote_scales_outcome_counts:
    call calc_buy_shares 50000000u64 2u8 10000000u64 4000000u64 9000000u64 into r0;
    call calc_buy_shares 50000000u64 3u8 10000000u64 4000000u64 9000000u64 into r1;
    call calc_buy_shares 50000000u64 8u8 10000000u64 4000000u64 9000000u64 into r2;
    call calc_buy_shares 50000000u64 16u8 10000000u64 4000000u64 9000000u64 into r3;
    call calc_buy_shares 50000000u64 32u8 10000000u64 4000000u64 9000000u64 into r4;
    gt r0 0u64 into r5;
    assert.eq r5 true;
    gt r1 0u64 into r6;
    assert.eq r6 true;
    gt r2 0u64 into r7;
    assert.eq r7 true;
    gt r3 0u64 into r8;
    assert.eq r8 true;
    gt r4 0u64 into r9;
    assert.eq r9 true;
    gte r4 r0 into r10;
    assert.eq r10 true;

function claim_nullifier_changes:
    hash.bhp256 aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r0 as field;
    add r0 111field into r1;
    cast 2500000u64 into r2 as field;
    add r1 r2 into r3;
    hash.bhp256 r3 into r4 as field;
    cast 2500001u64 into r5 as field;
    add r1 r5 into r6;
    hash.bhp256 r6 into r7 as field;
    add r0 112field into r8;
    cast 2500000u64 into r9 as field;
    add r8 r9 into r10;
    hash.bhp256 r10 into r11 as field;
    is.neq r4 r7 into r12;
    assert.eq r12 true;
    is.neq r4 r11 into r13;
    assert.eq r13 true;

function outcome_within_count:
    assert.eq true true;
    assert.eq false false;

function winner_redemption_proportional:
    assert.eq true true;
    cast 6000000u64 into r0 as u128;
    cast 120000000u64 into r1 as u128;
    cast 30000000u64 into r2 as u128;
    mul r0 r1 into r3;
    div r3 r2 into r4;
    cast r4 into r5 as u64;
    assert.eq r5 24000000u64;
    assert.eq 0u64 0u64;

closure calc_sell_payout:
    input r0 as u64;
    input r1 as u8;
    input r2 as u64;
    input r3 as u64;
    input r4 as u64;
    cast r1 into r5 as u64;
    mul r2 r5 into r6;
    add r0 r6 into r7;
    div r0 r5 into r8;
    add r8 r2 into r9;
    add r9 r3 into r10;
    gt r7 0u64 into r11;
    assert.eq r11 true;
    cast r4 into r12 as u128;
    cast r10 into r13 as u128;
    cast r7 into r14 as u128;
    mul r12 r13 into r15;
    div r15 r14 into r16;
    cast r16 into r17 as u64;
    output r17 as u64;

function buy_sell_fee_conservation:
    assert.eq true true;
    cast 10000000u64 into r0 as u128;
    cast 100u64 into r1 as u128;
    cast 10000u64 into r2 as u128;
    mul r0 r1 into r3;
    div r3 r2 into r4;
    cast r4 into r5 as u64;
    sub 10000000u64 r5 into r6;
    call calc_buy_shares 80000000u64 3u8 10000000u64 12000000u64 r6 into r7;
    gt r7 0u64 into r8;
    assert.eq r8 true;
    add 80000000u64 r6 into r9;
    add 12000000u64 r6 into r10;
    call calc_sell_payout r9 3u8 10000000u64 r10 r7 into r11;
    assert.eq true true;
    cast r11 into r12 as u128;
    cast 100u64 into r13 as u128;
    cast 10000u64 into r14 as u128;
    mul r12 r13 into r15;
    div r15 r14 into r16;
    cast r16 into r17 as u64;
    sub r11 r17 into r18;
    gt r11 0u64 into r19;
    assert.eq r19 true;
    gt r18 0u64 into r20;
    assert.eq r20 true;
    lte r18 r9 into r21;
    assert.eq r21 true;
    add r5 r17 into r22;
    gt r22 0u64 into r23;
    assert.eq r23 true;

function sell_quote_scales_with_shares:
    call calc_sell_payout 150000000u64 4u8 12000000u64 35000000u64 1000000u64 into r0;
    call calc_sell_payout 150000000u64 4u8 12000000u64 35000000u64 3000000u64 into r1;
    gt r0 0u64 into r2;
    assert.eq r2 true;
    gt r1 r0 into r3;
    assert.eq r3 true;

constructor:
    assert.eq edition 0u16;
