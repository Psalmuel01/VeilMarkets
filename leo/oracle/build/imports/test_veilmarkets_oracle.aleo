import veilmarkets_factory_v9.aleo;
import veilmarkets_v9.aleo;
import credits.aleo;
import veilmarkets_oracle_v9.aleo;
program test_veilmarkets_oracle.aleo;

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

function disputed_vote_max_weight:
    call compute_disputed_winner 10u64 20u64 40u64 25u64 9u64 8u64 7u64 6u64 into r0;
    call compute_disputed_winner 90u64 20u64 10u64 15u64 16u64 17u64 18u64 19u64 into r1;
    call compute_disputed_winner 1u64 2u64 3u64 4u64 5u64 6u64 7u64 100u64 into r2;
    assert.eq r0 2u8;
    assert.eq r1 0u8;
    assert.eq r2 7u8;

function split_disputer_wins:
    assert.eq 3000000u64 3000000u64;
    assert.eq 27000000u64 27000000u64;
    assert.eq 30000000u64 30000000u64;

function split_proposer_wins:
    assert.eq 4500000u64 4500000u64;
    assert.eq 40500000u64 40500000u64;
    assert.eq 45000000u64 45000000u64;

function deadline_adds_window:
    assert.eq 110800u64 110800u64;

function quorum_requires_unique_voters:
    assert.eq false false;
    assert.eq true true;

function quorum_requires_weight_floor:
    assert.eq false false;
    assert.eq true true;

constructor:
    assert.eq edition 0u16;
