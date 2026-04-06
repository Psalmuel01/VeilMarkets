import veilmarkets_factory_v8.aleo;
program test_factory.aleo;

closure is_valid_registry_type:
    input r0 as u8;
    lt r0 1u8 into r1;
    lte r0 3u8 into r2;
    ternary r1 false r2 into r3;
    output r3 as boolean;

function registry_type_tags_are_stable:
    call is_valid_registry_type 1u8 into r0;
    assert.eq r0 true;
    call is_valid_registry_type 2u8 into r1;
    assert.eq r1 true;
    call is_valid_registry_type 3u8 into r2;
    assert.eq r2 true;
    call is_valid_registry_type 0u8 into r3;
    assert.eq r3 false;
    call is_valid_registry_type 4u8 into r4;
    assert.eq r4 false;

function registry_keys_distinct:
    cast aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n into r0 as field;
    add r0 1field into r1;
    hash.bhp256 r1 into r2 as field;
    cast aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565 into r3 as field;
    add r3 1field into r4;
    hash.bhp256 r4 into r5 as field;
    is.neq r2 r5 into r6;
    assert.eq r6 true;

function verify_type_exact_match:
    assert.eq true true;
    assert.eq false false;

constructor:
    assert.eq edition 0u16;
