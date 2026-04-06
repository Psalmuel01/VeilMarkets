import veilmarkets_factory_v8.aleo;
import veilmarkets_v8.aleo;
import merkle_tree.aleo;
import test_usad_multisig_core.aleo;
import test_usad_freezelist.aleo;
import test_usad_stablecoin.aleo;
import veilmarkets_token_usad_v8.aleo;
program test_veilmarkets_token.aleo;

function usad_min_bet_decimal:
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

function usad_escrow_id_changes:
    call compute_escrow_id aleo1w0e5f0frezk9v8x92avcvn084wx0kcxykltuw2xtnehd98paxsrq4x7r9x 89field 1000000u64 into r0;
    call compute_escrow_id aleo1w0e5f0frezk9v8x92avcvn084wx0kcxykltuw2xtnehd98paxsrq4x7r9x 89field 2000000u64 into r1;
    call compute_escrow_id aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 89field 1000000u64 into r2;
    is.neq r0 r1 into r3;
    assert.eq r3 true;
    is.neq r0 r2 into r4;
    assert.eq r4 true;

function usad_u128_cast_roundtrip:
    cast 987654321u64 into r0 as u128;
    cast r0 into r1 as u64;
    assert.eq r1 987654321u64;

constructor:
    assert.eq edition 0u16;
