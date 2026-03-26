program veilmarkets_factory_v7.aleo;

mapping contracts:
    key as address.public;
    value as u8.public;

function register_contract:
    input r0 as u8.public;
    input r1 as address.public;
    async register_contract r0 r1 into r2;
    output r2 as veilmarkets_factory_v7.aleo/register_contract.future;

finalize register_contract:
    input r0 as u8.public;
    input r1 as address.public;
    set r0 into contracts[r1];

function verify_is_registered:
    input r0 as u8.public;
    input r1 as address.public;
    async verify_is_registered r0 r1 into r2;
    output r2 as veilmarkets_factory_v7.aleo/verify_is_registered.future;

finalize verify_is_registered:
    input r0 as u8.public;
    input r1 as address.public;
    get contracts[r1] into r2;
    assert.eq r2 r0;

constructor:
    assert.eq program_owner aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
