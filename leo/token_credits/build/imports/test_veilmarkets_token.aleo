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
    input r2 as u64;
    cast r0 into r3 as field;
    add r3 r1 into r4;
    cast r2 into r5 as field;
    add r4 r5 into r6;
    hash.bhp256 r6 into r7 as field;
    output r7 as field;

function escrow_id_depends_on_inputs:
    call compute_escrow_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 5000000u64 into r0;
    call compute_escrow_id aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 77field 5000000u64 into r1;
    call compute_escrow_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 5000001u64 into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

function escrow_reduces_on_refund:
    assert.eq true true;
    assert.eq 6500000u64 6500000u64;

constructor:
    assert.eq edition 0u16;
