program test_veilmarkets_oracle.aleo;

closure outcome_vote_key:
    input r0 as field;
    input r1 as u8;
    cast r1 into r2 as field;
    add r0 r2 into r3;
    hash.bhp256 r3 into r4 as field;
    output r4 as field;

closure vote_receipt_key:
    input r0 as field;
    input r1 as address;
    cast r1 into r2 as field;
    add r0 r2 into r3;
    hash.bhp256 r3 into r4 as field;
    output r4 as field;

function vote_keys_change:
    call outcome_vote_key 91field 0u8 into r0;
    call outcome_vote_key 91field 1u8 into r1;
    call vote_receipt_key 91field aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r2;
    call vote_receipt_key 91field aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 into r3;
    is.neq r0 r1 into r4;
    assert.eq r4 true;
    is.neq r2 r3 into r5;
    assert.eq r5 true;

function default_quorum_weight:
    assert.eq 40000000u64 40000000u64;

closure compute_disputed_winner:
    input r0 as u64;
    input r1 as u64;
    input r2 as u64;
    input r3 as u64;
    input r4 as u64;
    input r5 as u64;
    input r6 as u64;
    input r7 as u64;
    gt r1 r0 into r8;
    ternary r8 1u8 0u8 into r9;
    ternary r8 r1 r0 into r10;
    gt r3 r2 into r11;
    ternary r11 3u8 2u8 into r12;
    ternary r11 r3 r2 into r13;
    gt r5 r4 into r14;
    ternary r14 5u8 4u8 into r15;
    ternary r14 r5 r4 into r16;
    gt r7 r6 into r17;
    ternary r17 7u8 6u8 into r18;
    ternary r17 r7 r6 into r19;
    gt r13 r10 into r20;
    ternary r20 r12 r9 into r21;
    ternary r20 r13 r10 into r22;
    gt r19 r16 into r23;
    ternary r23 r18 r15 into r24;
    ternary r23 r19 r16 into r25;
    gt r25 r22 into r26;
    ternary r26 r24 r21 into r27;
    output r27 as u8;

function disputed_winner_max_vote:
    call compute_disputed_winner 10u64 20u64 40u64 25u64 9u64 8u64 7u64 6u64 into r0;
    call compute_disputed_winner 90u64 20u64 10u64 15u64 16u64 17u64 18u64 19u64 into r1;
    call compute_disputed_winner 1u64 2u64 3u64 4u64 5u64 6u64 7u64 100u64 into r2;
    assert.eq r0 2u8;
    assert.eq r1 0u8;
    assert.eq r2 7u8;

function timeout_defaults:
    assert.eq 100600u64 100600u64;
    assert.eq 102400u64 102400u64;

function no_vote_split:
    assert.eq 2000000u64 2000000u64;
    assert.eq 18000000u64 18000000u64;
    assert.eq 20000000u64 20000000u64;

function disputer_win_split:
    assert.eq 2000000u64 2000000u64;
    assert.eq 4000000u64 4000000u64;
    assert.eq 14000000u64 14000000u64;
    assert.eq 34000000u64 34000000u64;

function proposer_win_split:
    assert.eq 3000000u64 3000000u64;
    assert.eq 6000000u64 6000000u64;
    assert.eq 21000000u64 21000000u64;
    assert.eq 30000000u64 30000000u64;

function vote_reward_prorata:
    assert.eq true true;
    cast 20u64 into r0 as u128;
    cast 18u64 into r1 as u128;
    cast 60u64 into r2 as u128;
    mul r0 r1 into r3;
    div r3 r2 into r4;
    cast r4 into r5 as u64;
    sub 18u64 r5 into r6;
    assert.eq r5 6u64;
    assert.eq r6 12u64;
    assert.eq 40u64 40u64;

constructor:
    assert.eq edition 0u16;
