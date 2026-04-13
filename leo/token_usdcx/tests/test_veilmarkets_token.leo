fn derive_position_id(
    trader: address,
    market_id: field,
    outcome: u8,
    collateral_in: u64,
    position_nonce: field,
) -> field {
    return BHP256::hash_to_field(
        trader as field + market_id + outcome as field + collateral_in as field + position_nonce,
    );
}

fn derive_owner_commitment(position_id: field) -> field {
    return BHP256::hash_to_field(position_id);
}

fn derive_lp_owner_key(market_id: field, trader: address) -> field {
    return BHP256::hash_to_field(market_id + trader as field);
}

program test_veilmarkets_token.aleo {
    const MIN_BET: u64 = 1000000u64;

    @test
    fn usdcx_min_bet() {
        let one_usdcx_micro: u64 = 1000000u64;
        assert_eq(MIN_BET, one_usdcx_micro);
    }

    @test
    fn usdcx_position_id() {
        let trader: address = aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms;
        let market_id: field = 88field;

        let id_a: field = derive_position_id(trader, market_id, 0u8, 1000000u64, 21field);
        let id_b: field = derive_position_id(trader, market_id, 0u8, 1000000u64, 22field);

        assert(id_a != id_b);
    }

    @test
    fn usdcx_owner_hash() {
        let position_id: field = 902field;
        let owner_commitment: field = derive_owner_commitment(position_id);
        assert_eq(owner_commitment, BHP256::hash_to_field(position_id));
    }

    @test
    fn usdcx_u128_roundtrip() {
        let amount_u64: u64 = 123456789u64;
        let amount_u128: u128 = amount_u64 as u128;
        let amount_back_u64: u64 = amount_u128 as u64;

        assert_eq(amount_back_u64, amount_u64);
    }

    @test
    fn usdcx_lp_owner_key() {
        let trader_a: address = aleo1k5mqrr36sz6kcu4nwh7lyfwc9an72j7z0xvfhufvnwmhaugtqs9sdfsrms;
        let trader_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;

        let key_a: field = derive_lp_owner_key(88field, trader_a);
        let key_b: field = derive_lp_owner_key(89field, trader_a);
        let key_c: field = derive_lp_owner_key(88field, trader_b);

        assert(key_a != key_b);
        assert(key_a != key_c);
    }

    @noupgrade
    constructor() {}
}
