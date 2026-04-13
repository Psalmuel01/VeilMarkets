program test_veilmarkets_token.aleo;

function min_bet_threshold:
    assert.eq false false;
    assert.eq true true;

closure derive_position_id:
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

function position_id_inputs:
    call derive_position_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 1u8 5000000u64 11field into r0;
    call derive_position_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 1u8 5000000u64 12field into r1;
    call derive_position_id aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n 77field 0u8 5000000u64 11field into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

function owner_commitment_hash:
    hash.bhp256 123field into r0 as field;
    hash.bhp256 123field into r1 as field;
    assert.eq r0 r1;

closure derive_lp_owner_key:
    input r0 as field;
    input r1 as address;
    cast r1 into r2 as field;
    add r0 r2 into r3;
    hash.bhp256 r3 into r4 as field;
    output r4 as field;

function lp_owner_key_inputs:
    call derive_lp_owner_key 55field aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r0;
    call derive_lp_owner_key 56field aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r1;
    call derive_lp_owner_key 55field aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

constructor:
    assert.eq edition 0u16;
