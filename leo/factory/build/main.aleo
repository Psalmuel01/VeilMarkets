program veilmarkets_factory_v3.aleo;

mapping contracts:
    key as u8.public;
    value as address.public;

function register_contract:
    input r0 as u8.public;
    input r1 as address.public;
    async register_contract r0 r1 into r2;
    output r2 as veilmarkets_factory_v3.aleo/register_contract.future;

finalize register_contract:
    input r0 as u8.public;
    input r1 as address.public;
    set r1 into contracts[r0];

function verify_is_registered:
    input r0 as u8.public;
    input r1 as address.public;
    async verify_is_registered r0 r1 into r2;
    output r2 as veilmarkets_factory_v3.aleo/verify_is_registered.future;

finalize verify_is_registered:
    input r0 as u8.public;
    input r1 as address.public;
    get contracts[r0] into r2;
    assert.eq r1 r2;

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
