import veilmarkets_factory_v8.aleo;
import veilmarkets_v8.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
import veilmarkets_token_usdcx_v8.aleo;
program test_veilmarkets_token.aleo;

function usdcx_min_bet_decimal:
    cast 1000000u64 into r0 as u128;
    assert.eq 1000000u64 1000000u64;
    assert.eq r0 1000000u128;

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

function usdcx_escrow_id_changes:
    call compute_escrow_id aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms 88field 1000000u64 into r0;
    call compute_escrow_id aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms 88field 2000000u64 into r1;
    call compute_escrow_id aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 88field 1000000u64 into r2;
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
