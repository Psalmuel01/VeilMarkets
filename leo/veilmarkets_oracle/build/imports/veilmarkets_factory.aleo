program veilmarkets_factory.aleo;

mapping contracts:
    key as u8.public;
    value as address.public;

function register_contract:
    input r0 as u8.public;
    input r1 as address.public;
    lte r0 2u8 into r2;
    assert.eq r2 true;
    async register_contract r0 r1 into r3;
    output r3 as veilmarkets_factory.aleo/register_contract.future;

finalize register_contract:
    input r0 as u8.public;
    input r1 as address.public;
    get.or_use contracts[r0] aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc into r2;
    assert.eq r2 aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
    set r1 into contracts[r0];

function verify_is_registered:
    input r0 as u8.public;
    input r1 as address.public;
    async verify_is_registered r0 r1 into r2;
    output r2 as veilmarkets_factory.aleo/verify_is_registered.future;

finalize verify_is_registered:
    input r0 as u8.public;
    input r1 as address.public;
    get contracts[r0] into r2;
    assert.eq r2 r1;

function check_contract:
    input r0 as u8.public;
    input r1 as address.public;
    async check_contract r0 r1 into r2;
    output r2 as veilmarkets_factory.aleo/check_contract.future;

finalize check_contract:
    input r0 as u8.public;
    input r1 as address.public;
    get contracts[r0] into r2;
    assert.eq r2 r1;

constructor:
    assert.eq program_owner aleo138cz6wwjdqg7ehltt7tp9k8canht4gspl3flsexcu9hmdmyyhspse9lmxc;
