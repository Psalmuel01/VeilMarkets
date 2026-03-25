import veilmarkets_factory_v5.aleo;
program test_factory.aleo;

function registry_type_tag_ok:
    assert.eq 3u8 3u8;

constructor:
    assert.eq edition 0u16;
