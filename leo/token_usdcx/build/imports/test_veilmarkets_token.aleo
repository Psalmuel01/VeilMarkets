program test_veilmarkets_token.aleo;

function usdcx_min_bet:
    assert.eq 1000000u64 1000000u64;

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

function usdcx_position_id:
    call derive_position_id aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms 88field 0u8 1000000u64 21field into r0;
    call derive_position_id aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms 88field 0u8 1000000u64 22field into r1;
    is.neq r0 r1 into r2;
    assert.eq r2 true;

function usdcx_owner_hash:
    hash.bhp256 902field into r0 as field;
    hash.bhp256 902field into r1 as field;
    assert.eq r0 r1;

function usdcx_u128_roundtrip:
    cast 123456789u64 into r0 as u128;
    cast r0 into r1 as u64;
    assert.eq r1 123456789u64;

closure derive_lp_owner_key:
    input r0 as field;
    input r1 as address;
    cast r1 into r2 as field;
    add r0 r2 into r3;
    hash.bhp256 r3 into r4 as field;
    output r4 as field;

function usdcx_lp_owner_key:
    call derive_lp_owner_key 88field aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms into r0;
    call derive_lp_owner_key 89field aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms into r1;
    call derive_lp_owner_key 88field aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

constructor:
    assert.eq edition 0u16;
