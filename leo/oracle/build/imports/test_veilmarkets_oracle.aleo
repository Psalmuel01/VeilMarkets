import veilmarkets_factory_v5.aleo;
import veilmarkets_v5.aleo;
import credits.aleo;
import veilmarkets_oracle_v5.aleo;
program test_veilmarkets_oracle.aleo;

function test_primitives:
    assert.eq 14400u64 14400u64;

constructor:
    assert.eq edition 0u16;
