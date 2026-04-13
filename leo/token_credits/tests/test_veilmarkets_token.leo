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
    fn min_bet_threshold() {
        assert_eq(999999u64 >= MIN_BET, false);
        assert_eq(1000000u64 >= MIN_BET, true);
    }

    @test
    fn position_id_inputs() {
        let trader: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
        let market_id: field = 77field;

        let id_a: field = derive_position_id(trader, market_id, 1u8, 5000000u64, 11field);
        let id_b: field = derive_position_id(trader, market_id, 1u8, 5000000u64, 12field);
        let id_c: field = derive_position_id(trader, market_id, 0u8, 5000000u64, 11field);

        assert(id_a != id_b);
        assert(id_a != id_c);
    }

    @test
    fn owner_commitment_hash() {
        let position_id: field = 123field;
        let owner_commitment: field = derive_owner_commitment(position_id);

        assert_eq(owner_commitment, BHP256::hash_to_field(position_id));
    }

    @test
    fn lp_owner_key_inputs() {
        let trader_a: address = aleo1cnd2pmg8g4htpuegy8eyer9s33h0shs2yxtt8au5hl9sl566qggskfcu3n;
        let trader_b: address = aleo13wreywph6vpjfcn9z3unaulyv7mgepsu5pzwnzd32786j5gzzvqqrw8565;

        let key_a: field = derive_lp_owner_key(55field, trader_a);
        let key_b: field = derive_lp_owner_key(56field, trader_a);
        let key_c: field = derive_lp_owner_key(55field, trader_b);

        assert(key_a != key_b);
        assert(key_a != key_c);
    }

    @noupgrade
    constructor() {}
}
