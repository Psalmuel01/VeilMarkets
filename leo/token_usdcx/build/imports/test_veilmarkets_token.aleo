import veilmarkets_factory_v9.aleo;
import veilmarkets_v9.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
import veilmarkets_token_usdcx_v9.aleo;
program test_veilmarkets_token.aleo;

function usdcx_min_bet_decimal:
    cast 1000000u64 into r0 as u128;
    assert.eq 1000000u64 1000000u64;
    assert.eq r0 1000000u128;

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

function usdcx_escrow_id_changes:
    call compute_escrow_id aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms 88field 0u8 1000000u64 21field into r0;
    call compute_escrow_id aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms 88field 0u8 1000000u64 22field into r1;
    call compute_escrow_id aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 88field 0u8 1000000u64 21field into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

function usdcx_u128_cast_roundtrip:
    cast 123456789u64 into r0 as u128;
    cast r0 into r1 as u64;
    assert.eq r1 123456789u64;

constructor:
    assert.eq edition 0u16;
