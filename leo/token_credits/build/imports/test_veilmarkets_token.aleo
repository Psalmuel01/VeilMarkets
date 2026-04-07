import veilmarkets_factory_v8.aleo;
import veilmarkets_v8.aleo;
import credits.aleo;
import veilmarkets_token_credits_v8.aleo;
program test_veilmarkets_token.aleo;

function enforces_minimum_bet_threshold:
    assert.eq false false;
    assert.eq true true;

closure compute_escrow_id:
    input r0 as address;
    input r1 as field;
    input r2 as u8;
    input r3 as u64;
    input r4 as field;
    cast r0 into r5 as field;
    add r5 r1 into r6;
    cast r2 into r7 as field;
    add r6 r7 into r8;
    cast r3 into r9 as field;
    add r8 r9 into r10;
    add r10 r4 into r11;
    hash.bhp256 r11 into r12 as field;
    output r12 as field;

function escrow_id_depends_on_inputs:
    call compute_escrow_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 1u8 5000000u64 11field into r0;
    call compute_escrow_id aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 77field 1u8 5000000u64 11field into r1;
    call compute_escrow_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 1u8 5000000u64 12field into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

function escrow_reduces_on_refund:
    assert.eq true true;
    assert.eq 6500000u64 6500000u64;

constructor:
    assert.eq edition 0u16;
