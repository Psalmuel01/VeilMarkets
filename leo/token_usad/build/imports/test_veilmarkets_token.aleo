import veilmarkets_factory_v5.aleo;
import veilmarkets_v5.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
import veilmarkets_token_usdcx_v5.aleo;
program test_veilmarkets_token.aleo;

function test_primitives:
    assert.eq 1000000u64 1000000u64;

constructor:
    assert.eq edition 0u16;
