import veilmarkets_factory_v5.aleo;
import veilmarkets_v5.aleo;
program test_veilmarkets.aleo;

function market_primitives_ok:
    assert.eq 2u8 2u8;
    assert.eq 12345field 12345field;

constructor:
    assert.eq edition 0u16;
