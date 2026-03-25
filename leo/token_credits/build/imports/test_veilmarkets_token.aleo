import veilmarkets_factory_v5.aleo;
import veilmarkets_v5.aleo;
import credits.aleo;
import veilmarkets_token_credits_v5.aleo;
program test_veilmarkets_token.aleo;

function test_primitives:
    assert.eq 1000000u64 1000000u64;

constructor:
    assert.eq edition 0u16;
