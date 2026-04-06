import veilmarkets_factory_v8.aleo;
import veilmarkets_v8.aleo;
import credits.aleo;
import veilmarkets_oracle_v8.aleo;
program test_veilmarkets_oracle.aleo;

closure compute_disputed_winner:
    input r0 as u64;
    input r1 as u64;
    input r2 as u64;
    input r3 as u64;
    gt r1 r0 into r4;
    ternary r4 1u8 0u8 into r5;
    ternary r4 r1 r0 into r6;
    gt r3 r2 into r7;
    ternary r7 3u8 2u8 into r8;
    ternary r7 r3 r2 into r9;
    gt r9 r6 into r10;
    ternary r10 r8 r5 into r11;
    output r11 as u8;

function disputed_vote_max_weight:
    call compute_disputed_winner 10u64 20u64 40u64 25u64 into r0;
    call compute_disputed_winner 90u64 20u64 10u64 15u64 into r1;
    call compute_disputed_winner 1u64 2u64 3u64 100u64 into r2;
    assert.eq r0 2u8;
    assert.eq r1 0u8;
    assert.eq r2 3u8;

function split_disputer_wins:
    assert.eq 3000000u64 3000000u64;
    assert.eq 27000000u64 27000000u64;
    assert.eq 30000000u64 30000000u64;

function split_proposer_wins:
    assert.eq 4500000u64 4500000u64;
    assert.eq 40500000u64 40500000u64;
    assert.eq 45000000u64 45000000u64;

function deadline_adds_window:
    assert.eq 100300u64 100300u64;

constructor:
    assert.eq edition 0u16;
